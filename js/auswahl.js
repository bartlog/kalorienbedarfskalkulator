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
  // reiner Vergleichswert mitgeliefert — als Array (`alternativen`), da beide
  // Zonen unabhängig voneinander zutreffen können (z. B. BMI 29,5 UND Alter
  // 62 gleichzeitig) und dann beide Vergleichswerte gleichzeitig erscheinen
  // sollen, statt sich exklusiv auszuschließen. ui.js zeigt die primäre REE
  // plus alle Einträge aus `alternativen` nebeneinander.
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

  function vergleichswert(entryId, fn, args, softBoundary) {
    const entry = formeln.getById(entryId);
    return { formelId: entry.id, formelName: entry.name, reeBasis: fn(args), softBoundary };
  }

  // Die beiden Zonen sind voneinander unabhängig (Option 2 "Stacking"): jede
  // liefert für sich einen Alternativ-Eintrag, sofern sie zutrifft — nie
  // exklusiv gegeneinander. Statt "primär" nochmal als eigenen Alternativ-
  // Eintrag zurückzugeben, wird jeweils die *andere* der beiden Formeln
  // dieser Zone verglichen (z. B. bei Müller primär -> Mifflin als
  // BMI-Vergleich, sonst -> Müller als BMI-Vergleich).
  function bmiAlternative(primaerId, bmi, p) {
    if (!istBmiSoftZone(bmi)) return null;
    if (primaerId === "mueller") {
      return vergleichswert("mifflin", formeln.mifflinStJeor, p, "bmi");
    }
    return vergleichswert("mueller", formeln.muellerBmiGraduiert, { gender: p.gender, age: p.age, weightKg: p.weightKg }, "bmi");
  }

  function alterAlternative(primaerId, age, p) {
    if (!istAlterSoftZone(age)) return null;
    if (primaerId === "luehrmann") {
      return vergleichswert("mifflin", formeln.mifflinStJeor, p, "alter");
    }
    return vergleichswert("luehrmann", formeln.luehrmann, p, "alter");
  }

  // Reihenfolge stabil bmi-vor-alter, unabhängig davon welche Formel primär ist.
  function alternativenFuer(primaerId, bmi, p) {
    return [bmiAlternative(primaerId, bmi, p), alterAlternative(primaerId, p.age, p)].filter(Boolean);
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
   * @returns {{ formelId: string, formelName: string, reeBasis: number, begruendungId: string, begruendungParams: object|undefined, hinweise: string[], quelle: string, bmi: number, alternativen: {formelId:string,formelName:string,reeBasis:number,softBoundary:'bmi'|'alter'}[] }}
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
          alternativen: [],
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
        alternativen: [],
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
        alternativen: [],
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
        alternativen: alternativenFuer(entry.id, bmi, p),
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
        alternativen: alternativenFuer(entry.id, bmi, p),
      };
    }

    const entry = formeln.getById("mifflin");
    // Beide Übergangszonen (BMI 29-31, Alter 60-69) wirken unabhängig und
    // werden unabhängig voneinander gestapelt (Option 2 "Stacking") — keine
    // Vorrangregel mehr zwischen ihnen, beide Alternativen können gleichzeitig
    // erscheinen, wenn beide Zonen zutreffen (z. B. BMI 29,5 UND Alter 62).
    return {
      formelId: entry.id,
      formelName: entry.name,
      reeBasis: entry.fn(p),
      begruendungId: "default",
      hinweise,
      quelle: entry.quelle,
      bmi,
      alternativen: alternativenFuer(entry.id, bmi, p),
    };
  }

  return { selectREE, calculateBmi };
})(window.KBR.formeln);
