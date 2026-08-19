window.KBR = window.KBR || {};

/*
 * Formelauswahl — Präzedenzbaum, siehe PLAN.md Abschnitt 1.
 * Leitprinzip: gemessene Datenqualität schlägt Populationszugehörigkeit.
 * Reine Funktion, kein DOM-Zugriff — Begründungen/Hinweise werden als
 * sprachneutrale IDs zurückgegeben (begruendungId/hinweise), die ui.js
 * über i18n.js in die passende Sprache übersetzt.
 */
window.KBR.auswahl = (function (formeln) {
  "use strict";

  function calculateBmi(weightKg, heightCm) {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  // ---- Soft Boundaries -----------------------------------------------------
  // An den beiden Formel-Übergängen (Übergewicht/Adipositas bei BMI 30,
  // Erwachsene/Senioren bei Alter 65) ist der harte Formelwechsel eine
  // Vereinfachung — kurz vor/nach der Schwelle unterscheiden sich beide
  // Formeln nur wenig, aber der Sprung zwischen ihnen wirkt unmotiviert.
  // In diesen Zonen wird daher zusätzlich zur primären REE (die weiterhin
  // die gesamte Pipeline speist) der Wert der jeweils anderen Formel als
  // reiner Vergleichswert mitgeliefert — ui.js zeigt beide nebeneinander.
  const BMI_SOFT_MIN = 29.0;
  const BMI_SOFT_MAX = 31.0;
  const ALTER_SOFT_MIN = 60;
  const ALTER_SOFT_MAX = 69;

  function istBmiSoftZone(bmi) {
    return bmi >= BMI_SOFT_MIN && bmi <= BMI_SOFT_MAX;
  }

  function istAlterSoftZone(age) {
    return age >= ALTER_SOFT_MIN && age <= ALTER_SOFT_MAX;
  }

  function vergleichswert(entryId, fn, args) {
    const entry = formeln.getById(entryId);
    return { formelId: entry.id, formelName: entry.name, reeBasis: fn(args) };
  }

  /**
   * @param {object} p
   * @param {'male'|'female'} p.gender
   * @param {number} p.age
   * @param {number} p.heightCm
   * @param {number} p.weightKg
   * @param {boolean} [p.ffmMeasured] - FFM per DXA/BIA/ADP gemessen (nicht geschätzt)
   * @param {number} [p.ffmKg] - gemessene fettfreie Masse, nur relevant wenn ffmMeasured
   * @param {boolean} [p.istSportler] - Freizeitsportler (für Ten-Haaf-Validierungspopulation)
   * @param {boolean} [p.schwangerschaftStillzeit]
   * @returns {{ formelId: string, formelName: string, reeBasis: number, begruendungId: string, begruendungParams: object|undefined, hinweise: string[], quelle: string, bmi: number, vergleich: {formelId:string,formelName:string,reeBasis:number}|null, softBoundary: 'bmi'|'alter'|null }}
   */
  function selectREE(p) {
    const bmi = calculateBmi(p.weightKg, p.heightCm);
    const hinweise = [];

    if (p.ffmMeasured && p.ffmKg) {
      const ausserhalbValidierung = p.age > 65 || bmi >= 35;
      if (ausserhalbValidierung) {
        hinweise.push("outside_validation");
      }

      if (p.istSportler && p.age >= 18 && p.age <= 35) {
        const entry = formeln.getById("tenhaaf");
        return {
          formelId: entry.id,
          formelName: entry.name,
          reeBasis: entry.fn({ ffmKg: p.ffmKg }),
          begruendungId: "ffm_athlete",
          hinweise,
          quelle: entry.quelle,
          bmi,
          vergleich: null,
          softBoundary: null,
        };
      }

      const entry = formeln.getById("cunningham");
      return {
        formelId: entry.id,
        formelName: entry.name,
        reeBasis: entry.fn({ ffmKg: p.ffmKg }),
        begruendungId: "ffm_measured",
        hinweise,
        quelle: entry.quelle,
        bmi,
        vergleich: null,
        softBoundary: null,
      };
    }

    if (p.schwangerschaftStillzeit) {
      const entry = formeln.getById("mifflin");
      return {
        formelId: entry.id,
        formelName: entry.name,
        reeBasis: entry.fn(p),
        begruendungId: "pregnancy",
        hinweise: ["pregnancy_not_validated"],
        quelle: entry.quelle,
        bmi,
        vergleich: null,
        softBoundary: null,
      };
    }

    // Nur Adipositas nutzt Müller — die frühere Untergewicht-Stufe (BMI<18,5)
    // wurde entfernt, siehe Begründung bei muellerBmiGraduiert in formeln.js.
    // Untergewicht fällt hier durch auf Lührmann (falls Senior) bzw. Mifflin.
    if (bmi >= 30) {
      const entry = formeln.getById("mueller");
      return {
        formelId: entry.id,
        formelName: entry.name,
        reeBasis: entry.fn({ gender: p.gender, age: p.age, weightKg: p.weightKg }),
        begruendungId: "bmi_extreme",
        begruendungParams: { bmi },
        hinweise,
        quelle: entry.quelle,
        bmi,
        vergleich: istBmiSoftZone(bmi) ? vergleichswert("mifflin", formeln.mifflinStJeor, p) : null,
        softBoundary: istBmiSoftZone(bmi) ? "bmi" : null,
      };
    }

    if (p.age >= 65) {
      const entry = formeln.getById("luehrmann");
      return {
        formelId: entry.id,
        formelName: entry.name,
        reeBasis: entry.fn(p),
        begruendungId: "age_senior",
        hinweise,
        quelle: entry.quelle,
        bmi,
        vergleich: istAlterSoftZone(p.age) ? vergleichswert("mifflin", formeln.mifflinStJeor, p) : null,
        softBoundary: istAlterSoftZone(p.age) ? "alter" : null,
      };
    }

    const entry = formeln.getById("mifflin");
    // Bei Überlappung beider Zonen (z. B. BMI 29,5 UND Alter 62) hat die
    // BMI-Zone Vorrang — dieselbe Priorisierung wie im Baum oben (Müller vor
    // Lührmann), da Extremgewicht laut ursprünglichem Konzept stärker auf den
    // Ruheumsatz wirkt als das Alter allein.
    let vergleich = null;
    let softBoundary = null;
    if (istBmiSoftZone(bmi)) {
      vergleich = vergleichswert("mueller", formeln.muellerBmiGraduiert, { gender: p.gender, age: p.age, weightKg: p.weightKg });
      softBoundary = "bmi";
    } else if (istAlterSoftZone(p.age)) {
      vergleich = vergleichswert("luehrmann", formeln.luehrmann, p);
      softBoundary = "alter";
    }
    return {
      formelId: entry.id,
      formelName: entry.name,
      reeBasis: entry.fn(p),
      begruendungId: "default",
      hinweise,
      quelle: entry.quelle,
      bmi,
      vergleich,
      softBoundary,
    };
  }

  return { selectREE, calculateBmi };
})(window.KBR.formeln);
