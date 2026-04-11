# WGS Guide

A static, privacy-first companion website for the **NHS Record of Discussion Regarding Genomic Testing** (form `01-NGIS-ROD`, v4.03). Helps patients and families prepare for whole genome sequencing conversations, work through the consent discussion points at their own pace, and take a filled-in summary into the clinic.

## Features

- Plain-language education on whole genome sequencing, trio testing, results, family implications, non-paternity disclosure, unexpected findings, and the ABI insurance code
- Interactive 3-step form wizard covering all three consent bases (self / child / best interests), with guardian and healthcare-professional sections
- Signature pads for patient, guardian, and clinician — drawings survive window resizes and are embedded directly into the generated PDF
- Real client-side PDF generation via jsPDF, with an A4 layout, page numbers, generation timestamp, coloured acknowledgment pills for each of the 7 discussion points, and a print-based fallback if the CDN is unavailable
- Curated FAQ with 37 Q&A pairs sourced from NHS.uk, Genomics England, and Genetic Alliance UK, with local fuzzy search
- Dark mode, full keyboard navigation, ARIA-wired accordions, and `prefers-reduced-motion` support
- Saved answers persist in `localStorage` so returning to the form resumes where you left off

## Privacy

No data is collected, stored off-device, or transmitted. Everything — including the signatures — lives in your browser's `localStorage` until you clear it. There are no analytics, no third-party scripts beyond the jsPDF library loaded on demand from a public CDN, and no backend.

## Local development

No build step. Serve the directory with any static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Testing the PDF pipeline

A Node smoke test lives in `../pdftest/` and covers four scenarios (all acknowledged, some missing, child flow, best-interests flow). It writes PDFs to disk for visual inspection and uses `pdftotext` for text-level regression checks:

```bash
cd ../pdftest && node smoke.js
```

## Deployment

Fully static — deploy to Netlify, Cloudflare Pages, GitHub Pages, or any bucket. No environment variables, no secrets, no server.

## Project structure

```
RoD/
├── index.html, understanding-wgs.html, pitfalls.html,
│   resources.html, faq.html, form.html
├── css/
│   ├── design-system.css     # tokens, dark mode, reduced-motion
│   └── *.css                 # per-page styles
├── js/
│   ├── app.js                # nav, theme, accordions, scroll-reveal
│   ├── faq.js                # local FAQ search
│   └── form.js               # wizard, signature pads, PDF generation
└── assets/                   # images + reference form PDF
```

## Disclaimer

For educational purposes only. This site is **not** an official NHS product and does not replace the statutory `01-NGIS-ROD` form, which must still be completed and signed in clinic. If you notice anything clinically inaccurate, please open an issue.
