/**
 * @file The persistent app chrome: header (brand, category nav, search entry,
 * wishlist badge, theme toggle) and footer, plus the global toast host. It is
 * mounted once at boot and lives outside the router outlet. It talks to the
 * rest of the app only through the user store and namespaced custom events, so
 * pages never import it.
 */

import { html, toElement, escapeHtml, raw, Disposer } from '../utils/dom.js';
import { EVENTS, STATE_CLASSES, THEME, TIMINGS, TOAST_LEVEL, LINKS } from '../config/constants.js';
import { ROUTE_ID, routeTo, QUERY_KEYS } from '../config/routes.js';
import { categoriesByGroup } from '../config/categories.js';
import { userStore } from '../state/user-store.js';

/** Icon glyphs kept together (SVG paths) to avoid inline-string sprawl. */
const ICONS = Object.freeze({
  heart: '<path d="M12 21s-7.5-4.6-10-9.3C.2 8.1 1.7 4.5 5.2 4.5c2 0 3.3 1.2 4 2.3.7-1.1 2-2.3 4-2.3 3.5 0 5 3.6 3.2 7.2C19.5 16.4 12 21 12 21z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
});

/**
 * Build the category mega-menu markup from the taxonomy.
 * @returns {import('../utils/dom.js').RawHtml}
 */
function renderNavMenu() {
  const groups = categoriesByGroup();
  return html`
    <div class="nav-menu" role="menu">
      ${groups.map(
        (group) => html`
          <div class="nav-menu__col">
            <a class="nav-menu__head" role="menuitem" href="${routeTo.shop({ [QUERY_KEYS.CATEGORY]: group.categories[0]?.slug })}">${group.label}</a>
            <ul class="nav-menu__list">
              ${group.categories.map(
                (cat) => html`
                  <li>
                    <a role="menuitem" href="${routeTo.shop({ [QUERY_KEYS.CATEGORY]: cat.slug })}">${cat.label}</a>
                  </li>
                `,
              )}
            </ul>
          </div>
        `,
      )}
    </div>
  `;
}

/**
 * @param {keyof typeof ICONS} name
 * @param {string} [label]
 * @returns {string} an inline SVG string.
 */
