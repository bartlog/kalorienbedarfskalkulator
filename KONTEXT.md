# Kontext für neue Chats

Diese Datei zuerst lesen, um den aktuellen Stand und die nächsten Schritte zu kennen.

## 1. Kalorienbedarfsrechner — Ausbau

**Status: Fachliche Fragen geklärt, Plan aktualisiert — Freigabe zur Umsetzung steht noch aus.**

Der vollständige Implementierungsplan liegt in [PLAN.md](PLAN.md). Kurzfassung:

- Ausgangslage: minimaler Prototyp im Projekt ([index.html](index.html), [css/style.css](css/style.css), [js/script.js](js/script.js)) — Mifflin-St-Jeor + PAL-Select + Ziel-Anpassung.
- Der Nutzer hat mit Gemini eine deutlich umfangreichere Spreadsheet-Konzeption vorgedacht (Formelauswahl-Entscheidungsbaum: Cunningham/Ten-Haaf bei gemessener FFM, Lührmann bei Alter ≥65, Müller BMI-graduiert bei Adipositas, Mifflin-St-Jeor als Standard; dazu diverse Modifikatoren wie Fieber, Beta-Blocker, Zyklus, Koffein, Schlaf, TEF etc.).
- Diese Konzeption wurde geprüft und **fachlich korrigiert**, die Korrektur wurde anschließend gegen das Notebook „Kalorienbedarf" verifiziert (manuell durch den Nutzer gestellt, siehe Abschnitt 2). Ergebnis:
  - TEF, Schlafdauer, Koffein und Lutealphase fließen **nicht additiv** ein (Doppelzählung bzw. unterhalb der Formelunsicherheit ±10 % / ±200 kcal).
  - **Fieber ist die Ausnahme** — das war ein Fehler in der ursprünglichen Korrektur: Fieber steigert den REE akut um 10–13 %/°C über 37 °C (klinisch relevant) und wird daher doch eingerechnet.
  - Beta-Blocker wird trotz kleiner Größenordnung eingerechnet, weil er **chronisch** wirkt (Kriterium: Chronizität, nicht nur kcal-Spanne) — Lutealphase nicht, weil temporär.
  - Formelauswahl Ten-Haaf (18–35 J., Freizeitsportler) vs. Cunningham (sonst, bei gemessener FFM) ist durch die Validierungsstudien gedeckt.
  - Unsicherheitsband: Root-Sum-Square-Methode bestätigt, aber **kein harter ±15 %-Deckel** mehr — Band wird direkt als berechnetes Konfidenzintervall ausgegeben.
  - Plausibilitätsgrenze TEE ≤ 2,5 × REE_basis ist physiologisch korrekt so bestätigt.
  - Details stehen im Plan unter „⚠️ Fachliche Korrektur an der Konzeption".
- Entscheidungen des Nutzers: Kategorie A (Pflicht) + komplett B (optional) + C (rein informativ); Ergebnis als Einzelwert mit aufklappbarer Bandbreite; klassische Mehrdatei-Scripts ohne ES-Module (damit `file://` per Doppelklick weiter funktioniert); Speichern optional per Checkbox + PDF-Export.

**Status: Umsetzung abgeschlossen und im Browser verifiziert (Playwright, lokal in Scratchpad installiert).**

Alle Schritte der Umsetzungsreihenfolge aus [PLAN.md](PLAN.md) sind fertig: `formeln.js`, `auswahl.js`, `modifikatoren.js`, `berechnung.js`, `tests.html` (35/35 Tests grün), `index.html`/`ui.js` (Tabs, Progressive Disclosure, Balkengrafiken), `speicher.js`, Doku-Update (CLAUDE.md/README.md). `js/script.js` (alter Prototyp) wurde entfernt.

Nachträge während der Umsetzung (Notebook-Rückfragen des Nutzers):
- Katch-McArdle ist rechnerisch identisch mit Cunningham 1991 — eine gemeinsame Funktion, Formel-Label „Cunningham (1991) / Katch-McArdle", zwei FFM-Eingabewege (direkt oder über Körperfettanteil).
- Proteinbedarf bei BMI ≥30: Referenzgewicht wechselt von Gesamtgewicht auf FFM, falls bekannt (vermeidet Überschätzung bei starker Adipositas).
- Beta-Blocker-Wirkung auf TEE-Ebene (nicht REE) bestätigt; Achsen-Guard für gleichgerichtete REE-Faktoren bestätigt.

