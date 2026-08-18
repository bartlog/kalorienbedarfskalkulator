window.KBR = window.KBR || {};

/*
 * localStorage-Persistenz, rein opt-in (Checkbox "Eingaben speichern").
 * Speichert nur rohe Formularwerte, keine Berechnungsergebnisse.
 */
window.KBR.speicher = (function () {
  "use strict";

  const KEY = "kbr:eingaben:v1";

  function speichern(daten) {
    try {
      localStorage.setItem(KEY, JSON.stringify(daten));
    } catch (e) {
      // localStorage nicht verfügbar (z. B. privater Modus) — stiller Fallback, keine Kernfunktion betroffen
    }
  }

  function laden() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function loeschen() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      // ignorieren
    }
  }

  return { speichern, laden, loeschen };
})();
