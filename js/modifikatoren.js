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

  // NEAT-Schätzung über die durchschnittliche Schrittzahl/Tag als PAL-Bereich
  // (nicht als Zuschlag) — ersetzt das alte, Sport-vermischte Aktivitätslevel-
  // Dropdown vollständig. Berufliche Beispiele in den i18n-Labels dienen nur als
  // Orientierung für Nutzer:innen ohne Schrittzähler, sind aber nicht Teil der
  // Berechnung.
  const NEAT_STUFEN = [
    { id: "unter5000", palMin: 1.2, palMax: 1.3 },
    { id: "5000bis10000", palMin: 1.4, palMax: 1.5 },
    { id: "10000bis15000", palMin: 1.6, palMax: 1.7 },
    { id: "ab15000", palMin: 1.8, palMax: 2.0 },
  ];

  function neatPalBereich({ neatSchritteId }) {
    const stufe = NEAT_STUFEN.find((s) => s.id === neatSchritteId);
    return stufe ? { palMin: stufe.palMin, palMax: stufe.palMax } : null;
  }

  // Sport-Häufigkeit als eigenständiger, additiver PAL-Zuschlag — unabhängig von
  // NEAT. Wird durch die genaue MET-Berechnung ersetzt, nicht ergänzt (siehe
  // sportMet-Kommentar unten), da beide dieselbe Achse (Trainingsintensität)
  // beschreiben.
  const SPORT_HAEUFIGKEIT_STUFEN = [
    { id: "keinSport", zuschlag: 0.0 },
    { id: "1bis3", zuschlag: 0.1 },
    { id: "3bis5", zuschlag: 0.2 },
    { id: "6bis7", zuschlag: 0.3 },
    { id: "leistungssport", zuschlag: 0.4 },
  ];

  function sportHaeufigkeitZuschlag({ haeufigkeitId }) {
    const stufe = SPORT_HAEUFIGKEIT_STUFEN.find((s) => s.id === haeufigkeitId);
    return stufe ? { min: stufe.zuschlag, max: stufe.zuschlag } : null;
  }

  // Spontanbewegung (Wippen, Gestikulieren, häufiges Aufstehen) — unabhängig von
  // NEAT-Schrittzahl (wird von Trackern oft nicht erfasst) und von Sport, daher
  // immer additiv, nie ersetzend.
  function fidgetingPalZuschlag({ aktiv }) {
    if (!aktiv) return null;
    return { min: 0.05, max: 0.1 };
  }

  // Gehbasis-Modell für "wie viel des Trainings war eigentlich schon in der
  // Schrittzahl (NEAT) enthalten": 0,5 kcal/kg/km ist eine gängige Näherung
  // für Geh-Bruttokosten (Lauf-Bruttokosten ~1,0 kcal/kg/km zum Vergleich).
  // Zentrale, einzige Gehbasis-Formel im Code -- sowohl vom expliziten
  // Lauf-km-Feld als auch von der generischen MET-Kategorie-Korrektur
  // genutzt (siehe schrittIntensiveMetKorrektur), damit dieselbe Aktivität
  // nie unterschiedlich stark reduziert wird je nachdem, über welchen Weg
  // (km-Eingabe vs. MET-Trainingsstunden) sie erfasst wurde.
  function gehbasisPalAequivalent({ kmWoche, weightKg, reeAdj }) {
    if (!kmWoche || kmWoche <= 0 || !weightKg || !reeAdj) return 0;
    return (kmWoche * weightKg * 0.5) / 7 / reeAdj;
  }

  // Schrittlänge als Näherung, um eine über Kadenz (Schritte/Minute, siehe
  // SCHRITTE_PRO_MINUTE) geschätzte Schrittzahl in eine Äquivalent-Distanz
  // umzurechnen, die dann durch dieselbe Gehbasis-Formel läuft.
  const SCHRITTLAENGE_M = 0.75;

  function schritteZuKmWoche(schritteProWoche) {
    return (schritteProWoche * SCHRITTLAENGE_M) / 1000;
  }

  /**
   * Lauf/Jogging-Anpassung: trennt "wie viel der Schrittzahl war eigentlich
   * ein Lauf" (neatReduktion, nur falls traegtTracker) von "wie wird der
   * Lauf selbst bewertet" (zuschlag: volle Laufkosten 1,0 kcal/kg/km, ODER 0
   * falls eine MET-„Laufen"-Aktivität denselben Lauf bereits präziser erfasst
   * -- dann übernimmt sportMet die Berechnung). Löst die Schritt/Sport-
   * Doppelzählung für Läufer präziser als ein reiner Hinweistext.
   * @param {{aktiv:boolean, kmWoche:number, weightKg:number, reeAdj:number, vonMetAbgedeckt:boolean, traegtTracker:boolean}} p
   */
  function laufAnpassung({ aktiv, kmWoche, weightKg, reeAdj, vonMetAbgedeckt, traegtTracker }) {
    if (!aktiv || !kmWoche || kmWoche <= 0 || !weightKg || !reeAdj) return null;
    const neatReduktion = traegtTracker ? gehbasisPalAequivalent({ kmWoche, weightKg, reeAdj }) : 0;
    if (vonMetAbgedeckt) {
      return { neatReduktion, zuschlagMin: 0, zuschlagMax: 0, vonMetAbgedeckt: true };
    }
    const laufKcalProTag = (kmWoche * weightKg * 1.0) / 7;
    const zuschlag = laufKcalProTag / reeAdj;
    return { neatReduktion, zuschlagMin: zuschlag, zuschlagMax: zuschlag, vonMetAbgedeckt: false };
  }

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

  // Grobe Kadenz-Schätzung (Schritte/Minute) je schritt-intensiver MET-
  // Kategorie, genutzt von schrittIntensiveMetKorrektur. Kategorien ohne
  // Eintrag hier (kraft, radfahren, schwimmen, yoga) erzeugen keine
  // nennenswerten Schritte und lösen daher nie eine Reduktion aus.
  const SCHRITTE_PRO_MINUTE = { laufen: 150, gehen_wandern: 110, ballsport: 100 };

  /**
   * NEAT-Reduktion für schritt-intensive MET-Aktivitäten (Laufen ohne
   * eigene Lauf-km-Angabe, Gehen/Wandern, Ballsport), sofern der Tracker
   * auch beim Sport getragen wird. Rechnet Trainingsstunden über die
   * Kadenz-Schätzung in eine Äquivalent-Distanz um und nutzt danach dieselbe
   * Gehbasis-Formel wie laufAnpassung -- keine zweite, abweichende
   * Kostenlogik für dieselbe physikalische Größe.
   * @param {{aktivitaeten: {aktivitaetId:string, stundenProWoche:number}[], weightKg:number, reeAdj:number, traegtTracker:boolean, laufAusschliessen:boolean}} p
   */
  function schrittIntensiveMetKorrektur({ aktivitaeten, weightKg, reeAdj, traegtTracker, laufAusschliessen }) {
    if (!traegtTracker || !aktivitaeten || !aktivitaeten.length || !weightKg || !reeAdj) return 0;
    let kmWocheSumme = 0;
    for (const a of aktivitaeten) {
      const eintrag = MET_AKTIVITAETEN.find((m) => m.id === a.aktivitaetId);
      if (!eintrag) continue;
      const schritteProMin = SCHRITTE_PRO_MINUTE[eintrag.kategorieId];
      if (!schritteProMin) continue; // schrittneutrale Kategorie (kraft, radfahren, schwimmen, yoga)
      if (eintrag.kategorieId === "laufen" && laufAusschliessen) continue; // bereits über Lauf-km abgedeckt
      const schritteProWoche = a.stundenProWoche * 60 * schritteProMin;
      kmWocheSumme += schritteZuKmWoche(schritteProWoche);
    }
    return gehbasisPalAequivalent({ kmWoche: kmWocheSumme, weightKg, reeAdj });
  }

  /**
   * MET-basierte Sportberechnung als PAL-Äquivalent. Ersetzt den Sport-
   * Häufigkeits-Zuschlag (siehe berechnung.js/ui.js), statt ihn additiv zu
   * ergänzen — beide beschreiben dieselbe Achse (Trainingsintensität), eine
   * zusätzliche Addition würde Doppelzählung riskieren. Die Alltagsaktivität
   * (NEAT) ist davon unabhängig und bleibt in jedem Fall unberührt.
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
    NEAT_STUFEN,
    neatPalBereich,
    SPORT_HAEUFIGKEIT_STUFEN,
    sportHaeufigkeitZuschlag,
    fidgetingPalZuschlag,
    gehbasisPalAequivalent,
    schritteZuKmWoche,
    laufAnpassung,
    SCHRITTE_PRO_MINUTE,
    SCHRITTLAENGE_M,
    schrittIntensiveMetKorrektur,
    sportMet,
    MET_AKTIVITAETEN,
    schwangerschaftStillzeit,
    betaBlocker,
    HINWEIS_IDS,
    clamp,
  };
})();
