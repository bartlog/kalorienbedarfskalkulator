(function () {
  "use strict";

  const { berechne } = window.KBR.berechnung;
  const { REGISTRY } = window.KBR.formeln;
  const { HINWEISE } = window.KBR.modifikatoren;
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
        feldMet.hidden = document.querySelector('input[name="sportModus"]:checked').value !== "met";
      })
    );

    el("schilddruseAktiv").addEventListener("change", (e) => {
      el("feld-schilddruse").hidden = !e.target.checked;
    });

    el("fieberAktiv").addEventListener("change", (e) => {
      el("feld-fieber").hidden = !e.target.checked;
    });
  }

  // ---- Statische Listen (Hinweise, Formelquellen) --------------------------

  function renderHinweisListe() {
    const liste = el("liste-nicht-gerechnet");
    liste.innerHTML = HINWEISE.map((h) => `<li><strong>${h.label}:</strong> ${h.grund}</li>`).join("");
  }

  function renderMethodik() {
    const container = el("methodik-formeln");
    container.innerHTML = REGISTRY.map(
      (f) => `<div class="formel-eintrag"><h3>${f.name}</h3><p>${f.quelle}</p></div>`
    ).join("");
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
    const sport =
      sportModus === "met"
        ? {
            modus: "met",
            metWert: Number(el("metWert").value),
            stundenProEinheit: Number(el("metStunden").value),
            einheitenProWoche: Number(el("metEinheiten").value),
          }
        : { modus: sportModus };

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
        metWert: el("metWert").value,
        metStunden: el("metStunden").value,
        metEinheiten: el("metEinheiten").value,
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

  function renderErgebnis(r) {
    const axisMaxKcal = Math.max(r.ree.max, r.tee.max, r.ziel.unterReeBasis ? r.ree.max : r.ziel.max, r.fettabbau.max) * 1.1;
    const axisMaxProtein = r.proteinAufbau.max * 1.15;

    el("val-ree").textContent = formatKcal(r.ree.haupt);
    renderBar("bar-ree", { min: r.ree.min, max: r.ree.max, haupt: r.ree.haupt, axisMin: 0, axisMax: axisMaxKcal });

    el("val-tee").textContent = formatKcal(r.tee.haupt);
    renderBar("bar-tee", { min: r.tee.min, max: r.tee.max, haupt: r.tee.haupt, axisMin: 0, axisMax: axisMaxKcal });

    el("val-ziel-label").textContent = r.ziel.label;
    const zielWarnung = el("ziel-warnung");
    const barZiel = el("bar-ziel");
    if (r.ziel.unterReeBasis) {
      el("val-ziel").textContent = "—";
      zielWarnung.hidden = false;
      barZiel.innerHTML = "";
    } else {
      el("val-ziel").textContent = formatKcal(r.ziel.haupt);
      zielWarnung.hidden = true;
      renderBar("bar-ziel", { min: r.ziel.min, max: r.ziel.max, haupt: r.ziel.haupt, axisMin: 0, axisMax: axisMaxKcal });
    }

    el("val-fettabbau").textContent = formatKcal(r.fettabbau.haupt);
    renderBar("bar-fettabbau", { min: r.fettabbau.min, max: r.fettabbau.max, haupt: r.fettabbau.haupt, axisMin: 0, axisMax: axisMaxKcal });

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

  function fuelleFormularAus(gespeichert) {
    if (!gespeichert) return;
    document.querySelector(`input[name="gender"][value="${gespeichert.gender}"]`).checked = true;
    el("age").value = gespeichert.age || "";
    el("height").value = gespeichert.height || "";
    el("weight").value = gespeichert.weight || "";
    el("activity").value = gespeichert.activity || "1.55";
    el("goal").value = gespeichert.goal || "maintain";

    if (gespeichert.ffmModus) {
      document.querySelector(`input[name="ffmModus"][value="${gespeichert.ffmModus}"]`).checked = true;
      el("feld-ffm-direkt").hidden = gespeichert.ffmModus !== "direkt";
      el("feld-ffm-kfa").hidden = gespeichert.ffmModus !== "kfa";
      el("feld-ist-sportler").hidden = gespeichert.ffmModus === "keine";
    }
    el("ffmDirekt").value = gespeichert.ffmDirekt || "";
    el("kfaProzent").value = gespeichert.kfaProzent || "";
    el("istSportler").checked = !!gespeichert.istSportler;

    if (gespeichert.sportModus) {
      document.querySelector(`input[name="sportModus"][value="${gespeichert.sportModus}"]`).checked = true;
      el("feld-met").hidden = gespeichert.sportModus !== "met";
    }
    el("metWert").value = gespeichert.metWert || "";
    el("metStunden").value = gespeichert.metStunden || "";
    el("metEinheiten").value = gespeichert.metEinheiten || "";

    el("schwangerschaftStillzeit").value = gespeichert.schwangerschaftStillzeit || "";
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
      renderErgebnis(ergebnis);
      el("result").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    el("datenLoeschenBtn").addEventListener("click", () => {
      speicher.loeschen();
      el("speichernAktiv").checked = false;
    });

    el("printBtn").addEventListener("click", () => {
      window.print();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
