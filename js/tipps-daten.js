// Datenquelle: privates Google-Sheet des Autors ("Essen und Sport Menü - Body Recomposition").
// Statischer Snapshot, manuell aktualisiert auf Zuruf des Autors (siehe CLAUDE.md) —
// die URL wird bewusst nicht hier im Code abgelegt, da das Sheet nicht öffentlich ist.
// Die deutschen Zeilen stammen 1:1 aus dem Sheet, die englischen sind eine manuelle
// Übersetzung (nicht Teil des Sheets) — bei jedem Sheet-Update muss die neue/geänderte
// Zeile also auch neu übersetzt werden (siehe Memory reference_tipps_spreadsheet).
window.KBR = window.KBR || {};
window.KBR.tipps = (function () {
  // Stufe/Phase ist ein sprachneutraler Code (Filterwert + CSS-Klasse); die
  // Anzeigetexte je Sprache liegen hier zentral, damit Filter/Klassen beim
  // Sprachwechsel stabil bleiben.
  const STUFE_LABELS = {
    top: { de: "Top-Auswahl", en: "Top pick" },
    gut: { de: "Gute Auswahl", en: "Good choice" },
    ok: { de: "OK", en: "OK" },
    selten: { de: "Selten", en: "Rarely" },
    vermeiden: { de: "Vermeiden", en: "Avoid" },
    planung: { de: "Planung", en: "Planning" },
    bestellung: { de: "Bestellung/Zubereitung", en: "Ordering/preparation" },
    vor_dem_essen: { de: "Vor dem Essen", en: "Before eating" },
    waehrend_des_essens: { de: "Während des Essens", en: "While eating" },
    nach_dem_essen: { de: "Nach dem Essen", en: "After eating" },
  };

  const ABSCHNITTE = [
    {
      id: "hebel",
      titel: { de: "Hebel für Fettabbau & Recomposition", en: "Levers for fat loss & recomposition" },
      spalte1: { de: "Stufe", en: "Rating" },
      spalte2: { de: "Hebel für Fettabbau & Recomposition", en: "Levers for fat loss & recomposition" },
      spalte3: { de: "Begründung/Erklärung", en: "Rationale" },
      zeilen: [
        {
          stufe: "top",
          de: ["Moderates Kaloriendefizit (300–500 kcal/Tag)", "Sichert das kontinuierliche Erreichen des Fettabbaus bei maximalem Schutz der Muskelmasse; verhindert starke adaptive Thermogenese und hormonelle Gegenregulationen."],
          en: ["Moderate calorie deficit (300–500 kcal/day)", "Ensures steady fat loss while maximally protecting muscle mass; prevents strong adaptive thermogenesis and hormonal counter-regulation."],
        },
        {
          stufe: "top",
          de: ["Angehobene Proteinzufuhr (1,6–2,4 g/kg KG)", "Maximiert die Muskelproteinsynthese, nutzt den hohen thermischen Effekt der Nahrung, erhöht die Sättigung und wahrt die Stickstoffbilanz im Defizit."],
          en: ["Elevated protein intake (1.6–2.4 g/kg body weight)", "Maximizes muscle protein synthesis, leverages the high thermic effect of protein, increases satiety, and preserves nitrogen balance during a deficit."],
        },
        {
          stufe: "top",
          de: ["Strukturiertes Krafttraining (progressive Steigerung der Wiederholungen, dann der Gewichte)", "Bietet den unentbehrlichen mechanischen Stimulus (Mechanotransduktion via mTORC1) zum Erhalt oder Aufbau von Muskelgewebe während einer negativen Energiebilanz."],
          en: ["Structured strength training (progressively increase reps, then load)", "Provides the essential mechanical stimulus (mechanotransduction via mTORC1) to maintain or build muscle tissue during a negative energy balance."],
        },
        {
          stufe: "top",
          de: ["Allgemeine Bewegung über den Tag verteilt: >8.000 Schritte/Tag, zügige Spaziergänge direkt nach Mahlzeiten (10–15 Min.) oder Mikroworkouts (z. B. Soleus Pushups) alle 45-60 Minuten", "Steigert den täglichen Energieverbrauch massiv ohne zentralnervöse Ermüdung; Post-Meal-Walks ziehen Glukose insulinunabhängig direkt in die Muskelzelle und senken postprandiale Blutzuckerspitzen drastisch."],
          en: ["General movement spread through the day: >8,000 steps/day, brisk walks right after meals (10–15 min), or micro-workouts (e.g. soleus pushups) every 45–60 minutes", "Substantially increases daily energy expenditure without central nervous system fatigue; post-meal walks pull glucose into muscle cells independently of insulin and sharply reduce post-meal blood sugar spikes."],
        },
        {
          stufe: "top",
          de: ["Keine Snacks zwischen den Mahlzeiten", "Ermöglicht das Absinken des Insulinspiegels auf die Basislinie zur ungestörten Aktivierung der Lipolyse (Fettverbrennung) und schützt vor Muskel-Desensibilisierung."],
          en: ["No snacking between meals", "Allows insulin to drop back to baseline for uninterrupted activation of lipolysis (fat burning) and protects against reduced muscle insulin sensitivity."],
        },
        {
          stufe: "top",
          de: ["Aktives Stressmanagement (Atemübungen, Saunagänge, Natur) bzw. das Vermeiden von chronischem psychosozialem Stress", "Chronisch erhöhtes Cortisol fördert die viszerale Fetteinlagerung, verstärkt den Muskelproteinabbau, erhöht den Appétit und stört die Schlafarchitektur maßgeblich."],
          en: ["Active stress management (breathing exercises, sauna sessions, time in nature) or avoiding chronic psychosocial stress", "Chronically elevated cortisol promotes visceral fat storage, increases muscle protein breakdown, raises appetite, and significantly disrupts sleep architecture."],
        },
        {
          stufe: "top",
          de: ["Die letzte Kalorienaufnahme 3-5h vor dem Schlafen", "Senkt nächtliche Blutzucker- und Insulinspitzen, maximiert die natürliche Ausschüttung von Wachstumshormonen im Tiefschlaf und verbessert die Schlafqualität."],
          en: ["Last calorie intake 3–5 hours before sleep", "Lowers overnight blood sugar and insulin spikes, maximizes the natural release of growth hormone during deep sleep, and improves sleep quality."],
        },
        {
          stufe: "top",
          de: ["Ausreichender Schlaf (7-9 Stunden)", "Regulierte Ghrelin-/Leptinspiegel halten den Appetit im Zaum; verhindert, dass Gewichtsverlust primär aus Magermasse statt Fettgewebe besteht."],
          en: ["Adequate sleep (7–9 hours)", "Regulated ghrelin/leptin levels keep appetite in check; prevents weight loss from coming primarily from lean mass instead of fat."],
        },
        {
          stufe: "gut",
          de: ["Isokalorische Zufuhr mit Proteinfokus (für Recomposition bei Trainierten)", "Ermöglicht simultanen Fettabbau und Muskelaufbau bei trainierten Personen durch optimierte Nährstoffpartitionierung ohne energetisches Defizit."],
          en: ["Isocaloric intake with a protein focus (for recomposition in trained individuals)", "Enables simultaneous fat loss and muscle gain in trained individuals through optimized nutrient partitioning without an energy deficit."],
        },
        {
          stufe: "gut",
          de: ["Gleichmäßige Proteinverteilung auf die Mahlzeiten", "Garantiert eine wiederkehrende Auslösung des Leucin-Schwellenwerts alle 3–5 Stunden zur kontinuierlichen Stimulation der Muskelproteinsynthese im Tagesverlauf."],
          en: ["Even protein distribution across meals", "Ensures the leucine threshold is repeatedly triggered every 3–5 hours for continuous stimulation of muscle protein synthesis throughout the day."],
        },
        {
          stufe: "gut",
          de: ["Reihenfolge beim Essen (Erst Ballaststoffe/Salat, dann Proteine/Fette, Kohlenhydrate zum Schluss) & Essig/ACV vor Carbs", "Verlangsamt die Magenentleerung, glättet die Blutzucker- und Insulinkurve um 40–50 %, verhindert reaktiven Heißhunger und verlängert das Sättigungsgefühl signifikant."],
          en: ["Meal sequencing (fiber/salad first, then protein/fat, carbs last) & vinegar/ACV before carbs", "Slows gastric emptying, flattens the blood sugar and insulin curve by 40–50%, prevents reactive cravings, and significantly extends satiety."],
        },
        {
          stufe: "gut",
          de: ["Adäquate Flüssigkeitszufuhr (30–40 ml/kg KG) & Elektrolytausgleich", "Essenziell für optimale Lipolyse (Fettverbrennung erfordert Wasser molekular), maximale Zellhydratation (Synergie mit Kreatin), Leistungsfähigkeit im Training und Verhinderung von fehlerhaft als Hunger interpretiertem Durst."],
          en: ["Adequate fluid intake (30–40 ml/kg body weight) & electrolyte balance", "Essential for optimal lipolysis (fat burning requires water at the molecular level), maximal cell hydration (synergy with creatine), training performance, and preventing thirst that gets mistaken for hunger."],
        },
        {
          stufe: "gut",
          de: ["Kaseineinnahme vor dem Schlafen (30–40 g)", "Führt dem Körper über Nacht kontinuierlich Aminosäuren zu, steigert die nächtliche Muskelproteinsynthese und Erholung, ohne die Lipolyse massiv zu hemmen."],
          en: ["Casein intake before bed (30–40 g)", "Provides the body with a steady supply of amino acids overnight, boosting nighttime muscle protein synthesis and recovery without substantially inhibiting lipolysis."],
        },
        {
          stufe: "gut",
          de: ["Aerobes Zone-2-Training (Unterhaltungstempo: 2–3x pro Woche je 30–60 Minunten)", "Erhöht die mitochondriale Dichte und die maximale Fettoxidationskapazität der Zellen, verbessert die Insulinsensitivität und beeinträchtigt im Gegensatz zu hochintensivem Ausdauertraining die Muskelregeneration kaum."],
          en: ["Aerobic zone 2 training (conversational pace: 2–3× per week, 30–60 minutes each)", "Increases mitochondrial density and the cells' maximum fat oxidation capacity, improves insulin sensitivity, and — unlike high-intensity endurance training — barely interferes with muscle recovery."],
        },
        {
          stufe: "ok",
          de: ["Intermittierendes Fasten (z. B. 16:8-Schema – idealweise Dinner-Cancelling)", "Dient als effektives Werkzeug zur Kalorienkontrolle durch zeitliche Restriktion; bietet physiologisch jedoch keine direkte Überlegenheit gegenüber kontinuierlicher Restriktion bei gleicher Proteinzufuhr."],
          en: ["Intermittent fasting (e.g. 16:8 schedule – ideally skipping dinner)", "Serves as an effective tool for calorie control via time restriction; however, it offers no direct physiological advantage over continuous restriction at matched protein intake."],
        },
        {
          stufe: "ok",
          de: [
            "Scheinfasten / Fasting-Mimicking Diet (FMD nach Dr. Valter Longo: 5-tägige periodische Restriktion – 1-mal pro Monat über 3 aufeinanderfolgende Monate für \"metabolische Sanierung\", 2-3 Mal pro Jahr für allgemeine Stoffwechselgesundheit)",
            "Täuscht den zellulären Nährstoffsensoren durch eine kalorien-, protein- und kohlenhydratarme, pflanzliche Ernährung (~700–1.100 kcal/Tag) einen echten Fastenzustand vor. Aktiviert die Autophagie (Zellerneuerung), reduziert Viszeral- und Leberfett sowie systemische Entzündungen. Die anschließende Refeeding-Phase stimuliert Stammzellen zur Immun- und Geweberegenerierung. Hinweis: Während der 5 Fastentage findet aufgrund der minimalen Proteinzufuhr (<10 % der Kalorien) keine Muskelproteinsynthese statt. FMD schont die Magermasse zwar besser als reines Wasserfasten, ist aber während intensiver Muskelaufbauphasen kontraproduktiv.",
          ],
          en: [
            "Fasting-mimicking diet (FMD, per Dr. Valter Longo: a 5-day periodic restriction — once a month for 3 consecutive months for a \"metabolic reset\", 2–3 times a year for general metabolic health)",
            "Tricks cellular nutrient sensors into a genuine fasting state via a low-calorie, low-protein, low-carbohydrate plant-based diet (~700–1,100 kcal/day). Activates autophagy (cell renewal), reduces visceral and liver fat as well as systemic inflammation. The subsequent refeeding phase stimulates stem cells for immune and tissue regeneration. Note: during the 5 fasting days, minimal protein intake (<10% of calories) means no muscle protein synthesis takes place. FMD preserves lean mass better than pure water fasting, but is counterproductive during intense muscle-building phases.",
          ],
        },
        {
          stufe: "selten",
          de: ["Radikale Crash-Diäten (Very Low Calorie Diets, <800 kcal) ohne angepasste Proteinzufuhr", "Führen zu massivem Verlust an fettfreier Masse (Muskelatrophie), senken den Grundumsatz drastisch und steigern das Risiko für Sarkopenie sowie raschen Jo-Jo-Effekt."],
          en: ["Radical crash diets (very low calorie diets, <800 kcal) without adjusted protein intake", "Lead to massive loss of fat-free mass (muscle atrophy), drastically lower resting energy expenditure, and increase the risk of sarcopenia as well as rapid weight regain."],
        },
        {
          stufe: "selten",
          de: ["Unstrukturierte Refeed-Tage", "Bergen die Gefahr, das mühsam erarbeitete Kaloriendefizit der Wochentage unkontrolliert aufzuheben, ohne relevante metabolische Leistungsschübe zu bewirken."],
          en: ["Unstructured refeed days", "Risk uncontrollably wiping out the calorie deficit painstakingly built up during the week, without producing any meaningful metabolic benefit."],
        },
        {
          stufe: "vermeiden",
          de: ["Chronisches Schlafdefizit im Kaloriendefizit", "Verursacht katabole Hormonverschiebungen (erhöhtes Cortisol) und führt dazu, dass bis zu 75 % des Gewichtsverlusts aus Muskelmasse statt Fettgewebe bestehen."],
          en: ["Chronic sleep deficit while in a calorie deficit", "Causes catabolic hormonal shifts (elevated cortisol) and results in up to 75% of weight loss coming from muscle mass instead of fat tissue."],
        },
        {
          stufe: "vermeiden",
          de: ["Radikale Streichung von Proteinen bei hoher Trainingsbelastung", "Induziert eine negative Stickstoffbilanz, beschleunigten Muskelabbau, verringerte Erholungsfähigkeit und Verlust der anabolen Kapazität."],
          en: ["Radically cutting protein under a heavy training load", "Induces negative nitrogen balance, accelerated muscle breakdown, reduced recovery capacity, and loss of anabolic capacity."],
        },
        {
          stufe: "vermeiden",
          de: ["Unkontrollierte Binge-Eating-Zyklen", "Nichteinhaltung der energetischen Bilanz, Erzeugung extremer Glukose- und Insulinspitzen, Begünstigung Fettansammlung sowie starker gastrointestinaler Stress."],
          en: ["Uncontrolled binge-eating cycles", "Breaks the energy balance, produces extreme glucose and insulin spikes, promotes fat storage, and causes significant gastrointestinal distress."],
        },
      ],
    },
    {
      id: "lebensmittel",
      titel: { de: "Lebensmittel & Getränke", en: "Food & drinks" },
      spalte1: { de: "Stufe", en: "Rating" },
      spalte2: { de: "Lebensmittel & Getränke", en: "Food & drinks" },
      spalte3: { de: "Begründung/Erklärung", en: "Rationale" },
      zeilen: [
        {
          stufe: "top",
          de: ["Unverarbeitete magere Proteinquellen: Hähnchenbrust, Putenbrust, Eiklar; Magerquark/Skyr/Hüttenkäse oder fettarmer griechischer Joghurt (Kasein-Protein)", "Maximale Stimulation der Muskelproteinsynthese durch hohe Leucindichte und biologische Wertigkeit; sehr hohe Sättigung bei geringer Fett- und Kaloriendichte. Kasein versorgt den Körper über Stunden hinweg gleichmäßig mit Aminosäuren."],
          en: ["Unprocessed lean protein sources: chicken breast, turkey breast, egg whites; low-fat quark/skyr/cottage cheese or low-fat Greek yogurt (casein protein)", "Maximum stimulation of muscle protein synthesis via high leucine density and biological value; very high satiety at low fat and calorie density. Casein supplies the body with a steady stream of amino acids over several hours."],
        },
        {
          stufe: "top",
          de: ["Fettreicher Seefisch (Wildlachs, Makrele, Sardinen) oder Thunfisch", "Liefert essenzielle Omega-3-Fettsäuren (EPA/DHA) zur Senkung entzündlicher Zytokine, verbessert Insulinsensitivität und Muskelproteinsynthese-Signale."],
          en: ["Fatty ocean fish (wild salmon, mackerel, sardines) or tuna", "Provides essential omega-3 fatty acids (EPA/DHA) to reduce inflammatory cytokines, improves insulin sensitivity and muscle protein synthesis signaling."],
        },
        {
          stufe: "top",
          de: ["Molkenprotein (Whey) und Milchprodukte (Kasein)", "Whey liefert rasche Leucin-Peaks zur akuten Muskelproteinsynthese-Stimulation rund ums Training."],
          en: ["Whey protein and dairy products (casein)", "Whey delivers fast leucine peaks for acute stimulation of muscle protein synthesis around training."],
        },
        {
          stufe: "top",
          de: ["Extra Natives Olivenöl (EVOO als primäre Fettquelle anstelle von Butter)", "Reich an einfach ungesättigten Fettsäuren und Oleocanthal; senkt entzündliche Marker deutlich effektiver als gesättigte tierische Fette."],
          en: ["Extra virgin olive oil (EVOO as the primary fat source instead of butter)", "Rich in monounsaturated fatty acids and oleocanthal; lowers inflammatory markers considerably more effectively than saturated animal fats."],
        },
        {
          stufe: "top",
          de: ["Gewürze & funktionelle Pflanzenstoffe (Ingwer, Kurkuma, Knoblauch, Zwiebeln)", "Enthalten hochaktive Wirkstoffe wie Curcumin, Allicin und Gingerol. Sie senken entzündliche Zytokine, fördern die Mikrobiom-Diversität und verbessern die Insulinsensitivität."],
          en: ["Spices & functional plant compounds (ginger, turmeric, garlic, onions)", "Contain highly active compounds such as curcumin, allicin, and gingerol. They lower inflammatory cytokines, promote microbiome diversity, and improve insulin sensitivity."],
        },
        {
          stufe: "top",
          de: ["Speisepilze (z. B. Kräuterseitlinge, Pfifferlinge, Shiitake, Champignons)", "Bieten extrem hohes Magenvolumen und Sättigung bei minimaler Kaloriendichte (ideal im Defizit). Reich an Beta-Glucanen und Ergothionein – einem mächtigen zellulären Antioxidans zur Reduktion von oxidativem Stress."],
          en: ["Edible mushrooms (e.g. king oyster, chanterelle, shiitake, button mushrooms)", "Offer extremely high stomach volume and satiety at minimal calorie density (ideal in a deficit). Rich in beta-glucans and ergothioneine — a powerful cellular antioxidant that reduces oxidative stress."],
        },
        {
          stufe: "top",
          de: ["Ballaststoffreiches Gemüse (z. B. Brokkoli, Grünkohl, Spinat) und Salate", "Bietet maximalen Magenvolumen-Vorschub und Sättigung bei minimaler Kaloriendichte; liefert Mikronährstoffe und Ballaststoffe für das Mikrobiom."],
          en: ["High-fiber vegetables (e.g. broccoli, kale, spinach) and salads", "Provides maximum stomach-filling volume and satiety at minimal calorie density; supplies micronutrients and fiber for the microbiome."],
        },
        {
          stufe: "top",
          de: ["Fermentierte Lebensmittel (unpasteurisiertes Sauerkraut/Kimchi, Kefir ohne Zuckerzusatz)", "Erhöht die Mikrobiom-Diversität, stärkt die Darmbarriere und senkt systemische Entzündungen; Kefir liefert leicht verdauliches Protein und Calcium."],
          en: ["Fermented foods (unpasteurized sauerkraut/kimchi, kefir without added sugar)", "Increases microbiome diversity, strengthens the gut barrier, and reduces systemic inflammation; kefir supplies easily digestible protein and calcium."],
        },
        {
          stufe: "top",
          de: ["Geschrotete Leinsamen, Chiasamen & Hanfsamen", "Reiche Quellen für lösliche Schleimstoff-Ballaststoffe und Alpha-Linolensäure (Omega 3). Bilden eine viskose Gel-Matrix im Darm, die die Magenentleerung verlangsamt, Blutzuckerspitzen dämpft und die Bildung entzündungshemmender kurzkettiger Fettsäuren anregt."],
          en: ["Ground flaxseed, chia seeds & hemp seeds", "Rich sources of soluble mucilage fiber and alpha-linolenic acid (omega-3). Form a viscous gel matrix in the gut that slows gastric emptying, dampens blood sugar spikes, and stimulates production of anti-inflammatory short-chain fatty acids."],
        },
        {
          stufe: "top",
          de: ["Beerenfrüchte (insb. dunkle Beeren: Brombeeren, Heidelbeeren u.a.)", "Hoher Polyphenol- und Anthocyan-Gehalt wirkt stark entzündungshemmend und antioxidativ bei niedriger glykämischer Last und hoher Sättigung."],
          en: ["Berries (especially dark berries: blackberries, blueberries, etc.)", "High polyphenol and anthocyanin content has strong anti-inflammatory and antioxidant effects at low glycemic load and high satiety."],
        },
        {
          stufe: "top",
          de: ["Wasser und ungesüßter Matcha-, Grün- und Schwarztee", "Essentiell für Lipolyse, Hydratation und Stoffwechselfunktion; Grüntee liefert EGCG zur leichten Unterstützung der Thermogenese und Fettverbrennung."],
          en: ["Water and unsweetened matcha, green, and black tea", "Essential for lipolysis, hydration, and metabolic function; green tea supplies EGCG for mild support of thermogenesis and fat burning."],
        },
        {
          stufe: "gut",
          de: ["Volleier", "Hohe biologische Wertigkeit, wertvolles Cholin und Mikronährstoffe im Eigelb; erzeugt starke Sättigung bei moderatem Fettgehalt."],
          en: ["Whole eggs", "High biological value, valuable choline and micronutrients in the yolk; produces strong satiety at a moderate fat content."],
        },
        {
          stufe: "gut",
          de: ["Fettes Weiderindfleisch", "Hohe Bioverfügbarkeit von Eisen, Zink, B-Vitaminen und Kreatin; günstigeres Fettsäureprofil als Konventionalfleisch bei beachtenswertem Kaloriengehalt."],
          en: ["Fatty grass-fed beef", "High bioavailability of iron, zinc, B vitamins, and creatine; a more favorable fatty acid profile than conventional beef, at a notable calorie content."],
        },
        {
          stufe: "gut",
          de: ["Apfelessig (ACV vor kohlenhydratreichen Mahlzeiten)", "Essigsäure hemmt die Alpha-Amylase, verlangsamt die Magenentleerung und dämpft postprandiale Blutzucker- sowie Insulinspitzen signifikant."],
          en: ["Apple cider vinegar (ACV before carb-heavy meals)", "Acetic acid inhibits alpha-amylase, slows gastric emptying, and significantly dampens post-meal blood sugar and insulin spikes."],
        },
        {
          stufe: "gut",
          de: ["Tempeh, Bio-Tofu & Edamame", "Bieten ein vollständiges Aminosäureprofil für die Muskelproteinsynthese bei sehr geringem Gehalt an gesättigten Fettsäuren. Tempeh ist zudem fermentiert und fördert dadurch zusätzlich die Mikrobiomgesundheit."],
          en: ["Tempeh, organic tofu & edamame", "Provide a complete amino acid profile for muscle protein synthesis at a very low saturated fat content. Tempeh is also fermented, further supporting microbiome health."],
        },
        {
          stufe: "gut",
          de: ["Hülsenfrüchte (Linsen, Kichererbsen, schwarze Bohnen)", "Bieten pflanzliches Protein, komplexe Kohlenhydrate und lösliche Ballaststoffe; fördern die Bildung entzündungshemmender kurzkettiger Fettsäuren."],
          en: ["Legumes (lentils, chickpeas, black beans)", "Provide plant protein, complex carbohydrates, and soluble fiber; promote production of anti-inflammatory short-chain fatty acids."],
        },
        {
          stufe: "gut",
          de: ["Hafer (Haferflocken, Haferbrot)", "Bieten Beta-Glucan für stabile Blutzuckerprofile, lange Sättigung und nachhaltige Kohlenhydratversorgung für intensive Trainingseinheiten."],
          en: ["Oats (rolled oats, oat bread)", "Provide beta-glucan for stable blood sugar profiles, long-lasting satiety, and sustained carbohydrate supply for intense training sessions."],
        },
        {
          stufe: "gut",
          de: ["Süßkartoffeln, Kartoffeln", "Sehr hoher Sättigungsindex unter den Kohlenhydraten; reich an Kalium und Mikronährstoffen zur optimalen Auffüllung der Muskelglykogenspeicher."],
          en: ["Sweet potatoes, potatoes", "Very high satiety index among carbohydrates; rich in potassium and micronutrients for optimal replenishment of muscle glycogen stores."],
        },
        {
          stufe: "gut",
          de: ["Avocados", "Reich an einfach ungesättigten Fettsäuren, Kalium und Ballaststoffen; unterstützt ein gesundes Lipidprofil und sorgt für anhaltende Sättigung."],
          en: ["Avocados", "Rich in monounsaturated fatty acids, potassium, and fiber; supports a healthy lipid profile and provides lasting satiety."],
        },
        {
          stufe: "gut",
          de: ["Walnüsse, Mandeln", "Nährstoffdichte Quellen für pflanzliche Omega-3-Fettsäuren, Magnesium und Polyphenole; wirken entzündungshemmend bei hoher Energiedichte."],
          en: ["Walnuts, almonds", "Nutrient-dense sources of plant-based omega-3 fatty acids, magnesium, and polyphenols; anti-inflammatory but energy-dense."],
        },
        {
          stufe: "gut",
          de: ["Stark entölter Backkakao (ungesüßt) / Dunkle Schokolade (>85 % mit wenig Zucker)", "Sehr hohe Dichte an Kakao-Flavanolen. Steigert die endogene Stickstoffmonoxid-Synthese für eine bessere Durchblutung und Insulinsensitivität; unterstützt die Sättigung bei Süßhunger."],
          en: ["Heavily defatted baking cocoa (unsweetened) / dark chocolate (>85% with little sugar)", "Very high density of cocoa flavanols. Boosts endogenous nitric oxide synthesis for better blood flow and insulin sensitivity; supports satiety when craving something sweet."],
        },
        {
          stufe: "gut",
          de: ["Schwarzer Kaffee", "Enthält Koffein und Chlorogensäure; steigert die Lipolyse, verbessert den mentalen Fokus und liefert entzündungshemmende Antioxidanzien."],
          en: ["Black coffee", "Contains caffeine and chlorogenic acid; boosts lipolysis, improves mental focus, and supplies anti-inflammatory antioxidants."],
        },
        {
          stufe: "ok",
          de: ["Fettarme Molkereiprodukte mit Süßungsmitteln", "Liefern hochwertiges Eiweiß bei geringer Kaloriendichte; künstliche Süßstoffe erleichtern die Diätadhärenz ohne negativen Einfluss auf den Fettabbau."],
          en: ["Low-fat dairy products with sweeteners", "Supply high-quality protein at low calorie density; artificial sweeteners make diet adherence easier without a negative effect on fat loss."],
        },
        {
          stufe: "ok",
          de: ["Mageres Schweinefleisch", "Solide Proteinquelle mit hohem Aminosäureprofil und B-Vitaminen, aber geringerer Mikronährstoff- und Fettsäuredichte als Rind oder Fisch."],
          en: ["Lean pork", "Solid protein source with a strong amino acid profile and B vitamins, but a lower micronutrient and fatty acid density than beef or fish."],
        },
        {
          stufe: "ok",
          de: ["Reis, Vollkornnudeln/Linsennudeln", "Effiziente Kohlenhydratquellen zur schnellen Glykogenwiederherstellung im Training; erfordern Portionskontrolle wegen höherer Kaloriendichte."],
          en: ["Rice, whole-grain pasta/lentil pasta", "Efficient carbohydrate sources for quick glycogen replenishment around training; require portion control due to higher calorie density."],
        },
        {
          stufe: "ok",
          de: ["Diät-Erfrischungsgetränke", "Kalorienfreie Flüssigkeitszufuhr, die das Einhalten des Kaloriendefizits erleichtert; besitzen keinen Nährwert, hemmen den Fettabbau jedoch nicht."],
          en: ["Diet soft drinks", "Calorie-free fluid intake that makes sticking to a calorie deficit easier; provide no nutritional value but don't hinder fat loss either."],
        },
        {
          stufe: "selten",
          de: ["Butter und große Mengen gesättigter tierischer Fette (fettes Fleisch, Milchprodukte mit hohem Fettanteil)", "Hohe Energiedichte bei ungünstigem Fettsäureprofil; erhöht die Anzahl entzündungsfördernder LDL-Partikel im Vergleich zu pflanzlichen Ölen wie EVOO."],
          en: ["Butter and large amounts of saturated animal fats (fatty meat, high-fat dairy)", "High energy density with an unfavorable fatty acid profile; increases the number of pro-inflammatory LDL particles compared to plant oils like EVOO."],
        },
        {
          stufe: "selten",
          de: ["Hochverarbeitetes Fleisch (Salami, Bacon)", "Hohe Anteile an gesättigten Fetten, Natrium und Nitriten; fördert entzündliche Prozesse bei ungünstigem Protein-zu-Kalorien-Verhältnis."],
          en: ["Highly processed meat (salami, bacon)", "High levels of saturated fat, sodium, and nitrites; promotes inflammatory processes at an unfavorable protein-to-calorie ratio."],
        },
        {
          stufe: "selten",
          de: ["Trockenobst, Fruchtriegel", "Sehr hohe Fruktose- und Kaloriendichte bei geringem Volumen; kann leicht zur Überkalorisierung führen und Blutzuckerschwankungen auslösen."],
          en: ["Dried fruit, fruit bars", "Very high fructose and calorie density at low volume; can easily lead to overconsumption and trigger blood sugar swings."],
        },
        {
          stufe: "selten",
          de: ["Fruchtsäfte", "Liefern flüssige Fruktose ohne Ballaststoffmatrix; führt zu rascher hepatischer Belastung, geringem Sättigungsgefühl und hohen Glukosespitzen."],
          en: ["Fruit juices", "Deliver liquid fructose without the fiber matrix; leads to rapid liver load, low satiety, and high glucose spikes."],
        },
        {
          stufe: "selten",
          de: ["Raffinierte Pflanzenöle mit hohem Omega-6-Anteil (Sonnenblumenöl, Distelöl)", "Ungünstiges Omega-6:Omega-3-Verhältnis fördert die Synthese proinflammatorischer Eicosanoide und steigert den oxidativen Stress."],
          en: ["Refined vegetable oils high in omega-6 (sunflower oil, safflower oil)", "An unfavorable omega-6:omega-3 ratio promotes synthesis of pro-inflammatory eicosanoids and increases oxidative stress."],
        },
        {
          stufe: "selten",
          de: ["Fruktose-Sirup-Produkte", "Begünstigen De-novo-Lipogenese in der Leber, verschlechtern die Insulinsensitivität und unterdrücken Sättigungssignale wie Leptin."],
          en: ["High-fructose syrup products", "Promote de novo lipogenesis in the liver, worsen insulin sensitivity, and suppress satiety signals like leptin."],
        },
        {
          stufe: "vermeiden",
          de: ["Frittierte Speisen", "Enthalten erhitzte, oxidierte Fette und hochkalorische Panaden; fördern endothelialen Stress, Entzündungssysteme und exzessive Kalorienzufuhr."],
          en: ["Fried foods", "Contain heated, oxidized fats and high-calorie breading; promote endothelial stress, inflammation, and excessive calorie intake."],
        },
        {
          stufe: "vermeiden",
          de: ["Industrielle Transfette (z. B. in Kartoffelchips)", "Induzieren starken oxidativen Stress, schädigen das Gefäßendothel, verschlechtern das Lipidprofil und verstärken systemische Entzündungen."],
          en: ["Industrial trans fats (e.g. in potato chips)", "Induce strong oxidative stress, damage the vascular endothelium, worsen the lipid profile, and increase systemic inflammation."],
        },
        {
          stufe: "vermeiden",
          de: ["Zuckerhaltige Erfrischungsgetränke", "Erzeugen massive Glukose- und Insulinspitzen bei null Sättigung; blockieren die Fettverbrennung direkt und fördern viszerale Fetteinlagerung."],
          en: ["Sugary soft drinks", "Produce massive glucose and insulin spikes with zero satiety; directly block fat burning and promote visceral fat storage."],
        },
        {
          stufe: "vermeiden",
          de: ["Hochgradig verarbeitetes Gebäck", "Kombination aus raffiniertem Mehl, zugesetztem Zucker und schlechten Fetten schaltet Sättigungssignale aus und begünstigt Heißhunger."],
          en: ["Highly processed pastries", "The combination of refined flour, added sugar, and poor-quality fats switches off satiety signals and promotes cravings."],
        },
        {
          stufe: "vermeiden",
          de: ["Alkohol", "Hemmt die Muskelproteinsynthese direkt, blockiert die hepatische Fettsäureoxidation, verschlechtert die Schlafarchitektur und liefert leere Kalorien."],
          en: ["Alcohol", "Directly inhibits muscle protein synthesis, blocks hepatic fatty acid oxidation, worsens sleep architecture, and delivers empty calories."],
        },
      ],
    },
    {
      id: "restaurant",
      titel: { de: "Restaurant-Verhalten", en: "Eating out" },
      spalte1: { de: "Phase", en: "Phase" },
      spalte2: { de: "Hinweise (nicht nur) für den Restaurantbesuch", en: "Tips for eating out (and beyond)" },
      zeilen: [
        {
          stufe: "planung",
          de: ["Kognitives Pre-Commitment (Vorab-Entscheidung): Die Speisekarte bereits zu Hause oder unterwegs online studieren und das Gericht im satten, neutralen Zustand festlegen. Wer hungrig an den Restauranttisch sitzt, unterliegt einer erhöhten Aktivität der Amygdala und des Belohnungszentrums (Dopamin). Dies führt zu Impulskäufen von hochkalorischen, fett- und zuckerreichen Speisen. Eine Vorab-Entscheidung nutzt den präfrontalen Kortex für rationale, zielgerichtete Auswahlen."],
          en: ["Cognitive pre-commitment (deciding in advance): Study the menu at home or online beforehand and decide on your dish while full and in a neutral state. Sitting down hungry at a restaurant table triggers heightened activity in the amygdala and the reward center (dopamine). This leads to impulsive choices of high-calorie, fatty, sugary dishes. Deciding in advance engages the prefrontal cortex for rational, goal-directed choices."],
        },
        {
          stufe: "bestellung",
          de: ["Priorisierung des Protein-Ankers: Die Mahlzeit sollte um eine definierte, magere Proteinquelle herum aufgebaut werden. Geeignete Optionen umfassen gegrilltes Hähnchen- oder Putenbrustfilet, Rinderfilet, Magerfisch (wie Zander, Kabeljau, Seelachs) oder Meeresfrüchte. Diese Wahl garantiert das Erreichen der notwendigen EAA- und Leucin-Menge zur Aufrechterhaltung der Muskelproteinsynthese bei kontrollierter Kalorienzufuhr."],
          en: ["Prioritize a protein anchor: Build the meal around a defined, lean protein source. Suitable options include grilled chicken or turkey breast fillet, beef fillet, lean fish (such as zander, cod, pollock), or seafood. This choice guarantees you hit the necessary EAA and leucine amount to sustain muscle protein synthesis while keeping calorie intake under control."],
        },
        {
          stufe: "bestellung",
          de: ["Zubereitungsform mit Bedacht wählen: Zubereitungsarten wie \"gegrillt\", \"gedämpft\", \"gebacken\" oder \"im eigenen Saft\" weisen die geringste zusätzliche Fettaufnahme auf. Speisen, die als \"paniert\", \"frittiert\", \"in Sahnesoße\" oder \"überbacken\" deklariert sind, weisen eine im Vielfachen erhöhte Energiedichte auf, da die Panade beträchtliche Mengen an Zubereitungsfett absorbiert."],
          en: ["Choose the preparation method carefully: Preparations like \"grilled\", \"steamed\", \"baked\", or \"in its own juices\" add the least extra fat. Dishes labeled \"breaded\", \"fried\", \"in cream sauce\", or \"au gratin\" have a many-times-higher energy density, since the breading absorbs substantial amounts of cooking fat."],
        },
        {
          stufe: "bestellung",
          de: ["Aktiver Öl-Tausch (EVOO statt Butter/Pflanzenöl): Im Restaurant sollte darum gebeten werden, das Gericht trocken zuzubereiten oder mit Extra Nativem Olivenöl (EVOO) anstelle von Butter, Schmalz oder billigen Pflanzenölen zu verfeinern. Dies schützt vor entzündungsfördernden Omega-6-Akkumulationen und verbrannten Transfetten."],
          en: ["Actively swap the oil (EVOO instead of butter/vegetable oil): At the restaurant, ask for the dish to be prepared dry or finished with extra virgin olive oil (EVOO) instead of butter, lard, or cheap vegetable oils. This protects against pro-inflammatory omega-6 buildup and burnt trans fats."],
        },
        {
          stufe: "bestellung",
          de: ["Gezielter Kohlenhydrataustausch: Beilagen mit hohem Fettgehalt (z. B. Pommes frites, Kroketten, Bratkartoffeln) sollten aktiv durch kalorienärmere Optionen ersetzt werden. Geeignete Alternativen sind Dampfgemüse, Folienkartoffeln, Salzperlkartoffeln oder Beilagensalate."],
          en: ["Swap carb sides deliberately: High-fat side dishes (e.g. french fries, croquettes, fried potatoes) should be actively swapped for lower-calorie options. Suitable alternatives are steamed vegetables, baked potatoes, boiled new potatoes, or a side salad."],
        },
        {
          stufe: "bestellung",
          de: ["Visuelle 50-25-25-Telleraufteilung (Universeller Kompass): Blicke auf den Teller und wende die visuelle Dreiteilung an: 50 % unpaniertes Gemüse / Salat / Rohkost; 25 % magere Proteinquelle; 25 % komplexe Kohlenhydrate (z. B. Kartoffeln). Dieser Kompass funktioniert auch an Buffets oder bei Familienfeiern ohne Abwiegen. Er garantiert eine hohe Nährstoffdichte und Magenvolumendehnung bei kontrollierter Kaloriendichte."],
          en: ["The visual 50-25-25 plate method (a universal compass): Look at your plate and apply the three-way split: 50% unbreaded vegetables/salad/raw veggies; 25% lean protein source; 25% complex carbohydrates (e.g. potatoes). This method also works at buffets or family gatherings without weighing anything. It guarantees high nutrient density and stomach-filling volume at a controlled calorie density."],
        },
        {
          stufe: "bestellung",
          de: ["Separation von Soßen und Dressings: Salatdressings und Fertigsoßen basieren vorwiegend auf Soja- oder Sonnenblumenöl und enthalten oft zugesetzten Zucker. Die gezielte Bestellung von Soßen und Dressings \"separat im Schälchen\" ermöglicht die Kontrolle über die tatsächlich konsumierte Menge und spart verdeckte Kalorien ein."],
          en: ["Get sauces and dressings on the side: Salad dressings and premade sauces are mostly based on soy or sunflower oil and often contain added sugar. Deliberately asking for sauces and dressings \"on the side\" lets you control how much you actually consume and saves hidden calories."],
        },
        {
          stufe: "bestellung",
          de: ["Restriktion flüssiger Kalorien und Alkohol: Zuckerhaltige Erfrischungsgetränke, Fruchtsäfte und Alkoholika erhöhen die Kalorienbilanz, ohne zur biochemischen Sättigung beizutragen. Insbesondere Alkohol verlangsamt die hepatische Fettsäureoxidation, verschlechtert die nächtliche Schlafqualität und senkt die myofibrilläre Proteinsyntheserate."],
          en: ["Limit liquid calories and alcohol: Sugary soft drinks, fruit juices, and alcoholic beverages add to your calorie balance without contributing to biochemical satiety. Alcohol in particular slows hepatic fatty acid oxidation, worsens nighttime sleep quality, and lowers the myofibrillar protein synthesis rate."],
        },
        {
          stufe: "bestellung",
          de: ["Die \"Doggy-Bag-First\"-Strategie (Visuelle Portionskontrolle): Bei Gerichten mit bekannten Riesensegmenten (z. B. beim Amerikaner, Italiener oder Asiaten) die Bedienung direkt beim Bestellen bitten, die Hälfte des Gerichts vorab einzupacken. Der Mensch neigt zum Plate-Clearing-Reflex (konditioniertes Aufessen des visuellen Tellerinhalts). Durch das Halbieren der sichtbaren Portion wird die Kalorienaufnahme halbiert, während das visuelle Sättigungssignal durch das \"Ansehen eines leeren Tellers\" dennoch ausgelöst wird."],
          en: ["The \"doggy-bag-first\" strategy (visual portion control): For dishes known to come in oversized portions (e.g. American, Italian, or Asian restaurants), ask the server right when ordering to box up half the dish in advance. Humans tend toward a plate-clearing reflex (conditioned finishing of whatever is visually on the plate). Halving the visible portion halves calorie intake, while the visual satiety signal from \"seeing an empty plate\" is still triggered."],
        },
        {
          stufe: "vor_dem_essen",
          de: ["Präventive Hydratation (500 ml Wasser 15–30 Min. vorab): Etwa 20 Minuten vor dem Betreten des Restaurants oder vor dem Servieren ein großes Glas flaches Wasser (ca. 500 ml) trinken – idealerweise mit Apfelessig. Die Vordehnung der Magenwand aktiviert Dehnungsrezeptoren, die erste Sättigungssignale an den Hypothalamus senden. Studien zeigen, dass dadurch die spontane Kalorienaufnahme bei der anschließenden Mahlzeit um 10 bis 15 % sinkt, ohne dass ein Gefühl von Verzicht entsteht."],
          en: ["Preventive hydration (500 ml of water 15–30 min beforehand): About 20 minutes before entering the restaurant, or before the food is served, drink a large glass of still water (approx. 500 ml) — ideally with apple cider vinegar. The pre-stretching of the stomach wall activates stretch receptors that send early satiety signals to the hypothalamus. Studies show this reduces spontaneous calorie intake at the following meal by 10 to 15%, without any feeling of deprivation."],
        },
        {
          stufe: "vor_dem_essen",
          de: ["Vorab-Hacks für das Glukose-Management: Die Bestellung eines Salats mit Essig-Öl-Dressing (oder die Einnahme von Apfelessig/Berberin kurz vor dem Restaurantbesuch) bremst den Glukoseanstieg der nachfolgenden Speisen ab."],
          en: ["Pre-meal glucose management hacks: Ordering a salad with a vinegar-oil dressing (or taking apple cider vinegar/berberine shortly before the restaurant visit) slows the glucose rise from the food that follows."],
        },
        {
          stufe: "waehrend_des_essens",
          de: ["Nutzung des Volumen-Vorschubs: Der Verzehr eines großen Beilagensalats mit Essig-Öl-Dressing (Sorte Essig/Olivenöl präferiert) oder einer klaren Gemüsesuppe vor der Hauptspeise dehnt die Magenwand vorab. Dies stimuliert die Freisetzung der Sättigungshormone Peptid YY (PYY) und Glucagon-like Peptide-1 (GLP-1) und reduziert den Gesamtkalorienverbrauch der Mahlzeit."],
          en: ["Use the volume head start: Eating a large side salad with a vinegar-oil dressing (vinegar/olive oil preferred) or a clear vegetable soup before the main course pre-stretches the stomach wall. This stimulates release of the satiety hormones peptide YY (PYY) and glucagon-like peptide-1 (GLP-1) and reduces the meal's total calorie intake."],
        },
        {
          stufe: "waehrend_des_essens",
          de: ["Food Sequencing: Den Brotkorb am Anfang beiseite stellen lassen. Wer nicht auf das Brot verzichten möchte, isst es zusammen mit dem Protein/Fett des Hauptgangs oder ganz am Ende. Starte die Mahlzeit mit einem grünen Beilagensalat (Dressing auf Basis von Essig und Olivenöl), einem Dämpfgemüse oder einer Gemüsesuppe. Iss als Nächstes die Proteinquelle (Fleisch, Fisch, Tofu, Eier) und die verbleibenden gesunden Fette. Beilagen wie Reis, Kartoffeln, Pasta, Pommes oder das Brot erst jetzt zum Schluss konsumieren. Dessert optional."],
          en: ["Food sequencing: Have the bread basket set aside at the start. If you don't want to skip the bread, eat it together with the protein/fat of the main course, or right at the end. Start the meal with a green side salad (vinegar-and-olive-oil-based dressing), steamed vegetables, or a vegetable soup. Next, eat the protein source (meat, fish, tofu, eggs) and the remaining healthy fats. Only now eat sides like rice, potatoes, pasta, fries, or bread, right at the end. Dessert is optional."],
        },
        {
          stufe: "waehrend_des_essens",
          de: ["Gut kauen: Jeden Bissen 20- bis 30-mal kauen und das Besteck zwischen den Bissen bewusst ablegen. Die Ausschüttung der Sättigungshormone im Dünndarm benötigt ab dem ersten Bissen etwa 15 bis 20 Minuten – ein guter Rhythmus bei mehreren Gängen! Wer zu schnell isst, konsumiert in diesem \"hormonellen Fenster\" mehr Kalorien, als der Körper biochemisch benötigt. Gründliches Kauen maximiert zudem die Speichel-Amylase und entlastet die enzymatische Verdauung im Magen."],
          en: ["Chew thoroughly: Chew each bite 20 to 30 times and deliberately put your cutlery down between bites. Releasing satiety hormones in the small intestine takes about 15 to 20 minutes from the first bite — a good rhythm to maintain across multiple courses! Eating too fast means consuming more calories than the body biochemically needs within this \"hormonal window\". Thorough chewing also maximizes salivary amylase and eases enzymatic digestion in the stomach."],
        },
        {
          stufe: "nach_dem_essen",
          de: ["Der geschmackliche Mahlzeiten-Abschluss (Mouth-Reset): Direkt nach der Hauptspeise einen reinen Espresso (nach dem Lunch, nicht nach dem Dinner), einen Pfefferminztee trinken oder sofort einen zuckerfreien Pfefferminz-Kaugummi nutzen. Nutzt das biochemische Prinzip der sensorisch-spezifischen Sättigung. Der abrupte Wechsel von herzhaft zu bitter/frisch beendet die geschmackliche Stimulation im Mundraum und unterbricht den unbewussten Drang nach \"etwas Süßem\" (Dessert-Craving)."],
          en: ["The flavor \"mouth reset\" at the end of a meal: Right after the main course, drink a plain espresso (after lunch, not after dinner) or peppermint tea, or immediately chew sugar-free peppermint gum. Uses the biochemical principle of sensory-specific satiety. The abrupt switch from savory to bitter/fresh ends flavor stimulation in the mouth and interrupts the unconscious urge for \"something sweet\" (dessert craving)."],
        },
        {
          stufe: "nach_dem_essen",
          de: ["Post-Meal Walk / Bewegung nach dem Essen: Ein 10- bis 15-minütiger zügiger Spaziergang direkt nach der Mahlzeit zieht Glukose ins Muskelgewebe ein, ohne auf Insulin angewiesen zu sein, was Fettspeicherung und Entzündungsprozesse spürbar minimiert."],
          en: ["Post-meal walk / movement after eating: A brisk 10- to 15-minute walk right after the meal pulls glucose into muscle tissue without relying on insulin, noticeably minimizing fat storage and inflammatory processes."],
        },
      ],
    },
    {
      id: "sport",
      titel: { de: "Sport & allgemeine Bewegung", en: "Exercise & general movement" },
      spalte1: { de: "Stufe", en: "Rating" },
      spalte2: { de: "Sport (Zone 2, HIIT, Kraft) & allgemeine Bewegung", en: "Exercise (zone 2, HIIT, strength) & general movement" },
      spalte3: { de: "Begründung/Erklärung", en: "Rationale" },
      zeilen: [
        {
          stufe: "top",
          de: ["Progressives Krafttraining mit Fokus auf Grundübungen großer Muskelgruppen (Kniebeugen, Kreuzheben, Liegestütze, Klimmzüge u. ä.; 3–5 Einheiten/Woche bis nahe an das Muskelversagen – eine hart trainierte Muskelgruppe danach 1-2 Tage pausieren)", "Bietet den stärksten mechanischen Stimulus zum Aufbau und Erhalt der Magermasse; steigert die periphere Insulinsensitivität und schützt den Grundumsatz im Defizit."],
          en: ["Progressive strength training focused on compound exercises for major muscle groups (squats, deadlifts, push-ups, pull-ups, etc.; 3–5 sessions/week close to muscle failure — rest a hard-trained muscle group for 1–2 days afterward)", "Provides the strongest mechanical stimulus for building and maintaining lean mass; increases peripheral insulin sensitivity and protects resting energy expenditure during a deficit."],
        },
        {
          stufe: "top",
          de: ["Allgemeine Bewegung über den Tag verteilt: >10.000 Schritte/Tag", "Maximiert den täglichen Energieverbrauch ohne Aktivierung der Stressachse oder zentralnervöse Ermüdung; schützt effektiv vor adaptiver Thermogenese während einer Diät."],
          en: ["General movement spread through the day: >10,000 steps/day", "Maximizes daily energy expenditure without activating the stress axis or causing central nervous system fatigue; effectively protects against adaptive thermogenesis during a diet."],
        },
        {
          stufe: "top",
          de: ["Mikroworkouts im Büro (Soleus Pushups am Schreibtisch, Squats, zügiges Treppensteigen) alle 45-60 Minuten, mindestens nach dem Lunch", "Unterbricht langes Sitzen, zieht Glukose insulinunabhängig in die Muskelzelle, glättet postprandiale Blutzuckerspitzen und verhindert das Herunterfahren der Lipoproteinlipase."],
          en: ["Office micro-workouts (desk soleus pushups, squats, brisk stair climbing) every 45–60 minutes, at least after lunch", "Breaks up prolonged sitting, pulls glucose into muscle cells independently of insulin, flattens post-meal blood sugar spikes, and prevents lipoprotein lipase from shutting down."],
        },
        {
          stufe: "gut",
          de: ["Zone-2-Ausdauertraining (2–3 Einheiten/Woche, 30–60 Minuten bei 65–75% HRmax)", "Fördert die mitochondriale Biogenese, Kapillarisierung und oxidative Fettsäureverbrennung; erzeugt im Gegensatz zu intensiverem Kardio minimale Interferenz mit dem Hypertrophietraining."],
          en: ["Zone 2 endurance training (2–3 sessions/week, 30–60 minutes at 65–75% HRmax)", "Promotes mitochondrial biogenesis, capillarization, and oxidative fat burning; unlike more intense cardio, creates minimal interference with hypertrophy training."],
        },
        {
          stufe: "gut",
          de: ["High-Intensity Interval Training (HIIT, 1–2 Einheiten/Woche für 15–20 Minuten – z. B. Norwegian 4×4 oder Tabata-Protokoll mit Burpees, Jumping Jacks, Liegestütze, Kniehebelauf)", "Erzeugt einen hohen akuten Kalorienverbrauch und Nachbrenn-Effekt bei geringem Zeitaufwand; erfordert jedoch Erholungssteuerung wegen hoher zentralnervöser Systembelastung."],
          en: ["High-intensity interval training (HIIT, 1–2 sessions/week for 15–20 minutes — e.g. Norwegian 4×4 or a Tabata protocol with burpees, jumping jacks, push-ups, high knees)", "Produces a high acute calorie burn and afterburn effect for a small time investment; however, requires careful recovery management due to the high load on the central nervous system."],
        },
        {
          stufe: "ok",
          de: ["Funktionelles Training (Bootcamp, Zirkeltraining)", "Steigert die kardiovaskuläre Belastbarkeit und lokalkonditionelle Ausdauer; bietet im Vergleich zu klassischem Krafttraining jedoch einen geringeren spezifischen Reiz für Muskelhypertrophie."],
          en: ["Functional training (bootcamp, circuit training)", "Increases cardiovascular capacity and local muscular endurance; however, provides a weaker specific stimulus for muscle hypertrophy compared to classic strength training."],
        },
        {
          stufe: "ok",
          de: ["Gezielte Stabilitäts- & Mobilitätsarbeit", "Schützt Bänder, Sehnen und Gelenke vor Überlastung, sichert die volle Bewegungsreichweite (Full Range of Motion) bei schweren Grundübungen und verhindert trainingsbedingte Verletzungsausfälle, die den Muskelaufbau und Fettabbau monatelang zurückwerfen würden."],
          en: ["Targeted stability & mobility work", "Protects ligaments, tendons, and joints from overload, ensures full range of motion on heavy compound lifts, and prevents training injuries that would set back muscle building and fat loss for months."],
        },
        {
          stufe: "selten",
          de: ["Ausschließliches, hochvolumiges Ausdauertraining mittlerer bis hoher Intensität (Zone 3/4) ohne begleitendes Krafttraining", "Erzeugt molekulare Signalinterferenz und erhöht im Kaloriendefizit das Risiko für den Verlust von Muskelmasse bei hoher kumulativer Ermüdung."],
          en: ["Exclusive, high-volume moderate-to-high-intensity endurance training (zone 3/4) with no accompanying strength training", "Creates molecular signaling interference and, in a calorie deficit, increases the risk of muscle mass loss under high cumulative fatigue."],
        },
        {
          stufe: "vermeiden",
          de: ["Chronischer Sedentarisierungseffekt (< 3.000 Schritte/Tag)", "Inaktiviert die Lipoproteinlipase der Muskelzellen, verschlechtert die Glukosetoleranz drastisch, senkt den täglichen Energieumsatz und induziert rasche muskuläre Atrophie."],
          en: ["Chronic sedentary behavior (<3,000 steps/day)", "Deactivates muscle cell lipoprotein lipase, drastically worsens glucose tolerance, lowers daily energy expenditure, and induces rapid muscle atrophy."],
        },
        {
          stufe: "vermeiden",
          de: ["Exzessives Übertraining ohne ausreichende Erholungsphasen", "Überstimuliert die Stress-Achse und führt zu dauerhaft erhöhtem Cortisol; unterdrückt die Muskelproteinsynthese, schwächt das Immunsystem und erhöht das Verletzungsrisiko."],
          en: ["Excessive overtraining without adequate recovery", "Overstimulates the stress axis and leads to persistently elevated cortisol; suppresses muscle protein synthesis, weakens the immune system, and increases injury risk."],
        },
      ],
    },
    {
      id: "supplemente",
      titel: { de: "Supplemente und andere Hacks", en: "Supplements and other hacks" },
      spalte1: { de: "Stufe", en: "Rating" },
      spalte2: { de: "Supplemente und andere Hacks", en: "Supplements and other hacks" },
      spalte3: { de: "Begründung/Erklärung", en: "Rationale" },
      zeilen: [
        {
          stufe: "top",
          de: ["Optimierte Schlafhygiene (7–9 Stunden kontinuierliche Nachtruhe)", "Bewahrt die Magermasse im Defizit, reguliert Hormone, senkt Cortisol und ermöglicht die maximale Ausschüttung von Wachstumshormonen im Tiefschlaf."],
          en: ["Optimized sleep hygiene (7–9 hours of uninterrupted sleep)", "Preserves lean mass during a deficit, regulates hormones, lowers cortisol, and enables maximum growth hormone release during deep sleep."],
        },
        {
          stufe: "top",
          de: ["Morgendliches Sonnenlicht (20-30 Minuten, auch bei Bewölkung – nicht direkt in die Sonne schauen)", "Synchronisiert die zirkadiane Hauptuhr über das Auge, stoppt die Melatonausschüttung, optimiert den Morgen-Peak von Cortisol und fördert die nächtliche Schlafqualität."],
          en: ["Morning sunlight exposure (20–30 minutes, even when overcast – don't look directly at the sun)", "Synchronizes the master circadian clock via the eyes, stops melatonin release, optimizes the morning cortisol peak, and improves nighttime sleep quality."],
        },
        {
          stufe: "top",
          de: ["Kreatin-Monohydrat (3–5 g/Tag)", "Erhöht die intramuskulären Phosphokreatinspeicher, steigert Maximalkraft, Trainingskapazität und Zellhydratation, was wiederum anabole Signalwege stimuliert."],
          en: ["Creatine monohydrate (3–5 g/day)", "Increases intramuscular phosphocreatine stores, boosts maximal strength, training capacity, and cell hydration, which in turn stimulates anabolic signaling pathways."],
        },
        {
          stufe: "top",
          de: ["Hochwertiges Proteinpulver (Whey Isolate – ohne Zucker) oder essenzielle Aminosäuren (EAA)", "Ermöglicht die rasche Erreichung des Leucin-Schwellenwerts zur maximalen Stimulation der Muskelproteinsynthese bei minimaler Kalorien- und Fettzufuhr."],
          en: ["High-quality protein powder (whey isolate – no added sugar) or essential amino acids (EAAs)", "Enables you to quickly hit the leucine threshold for maximal stimulation of muscle protein synthesis with minimal calorie and fat intake."],
        },
        {
          stufe: "top",
          de: ["Omega-3-Fettsäuren (2–3 g EPA/DHA täglich)", "Senkt systemische Entzündungsmarker, verbessert die Insulinsensitivität der Muskelzelle und erhöht die myofibrilläre Muskelproteinsyntheserate."],
          en: ["Omega-3 fatty acids (2–3 g EPA/DHA daily)", "Lowers systemic inflammation markers, improves muscle cell insulin sensitivity, and increases the myofibrillar muscle protein synthesis rate."],
        },
        {
          stufe: "gut",
          de: ["Apfelessig (ACV, 1–2 EL in Wasser vor Carbs)", "Die enthaltene Essigsäure verlangsamt die Magenentleerung und hemmt Kohlenhydrat-Enzyme, was postprandiale Blutzucker- und Insulinspitzen signifikant dämpft."],
          en: ["Apple cider vinegar (ACV, 1–2 tbsp in water before carbs)", "The acetic acid it contains slows gastric emptying and inhibits carbohydrate-digesting enzymes, significantly dampening post-meal blood sugar and insulin spikes."],
        },
        {
          stufe: "gut",
          de: ["Berberin (500 mg 1–3x täglich vor Mahlzeiten)", "Aktiviert direkt die AMP-aktivierte Proteinkinase, hemmt die hepatische Glukoneogenese, fördert den Glukosetransport und senkt Blutzucker sowie Triglyzeride."],
          en: ["Berberine (500 mg 1–3× daily before meals)", "Directly activates AMP-activated protein kinase, inhibits hepatic gluconeogenesis, promotes glucose uptake, and lowers blood sugar and triglycerides."],
        },
        {
          stufe: "gut",
          de: ["Vitamin D3 + K2 (bei Defizit – vorher messen)", "Reguliert über 1.000 Gene für Immun- und Muskelzellfunktionen, unterstützt die Testosteronsynthese und stellt die korrekte Calciumverwertung in den Knochen sicher."],
          en: ["Vitamin D3 + K2 (if deficient — test first)", "Regulates over 1,000 genes involved in immune and muscle cell function, supports testosterone synthesis, and ensures correct calcium utilization in bone."],
        },
        {
          stufe: "gut",
          de: ["Koffein (1 Tasse Kaffee vor dem Sport, ohne Milch, ohne Zucker)", "Blockiert Adenosinrezeptoren im Gehirn, steigert den mentalen Fokus, senkt das subjektive Belastungsempfinden und erhöht die Lipolyse (Fettsäurefreisetzung)."],
          en: ["Caffeine (1 cup of coffee before exercise, no milk, no sugar)", "Blocks adenosine receptors in the brain, increases mental focus, lowers perceived exertion, and increases lipolysis (fatty acid release)."],
        },
        {
          stufe: "gut",
          de: ["Magnesium (z. B. als Malat oder Bis-Glycinat)", "Essenzieller Kofaktor für über 300 enzymatische Reaktionen, unterstützt die neuromuskuläre Regeneration, senkt zentralnervöse Erregung und verbessert die Schlafqualität."],
          en: ["Magnesium (e.g. as malate or bisglycinate)", "An essential cofactor for over 300 enzymatic reactions, supports neuromuscular recovery, lowers central nervous system excitability, and improves sleep quality."],
        },
        {
          stufe: "gut",
          de: ["Glycin (3–6 g vor dem Schlafen)", "Glycin wirkt als hemmender Neurotransmitter im Gehirn und fördert die periphere Vasodilatation (Gefäßerweiterung). Dadurch wird die Kerntemperatur des Körpers rascher abgesenkt, was das Einschlafen beschleunigt und den Tiefschlafanteil erhöht. Zudem dient es als Baustein für Glutathion (stärkstes körpereigenes Antioxidans)."],
          en: ["Glycine (3–6 g before bed)", "Glycine acts as an inhibitory neurotransmitter in the brain and promotes peripheral vasodilation (widening of blood vessels). This lowers core body temperature more quickly, speeding up sleep onset and increasing deep sleep proportion. It also serves as a building block for glutathione (the body's most powerful endogenous antioxidant)."],
        },
        {
          stufe: "gut",
          de: ["Kälteexposition morgens (z. B. 1-3 Minuten kalt duschen) oder vor dem Training (statt danach)", "Aktiviert das braune Fettgewebe zur Erhöhung der Thermogenese, löst eine lang anhaltende Erhöhung von Dopamin und Noradrenalin (+250 %) aus, steigert die mentale Belastbarkeit und erhöht die Alertness, ohne anabole Signale des Krafttrainings zu beeinträchtigen."],
          en: ["Morning cold exposure (e.g. a 1–3 minute cold shower) or before training (rather than after)", "Activates brown adipose tissue to increase thermogenesis, triggers a long-lasting rise in dopamine and norepinephrine (+250%), boosts mental resilience and alertness, without interfering with the anabolic signaling of strength training."],
        },
        {
          stufe: "gut",
          de: ["Sauna & Hitzetherapie – z. B. direkt nach moderatem Zone2-Cardiotraining", "20–30 Minuten Sauna (bei 80–90°C) führen zur Ausschüttung von Hitzeschockproteinen, die beschädigte Proteine reparieren und zellulären oxidativen Stress reduzieren. Zudem bewirkt die Sauna eine massive temporäre Steigerung der Wachstumshormone, senkt systemische Entzündungen und verbessert die kardiovaskuläre Elastizität. Sauna direkt nach moderatem Zone2-Cardiotraining verlängert das Cardiotraining (z. B. 30 Minuten Rudergerät, danach in die Sauna)."],
          en: ["Sauna & heat therapy – e.g. right after moderate zone 2 cardio", "20–30 minutes in the sauna (at 80–90°C) triggers release of heat shock proteins, which repair damaged proteins and reduce cellular oxidative stress. The sauna also causes a massive temporary rise in growth hormone, lowers systemic inflammation, and improves cardiovascular elasticity. Doing sauna right after moderate zone 2 cardio effectively extends the cardio session (e.g. 30 minutes on the rowing machine, then into the sauna)."],
        },
        {
          stufe: "ok",
          de: ["L-Citrullin / Citrullin-Malat (6–8 g)", "Erhöht als L-Arginin-Vorläufer die Stickstoffmonoxid-Synthese für bessere Muskeldurchblutung und puffert saure Stoffwechselnebenprodukte bei hoher Trainingsintensität."],
          en: ["L-citrulline / citrulline malate (6–8 g)", "As a precursor to L-arginine, increases nitric oxide synthesis for better muscle blood flow and buffers acidic metabolic byproducts during high-intensity training."],
        },
        {
          stufe: "ok",
          de: ["Grüntee-Extrakt", "Liefert hochkonzentrierte Catechine (EGCG), die in Kombination mit Bewegung leicht die Katecholamin-Aktivität und Fettoxidation unterstützen sowie antioxidativ wirken."],
          en: ["Green tea extract", "Supplies highly concentrated catechins (EGCG), which — combined with exercise — mildly support catecholamine activity and fat oxidation, and have antioxidant effects."],
        },
        {
          stufe: "ok",
          de: ["Melatonin bei Schlafproblemen (als retard bei Durchschlafproblemen)", "Verkürzt die Einschlafzeit und unterstützt die Phasenverschiebung der inneren Uhr; als Retard-Formulierung stabilisiert es das Durchschlafen bei zirkadianen Störungen."],
          en: ["Melatonin for sleep problems (extended-release for staying-asleep issues)", "Shortens time to fall asleep and supports phase-shifting of the internal clock; as an extended-release formulation, it stabilizes sleep maintenance in circadian disorders."],
        },
        {
          stufe: "selten",
          de: ["Eisbäder direkt nach dem Krafttraining", "Kaltwasserimmersion unterdrückt akut notwendige anabole Entzündungsreaktionen sowie Signalkaskade, was Muskelaufbau und Kraftzuwachs signifikant hemmt."],
          en: ["Ice baths right after strength training", "Cold water immersion suppresses the acutely necessary anabolic inflammatory response and signaling cascade, significantly inhibiting muscle growth and strength gains."],
        },
        {
          stufe: "selten",
          de: ["Hochdosierte Antioxidanzien (Vitamin C/E) im Trainingsfenster", "Senken den durch das Training erzeugten oxidativen Stress ab, der für mitochondriale Biogenese und muskuläre Adaptionsprozesse zwingend benötigt wird – etwa 6 Stunden Abstand zum Training einhalten!"],
          en: ["High-dose antioxidants (vitamin C/E) around the training window", "Reduce the training-induced oxidative stress that is actually required for mitochondrial biogenesis and muscle adaptation — keep a gap of about 6 hours from training!"],
        },
        {
          stufe: "selten",
          de: ["Verzweigtkettige Aminosäuren (BCAA) als Einzelsupplement", "Ohne die zeitgleiche Präsenz aller 9 essenziellen Aminosäuren (EAAs) kann keine vollständige Muskelproteinsynthese stattfinden; BCAAs allein sind bei ausreichender Proteinzufuhr weitgehend wirkungslos."],
          en: ["Branched-chain amino acids (BCAAs) as a standalone supplement", "Without all 9 essential amino acids (EAAs) present at the same time, complete muscle protein synthesis cannot occur; BCAAs alone are largely ineffective given adequate protein intake."],
        },
        {
          stufe: "vermeiden",
          de: ["Chronischer Schlafentzug (< 6 Stunden/Nacht)", "Steigert Cortisol und Ghrelin, senkt Leptin – erzeugt Hungergefühl – und verschiebt das hormonelle Milieu so stark, dass bei Gewichtsverlust primär Muskelmasse statt Fettgewebe abgebaut wird."],
          en: ["Chronic sleep deprivation (<6 hours/night)", "Raises cortisol and ghrelin, lowers leptin — creating hunger — and shifts the hormonal environment so strongly that weight loss draws primarily from muscle mass instead of fat tissue."],
        },
        {
          stufe: "vermeiden",
          de: ["Illegale/gefährliche Thermogene (z. B. überdosiertes Synephrin)", "Überstimulieren das Herz-Kreislauf-System exzessiv, lösen Bluthochdruck, Herzrhythmusstörungen, Angstzustände sowie lebensbedrohliche Hyperthermierisiken aus."],
          en: ["Illegal/dangerous thermogenics (e.g. overdosed synephrine)", "Excessively overstimulate the cardiovascular system, triggering high blood pressure, cardiac arrhythmias, anxiety, and life-threatening hyperthermia risk."],
        },
        {
          stufe: "vermeiden",
          de: ["Unregulierte selektive Androgenrezeptor-Modulatoren (SARMs)", "Unterdrücken die körpereigene Hormonachse (Testosteronsynthese) massiv, verschlechtern Blutfettwerte und Leberfunktion ohne abgesichertes klinisches Sicherheitsprofil."],
          en: ["Unregulated selective androgen receptor modulators (SARMs)", "Massively suppress the body's own hormonal axis (testosterone synthesis), worsen blood lipids and liver function, with no established clinical safety profile."],
        },
      ],
    },
  ];

  return { ABSCHNITTE, STUFE_LABELS };
})();
