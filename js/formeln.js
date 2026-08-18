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
  // Nur die Adipositas-Stufe (BMI ≥30) wird vom Entscheidungsbaum angesteuert
  // (siehe auswahl.js) — Normalgewicht/Übergewicht laufen über andere Zweige.
  // Die ursprünglich ebenfalls implementierte Untergewicht-Stufe wurde entfernt:
  // Gegenprobe gegen Mifflin-St-Jeor zeigte, dass sie über die gesamte
  // Untergewichts-Spanne 35–70 % niedrigere REE-Werte lieferte (physiologisch
  // unplausibel — die Adipositas-Stufe weicht an der Nachbargrenze BMI=30 nur
  // ~2 % von Mifflin ab, die entfernte Untergewicht-Stufe war also vermutlich
  // fehlerhaft transkribiert, nicht bloß eine erwartbare Formeleigenschaft).
  // Ergebnis der Originalgleichung liegt in MJ/Tag, ×239 in kcal/Tag umgerechnet.
  function muellerBmiGraduiert({ gender, age, weightKg }) {
    const s = gender === "male" ? 1 : 0;
    const mjProTag = 0.05 * weightKg - 0.01586 * age + 1.103 * s + 2.924;
    return mjProTag * 239;
  }

  // Lührmann et al. (2002), Senioren/Geriatrie ab ca. 60–65 Jahren.
  function luehrmann({ gender, age, weightKg }) {
    const s = gender === "male" ? 1 : 0;
    return 757 + 11.9 * weightKg - 3.7 * age + 178 * s;
  }

  // Formelnamen (Eigennamen/Studien) bleiben sprachneutral; `quelle` enthält
  // neben der bloßen Zitation auch beschreibenden Fließtext und wird daher
  // als {de, en} geführt — ui.js wählt die aktuelle Sprache beim Rendern.
  const REGISTRY = [
    {
      id: "mifflin",
      name: "Mifflin-St-Jeor",
      fn: mifflinStJeor,
      quelle: {
        de: "Mifflin MD, St Jeor ST et al. (1990), American Journal of Clinical Nutrition — Standardformel, validiert an einer breiten gesunden Erwachsenenpopulation. Standardschätzfehler ≈ ±10 % (±200 kcal).",
        en: "Mifflin MD, St Jeor ST et al. (1990), American Journal of Clinical Nutrition — the standard formula, validated on a broad healthy adult population. Standard error of estimate ≈ ±10% (±200 kcal).",
      },
    },
    {
      id: "cunningham",
      name: "Cunningham (1991) / Katch-McArdle",
      fn: cunningham,
      quelle: {
        de: "Cunningham JJ (1991), American Journal of Clinical Nutrition — REE = 370 + 21,6 × FFM. Rechnerisch identisch mit der als \"Katch-McArdle-Formel\" bekannten Gleichung. FFM entweder direkt gemessen (DXA/BIA/ADP) oder aus Körpergewicht und Körperfettanteil abgeleitet.",
        en: "Cunningham JJ (1991), American Journal of Clinical Nutrition — REE = 370 + 21.6 × FFM. Mathematically identical to the equation known as the \"Katch-McArdle formula\". FFM either measured directly (DXA/BIA/ADP) or derived from body weight and body fat percentage.",
      },
    },
    {
      id: "tenhaaf",
      name: "Ten Haaf & Weijs (2014)",
      fn: tenHaaf,
      quelle: {
        de: "Ten Haaf T, Weijs PJM (2014), PLOS ONE 9(9):e108460 — FFM-basierte Gleichung, validiert an Freizeitsportlern von 18–35 Jahren.",
        en: "Ten Haaf T, Weijs PJM (2014), PLOS ONE 9(9):e108460 — FFM-based equation, validated on recreational athletes aged 18–35.",
      },
    },
    {
      id: "mueller",
      name: "Müller BMI-graduiert (2004)",
      fn: muellerBmiGraduiert,
      quelle: {
        de: "Müller MJ et al. (2004) — anthropometrische, nach BMI gestufte Gleichungen; hier die Adipositas-Stufe (BMI ≥30). Ergebnis ursprünglich in MJ/Tag, ×239 in kcal/Tag umgerechnet.",
        en: "Müller MJ et al. (2004) — anthropometric equations graduated by BMI; the obesity tier (BMI ≥30) is used here. Result originally in MJ/day, converted to kcal/day (×239).",
      },
    },
    {
      id: "luehrmann",
      name: "Lührmann et al. (2002)",
      fn: luehrmann,
      quelle: {
        de: "Lührmann PM et al. (2002) — Geriatrie/Senioren ab ca. 60–65 Jahren, an einer deutschen Seniorenpopulation validiert.",
        en: "Lührmann PM et al. (2002) — geriatrics/seniors from approx. 60–65 years, validated on a German senior population.",
      },
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
