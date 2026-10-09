/* WGS Record of Discussion — Global JavaScript */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initScrollAnimations();
  initAccordions();
  initCookieBanner();
  registerServiceWorker();
});

/* ============ SERVICE WORKER ============
 * Register sw.js for fully-offline use when served over HTTP(S).
 * Protocol-gated: service workers are blocked on file:// anyway, but
 * the gate keeps the console clean when the site is opened directly
 * from disk — a first-class use case for this privacy-focused tool.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const { protocol, hostname } = window.location;
  const allowedHost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (protocol !== 'https:' && !allowedHost) return;
  // Delay the registration slightly so it does not compete with the
  // initial page render for bandwidth or main-thread time.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

/* ============ THEME TOGGLE ============ */
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  const saved = localStorage.getItem('rod-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', 'dark');

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rod-theme', next);
  });
}

/* ============ NAVIGATION ============ */
function initNav() {
  const nav = document.querySelector('.nav');
  const hamburger = document.getElementById('nav-hamburger');
  const links = document.getElementById('nav-links');
  const backdrop = document.getElementById('nav-backdrop');
  if (!nav) return;

  // Scroll effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // Hamburger
  if (hamburger && links) {
    hamburger.addEventListener('click', () => {
      links.classList.toggle('open');
      const isOpen = links.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (backdrop) backdrop.classList.toggle('open', isOpen);
    });

    // Close on link click
    links.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        if (backdrop) backdrop.classList.remove('open');
      });
    });
  }

  // Close nav when backdrop is clicked
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      links.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      backdrop.classList.remove('open');
    });
  }

  // Active-link highlighting is handled by chrome.js at injection
  // time (it applies `.active` and `aria-current="page"`). No need
  // to duplicate the logic here.
}

/* ============ SCROLL ANIMATIONS ============ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* ============ ACCORDIONS ============ */
function initAccordions() {
  document.querySelectorAll('.accordion__header').forEach(header => {
    // Ensure accessibility attributes start in sync with visual state
    const accordion = header.closest('.accordion');
    const initiallyOpen = accordion?.classList.contains('open') || false;
    header.setAttribute('aria-expanded', String(initiallyOpen));

    header.addEventListener('click', () => {
      if (!accordion) return;
      const wasOpen = accordion.classList.contains('open');
      accordion.classList.toggle('open', !wasOpen);
      header.setAttribute('aria-expanded', String(!wasOpen));
    });
  });
}

/* ============ COOKIE BANNER ============ */
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner || localStorage.getItem('rod-cookies-accepted')) return;

  banner.classList.add('visible');

  const acceptBtn = document.getElementById('cookie-accept');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('rod-cookies-accepted', 'true');
      banner.classList.remove('visible');
    });
  }
}

/* ============ HELPERS ============ */
function getNavHTML() {
  return `
  <a href="#main" class="skip-to-content">Skip to main content</a>
  <nav class="nav" role="navigation" aria-label="Main navigation">
    <div class="nav__inner">
      <a href="index.html" class="nav__brand" aria-label="WGS Guide Home">
        <div class="nav__brand-icon">🧬</div>
        <div class="nav__brand-text"><span>WGS</span> Guide</div>
      </a>
      <ul class="nav__links" id="nav-links" role="menubar">
        <li role="none"><a href="index.html" class="nav__link" role="menuitem">Home</a></li>
        <li role="none"><a href="understanding-wgs.html" class="nav__link" role="menuitem">Understanding WGS</a></li>
        <li role="none"><a href="pitfalls.html" class="nav__link" role="menuitem">Important Information</a></li>
        <li role="none"><a href="form.html" class="nav__link" role="menuitem">Complete Form</a></li>
        <li role="none"><a href="faq.html" class="nav__link" role="menuitem">FAQ</a></li>
        <li role="none"><a href="resources.html" class="nav__link" role="menuitem">Resources</a></li>
      </ul>
      <div class="nav__actions">
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">
          <svg class="icon-moon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <svg class="icon-sun" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>
        <button class="nav__hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
    </div>
  </nav>`;
}

function getFooterHTML() {
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
      <p>This website is for educational purposes. It is based on the NHS Genomic Medicine Service Record of Discussion form (01-NGIS-ROD v4.04). Always consult your healthcare professional for personalised advice. &copy; ${new Date().getFullYear()}</p>
    </div>
  </footer>
  <div class="cookie-banner" id="cookie-banner">
    <div class="cookie-banner__inner">
      <p class="cookie-banner__text">This site uses local storage to save your form progress and theme preference. No data is sent to external servers.</p>
      <div class="cookie-banner__actions">
        <button class="btn btn--primary btn--sm" id="cookie-accept">Accept</button>
      </div>
    </div>
  </div>`;
}

// Video placeholder helper
function videoPlaceholder(id, label) {
  return `
  <div class="video-placeholder" id="video-${id}" role="button" tabindex="0" aria-label="Watch video: ${label}">
    <div class="video-placeholder__overlay">
      <div class="video-placeholder__play">
        <svg fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
      <span class="video-placeholder__label">🎥 ${label} — Video coming soon</span>
    </div>
  </div>`;
}
