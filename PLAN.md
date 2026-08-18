# Kalorienbedarfsrechner — Ausbau zum evidenzbasierten Tool

## Context

Im Projektordner liegt bislang nur ein minimaler Prototyp (Mifflin-St-Jeor + PAL-Select + Ziel-Anpassung), der in dieser Session als Gerüst entstanden ist. Die mit Gemini erarbeitete Konzeption beschreibt einen deutlich umfangreicheren Rechner: Formelauswahl über einen Entscheidungsbaum (Cunningham / Ten-Haaf / Lührmann / Müller / Mifflin), ein dreistufiges Eingabemodell (Kategorie A/B/C) und eine Reihe von Modifikatoren.

Die Konzeption zielt auf ein Spreadsheet, lässt sich aber vollständig ins Web überführen — die Logik ist deterministische Arithmetik auf Nutzereingaben. Web kann hier sogar mehr als ein Sheet: Felder progressiv einblenden, die **Begründung der Formelwahl** anzeigen und die Unsicherheit sichtbar machen. Randbedingung bleibt: rein clientseitig, kein Server, kein Build-Step, Hosting über GitHub Pages.

Zielbild: ein Rechner, der nicht nur eine Zahl ausgibt, sondern transparent macht, **welche Formel warum** gewählt wurde und **wie unsicher** das Ergebnis ist.

---

## ⚠️ Fachliche Korrektur an der Konzeption — geklärt via Notebook „Kalorienbedarf"

Bei der Prüfung der Konzeption sind Rechenfehler aufgefallen. Sie betreffen deine Antwort „komplett B". Die ursprüngliche Korrektur wurde mit dem Notebook „Kalorienbedarf" gegengeprüft — dabei wurde ein eigener Fehler in dieser Korrektur aufgedeckt (Fieber, siehe Punkt 3):

1. **TEF (nahrungsinduzierte Thermogenese) darf nicht addiert werden.** Sie ist in der Definition des TEE und in allen PAL-Werten bereits enthalten. Additive Aufnahme wäre ein systematischer Fehler von rund +10 %.
2. **Schlafdauer darf nicht abgezogen werden.** Der Ruheumsatz ist ein 24-h-Wert und enthält die Schlafphase bereits (Schlafrückgang ≈ −10 % REE ist Teil der REE/PAL-Definition).
3. **Koffein und Lutealphase sind Akuteffekte — Fieber dagegen nicht.** Ein Koffein-Peak (3–8 %, wenige Stunden) und die Lutealphase (3–5 % im Zyklus) lassen sich nicht auf den Tagesbedarf hochrechnen. **Fieber ist die Ausnahme und muss eingerechnet werden**: die Körperkerntemperatur erhöht den REE akut um **10–13 % pro 1 °C über 37 °C** — bei 39 °C sind das +20–26 % (~300–500 kcal/Tag), klinisch relevant und vom PAL-Faktor nicht erfasst. Fieber wandert daher von „nur Hinweis" in die Kategorie „geht in die Rechnung ein" (siehe Modifikator-Tabellen unten).

Hinzu kommt eine Größenordnungs-Frage: Mifflin-St-Jeor hat einen Standardschätzfehler von **rund ±200 kcal**. Modifikatoren unter ±5 % (Lutealphase ≈ 40–70 kcal, Beta-Blocker 50–100 kcal) liegen damit **unterhalb des Rauschens der Grundformel** — sie erzeugen Scheingenauigkeit. Beta-Blocker wird trotzdem eingerechnet: anders als die Lutealphase (temporär, ~14 Tage, gleicht sich im Monatsmittel aus) wirkt er **chronisch täglich** und führt ohne Anpassung zu schleichender Gewichtszunahme — das rechtfertigt die Aufnahme trotz Größenordnung unterhalb des Formelrauschens. Kriterium für „wird gerechnet trotz kleiner Größenordnung": **Chronizität**, nicht nur die kcal-Spanne.

