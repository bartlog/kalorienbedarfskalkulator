(function () {
  "use strict";

  const { berechne } = window.KBR.berechnung;
  const { REGISTRY } = window.KBR.formeln;
  const { HINWEISE, MET_AKTIVITAETEN, MET_QUELLE } = window.KBR.modifikatoren;
  const { ffmAusKfa } = window.KBR.formeln;
  const speicher = window.KBR.speicher;

  function formatKcal(value) {
    return `${Math.round(value).toLocaleString("de-DE")} kcal`;
  }

  function formatGramm(value) {
    return `${Math.round(value).toLocaleString("de-DE")} g`;
  }

  function el(id) {
    return document.getElementById(id);
  }

  // ---- Tabs ---------------------------------------------------------------

  function initTabs() {
    const tabs = [
      { btn: el("tab-btn-rechner"), panel: el("tab-rechner") },
      { btn: el("tab-btn-methodik"), panel: el("tab-methodik") },
    ];
    tabs.forEach(({ btn, panel }) => {
      btn.addEventListener("click", () => {
        tabs.forEach((t) => {
          t.panel.hidden = t.panel !== panel;
          t.btn.classList.toggle("is-active", t.btn === btn);
          t.btn.setAttribute("aria-selected", String(t.btn === btn));
        });
      });
    });
  }

  // ---- Progressive Disclosure innerhalb Kategorie B ------------------------

  // Bei genauer MET-Berechnung ersetzt das Training die Aktivitätslevel-Schätzung
  // oben (statt sie zu ergänzen) — daher wird das Feld auf "Sitzend" fixiert und
  // deaktiviert, damit nicht doppelt gezählt wird. Vorheriger Wert wird für den
  // Fall gemerkt, dass der Nutzer wieder auf "Keine genaueren Angaben" wechselt.
  function anwendenMetUeberschreibung(istMet) {
    const activitySelect = el("activity");
    const hinweis = el("hinweis-met-override");
    if (istMet) {
      if (activitySelect.dataset.vorherigerWert === undefined) {
        activitySelect.dataset.vorherigerWert = activitySelect.value;
      }
      activitySelect.value = "1.2";
      activitySelect.disabled = true;
      hinweis.hidden = false;
    } else {
      activitySelect.disabled = false;
      if (activitySelect.dataset.vorherigerWert !== undefined) {
        activitySelect.value = activitySelect.dataset.vorherigerWert;
        delete activitySelect.dataset.vorherigerWert;
      }
      hinweis.hidden = true;
    }
  }

  function aktualisiereSchwangerschaftSichtbarkeit() {
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const feld = el("feld-schwangerschaft");
    feld.hidden = gender === "male";
    if (feld.hidden) {
      el("schwangerschaftStillzeit").value = "";
    }
  }

  function initConditionalFields() {
    const ffmRadios = document.querySelectorAll('input[name="ffmModus"]');
    const feldDirekt = el("feld-ffm-direkt");
    const feldKfa = el("feld-ffm-kfa");
    const feldSportler = el("feld-ist-sportler");
    ffmRadios.forEach((r) =>
      r.addEventListener("change", () => {
        const modus = document.querySelector('input[name="ffmModus"]:checked').value;
        feldDirekt.hidden = modus !== "direkt";
        feldKfa.hidden = modus !== "kfa";
        feldSportler.hidden = modus === "keine";
      })
    );

    const sportRadios = document.querySelectorAll('input[name="sportModus"]');
    const feldMet = el("feld-met");
    sportRadios.forEach((r) =>
      r.addEventListener("change", () => {
        const istMet = document.querySelector('input[name="sportModus"]:checked').value === "met";
        feldMet.hidden = !istMet;
        anwendenMetUeberschreibung(istMet);
      })
    );

    document
      .querySelectorAll('input[name="gender"]')
      .forEach((r) => r.addEventListener("change", aktualisiereSchwangerschaftSichtbarkeit));
    aktualisiereSchwangerschaftSichtbarkeit();

    el("schilddruseAktiv").addEventListener("change", (e) => {
      el("feld-schilddruse").hidden = !e.target.checked;
    });

    el("fieberAktiv").addEventListener("change", (e) => {
      el("feld-fieber").hidden = !e.target.checked;
    });
  }

  // ---- Statische Listen (Hinweise, Formelquellen) --------------------------

  // ---- MET-Aktivitätsliste (dynamisch, Kategorie B) ------------------------

  function metAktivitaetOptionsHtml() {
    const kategorien = [...new Set(MET_AKTIVITAETEN.map((a) => a.kategorie))];
    const optgroups = kategorien
      .map((kat) => {
        const options = MET_AKTIVITAETEN.filter((a) => a.kategorie === kat)
          .map((a) => `<option value="${a.id}">${a.label} (${a.met.toFixed(1).replace(".", ",")} MET)</option>`)
          .join("");
        return `<optgroup label="${kat}">${options}</optgroup>`;
      })
      .join("");
    return `<option value="">– Aktivität wählen –</option>${optgroups}<option value="sonstige">Sonstige (MET manuell)</option>`;
  }

  function neueMetZeile() {
    const row = document.createElement("div");
    row.className = "met-zeile";
    row.innerHTML = `
      <select class="met-aktivitaet" aria-label="Aktivität">${metAktivitaetOptionsHtml()}</select>
      <input type="number" class="met-manuell" placeholder="MET-Wert" min="1" max="20" step="0.1" hidden aria-label="MET-Wert manuell">
      <input type="number" class="met-stunden" placeholder="Std/Woche" min="0.25" max="30" step="0.25" aria-label="Stunden pro Woche">
      <button type="button" class="met-entfernen" aria-label="Zeile entfernen">×</button>
    `;
    const select = row.querySelector(".met-aktivitaet");
    const manuell = row.querySelector(".met-manuell");
    select.addEventListener("change", () => {
      manuell.hidden = select.value !== "sonstige";
      const liste = el("met-liste");
      if (row === liste.lastElementChild && select.value !== "") {
        liste.appendChild(neueMetZeile());
      }
    });
    row.querySelector(".met-entfernen").addEventListener("click", () => {
      const liste = el("met-liste");
      row.remove();
      if (!liste.children.length) {
        liste.appendChild(neueMetZeile());
      }
    });
    return row;
  }

  function initMetListe() {
    el("met-liste").appendChild(neueMetZeile());
  }

  function leseMetZeilen() {
    return Array.from(document.querySelectorAll("#met-liste .met-zeile"))
      .map((row) => {
        const select = row.querySelector(".met-aktivitaet");
        const manuell = row.querySelector(".met-manuell");
        const stunden = row.querySelector(".met-stunden");
        const aktivitaet = MET_AKTIVITAETEN.find((a) => a.id === select.value);
        const metWert = select.value === "sonstige" ? Number(manuell.value) : aktivitaet ? aktivitaet.met : NaN;
        const label = select.value === "sonstige" ? "Sonstige Aktivität" : aktivitaet ? aktivitaet.label : "";
        return { metWert, stundenProWoche: Number(stunden.value) || 0, label };
      })
      .filter((z) => z.metWert > 1 && z.stundenProWoche > 0);
  }

  function leseMetZeilenRoh() {
    return Array.from(document.querySelectorAll("#met-liste .met-zeile")).map((row) => ({
      auswahl: row.querySelector(".met-aktivitaet").value,
      manuellWert: row.querySelector(".met-manuell").value,
      stunden: row.querySelector(".met-stunden").value,
    }));
  }

  function stelleMetZeilenWieder(zeilenDaten) {
    const liste = el("met-liste");
    liste.innerHTML = "";
    (zeilenDaten || []).forEach((z) => {
      const row = neueMetZeile();
      liste.appendChild(row);
      const select = row.querySelector(".met-aktivitaet");
      select.value = z.auswahl || "";
      const manuell = row.querySelector(".met-manuell");
      manuell.hidden = select.value !== "sonstige";
      manuell.value = z.manuellWert || "";
      row.querySelector(".met-stunden").value = z.stunden || "";
    });
    liste.appendChild(neueMetZeile());
  }

  function renderHinweisListe() {
    const liste = el("liste-nicht-gerechnet");
    liste.innerHTML = HINWEISE.map((h) => `<li><strong>${h.label}:</strong> ${h.grund}</li>`).join("");
  }

  function renderMethodik() {
    const container = el("methodik-formeln");
    container.innerHTML = REGISTRY.map(
      (f) => `<div class="formel-eintrag"><h3>${f.name}</h3><p>${f.quelle}</p></div>`
    ).join("");

    el("methodik-met-quelle").textContent = MET_QUELLE;
    const kategorien = [...new Set(MET_AKTIVITAETEN.map((a) => a.kategorie))];
    el("methodik-met").innerHTML = kategorien
      .map((kat) => {
        const zeilen = MET_AKTIVITAETEN.filter((a) => a.kategorie === kat)
          .map((a) => `<li>${a.label}: <strong>${a.met.toFixed(1).replace(".", ",")} MET</strong></li>`)
          .join("");
        return `<div class="formel-eintrag"><h3>${kat}</h3><ul class="hinweis-liste">${zeilen}</ul></div>`;
      })
      .join("");
  }

  // ---- Eingabe aus dem Formular einsammeln ---------------------------------

  function leseFormular(form) {
    const gender = form.gender.value;
    const age = Number(el("age").value);
    const heightCm = Number(el("height").value);
    const weightKg = Number(el("weight").value);
    const basisPAL = Number(el("activity").value);
    const ziel = el("goal").value;

    const ffmModus = document.querySelector('input[name="ffmModus"]:checked').value;
    let ffmKg;
    let ffmMeasured = false;
    if (ffmModus === "direkt") {
      ffmKg = Number(el("ffmDirekt").value) || undefined;
      ffmMeasured = !!ffmKg;
    } else if (ffmModus === "kfa") {
      const kfaProzent = Number(el("kfaProzent").value);
      ffmKg = kfaProzent ? ffmAusKfa({ weightKg, kfaProzent }) : undefined;
      ffmMeasured = false; // KFA-Schätzung zählt nicht als Messung (DXA/BIA/ADP)
    }
    const istSportler = ffmModus !== "keine" && el("istSportler").checked;

    const sportModus = document.querySelector('input[name="sportModus"]:checked').value;
    const sport = sportModus === "met" ? { modus: "met", aktivitaeten: leseMetZeilen() } : { modus: sportModus };

    const schwangerschaftStillzeit = el("schwangerschaftStillzeit").value || null;
    const adaptiveThermogeneseAktiv = el("adaptiveThermogenese").checked;
    const schilddruese = el("schilddruseAktiv").checked
      ? { aktiv: true, faktorProzent: Number(el("schilddruseProzent").value) || 0 }
      : null;
    const betaBlockerAktiv = el("betaBlockerAktiv").checked;
    const fieberAktivCheckbox = el("fieberAktiv").checked;
    const fieber =
      fieberAktivCheckbox && Number(el("fieberTemperatur").value) > 37
        ? { aktiv: true, temperaturC: Number(el("fieberTemperatur").value) }
        : null;

    return {
      gender,
      age,
      heightCm,
      weightKg,
      basisPAL,
      ziel,
      ffmMeasured,
      ffmKg,
      istSportler,
      sport,
      schwangerschaftStillzeit,
      adaptiveThermogeneseAktiv,
      schilddruese,
      betaBlockerAktiv,
      fieber,
      // Rohwerte für die Speicherfunktion (Formularzustand, nicht Berechnungslogik)
      _rohFormular: {
        gender,
        age: el("age").value,
        height: el("height").value,
        weight: el("weight").value,
        activity: el("activity").value,
        goal: el("goal").value,
        ffmModus,
        ffmDirekt: el("ffmDirekt").value,
        kfaProzent: el("kfaProzent").value,
        istSportler: el("istSportler").checked,
        sportModus,
        metZeilen: leseMetZeilenRoh(),
        schwangerschaftStillzeit,
        adaptiveThermogeneseAktiv,
        schilddruseAktiv: el("schilddruseAktiv").checked,
        schilddruseProzent: el("schilddruseProzent").value,
        betaBlockerAktiv,
        fieberAktiv: fieberAktivCheckbox,
        fieberTemperatur: el("fieberTemperatur").value,
      },
    };
  }

  // ---- Bar-Rendering (Inline-SVG, keine Bibliothek) ------------------------

  function renderBar(containerId, { min, max, haupt, axisMin, axisMax, warn }) {
    const scaleX = (v) => (((v - axisMin) / (axisMax - axisMin)) * 200).toFixed(1);
    const x1 = scaleX(min);
    const x2 = scaleX(max);
    const xm = scaleX(haupt);
    const farbe = warn ? "var(--color-signal)" : "var(--color-accent)";
    el(containerId).innerHTML = `
      <svg viewBox="0 0 200 24" preserveAspectRatio="none" role="img" aria-hidden="true">
        <rect x="0" y="9" width="200" height="6" rx="3" fill="var(--color-border)"></rect>
        <rect x="${x1}" y="9" width="${Math.max(0, x2 - x1).toFixed(1)}" height="6" rx="3" fill="${farbe}" opacity="0.35"></rect>
        <rect x="${(xm - 1.5).toFixed(1)}" y="3" width="3" height="18" rx="1.5" fill="${farbe}"></rect>
      </svg>`;
  }

  // ---- Ergebnis rendern -----------------------------------------------------

  function renderSporttageHinweis(sportModus) {
    const text =
      sportModus === "keine"
        ? "Sporttage: Die errechneten Werte enthalten noch kein Training — an Tagen mit Sport (insb. Cardio/HIIT) solltest du zusätzliche Kalorien einplanen, damit du nicht zu tief in ein Kaloriendefizit rutschst."
        : "Sporttage: Die errechneten Werte sind Wochendurchschnitte inklusive deines angegebenen Trainings. An einzelnen besonders harten Tagen (insb. Cardio/HIIT) liegt der tatsächliche Bedarf trotzdem über diesem Durchschnitt — plane an solchen Tagen etwas zusätzlichen Spielraum ein.";
    el("hint-sporttage").innerHTML = text.replace("Sporttage:", "<strong>Sporttage:</strong>");
  }

  function renderErgebnis(r, eingabe) {
    const axisMaxKcal = Math.max(r.ree.max, r.tee.max, r.ziel.max, r.fettabbau.max) * 1.1;
    const axisMaxProtein = r.proteinAufbau.max * 1.15;

    renderSporttageHinweis(eingabe.sport ? eingabe.sport.modus : "keine");

    el("val-ree").textContent = formatKcal(r.ree.haupt);
    renderBar("bar-ree", { min: r.ree.min, max: r.ree.max, haupt: r.ree.haupt, axisMin: 0, axisMax: axisMaxKcal });

    el("val-tee").textContent = formatKcal(r.tee.haupt);
    renderBar("bar-tee", { min: r.tee.min, max: r.tee.max, haupt: r.tee.haupt, axisMin: 0, axisMax: axisMaxKcal });

    el("val-ziel-label").textContent = r.ziel.label;
    el("val-ziel").textContent = formatKcal(r.ziel.haupt);
    renderBar("bar-ziel", { min: r.ziel.min, max: r.ziel.max, haupt: r.ziel.haupt, axisMin: 0, axisMax: axisMaxKcal, warn: r.ziel.unterReeBasis || r.ziel.bmiWarnung });

    const zielWarnungTexte = [];
    if (r.ziel.unterReeBasis) {
      zielWarnungTexte.push(
        `Das gewünschte Kaloriendefizit (${formatKcal(r.ziel.gewuenschtHaupt)}) würde den Grundumsatz unterschreiten — aus Sicherheitsgründen wurde das Ziel auf den Grundumsatz angehoben. Ein größeres Defizit wird nicht empfohlen.`
      );
    }
    if (r.ziel.bmiWarnung) {
      zielWarnungTexte.push(
        "Dein BMI liegt im Untergewichtsbereich — eine weitere Gewichtsreduktion wird hier nicht empfohlen. Bitte sprich vorher mit einer Ärztin/einem Arzt oder einer Ernährungsfachkraft."
      );
    }
    const zielWarnung = el("ziel-warnung");
    zielWarnung.innerHTML = zielWarnungTexte.map((t) => `<p>${t}</p>`).join("");
    zielWarnung.hidden = zielWarnungTexte.length === 0;

    el("val-fettabbau").textContent = formatKcal(r.fettabbau.haupt);
    renderBar("bar-fettabbau", { min: r.fettabbau.min, max: r.fettabbau.max, haupt: r.fettabbau.haupt, axisMin: 0, axisMax: axisMaxKcal, warn: r.fettabbau.unterReeBasis });
    el("fettabbau-hinweis").hidden = !r.fettabbau.unterReeBasis;

    el("val-protein-erhalt").textContent = `${formatGramm(r.proteinErhalt.min)} – ${formatGramm(r.proteinErhalt.max)}`;
    renderBar("bar-protein-erhalt", {
      min: r.proteinErhalt.min,
      max: r.proteinErhalt.max,
      haupt: (r.proteinErhalt.min + r.proteinErhalt.max) / 2,
      axisMin: 0,
      axisMax: axisMaxProtein,
    });

    el("val-protein-aufbau").textContent = `${formatGramm(r.proteinAufbau.min)} – ${formatGramm(r.proteinAufbau.max)}`;
    renderBar("bar-protein-aufbau", {
      min: r.proteinAufbau.min,
      max: r.proteinAufbau.max,
      haupt: (r.proteinAufbau.min + r.proteinAufbau.max) / 2,
      axisMin: 0,
      axisMax: axisMaxProtein,
    });

    const detailTeile = [];
    detailTeile.push(
      `<p><strong>Verwendete Formel:</strong> ${r.formel.name} (BMI ${r.formel.bmi.toFixed(1)})<br>${r.formel.begruendung}</p>`
    );
    if (r.formel.hinweise.length) {
      detailTeile.push(`<p class="signal-text">${r.formel.hinweise.join(" ")}</p>`);
    }
    detailTeile.push(`<p class="quelle-text">${r.formel.quelle}</p>`);
    detailTeile.push(
      `<p><strong>Bandbreite:</strong> REE ±${Math.round(r.ree.bandKcal)} kcal, TEE ±${Math.round(r.tee.bandKcal)} kcal — dominiert von der Formelunsicherheit selbst (Mifflin-artige Schätzformeln: ±10 % / ±200 kcal), bevor überhaupt ein Modifikator greift.</p>`
    );
    if (r.proteinBasis === "ffm") {
      detailTeile.push(
        `<p>Proteinbedarf wurde auf Basis der fettfreien Masse berechnet (nicht des Gesamtgewichts) — bei BMI ≥30 vermeidet das eine Überschätzung.</p>`
      );
    }
    if (r.aktiveModifikatoren.length) {
      detailTeile.push(
        `<p><strong>Aktive Modifikatoren:</strong></p><ul class="hinweis-liste">${r.aktiveModifikatoren
          .map((m) => `<li>${m}</li>`)
          .join("")}</ul>`
      );
    }
    el("detail-inhalt").innerHTML = detailTeile.join("");

    el("result").hidden = false;
  }

  // ---- Speichern / Laden -----------------------------------------------------

  function setzeRadioFallsVorhanden(name, value) {
    if (!value) return;
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  function fuelleFormularAus(gespeichert) {
    if (!gespeichert) return;
    setzeRadioFallsVorhanden("gender", gespeichert.gender);
    el("age").value = gespeichert.age || "";
    el("height").value = gespeichert.height || "";
    el("weight").value = gespeichert.weight || "";
    el("activity").value = gespeichert.activity || "1.55";
    el("goal").value = gespeichert.goal || "maintain";

    if (gespeichert.ffmModus) {
      setzeRadioFallsVorhanden("ffmModus", gespeichert.ffmModus);
      el("feld-ffm-direkt").hidden = gespeichert.ffmModus !== "direkt";
      el("feld-ffm-kfa").hidden = gespeichert.ffmModus !== "kfa";
      el("feld-ist-sportler").hidden = gespeichert.ffmModus === "keine";
    }
    el("ffmDirekt").value = gespeichert.ffmDirekt || "";
    el("kfaProzent").value = gespeichert.kfaProzent || "";
    el("istSportler").checked = !!gespeichert.istSportler;

    // "pal" gab es in einer früheren Version — fällt hier stillschweigend auf
    // "keine" zurück, falls noch in alten gespeicherten Daten vorhanden.
    const sportModus = gespeichert.sportModus === "met" ? "met" : "keine";
    setzeRadioFallsVorhanden("sportModus", sportModus);
    el("feld-met").hidden = sportModus !== "met";
    anwendenMetUeberschreibung(sportModus === "met");
    stelleMetZeilenWieder(gespeichert.metZeilen);

    aktualisiereSchwangerschaftSichtbarkeit();
    if (!el("feld-schwangerschaft").hidden) {
      el("schwangerschaftStillzeit").value = gespeichert.schwangerschaftStillzeit || "";
    }
    el("adaptiveThermogenese").checked = !!gespeichert.adaptiveThermogeneseAktiv;

    el("schilddruseAktiv").checked = !!gespeichert.schilddruseAktiv;
    el("feld-schilddruse").hidden = !gespeichert.schilddruseAktiv;
    el("schilddruseProzent").value = gespeichert.schilddruseProzent || "";

    el("betaBlockerAktiv").checked = !!gespeichert.betaBlockerAktiv;

    el("fieberAktiv").checked = !!gespeichert.fieberAktiv;
    el("feld-fieber").hidden = !gespeichert.fieberAktiv;
    el("fieberTemperatur").value = gespeichert.fieberTemperatur || "";

    el("speichernAktiv").checked = true;
  }

  // ---- Init -------------------------------------------------------------

  function init() {
    initTabs();
    initConditionalFields();
    initMetListe();
    renderHinweisListe();
    renderMethodik();
    fuelleFormularAus(speicher.laden());

    el("calc-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const eingabe = leseFormular(event.target);
      if (!eingabe.age || !eingabe.heightCm || !eingabe.weightKg) {
        return;
      }

      if (el("speichernAktiv").checked) {
        speicher.speichern(eingabe._rohFormular);
      } else {
        speicher.loeschen();
      }

      const ergebnis = berechne(eingabe);
      renderErgebnis(ergebnis, eingabe);
      el("result").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    el("datenLoeschenBtn").addEventListener("click", () => {
      speicher.loeschen();
      el("speichernAktiv").checked = false;
    });

    const titelOriginal = document.title;
    el("printBtn").addEventListener("click", () => {
      const heute = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const datum = `${heute.getFullYear()}-${pad(heute.getMonth() + 1)}-${pad(heute.getDate())}`;
      // Browser schlagen im "Als PDF speichern"-Dialog meist document.title als Dateinamen vor.
      document.title = `Kalorienbedarfsrechner_${datum}`;
      window.print();
    });
    window.addEventListener("afterprint", () => {
      document.title = titelOriginal;
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
