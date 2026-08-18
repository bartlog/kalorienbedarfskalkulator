window.KBR = window.KBR || {};

/*
 * Berechnungspipeline: REE_basis → REE_adj → PAL_adj → TEE → Zielanpassung,
 * plus Unsicherheitsband (Root-Sum-Square) und Plausibilitätsgrenzen.
 * Siehe PLAN.md Abschnitte 2 und 4. Reine Funktionen, kein DOM-Zugriff.
 */
window.KBR.berechnung = (function (auswahl, modifikatoren) {
  "use strict";

  const GOAL_ADJUSTMENT = {
    lose: { factor: -0.2, label: "Kalorienziel zum Abnehmen" },
    maintain: { factor: 0, label: "Kalorienziel zum Halten" },
    gain: { factor: 0.15, label: "Kalorienziel zum Zunehmen" },
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
    const basisPAL = eingabe.basisPAL;
    // Die MET-Berechnung ersetzt die Aktivitätslevel-Schätzung (basisPAL wird
    // dafür im UI auf "Sitzend" fixiert) — kein separater additiver "PAL-Zuschlag"
    // mehr, um Doppelzählung mit dem ganzheitlichen Aktivitätslevel auszuschließen.
    let sportZuschlag = null;
    if (eingabe.sport && eingabe.sport.modus === "met") {
      sportZuschlag = modifikatoren.sportMet({
        metWert: eingabe.sport.metWert,
        stundenProEinheit: eingabe.sport.stundenProEinheit,
        einheitenProWoche: eingabe.sport.einheitenProWoche,
        weightKg: eingabe.weightKg,
        reeAdj: reeAdjHaupt,
      });
    }

    const zuschlagMin = sportZuschlag ? sportZuschlag.min : 0;
    const zuschlagMax = sportZuschlag ? sportZuschlag.max : 0;
    const zuschlagHaupt = (zuschlagMin + zuschlagMax) / 2;

    return {
      palAdjHaupt: clamp(basisPAL + zuschlagHaupt, 1.2, 2.4),
      palAdjMin: clamp(basisPAL + zuschlagMin, 1.2, 2.4),
      palAdjMax: clamp(basisPAL + zuschlagMax, 1.2, 2.4),
      sportModus: eingabe.sport ? eingabe.sport.modus : "keine",
      sportZuschlagMin: zuschlagMin,
      sportZuschlagMax: zuschlagMax,
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

  function sammleAktiveModifikatoren(eingabe, ree, pal, teeAdditiv) {
    const liste = [];
    if (eingabe.adaptiveThermogeneseAktiv) {
      liste.push("Adaptive Thermogenese (Diät-Historie): REE ×0,90–0,95");
    }
    if (eingabe.schilddruese && eingabe.schilddruese.aktiv) {
      const p = eingabe.schilddruese.faktorProzent;
      liste.push(`Schilddrüsen-Diagnose: REE ${p >= 0 ? "+" : ""}${p} %`);
    }
    if (eingabe.fieber && eingabe.fieber.aktiv) {
      const deltaT = eingabe.fieber.temperaturC - 37;
      liste.push(`Fieber (${eingabe.fieber.temperaturC} °C, Δ${deltaT.toFixed(1)} °C über 37 °C): REE +10–13 % pro °C`);
    }
    if (pal.sportModus === "met") {
      liste.push(`Sport (MET-Berechnung, ersetzt Aktivitätslevel-Schätzung): PAL-Äquivalent +${pal.sportZuschlagMin.toFixed(2)}`);
    }
    if (teeAdditiv.schwangerschaft) {
      liste.push(
        eingabe.schwangerschaftStillzeit === "schwanger"
          ? "Schwangerschaft: TEE +250 kcal"
          : "Stillzeit: TEE +500 kcal"
      );
    }
    if (teeAdditiv.betaBlocker) {
      liste.push("Beta-Blocker: TEE −50…−100 kcal (chronisch, daher trotz kleiner Größenordnung eingerechnet)");
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
   *   zusätzlich: basisPAL, ziel ('lose'|'maintain'|'gain'), sport, schilddruese, fieber,
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

    const zielFaktor = GOAL_ADJUSTMENT[eingabe.ziel].factor;
    const zielHaupt = teeHaupt * (1 + zielFaktor);
    const zielMin = teeMin * (1 + zielFaktor);
    const zielMax = teeMax * (1 + zielFaktor);
    const zielBandKcal = teeBandKcal * (1 + zielFaktor);
    const zielUnterReeBasis = zielHaupt < ree.reeBasis;

    // Bei Adipositas (BMI >=30) führt Protein/kg-Gesamtgewicht zu überhöhten
    // Werten — falls FFM bekannt (gemessen oder aus KFA abgeleitet), wird sie
    // statt des Gesamtgewichts als Referenz für den Proteinbedarf verwendet.
    const proteinBasisFfm = ree.auswahl.bmi >= 30 && !!eingabe.ffmKg;
    const proteinReferenzgewicht = proteinBasisFfm ? eingabe.ffmKg : eingabe.weightKg;

    return {
      formel: {
        id: ree.auswahl.formelId,
        name: ree.auswahl.formelName,
        begruendung: ree.auswahl.begruendung,
        hinweise: ree.auswahl.hinweise,
        quelle: ree.auswahl.quelle,
        bmi: ree.auswahl.bmi,
      },
      ree: { haupt: ree.reeAdjHaupt, min: ree.reeAdjMin, max: ree.reeAdjMax, bandKcal: ree.bandKcal, basis: ree.reeBasis },
      tee: { haupt: teeHaupt, min: teeMin, max: teeMax, bandKcal: teeBandKcal },
      ziel: {
        haupt: zielHaupt,
        min: zielMin,
        max: zielMax,
        bandKcal: zielBandKcal,
        label: GOAL_ADJUSTMENT[eingabe.ziel].label,
        unterReeBasis: zielUnterReeBasis,
      },
      fettabbau: berechneFettabbauKalorien(teeHaupt, ree.reeBasis),
      proteinErhalt: berechneProteinbedarf(proteinReferenzgewicht, 1.2, 1.6),
      proteinAufbau: berechneProteinbedarf(proteinReferenzgewicht, 1.6, 2.0),
      proteinBasis: proteinBasisFfm ? "ffm" : "gewicht",
      aktiveModifikatoren: sammleAktiveModifikatoren(eingabe, ree, pal, teeAdditiv),
      hinweiseNichtGerechnet: modifikatoren.HINWEISE,
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