**Vorgeschlagener Umgang (erfüllt „komplett B", ohne falsch zu rechnen):**
Alle Felder der Kategorie B sind vorhanden und optional. Jeder Faktor bekommt aber eine explizite Klassifikation — entweder er **geht in die Rechnung ein**, oder er wird als **Hinweis mit Erklärung angezeigt**, warum er nicht eingerechnet wird. Der Nutzer sieht also jeden Faktor der Konzeption samt Größenordnung, bekommt aber keine falsche Summe. Das ist didaktisch stärker als eine stillschweigend falsche Zahl.

---

## Entscheidungen (aus der Rückfrage)

| Thema | Entscheidung |
|---|---|
| Umfang | Kategorie A (Pflicht) + komplett B (optional) + C rein informativ |
| Ergebnis | Einzelwert, Bandbreite aufklappbar |
| Code | Klassische Scripts, mehrere Dateien, **kein** `type="module"` → `file://` per Doppelklick funktioniert weiterhin |
| Speichern | Opt-in per Checkbox + PDF-Export |

---

## Architektur

Namespace-Pattern statt ES-Modulen (`window.KBR = window.KBR || {}`), damit die Seite ohne lokalen Server lauffähig bleibt. Ladereihenfolge in [index.html](index.html) ist dadurch signifikant.

```
index.html
css/style.css          (bestehend, erweitern; @media print für den PDF-Export)
js/formeln.js          REE-Formelregistry
js/auswahl.js          selectREE() — Präzedenzbaum
js/modifikatoren.js    Modifikator-Katalog + Klassifikation
js/berechnung.js       Pipeline + Unsicherheitsrechnung + Plausibilitätsgrenzen
js/speicher.js         localStorage, opt-in
js/ui.js               DOM-Anbindung, progressive Disclosure, Rendering, Print
tests.html             In-Browser-Testrunner (kein npm)
```

Die bestehenden reinen Funktionen aus [js/script.js](js/script.js) (`calculateBmr`, `formatKcal`) wandern nach `formeln.js` bzw. `ui.js`; `script.js` entfällt oder wird zum reinen Init-Einstiegspunkt. Das bestehende Prinzip — **Rechenfunktionen ohne DOM-Zugriff, DOM nur in `ui.js`** — wird beibehalten und ist die Voraussetzung für `tests.html`.

### 1. Formelauswahl (`auswahl.js`)

Leitprinzip: **gemessene Datenqualität schlägt Populationszugehörigkeit.** Die FFM erklärt 60–80 % der REE-Varianz; Alter, Geschlecht und BMI sind in den anderen Formeln nur Proxys dafür. Liegt eine echte Messung vor, sind die Proxy-Korrekturen überflüssig.

```
selectREE(p) → { formel, begruendung, hinweise[], quelle }

  1. FFM gemessen (DXA/BIA/ADP — nicht geschätzt)?
       Sportler & 18–35 J → Ten-Haaf        "FFM gemessen + Validierungspopulation"
       sonst              → Cunningham      "FFM gemessen; bildet Alters- und
                                             Adipositaseffekte direkt ab"
       (Alter >65 oder BMI >=35 → Hinweis „außerhalb Validierungspopulation")
  2. Schwangerschaft/Stillzeit → Mifflin    + Hinweis „nicht an Schwangeren validiert"
  3. BMI >=30 oder <18.5       → Müller BMI-graduiert
                                             "Extremgewicht dominiert; Müller
                                              enthält Alter bereits als Term"
  4. Alter >=65                → Lührmann   "an deutschen Senioren validiert"
  5. sonst                     → Mifflin-St-Jeor
```

Damit sind die beiden Kollisionen der Konzeption aufgelöst:
- **70-jähriger Athlet mit FFM-Messung** → Cunningham. Das Alter wirkt fast ausschließlich über den FFM-Verlust; ist die FFM gemessen, ersetzt das die Altersadjustierung.
- **Adipöser Senior** → Müller BMI-graduiert. Müller enthält Alter als Term und deckt damit beide Bedingungen ab, Lührmann kennt keine Adipositas-Gradierung.

Die Begründung wird im UI ausgegeben („Verwendete Formel: Cunningham 1991 — weil …").

**Katch-McArdle-Ergänzung** (Notebook-Rückfrage): Katch-McArdle (`370 + 21,6 × FFM`) ist rechnerisch identisch mit Cunningham 1991 — eine gemeinsame Funktion, im Formel-Dropdown als „Cunningham (1991) / Katch-McArdle" bezeichnet. Zwei Eingabewege im UI führen zur selben `ffmKg`: (A) FFM direkt in kg, (B) Körpergewicht + Körperfettanteil in % → `FFM = Gewicht × (1 − KFA/100)` (reine Hilfsfunktion `ffmAusKfa` in `formeln.js`).

### 2. Modifikator-Pipeline (`berechnung.js`)

Feste Reihenfolge in vier Stufen:

1. **REE_basis** aus der Formelauswahl
2. **Multiplikativ auf REE** — Produkt der Faktoren, dann `clamp(0.80, 1.40)`
3. **PAL** = Basis-PAL + Sportzuschlag, `clamp(1.2, 2.4)`
4. **TEE** = REE_adj × PAL_adj, danach **additive** kcal-Posten
5. **Zielanpassung** zuletzt (Abnehmen/Halten/Zunehmen)

Guards gegen unplausibles Aufschaukeln:
- Gleichgerichtete Faktoren derselben Wirkachse werden **nicht multipliziert — nur der stärkste zählt** (Diät-Historie und Schlafmangel messen dasselbe Defizit).
- **PAL-Zuschlag und MET-Berechnung sind exklusiv** (Radio-Button, nicht Checkbox) — sonst wird Sport doppelt gezählt.
- Globale Plausibilitätsgrenze: `TEE ∈ [1.0 × REE_basis, 2.5 × REE_basis]`
- Zielkalorien nie unter `REE_basis` — bei Unterschreitung Warnhinweis statt Zahl.

### 3. Modifikator-Klassifikation (`modifikatoren.js`)

Jeder Eintrag trägt ein Feld `wirkung: 'ree' | 'pal' | 'tee' | 'hinweis'`.

**Gehen in die Rechnung ein:**

| Faktor | Wirkung |
|---|---|
| Basis-PAL (Beruf) | `pal` 1,2–2,4 |
| Sport (PAL-Zuschlag **oder** MET) | `pal` +0,1…+0,2 / MET × kg × h |
| Adaptive Thermogenese (Diät-Historie) | `ree` −5 bis −10 % |
| Schwangerschaft / Stillzeit | `tee` +250 / +500 kcal |
| Schilddrüsen-Diagnose (ärztlich, optional) | `ree` −10…+30 %, hinter Disclaimer |
| Beta-Blocker | `tee` −50…−100 kcal, unterhalb des Formelrauschens, aber **chronisch** (tägliche Dämpfung der adrenergen Thermogenese) → dennoch eingerechnet |
| Fieber (Körperkerntemperatur) | `ree` +10…+13 % pro 1 °C über 37 °C (z. B. 39 °C → +20…+26 %) — klinisch relevant, vom PAL nicht erfasst |

**Nur als Hinweis mit Erklärung (nicht gerechnet):**

| Faktor | Grund |
|---|---|
| TEF / Makronährstoffe | bereits in PAL und TEE-Definition enthalten |
| Schlafdauer | 24-h-REE enthält die Schlafphase bereits |
| Koffein | akuter 1–3-h-Effekt, nicht auf 24 h hochrechenbar |
| Lutealphase | temporär (~14 Tage), 40–70 kcal, gleicht sich im Monatsmittel aus, unterhalb des Formelrauschens |

**Kategorie C — reines Info-Panel** („Wann dieser Rechner nicht ausreicht"): Organgewichte/MRT-Volumetrie, Tumorkachexie, indirekte Kalorimetrie als Goldstandard; mit der Empfehlung zur klinischen Abklärung bei BMI <16 oder >40, schweren Traumata, Verbrennungen.

### 4. Unsicherheit & Bandbreite

Keine naive Min/Max-Intervallarithmetik — die multipliziert Worst Cases, die nie gemeinsam auftreten, und liefert absurd breite Bänder.

Stattdessen: Hauptwert aus dem Spannenmittel, Band über quadratische Fehlerfortpflanzung (Root-Sum-Square, mathematisch sauber für unabhängige Variablen — bestätigt via Notebook „Kalorienbedarf"). Aus jeder Spanne `[a,b]` die relative Standardunsicherheit `u = (b−a)/(2·√3)` (Gleichverteilung), dann `u_ges = √(Σ u_i²)`, Band = ±1,96 · u_ges. Dazu die **Formelunsicherheit selbst** (Mifflin SEE ≈ ±10 %) — die dominiert praktisch jede Modifikatorspanne. Ergebnis auf 50 kcal runden. **Kein harter Deckel** auf das Band (z. B. kein fixes ±15 %) — das berechnete Konfidenzintervall wird direkt ausgegeben (z. B. „2200 kcal ± 12 %"), das ist transparenter als eine künstliche Kappung.

Der aufklappbare Bereich transportiert genau diese Botschaft: *„±200 kcal Formelunsicherheit, bevor überhaupt ein Modifikator greift."* Ebenfalls dort: der Hinweis, dass der Aktivitätsgrad in Selbstauskunft systematisch überschätzt wird — der größte Fehler der Kette sitzt im PAL, nicht in den Feinmodifikatoren.

### 5. UI

- **Struktur — zwei Tabs**: **„Rechner"** (Formular + Ergebnis) und **„Methodik & Quellen"** (statisch: alle fünf REE-Formeln aus der `formeln.js`-Registry mit ihrem `quelle`-Feld — Autor, Jahr, Validierungspopulation —, direkt darunter das bisherige Kategorie-C-Info-Panel „Wann dieser Rechner nicht ausreicht"). Kein Router nötig, kein neues File: zwei `<section>`-Blöcke in `index.html`, Umschalten per `hidden`-Attribut in `ui.js`.
- **Progressive Disclosure** (im Rechner-Tab): Kategorie A immer sichtbar; B in aufklappbaren `<details>`-Blöcken („Erweiterte Angaben — nur ausfüllen, falls bekannt").
- **Ergebnis**: REE / TEE / Zielkalorien als Einzelwerte, **zusätzlich grafisch** — je Wert ein horizontaler Balken mit Marker für den Hauptwert und Schattierung für die Bandbreite (Inline-SVG oder reines CSS, **keine Chart-Bibliothek**, bleibt abhängigkeitsfrei). Direkt neben/unter dem Grundumsatz zusätzlich die Referenzwerte aus Abschnitt 6 (Fettabbau-Kalorien, Proteinbedarf Erhalt/Aufbau), gleiche Balken-Darstellung, plus die beiden statischen Hinweistexte (Sporttage, Body Recomposition). Darunter `<details>` mit dem Zahlenwert der Bandbreite, gewählter Formel + Begründung, aktiven Modifikatoren und den nicht eingerechneten Faktoren samt Grund.
- **Speichern**: Checkbox „Eingaben auf diesem Gerät speichern" (Standard: aus), `localStorage`, sichtbarer „Daten löschen"-Button.
- **PDF-Export**: `window.print()` plus `@media print`-Stylesheet mit `@page { size: A4; margin: 2cm; }` für ein sauberes DIN-A4-Layout (Formular und Tab-Navigation ausblenden, Ergebnis inkl. Grafik + Formel + Disclaimer drucken). Bewusst **keine** PDF-Bibliothek — hält die Seite abhängigkeitsfrei und offlinefähig, der Browser-Druckdialog bietet „Als PDF speichern" (rein lokal, kein Upload).
- **Disclaimer** verschärfen: Bei medizinischen Feldern (Medikation, Schilddrüse, Schwangerschaft) rückt das Tool in Richtung Gesundheitsaussage — expliziter Hinweis, dass es keine ärztliche oder ernährungstherapeutische Beratung ersetzt.

### 6. Zusätzliche Referenzwerte (Fettabbau-Kalorien & Proteinbedarf)

Werden direkt neben/unter dem Grundumsatz-Ergebnis angezeigt, unabhängig vom gewählten Ziel (Abnehmen/Halten/Zunehmen) — reine Referenzwerte, keine Rückkopplung in die REE/TEE-Pipeline.

**Kalorienbedarf für Fettabbau** (Recherche-Update: fester Wert von 300–500 kcal ist evidenzbasiert nicht konkretisierbar, da bei niedrigem TDEE zu aggressiv und bei hohem TDEE zu mild — stattdessen **prozentualer Abschlag vom TEE_adj**, das skaliert korrekt mit den individuellen Basiswerten):
- Basis: `TEE_adj` (Gesamtumsatz nach PAL, vor Zielanpassung)
- Defizit-Band: **15–20 % von TEE_adj** (moderat/nachhaltig laut Literatur), Hauptwert = Mittel (17,5 %)
- Zusätzliche Sicherheitsgrenze: absolutes Defizit auf **250–750 kcal** gedeckelt (verhindert unrealistische Werte bei sehr niedrigem/hohem TEE)
- Bestehender globaler Guard greift weiterhin: Ergebnis nie unter `REE_basis`
- Anzeige wie REE/TEE: Balken mit Band (0,80–0,85 × TEE_adj)

**Proteinbedarf für Muskelerhalt**: **1,2–1,6 g/kg Körpergewicht/Tag** (validiert; Spanne ggü. Vorschlag leicht erweitert — Meta-Analysen zu Proteinbedarf im hypokalorischen Defizit nennen diese Range für die allgemeine/übergewichtige Population). Balken mit Band, Basis = Körpergewicht aus Kategorie A.

**Proteinbedarf für Muskelaufbau**: **1,6–2,0 g/kg Körpergewicht/Tag** (validiert, deckt sich mit ISSN Position Stand 2017: 1,4–2,0 g/kg für die meisten Trainierenden). Balken mit Band, Basis = Körpergewicht aus Kategorie A.

**Statische Hinweise** (im Ergebnisbereich, nicht als Rechenfaktor):
1. *Sporttage*: „Die errechneten Werte sind Basiswerte — Sporteinheiten (insb. Cardio/HIIT) steigern den kurzfristigen Kalorienumsatz. An Tagen mit hartem Training sollten daher zusätzliche Kalorien vorgesehen werden, um nicht zu tief in das Kaloriendefizit abzurutschen."
2. *Body Recomposition*: „Um gleichzeitig Körperfett abzubauen und Muskeln aufzubauen, ist neben ausreichend Protein insbesondere Krafttraining notwendig. Eine mittelfristige Steigerung der Muskelmasse erhöht zudem den Grundumsatz — die Kalkulation sollte daher regelmäßig aktualisiert werden."

Quellen (auch im Methodik-Tab, Abschnitt 5): ISSN Position Stand Protein & Exercise (2017); Meta-Analysen zu Proteinbedarf im Kaloriendefizit; TDEE-prozentuale Defizit-Empfehlungen statt fixer kcal-Werte.

### 7. Design (Farben & Typografie)

- **Farbpalette** als CSS-Custom-Properties in `css/style.css` (dort bereits laut [CLAUDE.md](CLAUDE.md) vorgesehen — bestehende Werte werden ersetzt, keine neue Architektur nötig):
  - `--color-bg: #F9F5EC` — Hintergrund
  - `--color-text: #1B2835` — Fließtext
  - `--color-accent: #23643F` — Hervorhebung: Buttons, aktiver Tab, gewählte Formel, aktive Modifikatoren
  - `--color-signal: #A12F2F` — Signalfarbe: Plausibilitäts-/Warnhinweise, Fieber-Hinweis, Disclaimer bei medizinischen Feldern
- **Schrift**: `font-family: Roboto, -apple-system, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif;` — Roboto vorn, aber **keine** Web-Font-Datei oder CDN (Projekt-Constraint „keine externen Requests"). Rendert nur, wenn lokal installiert (z. B. via Android/Chrome OS, Google-Software); sonst greift automatisch der System-Fallback (Segoe UI unter Windows). Kein Ladefehler, kein Unterschied im Verhalten — rein progressive enhancement.
- **Moderne Elemente**: abgerundete Ecken, Formularabschnitte und Ergebnis als klar abgegrenzte Karten, großzügiger Weißraum, dezente Schatten/Trennlinien statt harter Rahmen. Bandbreiten-Grafik und Tab-Navigation (Abschnitt 5) nutzen dieselbe Palette — Marker/Balken in `--color-accent`, Warnzustände (Plausibilitätsgrenze über-/unterschritten) in `--color-signal`.

---

## Umsetzungsreihenfolge

1. `formeln.js` — alle fünf REE-Formeln als reine Funktionen + Quellenangaben
2. `auswahl.js` — Präzedenzbaum inkl. `begruendung` und `hinweise[]`
3. `modifikatoren.js` — Katalog mit `wirkung`-Klassifikation
4. `berechnung.js` — Pipeline, Guards, Fehlerfortpflanzung
5. `tests.html` — Tests für 1–4, **bevor** das UI gebaut wird
6. `index.html` + `ui.js` — Formular, Disclosure, Ergebnis-Rendering
7. `speicher.js` + Print-Stylesheet
8. [CLAUDE.md](CLAUDE.md) und [README.md](README.md) auf die neue Struktur aktualisieren

## Verifikation

- **`tests.html` im Browser öffnen** (läuft ohne npm, ohne Server): Referenzwerte gegen von Hand gerechnete Mifflin-/Cunningham-Ergebnisse; Kollisionsfälle des Auswahlbaums (70-jähriger Athlet mit FFM → Cunningham; adipöser Senior → Müller); Clamp-Grenzen; Nachweis, dass PAL-Zuschlag und MET sich gegenseitig ausschließen.
- **`index.html` per Doppelklick öffnen** — muss ohne lokalen Server funktionieren (das ist der Grund für die klassischen Scripts; ein `type="module"` würde hier an CORS scheitern).
- Durchklicken: leeres Formular, nur Kategorie A, A+B vollständig, Extremwerte (BMI 15 / BMI 45) → Plausibilitätsgrenzen und Hinweise greifen.
- Speichern-Checkbox an/aus, Reload, „Daten löschen"; Druckvorschau auf sauberes DIN-A4-Layout prüfen (kein Formular/Tab-Nav auf dem Ausdruck, Grafik bleibt lesbar).
- Tab-Umschaltung „Rechner" ↔ „Methodik & Quellen" prüfen; alle fünf Formelquellen dort vollständig und korrekt angezeigt.
- Balkengrafik der Bandbreite bei sehr kleinem und sehr großem Band (z. B. nur Kategorie A vs. Kategorie A+B voll ausgefüllt) auf Lesbarkeit prüfen.
- Fettabbau-Kalorien und Proteinbedarf (Erhalt/Aufbau) bei Extremwerten (sehr niedriges/hohes TEE bzw. Körpergewicht) auf plausible, gedeckelte Werte prüfen; Guard „nie unter REE_basis" greift auch hier.
