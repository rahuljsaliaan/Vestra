/**
 * @file API endpoint configuration. This is the ONLY module that assembles
 * DummyJSON URLs, so query encoding and field selection live in exactly one
 * place. If real retailer/affiliate APIs are wired in later (behind a proxy),
 * only this file and product-service.js change.
 */

/** DummyJSON base. */
export const API_BASE = 'https://dummyjson.com';

/**
 * Fields fetched for card/list/rail views — keeps payloads small. PDP fetches
 * the full product (no `select`) so images/description/reviews come through.
 * @type {ReadonlyArray<string>}
 */
export const LIST_FIELDS = Object.freeze([
  'id',
  'title',
  'price',
  'discountPercentage',
  'rating',
  'stock',
  'brand',
  'category',
  'tags',
  'thumbnail',
  'availabilityStatus',
]);

/**
 * Append a `select` list and pagination to a URLSearchParams.
 * @param {URLSearchParams} params
 * @param {{limit?: number, skip?: number, fields?: ReadonlyArray<string>}} [opts]
 */
function applyListParams(params, opts = {}) {
  if (typeof opts.limit === 'number') params.set('limit', String(opts.limit));
  if (typeof opts.skip === 'number') params.set('skip', String(opts.skip));
  if (opts.fields && opts.fields.length) params.set('select', opts.fields.join(','));
}

export const endpoints = Object.freeze({
  /**
   * Products in a category.
   * @param {string} slug
   * @param {{limit?: number, skip?: number, fields?: ReadonlyArray<string>}} [opts]
   * @returns {string}
   */
  category(slug, opts) {
    const params = new URLSearchParams();
    applyListParams(params, opts);
    const qs = params.toString();
    return `${API_BASE}/products/category/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`;
  },

  /**
   * Full-text search across all products (results must be whitelist-filtered).
   * @param {string} query
   * @param {{limit?: number, skip?: number, fields?: ReadonlyArray<string>}} [opts]
   * @returns {string}
   */
  search(query, opts) {
    const params = new URLSearchParams();
    params.set('q', query);
    applyListParams(params, opts);
    return `${API_BASE}/products/search?${params.toString()}`;
  },

  /**
   * A single product by id (full detail).
   * @param {number|string} id
   * @returns {string}
   */
  product(id) {
    return `${API_BASE}/products/${encodeURIComponent(String(id))}`;
  },
});
