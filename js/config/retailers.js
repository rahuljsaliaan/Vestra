/**
 * @file Retailer adapter registry. Each retailer owns how to turn a product into
 * an outbound deep link, because the stores differ (query-string vs path-style
 * URLs). This is the seam that lets a real affiliate API replace the simulated
 * offers later without touching the UI — only offers-service.js reads pricing;
 * link-building stays here.
 */

import { slugify } from '../utils/format.js';

/** Retailer ids. @readonly */
export const RETAILER_ID = Object.freeze({
  AMAZON: 'amazon',
  FLIPKART: 'flipkart',
  MYNTRA: 'myntra',
  AJIO: 'ajio',
  TATACLIQ: 'tatacliq',
});

/**
 * Build a product search query string from title (+ brand when present).
 * @param {import('../types.js').Product} product
 * @returns {string}
 */
function searchTerms(product) {
  return product.brand ? `${product.brand} ${product.title}` : product.title;
}

/**
 * The retailer adapters. `buildSearchUrl` returns a real, working search URL on
 * each store for the given product.
 * @type {ReadonlyArray<import('../types.js').Retailer>}
 */
export const RETAILERS = Object.freeze([
  {
    id: RETAILER_ID.AMAZON,
    name: 'Amazon',
    color: '#ff9900',
    buildSearchUrl: (product) =>
      `https://www.amazon.in/s?k=${encodeURIComponent(searchTerms(product))}`,
  },
  {
    id: RETAILER_ID.FLIPKART,
    name: 'Flipkart',
    color: '#2874f0',
    buildSearchUrl: (product) =>
      `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerms(product))}`,
  },
  {
    id: RETAILER_ID.MYNTRA,
    name: 'Myntra',
    color: '#ff3f6c',
    // Myntra is path-based, not query-based — hence slugify (see plan gotchas).
    buildSearchUrl: (product) => `https://www.myntra.com/${slugify(searchTerms(product))}`,
  },
  {
    id: RETAILER_ID.AJIO,
    name: 'Ajio',
    color: '#2f4a5e',
    buildSearchUrl: (product) =>
      `https://www.ajio.com/search/?text=${encodeURIComponent(searchTerms(product))}`,
  },
  {
    id: RETAILER_ID.TATACLIQ,
    name: 'Tata CLiQ',
    color: '#e11a2c',
    buildSearchUrl: (product) =>
      `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(searchTerms(product))}`,
  },
]);

/** Count kept as a named value for the offer simulation. */
export const RETAILER_COUNT = RETAILERS.length;
