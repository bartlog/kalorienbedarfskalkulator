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

**Nächster Schritt:** Beim Nutzer nachfragen, ob der aktualisierte Plan in [PLAN.md](PLAN.md) jetzt freigegeben ist, dann mit der Umsetzungsreihenfolge aus dem Plan beginnen (`formeln.js` → `auswahl.js` → `modifikatoren.js` → `berechnung.js` → `tests.html` → UI).

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
