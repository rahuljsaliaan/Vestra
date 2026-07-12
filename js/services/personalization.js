/**
 * @file Personalization. Turns quiz answers into a durable profile (category &
 * tag weights + a price band), scores products against that profile, and builds
 * the "For You" rail. Pure functions — no I/O — so it's trivial to reason about
 * and test. Wishlisted categories add a small behavioural boost at scoring time.
 */

import {
  QUIZ_STEPS,
  SCORING_WEIGHTS,
  FORYOU_COUNT,
  DISCOUNT_SATURATION,
  findOption,
} from '../config/quiz-content.js';
import { usdToInr } from '../utils/format.js';
import { fnv1a } from '../utils/hash.js';

const PROFILE_VERSION = 1;
const WISHLIST_CATEGORY_BOOST = 1.5;

/**
 * Merge a weight map into an accumulator.
 * @param {Record<string, number>} target
 * @param {Record<string, number>|undefined} source
 */
function addWeights(target, source) {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + value;
  }
}

/**
 * Derive a full quiz profile from raw answers (step id → option id).
 * @param {Record<string,string>} answers
 * @returns {import('../types.js').QuizProfileV1}
 */
export function deriveProfile(answers) {
  /** @type {Record<string, number>} */
  const categoryWeights = {};
  /** @type {Record<string, number>} */
  const tagWeights = {};
  let priceBand = { minInr: 0, maxInr: 100000 };

  for (const step of QUIZ_STEPS) {
    const optionId = answers[step.id];
    if (!optionId) continue;
    const option = findOption(step.id, optionId);
    if (!option) continue;
    addWeights(categoryWeights, option.categoryWeights);
    addWeights(tagWeights, option.tagWeights);
    if (option.priceBand) priceBand = { ...option.priceBand };
  }

  return {
    version: PROFILE_VERSION,
    answers: { ...answers },
    categoryWeights,
    tagWeights,
    priceBand,
    completedAt: Date.now(),
  };
}

/**
 * How well a price fits the band: 1 inside, decaying linearly outside (never
 * hard zero — the catalog is too small to filter harshly).
 * @param {number} priceInr
 * @param {{minInr:number, maxInr:number}} band
 * @returns {number} 0..1
 */
function priceBandFit(priceInr, band) {
  if (priceInr >= band.minInr && priceInr <= band.maxInr) return 1;
  const span = Math.max(band.maxInr - band.minInr, 1);
  const distance = priceInr < band.minInr ? band.minInr - priceInr : priceInr - band.maxInr;
  return Math.max(0.15, 1 - distance / span);
}

/**
 * Fraction of a product's tags that carry weight in the profile.
 * @param {string[]} tags
 * @param {Record<string, number>} tagWeights
 * @returns {number} 0..1
 */
function tagOverlap(tags, tagWeights) {
  if (!tags.length) return 0;
  let matched = 0;
  for (const tag of tags) {
    if (tagWeights[tag]) matched += 1;
  }
  return matched / tags.length;
}

/**
 * Score a product against a profile. Higher is a better match.
 * @param {import('../types.js').Product} product
 * @param {import('../types.js').QuizProfileV1} profile
 * @param {{ boostedCategories?: ReadonlySet<string> }} [ctx]
 * @returns {number}
 */
export function scoreProduct(product, profile, ctx = {}) {
  const categoryWeight = profile.categoryWeights[product.category] || 0;
  const boost = ctx.boostedCategories?.has(product.category) ? WISHLIST_CATEGORY_BOOST : 0;
  const priceInr = usdToInr(product.price);

  return (
    SCORING_WEIGHTS.CATEGORY * (categoryWeight + boost) +
    SCORING_WEIGHTS.TAGS * tagOverlap(product.tags, profile.tagWeights) +
    SCORING_WEIGHTS.PRICE * priceBandFit(priceInr, profile.priceBand) +
    SCORING_WEIGHTS.RATING * (product.rating / 5) +
    SCORING_WEIGHTS.DISCOUNT * Math.min(product.discountPercentage / DISCOUNT_SATURATION, 1)
  );
}

/**
 * Build the "For You" rail: score the whole pool, sort descending, break ties
 * deterministically by id hash, take the top N.
 * @param {import('../types.js').Product[]} pool
 * @param {import('../types.js').QuizProfileV1} profile
 * @param {{ boostedCategories?: ReadonlySet<string> }} [ctx]
 * @returns {import('../types.js').Product[]}
 */
export function buildForYouRail(pool, profile, ctx = {}) {
  return [...pool]
    .map((product) => ({ product, score: scoreProduct(product, profile, ctx) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return fnv1a(String(a.product.id)) - fnv1a(String(b.product.id));
    })
    .slice(0, FORYOU_COUNT)
    .map((entry) => entry.product);
}
