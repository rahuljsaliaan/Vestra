/**
 * @file Catalog domain logic — pure, no I/O. A strategy registry of sort
 * comparators, a set of composable filter predicates, and facet extraction for
 * building the filter UI. Prices are compared in INR (converted once per call)
 * so filtering matches what the user sees.
 */

import { usdToInr } from '../utils/format.js';

/** Sort strategy ids. @readonly */
export const SORT = Object.freeze({
  RELEVANCE: 'relevance',
  PRICE_ASC: 'price-asc',
  PRICE_DESC: 'price-desc',
  RATING: 'rating',
  DISCOUNT: 'discount',
});

/** Sort options for the dropdown, in display order. @readonly */
export const SORT_OPTIONS = Object.freeze([
  { id: SORT.RELEVANCE, label: 'Relevance' },
  { id: SORT.PRICE_ASC, label: 'Price: low to high' },
  { id: SORT.PRICE_DESC, label: 'Price: high to low' },
  { id: SORT.RATING, label: 'Top rated' },
  { id: SORT.DISCOUNT, label: 'Biggest discount' },
]);

/** All valid sort ids, for validation. @type {ReadonlyArray<string>} */
export const SORT_IDS = Object.freeze(SORT_OPTIONS.map((o) => o.id));

/**
 * Strategy registry: sort id → comparator. RELEVANCE keeps the incoming order
 * (the caller supplies a relevance-ordered list).
 * @type {Readonly<Record<string, ((a: import('../types.js').Product, b: import('../types.js').Product) => number)|null>>}
 */
export const SORTERS = Object.freeze({
  [SORT.RELEVANCE]: null,
  [SORT.PRICE_ASC]: (a, b) => usdToInr(a.price) - usdToInr(b.price),
  [SORT.PRICE_DESC]: (a, b) => usdToInr(b.price) - usdToInr(a.price),
  [SORT.RATING]: (a, b) => b.rating - a.rating,
  [SORT.DISCOUNT]: (a, b) => b.discountPercentage - a.discountPercentage,
});

/**
 * @typedef {Object} CatalogFilters
 * @property {string} search
 * @property {string} category '' = all.
 * @property {number|null} minPrice INR, null = no bound.
 * @property {number|null} maxPrice INR, null = no bound.
 * @property {number} minRating 0 = any.
 * @property {string} brand '' = any.
 * @property {boolean} onSale
 * @property {string} sort
 */

/**
 * Apply filters then sort. Returns a new array; never mutates the input.
 * @param {import('../types.js').Product[]} products
 * @param {CatalogFilters} filters
 * @returns {import('../types.js').Product[]}
 */
export function applyCatalog(products, filters) {
  const needle = filters.search.trim().toLowerCase();

  const filtered = products.filter((product) => {
    const priceInr = usdToInr(product.price);
    if (filters.category && product.category !== filters.category) return false;
    if (filters.minPrice !== null && priceInr < filters.minPrice) return false;
    if (filters.maxPrice !== null && priceInr > filters.maxPrice) return false;
    if (filters.minRating > 0 && product.rating < filters.minRating) return false;
    if (filters.brand && (product.brand || '') !== filters.brand) return false;
    if (filters.onSale && !(product.discountPercentage > 0)) return false;
    if (needle) {
      const haystack = `${product.title} ${product.brand || ''} ${product.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const sorter = SORTERS[filters.sort];
  if (sorter) filtered.sort(sorter);
  return filtered;
}

/**
 * Extract filter facets from a product set: available brands (sorted, present
 * values only) and the INR price range.
 * @param {import('../types.js').Product[]} products
 * @returns {{ brands: string[], priceMin: number, priceMax: number }}
 */
export function extractFacets(products) {
  const brands = new Set();
  let priceMin = Infinity;
  let priceMax = 0;
  for (const product of products) {
    if (product.brand) brands.add(product.brand);
    const priceInr = usdToInr(product.price);
    if (priceInr < priceMin) priceMin = priceInr;
    if (priceInr > priceMax) priceMax = priceInr;
  }
  if (!Number.isFinite(priceMin)) priceMin = 0;
  return {
    brands: Array.from(brands).sort((a, b) => a.localeCompare(b)),
    priceMin: Math.floor(priceMin),
    priceMax: Math.ceil(priceMax),
  };
}