**Wichtiger Befund während der Implementierung:** Web-Recherche/-Fetch lieferte für Ten-Haaf/Müller/Lührmann keine verlässlichen Koeffizienten (PDF-Extraktion ergab z. B. negativen Ruheumsatz). Die tatsächlich verwendeten Formeln stammen aus der Gemini-Konzeption des Nutzers, nicht aus eigener Web-Recherche — siehe CLAUDE.md-Hinweis dazu.

**CSS-Bug gefunden und gefixt:** `[hidden]`-Attribut wurde von `.field { display: flex }` überstimmt (gleiche Spezifität, Cascade-Reihenfolge) — dadurch waren Ergebnis-Sektion und alle bedingten Unterfelder immer sichtbar, unabhängig vom JS-Zustand. Fix: `[hidden] { display: none !important; }` in `css/style.css`. Vor dem Fix per Playwright-Screenshot entdeckt.

**Status: live auf GitHub Pages** unter `https://bartlog.github.io/kalorienbedarfskalkulator/` (Repo: `https://github.com/bartlog/kalorienbedarfskalkulator`). Remote verbunden, mehrere Push-Runden seit Live-Gang: PDF-Export-Ränder gefixt (`@page margin:0` + `.card{padding:2cm}` statt `@page margin`, da browserabhängig unzuverlässig), Dateinamensvorschlag beim PDF-Export, `<fieldset>`-`min-width:min-content`-Layoutbug gefixt, Favicon eingebunden, diverse Textkorrekturen (Terminologie „Grundumsatz", Proteinbedarf-Labels).

**2026-08-18 — zwei weitere Tabs ergänzt:**
- **„Über"** (statischer Text: Open-Source-Hinweis + GitHub-Link, wissenschaftliche Grundlage + Haftungsausschluss, Autor Heiko Bartlog/bartlog.de, Tools Gemini + Claude Code).
- **„Tipps"** (rechtsbündig via `margin-left:auto` auf dem Tab-Button, siehe CLAUDE.md): 5 aufklappbare, nach Stufe/Phase filterbare Tabellen mit Body-Recomposition-Empfehlungen (Hebel, Lebensmittel, Restaurant-Verhalten, Sport, Supplemente). Daten kommen aus `js/tipps-daten.js`, einem manuell aktualisierten Snapshot eines privaten Google-Sheets des Nutzers — Update-Workflow und fileId stehen im globalen Memory (`reference_tipps_spreadsheet`), nicht im Repo, da das Sheet nicht öffentlich ist.

Tests: `tests.html` zeigt aktuell 40/40 grün.

**2026-08-18 — komplette App zweisprachig (DE/EN):** Sprachumschalter oben rechts im Header (Buttons „DE"/„EN", `localStorage`-persistiert, `kbr:sprache`). Neues `js/i18n.js` als zentrales Übersetzungsmodul; `index.html` über `data-i18n`-Attribute angebunden, dynamisch erzeugte Texte (Formelauswahl-Begründung, aktive Modifikatoren, Ziel-Warnungen) wurden dafür in `auswahl.js`/`berechnung.js` sprachneutral gemacht (IDs/Rohwerte statt fertiger Sätze — `ui.js` formatiert). Der komplette Tipps-Tab (106 Zeilen) ist ebenfalls übersetzt — Nutzerentscheidung explizit für volle Abdeckung trotz höherem Pflegeaufwand (siehe Memory `feedback_komplette_app_uebersetzen`); künftige Sheet-Updates brauchen daher immer auch eine EN-Übersetzung der neuen/geänderten Zeile (siehe Memory `reference_tipps_spreadsheet`). Details zur Architektur (welche Datei was sprachneutral hält) stehen in CLAUDE.md.

CSS-Bug dabei gefunden und gefixt: `<h1>` ist selbst ein Flex-Container ohne `min-width:0` und sprengte bei langen englischen Titeln auf schmalen Viewports die Kopfzeile — gleiches Muster wie der frühere `<fieldset>`-Bug.

**2026-08-19 — fachliche Korrektur: Müller-Untergewicht-Stufe entfernt.** Nutzer-Testfall (40J/165cm/50kg weiblich, BMI 18,37) lieferte 820 kcal Grundumsatz (Mifflin zum Vergleich: 1170 kcal) — von Gemini als unplausibel gemeldet und von mir unabhängig nachgerechnet, bestätigt. Eigene Zusatzprüfung ging über Geminis Diagnose hinaus: Müllers Adipositas-Stufe (BMI≥30) weicht an ihrer Grenze nur ~2 % von Mifflin ab, die Untergewicht-Stufe aber über die gesamte Spanne 35–70 % — Hinweis auf einen Transkriptionsfehler in den Untergewicht-Koeffizienten, nicht auf eine erwartbare Formeleigenschaft. Nutzerentscheidung (statt Geminis Vorschlag, nur die Schwelle auf BMI<16 zu verengen): Untergewicht-Stufe komplett entfernt, BMI<18,5 fällt jetzt durch auf Lührmann (Senior) bzw. Mifflin (Standard); Müller wird nur noch für Adipositas verwendet. Details/Zahlen in PLAN.md und CLAUDE.md. `formeln.js`/`auswahl.js`/`tests.html` angepasst, 41/41 Tests grün (ein Test umbenannt, einer neu für „untergewichtiger Senior → Lührmann").

**2026-08-19 — PDF-Export: leere zweite Seite gefixt + Eingaben-Seite ergänzt.** Ursache des Bugs: Disclaimer-Absatz überlief bei aktiven Modifikatoren knapp (~35-40px) auf eine fast leere zweite Seite — Print-Spacing verkleinert, damit Ergebnis+Disclaimer zuverlässig auf eine Seite passen. Neu: zweite (ggf. dritte bei vielen MET-Zeilen) Druckseite mit allen eingegebenen Werten als Klartext, nur im PDF sichtbar. Verifiziert per Playwright+pdfjs-dist über 5 Szenarien (Details siehe Commit `3afd9d0`).

**2026-08-19 (Fortsetzung) — Soft Boundaries, Validierungs-Guards, BMI-Anzeige.** 5-Punkte-Auftrag erhalten (Formelauswahl/Validierung/UI überarbeiten):
- **Punkt 1** (Müller-Untergewicht entfernen) war bereits erledigt (siehe oben) — neu ergänzt: BMI-Übergangszone (29,0–31,0) zeigt jetzt Mifflin- und Müller-Wert nebeneinander mit Erklärtext.
- **Punkt 2** (Ten-Haaf cm→m-Konvertierung) **nicht umgesetzt** — Codeprüfung zeigt, dass `tenHaaf()` nie eine Körpergröße entgegennimmt (reine FFM-Formel). Die im Auftrag beschriebene "gewichtsbasierte Ten-Haaf-Formel mit Körpergröße in Metern" existiert in dieser Codebase nicht; vermutlich Verwechslung mit einer anderen Formelvariante. Details in CLAUDE.md.
- **Punkt 3** (Alters-Übergangszone 60–69): analog zu Punkt 1, Mifflin vs. Lührmann nebeneinander.
- **Punkt 4** (FFM/KFA-Plausibilität) und **Punkt 5** (Fieber-Clamp + Fahrenheit-Erkennung): neue `validiereEingabe()` in ui.js, blockiert die Berechnung bei KFA außerhalb 3–60 %, FFM ≥ Gesamtgewicht, oder Fieber-Temperatur außerhalb 35–42 °C (mit gesonderter Meldung bei >45 °C als vermutlicher Fahrenheit-Fehleingabe).
- **Nachtrag:** BMI wird jetzt immer im Ergebnisbereich (Web + PDF) angezeigt.

Architektur: `auswahl.js` liefert bei Soft-Boundary-Fällen zusätzlich `vergleich`/`softBoundary` (rein informativ, beeinflusst nicht die Pipeline — bei Überlappung beider Zonen hat BMI Vorrang, dieselbe Priorisierung wie im Baum). Neue Tests in tests.html (59/59 grün).

**PDF-Pagination erneut geprüft und nachgebessert:** Der neue Soft-Boundary-Block ließ den Disclaimer wieder auf eine fast leere Seite überlaufen — Print-Spacing weiter verkleinert (`.result`-Gap 0.65rem→0.5rem, `.soft-boundary-hinweis` eigene Print-Regeln), bis alle Testfälle (Basis, Alters-/BMI-Soft-Boundary, Extremfall mit beiden Zonen + allen Modifikatoren) sauber bei 2 Seiten liegen. Wichtige Lektion dabei (siehe CLAUDE.md): `scrollHeight` unter `emulateMedia('print')` sagt die tatsächliche `page.pdf()`-Paginierung nicht zuverlässig voraus — musste zweimal per echtem PDF+pdfjs-dist nachgemessen werden, bevor der Fix wirklich saß.

**2026-08-19 (Fortsetzung 2) — NEAT/Sport-PAL-Trennung, Gewichtsstillstand-Panel, PDF-Footer.** Auslöser: Beta-Testerin-Feedback, dass NEAT (Alltagsbewegung) und Sport im alten `#activity`-Dropdown vermengt waren ("Mäßig aktiv = Alltag + 3–5× Sport/Woche") und dadurch zwei Wochen mit ähnlichem Gesamtverbrauch (viel Sport/wenig Alltag vs. wenig Sport/viel Alltag) unterschiedliche Bedarfswerte lieferten.

- **Architektur-Umbau (nach mehreren Rückfragen):** `#activity` (5 Optionen, 1,2–1,9, Sport-vermischt) ersetzt durch zwei unabhängige Dropdowns in Kategorie A: **NEAT** (Schrittzahl-Stufen mit Berufs-Beispielen in Klammern als Orientierung, liefert direkt einen PAL-*Bereich* pro Stufe: <5.000→1,2–1,3, 5.000–10.000→1,4–1,5, 10.000–15.000→1,6–1,7, >15.000→1,8–2,0) und **Sport** (Häufigkeits-Stufen, additiver Zuschlag: Kein Sport +0,00 … Leistungssport +0,40). Die bestehende MET-Berechnung (Kategorie B) ersetzt weiterhin nur den Sport-Zuschlag, nie NEAT — der alte Override-Mechanismus (`#activity` bei MET auf "Sitzend" zwingen) wurde auf `#sportHaeufigkeit` umgehängt statt entfernt. Neuer, unabhängiger **Fidgeting**-Zuschlag (Checkbox, +0,05 bis +0,10) ergänzt.
- **Doppelzählungs-Lücke nachträglich geschlossen:** Nutzer wies darauf hin, dass die Schrittzahl (inkl. Joggen/Gehsport) UND eine separat gewählte Sport-Häufigkeit für dieselbe Lauf-/Gehsport-Einheit doppelt zählen können. Lösung bewusst ohne neue Rechenmechanik (keine Abzugs-Daumenregel): Sport-Dropdown und MET-Liste tragen jetzt auffällige `.disclaimer-inline`-Warnhinweise, dass sie nur für **schrittneutralen** Sport gedacht sind (Rad, Schwimmen, Kraft, Yoga) — Lauf-/Gehsport ist über die Schrittzahl bereits abgedeckt. Restüberschneidung bei Ballsport bewusst als dokumentierte Ungenauigkeit akzeptiert.
- **Obere PAL-Klammer 1,2–2,4 → 1,2–2,6 angehoben** (NEAT-Max 2,0 + Sport-Max 0,4 + Fidgeting-Max 0,1 = 2,5, würde bei 2,4 fälschlich gekappt). Neuer, nicht-blockierender Hinweis ab PAL ≥2,4 (Regeneration/Erholung) — Nutzeridee, dass die höhere technische Klammer nicht mit der physiologischen Belastungsgrenze verwechselt werden sollte.
- **Gewichtsstillstand-Info-Panel** im Ergebnisbereich ergänzt (`<details>`, standardmäßig zugeklappt, unterhalb der Referenzwerte): adaptive Thermogenese, hormonelle Faktoren, Plateau-Checkliste für den Arztbesuch. Zahlen bewusst konsistent mit bereits im Code etablierten Werten (5–10 % Thermogenese, 15–20 % Zieldefizit) — die vom Nutzer vorgeschlagene, unverifizierte Hypothyreose-Prozentzahl (-5 % bis -15 %) wurde auf dessen eigene Entscheidung hin **nicht** übernommen (Mechanismus-Erklärung ohne Zahl stattdessen), da sie anders als die übrigen Formelkoeffizienten in diesem Projekt nie gegengeprüft wurde.
- **PDF-Footer:** neues optionales Freitext-Feld (max. 20 Zeichen) über dem Druck-Button, erscheint zusammen mit dem Datum zentriert/linksbündig in einer `position:fixed`-Fußzeile auf jeder gedruckten Seite. **Keine Seitenzahl** ("Seite X von Y") — Nutzerentscheidung, nachdem klar wurde, dass Chromiums Druck-Pipeline `@page`-Randboxen/`counter(page)` nicht unterstützt und eine echte Zählung eine PDF-Bibliothek erfordert hätte (Verstoß gegen die Keine-Dependencies-Regel).
- **Ein echter Implementierungsfehler unterwegs gefunden und behoben:** die CSS-Regeln für das Footer-Element und das Ausblenden des Eingabefelds im Druck waren im Plan beschrieben, aber beim Umsetzen zunächst vergessen — erst der Playwright+pdfjs-dist-Check (Footer-Text fehlte auf den Seiten, Feld-Label leakte stattdessen in den Seiteninhalt) deckte es auf. Lehre: bei mehrteiligen Plänen mit Datei-für-Datei-Abschnitten jede referenzierte Datei tatsächlich abhaken, nicht nur die Dateien mit dem meisten Änderungsvolumen.
- Migration: `eingabe.basisPAL` entfällt vollständig (ersetzt durch `neatSchritteId`/`sport.haeufigkeitId`), betrifft auch alle `tests.html`-Fixtures. Tests: 90/90 grün. Verifiziert per Playwright: Formularverhalten (Defaults, MET-Override-Zielwechsel, Speichern/Laden-Rundlauf), Sprachumschaltung, und PDF-Export (Footer auf jeder Seite, keine leeren/fast-leeren Seiten im Stresstest mit BMI-Soft-Boundary + allen Modifikatoren + Fidgeting).

## 2. notebooklm MCP-Server

**Status: wieder entfernt (`claude mcp remove notebooklm`) — Login funktionierte nicht zuverlässig.**

- War registriert per `claude mcp add notebooklm -- npx notebooklm-mcp@latest` (lokal, `.claude.json`, Projekt-Scope). Quelle: [PleasePrompto/notebooklm-mcp](https://github.com/PleasePrompto/notebooklm-mcp) — Drittanbieter-npm-Paket.
- Die Tools waren in einer neuen Session sichtbar (das frühere `ToolSearch`-Problem trat nicht mehr auf), `setup_auth` öffnete zuverlässig ein Browserfenster.
- **Login schlug trotzdem wiederholt fehl:** Nutzer konnte sich im Fenster anmelden und NotebookLM sehen, aber `get_health` meldete danach weiterhin `authenticated: false` — auch nach `cleanup_data(confirm=true, preserve_library=true)` (Browser-Profil-Reset) und erhöhtem `timeout_ms`.
- **Vermutete Ursache:** Google hat NotebookLM in Gemini eingegliedert; das Drittanbieter-Paket erkennt vermutlich die neue UI/URL-Struktur nicht mehr (Cookie-/Selector-Logik veraltet). Nicht verifiziert, nur Verdacht des Nutzers — plausibel, da Anmeldung selbst sichtbar funktionierte.
- Als Workaround wurden die offenen fachlichen Fragen zum Rechner (siehe Abschnitt 1) manuell für das Notebook "Kalorienbedarf" formuliert; der Nutzer stellt sie von Hand und gibt die Antworten im Chat zurück.

**Nächster Schritt:** Kein aktiver — falls der MCP-Server später erneut gebraucht wird, zuerst prüfen, ob es ein Update des `notebooklm-mcp`-Pakets gibt, das die Gemini-Umstellung berücksichtigt, bevor erneut `claude mcp add` versucht wird.

## 3. Arbeitsweise für dieses Projekt

- Pläne und Arbeits-/Kontextdokumente werden **im Projektverzeichnis** abgelegt (nicht nur im globalen `~/.claude/plans`-Ordner), damit ein neuer Chat sie direkt lesen kann, wenn der Nutzer ihn darauf hinweist.
