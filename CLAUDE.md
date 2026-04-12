# WGS Guide — Project Memory

Notes for future Claude sessions working on this repo. Not user-facing.

## What this is
Privacy-first static companion site for the NHS **Record of Discussion Regarding Genomic Testing** (form `01-NGIS-ROD` v4.03). Plain HTML/CSS/JS, no build step, no backend, no analytics. All state lives in `localStorage`.

## Original review (April 2026 session)
Initial walk-through of the codebase surfaced the following findings. Items marked ✅ were fixed in this session; unmarked items remain open and not yet approved by the user.

**Concept & design — what works**
- The "static, no build, no analytics" commitment is genuinely load-bearing for user trust in a clinical context. Don't break it.
- Design tokens + `[data-theme="dark"]` dark mode are cleanly separated; the CSS is readable.
- The 7-discussion-points wizard matches the official NHS form closely enough to be a useful prep tool, and the consent-basis branching (self / child / best-interests) correctly mirrors the real form's logic.
- FAQ sourcing from NHS.uk / Genomics England / Genetic Alliance UK is strong; 37 curated pairs is a sensible size.

**Correctness bugs found**
- ✅ `startNewForm` cleared `localStorage['wgs-rod-form']` but `saveFormData` wrote to `localStorage['rod-form-data']` — trio forms leaked previous patient data into new ones.
- ✅ Signature canvases reset their bitmap on every window resize (because `canvas.width = ...` wipes the drawing), so anyone who resized or rotated after signing lost their signature silently.
- ✅ HCP fields (`patient-cat`, `test-type`, `research-no`, `remote-consent`) were captured in the DOM but never persisted or exported to the PDF.
- ✅ Progress bar formula was wrong: hard-coded `33% / 66% / 100%` instead of `((step - 1) / 2) * 100`, so step 1 already showed a third complete.
- ✅ Step-1 validation highlighted errors but didn't scroll to or focus the first invalid field, which is bad on mobile.
- ✅ Accordion and expand-toggle buttons had no `aria-expanded` / `aria-controls` wiring.
- ✅ No `prefers-reduced-motion` handling — animations, particles, and the DNA helix all ran regardless.
- ✅ PDF generation went through `window.print()` of an HTML template, which is fragile (depends on user's print dialog, header/footer settings, "save as PDF" availability) and produced inconsistent output. Replaced with a proper jsPDF render path and kept the old route as fallback.

**Open items from the review**
- ✅ Split `js/form.js` into modules: `wizard.js`, `signature-pads.js`, `persistence.js`, `pdf-render.js`. (See "Form module layout" below.)
- Replace the hand-rolled scoring + Levenshtein search in `js/faq.js` with Fuse.js for better recall on typos and synonyms.
- Deduplicate the copy-pasted `<nav>` and `<footer>` across the 6 HTML pages. Options: a tiny JS include, or server-side templating at deploy time. Must preserve "works with view-source and file://" behaviour.
- Add a service worker for fully offline use (the site has no network dependencies beyond jsPDF on CDN — bundling jsPDF locally would make it 100% offline-capable).
- Multi-form trio dashboard: currently each family member's form overwrites the others in `localStorage`. A trio dashboard would let a mother/father/child each fill their own RoD and export all three in one session.
- Consider bundling jsPDF locally (vendor it in `js/vendor/`) instead of CDN-loading. Removes the one network dependency and makes the privacy claim airtight.

## Work completed this session
1. **Bug fixes** — the eight ✅ items above, all landed in `js/form.js`, `js/app.js`, `css/design-system.css`, and `form.html`.
2. **jsPDF migration** — added `loadJsPdf()` lazy loader, wrote `renderPdfDocument(doc, data)` with A4 layout, page numbers, timestamp footer, coloured acknowledgment pills, research choice boxes, declaration section with drawn marker shapes, signature blocks with embedded PNGs via `doc.addImage`, and an HCP section. Kept `buildPdfHtml` + `window.print()` as a graceful fallback when the CDN fetch fails.
3. **Declaration glyph bug** — discovered that `✓` (U+2713) and `⚠` (U+26A0) rendered as `'` and `&` through jsPDF's default WinAnsi encoding. `pdftotext -layout` surfaced this (it was invisible in visual inspection). Fixed by replacing the prefixed characters with drawn shapes: green filled squares with a white check line for confirmation items, red filled square for the warning. Text indented past the marker via `drawWrapped`'s `x` / `maxWidth` options.
4. **Smoke test harness** — created `/sessions/focused-ecstatic-edison/pdftest/smoke.js`. Mocks `document`, `window`, `localStorage`, and `Image`; pre-populates `window.jspdf` from `require('jspdf')` so `loadJsPdf` short-circuits; runs four scenarios (`self-all-acknowledged`, `self-some-missing`, `child-flow`, `best-interests-flow`) and writes PDFs next to the script. Verified each with `pdftotext -layout` after the glyph fix.
5. **Docs** — created this `CLAUDE.md` and rewrote `README.md` to reflect the current architecture (jsPDF path, signature embedding, reduced-motion, test harness, full project tree).

## Layout
- `index.html`, `understanding-wgs.html`, `pitfalls.html`, `resources.html`, `faq.html`, `form.html` — top-level pages
- `css/design-system.css` — tokens + dark mode (`[data-theme="dark"]`) + `prefers-reduced-motion` overrides
- `css/*.css` — per-page styles
- `js/app.js` — shared nav, theme toggle, accordions, scroll-reveal
- `js/form.js` — thin orchestrator: shared helpers (`debounce`, `showToast`), `startNewForm` reset, and the DOMContentLoaded bootstrap
- `js/wizard.js` — 3-step wizard state machine, progress bar, step-1 validation, discussion-point expand/collapse, research choice cards
- `js/signature-pads.js` — signature canvas setup with toDataURL snapshot-before-resize
- `js/persistence.js` — `rod-form-data` autosave / load (including HCP-only fields)
- `js/pdf-render.js` — jsPDF lazy loader, A4 render path, print fallback, email-to-clinician wiring
- `js/faq.js` — hand-rolled scoring search over 37 Q&A pairs with Levenshtein fuzzy matching
- `assets/` — images + the ROD PDF reference

### Form module loading
`form.html` loads the six form-related scripts in a strict order so that the orchestrator can reference functions from the other modules at runtime:

```html
<script src="js/app.js"></script>
<script src="js/signature-pads.js"></script>
<script src="js/persistence.js"></script>
<script src="js/pdf-render.js"></script>
<script src="js/wizard.js"></script>
<script src="js/form.js"></script>
```

Everything is plain `<script>` tags (no `type="module"`) because the site must work under `file://`, where ES modules are blocked. Functions live in the global scope — the same flat-globals pattern as `js/app.js`.

## Form architecture
The form logic is split across five files — `form.js` (orchestrator) plus four modules (`wizard.js`, `signature-pads.js`, `persistence.js`, `pdf-render.js`). See "Form module layout" below for the per-module responsibilities.

- 3-step wizard with progress bar. Progress formula: `((step - 1) / 2) * 100`. Lives in `wizard.js`.
- `goToStep(n)` is deliberately at module level in `wizard.js` (not nested inside `initFormSteps`) so `startNewForm` in `form.js` can reuse it when resetting the wizard. Don't re-nest it.
- `localStorage` key is **`rod-form-data`** (not `wgs-rod-form` — this caused a real bug; see history). All autosave logic is in `persistence.js`.
- Three signature canvases: `patientSig`, `guardianSig`, `hcpSig`. `setupSignaturePad` in `signature-pads.js` snapshots via `toDataURL` on resize so drawings survive window resizes; resize listener is debounced 150ms (the `debounce` helper lives in `form.js` and is resolved at runtime).
- Consent basis: `self` | `child` | `best-interests`. Non-self paths require guardian name + relationship and show a guardian signature pad.
- Discussion points: 7 items, each with an expand toggle (ARIA wired: `aria-expanded`, `aria-controls`) and an acknowledgment checkbox. All 7 must be ticked for the declaration to render without a warning.
- HCP section: `patient-cat` (checkbox group), `test-type` (radio), `research-no` reasons (checkbox group), `remote-consent` (radio). These are persisted and exported to the PDF — do not drop them.

### Form module layout
Each module is a flat set of globally-scoped functions that the orchestrator calls from `DOMContentLoaded`. There are no IIFE namespaces and no ES modules — plain `<script>` tags with a strict load order in `form.html`.

- **`js/form.js`** (~90 lines) — Thin entry point. Defines two shared helpers (`debounce`, `showToast`), the cross-cutting `startNewForm` reset (which clears `rod-form-data`, resets every widget, and walks the wizard back via `goToStep(1)`), and the `DOMContentLoaded` bootstrap that initialises the other modules in order. Any widget-specific logic belongs in a sibling module, not here.
- **`js/wizard.js`** (~180 lines) — `goToStep`, `initFormSteps`, `validateStep1` (with firstInvalid scroll/focus), `initDiscussionPoints` (ARIA wiring), `initChoiceCards`. Calls `saveFormData` at runtime from `initChoiceCards` — resolved at call time because `persistence.js` loads first.
- **`js/signature-pads.js`** (~110 lines) — `initSignaturePads`, `setupSignaturePad(canvasId, clearBtnId, padId)`. Self-contained except for the `debounce` helper it grabs from `form.js` at call time.
- **`js/persistence.js`** (~130 lines) — `initAutoSave`, `saveFormData`, `loadSavedData`. Owns the `rod-form-data` key. Uses `debounce` and `showToast` from `form.js` at runtime.
- **`js/pdf-render.js`** (~740 lines) — Everything jsPDF. `initPdfDownload` (wires `#download-pdf` and `#email-pdf`), `getConsentBasis`, `getFormDataForPdf`, `buildPdfHtml` (print fallback), the jsPDF lazy loader with memoised `_jsPdfPromise`, and `renderPdfDocument` with its nested layout primitives (`drawWrapped`, `drawSectionHeading`, `drawBox`, `drawChoiceBox`, `drawSignatureBlock`, etc.). This is where the drawn ✓ / ⚠ glyph workaround lives.

**Cross-module runtime dependencies** — some modules reference functions that are defined in later-loaded files. This works because the references are inside function bodies, not at parse time. If you re-shuffle load order or wrap anything in an IIFE, re-check that `debounce`, `showToast`, `saveFormData`, and `goToStep` are still reachable globally at call time.

## PDF generation
Two paths exist:

1. **jsPDF path (primary).** `generatePdf()` calls `loadJsPdf()` which lazy-loads jsPDF 2.5.1 UMD from cdnjs on demand, then `renderPdfDocument(doc, data)` lays out a proper A4 document with:
   - Header, patient details, consent basis box
   - All 7 discussion points with bold/green `ACKNOWLEDGED` or red `NOT ACKNOWLEDGED` pills
   - Research choice boxes (A/B)
   - Declaration of Understanding with per-line markers (see Unicode note below)
   - Signature blocks with embedded PNG images via `doc.addImage` (falls back to a dashed placeholder if no signature)
   - HCP-only section
   - Footer with `Page N of M` and a generation timestamp
   - Output filename: `RoD-<First>-<Last>.pdf`
2. **Print fallback.** If the CDN fetch fails, it degrades to `buildPdfHtml(data)` opened in a new window with `window.print()`. Keep both paths in sync when adding fields.

### jsPDF gotchas (learned the hard way)
- **Default font is WinAnsi (CP1252) encoded.** Characters outside that set render as garbage. Confirmed broken: `✓` (U+2713) → `'`, `⚠` (U+26A0) → `&`. Confirmed working: `\u2019` (right single quote) e.g. "patient's".
- **Do not put decorative Unicode glyphs in jsPDF text.** For the Declaration section we draw small filled squares with `doc.rect` (green with a drawn white check line for confirmations, red for the warning) and indent the text via `drawWrapped`'s `x` / `maxWidth` options. Keep that pattern if you add more items.
- `drawWrapped(text, opts)`, `drawLabelValue`, `drawSectionHeading`, `drawBox`, `ensureSpace(mm)` are the layout primitives — reuse them, don't reimplement.
- Colors are arrays: `BLUE`, `GREEN`, `RED`, `BLACK`. Helpers: `setColor` (text), `setDraw` (stroke), `setFill` (fill).
- `ensureSpace(h)` handles page breaks; always call it before any multi-line block you're about to draw.

## Accessibility
- `prefers-reduced-motion` disables animations, particles, DNA helix, scroll-reveal (block lives at the end of `design-system.css`).
- Accordions and discussion-point expand buttons sync `aria-expanded` on toggle.
- Step 1 validation scrolls + focuses the first invalid field (`firstInvalid`).

## Testing
There is no in-repo test harness. The bugfix session ran a Node smoke harness from an ephemeral sandbox (`/sessions/focused-ecstatic-edison/pdftest/smoke.js`) that mocked `document`/`window`/`localStorage`/`Image`, pre-populated `window.jspdf` from `require('jspdf')` so `loadJsPdf` short-circuited, ran four scenarios (`self-all-acknowledged`, `self-some-missing`, `child-flow`, `best-interests-flow`), and wrote PDFs to disk for inspection. That file is NOT in this repository and the path no longer exists.

If you re-create it, the important part is the verification step: use `pdftotext -layout <file> -` to catch glyph-encoding regressions. The WinAnsi issue (see "jsPDF gotchas" above) is invisible in visual inspection but shows up immediately in extracted text. Any future smoke harness should live under `pdftest/` at the repo root.

## Known future work
- Replace `faq.js` scoring search with Fuse.js (vendored locally, not via CDN)
- Deduplicate `<nav>` / `<footer>` across the 6 pages (currently copy-pasted) — must preserve `file://` behaviour, so DOM injection, not `fetch`-based includes
- PWA / service worker for fully offline use — gate registration on `https:` / `localhost` so `file://` is unaffected
- Vendor jsPDF locally under `js/vendor/` and drop the cdnjs load path
- Multi-form trio dashboard — namespaced `rod-form-data:<id>` keys, `dashboard.html` entry point, form wizard reads `?id=…`

## Things NOT to do
- Do **not** add a build step or framework. The README and the design both commit to "static, no build".
- Do **not** use localStorage key `wgs-rod-form`. Always `rod-form-data`.
- Do **not** put non-WinAnsi glyphs (`✓`, `⚠`, `✗`, `→`, emoji, etc.) inside jsPDF text — only inside the legacy `buildPdfHtml` path, which uses real HTML and handles them fine.
- Do **not** add network calls or analytics. Privacy guarantee is load-bearing for user trust.
- Do **not** re-declare signature canvas dimensions on every resize without snapshotting first — wipes the drawing.
