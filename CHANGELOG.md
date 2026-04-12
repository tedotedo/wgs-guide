# Changelog

All notable changes to the WGS Guide are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and the project aims to follow [Semantic Versioning](https://semver.org/) once tagged releases begin.

## [Unreleased]

### Changed
- **Split `js/form.js` into four modules.** The monolithic `form.js` (1188 lines after the bugfix session) is now a ~90-line orchestrator that only defines shared helpers (`debounce`, `showToast`), the cross-cutting `startNewForm` reset, and the `DOMContentLoaded` bootstrap. The rest has moved to dedicated modules: `js/wizard.js` (3-step state machine, step-1 validation, discussion-point expand/collapse, choice cards), `js/signature-pads.js` (canvas setup with snapshot-before-resize), `js/persistence.js` (autosave / load against `rod-form-data`), and `js/pdf-render.js` (jsPDF lazy loader, A4 render path, print fallback, email wiring). `goToStep` is promoted to module level in `wizard.js` so `startNewForm` can reuse it cleanly. Everything stays as plain `<script>` tags with a strict load order in `form.html` — no ES modules, no IIFE namespaces, no build step, fully behaviour-preserving under `file://`.

### Added
- **Real client-side PDF generation** via jsPDF 2.5.1 (lazy-loaded from cdnjs on demand). The generated file is a proper A4 document with page numbers, a generation timestamp, coloured acknowledgment pills for each of the 7 discussion points, research choice boxes, a declaration section, signature blocks with embedded PNG images, and a healthcare-professional section. The previous `window.print()` route is retained as a graceful fallback for when the CDN cannot be reached.
- **Signature embedding.** Patient, guardian, and HCP signature canvases are exported as PNG via `toDataURL` and added directly to the PDF through `doc.addImage`. If a pad has no drawing, a dashed placeholder is rendered instead.
- **`prefers-reduced-motion` support.** A media query block at the end of `css/design-system.css` disables animations, transitions, the particle field, the DNA helix, and scroll-reveal for users who have requested reduced motion at the OS level.
- **ARIA wiring on accordions and expand toggles.** All accordions (FAQ, pitfalls, etc.) and the 7 discussion-point expanders now sync `aria-expanded` and use `aria-controls` to reference their panel.
- **Smoke test harness** at `pdftest/smoke.js`. Mocks `document`, `window`, `localStorage`, and `Image`; pre-populates `window.jspdf` from the installed jsPDF package; runs four scenarios (all acknowledged, some missing, child flow, best-interests flow) and writes PDFs to disk for inspection via `pdftotext -layout`.
- **`CLAUDE.md`** project-memory file for future maintenance sessions, and a rewritten `README.md` reflecting the current architecture.

### Fixed
- **localStorage key mismatch.** `startNewForm` was clearing `wgs-rod-form` while `saveFormData` was writing to `rod-form-data`, so starting a new form for a second family member left the first member's data in place. Aligned both call sites on `rod-form-data`.
- **Signature canvases wiped on window resize.** Every resize reran `canvas.width = …`, which blanks the drawing buffer. `setupSignaturePad` now snapshots the canvas via `toDataURL` before adjusting dimensions, skips the reset if nothing actually changed, and restores the drawing afterwards through an `Image` + `drawImage` round-trip. The resize listener is debounced to 150 ms.
- **HCP-only fields dropped on export.** `patient-cat` (patient category checkboxes), `test-type` (radio), `research-no` (reasons checkboxes), and `remote-consent` (radio) were read from the DOM but never persisted into `localStorage` or written out to the generated PDF. They are now wired through `saveFormData`, `loadSavedData`, `getFormDataForPdf`, and both PDF render paths.
- **Progress bar formula.** Step 1 was rendering as `33%` complete instead of `0%`. Replaced the hard-coded percentages with `((step - 1) / 2) * 100` and set the initial inline width on the bar in `form.html` to `0%`.
- **Step 1 validation did not scroll to the first error.** Submitting an incomplete first step highlighted the invalid fields but left the viewport where it was, which was particularly bad on mobile. Validation now tracks the first invalid field, scrolls it into view, and focuses it (`{ preventScroll: true }`).
- **Declaration of Understanding glyph rendering.** jsPDF's default font uses WinAnsi (CP1252) encoding, which does not contain `✓` (U+2713) or `⚠` (U+26A0) — those characters were silently rendering as `'` and `&` in the generated PDFs (invisible on-screen but caught by `pdftotext -layout`). Replaced the inline glyphs with drawn shapes: green filled squares with a white check line for confirmation items, and a red filled square for the "not all acknowledged" warning. Text is indented past the marker through `drawWrapped`'s `x` / `maxWidth` options.

### Known limitations / future work
- `js/faq.js` currently uses a hand-rolled scoring search with Levenshtein fuzzy matching. Swapping it for Fuse.js would improve recall on typos and synonyms.
- `<nav>` and `<footer>` are copy-pasted across the 6 HTML pages. Deduplicating them (via a tiny JS include or a build-time template) would reduce drift, provided the "works with `file://` and view-source" property is preserved.
- A service worker would make the site usable fully offline. Vendoring jsPDF locally under `js/vendor/` instead of loading it from cdnjs would eliminate the last network dependency and tighten the privacy story.
- Currently each family member's form overwrites the others in `localStorage`. A multi-form "trio dashboard" would let mother, father, and child fill independent RoDs and export all three in one session.
