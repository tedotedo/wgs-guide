/* WGS Record of Discussion — Page Chrome (nav + footer)
 *
 * Single source of truth for the site header and footer. Each page
 * declares two placeholder containers:
 *
 *   <div id="site-nav"></div>
 *   <div id="site-footer"></div>
 *
 * ...and loads this file BEFORE `js/app.js` so the real elements
 * exist by the time app.js looks for `#theme-toggle` and
 * `#nav-hamburger`. The script is synchronous and runs at parse
 * time (no DOMContentLoaded wrapper): the placeholder divs are
 * already in the DOM by the time the <script> tag at the bottom of
 * the <body> is evaluated.
 *
 * DOM injection is deliberate — `fetch()`-based includes don't work
 * under `file://` in every browser, and one of the project's hard
 * constraints is that the site has to keep working when served from
 * a local file path. Inlined template literals sidestep that.
 *
 * The active link is highlighted based on `location.pathname` so
 * the navigation reflects the current page without per-page tweaks.
 */

(function () {
  // Canonical link set. Order matches what was previously duplicated
  // across the six HTML files. Keep labels in sync with the copy on
  // the live site; the active class is applied by matching `page`
  // against `location.pathname`.
  const NAV_LINKS = [
    { page: 'index.html',            label: 'Home' },
    { page: 'understanding-wgs.html', label: 'Understanding WGS' },
    { page: 'pitfalls.html',          label: 'Important Information' },
    { page: 'form.html',              label: 'Complete Form' },
    { page: 'faq.html',               label: 'FAQ' },
    { page: 'resources.html',         label: 'Resources' }
  ];

  function currentPage() {
    // location.pathname ends with `/` for directory-served roots;
    // default to index.html so the home link gets the active state.
    const path = (location.pathname || '').split('/').pop();
    return path && path.length ? path : 'index.html';
  }

  function renderNav() {
    const here = currentPage();
    const items = NAV_LINKS.map(link => {
      const activeAttr = link.page === here ? ' aria-current="page"' : '';
      // CSS uses `.nav__link.active`, not BEM modifier. Do not rename
      // without also touching css/components.css.
      const activeCls = link.page === here ? ' active' : '';
      return `<li role="none"><a href="${link.page}" class="nav__link${activeCls}" role="menuitem"${activeAttr}>${link.label}</a></li>`;
    }).join('');

    return `
      <nav class="nav" role="navigation" aria-label="Main navigation">
        <div class="nav__inner">
          <a href="index.html" class="nav__brand" aria-label="WGS Guide Home">
            <div class="nav__brand-icon">🧬</div>
            <div class="nav__brand-text"><span>WGS</span> Guide</div>
          </a>
          <ul class="nav__links" id="nav-links" role="menubar">
            ${items}
          </ul>
          <div class="nav__actions">
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">
              <svg class="icon-moon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <svg class="icon-sun" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
            <button class="nav__hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  function renderFooter() {
    return `
      <footer class="footer">
        <div class="footer__inner">
          <div>
            <div class="footer__brand">🧬 WGS Guide</div>
            <p class="footer__desc">A companion guide for the NHS Record of Discussion Regarding Genomic Testing form, helping patients and healthcare professionals understand whole genome sequencing.</p>
          </div>
          <div>
            <div class="footer__heading">Navigate</div>
            <ul class="footer__list">
              <li><a href="understanding-wgs.html">Understanding WGS</a></li>
              <li><a href="pitfalls.html">Important Information</a></li>
              <li><a href="form.html">Complete Form</a></li>
              <li><a href="faq.html">FAQ</a></li>
            </ul>
          </div>
          <div>
            <div class="footer__heading">Resources</div>
            <ul class="footer__list">
              <li><a href="https://www.nhs.uk/conditions/genetics/" target="_blank" rel="noopener">NHS Genetics</a></li>
              <li><a href="https://www.genomicsengland.co.uk/" target="_blank" rel="noopener">Genomics England</a></li>
              <li><a href="https://www.genomicseducation.hee.nhs.uk/" target="_blank" rel="noopener">Genomics Education</a></li>
              <li><a href="resources.html">All Resources</a></li>
            </ul>
          </div>
          <div>
            <div class="footer__heading">Support</div>
            <ul class="footer__list">
              <li><a href="https://www.geneticalliance.org.uk/" target="_blank" rel="noopener">Genetic Alliance UK</a></li>
              <li><a href="https://www.raredisease.org.uk/" target="_blank" rel="noopener">Rare Disease UK</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <p>This website is for educational purposes. Based on the NHS Genomic Medicine Service Record of Discussion form (01-NGIS-ROD v4.03). Always consult your healthcare professional for personalised advice.</p>
        </div>
      </footer>
    `;
  }

  function mount() {
    const navSlot = document.getElementById('site-nav');
    if (navSlot && !navSlot.dataset.mounted) {
      navSlot.outerHTML = renderNav();
    }
    const footerSlot = document.getElementById('site-footer');
    if (footerSlot && !footerSlot.dataset.mounted) {
      footerSlot.outerHTML = renderFooter();
    }
  }

  // Run immediately. Scripts are loaded at the end of <body> so the
  // placeholder divs are already parsed and available.
  mount();
})();
