# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A calorie needs calculator (Kalorienbedarfsrechner), German-language UI. Deliberately client-side only: no server, no build step, no dependencies. All input and calculation happens in the browser; nothing is transmitted anywhere. Intended for static hosting on GitHub Pages directly from the repository root.

## Running

Open [index.html](index.html) directly in a browser, or serve the directory with any static file server. There is no build, bundle, or install step — do not introduce one (e.g. npm/Vite/webpack) unless the user explicitly asks for it, since "no server, runs locally in the browser" is a stated requirement, not an accidental omission.

## Architecture

Namespace pattern (`window.KBR = window.KBR || {}`) instead of ES modules, so the page keeps working when opened via `file://` (double-click, no server). Script load order in [index.html](index.html) matters because of this.

- [index.html](index.html) — two tabs ("Rechner" / "Methodik & Quellen"). Rechner tab: progressive-disclosure form (Kategorie A always visible, Kategorie B in a `<details>` block) plus a hidden result section revealed after submit. Methodik tab: static formula-sources list + info panel, both rendered from JS data at load time.
- [css/style.css](css/style.css) — all styling, CSS custom properties for the color palette, `@media print` with `@page { size: A4; }` for the PDF export. Contains a load-bearing `[hidden] { display: none !important; }` rule near the top — without it, any class that sets `display` (e.g. `.field { display: flex }`) silently wins over the browser's default `[hidden]{display:none}` because both have equal specificity and the author stylesheet loads after the UA one. Any new `[hidden]`-toggled element depends on that rule; don't remove it.
- `js/formeln.js` — REE formula registry (`REGISTRY`), five pure formula functions (Mifflin-St-Jeor, Cunningham 1991 / Katch-McArdle, Ten Haaf & Weijs 2014, Müller BMI-graduiert, Lührmann), each with a `quelle` citation. Also `ffmAusKfa` (derive fat-free mass from weight + body-fat %).
- `js/auswahl.js` — `selectREE(p)`, the precedence decision tree that picks a formula based on measured FFM / pregnancy / BMI extremes / age. Pure, no DOM.
- `js/modifikatoren.js` — modifier catalog classified by `wirkung: 'ree'|'pal'|'tee'|'hinweis'`, plus the axis-guard (`kombiniereReeFaktoren`) that prevents same-axis REE modifiers from multiplying together. `HINWEISE` holds the factors deliberately *not* computed (TEF, sleep duration, caffeine, luteal phase), each with its reason — shown to the user, never silently dropped.
- `js/berechnung.js` — the pipeline (REE_basis → REE_adj → PAL_adj → TEE → goal adjustment), the Root-Sum-Square uncertainty band, plausibility clamps, and the two extra reference values (fat-loss calories, protein needs for maintenance/growth — the latter switches its reference weight from total body weight to FFM when BMI ≥30 and FFM is known, per PLAN.md).
- `js/speicher.js` — opt-in `localStorage` persistence of raw form values (not results).
- `js/ui.js` — the only file touching the DOM: tab switching, conditional field visibility, reading the form into the pipeline's input shape, rendering results (including the inline-SVG bar/band graphics), wiring save/delete/print buttons.
- [tests.html](tests.html) — in-browser test runner (no npm), exercises `formeln.js`/`auswahl.js`/`modifikatoren.js`/`berechnung.js` directly. Open by double-click; results render as a pass/fail list in the page.

When changing the calculation, keep it in `formeln.js`/`auswahl.js`/`modifikatoren.js`/`berechnung.js` as plain functions of primitive values (no DOM access) — that's what makes `tests.html` possible. DOM work belongs only in `ui.js`.

The formula coefficients for Ten-Haaf, Müller, and Lührmann came from the user's own Gemini-assisted research (not independently re-derived here) — web search/fetch in this environment could not reliably extract exact published coefficients from the source papers (PDF table extraction produced physiologically implausible results, e.g. negative REE). If those coefficients ever need revisiting, don't re-trust an automated web fetch of the paper without sanity-checking the output against plausible REE values first.

## Conventions

- UI copy is in German; keep new user-facing strings consistent with that (labels, buttons, disclaimer). Never leak internal identifiers (function/variable names) into user-facing copy.
- No external requests, analytics, or third-party scripts — the "runs entirely local in the browser" constraint is a hard requirement from the project's purpose, not a style preference. The font stack (`Roboto, -apple-system, "Segoe UI", ...`) relies on locally installed fonts only, no web-font loading.
