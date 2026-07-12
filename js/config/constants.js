/**
 * @file Central application constants. Single source of truth for every
 * "magic" value in the app — timings, network tuning, cache policy, pricing,
 * pagination, storage keys, custom event names and CSS state-class names.
 *
 * Rule of the codebase: no other module may inline a string/number that carries
 * meaning. Import from here (or from the more specialised config modules that
 * build on these) instead.
 */

/** Time-related tuning, all in milliseconds. @readonly */
export const TIMINGS = Object.freeze({
  SEARCH_DEBOUNCE_MS: 300,
  SKELETON_MIN_MS: 350,
  TOAST_MS: 3200,
  PAGE_TRANSITION_MS: 420,
  HEART_POP_MS: 480,
  COUNTER_DURATION_MS: 1400,
});

/** HTTP client tuning. @readonly */
export const HTTP = Object.freeze({
  TIMEOUT_MS: 8000,
  MAX_RETRIES: 2,
  BACKOFF_BASE_MS: 400,
  BACKOFF_JITTER_MS: 150,
  RETRYABLE_STATUS_MIN: 500,
});

/** Response cache policy. @readonly */
export const CACHE = Object.freeze({
  TTL_MS: 5 * 60 * 1000,
  SESSION_PREFIX: 'vestra.cache.',
});

/**
 * Pricing/currency. The rate is a DISPLAY-ONLY approximation used to render
 * DummyJSON's USD prices in INR — it is not a live FX rate and the name says so.
 * @readonly
 */
export const PRICING = Object.freeze({
  USD_TO_INR_DISPLAY_RATE: 84,
  CURRENCY: 'INR',
  LOCALE: 'en-IN',
  /** Prices are rounded to end in this value (e.g. ₹1,499) for a retail feel. */
  CHARM_ENDING: 99,
});

/** Catalog pagination. @readonly */
export const PAGINATION = Object.freeze({
  PAGE_SIZE: 12,
});

/**
 * Bounds for the deterministic cross-store offer simulation. See
 * services/offers-service.js.
 * @readonly
 */
export const OFFERS = Object.freeze({
  /** Per-retailer price multiplier range applied to the base INR price. */
  VARIATION_MIN: 0.97,
  VARIATION_MAX: 1.06,
  /** Extra multiplier applied to the single guaranteed-cheapest retailer. */
  BEST_PRICE_MULTIPLIER: 0.94,
  /** Probability a non-best retailer is shown out of stock. */
  OOS_PROBABILITY: 0.15,
  DELIVERY_MIN_DAYS: 2,
  DELIVERY_MAX_DAYS: 7,
});

/**
 * localStorage keys. The schema version lives in the key so a breaking schema
 * change becomes a new key (old data is simply ignored, never mis-parsed).
 * @readonly
 */
export const STORAGE_KEYS = Object.freeze({
  WISHLIST: 'vestra.wishlist.v1',
  QUIZ: 'vestra.quiz.v1',
  THEME: 'vestra.theme.v1',
});

/** Namespaced custom DOM event names for fire-and-forget UI messaging. @readonly */
export const EVENTS = Object.freeze({
  TOAST: 'vestra:toast',
  WISHLIST_CHANGED: 'vestra:wishlist-changed',
  THEME_CHANGED: 'vestra:theme-changed',
  NAVIGATE: 'vestra:navigate',
});

/** CSS class names used to toggle state from JS. @readonly */
export const STATE_CLASSES = Object.freeze({
  ACTIVE: 'is-active',
  LOADING: 'is-loading',
  REVEALED: 'is-revealed',
  OPEN: 'is-open',
  DRAGGING: 'is-dragging',
  HIDDEN: 'is-hidden',
  SELECTED: 'is-selected',
  LOADED: 'is-loaded',
  ERROR: 'is-error',
  POPPING: 'is-popping',
  SCROLLED: 'is-scrolled',
});

/** Theme identifiers and the attribute they are written to on <html>. @readonly */
export const THEME = Object.freeze({
  ATTRIBUTE: 'data-theme',
  LIGHT: 'light',
  DARK: 'dark',
});

/** Toast severity levels. @readonly */
export const TOAST_LEVEL = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
});

/**
 * External destinations that live outside the hash router (opened as real
 * links, not routed). Relative to index.html — served from the project root,
 * so the docs site sits at `docs/`.
 * @readonly
 */
export const LINKS = Object.freeze({
  DOCS: 'docs/',
});
