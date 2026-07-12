/**
 * @file Type guards and input sanitisers. Every value crossing a trust boundary
 * — API responses, localStorage reads, user text input — passes through here
 * before the rest of the app treats it as well-formed.
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate a single review object.
 * @param {unknown} value
 * @returns {value is import('../types.js').Review}
 */
export function isReview(value) {
  return (
    isObject(value) &&
    isFiniteNumber(value.rating) &&
    typeof value.comment === 'string' &&
    typeof value.reviewerName === 'string'
  );
}

/**
 * Validate the core shape of a product. Only the always-present, card-critical
 * fields are required. `images`/`reviews` are omitted from list responses (they
 * use `select`) and are defaulted by normalizeProduct, so they are NOT required
 * here — requiring them would wrongly reject every list/rail product.
 * @param {unknown} value
 * @returns {value is import('../types.js').Product}
 */
export function isProduct(value) {
  return (
    isObject(value) &&
    isFiniteNumber(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.category) &&
    isFiniteNumber(value.price) &&
    isNonEmptyString(value.thumbnail)
  );
}

/**
 * Validate a DummyJSON list response envelope.
 * @param {unknown} value
 * @returns {value is import('../types.js').ProductListResponse}
 */
export function isProductListResponse(value) {
  return (
    isObject(value) &&
    Array.isArray(value.products) &&
    isFiniteNumber(value.total)
  );
}

/**
 * Validate persisted wishlist state (schema v1).
 * @param {unknown} value
 * @returns {value is import('../types.js').WishlistStateV1}
 */
export function isWishlistStateV1(value) {
  if (!isObject(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.items) || !Array.isArray(value.collections)) return false;
  const itemsOk = value.items.every(
    (item) =>
      isObject(item) &&
      isFiniteNumber(item.id) &&
      typeof item.title === 'string' &&
      Array.isArray(item.collectionIds),
  );
  const collectionsOk = value.collections.every(
    (c) => isObject(c) && isNonEmptyString(c.id) && typeof c.name === 'string',
  );
  return itemsOk && collectionsOk;
}

/**
 * Validate the persisted quiz profile (schema v1).
 * @param {unknown} value
 * @returns {value is import('../types.js').QuizProfileV1}
 */
export function isQuizProfileV1(value) {
  return (
    isObject(value) &&
    value.version === 1 &&
    isObject(value.answers) &&
    isObject(value.categoryWeights) &&
    isObject(value.tagWeights) &&
    isObject(value.priceBand) &&
    isFiniteNumber(value.priceBand.minInr) &&
    isFiniteNumber(value.priceBand.maxInr)
  );
}

/**
 * Sanitise a free-text search query: trim, collapse whitespace, cap length.
 * @param {unknown} value
 * @param {number} [maxLength=80]
 * @returns {string}
 */
export function sanitizeSearch(value, maxLength = 80) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/**
 * Sanitise a collection name: trim and cap length; empty → null.
 * @param {unknown} value
 * @param {number} [maxLength=40]
 * @returns {string|null}
 */
export function sanitizeCollectionName(value, maxLength = 40) {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Coerce to a finite integer within [min, max]; returns fallback if unparseable.
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
export function clampInt(value, min, max, fallback) {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Parse a value from a fixed set of allowed strings, else fallback.
 * @template {string} T
 * @param {unknown} value
 * @param {ReadonlyArray<T>} allowed
 * @param {T} fallback
 * @returns {T}
 */
export function oneOf(value, allowed, fallback) {
  return allowed.includes(/** @type {T} */ (value)) ? /** @type {T} */ (value) : fallback;
}
