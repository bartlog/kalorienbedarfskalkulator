window.KBR = window.KBR || {};

/*
 * Berechnungspipeline: REE_basis → REE_adj → PAL_adj → TEE → Zielanpassung,
 * plus Unsicherheitsband (Root-Sum-Square) und Plausibilitätsgrenzen.
 * Siehe PLAN.md Abschnitte 2 und 4. Reine Funktionen, kein DOM-Zugriff.
 */
window.KBR.berechnung = (function (auswahl, modifikatoren) {
  "use strict";

  // Anzeigetext pro Ziel liegt sprachneutral in i18n.js unter goal_label_<id>.
  const GOAL_ADJUSTMENT = {
    lose: { factor: -0.2 },
    maintain: { factor: 0 },
    gain: { factor: 0.15 },
  };

  const FORMEL_UNSICHERHEIT_RELATIV = 0.1; // Mifflin SEE ≈ ±10 %, als generelle Formelunsicherheit angesetzt

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // u = (b-a) / (2*sqrt(3)) — Standardunsicherheit einer Gleichverteilung [a,b]
  function standardunsicherheit(a, b) {
    return Math.abs(b - a) / (2 * Math.sqrt(3));
  }

  // Root-Sum-Square über mehrere unabhängige [min,max]-Quellen (in kcal),
  // jede Quelle hält die übrigen Stufen der Pipeline am Hauptwert fest.
  function kombiniereBandbreite(quellen) {
    const uGes = Math.sqrt(quellen.reduce((sum, q) => sum + Math.pow(standardunsicherheit(q.min, q.max), 2), 0));
    return 1.96 * uGes;
  }

  function berechneReeMitBand(eingabe) {
    const auswahlErgebnis = auswahl.selectREE(eingabe);
    const reeBasis = auswahlErgebnis.reeBasis;

    const aktiveFaktoren = {
      adaptiveThermogenese: modifikatoren.adaptiveThermogenese({ aktiv: !!eingabe.adaptiveThermogeneseAktiv }),
      schilddruese: eingabe.schilddruese && eingabe.schilddruese.aktiv
        ? modifikatoren.schilddruese({ faktorProzent: eingabe.schilddruese.faktorProzent })
        : null,
      fieber: eingabe.fieber && eingabe.fieber.aktiv
        ? modifikatoren.fieber({ koerpertemperaturC: eingabe.fieber.temperaturC })
        : null,
    };
    const reeFaktor = modifikatoren.kombiniereReeFaktoren(aktiveFaktoren);
    const reeFaktorHaupt = (reeFaktor.faktorMin + reeFaktor.faktorMax) / 2;

    const reeAdjHaupt = clamp(reeBasis * reeFaktorHaupt, reeBasis * 0.8, reeBasis * 1.4);
    const reeAdjMin = clamp(reeBasis * reeFaktor.faktorMin, reeBasis * 0.8, reeBasis * 1.4);
    const reeAdjMax = clamp(reeBasis * reeFaktor.faktorMax, reeBasis * 0.8, reeBasis * 1.4);

    const bandKcal = kombiniereBandbreite([
      { min: reeAdjMin, max: reeAdjMax },
      { min: reeBasis * (1 - FORMEL_UNSICHERHEIT_RELATIV), max: reeBasis * (1 + FORMEL_UNSICHERHEIT_RELATIV) },
    ]);

    return {
      auswahl: auswahlErgebnis,
      reeBasis,
      reeAdjHaupt,
      reeAdjMin,
      reeAdjMax,
      bandKcal,
      aktiveFaktoren,
    };
  }

  function berechnePalMitBand(eingabe, reeAdjHaupt) {
    // NEAT (Alltag, Schrittzahl-basiert) und Sport sind unabhängige, addierte
    // PAL-Bausteine — siehe modifikatoren.js. Die MET-Berechnung ersetzt nur
    // den Sport-Zuschlag (dafür wird die Sport-Häufigkeit im UI auf "Kein
    // Sport" fixiert), NEAT bleibt davon in jedem Fall unberührt.
    const neat = modifikatoren.neatPalBereich({ neatSchritteId: eingabe.neatSchritteId }) || { palMin: 1.2, palMax: 1.3 };

    const sportModus = eingabe.sport ? eingabe.sport.modus : "keine";
    let sportZuschlag = null;
    if (sportModus === "met") {
      sportZuschlag = modifikatoren.sportMet({
        aktivitaeten: eingabe.sport.aktivitaeten,
        weightKg: eingabe.weightKg,
        reeAdj: reeAdjHaupt,
      });
    } else {
      sportZuschlag = modifikatoren.sportHaeufigkeitZuschlag({
        haeufigkeitId: eingabe.sport ? eingabe.sport.haeufigkeitId : null,
      });
    }
    const fidgeting = modifikatoren.fidgetingPalZuschlag({ aktiv: !!eingabe.fidgetingAktiv });
    const lauf = modifikatoren.laufIntensitaetsZuschlag({
      aktiv: !!eingabe.laufAktiv,
      kmWoche: eingabe.laufKmWoche,
      weightKg: eingabe.weightKg,
      reeAdj: reeAdjHaupt,
    });

    const sportMin = sportZuschlag ? sportZuschlag.min : 0;
    const sportMax = sportZuschlag ? sportZuschlag.max : 0;
    const fidgetMin = fidgeting ? fidgeting.min : 0;
    const fidgetMax = fidgeting ? fidgeting.max : 0;
    const laufMin = lauf ? lauf.min : 0;
    const laufMax = lauf ? lauf.max : 0;

    const palMinRoh = neat.palMin + sportMin + fidgetMin + laufMin;
    const palMaxRoh = neat.palMax + sportMax + fidgetMax + laufMax;
    const palHauptRoh =
      (neat.palMin + neat.palMax) / 2 + (sportMin + sportMax) / 2 + (fidgetMin + fidgetMax) / 2 + (laufMin + laufMax) / 2;

    // Obergrenze 2,6 statt der früheren 2,4: NEAT-Max 2,0 + Sport-Max 0,4 +
    // Fidgeting-Max 0,1 = 2,5 würde sonst abgeschnitten. Die alte Grenze war
    // auf das frühere Einzel-Dropdown-Maximum (1,9) plus kleinem MET-Zuschlag
    // kalibriert, jetzt strukturell höher durch drei addierte Quellen.
    return {
      palAdjHaupt: clamp(palHauptRoh, 1.2, 2.6),
      palAdjMin: clamp(palMinRoh, 1.2, 2.6),
      palAdjMax: clamp(palMaxRoh, 1.2, 2.6),
      sportModus,
      sportZuschlagMin: sportMin,
      sportZuschlagMax: sportMax,
      sportAktivitaeten: sportModus === "met" ? eingabe.sport.aktivitaeten : [],
      sportHaeufigkeitId: sportModus !== "met" && eingabe.sport ? eingabe.sport.haeufigkeitId : null,
      neatSchritteId: eingabe.neatSchritteId,
      fidgetingZuschlag: fidgeting,
      laufZuschlag: lauf,
    };
  }

  function berechneTeeAdditiv(eingabe) {
    const schwangerschaft = modifikatoren.schwangerschaftStillzeit({
      status: eingabe.schwangerschaftStillzeit || null,
    });
    const betaBlocker = eingabe.betaBlockerAktiv ? modifikatoren.betaBlocker({ aktiv: true }) : null;

    const min = (schwangerschaft ? schwangerschaft.kcalMin : 0) + (betaBlocker ? betaBlocker.kcalMin : 0);
    const max = (schwangerschaft ? schwangerschaft.kcalMax : 0) + (betaBlocker ? betaBlocker.kcalMax : 0);
    return { min, max, haupt: (min + max) / 2, schwangerschaft, betaBlocker };
  }

  function berechneFettabbauKalorien(teeHaupt, reeBasis) {
    let kcalMin = teeHaupt * 0.8; // 20 % Defizit
    let kcalMax = teeHaupt * 0.85; // 15 % Defizit
    kcalMin = Math.max(kcalMin, teeHaupt - 750);
    kcalMax = Math.min(kcalMax, teeHaupt - 250);
    if (kcalMin > kcalMax) {
      const mitte = (kcalMin + kcalMax) / 2;
      kcalMin = mitte;
      kcalMax = mitte;
    }
    const haupt = (kcalMin + kcalMax) / 2;
    return {
      haupt: Math.max(haupt, reeBasis),
      min: Math.max(kcalMin, reeBasis),
      max: Math.max(kcalMax, reeBasis),
      unterReeBasis: haupt < reeBasis,
    };
  }

  // Liefert sprachneutrale Einträge {id, ...rohe Zahlenwerte} statt fertiger
  // Sätze — ui.js formatiert sie über i18n.js in die aktuelle Sprache (Zahlen-
  // /Vorzeichenformatierung ist Anzeigelogik, gehört also dorthin, nicht hierher).
  function sammleAktiveModifikatoren(eingabe, ree, pal, teeAdditiv) {
    const liste = [];
    if (eingabe.adaptiveThermogeneseAktiv) {
      liste.push({ id: "adaptive_thermogenese" });
    }
    if (eingabe.schilddruese && eingabe.schilddruese.aktiv) {
      liste.push({ id: "schilddruese", prozent: eingabe.schilddruese.faktorProzent });
    }
    if (eingabe.fieber && eingabe.fieber.aktiv) {
      liste.push({ id: "fieber", temp: eingabe.fieber.temperaturC, delta: eingabe.fieber.temperaturC - 37 });
    }
    if (pal.sportModus === "met" && pal.sportAktivitaeten && pal.sportAktivitaeten.length) {
      liste.push({ id: "sport_met", aktivitaeten: pal.sportAktivitaeten, zuschlag: pal.sportZuschlagMin });
    }
    if (pal.sportModus !== "met" && pal.sportHaeufigkeitId && pal.sportHaeufigkeitId !== "keinSport") {
      liste.push({ id: "sport_haeufigkeit", haeufigkeitId: pal.sportHaeufigkeitId, zuschlag: pal.sportZuschlagMin });
    }
    if (pal.fidgetingZuschlag) {
      liste.push({ id: "fidgeting", zuschlagMin: pal.fidgetingZuschlag.min, zuschlagMax: pal.fidgetingZuschlag.max });
    }
    if (pal.laufZuschlag) {
      liste.push({ id: "lauf_intensitaet", kmWoche: eingabe.laufKmWoche, zuschlag: pal.laufZuschlag.min });
    }
    if (teeAdditiv.schwangerschaft) {
      liste.push({ id: eingabe.schwangerschaftStillzeit === "schwanger" ? "schwangerschaft" : "stillzeit" });
    }
    if (teeAdditiv.betaBlocker) {
      liste.push({ id: "beta_blocker" });
    }
    return liste;
  }

  function berechneProteinbedarf(weightKg, gProKgMin, gProKgMax) {
    return {
      min: weightKg * gProKgMin,
      max: weightKg * gProKgMax,
      haupt: (weightKg * gProKgMin + weightKg * gProKgMax) / 2,
    };
  }

  /**
   * Führt die komplette Pipeline aus und liefert alle Anzeige-relevanten Werte.
   * @param {object} eingabe - siehe auswahl.js/modifikatoren.js für erwartete Felder,
   *   zusätzlich: neatSchritteId, sport ({modus, haeufigkeitId, aktivitaeten}), fidgetingAktiv,
   *   laufAktiv, laufKmWoche, ziel ('lose'|'maintain'|'gain'), schilddruese, fieber,
   *   adaptiveThermogeneseAktiv, betaBlockerAktiv, schwangerschaftStillzeit
   */
  function berechne(eingabe) {
    const ree = berechneReeMitBand(eingabe);
    const pal = berechnePalMitBand(eingabe, ree.reeAdjHaupt);
    const teeAdditiv = berechneTeeAdditiv(eingabe);

    const plausGrenzeMin = ree.reeBasis * 1.0;
    const plausGrenzeMax = ree.reeBasis * 2.5;

    const teeRohHaupt = ree.reeAdjHaupt * pal.palAdjHaupt + teeAdditiv.haupt;
    const teeRohMin = ree.reeAdjMin * pal.palAdjMin + teeAdditiv.min;
    const teeRohMax = ree.reeAdjMax * pal.palAdjMax + teeAdditiv.max;

    const teeHaupt = clamp(teeRohHaupt, plausGrenzeMin, plausGrenzeMax);
    const teeMin = clamp(teeRohMin, plausGrenzeMin, plausGrenzeMax);
    const teeMax = clamp(teeRohMax, plausGrenzeMin, plausGrenzeMax);

    const teeBandKcal = kombiniereBandbreite([
      { min: ree.reeAdjMin * pal.palAdjHaupt + teeAdditiv.haupt, max: ree.reeAdjMax * pal.palAdjHaupt + teeAdditiv.haupt },
      { min: ree.reeAdjHaupt * pal.palAdjMin + teeAdditiv.haupt, max: ree.reeAdjHaupt * pal.palAdjMax + teeAdditiv.haupt },
      { min: ree.reeAdjHaupt * pal.palAdjHaupt + teeAdditiv.min, max: ree.reeAdjHaupt * pal.palAdjHaupt + teeAdditiv.max },
      { min: teeRohHaupt * (1 - FORMEL_UNSICHERHEIT_RELATIV), max: teeRohHaupt * (1 + FORMEL_UNSICHERHEIT_RELATIV) },
    ]);

    // Statt eines Ziels unterhalb des Grundumsatzes komplett zu blockieren:
    // auf den Grundumsatz kappen (Sicherheitsgrenze) und die Abweichung vom
    // gewünschten Defizit als Warnhinweis ausgeben — konsistent mit dem
    // gleichen Deckelungsmuster bei "Kalorienbedarf für Fettabbau" unten.
    const zielFaktor = GOAL_ADJUSTMENT[eingabe.ziel].factor;
    const zielGewuenschtHaupt = teeHaupt * (1 + zielFaktor);
    const zielUnterReeBasis = zielGewuenschtHaupt < ree.reeBasis;
    const zielHaupt = Math.max(zielGewuenschtHaupt, ree.reeBasis);
    const zielMin = Math.max(teeMin * (1 + zielFaktor), ree.reeBasis);
    const zielMax = Math.max(teeMax * (1 + zielFaktor), ree.reeBasis);
    const zielBandKcal = teeBandKcal * (1 + zielFaktor);

    // Unabhängig von der rechnerischen Deckelung: bei Untergewicht ist eine
    // weitere Gewichtsreduktion medizinisch nicht sinnvoll, auch wenn der
    // Zielwert rechnerisch über dem Grundumsatz läge.
    const zielBmiWarnung = eingabe.ziel === "lose" && ree.auswahl.bmi < 18.5;

    // Bei Adipositas (BMI >=30) führt Protein/kg-Gesamtgewicht zu überhöhten
    // Werten — falls FFM bekannt (gemessen oder aus KFA abgeleitet), wird sie
    // statt des Gesamtgewichts als Referenz für den Proteinbedarf verwendet.
    const proteinBasisFfm = ree.auswahl.bmi >= 30 && !!eingabe.ffmKg;
    const proteinReferenzgewicht = proteinBasisFfm ? eingabe.ffmKg : eingabe.weightKg;

    return {
      formel: {
        id: ree.auswahl.formelId,
        name: ree.auswahl.formelName,
        begruendungId: ree.auswahl.begruendungId,
        begruendungParams: ree.auswahl.begruendungParams,
        hinweise: ree.auswahl.hinweise,
        quelle: ree.auswahl.quelle,
        bmi: ree.auswahl.bmi,
        vergleich: ree.auswahl.vergleich,
        softBoundary: ree.auswahl.softBoundary,
      },
      ree: { haupt: ree.reeAdjHaupt, min: ree.reeAdjMin, max: ree.reeAdjMax, bandKcal: ree.bandKcal, basis: ree.reeBasis },
      pal: {
        haupt: pal.palAdjHaupt,
        min: pal.palAdjMin,
        max: pal.palAdjMax,
        hochWarnung: pal.palAdjHaupt >= 2.4,
      },
      tee: { haupt: teeHaupt, min: teeMin, max: teeMax, bandKcal: teeBandKcal },
      ziel: {
        haupt: zielHaupt,
        min: zielMin,
        max: zielMax,
        bandKcal: zielBandKcal,
        unterReeBasis: zielUnterReeBasis,
        gewuenschtHaupt: zielGewuenschtHaupt,
        bmiWarnung: zielBmiWarnung,
      },
      fettabbau: berechneFettabbauKalorien(teeHaupt, ree.reeBasis),
      proteinErhalt: berechneProteinbedarf(proteinReferenzgewicht, 1.2, 1.6),
      proteinAufbau: berechneProteinbedarf(proteinReferenzgewicht, 1.6, 2.0),
      proteinBasis: proteinBasisFfm ? "ffm" : "gewicht",
      aktiveModifikatoren: sammleAktiveModifikatoren(eingabe, ree, pal, teeAdditiv),
      hinweiseNichtGerechnet: modifikatoren.HINWEIS_IDS,
    };
  }

  return {
    berechne,
    clamp,
    standardunsicherheit,
    kombiniereBandbreite,
    GOAL_ADJUSTMENT,
    FORMEL_UNSICHERHEIT_RELATIV,
  };
})(window.KBR.auswahl, window.KBR.modifikatoren);
