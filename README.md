# Kalorienbedarfsrechner

Ein rein clientseitiger Rechner für Kalorien- und Proteinbedarf.
Keine Server, keine Datenübertragung – alle Eingaben und Berechnungen laufen
ausschließlich lokal im Browser.

## Nutzung

Einfach [index.html](index.html) per Doppelklick im Browser öffnen (funktioniert
auch offline, kein Server nötig), oder die gehostete GitHub-Pages-Version aufrufen.

Tests: [tests.html](tests.html) ebenfalls per Doppelklick öffnen — läuft komplett
im Browser, kein npm nötig.

## Berechnung

- **Formelauswahl:** ein Präzedenzbaum wählt je nach verfügbaren Angaben zwischen
  fünf REE-Formeln (Mifflin-St-Jeor, Cunningham 1991 / Katch-McArdle, Ten Haaf &
  Weijs, Müller BMI-graduiert, Lührmann) — Details und Quellen im „Methodik &
  Quellen"-Tab der App.
- **Modifikatoren:** optionale Zusatzangaben (Diät-Historie, Schilddrüse,
  Beta-Blocker, Fieber, Sport) fließen kontrolliert in REE/PAL/TEE ein; Faktoren,
  die bewusst nicht eingerechnet werden (TEF, Schlafdauer, Koffein, Lutealphase),
  werden mit Begründung angezeigt statt stillschweigend wegzulassen.
- **Zusätzliche Referenzwerte:** Kalorienbedarf für Fettabbau und Proteinbedarf
  (Muskelerhalt/-aufbau) neben dem Hauptergebnis.
- **Unsicherheitsband:** Root-Sum-Square-Kombination der Modifikator-Spannen plus
  Formelunsicherheit, als Zahlenwert und Balkengrafik.
- **PDF-Export:** Browser-Druckdialog mit DIN-A4-Layout, keine PDF-Bibliothek.

Details zur fachlichen Herleitung: [PLAN.md](PLAN.md).

## Architektur

Klassische Mehrdatei-Scripts ohne `type="module"`, damit `file://` per
Doppelklick funktioniert. Siehe [CLAUDE.md](CLAUDE.md) für die Dateiübersicht.

## Hosting

Statische Seite, geeignet für GitHub Pages: einfach den Inhalt dieses
Repositories auf dem `main`-Branch veröffentlichen – kein Build-Schritt nötig.
