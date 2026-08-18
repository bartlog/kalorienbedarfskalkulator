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
   * @returns {{ formelId: string, formelName: string, reeBasis: number, begruendungId: string, begruendungParams: object|undefined, hinweise: string[], quelle: string, bmi: number }}
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
      };
    }

    if (bmi >= 30 || bmi < 18.5) {
      const entry = formeln.getById("mueller");
      return {
        formelId: entry.id,
        formelName: entry.name,
        reeBasis: entry.fn({ gender: p.gender, age: p.age, weightKg: p.weightKg, bmi }),
        begruendungId: "bmi_extreme",
        begruendungParams: { bmi },
        hinweise,
        quelle: entry.quelle,
        bmi,
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
      };
    }

    const entry = formeln.getById("mifflin");
    return {
      formelId: entry.id,
      formelName: entry.name,
      reeBasis: entry.fn(p),
      begruendungId: "default",
      hinweise,
      quelle: entry.quelle,
      bmi,
    };
  }

  return { selectREE, calculateBmi };
})(window.KBR.formeln);
