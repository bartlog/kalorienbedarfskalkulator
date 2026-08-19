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
