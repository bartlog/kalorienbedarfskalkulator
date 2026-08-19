window.KBR = window.KBR || {};

/*
 * Übersetzungsmodul: einfache Key-Value-Dictionaries für DE/EN plus
 * Platzhalter-Ersetzung ({{name}}) und Zahlenformatierung. Reine Daten/
 * Funktionen, kein DOM-Zugriff — das Anwenden auf den DOM übernimmt ui.js.
 */
window.KBR.i18n = (function () {
  "use strict";

  const SPRACHEN = ["de", "en"];
  const SPEICHER_KEY = "kbr:sprache";
  let aktuelleSprache = "de";

  const STRINGS = {
    // ---- Seite / Header ----------------------------------------------------
    app_title: { de: "Kalorienbedarfskalkulator", en: "Calorie Needs Calculator" },
    app_subtitle: {
      de: "Berechne deinen täglichen Kalorien- und Proteinbedarf — alles läuft lokal in deinem Browser, nichts wird übertragen.",
      en: "Calculate your daily calorie and protein needs — everything runs locally in your browser, nothing is transmitted.",
    },
    lang_switch_aria: { de: "Sprache", en: "Language" },

    // ---- Tabs ---------------------------------------------------------------
    tab_rechner: { de: "Rechner", en: "Calculator" },
    tab_methodik: { de: "Methodik & Quellen", en: "Methodology & Sources" },
    tab_ueber: { de: "Über", en: "About" },
    tab_tipps: { de: "Tipps", en: "Tips" },

    // ---- Rechner: Basisangaben ------------------------------------------
    heading_basisangaben: { de: "Basisangaben", en: "Basic information" },
    feld_geschlecht_label: { de: "Geschlecht", en: "Sex" },
    geschlecht_maennlich: { de: "Männlich", en: "Male" },
    geschlecht_weiblich: { de: "Weiblich", en: "Female" },
    feld_alter_label: { de: "Alter (Jahre)", en: "Age (years)" },
    feld_groesse_label: { de: "Größe (cm)", en: "Height (cm)" },
    feld_gewicht_label: { de: "Gewicht (kg)", en: "Weight (kg)" },
    feld_aktivitaet_label: {
      de: "Aktivitätslevel (Alltag inkl. gewohntem Training)",
      en: "Activity level (daily life incl. usual training)",
    },
    aktivitaet_opt_sitzend: {
      de: "Sitzend (kaum Bewegung, kein regelmäßiger Sport)",
      en: "Sedentary (little movement, no regular exercise)",
    },
    aktivitaet_opt_leicht: {
      de: "Leicht aktiv (Alltag + ca. 1–3× Sport/Woche)",
      en: "Lightly active (daily life + approx. 1–3× exercise/week)",
    },
    aktivitaet_opt_maessig: {
      de: "Mäßig aktiv (Alltag + ca. 3–5× Sport/Woche)",
      en: "Moderately active (daily life + approx. 3–5× exercise/week)",
    },
    aktivitaet_opt_sehr: {
      de: "Sehr aktiv (Alltag + ca. 6–7× Sport/Woche)",
      en: "Very active (daily life + approx. 6–7× exercise/week)",
    },
    aktivitaet_opt_extrem: {
      de: "Extrem aktiv (körperlich fordernde Arbeit + intensiver Sport)",
      en: "Extremely active (physically demanding job + intense exercise)",
    },
    feld_aktivitaet_hint: {
      de: `Ganzheitliche Einschätzung nach dem <abbr title="Physical Activity Level">PAL</abbr>-Konzept: ein Vielfaches deines Grundumsatzes, das
        deinen gesamten Tagesdurchschnitt beschreibt — Alltag <strong>und</strong> dein gewohntes Trainingspensum zusammen. Wenn du unten bei
        „Sport/Training" eine genaue MET-Berechnung angibst, ersetzt diese die Trainings-Schätzung hier (siehe dort).`,
      en: `Holistic estimate based on the <abbr title="Physical Activity Level">PAL</abbr> concept: a multiple of your resting energy
        expenditure describing your entire daily average — daily life <strong>and</strong> your usual training load together. If you enter a
        precise MET calculation below under "Exercise/Training", it replaces the training estimate here (see below).`,
    },
    feld_ziel_label: { de: "Ziel", en: "Goal" },
    ziel_opt_lose: { de: "Gewicht verlieren", en: "Lose weight" },
    ziel_opt_maintain: { de: "Gewicht halten", en: "Maintain weight" },
    ziel_opt_gain: { de: "Gewicht zunehmen", en: "Gain weight" },

    // ---- Erweiterte Angaben -------------------------------------------------
    erweiterte_summary: {
      de: "Erweiterte Angaben — nur ausfüllen, falls bekannt",
      en: "Advanced details — fill in only if known",
    },
    ffm_legend: { de: "Fettfreie Masse (FFM)", en: "Fat-free mass (FFM)" },
    ffm_hint: {
      de: "Falls bekannt, ermöglicht das eine präzisere Formel (Cunningham 1991 / Katch-McArdle).",
      en: "If known, this enables a more precise formula (Cunningham 1991 / Katch-McArdle).",
    },
    ffm_opt_keine: { de: "Keine Angabe", en: "Not specified" },
    ffm_opt_direkt: { de: "FFM direkt bekannt (z. B. DXA/BIA/ADP)", en: "FFM directly known (e.g. DXA/BIA/ADP)" },
    ffm_opt_kfa: { de: "Körperfettanteil bekannt", en: "Body fat percentage known" },
    ffm_direkt_label: { de: "Fettfreie Masse (kg)", en: "Fat-free mass (kg)" },
    ffm_kfa_label: { de: "Körperfettanteil (%)", en: "Body fat percentage (%)" },
    ffm_sportler_label: {
      de: "Freizeitsportler:in (regelmäßiges Training)",
      en: "Recreational athlete (regular training)",
    },

    sport_legend: { de: "Sport / Training", en: "Exercise / Training" },
    sport_hint: {
      de: `Die Aktivitätslevel-Auswahl oben ist eine grobe, ganzheitliche Schätzung inkl. Training. Falls du deine
        Trainingsdaten genau kennst, kannst du sie stattdessen hier präzise angeben — das <strong>ersetzt</strong> die
        Trainings-Schätzung oben (kein zusätzlicher Aufschlag, sonst Doppelzählung).`,
      en: `The activity level selection above is a rough, holistic estimate including training. If you know your
        training data precisely, you can enter it here instead — this <strong>replaces</strong> the training estimate
        above (no additional add-on, to avoid double-counting).`,
    },
    sport_opt_keine: {
      de: "Keine genaueren Angaben (Schätzung oben verwenden)",
      en: "No more precise data (use estimate above)",
    },
    sport_opt_met: { de: "Genaue MET-Berechnung", en: "Precise MET calculation" },
    met_hint: {
      de: `<abbr title="Metabolic Equivalent of Task">MET</abbr>: Vielfaches des Grundumsatzes während einer Aktivität. Werte
        aus dem <em>Compendium of Physical Activities</em> (Standardreferenz der Sportwissenschaft, Details im Tab
        „Methodik &amp; Quellen"). Wähle je Aktivität einen Eintrag und die Stunden pro Woche — bei mehreren
        Sportarten erscheint automatisch eine neue Zeile.`,
      en: `<abbr title="Metabolic Equivalent of Task">MET</abbr>: multiple of resting energy expenditure during an activity. Values
        from the <em>Compendium of Physical Activities</em> (standard reference in exercise science, details in the
        "Methodology &amp; Sources" tab). Choose an entry per activity and the hours per week — a new row appears
        automatically for multiple activities.`,
    },
    hinweis_met_override: {
      de: `Bei genauer MET-Berechnung wird oben automatisch „Sitzend" als Alltags-Basis angenommen (Aktivitätslevel-Feld ist deaktiviert) — dein Training wird hier separat und präziser dazugerechnet.`,
      en: `With precise MET calculation, "Sedentary" is automatically assumed above as the daily-life baseline (the activity level field is disabled) — your training is added here separately and more precisely.`,
    },

    met_option_placeholder: { de: "– Aktivität wählen –", en: "– Choose an activity –" },
    met_option_sonstige: { de: "Sonstige (MET manuell)", en: "Other (manual MET)" },
    met_placeholder_manuell: { de: "MET-Wert", en: "MET value" },
    met_placeholder_stunden: { de: "Std/Woche", en: "hrs/week" },
    met_aria_entfernen: { de: "Zeile entfernen", en: "Remove row" },
    met_aria_aktivitaet: { de: "Aktivität", en: "Activity" },
    met_aria_manuell: { de: "MET-Wert manuell", en: "Manual MET value" },
    met_aria_stunden: { de: "Stunden pro Woche", en: "Hours per week" },
    met_sonstige_aktivitaet_label: { de: "Sonstige Aktivität", en: "Other activity" },

    weitere_legend: { de: "Weitere Faktoren", en: "Additional factors" },
    schwangerschaft_label: { de: "Schwangerschaft / Stillzeit", en: "Pregnancy / Breastfeeding" },
    schwangerschaft_opt_keine: { de: "Keine Angabe", en: "Not specified" },
    schwangerschaft_opt_schwanger: { de: "Schwangerschaft", en: "Pregnancy" },
    schwangerschaft_opt_stillzeit: { de: "Stillzeit", en: "Breastfeeding" },
    diaet_label: {
      de: "Seit längerem in Diät / Kalorienrestriktion",
      en: "In a diet / calorie restriction for a while",
    },
    diaet_hint: {
      de: "Senkt den Grundumsatz um ca. 5–10 % (adaptive Thermogenese).",
      en: "Reduces resting energy expenditure by approx. 5–10% (adaptive thermogenesis).",
    },
    schilddruese_label: {
      de: "Ärztlich diagnostizierte Schilddrüsen-Erkrankung",
      en: "Medically diagnosed thyroid condition",
    },
    schilddruese_prozent_label: {
      de: "Abweichung vom Grundumsatz laut Diagnose (%)",
      en: "Deviation from resting energy expenditure per diagnosis (%)",
    },
    schilddruese_disclaimer: {
      de: "Bitte nur nach ärztlicher Angabe ausfüllen — ersetzt keine ärztliche oder ernährungstherapeutische Beratung.",
      en: "Please fill in only based on medical guidance — this does not replace medical or dietetic advice.",
    },
    betablocker_label: { de: "Einnahme von Beta-Blockern", en: "Taking beta blockers" },
    fieber_label: { de: "Aktuell Fieber", en: "Currently have a fever" },
    fieber_temp_label: { de: "Körpertemperatur (°C)", en: "Body temperature (°C)" },

    speichern_label: { de: "Eingaben auf diesem Gerät speichern", en: "Save inputs on this device" },
    speichern_hint: {
      de: `Speichert deine Eingaben (nicht das Ergebnis) über <code>localStorage</code> direkt in diesem Browser auf diesem
        Gerät — kein Cache, keine automatische Löschung durch den Browser. Die Daten bleiben, bis du „Daten löschen"
        klickst oder die Website-Daten manuell in den Browser-Einstellungen leerst. Es wird nichts an einen Server übertragen.`,
      en: `Saves your inputs (not the result) via <code>localStorage</code> directly in this browser on this device —
        no cache, no automatic deletion by the browser. The data stays until you click "Delete data" or manually
        clear the site data in your browser settings. Nothing is transmitted to a server.`,
    },
    speichern_loeschen_btn: { de: "Gespeicherte Daten löschen", en: "Delete saved data" },
    submit_btn: { de: "Berechnen", en: "Calculate" },

    // ---- Ergebnis -----------------------------------------------------------
    result_ree_label: { de: "Grundumsatz (REE)", en: "Resting energy expenditure (REE)" },
    result_tee_label: { de: "Gesamtumsatz (TEE)", en: "Total energy expenditure (TEE)" },
    result_zusatz_heading: { de: "Zusätzliche Referenzwerte", en: "Additional reference values" },
    result_fettabbau_label: { de: "Kalorienbedarf für Fettabbau", en: "Calorie target for fat loss" },
    result_fettabbau_hinweis: {
      de: "Auf den Grundumsatz gedeckelt (Sicherheitsgrenze) — ein rechnerisch niedrigeres Defizit wäre hier nicht sinnvoll.",
      en: "Capped at resting energy expenditure (safety limit) — a mathematically lower deficit would not be advisable here.",
    },
    result_protein_erhalt_label: { de: "Proteinbedarf für Muskelerhalt", en: "Protein needs for muscle maintenance" },
    result_protein_aufbau_label: { de: "Proteinbedarf für Muskelaufbau", en: "Protein needs for muscle building" },
    hint_sporttage: {
      de: `<strong>Sporttage:</strong> Die errechneten Kalorienziele basieren auf deinem angegebenen Aktivitätslevel bzw. deinen angegebenen durchschnittlichen Sportaktivitäten pro Woche — in Wochen mit zusätzlichen oder härteren Sporteinheiten (insb. Cardio/HIIT) solltest du zusätzliche Kalorien einplanen, damit du nicht zu tief in ein Kaloriendefizit rutschst.`,
      en: `<strong>Training days:</strong> The calculated calorie targets are based on your stated activity level or your stated average weekly exercise — in weeks with extra or harder training sessions (especially cardio/HIIT), you should plan for extra calories so you don't slip too deep into a calorie deficit.`,
    },
    hint_recomposition: {
      de: `<strong>Body Recomposition:</strong> Um gleichzeitig Körperfett abzubauen und Muskeln aufzubauen, ist neben ausreichend Protein insbesondere Krafttraining notwendig. Eine mittelfristige Steigerung der Muskelmasse erhöht zudem den Grundumsatz — die Kalkulation sollte daher regelmäßig aktualisiert werden.`,
      en: `<strong>Body recomposition:</strong> To lose body fat and build muscle at the same time, strength training is essential in addition to sufficient protein. A medium-term increase in muscle mass also raises resting energy expenditure — so the calculation should be updated regularly.`,
    },
    result_details_summary: {
      de: "Details zur Berechnung (Bandbreite, Formel, Modifikatoren)",
      en: "Calculation details (range, formula, modifiers)",
    },
    print_btn: { de: "Ergebnis als PDF speichern", en: "Save result as PDF" },
    print_dateiname_praefix: { de: "Kalorienbedarfsrechner", en: "CalorieNeedsCalculator" },

    // ---- Druckseite "Eingegebene Werte" (nur PDF-Export, siehe ui.js) --------
    druck_eingaben_heading: { de: "Eingegebene Werte", en: "Values Entered" },
    druck_ja: { de: "Ja", en: "Yes" },
    druck_ffm_direkt_label: { de: "Fettfreie Masse (direkt gemessen)", en: "Fat-free mass (measured directly)" },
    druck_ffm_kfa_label: { de: "Fettfreie Masse (aus Körperfettanteil)", en: "Fat-free mass (from body fat %)" },
    druck_sport_zeile: { de: "{{stunden}} h/Woche, {{met}} MET", en: "{{stunden}} h/week, {{met}} MET" },

    disclaimer: {
      de: `Diese Berechnung liefert eine grobe Orientierung basierend auf anthropometrischen Schätzformeln (Standardschätzfehler ±10 % / ±200 kcal).
        Sie ersetzt keine individuelle ärztliche oder ernährungstherapeutische Beratung — insbesondere bei medizinischen Angaben (Medikation, Schilddrüse, Schwangerschaft).`,
      en: `This calculation provides a rough estimate based on anthropometric prediction formulas (standard error of estimate ±10% / ±200 kcal).
        It does not replace individual medical or dietetic advice — especially for medical factors (medication, thyroid, pregnancy).`,
    },

    // ---- Ziel-Labels (dynamisch, GOAL_ADJUSTMENT) ---------------------------
    goal_label_lose: { de: "Kalorienziel zum Abnehmen", en: "Calorie target for weight loss" },
    goal_label_maintain: { de: "Kalorienziel zum Halten", en: "Calorie target for maintenance" },
    goal_label_gain: { de: "Kalorienziel zum Zunehmen", en: "Calorie target for weight gain" },

    // ---- Ziel-Warnungen (dynamisch) -----------------------------------------
    ziel_warnung_defizit: {
      de: "Das gewünschte Kaloriendefizit ({{betrag}}) würde den Grundumsatz unterschreiten — aus Sicherheitsgründen wurde das Ziel auf den Grundumsatz angehoben. Ein größeres Defizit wird nicht empfohlen.",
      en: "The desired calorie deficit ({{betrag}}) would fall below your resting energy expenditure — for safety, the target has been raised to your resting energy expenditure. A larger deficit is not recommended.",
    },
    ziel_warnung_bmi: {
      de: "Dein BMI liegt im Untergewichtsbereich — eine weitere Gewichtsreduktion wird hier nicht empfohlen. Bitte sprich vorher mit einer Ärztin/einem Arzt oder einer Ernährungsfachkraft.",
      en: "Your BMI is in the underweight range — further weight loss is not recommended here. Please speak with a doctor or a nutrition professional first.",
    },

    // ---- Detail-Block (dynamisch) --------------------------------------------
    detail_formel: {
      de: "<strong>Verwendete Formel:</strong> {{name}} (BMI {{bmi}})<br>{{begruendung}}",
      en: "<strong>Formula used:</strong> {{name}} (BMI {{bmi}})<br>{{begruendung}}",
    },
    detail_bandbreite: {
      de: "<strong>Bandbreite:</strong> REE ±{{ree}} kcal, TEE ±{{tee}} kcal — dominiert von der Formelunsicherheit selbst (Mifflin-artige Schätzformeln: ±10 % / ±200 kcal), bevor überhaupt ein Modifikator greift.",
      en: "<strong>Range:</strong> REE ±{{ree}} kcal, TEE ±{{tee}} kcal — dominated by the formula's own uncertainty (Mifflin-type prediction formulas: ±10% / ±200 kcal), even before any modifier applies.",
    },
    detail_protein_ffm: {
      de: "Proteinbedarf wurde auf Basis der fettfreien Masse berechnet (nicht des Gesamtgewichts) — bei BMI ≥30 vermeidet das eine Überschätzung.",
      en: "Protein needs were calculated based on fat-free mass (not total body weight) — at BMI ≥30 this avoids overestimation.",
    },
    detail_modifikatoren_heading: { de: "Aktive Modifikatoren:", en: "Active modifiers:" },

    // ---- Modifikator-Texte (dynamisch) ---------------------------------------
    mod_adaptive_thermogenese: {
      de: "Adaptive Thermogenese (Diät-Historie): REE ×0,90–0,95",
      en: "Adaptive thermogenesis (diet history): REE ×0.90–0.95",
    },
    mod_schilddruese: {
      de: "Schilddrüsen-Diagnose: REE {{vorzeichen}}{{prozent}} %",
      en: "Thyroid diagnosis: REE {{vorzeichen}}{{prozent}}%",
    },
    mod_fieber: {
      de: "Fieber ({{temp}} °C, Δ{{delta}} °C über 37 °C): REE +10–13 % pro °C",
      en: "Fever ({{temp}} °C, Δ{{delta}} °C above 37 °C): REE +10–13% per °C",
    },
    mod_sport_met: {
      de: "Sport (MET-Berechnung, ersetzt Aktivitätslevel-Schätzung): {{details}} — PAL-Äquivalent +{{zuschlag}}",
      en: "Exercise (MET calculation, replaces activity-level estimate): {{details}} — PAL equivalent +{{zuschlag}}",
    },
    mod_sport_aktivitaet_eintrag: {
      de: "{{label}} ({{stunden}} h/Woche, {{met}} MET)",
      en: "{{label}} ({{stunden}} h/week, {{met}} MET)",
    },
    mod_schwangerschaft: { de: "Schwangerschaft: TEE +250 kcal", en: "Pregnancy: TEE +250 kcal" },
    mod_stillzeit: { de: "Stillzeit: TEE +500 kcal", en: "Breastfeeding: TEE +500 kcal" },
    mod_beta_blocker: {
      de: "Beta-Blocker: TEE −50…−100 kcal (chronisch, daher trotz kleiner Größenordnung eingerechnet)",
      en: "Beta blockers: TEE −50…−100 kcal (chronic effect, included despite its small magnitude)",
    },

    // ---- Formelauswahl-Begründungen (dynamisch, auswahl.js) ------------------
    begruendung_ffm_athlete: {
      de: "FFM gemessen, Freizeitsportler 18–35 Jahre — Ten-Haaf-Gleichung deckt genau diese Validierungspopulation ab.",
      en: "FFM measured, recreational athlete aged 18–35 — the Ten-Haaf equation covers exactly this validation population.",
    },
    begruendung_ffm_measured: {
      de: "FFM gemessen; Cunningham bildet Alters- und Adipositaseffekte direkt über die fettfreie Masse ab — Proxy-Korrekturen anderer Formeln sind damit überflüssig.",
      en: "FFM measured; Cunningham captures age and obesity effects directly via fat-free mass — proxy corrections used by other formulas become unnecessary.",
    },
    begruendung_pregnancy: {
      de: "Schwangerschaft/Stillzeit — Mifflin-St-Jeor als Standard verwendet.",
      en: "Pregnancy/breastfeeding — Mifflin-St-Jeor used as the default.",
    },
    begruendung_bmi_extreme: {
      de: "Extremgewicht (BMI {{bmi}}) dominiert den Ruheumsatz; Müller enthält Alter bereits als Term und ist nach BMI gestuft.",
      en: "Extreme body weight (BMI {{bmi}}) dominates resting energy expenditure; Müller already includes age as a term and is graduated by BMI.",
    },
    begruendung_age_senior: {
      de: "Alter ≥65 Jahre — Lührmann ist an einer deutschen Seniorenpopulation validiert.",
      en: "Age ≥65 — Lührmann is validated on a German senior population.",
    },
    begruendung_default: {
      de: "Standardfall ohne gemessene FFM, Schwangerschaft, Extremgewicht oder Senioren-Alter.",
      en: "Standard case without measured FFM, pregnancy, extreme body weight, or senior age.",
    },
    hinweis_auswahl_outside_validation: {
      de: "Außerhalb der Validierungspopulation der gewählten Formel (Alter >65 oder BMI ≥35) — Ergebnis mit größerer Unsicherheit behaftet.",
      en: "Outside the validation population of the selected formula (age >65 or BMI ≥35) — result carries greater uncertainty.",
    },
    hinweis_auswahl_pregnancy_not_validated: {
      de: "Nicht an Schwangeren/Stillenden validiert — Ergebnis mit zusätzlicher Unsicherheit.",
      en: "Not validated in pregnant/breastfeeding individuals — result carries additional uncertainty.",
    },

    // ---- Nicht eingerechnete Faktoren (modifikatoren.js HINWEISE) ------------
    hinweis_tef_label: { de: "Verdauung von Nahrung (TEF)", en: "Thermic effect of food (TEF)" },
    hinweis_tef_grund: {
      de: "Auch die Verdauung selbst verbraucht Energie. Dieser Anteil steckt aber schon in den Aktivitätsfaktoren.",
      en: "Digestion itself also consumes energy. This portion is already included in the activity factors.",
    },
    hinweis_schlafdauer_label: { de: "Schlafdauer", en: "Sleep duration" },
    hinweis_schlafdauer_grund: {
      de: "Der Grundumsatz gilt für einen vollen Tag inklusive Schlaf — ein pauschaler Abzug für die Schlafzeit wäre also doppelt gezählt. Chronischer Schlafmangel (z. B. dauerhaft 5 statt 7–8 Stunden) verändert den Energieumsatz selbst kaum messbar, beeinflusst aber über Hunger- und Sättigungshormone (mehr Ghrelin, weniger Leptin) den Appetit — das führt in der Praxis eher zu höherer Kalorienaufnahme als zu einem anderen Bedarf. Dafür lässt sich kein verlässlicher fester Faktor angeben.",
      en: "Resting energy expenditure already covers a full day including sleep — a flat deduction for sleep time would be double-counted. Chronic sleep deprivation (e.g. consistently 5 instead of 7–8 hours) barely changes energy expenditure itself in a measurable way, but affects appetite via hunger and satiety hormones (more ghrelin, less leptin) — in practice this tends to lead to higher calorie intake rather than a different energy requirement. No reliable fixed factor can be given for this.",
    },
    hinweis_stress_label: { de: "Subjektives Stresslevel", en: "Subjective stress level" },
    hinweis_stress_grund: {
      de: "Chronischer Stress erhöht den Cortisolspiegel, was Appetit, Wassereinlagerung und Fettverteilung beeinflussen kann. Die Studienlage liefert aber keinen verlässlichen, quantifizierbaren Faktor für den Kalorienbedarf — der Effekt läuft eher über Verhalten (Essverhalten, Schlaf, Bewegung) als über einen direkt messbaren Mehrverbrauch.",
      en: "Chronic stress raises cortisol levels, which can affect appetite, water retention, and fat distribution. However, the evidence does not provide a reliable, quantifiable factor for calorie needs — the effect tends to operate via behavior (eating habits, sleep, movement) rather than a directly measurable increase in expenditure.",
    },
    hinweis_koffein_label: { de: "Koffein", en: "Caffeine" },
    hinweis_koffein_grund: {
      de: "Koffein regt den Stoffwechsel für ein paar Stunden leicht an. Dieser kurze Effekt lässt sich nicht sinnvoll auf den gesamten Tag hochrechnen.",
      en: "Caffeine slightly stimulates metabolism for a few hours. This brief effect cannot be meaningfully extrapolated to the whole day.",
    },
    hinweis_lutealphase_label: { de: "Zyklusphase (2. Zyklushälfte)", en: "Cycle phase (luteal phase)" },
    hinweis_lutealphase_grund: {
      de: "In der zweiten Zyklushälfte steigt der Energiebedarf für ca. zwei Wochen leicht an (ca. 40–70 kcal/Tag). Das liegt innerhalb der ohnehin vorhandenen Schwankungsbreite der Berechnung und gleicht sich über den Monat wieder aus.",
      en: "During the second half of the cycle, energy needs rise slightly for about two weeks (roughly 40–70 kcal/day). This falls within the calculation's existing margin of variation and evens out again over the month.",
    },

    // ---- Methodik-Tab ---------------------------------------------------------
    methodik_formeln_heading: { de: "Verwendete Formeln", en: "Formulas used" },
    methodik_pal_heading: { de: "Das PAL-Konzept", en: "The PAL concept" },
    methodik_pal_text: {
      de: `<abbr title="Physical Activity Level">PAL</abbr> steht für „Physical Activity Level" und beschreibt, wievielmal höher
        dein tatsächlicher Tagesverbrauch im Vergleich zum Grundumsatz liegt — als ein einziger Durchschnittswert über
        den ganzen Tag, Alltag und Training zusammen. Ein PAL von 1,2 bedeutet z. B. kaum Bewegung, ein PAL von 1,9 sehr
        viel körperliche Aktivität. Die Werte in der Aktivitätslevel-Auswahl (1,2 bis 1,9) stammen aus der etablierten
        FAO/WHO/UNU-Klassifikation und sind bewusst ganzheitlich gedacht — sie schließen ein durchschnittliches
        Trainingspensum bereits mit ein, statt Alltag und Sport getrennt zu addieren. Wer seine Trainingsdaten genau
        kennt, kann stattdessen die MET-Berechnung nutzen (siehe unten).`,
      en: `<abbr title="Physical Activity Level">PAL</abbr> stands for "Physical Activity Level" and describes how many
        times higher your actual daily energy expenditure is compared to your resting energy expenditure — as a
        single daily average covering both everyday life and training together. A PAL of 1.2 means, for example,
        very little movement, while a PAL of 1.9 means a very high level of physical activity. The values in the
        activity level selection (1.2 to 1.9) come from the established FAO/WHO/UNU classification and are
        deliberately holistic — they already include an average training load instead of adding daily life and
        exercise separately. If you know your training data precisely, you can use the MET calculation instead (see below).`,
    },
    methodik_met_heading: { de: "MET-Werte (Trainingsintensität)", en: "MET values (training intensity)" },
    methodik_nicht_heading: { de: "Nicht eingerechnete Faktoren", en: "Factors not included" },
    methodik_nicht_intro: {
      de: "Diese Faktoren beeinflussen den Energiebedarf zwar grundsätzlich, fließen hier aber bewusst nicht in die Berechnung ein:",
      en: "These factors do influence energy needs in principle, but are deliberately not included in this calculation:",
    },
    methodik_grenzen_heading: { de: "Wann dieser Rechner nicht ausreicht", en: "When this calculator is not sufficient" },
    methodik_grenzen_li1: {
      de: "Organgewichte/MRT-Volumetrie oder indirekte Kalorimetrie als Goldstandard sind hier nicht abbildbar.",
      en: "Organ weights/MRI volumetry or indirect calorimetry as the gold standard cannot be represented here.",
    },
    methodik_grenzen_li2: {
      de: "Tumorkachexie und ähnliche klinische Sonderfälle werden von keiner der Formeln erfasst.",
      en: "Cancer cachexia and similar clinical special cases are not captured by any of the formulas.",
    },
    methodik_grenzen_li3: {
      de: "Bei BMI &lt;16 oder &gt;40, schweren Traumata oder Verbrennungen: bitte klinische Abklärung statt Selbstberechnung.",
      en: "For a BMI &lt;16 or &gt;40, severe trauma, or burns: please seek clinical evaluation instead of self-calculation.",
    },
    met_quelle: {
      de: "Compendium of Physical Activities (Ainsworth et al., 2024 Adult Compendium, pacompendium.com) — Standardreferenz für MET-Werte in der Sportwissenschaft.",
      en: "Compendium of Physical Activities (Ainsworth et al., 2024 Adult Compendium, pacompendium.com) — the standard reference for MET values in exercise science.",
    },

    // ---- MET-Aktivitäten & Kategorien -----------------------------------------
    met_kategorie_gehen_wandern: { de: "Gehen & Wandern", en: "Walking & Hiking" },
    met_kategorie_laufen: { de: "Laufen", en: "Running" },
    met_kategorie_radfahren: { de: "Radfahren", en: "Cycling" },
    met_kategorie_schwimmen: { de: "Schwimmen", en: "Swimming" },
    met_kategorie_kraft: { de: "Kraft & Konditionstraining", en: "Strength & Conditioning" },
    met_kategorie_yoga: { de: "Yoga", en: "Yoga" },
    met_kategorie_ballsport: { de: "Ballsport", en: "Ball Sports" },

    met_aktivitaet_spazieren: { de: "Spazieren (gemütlich)", en: "Walking (leisurely)" },
    met_aktivitaet_gehen_zuegig: { de: "Gehen, zügig", en: "Walking, brisk" },
    met_aktivitaet_nordic_walking: { de: "Nordic Walking", en: "Nordic walking" },
    met_aktivitaet_wandern: { de: "Wandern", en: "Hiking" },
    met_aktivitaet_joggen_locker: { de: "Joggen, locker", en: "Jogging, easy" },
    met_aktivitaet_laufen_moderat: { de: "Laufen, moderat (~10 km/h)", en: "Running, moderate (~10 km/h)" },
    met_aktivitaet_laufen_schnell: { de: "Laufen, schnell (~12 km/h)", en: "Running, fast (~12 km/h)" },
    met_aktivitaet_rad_locker: { de: "Radfahren, locker", en: "Cycling, easy" },
    met_aktivitaet_rad_moderat: { de: "Radfahren, moderat", en: "Cycling, moderate" },
    met_aktivitaet_rad_zuegig: { de: "Radfahren, zügig/Rennrad", en: "Cycling, brisk/road bike" },
    met_aktivitaet_schwimmen_locker: { de: "Schwimmen, locker", en: "Swimming, easy" },
    met_aktivitaet_schwimmen_sportlich: { de: "Schwimmen, sportlich (Bahnen)", en: "Swimming, vigorous (laps)" },
    met_aktivitaet_kraft_moderat: { de: "Krafttraining, moderat", en: "Strength training, moderate" },
    met_aktivitaet_kraft_intensiv: { de: "Krafttraining, intensiv (Grundübungen)", en: "Strength training, intense (compound lifts)" },
    met_aktivitaet_kraft_sehr_intensiv: { de: "Krafttraining, sehr intensiv", en: "Strength training, very intense" },
    met_aktivitaet_calisthenics_leicht: { de: "Calisthenics, leicht", en: "Calisthenics, light" },
    met_aktivitaet_calisthenics_moderat: { de: "Calisthenics, moderat", en: "Calisthenics, moderate" },
    met_aktivitaet_calisthenics_intensiv: { de: "Calisthenics, intensiv", en: "Calisthenics, intense" },
    met_aktivitaet_zirkel_leicht: { de: "Zirkeltraining, leicht", en: "Circuit training, light" },
    met_aktivitaet_zirkel_moderat: { de: "Zirkeltraining, moderat", en: "Circuit training, moderate" },
    met_aktivitaet_bootcamp: { de: "Bootcamp / Zirkeltraining, intensiv (inkl. Kettlebell)", en: "Bootcamp / circuit training, intense (incl. kettlebell)" },
    met_aktivitaet_hiit: { de: "HIIT (Tabata, Burpees u. Ä.)", en: "HIIT (Tabata, burpees, etc.)" },
    met_aktivitaet_yoga_hatha: { de: "Yoga, Hatha (ruhig)", en: "Yoga, Hatha (gentle)" },
    met_aktivitaet_yoga_power: { de: "Yoga, Power/Vinyasa", en: "Yoga, Power/Vinyasa" },
    met_aktivitaet_fussball_locker: { de: "Fußball, locker", en: "Soccer, casual" },
    met_aktivitaet_fussball_wettkampf: { de: "Fußball, Wettkampf", en: "Soccer, competitive" },
    met_aktivitaet_tischtennis: { de: "Tischtennis", en: "Table tennis" },
    met_aktivitaet_tennis_doppel: { de: "Tennis, Doppel", en: "Tennis, doubles" },
    met_aktivitaet_tennis_einzel: { de: "Tennis, Einzel", en: "Tennis, singles" },
    met_aktivitaet_basketball_locker: { de: "Basketball, locker", en: "Basketball, casual" },
    met_aktivitaet_basketball_wettkampf: { de: "Basketball, Wettkampf", en: "Basketball, competitive" },
    met_aktivitaet_volleyball: { de: "Volleyball", en: "Volleyball" },
    met_aktivitaet_badminton_locker: { de: "Badminton, locker", en: "Badminton, casual" },
    met_aktivitaet_badminton_wettkampf: { de: "Badminton, Wettkampf", en: "Badminton, competitive" },

    // ---- Über-Tab ---------------------------------------------------------------
    ueber_heading: { de: "Über dieses Projekt", en: "About this project" },
    ueber_intro: {
      de: `Der Kalorienbedarfsrechner ist ein quelloffenes Projekt — der vollständige Quellcode ist frei einsehbar auf
        <a href="https://github.com/bartlog/kalorienbedarfskalkulator" target="_blank" rel="noopener">GitHub</a>.
        Alle verwendeten Formeln und Modifikatoren beruhen auf wissenschaftlichen Studien (siehe Reiter „Methodik &amp;
        Quellen") und wurden anhand mehrerer Testfälle überprüft. Trotzdem übernimmt dieses Tool keine Gewähr für
        Richtigkeit oder Vollständigkeit und ersetzt keine medizinische oder ernährungswissenschaftliche Beratung.`,
      en: `The calorie needs calculator is an open-source project — the full source code is freely available on
        <a href="https://github.com/bartlog/kalorienbedarfskalkulator" target="_blank" rel="noopener">GitHub</a>.
        All formulas and modifiers used are based on scientific studies (see the "Methodology &amp; Sources" tab)
        and have been checked against several test cases. Nevertheless, this tool makes no guarantee of accuracy or
        completeness and does not replace medical or nutritional advice.`,
    },
    ueber_autor: {
      de: `<strong>Autor:</strong> Heiko Bartlog —
        <a href="https://bartlog.de" target="_blank" rel="noopener">bartlog.de</a><br>
        Entstanden mithilfe von Gemini (Deep Research, Grobkonzeption, Testfälle) und Claude Code.`,
      en: `<strong>Author:</strong> Heiko Bartlog —
        <a href="https://bartlog.de" target="_blank" rel="noopener">bartlog.de</a><br>
        Built with the help of Gemini (deep research, initial concept, test cases) and Claude Code.`,
    },

    // ---- Tipps-Tab ---------------------------------------------------------------
    tipps_heading: { de: "Praxis-Tipps für Fettabbau & Recomposition", en: "Practical tips for fat loss & recomposition" },
    tipps_intro: {
      de: `Eine kuratierte Sammlung praktischer Hebel — von Ernährung über Training bis Restaurantbesuche. Diese
        Empfehlungen ergänzen die Kalorien- und Proteinwerte oben, ersetzen aber keine individuelle medizinische
        oder ernährungswissenschaftliche Beratung. Jeder Abschnitt lässt sich über die Auswahl unterhalb des Titels
        nach Einstufung filtern.`,
      en: `A curated collection of practical levers — from nutrition to training to eating out. These
        recommendations complement the calorie and protein values above but do not replace individual medical
        or nutritional advice. Each section can be filtered by rating using the dropdown below its title.`,
    },
    tipps_filtern_nach: { de: "Filtern nach {{spalte}}", en: "Filter by {{spalte}}" },
    tipps_alle: { de: "Alle", en: "All" },
  };

  function ermittleStartsprache() {
    try {
      const gespeichert = window.localStorage.getItem(SPEICHER_KEY);
      if (gespeichert && SPRACHEN.includes(gespeichert)) return gespeichert;
    } catch (e) {
      // localStorage evtl. nicht verfügbar (z. B. privater Modus) — Standard "de" verwenden
    }
    return "de";
  }

  function setSprache(sprache) {
    if (!SPRACHEN.includes(sprache)) return;
    aktuelleSprache = sprache;
    try {
      window.localStorage.setItem(SPEICHER_KEY, sprache);
    } catch (e) {
      // reines UX-Komfortfeature, kein harter Fehler nötig
    }
  }

  function getSprache() {
    return aktuelleSprache;
  }

  function t(key, params) {
    const eintrag = STRINGS[key];
    const vorlage = eintrag ? eintrag[aktuelleSprache] || eintrag.de : key;
    if (!params) return vorlage;
    return vorlage.replace(/\{\{(\w+)\}\}/g, (_, name) => (params[name] !== undefined ? params[name] : ""));
  }

  // Feste Nachkommastellen, lokalisiertes Trennzeichen (z. B. für BMI, Prozent).
  function zahl(value, decimals) {
    return value.toLocaleString(aktuelleSprache === "de" ? "de-DE" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // Natürliche Nachkommastellen (kein Auffüllen mit Nullen), nur Dezimaltrennzeichen lokalisiert.
  function zahlNatuerlich(value) {
    return aktuelleSprache === "de" ? value.toString().replace(".", ",") : value.toString();
  }

  aktuelleSprache = ermittleStartsprache();

  return { t, zahl, zahlNatuerlich, getSprache, setSprache, SPRACHEN };
})();