function icon(name, label) {
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${ICONS[name]}</svg>`;
}

/**
 * Mount the header, footer and toast host.
 * @param {Object} refs
 * @param {HTMLElement} refs.header
 * @param {HTMLElement} refs.footer
 * @param {HTMLElement} refs.toastHost
 * @returns {{ dispose: () => void }}
 */
export function mountLayout({ header, footer, toastHost }) {
  const disposer = new Disposer();

  const isDark = () => userStore.getTheme() === THEME.DARK;

  header.replaceChildren(
    toElement(html`
      <div class="header__inner">
        <button class="header__menu-btn" type="button" aria-label="Menu" aria-expanded="false">
          ${raw(icon('menu'))}
        </button>
        <a class="brand" href="${routeTo.home()}" aria-label="Outfit Buddy home">
          <span class="brand__mark">Outfit Buddy</span>
        </a>
        <nav class="header__nav" aria-label="Primary">
          <div class="header__nav-item has-menu">
            <a href="${routeTo.shop()}" class="header__link" data-route="${ROUTE_ID.SHOP}">Shop</a>
            ${renderNavMenu()}
          </div>
          <a href="${routeTo.edits()}" class="header__link" data-route="${ROUTE_ID.EDITS}">Edits</a>
          <a href="${routeTo.quiz()}" class="header__link" data-route="${ROUTE_ID.QUIZ}">Style Quiz</a>
          <a href="${LINKS.DOCS}" class="header__link header__link--docs" target="_blank" rel="noopener" title="Read the codebase documentation">Docs ↗</a>
        </nav>
        <div class="header__actions">
          <a class="header__icon-btn" href="${routeTo.shop()}" aria-label="Search">${raw(icon('search'))}</a>
          <a class="header__icon-btn header__wishlist" href="${routeTo.wishlist()}" aria-label="Wishlist">
            ${raw(icon('heart'))}
            <span class="header__badge ${STATE_CLASSES.HIDDEN}" data-wishlist-count aria-hidden="true">0</span>
          </a>
          <button class="header__icon-btn" type="button" data-theme-toggle aria-label="Toggle colour theme">
            ${raw(isDark() ? icon('sun') : icon('moon'))}
          </button>
        </div>
      </div>
    `),
  );

  footer.replaceChildren(
    toElement(html`
      <div class="footer__inner">
        <div class="footer__brand">
          <p class="footer__word">Outfit Buddy</p>
          <p class="footer__tag">Dressed for the occasion.</p>
        </div>
        <p class="footer__fine">
          Outfit Buddy suggests looks for your occasion, weather and style, then links out to Amazon,
          Flipkart, Myntra, Ajio and Tata CLiQ to shop. Prices shown are indicative and converted to INR
          for display.
        </p>
      </div>
    `),
  );

  // --- Theme toggle ---------------------------------------------------------
  const themeBtn = header.querySelector('[data-theme-toggle]');
  if (themeBtn instanceof HTMLElement) {
    disposer.listen(themeBtn, 'click', () => userStore.toggleTheme());
  }
  disposer.add(
    userStore.select(
      (s) => s.theme,
      (theme) => {
        const btn = header.querySelector('[data-theme-toggle]');
        if (btn) btn.innerHTML = theme === THEME.DARK ? icon('sun') : icon('moon');
      },
    ),
  );

  // --- Mobile menu ----------------------------------------------------------
  const menuBtn = header.querySelector('.header__menu-btn');
  const nav = header.querySelector('.header__nav');
  if (menuBtn instanceof HTMLElement && nav instanceof HTMLElement) {
    disposer.listen(menuBtn, 'click', () => {
      const open = nav.classList.toggle(STATE_CLASSES.OPEN);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    // Close the mobile menu after following a link.
    disposer.listen(nav, 'click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) {
        nav.classList.remove(STATE_CLASSES.OPEN);
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Wishlist badge (fed by a custom event; decoupled from the store) -----
  const badge = header.querySelector('[data-wishlist-count]');
  /** @param {number} count */
  const renderBadge = (count) => {
    if (!(badge instanceof HTMLElement)) return;
    badge.textContent = String(count);
    badge.classList.toggle(STATE_CLASSES.HIDDEN, count <= 0);
    badge.setAttribute('aria-hidden', String(count <= 0));
    if (count > 0) {
      badge.classList.remove(STATE_CLASSES.POPPING);
      void badge.offsetWidth; // restart the pop animation
      badge.classList.add(STATE_CLASSES.POPPING);
    }
  };
  disposer.listen(document, EVENTS.WISHLIST_CHANGED, (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    if (detail && typeof detail.count === 'number') renderBadge(detail.count);
  });

  // --- Header shadow on scroll ---------------------------------------------
  const onScroll = () => header.classList.toggle(STATE_CLASSES.SCROLLED, window.scrollY > 8);
  disposer.listen(window, 'scroll', onScroll, { passive: true });
  onScroll();

  // --- Toast host -----------------------------------------------------------
  disposer.listen(document, EVENTS.TOAST, (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail || {};
    showToast(toastHost, detail.message ?? '', detail.level ?? TOAST_LEVEL.INFO);
  });

  return { dispose: () => disposer.dispose() };
}

/**
 * Render a transient toast and auto-dismiss it.
 * @param {HTMLElement} host
 * @param {string} message
 * @param {string} level
 */
function showToast(host, message, level) {
  if (!message) return;
  const toast = toElement(html`<div class="toast toast--${level}" role="status">${message}</div>`);
  host.append(toast);
  requestAnimationFrame(() => toast.classList.add(STATE_CLASSES.ACTIVE));
  const remove = () => {
    toast.classList.remove(STATE_CLASSES.ACTIVE);
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Safety net if transitionend never fires.
    window.setTimeout(() => toast.remove(), TIMINGS.PAGE_TRANSITION_MS + 100);
  };
  window.setTimeout(remove, TIMINGS.TOAST_MS);
}

/**
 * Update the active-nav highlight for the current route.
 * @param {HTMLElement} header
 * @param {string} routeId
 */
export function setActiveNav(header, routeId) {
  header.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle(STATE_CLASSES.ACTIVE, link.getAttribute('data-route') === routeId);
  });
}
