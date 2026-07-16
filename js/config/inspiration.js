/**
 * @file Fashion-inspiration link adapter. Mirrors the retailer-adapter pattern
 * (config/retailers.js): a single place that builds outbound "get inspired"
 * URLs, so the destination (Pinterest today) can change without touching the UI.
 */

const PINTEREST_SEARCH = 'https://www.pinterest.com/search/pins/?q=';

/**
 * Build a fashion-inspiration search URL from free-text terms.
 * @param {string} terms
 * @returns {string}
 */
export function buildInspirationUrl(terms) {
  return `${PINTEREST_SEARCH}${encodeURIComponent(terms.trim())}`;
}

/** Human name of the inspiration destination, for link labels. */
export const INSPIRATION_SOURCE = 'Pinterest';
