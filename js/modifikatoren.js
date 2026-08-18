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
    { id: "adaptiveThermogenese", achse: "kalorienrestriktion", berechne: adaptiveThermogenese },
    { id: "schilddruese", achse: "stoffwechsel", berechne: schilddruese },
    { id: "fieber", achse: "akutkrankheit", berechne: fieber },
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
  // label/kategorie sind bewusst nicht hier hinterlegt (sprachneutral) — die
  // Anzeigetexte pro Sprache liegen in i18n.js unter met_aktivitaet_<id> bzw.
  // met_kategorie_<kategorieId>, ui.js löst sie beim Rendern auf.
  const MET_AKTIVITAETEN = [
    { id: "spazieren", kategorieId: "gehen_wandern", met: 2.8 },
    { id: "gehen_zuegig", kategorieId: "gehen_wandern", met: 4.8 },
    { id: "nordic_walking", kategorieId: "gehen_wandern", met: 5.3 },
    { id: "wandern", kategorieId: "gehen_wandern", met: 6.0 },
    { id: "joggen_locker", kategorieId: "laufen", met: 7.5 },
    { id: "laufen_moderat", kategorieId: "laufen", met: 9.3 },
    { id: "laufen_schnell", kategorieId: "laufen", met: 11.0 },
    { id: "rad_locker", kategorieId: "radfahren", met: 4.0 },
    { id: "rad_moderat", kategorieId: "radfahren", met: 8.0 },
    { id: "rad_zuegig", kategorieId: "radfahren", met: 10.0 },
    { id: "schwimmen_locker", kategorieId: "schwimmen", met: 6.0 },
    { id: "schwimmen_sportlich", kategorieId: "schwimmen", met: 9.8 },
    { id: "kraft_moderat", kategorieId: "kraft", met: 3.5 },
    { id: "kraft_intensiv", kategorieId: "kraft", met: 5.0 },
    { id: "kraft_sehr_intensiv", kategorieId: "kraft", met: 6.0 },
    { id: "calisthenics_leicht", kategorieId: "kraft", met: 2.8 },
    { id: "calisthenics_moderat", kategorieId: "kraft", met: 3.8 },
    { id: "calisthenics_intensiv", kategorieId: "kraft", met: 7.5 },
    { id: "zirkel_leicht", kategorieId: "kraft", met: 3.5 },
    { id: "zirkel_moderat", kategorieId: "kraft", met: 5.0 },
    { id: "bootcamp", kategorieId: "kraft", met: 7.5 },
    { id: "hiit", kategorieId: "kraft", met: 11.0 },
    { id: "yoga_hatha", kategorieId: "yoga", met: 2.3 },
    { id: "yoga_power", kategorieId: "yoga", met: 4.0 },
    { id: "fussball_locker", kategorieId: "ballsport", met: 7.0 },
    { id: "fussball_wettkampf", kategorieId: "ballsport", met: 9.5 },
    { id: "tischtennis", kategorieId: "ballsport", met: 4.0 },
    { id: "tennis_doppel", kategorieId: "ballsport", met: 6.0 },
    { id: "tennis_einzel", kategorieId: "ballsport", met: 8.0 },
    { id: "basketball_locker", kategorieId: "ballsport", met: 6.0 },
    { id: "basketball_wettkampf", kategorieId: "ballsport", met: 8.0 },
    { id: "volleyball", kategorieId: "ballsport", met: 4.0 },
    { id: "badminton_locker", kategorieId: "ballsport", met: 5.5 },
    { id: "badminton_wettkampf", kategorieId: "ballsport", met: 9.0 },
  ];

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

  // Anzeigetexte (label/grund) liegen sprachneutral in i18n.js unter
  // hinweis_<id>_label / hinweis_<id>_grund — ui.js löst sie beim Rendern auf.
  const HINWEIS_IDS = ["tef", "schlafdauer", "stress", "koffein", "lutealphase"];

  return {
    REE_FAKTOREN,
    kombiniereReeFaktoren,
    adaptiveThermogenese,
    schilddruese,
    fieber,
    sportMet,
    MET_AKTIVITAETEN,
    schwangerschaftStillzeit,
    betaBlocker,
    HINWEIS_IDS,
    clamp,
  };
})();
