window.KBR = window.KBR || {};

/*
 * Modifikator-Katalog + Klassifikation, siehe PLAN.md Abschnitt „⚠️ Fachliche
 * Korrektur" und Abschnitt 3. Jeder Faktor trägt `wirkung: 'ree' | 'pal' | 'tee' | 'hinweis'`.
 * Reine Funktionen, kein DOM-Zugriff.
 *
 * REE-Faktoren tragen zusätzlich `achse` — Faktoren derselben Achse werden bei
 * der Kombination nicht multipliziert, sondern nur der stärkste zählt (Guard
 * gegen unplausibles Aufschaukeln gleichgerichteter Effekte).
 */
window.KBR.modifikatoren = (function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // ---- REE-wirksame Faktoren (multiplikativ, Faktor um 1.0) ----------------

  function adaptiveThermogenese({ aktiv }) {
    // Diät-Historie: chronische Kalorienrestriktion senkt den REE um 5–10 %.
    if (!aktiv) return null;
    return { faktorMin: 0.9, faktorMax: 0.95 };
  }

  function schilddruese({ faktorProzent }) {
    // Ärztliche Diagnose, hinter Disclaimer. faktorProzent z. B. -10 bis +30.
    if (faktorProzent === null || faktorProzent === undefined) return null;
    const f = 1 + faktorProzent / 100;
    return { faktorMin: f, faktorMax: f };
  }

  function fieber({ koerpertemperaturC }) {
    // +10–13 % REE pro 1°C Körperkerntemperatur über 37°C.
    if (!koerpertemperaturC || koerpertemperaturC <= 37) return null;
    const deltaT = koerpertemperaturC - 37;
    return { faktorMin: 1 + 0.1 * deltaT, faktorMax: 1 + 0.13 * deltaT };
  }

  const REE_FAKTOREN = [
    { id: "adaptiveThermogenese", achse: "kalorienrestriktion", label: "Adaptive Thermogenese (Diät-Historie)", berechne: adaptiveThermogenese },
    { id: "schilddruese", achse: "stoffwechsel", label: "Schilddrüsen-Diagnose", berechne: schilddruese },
    { id: "fieber", achse: "akutkrankheit", label: "Fieber", berechne: fieber },
  ];

  /**
   * Kombiniert aktive REE-Faktoren: pro Achse zählt nur der stärkste Effekt
   * (kleinster bzw. größter Faktor), Achsen werden multipliziert, Ergebnis
   * auf [0.80, 1.40] geklammert.
   * @param {Record<string, {faktorMin:number, faktorMax:number}|null>} aktiveFaktoren - id → Ergebnis von berechne()
   */
  function kombiniereReeFaktoren(aktiveFaktoren) {
    const proAchse = {};
    for (const def of REE_FAKTOREN) {
      const result = aktiveFaktoren[def.id];
      if (!result) continue;
      const staerke = Math.max(Math.abs(1 - result.faktorMin), Math.abs(1 - result.faktorMax));
      const bisher = proAchse[def.achse];
      if (!bisher || staerke > bisher.staerke) {
        proAchse[def.achse] = { staerke, result };
      }
    }
    let faktorMin = 1;
    let faktorMax = 1;
    for (const key of Object.keys(proAchse)) {
      faktorMin *= proAchse[key].result.faktorMin;
      faktorMax *= proAchse[key].result.faktorMax;
    }
    return {
      faktorMin: clamp(faktorMin, 0.8, 1.4),
      faktorMax: clamp(faktorMax, 0.8, 1.4),
    };
  }

  // ---- PAL-wirksame Faktoren --------------------------------------------

  /**
   * MET-basierte Sportberechnung als PAL-Äquivalent. Ersetzt die ganzheitliche
   * Aktivitätslevel-Schätzung (siehe berechnung.js/ui.js), statt sie additiv zu
   * ergänzen — ein separater "PAL-Zuschlag" auf Basis einer Schätzung ohne
   * echte Trainingsdaten wäre nicht literaturgestützt und würde bei ohnehin
   * sport-inklusiven PAL-Werten (FAO/WHO/UNU) Doppelzählung riskieren.
   * Nettoeffekt (MET-1, da MET=1 dem Ruheumsatz entspricht) über die
   * Trainingsstunden pro Woche, gemittelt auf den Tag, dann relativ zu REE_adj
   * in eine PAL-Zuschlagsspanne umgerechnet.
   */
  function sportMet({ metWert, stundenProEinheit, einheitenProWoche, weightKg, reeAdj }) {
    if (!metWert || !stundenProEinheit || !einheitenProWoche || !reeAdj) return null;
    const zusatzKcalProTag = ((metWert - 1) * weightKg * stundenProEinheit * einheitenProWoche) / 7;
    const zuschlag = zusatzKcalProTag / reeAdj;
    return { min: zuschlag, max: zuschlag };
  }

  // ---- TEE-wirksame additive Faktoren (kcal/Tag) -------------------------

  function schwangerschaftStillzeit({ status }) {
    // status: 'schwanger' | 'stillzeit' | null
    if (status === "schwanger") return { kcalMin: 250, kcalMax: 250 };
    if (status === "stillzeit") return { kcalMin: 500, kcalMax: 500 };
    return null;
  }

  function betaBlocker({ aktiv }) {
    // Chronisch wirksam, daher trotz kleiner Größenordnung eingerechnet
    // (siehe PLAN.md „Chronizität"-Kriterium).
    if (!aktiv) return null;
    return { kcalMin: -100, kcalMax: -50 };
  }

  // ---- Nur Hinweis, nicht gerechnet --------------------------------------

  const HINWEISE = [
    {
      id: "tef",
      label: "Verdauung von Nahrung (TEF)",
      grund: "Auch die Verdauung selbst verbraucht Energie. Dieser Anteil steckt aber schon in den Aktivitätsfaktoren oben — ihn zusätzlich abzuziehen würde ihn doppelt berücksichtigen.",
    },
    {
      id: "schlafdauer",
      label: "Schlafdauer",
      grund: "Der Grundumsatz gilt für einen vollen Tag inklusive Schlaf. Ein zusätzlicher Abzug für die Schlafzeit wäre daher doppelt gezählt.",
    },
    {
      id: "koffein",
      label: "Koffein",
      grund: "Koffein regt den Stoffwechsel für ein paar Stunden leicht an. Dieser kurze Effekt lässt sich nicht sinnvoll auf den gesamten Tag hochrechnen.",
    },
    {
      id: "lutealphase",
      label: "Zyklusphase (2. Zyklushälfte)",
      grund: "In der zweiten Zyklushälfte steigt der Energiebedarf für ca. zwei Wochen leicht an (ca. 40–70 kcal/Tag). Das liegt innerhalb der ohnehin vorhandenen Schwankungsbreite der Berechnung und gleicht sich über den Monat wieder aus.",
    },
  ];

  return {
    REE_FAKTOREN,
    kombiniereReeFaktoren,
    adaptiveThermogenese,
    schilddruese,
    fieber,
    sportMet,
    schwangerschaftStillzeit,
    betaBlocker,
    HINWEISE,
    clamp,
  };
})();
