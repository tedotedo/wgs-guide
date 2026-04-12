# WGS Guide

A static, privacy-first companion website for the **NHS Record of Discussion Regarding Genomic Testing** (form `01-NGIS-ROD`, v4.03). Helps patients and families prepare for whole genome sequencing conversations, work through the consent discussion points at their own pace, and take a filled-in summary into the clinic.

## Features

- Plain-language education on whole genome sequencing, trio testing, results, family implications, non-paternity disclosure, unexpected findings, and the ABI insurance code
- Interactive 3-step form wizard covering all three consent bases (self / child / best interests), with guardian and healthcare-professional sections
- Signature pads for patient, guardian, and clinician — drawings survive window resizes and are embedded directly into the generated PDF
- Real client-side PDF generation via jsPDF (vendored locally), with an A4 layout, page numbers, generation timestamp, coloured acknowledgment pills for each of the 7 discussion points, and a print-based fallback
- Trio dashboard for managing multiple forms per family (proband, mother, father) in a single session
- Curated FAQ with 37 Q&A pairs sourced from NHS.uk, Genomics England, and Genetic Alliance UK, with fuzzy search via Fuse.js
- Dark mode, full keyboard navigation, ARIA-wired accordions, and `prefers-reduced-motion` support
- Service worker for offline use — all assets vendored locally, no network dependencies
- Saved answers persist in `localStorage` so returning to the form resumes where you left off

## Privacy

No data is collected, stored off-device, or transmitted. Everything — including the signatures — lives in your browser's `localStorage` until you clear it. There are no analytics, no third-party scripts, and no backend. Both jsPDF and Fuse.js are vendored locally — the site makes zero network requests after initial load.

## Local development

No build step. Serve the directory with any static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

Fully static — deploy to Netlify, Cloudflare Pages, GitHub Pages, or any bucket. No environment variables, no secrets, no server.

## Project structure

```
RoD/
├── index.html, understanding-wgs.html, pitfalls.html,
│   resources.html, faq.html, form.html, dashboard.html
├── css/
│   ├── design-system.css     # tokens, dark mode, reduced-motion
│   ├── components.css        # buttons, cards, hero, forms, nav
│   └── pages.css             # per-page styles
├── js/
│   ├── chrome.js             # shared nav + footer (template literals)
│   ├── app.js                # theme toggle, hamburger, accordions
│   ├── faq.js                # FAQ fuzzy search via Fuse.js
│   ├── form.js               # form orchestrator + shared helpers
│   ├── wizard.js             # 3-step wizard state machine
│   ├── signature-pads.js     # signature canvas with resize protection
│   ├── persistence.js        # localStorage autosave/load
│   ├── pdf-render.js         # jsPDF A4 render + print fallback
│   ├── dashboard.js          # trio dashboard CRUD
│   └── vendor/               # Fuse.js 6.6.2 + jsPDF 2.5.1 (vendored)
├── sw.js                     # service worker (cache-first)
└── assets/                   # images + reference form PDF
```

## Disclaimer

For educational purposes only. This site is **not** an official NHS product and does not replace the statutory `01-NGIS-ROD` form, which must still be completed and signed in clinic. If you notice anything clinically inaccurate, please open an issue.
