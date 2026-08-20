(function () {
  "use strict";

  const { berechne } = window.KBR.berechnung;
  const { REGISTRY } = window.KBR.formeln;
  const { HINWEIS_IDS, MET_AKTIVITAETEN } = window.KBR.modifikatoren;
  const { ffmAusKfa } = window.KBR.formeln;
  const speicher = window.KBR.speicher;
  const i18n = window.KBR.i18n;
  const { STUFE_LABELS } = window.KBR.tipps;

  // Zuletzt berechnetes Ergebnis, für den Re-Render beim Sprachwechsel
  // (Zahlenformat und alle dynamisch erzeugten Texte sind sprachabhängig).
  let letztesErgebnis = null;
  let letzteEingabe = null;

  function formatKcal(value) {
    return `${i18n.zahl(Math.round(value), 0)} kcal`;
  }

  function formatGramm(value) {
    return `${i18n.zahl(Math.round(value), 0)} g`;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---- Sprache --------------------------------------------------------------

  function metAktivitaetLabel(aktivitaetId) {
    if (aktivitaetId === "sonstige") return i18n.t("met_sonstige_aktivitaet_label");
    const eintrag = MET_AKTIVITAETEN.find((a) => a.id === aktivitaetId);
    return eintrag ? i18n.t("met_aktivitaet_" + eintrag.id) : "";
  }

  function wendeSpracheAn() {
    const sprache = i18n.getSprache();
    document.documentElement.lang = sprache;
    document.title = i18n.t("app_title");
    el("translation-notice").hidden = sprache !== "en";

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === sprache);
    });

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.innerHTML = i18n.t(node.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-attr-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", i18n.t(node.getAttribute("data-i18n-attr-aria-label")));
    });

    renderHinweisListe();
    renderMethodik();
    renderTipps();

    // Bestehende MET-Zeilen (Aktivitätsauswahl, Werte) neu aufbauen, damit die
    // Options-Labels in der neuen Sprache erscheinen — Auswahl/Werte bleiben erhalten.
    if (el("met-liste")) {
      stelleMetZeilenWieder(leseMetZeilenRoh().filter((z) => z.auswahl));
    }

    // Ein bereits angezeigtes Ergebnis enthält viele dynamisch erzeugte,
    // sprachabhängige Texte/Zahlen — bei Sprachwechsel neu rendern.
    if (letztesErgebnis && !el("result").hidden) {
      renderErgebnis(letztesErgebnis, letzteEingabe);
    }
  }

  // ---- Tabs ---------------------------------------------------------------

  function initTabs() {
    const tabs = [
      { btn: el("tab-btn-rechner"), panel: el("tab-rechner") },
      { btn: el("tab-btn-methodik"), panel: el("tab-methodik") },
      { btn: el("tab-btn-ueber"), panel: el("tab-ueber") },
      { btn: el("tab-btn-tipps"), panel: el("tab-tipps") },
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

  // Zeigt/versteckt eine Doppelzählungs-Statusmeldung an einer von mehreren
  // Stellen -- ersetzt die frühere Einzellösung (direkter .hidden-Zugriff pro
  // Aufrufstelle) durch einen gemeinsamen, wiederverwendbaren Aufruf. Die
  // Texte selbst sind statisch (data-i18n im HTML), hier wird nur die
  // Sichtbarkeit gesteuert.
  function aktualisiereStatusHinweis(id, sichtbar) {
    el(id).hidden = !sichtbar;
  }

  // Bei genauer MET-Berechnung ersetzt das Training die Sport-Häufigkeits-
  // Schätzung oben (statt sie zu ergänzen) — daher wird das Feld auf "Kein
  // Sport" fixiert und deaktiviert, damit nicht doppelt gezählt wird. Die
  // Alltagsaktivität (NEAT) ist davon unabhängig und bleibt unangetastet.
  // Vorheriger Wert wird für den Fall gemerkt, dass der Nutzer wieder auf
  // "Schätzung oben verwenden" wechselt. Der Status-Hinweis erscheint zweimal
  // (direkt am deaktivierten Dropdown UND unten bei MET) -- dort oben entsteht
  // die eigentliche Verwirrung ("warum ist das grau?"), nicht erst unten.
  function anwendenMetUeberschreibung(istMet) {
    const sportSelect = el("sportHaeufigkeit");
    if (istMet) {
      if (sportSelect.dataset.vorherigerWert === undefined) {
        sportSelect.dataset.vorherigerWert = sportSelect.value;
      }
      sportSelect.value = "keinSport";
      sportSelect.disabled = true;
    } else {
      sportSelect.disabled = false;
      if (sportSelect.dataset.vorherigerWert !== undefined) {
        sportSelect.value = sportSelect.dataset.vorherigerWert;
        delete sportSelect.dataset.vorherigerWert;
      }
    }
    aktualisiereStatusHinweis("hinweis-met-override", istMet);
    aktualisiereStatusHinweis("hinweis-met-override-sport", istMet);
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

    function aktualisiereHinweisLaufMet() {
      const aktiv = el("laufAktiv").checked && Number(el("laufKmWoche").value) > 0;
      aktualisiereStatusHinweis("hinweis-lauf-met", aktiv);
    }
    el("laufAktiv").addEventListener("change", (e) => {
      el("feld-lauf-km").hidden = !e.target.checked;
      aktualisiereHinweisLaufMet();
    });
    el("laufKmWoche").addEventListener("input", aktualisiereHinweisLaufMet);
  }

  // ---- MET-Aktivitätsliste (dynamisch, Kategorie B) ------------------------

  function metAktivitaetOptionsHtml() {
    const kategorieIds = [...new Set(MET_AKTIVITAETEN.map((a) => a.kategorieId))];
    const optgroups = kategorieIds
      .map((katId) => {
        const options = MET_AKTIVITAETEN.filter((a) => a.kategorieId === katId)
          .map((a) => `<option value="${a.id}">${escapeHtml(i18n.t("met_aktivitaet_" + a.id))}</option>`)
          .join("");
        return `<optgroup label="${escapeHtml(i18n.t("met_kategorie_" + katId))}">${options}</optgroup>`;
      })
      .join("");
    return `<option value="">${escapeHtml(i18n.t("met_option_placeholder"))}</option>${optgroups}<option value="sonstige">${escapeHtml(i18n.t("met_option_sonstige"))}</option>`;
  }

  function neueMetZeile() {
    const row = document.createElement("div");
    row.className = "met-zeile";
    row.innerHTML = `
      <select class="met-aktivitaet" aria-label="${escapeHtml(i18n.t("met_aria_aktivitaet"))}">${metAktivitaetOptionsHtml()}</select>
      <input type="number" class="met-manuell" placeholder="${escapeHtml(i18n.t("met_placeholder_manuell"))}" min="1" max="20" step="0.1" hidden aria-label="${escapeHtml(i18n.t("met_aria_manuell"))}">
      <input type="number" class="met-stunden" placeholder="${escapeHtml(i18n.t("met_placeholder_stunden"))}" min="0.25" max="30" step="0.25" aria-label="${escapeHtml(i18n.t("met_aria_stunden"))}">
      <button type="button" class="met-entfernen" aria-label="${escapeHtml(i18n.t("met_aria_entfernen"))}">×</button>
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
        return { metWert, stundenProWoche: Number(stunden.value) || 0, aktivitaetId: select.value };
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

  // ---- Statische Listen (Hinweise, Formelquellen, Tipps) --------------------

  function renderHinweisListe() {
    const liste = el("liste-nicht-gerechnet");
    liste.innerHTML = HINWEIS_IDS.map(
      (id) => `<li><strong>${i18n.t("hinweis_" + id + "_label")}:</strong> ${i18n.t("hinweis_" + id + "_grund")}</li>`
    ).join("");
  }

  function renderMethodik() {
    const container = el("methodik-formeln");
    const sprache = i18n.getSprache();
    container.innerHTML = REGISTRY.map(
      (f) => `<div class="formel-eintrag"><h3>${f.name}</h3><p>${f.quelle[sprache]}</p></div>`
    ).join("");

    el("methodik-met-quelle").textContent = i18n.t("met_quelle");
    const kategorieIds = [...new Set(MET_AKTIVITAETEN.map((a) => a.kategorieId))];
    el("methodik-met").innerHTML = kategorieIds
      .map((katId) => {
        const zeilen = MET_AKTIVITAETEN.filter((a) => a.kategorieId === katId)
          .map((a) => `<li>${escapeHtml(i18n.t("met_aktivitaet_" + a.id))}: <strong>${i18n.zahlNatuerlich(a.met)} MET</strong></li>`)
          .join("");
        return `<div class="formel-eintrag"><h3>${escapeHtml(i18n.t("met_kategorie_" + katId))}</h3><ul class="hinweis-liste">${zeilen}</ul></div>`;
      })
      .join("");
  }

  function renderTipps() {
    const container = el("tipps-abschnitte");
    if (!container || !window.KBR.tipps) return;
    const sprache = i18n.getSprache();
    const abschnitte = window.KBR.tipps.ABSCHNITTE;

    container.innerHTML = abschnitte
      .map((abschnitt) => {
        const spalten = [abschnitt.spalte1, abschnitt.spalte2, abschnitt.spalte3].filter(Boolean);
        const filterLabel = spalten[0][sprache];
        const stufenCodes = [];
        abschnitt.zeilen.forEach((zeile) => {
          if (!stufenCodes.includes(zeile.stufe)) stufenCodes.push(zeile.stufe);
        });
        const optionsHtml = [`<option value="">${escapeHtml(i18n.t("tipps_alle"))}</option>`]
          .concat(
            stufenCodes.map(
              (code) => `<option value="${code}">${escapeHtml(STUFE_LABELS[code][sprache])}</option>`
            )
          )
          .join("");
        const headHtml = spalten.map((s) => `<th>${escapeHtml(s[sprache])}</th>`).join("");
        const bodyHtml = abschnitt.zeilen
          .map((zeile) => {
            const klasse = abschnitt.id === "restaurant" ? "restaurant" : zeile.stufe;
            const zellen = [STUFE_LABELS[zeile.stufe][sprache], ...zeile[sprache]];
            return `<tr data-wert="${zeile.stufe}" class="tipps-stufe-${klasse}">${zellen
              .map((z) => `<td>${escapeHtml(z)}</td>`)
              .join("")}</tr>`;
          })
          .join("");
        return `
          <details class="advanced tipps-abschnitt">
            <summary>${escapeHtml(abschnitt.titel[sprache])} <span class="tipps-anzahl">(${abschnitt.zeilen.length})</span></summary>
            <div class="field tipps-filter">
              <label class="field-label" for="tipps-filter-${abschnitt.id}">${i18n.t("tipps_filtern_nach", { spalte: escapeHtml(filterLabel) })}</label>
              <select id="tipps-filter-${abschnitt.id}" class="tipps-filter-select" data-target="tipps-tabelle-${abschnitt.id}">${optionsHtml}</select>
            </div>
            <div class="tipps-table-wrap">
              <table class="tipps-table" id="tipps-tabelle-${abschnitt.id}">
                <thead><tr>${headHtml}</tr></thead>
                <tbody>${bodyHtml}</tbody>
              </table>
            </div>
          </details>`;
      })
      .join("");

    container.querySelectorAll(".tipps-filter-select").forEach((select) => {
      select.addEventListener("change", () => {
        const tabelle = el(select.dataset.target);
        const wert = select.value;
        tabelle.querySelectorAll("tbody tr").forEach((tr) => {
          tr.hidden = wert !== "" && tr.dataset.wert !== wert;
        });
      });
    });
  }

  // ---- Eingabe aus dem Formular einsammeln ---------------------------------

  function leseFormular(form) {
    const gender = form.gender.value;
    const age = Number(el("age").value);
    const heightCm = Number(el("height").value);
    const weightKg = Number(el("weight").value);
    const neatSchritteId = el("neatSchritte").value;
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
    const sportHaeufigkeitId = el("sportHaeufigkeit").value;
    const sport =
      sportModus === "met"
        ? { modus: "met", haeufigkeitId: sportHaeufigkeitId, aktivitaeten: leseMetZeilen() }
        : { modus: "keine", haeufigkeitId: sportHaeufigkeitId, aktivitaeten: [] };
    const fidgetingAktiv = el("fidgetingAktiv").checked;
    const laufAktiv = el("laufAktiv").checked;
    const laufKmWoche = Number(el("laufKmWoche").value) || 0;
    const traegtTrackerBeimSport = el("traegtTrackerBeimSport").checked;

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
      neatSchritteId,
      ziel,
      ffmMeasured,
      ffmKg,
      istSportler,
      sport,
      fidgetingAktiv,
      laufAktiv,
      laufKmWoche,
      traegtTrackerBeimSport,
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
        neatSchritteId,
        goal: el("goal").value,
        ffmModus,
        ffmDirekt: el("ffmDirekt").value,
        kfaProzent: el("kfaProzent").value,
        istSportler: el("istSportler").checked,
        sportModus,
        sportHaeufigkeitId,
        metZeilen: leseMetZeilenRoh(),
        fidgetingAktiv,
        laufAktiv,
        laufKmWoche: el("laufKmWoche").value,
        traegtTrackerBeimSport,
        schwangerschaftStillzeit,
        adaptiveThermogeneseAktiv,
        schilddruseAktiv: el("schilddruseAktiv").checked,
        schilddruseProzent: el("schilddruseProzent").value,
        betaBlockerAktiv,
        fieberAktiv: fieberAktivCheckbox,
        fieberTemperatur: el("fieberTemperatur").value,
        druckFussnote: el("druckFussnote").value,
      },
    };
  }

  // Plausibilitäts-Guards für Körperzusammensetzung/Fieber — blockiert die
  // Berechnung bei physiologisch unmöglichen Eingaben (statt sie stillschweigend
  // zu übernehmen) und zeigt eine Fehlermeldung unter dem jeweiligen Feld.
  // Läuft vor berechne(), nicht in berechnung.js selbst: die Pipeline bleibt
  // eine reine Funktion ohne Validierungs-/Fehlerzustand, siehe CLAUDE.md.
  function validiereEingabe(eingabe) {
    let gueltig = true;

    const fehlerKfa = el("error-kfa");
    const ffmModus = document.querySelector('input[name="ffmModus"]:checked').value;
    if (ffmModus === "kfa") {
      const kfa = Number(el("kfaProzent").value);
      const kfaGueltig = kfa >= 3 && kfa <= 60;
      fehlerKfa.hidden = kfaGueltig;
      if (!kfaGueltig) gueltig = false;
    } else {
      fehlerKfa.hidden = true;
    }

    const fehlerFfm = el("error-ffm-direkt");
    if (ffmModus === "direkt") {
      const ffm = Number(el("ffmDirekt").value);
      const ffmGueltig = ffm > 0 && ffm < eingabe.weightKg;
      fehlerFfm.hidden = ffmGueltig;
      if (!ffmGueltig) gueltig = false;
    } else {
      fehlerFfm.hidden = true;
    }

    // Nicht über eingabe.fieber geprüft: leseFormular liefert dort null, sobald
    // temperaturC <= 37 ist (kein "aktives" Fieber für den Modifikator) — das
    // ist aber unabhängig davon, ob der rohe Feldwert selbst plausibel ist.
    const fehlerFieber = el("error-fieber");
    if (el("fieberAktiv").checked) {
      const rohWert = el("fieberTemperatur").value;
      const temp = Number(rohWert);
      if (rohWert === "" || Number.isNaN(temp)) {
        fehlerFieber.hidden = true;
      } else if (temp > 45) {
        fehlerFieber.textContent = i18n.t("error_fieber_fahrenheit");
        fehlerFieber.hidden = false;
        gueltig = false;
      } else if (!(temp >= 35 && temp <= 42)) {
        fehlerFieber.textContent = i18n.t("error_fieber_bereich");
        fehlerFieber.hidden = false;
        gueltig = false;
      } else {
        fehlerFieber.hidden = true;
      }
    } else {
      fehlerFieber.hidden = true;
    }

    return gueltig;
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

  // ---- Formel-Begründung & aktive Modifikatoren (sprachabhängige Formatierung) ---

  function formatiereBegruendung(formel) {
    const params =
      formel.begruendungParams && formel.begruendungParams.bmi !== undefined
        ? { bmi: i18n.zahl(formel.begruendungParams.bmi, 1) }
        : undefined;
    return i18n.t("begruendung_" + formel.begruendungId, params);
  }

  // Zeigt bei Soft-Boundary-Fällen (BMI 29-31 bzw. Alter 60-69, siehe
  // auswahl.js) die primäre REE neben den Vergleichswerten der jeweils
  // anderen Formel(n) — rein informativ, die Pipeline rechnet unverändert mit
  // der primären Formel weiter (kein Mittelwert o. Ä. im Hintergrund). Beide
  // Zonen sind unabhängig voneinander und können gleichzeitig zutreffen
  // (`alternativen` ist ein Array, nicht auf einen Eintrag festgelegt) — das
  // Markup ist entsprechend generisch für 1 oder 2 Alternativen gebaut.
  function renderSoftBoundaryHinweis(formel, reeBasisPrimaer) {
    const container = el("soft-boundary-hinweis");
    const alternativen = formel.alternativen || [];
    if (!alternativen.length) {
      container.hidden = true;
      return;
    }
    const zonen = alternativen
      .map((a) => a.softBoundary)
      .filter((z, i, arr) => arr.indexOf(z) === i);
    const titelKey = zonen.length > 1 ? "soft_boundary_kombiniert_titel" : "soft_boundary_" + zonen[0] + "_titel";
    const werteHtml = [
      `<div class="soft-boundary-wert soft-boundary-wert-primaer">
        <span class="formel-name">${escapeHtml(formel.name)}</span>
        <span class="formel-wert">${formatKcal(reeBasisPrimaer)}</span>
      </div>`,
      ...alternativen.map(
        (a) => `
      <div class="soft-boundary-wert">
        <span class="formel-name">${escapeHtml(a.formelName)}</span>
        <span class="formel-wert">${formatKcal(a.reeBasis)}</span>
      </div>`
      ),
    ].join("");
    const textHtml = zonen.map((z) => `<p>${i18n.t("soft_boundary_" + z + "_text")}</p>`).join("");
    container.innerHTML = `
      <p class="soft-boundary-titel">${i18n.t(titelKey)}</p>
      <div class="soft-boundary-werte">${werteHtml}</div>
      ${textHtml}
    `;
    container.hidden = false;
  }

  function formatiereModifikator(eintrag) {
    switch (eintrag.id) {
      case "adaptive_thermogenese":
        return i18n.t("mod_adaptive_thermogenese");
      case "schilddruese":
        return i18n.t("mod_schilddruese", {
          vorzeichen: eintrag.prozent >= 0 ? "+" : "",
          prozent: i18n.zahlNatuerlich(eintrag.prozent),
        });
      case "fieber":
        return i18n.t("mod_fieber", {
          temp: i18n.zahlNatuerlich(eintrag.temp),
          delta: i18n.zahl(eintrag.delta, 1),
        });
      case "sport_met": {
        const details = eintrag.aktivitaeten
          .map((a) =>
            i18n.t("mod_sport_aktivitaet_eintrag", {
              label: metAktivitaetLabel(a.aktivitaetId),
              stunden: i18n.zahlNatuerlich(a.stundenProWoche),
              met: i18n.zahlNatuerlich(a.metWert),
            })
          )
          .join(", ");
        return i18n.t("mod_sport_met", { details, zuschlag: i18n.zahl(eintrag.zuschlag, 2) });
      }
      case "sport_haeufigkeit":
        return i18n.t("mod_sport_haeufigkeit", {
          stufe: i18n.t("sport_haeufigkeit_opt_" + eintrag.haeufigkeitId),
          zuschlag: i18n.zahl(eintrag.zuschlag, 2),
        });
      case "fidgeting":
        return i18n.t("mod_fidgeting", {
          zuschlagMin: i18n.zahl(eintrag.zuschlagMin, 2),
          zuschlagMax: i18n.zahl(eintrag.zuschlagMax, 2),
        });
      case "lauf_intensitaet":
        return i18n.t("mod_lauf_intensitaet", {
          km: i18n.zahlNatuerlich(eintrag.kmWoche),
          zuschlag: i18n.zahl(eintrag.zuschlag, 2),
        });
      case "lauf_via_met":
        return i18n.t("mod_lauf_via_met", { km: i18n.zahlNatuerlich(eintrag.kmWoche) });
      case "met_neat_korrektur":
        return i18n.t("mod_met_neat_korrektur", { zuschlag: i18n.zahl(eintrag.zuschlag, 2) });
      case "schwangerschaft":
        return i18n.t("mod_schwangerschaft");
      case "stillzeit":
        return i18n.t("mod_stillzeit");
      case "beta_blocker":
        return i18n.t("mod_beta_blocker");
      default:
        return "";
    }
  }

  // ---- Ergebnis rendern -----------------------------------------------------

  function renderErgebnis(r, eingabe) {
    letztesErgebnis = r;
    letzteEingabe = eingabe;

    const axisMaxKcal = Math.max(r.ree.max, r.tee.max, r.ziel.max, r.fettabbau.max) * 1.1;
    const axisMaxProtein = r.proteinAufbau.max * 1.15;

    el("val-bmi").textContent = i18n.zahl(r.formel.bmi, 1);

    renderSoftBoundaryHinweis(r.formel, r.ree.basis);

    el("val-ree").textContent = formatKcal(r.ree.haupt);
    renderBar("bar-ree", { min: r.ree.min, max: r.ree.max, haupt: r.ree.haupt, axisMin: 0, axisMax: axisMaxKcal });

    el("val-tee").textContent = formatKcal(r.tee.haupt);
    renderBar("bar-tee", { min: r.tee.min, max: r.tee.max, haupt: r.tee.haupt, axisMin: 0, axisMax: axisMaxKcal });

    el("val-ziel-label").textContent = i18n.t("goal_label_" + eingabe.ziel);
    el("val-ziel").textContent = formatKcal(r.ziel.haupt);
    renderBar("bar-ziel", { min: r.ziel.min, max: r.ziel.max, haupt: r.ziel.haupt, axisMin: 0, axisMax: axisMaxKcal, warn: r.ziel.unterReeBasis || r.ziel.bmiWarnung });

    const zielWarnungTexte = [];
    if (r.ziel.unterReeBasis) {
      zielWarnungTexte.push(i18n.t("ziel_warnung_defizit", { betrag: formatKcal(r.ziel.gewuenschtHaupt) }));
    }
    if (r.ziel.bmiWarnung) {
      zielWarnungTexte.push(i18n.t("ziel_warnung_bmi"));
    }
    const zielWarnung = el("ziel-warnung");
    zielWarnung.innerHTML = zielWarnungTexte.map((t) => `<p>${t}</p>`).join("");
    zielWarnung.hidden = zielWarnungTexte.length === 0;

    el("pal-hoch-hinweis").hidden = !r.pal.hochWarnung;

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
      `<p>${i18n.t("detail_formel", {
        name: r.formel.name,
        bmi: i18n.zahl(r.formel.bmi, 1),
        begruendung: formatiereBegruendung(r.formel),
      })}</p>`
    );
    if (r.formel.hinweise.length) {
      detailTeile.push(
        `<p class="signal-text">${r.formel.hinweise.map((id) => i18n.t("hinweis_auswahl_" + id)).join(" ")}</p>`
      );
    }
    detailTeile.push(`<p class="quelle-text">${r.formel.quelle[i18n.getSprache()]}</p>`);
    detailTeile.push(
      `<p>${i18n.t("detail_bandbreite", { ree: Math.round(r.ree.bandKcal), tee: Math.round(r.tee.bandKcal) })}</p>`
    );
    if (r.proteinBasis === "ffm") {
      detailTeile.push(`<p>${i18n.t("detail_protein_ffm")}</p>`);
    }
    if (r.aktiveModifikatoren.length) {
      detailTeile.push(
        `<p><strong>${i18n.t("detail_modifikatoren_heading")}</strong></p><ul class="hinweis-liste">${r.aktiveModifikatoren
          .map((m) => `<li>${formatiereModifikator(m)}</li>`)
          .join("")}</ul>`
      );
    }
    el("detail-inhalt").innerHTML = detailTeile.join("");

    el("result").hidden = false;

    renderDruckEingaben(eingabe);
  }

  // ---- Druckseite "Eingegebene Werte" ---------------------------------------

  function druckZeile(labelText, wertText) {
    return `<div class="druck-zeile"><dt>${escapeHtml(labelText)}</dt><dd>${escapeHtml(wertText)}</dd></div>`;
  }

  // Zweite (ggf. dritte) PDF-Seite: Klartext-Zusammenfassung der Eingaben, z. B.
  // als Beleg für einen Arztbesuch. Nur relevant für den Druck (siehe CSS
  // .druck-eingaben), auf dem Bildschirm nie sichtbar.
  function renderDruckEingaben(eingabe) {
    const liste = el("druck-eingaben-liste");
    if (!liste) return;

    const zeilen = [];
    zeilen.push(druckZeile(i18n.t("feld_geschlecht_label"), i18n.t(eingabe.gender === "male" ? "geschlecht_maennlich" : "geschlecht_weiblich")));
    zeilen.push(druckZeile(i18n.t("feld_alter_label"), i18n.zahlNatuerlich(eingabe.age)));
    zeilen.push(druckZeile(i18n.t("feld_groesse_label"), `${i18n.zahlNatuerlich(eingabe.heightCm)} cm`));
    zeilen.push(druckZeile(i18n.t("feld_gewicht_label"), `${i18n.zahlNatuerlich(eingabe.weightKg)} kg`));
    zeilen.push(druckZeile(i18n.t("feld_neat_label"), i18n.t("neat_opt_" + eingabe.neatSchritteId)));
    if (eingabe.laufAktiv && eingabe.laufKmWoche > 0) {
      zeilen.push(druckZeile(i18n.t("lauf_label"), i18n.t("druck_lauf_km_zeile", { km: i18n.zahlNatuerlich(eingabe.laufKmWoche) })));
    }
    // Bei MET-Berechnung wird "Kein regelmäßiger Sport" nur als technische Basis
    // erzwungen (siehe anwendenMetUeberschreibung) — kein echter Nutzer-Input,
    // daher hier ausgelassen; die MET-Liste unten ist der eigentliche Eintrag.
    if (!eingabe.sport || eingabe.sport.modus !== "met") {
      zeilen.push(druckZeile(i18n.t("feld_sport_haeufigkeit_label"), i18n.t("sport_haeufigkeit_opt_" + eingabe.sport.haeufigkeitId)));
    }
    zeilen.push(druckZeile(i18n.t("feld_ziel_label"), i18n.t("ziel_opt_" + eingabe.ziel)));

    if (eingabe.ffmMeasured && eingabe.ffmKg) {
      zeilen.push(druckZeile(i18n.t("druck_ffm_direkt_label"), `${i18n.zahl(eingabe.ffmKg, 1)} kg`));
    } else if (eingabe.ffmKg) {
      zeilen.push(druckZeile(i18n.t("druck_ffm_kfa_label"), `${i18n.zahl(eingabe.ffmKg, 1)} kg`));
    }
    if (eingabe.istSportler) {
      zeilen.push(druckZeile(i18n.t("ffm_sportler_label"), i18n.t("druck_ja")));
    }

    const laufOderMetAktiv = (eingabe.sport && eingabe.sport.modus === "met") || (eingabe.laufAktiv && eingabe.laufKmWoche > 0);
    if (laufOderMetAktiv && !eingabe.traegtTrackerBeimSport) {
      zeilen.push(druckZeile(i18n.t("traegt_tracker_label"), i18n.t("druck_nein")));
    }

    if (eingabe.sport && eingabe.sport.modus === "met" && eingabe.sport.aktivitaeten.length) {
      zeilen.push(`<div class="druck-untergruppe">${escapeHtml(i18n.t("sport_legend"))}</div>`);
      eingabe.sport.aktivitaeten.forEach((a) => {
        zeilen.push(
          druckZeile(
            metAktivitaetLabel(a.aktivitaetId),
            i18n.t("druck_sport_zeile", { stunden: i18n.zahlNatuerlich(a.stundenProWoche), met: i18n.zahlNatuerlich(a.metWert) })
          )
        );
      });
    }

    if (eingabe.schwangerschaftStillzeit === "schwanger") {
      zeilen.push(druckZeile(i18n.t("schwangerschaft_label"), i18n.t("schwangerschaft_opt_schwanger")));
    } else if (eingabe.schwangerschaftStillzeit === "stillzeit") {
      zeilen.push(druckZeile(i18n.t("schwangerschaft_label"), i18n.t("schwangerschaft_opt_stillzeit")));
    }
    if (eingabe.adaptiveThermogeneseAktiv) {
      zeilen.push(druckZeile(i18n.t("diaet_label"), i18n.t("druck_ja")));
    }
    if (eingabe.schilddruese && eingabe.schilddruese.aktiv) {
      zeilen.push(druckZeile(i18n.t("schilddruese_label"), i18n.t("druck_ja")));
      const p = eingabe.schilddruese.faktorProzent;
      zeilen.push(druckZeile(i18n.t("schilddruese_prozent_label"), `${p >= 0 ? "+" : ""}${i18n.zahlNatuerlich(p)} %`));
    }
    if (eingabe.betaBlockerAktiv) {
      zeilen.push(druckZeile(i18n.t("betablocker_label"), i18n.t("druck_ja")));
    }
    if (eingabe.fidgetingAktiv) {
      zeilen.push(druckZeile(i18n.t("fidgeting_label"), i18n.t("druck_ja")));
    }
    if (eingabe.fieber && eingabe.fieber.aktiv) {
      zeilen.push(druckZeile(i18n.t("fieber_label"), i18n.t("druck_ja")));
      zeilen.push(druckZeile(i18n.t("fieber_temp_label"), `${i18n.zahlNatuerlich(eingabe.fieber.temperaturC)} °C`));
    }

    liste.innerHTML = zeilen.join("");
    el("druck-eingaben").hidden = false;
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
    el("neatSchritte").value = gespeichert.neatSchritteId || "unter5000";
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

    const sportModus = gespeichert.sportModus === "met" ? "met" : "keine";
    setzeRadioFallsVorhanden("sportModus", sportModus);
    el("feld-met").hidden = sportModus !== "met";
    el("sportHaeufigkeit").value = gespeichert.sportHaeufigkeitId || "keinSport";
    anwendenMetUeberschreibung(sportModus === "met");
    stelleMetZeilenWieder(gespeichert.metZeilen);
    el("fidgetingAktiv").checked = !!gespeichert.fidgetingAktiv;

    el("laufAktiv").checked = !!gespeichert.laufAktiv;
    el("feld-lauf-km").hidden = !gespeichert.laufAktiv;
    el("laufKmWoche").value = gespeichert.laufKmWoche || "";
    aktualisiereStatusHinweis("hinweis-lauf-met", gespeichert.laufAktiv && Number(gespeichert.laufKmWoche) > 0);
    el("traegtTrackerBeimSport").checked = gespeichert.traegtTrackerBeimSport !== false;

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

    el("druckFussnote").value = gespeichert.druckFussnote || "";

    el("speichernAktiv").checked = true;
  }

  // ---- Init -------------------------------------------------------------

  function init() {
    initTabs();
    initConditionalFields();
    initMetListe();
    wendeSpracheAn();
    fuelleFormularAus(speicher.laden());

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        i18n.setSprache(btn.dataset.lang);
        wendeSpracheAn();
      });
    });

    el("calc-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const eingabe = leseFormular(event.target);
      if (!eingabe.age || !eingabe.heightCm || !eingabe.weightKg) {
        return;
      }
      if (!validiereEingabe(eingabe)) {
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

    el("printBtn").addEventListener("click", () => {
      const titelOriginal = document.title;
      const heute = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const datum = `${heute.getFullYear()}-${pad(heute.getMonth() + 1)}-${pad(heute.getDate())}`;
      // Browser schlagen im "Als PDF speichern"-Dialog meist document.title als Dateinamen vor.
      document.title = `${i18n.t("print_dateiname_praefix")}_${datum}`;

      el("druck-footer-datum").textContent = datum;
      el("druck-footer-text").textContent = el("druckFussnote").value.trim();
      el("druck-footer").hidden = false;

      window.print();
      window.addEventListener(
        "afterprint",
        () => {
          document.title = titelOriginal;
          el("druck-footer").hidden = true;
        },
        { once: true }
      );
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
