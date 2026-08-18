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

  // MET-Referenztabelle für die Sport-Auswahl im UI. Werte aus dem Compendium
  // of Physical Activities (Ainsworth et al., 2024 Adult Compendium,
  // pacompendium.com) — die Standardquelle für MET-Werte in der Sportwissenschaft.
  // "Intensitätsstufen" (locker/moderat/intensiv) bilden echte, im Compendium
  // separat geführte Varianten ab statt einer freien, nicht belegten 1–10-Skala.
  const MET_AKTIVITAETEN = [
    { id: "spazieren", kategorie: "Gehen & Wandern", label: "Spazieren (gemütlich)", met: 2.8 },
    { id: "gehen_zuegig", kategorie: "Gehen & Wandern", label: "Gehen, zügig", met: 4.8 },
    { id: "nordic_walking", kategorie: "Gehen & Wandern", label: "Nordic Walking", met: 5.3 },
    { id: "wandern", kategorie: "Gehen & Wandern", label: "Wandern", met: 6.0 },
    { id: "joggen_locker", kategorie: "Laufen", label: "Joggen, locker", met: 7.5 },
    { id: "laufen_moderat", kategorie: "Laufen", label: "Laufen, moderat (~10 km/h)", met: 9.3 },
    { id: "laufen_schnell", kategorie: "Laufen", label: "Laufen, schnell (~12 km/h)", met: 11.0 },
    { id: "rad_locker", kategorie: "Radfahren", label: "Radfahren, locker", met: 4.0 },
    { id: "rad_moderat", kategorie: "Radfahren", label: "Radfahren, moderat", met: 8.0 },
    { id: "rad_zuegig", kategorie: "Radfahren", label: "Radfahren, zügig/Rennrad", met: 10.0 },
    { id: "schwimmen_locker", kategorie: "Schwimmen", label: "Schwimmen, locker", met: 6.0 },
    { id: "schwimmen_sportlich", kategorie: "Schwimmen", label: "Schwimmen, sportlich (Bahnen)", met: 9.8 },
    { id: "kraft_moderat", kategorie: "Kraft & Konditionstraining", label: "Krafttraining, moderat", met: 3.5 },
    { id: "kraft_intensiv", kategorie: "Kraft & Konditionstraining", label: "Krafttraining, intensiv (Grundübungen)", met: 5.0 },
    { id: "kraft_sehr_intensiv", kategorie: "Kraft & Konditionstraining", label: "Krafttraining, sehr intensiv", met: 6.0 },
    { id: "calisthenics_leicht", kategorie: "Kraft & Konditionstraining", label: "Calisthenics, leicht", met: 2.8 },
    { id: "calisthenics_moderat", kategorie: "Kraft & Konditionstraining", label: "Calisthenics, moderat", met: 3.8 },
    { id: "calisthenics_intensiv", kategorie: "Kraft & Konditionstraining", label: "Calisthenics, intensiv", met: 7.5 },
    { id: "zirkel_leicht", kategorie: "Kraft & Konditionstraining", label: "Zirkeltraining, leicht", met: 3.5 },
    { id: "zirkel_moderat", kategorie: "Kraft & Konditionstraining", label: "Zirkeltraining, moderat", met: 5.0 },
    { id: "bootcamp", kategorie: "Kraft & Konditionstraining", label: "Bootcamp / Zirkeltraining, intensiv (inkl. Kettlebell)", met: 7.5 },
    { id: "hiit", kategorie: "Kraft & Konditionstraining", label: "HIIT (Tabata, Burpees u. Ä.)", met: 11.0 },
    { id: "yoga_hatha", kategorie: "Yoga", label: "Yoga, Hatha (ruhig)", met: 2.3 },
    { id: "yoga_power", kategorie: "Yoga", label: "Yoga, Power/Vinyasa", met: 4.0 },
    { id: "fussball_locker", kategorie: "Ballsport", label: "Fußball, locker", met: 7.0 },
    { id: "fussball_wettkampf", kategorie: "Ballsport", label: "Fußball, Wettkampf", met: 9.5 },
    { id: "tischtennis", kategorie: "Ballsport", label: "Tischtennis", met: 4.0 },
    { id: "tennis_doppel", kategorie: "Ballsport", label: "Tennis, Doppel", met: 6.0 },
    { id: "tennis_einzel", kategorie: "Ballsport", label: "Tennis, Einzel", met: 8.0 },
    { id: "basketball_locker", kategorie: "Ballsport", label: "Basketball, locker", met: 6.0 },
    { id: "basketball_wettkampf", kategorie: "Ballsport", label: "Basketball, Wettkampf", met: 8.0 },
    { id: "volleyball", kategorie: "Ballsport", label: "Volleyball", met: 4.0 },
    { id: "badminton_locker", kategorie: "Ballsport", label: "Badminton, locker", met: 5.5 },
    { id: "badminton_wettkampf", kategorie: "Ballsport", label: "Badminton, Wettkampf", met: 9.0 },
  ];
  const MET_QUELLE =
    "Compendium of Physical Activities (Ainsworth et al., 2024 Adult Compendium, pacompendium.com) — Standardreferenz für MET-Werte in der Sportwissenschaft.";

  /**
   * MET-basierte Sportberechnung als PAL-Äquivalent. Ersetzt die ganzheitliche
   * Aktivitätslevel-Schätzung (siehe berechnung.js/ui.js), statt sie additiv zu
   * ergänzen — ein separater "PAL-Zuschlag" auf Basis einer Schätzung ohne
   * echte Trainingsdaten wäre nicht literaturgestützt und würde bei ohnehin
   * sport-inklusiven PAL-Werten (FAO/WHO/UNU) Doppelzählung riskieren.
   *
   * Nettoeffekt (MET-1, da MET=1 dem Ruheumsatz entspricht) je Aktivität über
   * die Trainingsstunden pro Woche, über alle angegebenen Aktivitäten summiert,
   * gemittelt auf den Tag, dann relativ zu REE_adj in ein PAL-Äquivalent umgerechnet.
   * @param {{aktivitaeten: {metWert:number, stundenProWoche:number}[], weightKg:number, reeAdj:number}} p
   */
  function sportMet({ aktivitaeten, weightKg, reeAdj }) {
    const gueltige = (aktivitaeten || []).filter((a) => a.metWert > 1 && a.stundenProWoche > 0);
    if (!gueltige.length || !weightKg || !reeAdj) return null;
    const zusatzKcalProTag =
      gueltige.reduce((summe, a) => summe + (a.metWert - 1) * weightKg * a.stundenProWoche, 0) / 7;
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
    MET_AKTIVITAETEN,
    MET_QUELLE,
    schwangerschaftStillzeit,
    betaBlocker,
    HINWEISE,
    clamp,
  };
})();
