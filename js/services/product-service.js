/**
 * @file Product service — the ONLY module that talks to DummyJSON. Composes the
 * HTTP client, the cache, and the validation guards into a small domain API the
 * pages consume. Every response is validated; anything malformed is dropped
 * (lists) or rejected (single product) rather than trusted downstream.
 */

import { endpoints, LIST_FIELDS } from '../config/api.js';
import { CATEGORIES, isFashionCategory } from '../config/categories.js';
import { fetchJson, HttpError } from './http.js';
import { cached } from './cache.js';
import { isProduct, isProductListResponse } from '../utils/validate.js';

/** Default page size for a single category (DummyJSON has ~5 each). */
const CATEGORY_FETCH_LIMIT = 30;

/**
 * Validate and normalise a raw product; returns null if it fails the guard.
 * @param {unknown} raw
 * @returns {import('../types.js').Product|null}
 */
function normalizeProduct(raw) {
  if (!isProduct(raw)) return null;
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    images: Array.isArray(raw.images) ? raw.images : [],
    discountPercentage: typeof raw.discountPercentage === 'number' ? raw.discountPercentage : 0,
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    stock: typeof raw.stock === 'number' ? raw.stock : 0,
  };
}

/**
 * Extract a validated Product[] from a raw list response.
 * @param {unknown} raw
 * @returns {import('../types.js').Product[]}
 */
function extractProducts(raw) {
  if (!isProductListResponse(raw)) return [];
  return raw.products.map(normalizeProduct).filter(/** @returns {p is import('../types.js').Product} */ (p) => p !== null);
}

/**
 * Fetch products in a category (cached).
 * @param {string} slug
 * @param {{signal?: AbortSignal, limit?: number}} [opts]
 * @returns {Promise<import('../types.js').Product[]>}
 */
export function getByCategory(slug, opts = {}) {
  const limit = opts.limit ?? CATEGORY_FETCH_LIMIT;
  const url = endpoints.category(slug, { limit, fields: LIST_FIELDS });
  return cached(url, async () => extractProducts(await fetchJson(url, { signal: opts.signal })));
}

/**
 * Fetch a single product with full detail (cached).
 * @param {number|string} id
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<import('../types.js').Product>}
 */
export function getById(id, opts = {}) {
  const url = endpoints.product(id);
  return cached(url, async () => {
    const product = normalizeProduct(await fetchJson(url, { signal: opts.signal }));
    if (!product) throw new HttpError('Product not found or malformed', { url });
    return product;
  });
}

/**
 * Full-text search, filtered to Outfit Buddy's fashion categories (DummyJSON's search
 * leaks phones, groceries, etc.).
 * @param {string} query
 * @param {{signal?: AbortSignal, limit?: number}} [opts]
 * @returns {Promise<import('../types.js').Product[]>}
 */
export function search(query, opts = {}) {
  const limit = opts.limit ?? 50;
  const url = endpoints.search(query, { limit, fields: LIST_FIELDS });
  return cached(url, async () => {
    const products = extractProducts(await fetchJson(url, { signal: opts.signal }));
    return products.filter((p) => isFashionCategory(p.category));
  });
}

/**
 * The full fashion pool: every category merged and de-duplicated. Cached under
 * a synthetic key so home/shop/personalization share one fetch.
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<import('../types.js').Product[]>}
 */
export function getAllFashion(opts = {}) {
  return cached('outfitbuddy:all-fashion', async () => {
    const lists = await Promise.all(
      CATEGORIES.map((c) => getByCategory(c.slug, { signal: opts.signal })),
    );
    /** @type {Map<number, import('../types.js').Product>} */
    const byId = new Map();
    for (const list of lists) {
      for (const product of list) byId.set(product.id, product);
    }
    return Array.from(byId.values());
  });
}
