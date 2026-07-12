/**
 * @file Cross-store offer simulation. DummyJSON has no per-retailer prices, so
 * we synthesise them deterministically from a hash of (productId, retailerId):
 * identical on every reload, "random-feeling" across products. One retailer per
 * product is the guaranteed cheapest (and always in stock, so the best-price CTA
 * always works). Deep links come from each retailer adapter. This is the only
 * module that would change if a real affiliate/pricing API were wired in.
 */

import { OFFERS } from '../config/constants.js';
import { RETAILERS, RETAILER_COUNT } from '../config/retailers.js';
import { fnv1a, mulberry32, lerp, pickDeterministic } from '../utils/hash.js';
import { usdToInr, roundToCharm } from '../utils/format.js';

/** Deterministic promo blurbs; '' means "no offer" for variety. */
const BLURBS = Object.freeze([
  '',
  '',
  '10% instant discount on select cards',
  'No-cost EMI available',
  'Extra 5% off with coupon',
  'Free express delivery',
  'Bank offer: save up to ₹500',
]);

/**
 * Compute deterministic offers for a product, one per retailer, sorted with
 * in-stock cheapest first.
 * @param {import('../types.js').Product} product
 * @returns {import('../types.js').Offer[]}
 */
export function getOffers(product) {
  const baseInr = usdToInr(product.price);
  const bestIndex = fnv1a(String(product.id)) % RETAILER_COUNT;

  /** @type {import('../types.js').Offer[]} */
  const offers = RETAILERS.map((retailer, index) => {
    const rng = mulberry32(fnv1a(`${product.id}:${retailer.id}`));
    const variation = lerp(rng(), OFFERS.VARIATION_MIN, OFFERS.VARIATION_MAX);
    const stockDraw = rng();
    const deliveryDraw = rng();

    const isBestPrice = index === bestIndex;
    // The designated best retailer is priced strictly at/below every other by
    // construction (lowest variation × best-price multiplier), guaranteeing a
    // single, truthful best-price badge.
    const multiplier = isBestPrice ? OFFERS.VARIATION_MIN * OFFERS.BEST_PRICE_MULTIPLIER : variation;
    const priceInr = roundToCharm(baseInr * multiplier);

    const inStock = isBestPrice ? true : stockDraw >= OFFERS.OOS_PROBABILITY;
    const deliveryDays = Math.round(lerp(deliveryDraw, OFFERS.DELIVERY_MIN_DAYS, OFFERS.DELIVERY_MAX_DAYS));
    const blurb = pickDeterministic(BLURBS, `${product.id}:${retailer.id}:blurb`);

    return {
      retailer,
      priceInr,
      inStock,
      deliveryDays,
      blurb,
      isBestPrice,
      url: retailer.buildSearchUrl(product),
    };
  });

  // In-stock first, then by price ascending (best price naturally leads).
  offers.sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    return a.priceInr - b.priceInr;
  });
  return offers;
}

/**
 * The single best (cheapest, in-stock) offer for a product.
 * @param {import('../types.js').Product} product
 * @returns {import('../types.js').Offer}
 */
export function getBestOffer(product) {
  return getOffers(product).find((o) => o.isBestPrice) ?? getOffers(product)[0];
}
