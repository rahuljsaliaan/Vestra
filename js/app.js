/**
 * @file Application bootstrap. Grabs the shell elements, mounts the persistent
 * layout, registers the route → page-factory map, and starts the router. This
 * is the only entry point (loaded as a module from index.html).
 */

import { createRouter } from './router/router.js';
import { ROUTE_ID } from './config/routes.js';
import { mountLayout, setActiveNav } from './components/layout.js';
import { createHomePage } from './pages/home.js';
import { createShopPage } from './pages/shop.js';
import { createProductPage } from './pages/product.js';
import { createWishlistPage } from './pages/wishlist.js';
import { createQuizPage } from './pages/quiz.js';
import { createEditsPage, createEditStoryPage } from './pages/edits.js';
import { createNotFoundPage } from './pages/not-found.js';
import { initReveal } from './motion/reveal.js';
import { initEffects } from './motion/effects.js';
import { initWishlistInteractions } from './components/wishlist-interactions.js';

/**
 * Query a required element or throw a clear error.
 * @param {string} selector
 * @returns {HTMLElement}
 */
function requireEl(selector) {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`Vestra bootstrap: missing required element "${selector}".`);
  }
  return node;
}

function bootstrap() {
  const header = requireEl('#app-header');
  const outlet = requireEl('#app-main');
  const footer = requireEl('#app-footer');
  const toastHost = requireEl('#toast-host');

  mountLayout({ header, footer, toastHost });
  initReveal(outlet);
  initWishlistInteractions();

  /** @type {Record<string, () => import('./types.js').Page>} */
  const pageFactories = {
    [ROUTE_ID.HOME]: createHomePage,
    [ROUTE_ID.SHOP]: createShopPage,
    [ROUTE_ID.PRODUCT]: createProductPage,
    [ROUTE_ID.WISHLIST]: createWishlistPage,
    [ROUTE_ID.QUIZ]: createQuizPage,
    [ROUTE_ID.EDITS]: createEditsPage,
    [ROUTE_ID.EDIT_STORY]: createEditStoryPage,
  };

  const router = createRouter({
    outlet,
    pageFactories,
    notFoundFactory: createNotFoundPage,
    onNavigated: (match) => {
      setActiveNav(header, match.id);
      initEffects(outlet);
    },
  });

  // Expose for pages that need to reflect filter state into the hash.
  window.__vestraRouter = router;

  router.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
