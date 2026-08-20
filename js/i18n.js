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

    // ---- Info-Icon aria-labels (spezifisch statt generisch "Mehr Informationen") --
    info_aria_neat: { de: "Mehr Informationen zu Alltagsaktivität (NEAT)", en: "More information about daily activity (NEAT)" },
    info_aria_lauf: { de: "Mehr Informationen zu Lauf-Kilometern", en: "More information about running kilometers" },
    info_aria_sport_haeufigkeit: { de: "Mehr Informationen zu Sport-Häufigkeit", en: "More information about exercise frequency" },
    info_aria_sport_training: { de: "Mehr Informationen zur genauen MET-Berechnung", en: "More information about precise MET calculation" },
    info_aria_tracker: { de: "Mehr Informationen zum Schrittzähler-Hinweis", en: "More information about the step tracker note" },
    info_aria_lauf_met: { de: "Mehr Informationen zur Lauf-km/MET-Erkennung", en: "More information about running km/MET detection" },
    info_aria_met: { de: "Mehr Informationen zu MET-Aktivitäten", en: "More information about MET activities" },
    info_aria_fidgeting: { de: "Mehr Informationen zu Spontanbewegung", en: "More information about spontaneous movement" },
    info_aria_wochenmittel: { de: "Mehr Informationen zum Wochendurchschnitt", en: "More information about the weekly average" },
    info_aria_ffm: { de: "Mehr Informationen zur fettfreien Masse", en: "More information about fat-free mass" },
    info_aria_speichern: { de: "Mehr Informationen zum Speichern", en: "More information about saving" },
    info_aria_druck_footer: { de: "Mehr Informationen zur PDF-Fußzeile", en: "More information about the PDF footer" },
    info_aria_diaet: { de: "Mehr Informationen zu Diät / Kalorienrestriktion", en: "More information about diet / calorie restriction" },
    info_aria_betablocker: { de: "Mehr Informationen zu Beta-Blockern", en: "More information about beta blockers" },
    info_aria_fieber: { de: "Mehr Informationen zu Fieber", en: "More information about fever" },
    info_aria_schwangerschaft: { de: "Mehr Informationen zu Schwangerschaft/Stillzeit", en: "More information about pregnancy/breastfeeding" },
    info_aria_schilddruese: { de: "Mehr Informationen zu Schilddrüsen-Erkrankung", en: "More information about thyroid conditions" },
    // Warnhinweis-Icons (rot) bekommen ein eigenes aria-label-Muster statt
    // "Mehr Informationen zu..." -- macht die Kategorie (Warnung statt
    // Zusatzinfo) auch für Screenreader-Nutzer eindeutig, nicht nur über Farbe.
    info_aria_schilddruese_warnung: { de: "Warnhinweis zu Schilddrüse", en: "Warning: thyroid" },
    info_aria_fieber_warnung: { de: "Warnhinweis zu Fieber", en: "Warning: fever" },
    info_aria_schwangerschaft_warnung: { de: "Warnhinweis zu Schwangerschaft/Stillzeit", en: "Warning: pregnancy/breastfeeding" },

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
    feld_neat_label: {
      de: "Alltagsaktivität (NEAT) — durchschnittliche Schrittzahl/Tag",
      en: "Daily activity (NEAT) — average steps/day",
    },
    neat_opt_unter5000: {
      de: "Unter 5.000 Schritte/Tag (Sitzender Alltag, z. B. Bürojob/Homeoffice)",
      en: "Under 5,000 steps/day (sedentary daily life, e.g. office job/home office)",
    },
    neat_opt_5000bis10000: {
      de: "5.000–10.000 Schritte/Tag (Moderat aktiv, z. B. Verkäufer, viele Alltagswege)",
      en: "5,000–10,000 steps/day (moderately active, e.g. retail work, lots of daily errands)",
    },
    neat_opt_10000bis15000: {
      de: "10.000–15.000 Schritte/Tag (Sehr aktiv, z. B. Kellner, Pflegekraft)",
      en: "10,000–15,000 steps/day (very active, e.g. waiting staff, care worker)",
    },
    neat_opt_ab15000: {
      de: "Über 15.000 Schritte/Tag (Extrem aktiv, z. B. Handwerker, Bauarbeiter)",
      en: "Over 15,000 steps/day (extremely active, e.g. tradesperson, construction worker)",
    },
    feld_neat_hint: {
      de: "Zähl deine Gesamt-Schrittzahl an einem typischen Tag, so wie sie dein Tracker anzeigt — inklusive Spaziergänge und Laufrunden. Das deckt deine gesamte Alltagsbewegung ab, auch wenn ein Teil davon aus Sport stammt.",
      en: "Count your total steps on a typical day, as shown by your tracker — including walks and jogs. This covers your entire daily movement, even if part of it comes from exercise.",
    },
    lauf_label: { de: "Davon gelaufen / gejoggt", en: "Of which running / jogging" },
    lauf_km_label: { de: "Kilometer pro Woche", en: "Kilometers per week" },
    lauf_km_hint: {
      de: `Trage hier deine wöchentlichen Lauf-Kilometer ein. Trägst du denselben Lauf unten bei der genauen
        MET-Berechnung ein, <strong>erkennt der Rechner das automatisch und rechnet darüber statt mit der einfachen
        Kilometer-Faustregel</strong>.`,
      en: `Enter your weekly running kilometers here. If you also log the same run below under the precise MET
        calculation, <strong>the calculator detects this automatically and uses that instead of the simple
        kilometer rule of thumb</strong>.`,
    },
    feld_sport_haeufigkeit_label: {
      de: "Sport / Training (Häufigkeit pro Woche)",
      en: "Exercise / training (frequency per week)",
    },
    sport_haeufigkeit_opt_keinSport: { de: "Kein regelmäßiger Sport", en: "No regular exercise" },
    sport_haeufigkeit_opt_1bis3: { de: "1–3× pro Woche", en: "1–3× per week" },
    sport_haeufigkeit_opt_3bis5: { de: "3–5× pro Woche", en: "3–5× per week" },
    sport_haeufigkeit_opt_6bis7: { de: "6–7× pro Woche", en: "6–7× per week" },
    sport_haeufigkeit_opt_leistungssport: { de: "Leistungssport / sehr intensiv", en: "Competitive sport / very intense" },
    feld_sport_haeufigkeit_hint: {
      de: "Häufigkeit deines regelmäßigen Sports, zusätzlich zur Alltagsaktivität oben.",
      en: "Frequency of your regular exercise, in addition to the daily activity above.",
    },
    sport_haeufigkeit_doppelzaehlung_warnung: {
      de: `<strong>Gilt nur für Sport, der nicht wesentlich zu deiner Schrittzahl oben beiträgt (z. B. Radfahren,
        Schwimmen, Krafttraining, Yoga).</strong>`,
      en: `<strong>Only applies to exercise that doesn't meaningfully add to your step count above (e.g. cycling,
        swimming, strength training, yoga).</strong>`,
    },
    // Kompakte, immer sichtbare Kurzübersicht direkt vor dem NEAT-Feld (Beginn des
    // Aktivitäts-Blocks) — nennt die Doppelzählungs-Regel einmal, damit die
    // einzelnen Tooltips darunter nicht mehr jeweils das Gesamtbild wiederholen
    // müssen, sondern nur noch ihre eigene, feldspezifische Mechanik erklären.
    bewegung_kurzuebersicht: {
      de: `Schrittzahl, Lauf-km, Sport-Häufigkeit und MET-Tabelle ergänzen sich automatisch — der Rechner erkennt
        Überschneidungen selbst und rechnet sie heraus. Details dazu an den jeweiligen Info-Symbolen.`,
      en: `Step count, running km, exercise frequency, and the MET table complement each other automatically — the
        calculator detects overlaps itself and adjusts for them. Details via the respective info icons.`,
    },
    wochenmittel_teaser: {
      de: "Wie der Rechner mit deinem Wochendurchschnitt umgeht",
      en: "How the calculator handles your weekly average",
    },
    neat_sport_aequivalenz_text: {
      de: "Der Rechner ermittelt deinen durchschnittlichen Wochen-Tagesbedarf. 10.000 Schritte im Alltag verbrennen oft ähnlich viel Energie wie eine intensive Sporteinheit — solange dein Wochenmittel aus Bewegung und Sport konstant bleibt, passt die Berechnung.",
      en: "This calculator determines your average daily needs over the week. 10,000 daily steps often burn a similar amount of energy to an intense workout — as long as your weekly average of movement and exercise stays consistent, the calculation holds.",
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
    sport_hint_kurz: {
      de: "Genauere Eingabe statt Häufigkeits-Schätzung",
      en: "More precise entry instead of the frequency estimate",
    },
    sport_hint: {
      de: `Falls du deine Trainingsdaten genau kennst, kannst du sie hier präzise angeben — das
        <strong>ersetzt</strong> die Häufigkeits-Schätzung oben. Deine Alltagsaktivität (NEAT) bleibt davon
        unberührt.`,
      en: `If you know your training data precisely, you can enter it here instead — this <strong>replaces</strong>
        the frequency estimate above. Your daily activity (NEAT) is not affected by this.`,
    },
    sport_opt_keine: {
      de: "Schätzung oben verwenden",
      en: "Use estimate above",
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
    met_legend: { de: "MET-Aktivitäten", en: "MET activities" },
    traegt_tracker_label: {
      de: "Ich trage meinen Schrittzähler auch beim hier eingetragenen Sport",
      en: "I also wear my step tracker during the exercise entered here",
    },
    traegt_tracker_hint: {
      de: `Aktiv: Laufen, Gehen/Wandern und Ballsportarten unten werden anteilig von deiner Schrittzahl oben
        abgezogen (Krafttraining, Rad, Schwimmen, Yoga bleiben unberührt). Inaktiv: deine Schrittzahl oben gilt als
        reine Alltagsbewegung, dein Training unten zählt voll obendrauf.`,
      en: `On: running, walking/hiking, and ball sports below are proportionally deducted from your step count
        above (strength training, cycling, swimming, yoga are unaffected). Off: your step count above is treated as
        pure daily activity, your training below counts fully on top.`,
    },
    hinweis_lauf_met_kurz: {
      de: "Lauf-km oben werden berücksichtigt",
      en: "Running km above are taken into account",
    },
    hinweis_lauf_met: {
      de: `Wenn du hier kein Laufen einträgst, werden deine oben angegebenen Lauf-Kilometer berücksichtigt. Trägst
        du dein Lauftraining auch hier ein, berechnet der Rechner es exakt über MET — deine gelaufenen Schritte
        werden automatisch von deinen Alltagsschritten abgezogen. Du musst oben nichts ändern.`,
      en: `If you don't log running here, your running kilometers entered above are taken into account. If you
        also log your running here, the calculator uses your MET entry for the precise calculation — your running
        steps are automatically deducted from your daily steps. You don't need to change anything above.`,
    },
    hinweis_met_override: {
      de: `Bei genauer MET-Berechnung wird oben automatisch „Kein regelmäßiger Sport" als Sport-Häufigkeit angenommen (Feld ist deaktiviert) — dein Training wird hier separat und präziser dazugerechnet. Deine Alltagsaktivität (NEAT) bleibt davon unberührt.`,
      en: `With precise MET calculation, "No regular exercise" is automatically assumed above as the sport frequency (the field is disabled) — your training is added here separately and more precisely. Your daily activity (NEAT) is not affected by this.`,
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
    schwangerschaft_hint: {
      de: "Erhöht deinen täglichen Gesamtenergieverbrauch spürbar (Schwangerschaft ca. +250 kcal/Tag, Stillzeit ca. +500 kcal/Tag).",
      en: "Noticeably increases your total daily energy expenditure (pregnancy approx. +250 kcal/day, breastfeeding approx. +500 kcal/day).",
    },
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
    schilddruese_hint: {
      de: `Schilddrüsenerkrankungen (Über- oder Unterfunktion) können den Grundumsatz messbar verändern. Da die
        Abweichung individuell sehr unterschiedlich ausfällt, trägst du hier den Prozentwert aus deiner ärztlichen
        Diagnose direkt ein, statt dass er pauschal geschätzt wird.`,
      en: `Thyroid conditions (hyper- or hypothyroidism) can measurably change resting energy expenditure. Because
        the deviation varies a lot from person to person, you enter the percentage from your medical diagnosis
        directly here instead of it being estimated generically.`,
    },
    // Kurzmarkierung für Risikostellen (Schilddrüse, Schwangerschaft/Stillzeit,
    // Fieber) — kurze Variante des disclaimer-Kernsatzes oben, überall identisch
    // statt vier leicht unterschiedlicher Formulierungen. Bleibt bewusst
    // sichtbarer Text (kein Tooltip), da eine falsch verstandene Angabe an
    // diesen Stellen die Ergebniserwartung spürbar verfälschen kann.
    hinweis_fachpersonal_kurz: {
      de: "Ersetzt keine individuelle Beratung durch qualifiziertes Fachpersonal.",
      en: "Does not replace individual advice from qualified professionals.",
    },
    betablocker_label: { de: "Einnahme von Beta-Blockern", en: "Taking beta blockers" },
    betablocker_hint: {
      de: "Kann den täglichen Gesamtenergieverbrauch leicht senken (ca. 50–100 kcal/Tag) — dauerhaft wirksam, daher trotz der kleinen Größenordnung eingerechnet.",
      en: "May slightly lower your total daily energy expenditure (approx. 50–100 kcal/day) — has a chronic effect, so it's factored in despite the small magnitude.",
    },
    fidgeting_label: {
      de: "Auffällig viel unbewusste Bewegung / Zappeln",
      en: "Noticeably high unconscious movement / fidgeting",
    },
    fidgeting_hint: {
      de: "Erhöht deinen täglichen Gesamtenergieverbrauch leicht.",
      en: "Slightly increases your total daily energy expenditure.",
    },
    fieber_label: { de: "Aktuell Fieber", en: "Currently have a fever" },
    fieber_hint: {
      de: "Erhöht den Grundumsatz spürbar (ca. +10–13 % pro °C Körperkerntemperatur über 37 °C).",
      en: "Noticeably raises your resting energy expenditure (approx. +10–13% per °C of core body temperature above 37°C).",
    },
    fieber_temp_label: { de: "Körpertemperatur (°C)", en: "Body temperature (°C)" },

    speichern_label: { de: "Eingaben auf diesem Gerät speichern", en: "Save inputs on this device" },
    speichern_hint_kurz: {
      de: "Speichert deine Eingaben nur lokal in diesem Browser — nichts wird übertragen.",
      en: "Saves your inputs only locally in this browser — nothing is transmitted.",
    },
    speichern_hint_technisch: {
      de: `Über <code>localStorage</code> direkt in diesem Browser auf diesem Gerät — kein Cache, keine automatische
        Löschung durch den Browser. Die Daten bleiben, bis du „Daten löschen" klickst oder die Website-Daten manuell
        in den Browser-Einstellungen leerst.`,
      en: `Via <code>localStorage</code> directly in this browser on this device — no cache, no automatic deletion by
        the browser. The data stays until you click "Delete data" or manually clear the site data in your browser
        settings.`,
    },
    speichern_loeschen_btn: { de: "Gespeicherte Daten löschen", en: "Delete saved data" },
    submit_btn: { de: "Berechnen", en: "Calculate" },

    // ---- Ergebnis -----------------------------------------------------------
    result_haupt_heading: { de: "Ergebnis", en: "Result" },
    result_ziel_label_default: { de: "Empfohlene Kalorienzufuhr", en: "Recommended calorie intake" },
    result_bmi_label: { de: "Body-Mass-Index (BMI)", en: "Body Mass Index (BMI)" },
    result_ree_label: { de: "Grundumsatz (REE)", en: "Resting energy expenditure (REE)" },
    result_tee_label: { de: "Gesamtumsatz (TEE)", en: "Total energy expenditure (TEE)" },
    pal_hoch_hinweis: {
      de: "Dein berechnetes Aktivitätslevel (PAL) liegt bei oder über 2,4 — das entspricht einer außergewöhnlich hohen dauerhaften Belastung nahe der physiologischen Obergrenze. Achte auf ausreichend Regeneration, Schlaf und bei Bedarf Erholungstage, besonders wenn du dieses Niveau über längere Zeit hältst.",
      en: "Your calculated activity level (PAL) is at or above 2.4 — this corresponds to an exceptionally high sustained load, close to the physiological upper limit. Make sure to get enough recovery, sleep, and rest days if needed, especially if you maintain this level over a longer period.",
    },
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

    stillstand_panel_titel: {
      de: "Gewichtsstillstand oder Abnehmblockade? Woran es liegen kann",
      en: "Weight plateau or stalled fat loss? What could be behind it",
    },
    stillstand_thermogenese: {
      de: `Ein zu extremes Defizit kann zu vermehrtem Hunger, weniger unbewusster Alltagsbewegung (NEAT) und einem leicht
        sinkenden Grundumsatz führen (adaptive Thermogenese, ca. 5–10 %) — genau deshalb empfiehlt dieser Rechner ein
        moderates Defizit von 15–20 % statt eines radikalen.`,
      en: `Too extreme a deficit can lead to increased hunger, less unconscious daily movement (NEAT), and a slightly
        declining resting energy expenditure (adaptive thermogenesis, approx. 5–10%) — which is exactly why this
        calculator recommends a moderate deficit of 15–20% instead of a radical one.`,
    },
    stillstand_hormonell: {
      de: `Auch hormonelle Faktoren spielen eine Rolle: Eine Schilddrüsenunterfunktion kann den Grundumsatz messbar senken
        (im Formular oben unter „Weitere Faktoren" berücksichtigbar, falls ärztlich diagnostiziert), und erhöhte
        Stresshormone (Cortisol) können durch Wassereinlagerungen den tatsächlichen Fettabbau auf der Waage verschleiern.`,
      en: `Hormonal factors also play a role: an underactive thyroid can measurably lower resting energy expenditure
        (can be accounted for above under "Additional factors" if medically diagnosed), and elevated stress hormones
        (cortisol) can mask actual fat loss on the scale through water retention.`,
    },
    stillstand_checkliste_intro: {
      de: `Bevor du von einem echten Plateau ausgehst: Gewichtsschwankungen durch Wasser sind normal — erst ab 4–6 Wochen
        wirklichem Stillstand lohnt sich eine genauere Abklärung. Für ein Arztgespräch können folgende Blutwerte
        hilfreich sein:`,
      en: `Before assuming a real plateau: weight fluctuations from water are normal — only after 4–6 weeks of genuine
        stagnation is a closer medical look worthwhile. The following blood values can be helpful for a doctor's
        appointment:`,
    },
    stillstand_checkliste_schilddruese: { de: "Schilddrüse (TSH, fT3, fT4)", en: "Thyroid (TSH, fT3, fT4)" },
    stillstand_checkliste_naehrstoffe: {
      de: "Nährstoffstatus (Eisen/Ferritin, Vitamin D)",
      en: "Nutrient status (iron/ferritin, vitamin D)",
    },
    stillstand_checkliste_hormone: { de: "ggf. Hormonstatus", en: "hormone status, if relevant" },
    stillstand_disclaimer: {
      de: `Dieser Rechner ersetzt keine medizinische Diagnostik. Bei chronischem Abnehmstillstand oder Verdacht auf
        Stoffwechselerkrankungen wende dich bitte an qualifiziertes Fachpersonal.`,
      en: `This calculator does not replace medical diagnostics. If you experience chronic weight-loss stalls or
        suspect a metabolic condition, please consult qualified medical professionals.`,
    },

    druck_footer_label: { de: "Fußzeile für den PDF-Export (optional)", en: "Footer text for the PDF export (optional)" },
    druck_footer_hint: {
      de: "Wird zentriert am unteren Rand jeder gedruckten Seite angezeigt, z. B. dein Name. Bleibt das Feld leer, ändert sich am PDF-Export nichts.",
      en: "Shown centered at the bottom of every printed page, e.g. your name. If left empty, nothing changes in the PDF export.",
    },

    print_btn: { de: "Ergebnis als PDF speichern", en: "Save result as PDF" },
    print_dateiname_praefix: { de: "Kalorienbedarfsrechner", en: "CalorieNeedsCalculator" },

    // ---- Druckseite "Eingegebene Werte" (nur PDF-Export, siehe ui.js) --------
    druck_eingaben_heading: { de: "Eingegebene Werte", en: "Values Entered" },
    druck_ja: { de: "Ja", en: "Yes" },
    druck_nein: { de: "Nein", en: "No" },
    druck_ffm_direkt_label: { de: "Fettfreie Masse (direkt gemessen)", en: "Fat-free mass (measured directly)" },
    druck_ffm_kfa_label: { de: "Fettfreie Masse (aus Körperfettanteil)", en: "Fat-free mass (from body fat %)" },
    druck_sport_zeile: { de: "{{stunden}} h/Woche, {{met}} MET", en: "{{stunden}} h/week, {{met}} MET" },
    druck_lauf_km_zeile: { de: "{{km}} km/Woche", en: "{{km}} km/week" },

    // Kanonischer Disclaimer-Kernsatz (Konsistenz-Aufräumen, 2026-08-19): dieselbe
    // Formulierung endet `disclaimer` und `ueber_intro` (die beiden zentralen
    // Stellen) — hier absichtlich als Text dupliziert statt über eine
    // Key-Komposition zusammengesetzt, da i18n.js sonst nirgends verschachtelte
    // Keys kennt und eine neue Compose-Funktion für nur 2 Stellen überdimensioniert
    // wäre. Beim Ändern beide Stellen synchron halten. `hinweis_fachpersonal_kurz`
    // (unten) ist die Kurzform davon, für Risikostellen im Formular.
    disclaimer: {
      de: `Diese Berechnung liefert eine grobe Orientierung basierend auf anthropometrischen Schätzformeln (Standardschätzfehler ±10 % / ±200 kcal).
        Sie ersetzt keine individuelle Beratung durch qualifiziertes Fachpersonal — ob Ärztin/Arzt, Ernährungstherapeutin/Ernährungstherapeut
        oder Gesundheitscoach. Bei medizinischen Angaben (Medikation, Schilddrüse, Schwangerschaft) ist zusätzlich immer ärztlicher Rat einzuholen.`,
      en: `This calculation provides a rough estimate based on anthropometric prediction formulas (standard error of estimate ±10% / ±200 kcal).
        It does not replace individual advice from qualified professionals — whether a physician, a dietitian/nutrition therapist, or a health
        coach. For medical factors (medication, thyroid, pregnancy), medical advice should always be sought in addition.`,
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

    // ---- Soft-Boundary-Formelvergleich (dynamisch) ---------------------------
    soft_boundary_kombiniert_titel: {
      de: "Formelvergleich in zwei Übergangszonen (BMI und Alter)",
      en: "Formula comparison in two transition zones (BMI and age)",
    },
    soft_boundary_bmi_titel: {
      de: "Formelvergleich in der BMI-Übergangszone",
      en: "Formula comparison in the BMI transition zone",
    },
    soft_boundary_bmi_text: {
      de: "Hinweis zur BMI-Übergangszone: Dein BMI liegt im Schwellenbereich zur Adipositas (29,0–31,0 kg/m²). Da sich das Verhältnis von stoffwechselaktivem Organgewebe zu Muskel- und Fettgewebe an dieser Schwelle verschiebt, weichen unterschiedliche Formelmodelle leicht voneinander ab. Anwendung: Orientiere dich für deinen Tagesbedarf am Mittelwert beider Zahlen und passe deine Kalorienzufuhr nach 2–3 Wochen basierend auf deiner realen Gewichtsveränderung an.",
      en: "Note on the BMI transition zone: Your BMI is in the threshold range for obesity (29.0–31.0 kg/m²). Because the ratio of metabolically active organ tissue to muscle and fat tissue shifts around this threshold, different formula models diverge slightly. How to use this: use the average of both numbers as your daily target, and adjust your calorie intake after 2–3 weeks based on your actual weight change.",
    },
    soft_boundary_alter_titel: {
      de: "Formelvergleich in der Alters-Übergangszone",
      en: "Formula comparison in the age transition zone",
    },
    soft_boundary_alter_text: {
      de: "Hinweis zur metabolischen Alters-Übergangszone: Im Alter zwischen 60 und 70 Jahren verändert sich die Körperzusammensetzung (mögliche altersbedingte Sarkopenie) individuell sehr unterschiedlich schnell. Standard-Formeln für jüngere Erwachsene (Mifflin) und spezifische Geriatrie-Formeln (Lührmann) bilden diese Spanne unterschiedlich ab. Anwendung: Wenn du sehr aktiv bist und viel Muskelmasse besitzt, orientiere dich eher am höheren Wert (Mifflin). Wenn du eher inaktiv bist, nutze den Lührmann-Wert oder wähle die goldene Mitte als Startpunkt.",
      en: "Note on the metabolic age transition zone: between ages 60 and 70, body composition (potential age-related sarcopenia) changes at very different rates from person to person. Standard formulas for younger adults (Mifflin) and specific geriatric formulas (Lührmann) capture this range differently. How to use this: if you're very active and have substantial muscle mass, lean toward the higher value (Mifflin). If you're more sedentary, use the Lührmann value, or start with the midpoint between the two.",
    },

    // ---- Eingabevalidierung (Fehlermeldungen unter Feldern) -------------------
    error_kfa_bereich: {
      de: "Bitte einen Wert zwischen 3 % und 60 % eingeben.",
      en: "Please enter a value between 3% and 60%.",
    },
    error_ffm_zu_hoch: {
      de: "Die fettfreie Masse muss kleiner als dein Gesamtgewicht sein.",
      en: "Fat-free mass must be less than your total body weight.",
    },
    error_fieber_fahrenheit: {
      de: "Dieser Wert wirkt wie eine Angabe in Fahrenheit — bitte die Körpertemperatur in Celsius (°C) eingeben.",
      en: "This value looks like it's in Fahrenheit — please enter body temperature in Celsius (°C).",
    },
    error_fieber_bereich: {
      de: "Bitte einen Wert zwischen 35,0 °C und 42,0 °C eingeben.",
      en: "Please enter a value between 35.0 °C and 42.0 °C.",
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
      de: "Sport (MET-Berechnung, ersetzt Sport-Häufigkeits-Schätzung): {{details}} — PAL-Äquivalent +{{zuschlag}}",
      en: "Exercise (MET calculation, replaces sport-frequency estimate): {{details}} — PAL equivalent +{{zuschlag}}",
    },
    mod_sport_haeufigkeit: {
      de: "Sport ({{stufe}}): PAL-Äquivalent +{{zuschlag}}",
      en: "Exercise ({{stufe}}): PAL equivalent +{{zuschlag}}",
    },
    mod_fidgeting: {
      de: "Auffällig viel Spontanbewegung: PAL-Äquivalent +{{zuschlagMin}}…+{{zuschlagMax}}",
      en: "Noticeably high spontaneous movement: PAL equivalent +{{zuschlagMin}}…+{{zuschlagMax}}",
    },
    mod_lauf_intensitaet: {
      de: "Lauf-Intensität ({{km}} km/Woche): PAL-Äquivalent +{{zuschlag}}",
      en: "Running intensity ({{km}} km/week): PAL equivalent +{{zuschlag}}",
    },
    mod_lauf_via_met: {
      de: "Lauf-Basis aus Alltagsaktivität herausgerechnet ({{km}} km/Woche) — Energieverbrauch wird über deine MET-Angabe berücksichtigt.",
      en: "Running baseline removed from daily activity ({{km}} km/week) — energy expenditure is accounted for via your MET entry instead.",
    },
    mod_met_neat_korrektur: {
      de: "Schrittintensiver Sport (Laufen/Gehen/Ballsport): NEAT-PAL um {{zuschlag}} reduziert",
      en: "Step-intensive exercise (running/walking/ball sports): NEAT-PAL reduced by {{zuschlag}}",
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
        dein tatsächlicher Tagesverbrauch im Vergleich zum Grundumsatz liegt. Dieser Rechner setzt sich aus drei
        unabhängigen, addierten Bausteinen zusammen: der Alltagsaktivität (NEAT, geschätzt über deine durchschnittliche
        Schrittzahl/Tag, PAL 1,2–2,0), einem Sport-Zuschlag nach Trainingshäufigkeit oder wahlweise einer genauen
        MET-Berechnung (+0,00 bis +0,40) und optional einem kleinen Zuschlag für auffällig viel unbewusste Spontanbewegung
        (Fidgeting, +0,05 bis +0,10). Die getrennte Erfassung von Alltag und Sport vermeidet, dass beides in einer
        einzigen groben Schätzung vermischt wird — die Gesamtsumme wird auf 1,2 bis 2,6 begrenzt.`,
      en: `<abbr title="Physical Activity Level">PAL</abbr> stands for "Physical Activity Level" and describes how many
        times higher your actual daily energy expenditure is compared to your resting energy expenditure. This
        calculator combines three independent, added components: daily activity (NEAT, estimated from your average
        daily step count, PAL 1.2–2.0), a sport add-on based on training frequency or, alternatively, a precise MET
        calculation (+0.00 to +0.40), and optionally a small add-on for noticeably high unconscious spontaneous
        movement (fidgeting, +0.05 to +0.10). Tracking daily life and exercise separately avoids blending both into
        a single rough estimate — the total is capped between 1.2 and 2.6.`,
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
        Richtigkeit oder Vollständigkeit. Es ersetzt keine individuelle Beratung durch qualifiziertes Fachpersonal —
        ob Ärztin/Arzt, Ernährungstherapeutin/Ernährungstherapeut oder Gesundheitscoach. Bei medizinischen Angaben
        ist zusätzlich immer ärztlicher Rat einzuholen.`,
      en: `The calorie needs calculator is an open-source project — the full source code is freely available on
        <a href="https://github.com/bartlog/kalorienbedarfskalkulator" target="_blank" rel="noopener">GitHub</a>.
        All formulas and modifiers used are based on scientific studies (see the "Methodology &amp; Sources" tab)
        and have been checked against several test cases. Nevertheless, this tool makes no guarantee of accuracy or
        completeness. It does not replace individual advice from qualified professionals — whether a physician, a
        dietitian/nutrition therapist, or a health coach. For medical factors, medical advice should always be
        sought in addition.`,
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
        Empfehlungen ergänzen die Kalorien- und Proteinwerte oben, ersetzen aber keine individuelle Beratung durch
        qualifiziertes Fachpersonal. Jeder Abschnitt lässt sich über die Auswahl unterhalb des Titels nach
        Einstufung filtern.`,
      en: `A curated collection of practical levers — from nutrition to training to eating out. These
        recommendations complement the calorie and protein values above but do not replace individual advice from
        qualified professionals. Each section can be filtered by rating using the dropdown below its title.`,
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
