window.KBR = window.KBR || {};

/*
 * REE-Formelregistry — reine Funktionen, kein DOM-Zugriff (siehe CLAUDE.md).
 * Jede Formel erwartet ein Objekt mit den Feldern, die sie tatsächlich braucht,
 * und liefert den Ruheenergieumsatz (REE) in kcal/Tag zurück.
 *
 * Koeffizienten-Quellen: siehe REGISTRY unten (Feld `quelle`). Ten-Haaf/Müller/
 * Lührmann wurden aus der Gemini-Konzeption des Nutzers übernommen, nicht
 * automatisiert aus dem Web extrahiert (Web-Recherche lieferte für diese drei
 * keine verlässlichen Koeffizienten — siehe KONTEXT.md).
 */
window.KBR.formeln = (function () {
  "use strict";

  function mifflinStJeor({ gender, age, heightCm, weightKg }) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === "male" ? base + 5 : base - 161;
  }

  // Cunningham (1991 Revision): REE = 370 + 21,6 × FFM(kg).
  // Rechnerisch identisch mit der vielzitierten "Katch-McArdle"-Formel —
  // beide Namen bezeichnen dieselbe Gleichung, daher eine gemeinsame Funktion.
  function cunningham({ ffmKg }) {
    return 370 + 21.6 * ffmKg;
  }

  // FFM aus Körpergewicht + Körperfettanteil (%) — zweiter Eingabeweg für
  // dieselbe Cunningham/Katch-McArdle-Formel, wenn keine direkte FFM-Messung
  // (DXA/BIA/ADP) vorliegt, sondern nur ein geschätzter/gemessener KFA.
  function ffmAusKfa({ weightKg, kfaProzent }) {
    return weightKg * (1 - kfaProzent / 100);
  }

  // Ten Haaf & Weijs (2014), FFM-basierte Gleichung für Freizeitsportler 18–35 J.
  function tenHaaf({ ffmKg }) {
    return 22.771 * ffmKg + 484.264;
  }

  // Müller et al. (2004), BMI-gestufte anthropometrische Gleichungen.
  // Nur die beiden Stufen, die der Entscheidungsbaum tatsächlich ansteuert
  // (Untergewicht / Adipositas) — Normalgewicht/Übergewicht werden hier nie
  // erreicht, da diese Fälle über andere Zweige laufen (siehe auswahl.js).
  // Ergebnis der Originalgleichung liegt in MJ/Tag, ×239 in kcal/Tag umgerechnet.
  function muellerBmiGraduiert({ gender, age, weightKg, bmi }) {
    const s = gender === "male" ? 1 : 0;
    const mjProTag =
      bmi <= 18.5
        ? 0.07122 * weightKg - 0.02149 * age + 0.82 * s + 0.731
        : 0.05 * weightKg - 0.01586 * age + 1.103 * s + 2.924;
    return mjProTag * 239;
  }

  // Lührmann et al. (2002), Senioren/Geriatrie ab ca. 60–65 Jahren.
  function luehrmann({ gender, age, weightKg }) {
    const s = gender === "male" ? 1 : 0;
    return 757 + 11.9 * weightKg - 3.7 * age + 178 * s;
  }

  const REGISTRY = [
    {
      id: "mifflin",
      name: "Mifflin-St-Jeor",
      fn: mifflinStJeor,
      quelle:
        "Mifflin MD, St Jeor ST et al. (1990), American Journal of Clinical Nutrition — Standardformel, validiert an einer breiten gesunden Erwachsenenpopulation. Standardschätzfehler ≈ ±10 % (±200 kcal).",
    },
    {
      id: "cunningham",
      name: "Cunningham (1991) / Katch-McArdle",
      fn: cunningham,
      quelle:
        "Cunningham JJ (1991), American Journal of Clinical Nutrition — REE = 370 + 21,6 × FFM. Rechnerisch identisch mit der als \"Katch-McArdle-Formel\" bekannten Gleichung. FFM entweder direkt gemessen (DXA/BIA/ADP) oder aus Körpergewicht und Körperfettanteil abgeleitet.",
    },
    {
      id: "tenhaaf",
      name: "Ten Haaf & Weijs (2014)",
      fn: tenHaaf,
      quelle:
        "Ten Haaf T, Weijs PJM (2014), PLOS ONE 9(9):e108460 — FFM-basierte Gleichung, validiert an Freizeitsportlern von 18–35 Jahren.",
    },
    {
      id: "mueller",
      name: "Müller BMI-graduiert (2004)",
      fn: muellerBmiGraduiert,
      quelle:
        "Müller MJ et al. (2004) — anthropometrische, nach BMI gestufte Gleichungen; hier die Stufen Untergewicht (BMI ≤18,5) und Adipositas (BMI ≥30). Ergebnis ursprünglich in MJ/Tag, ×239 in kcal/Tag umgerechnet.",
    },
    {
      id: "luehrmann",
      name: "Lührmann et al. (2002)",
      fn: luehrmann,
      quelle:
        "Lührmann PM et al. (2002) — Geriatrie/Senioren ab ca. 60–65 Jahren, an einer deutschen Seniorenpopulation validiert.",
    },
  ];

  function getById(id) {
    const entry = REGISTRY.find((e) => e.id === id);
    if (!entry) {
      throw new Error(`Unbekannte Formel-ID: ${id}`);
    }
    return entry;
  }

  return {
    mifflinStJeor,
    cunningham,
    tenHaaf,
    muellerBmiGraduiert,
    luehrmann,
    ffmAusKfa,
    REGISTRY,
    getById,
  };
})();
