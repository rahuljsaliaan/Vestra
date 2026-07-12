/**
 * @file Route definitions. Every hash path pattern, its human title, and the
 * typed builder functions that produce hrefs live here — no page or component
 * should ever hand-write a `#/...` string.
 */

const APP_NAME = 'Vestra';

/**
 * Route ids. Used as stable keys by the router and navigation.
 * @readonly
 */
export const ROUTE_ID = Object.freeze({
  HOME: 'home',
  SHOP: 'shop',
  PRODUCT: 'product',
  WISHLIST: 'wishlist',
  QUIZ: 'quiz',
  EDITS: 'edits',
  EDIT_STORY: 'edit-story',
  NOT_FOUND: 'not-found',
});

/**
 * Route table. `pattern` uses `:param` placeholders; the router compiles these
 * to regexes. Order matters: more specific patterns must precede looser ones.
 * @type {ReadonlyArray<{id:string, pattern:string, title:string}>}
 */
export const ROUTES = Object.freeze([
  { id: ROUTE_ID.HOME, pattern: '/', title: `${APP_NAME} — One closet. Every store.` },
  { id: ROUTE_ID.SHOP, pattern: '/shop', title: `Shop — ${APP_NAME}` },
  { id: ROUTE_ID.PRODUCT, pattern: '/product/:id', title: `${APP_NAME}` },
  { id: ROUTE_ID.WISHLIST, pattern: '/wishlist', title: `Wishlist — ${APP_NAME}` },
  { id: ROUTE_ID.QUIZ, pattern: '/quiz', title: `Style Quiz — ${APP_NAME}` },
  { id: ROUTE_ID.EDIT_STORY, pattern: '/edits/:slug', title: `Edits — ${APP_NAME}` },
  { id: ROUTE_ID.EDITS, pattern: '/edits', title: `The Edits — ${APP_NAME}` },
]);

/** Fallback title used when a route does not declare one. */
export const DEFAULT_TITLE = APP_NAME;

/** Query-parameter keys used by the shop page (kept here to avoid magic strings). @readonly */
export const QUERY_KEYS = Object.freeze({
  SEARCH: 'q',
  CATEGORY: 'category',
  SORT: 'sort',
  MIN_PRICE: 'min',
  MAX_PRICE: 'max',
  MIN_RATING: 'rating',
  BRAND: 'brand',
  ON_SALE: 'sale',
  PAGE: 'page',
});

/**
 * Build a hash href, optionally with a query object. Undefined/null/empty
 * query values are dropped so URLs stay clean.
 * @param {string} path
 * @param {Record<string, string|number|boolean|undefined|null>} [query]
 * @returns {string}
 */
function buildHref(path, query) {
  if (!query) return `#${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `#${path}?${qs}` : `#${path}`;
}

export const routeTo = Object.freeze({
  /** @returns {string} */
  home: () => buildHref('/'),
  /**
   * @param {Record<string, string|number|boolean|undefined|null>} [query]
   * @returns {string}
   */
  shop: (query) => buildHref('/shop', query),
  /**
   * @param {number|string} id
   * @returns {string}
   */
  product: (id) => buildHref(`/product/${encodeURIComponent(String(id))}`),
  /** @returns {string} */
  wishlist: () => buildHref('/wishlist'),
  /** @returns {string} */
  quiz: () => buildHref('/quiz'),
  /** @returns {string} */
  edits: () => buildHref('/edits'),
  /**
   * @param {string} slug
   * @returns {string}
   */
  editStory: (slug) => buildHref(`/edits/${encodeURIComponent(slug)}`),
});
