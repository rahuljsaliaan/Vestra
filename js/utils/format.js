/**
 * @file Formatting helpers: USD→INR display conversion, INR currency
 * formatting (en-IN), discount maths, charm-price rounding, slugify and dates.
 * Currency logic lives here so the whole app renders prices consistently.
 */

import { PRICING } from '../config/constants.js';

const inrFormatter = new Intl.NumberFormat(PRICING.LOCALE, {
  style: 'currency',
  currency: PRICING.CURRENCY,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat(PRICING.LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Convert a USD price to INR using the display-only rate, rounded to a charm
 * ending (…99) for a retail feel.
 * @param {number} usd
 * @returns {number} whole INR rupees.
 */
export function usdToInr(usd) {
  const raw = usd * PRICING.USD_TO_INR_DISPLAY_RATE;
  return roundToCharm(raw);
}

/**
 * Round a rupee amount up to the nearest value ending in the charm digits
 * (e.g. 1440 → 1499), keeping small amounts sensible.
 * @param {number} amount
 * @returns {number}
 */
export function roundToCharm(amount) {
  if (amount <= PRICING.CHARM_ENDING) return Math.max(0, Math.round(amount));
  // Round to the NEAREST hundred, then drop to the charm ending (…99).
  const nearestHundred = Math.round(amount / 100) * 100;
  return nearestHundred - (100 - PRICING.CHARM_ENDING);
}

/**
 * Format a rupee amount as INR currency (₹1,499).
 * @param {number} inr
 * @returns {string}
 */
export function formatInr(inr) {
  return inrFormatter.format(Math.max(0, Math.round(inr)));
}

/**
 * Compact number format (e.g. 12.3k) for counts.
 * @param {number} value
 * @returns {string}
 */
export function formatCompact(value) {
  return compactFormatter.format(value);
}

/**
 * The INR price before a discount, derived from the discounted price and the
 * discount percentage. DummyJSON's `price` is treated as the discounted price.
 * @param {number} inrPrice discounted INR price.
 * @param {number} discountPercentage
 * @returns {number} original (struck-through) INR price.
 */
export function originalInr(inrPrice, discountPercentage) {
  if (!discountPercentage || discountPercentage <= 0) return inrPrice;
  const factor = 1 - discountPercentage / 100;
  if (factor <= 0) return inrPrice;
  return roundToCharm(inrPrice / factor);
}

/**
 * Round a percentage for display.
 * @param {number} value
 * @returns {number}
 */
export function roundPercent(value) {
  return Math.round(value);
}

/**
 * Slugify a string for path-style URLs and ids.
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format an ISO date string as a short readable date.
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(PRICING.LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/**
 * A relative delivery phrase from a day count.
 * @param {number} days
 * @returns {string}
 */
export function deliveryPhrase(days) {
  if (days <= 1) return 'Delivery by tomorrow';
  return `Delivery in ${days} days`;
}
