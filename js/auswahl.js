window.KBR = window.KBR || {};

/*
 * Formelauswahl — Präzedenzbaum, siehe PLAN.md Abschnitt 1.
 * Leitprinzip: gemessene Datenqualität schlägt Populationszugehörigkeit.
 * Reine Funktion, kein DOM-Zugriff.
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
   * @returns {{ formelId: string, formelName: string, reeBasis: number, begruendung: string, hinweise: string[], quelle: string, bmi: number }}
   */
  function selectREE(p) {
    const bmi = calculateBmi(p.weightKg, p.heightCm);
    const hinweise = [];

    if (p.ffmMeasured && p.ffmKg) {
      const ausserhalbValidierung = p.age > 65 || bmi >= 35;
      if (ausserhalbValidierung) {
        hinweise.push(
          "Außerhalb der Validierungspopulation der gewählten Formel (Alter >65 oder BMI ≥35) — Ergebnis mit größerer Unsicherheit behaftet."
        );
      }

      if (p.istSportler && p.age >= 18 && p.age <= 35) {
        const entry = formeln.getById("tenhaaf");
        return {
          formelId: entry.id,
          formelName: entry.name,
          reeBasis: entry.fn({ ffmKg: p.ffmKg }),
          begruendung:
            "FFM gemessen, Freizeitsportler 18–35 Jahre — Ten-Haaf-Gleichung deckt genau diese Validierungspopulation ab.",
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
        begruendung:
          "FFM gemessen; Cunningham bildet Alters- und Adipositaseffekte direkt über die fettfreie Masse ab — Proxy-Korrekturen anderer Formeln sind damit überflüssig.",
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
        begruendung: "Schwangerschaft/Stillzeit — Mifflin-St-Jeor als Standard verwendet.",
        hinweise: ["Nicht an Schwangeren/Stillenden validiert — Ergebnis mit zusätzlicher Unsicherheit."],
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
        begruendung:
          "Extremgewicht (BMI " +
          bmi.toFixed(1) +
          ") dominiert den Ruheumsatz; Müller enthält Alter bereits als Term und ist nach BMI gestuft.",
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
        begruendung: "Alter ≥65 Jahre — Lührmann ist an einer deutschen Seniorenpopulation validiert.",
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
      begruendung: "Standardfall ohne gemessene FFM, Schwangerschaft, Extremgewicht oder Senioren-Alter.",
      hinweise,
      quelle: entry.quelle,
      bmi,
    };
  }

  return { selectREE, calculateBmi };
})(window.KBR.formeln);
