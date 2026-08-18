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

Lokales Git-Repository wurde initialisiert und der komplette Stand committed (`git log` zeigt einen Commit „Ausbau zum evidenzbasierten Kalorienbedarfsrechner"). **Noch offen:** Verbindung zu einem GitHub-Remote — Nutzer legt ein leeres Repository an (ohne README/.gitignore), dann `git remote add origin <URL>` + Push (nach Freigabe), danach GitHub Pages unter Settings → Pages auf `main`/root einstellen.

**Nächster Schritt:** Auf die GitHub-Repo-URL vom Nutzer warten, dann Remote verbinden und (nach Rückfrage) pushen.

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
