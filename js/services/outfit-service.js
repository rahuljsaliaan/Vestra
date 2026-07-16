/**
 * @file The outfit recommender engine — pure, no I/O. Given a product pool and
 * a brief (gender, occasion, weather, style vibe), it scores catalog items per
 * "role" (top/dress, shoes, accessory) and assembles coordinated outfit
 * combinations. Deterministic: the same brief + seed always yields the same
 * outfits; bumping the seed ("shuffle") yields fresh but stable combinations.
 *
 * Catalog note: DummyJSON has no trousers/jeans or outerwear, so a look is
 * (dress | top | shirt) + shoes + accessory. Cold-weather guidance is conveyed
 * in the styling note rather than by swapping in coats we don't have.
 */

import { findOccasion } from '../config/occasions.js';
import { findWeather } from '../config/weather.js';
import { findGender } from '../config/style.js';
import { findOption } from '../config/quiz-content.js';
import { QUIZ_STEP } from '../config/quiz-content.js';
import { GENDER } from '../config/style.js';
import { buildInspirationUrl } from '../config/inspiration.js';
import { fnv1a } from '../utils/hash.js';
import { usdToInr } from '../utils/format.js';

/** Scoring weights for ranking a product within a role. @readonly */
const WEIGHTS = Object.freeze({
  RATING: 1,
  DISCOUNT: 0.5,
  OCCASION: 3,
  VIBE: 1.5,
  WEATHER_ACCESSORY: 2.5,
});

const DEFAULT_COUNT = 4;

/**
 * Role definitions — each maps to the catalog categories it can be filled from.
 * @readonly
 */
const ROLE = Object.freeze({
  DRESS: { key: 'dress', label: 'Dress', categories: ['womens-dresses'] },
  TOP: { key: 'top', label: 'Top', categories: ['tops'] },
  SHIRT: { key: 'shirt', label: 'Shirt', categories: ['mens-shirts'] },
  W_SHOES: { key: 'shoes', label: 'Shoes', categories: ['womens-shoes'] },
  M_SHOES: { key: 'shoes', label: 'Shoes', categories: ['mens-shoes'] },
  W_ACCESSORY: { key: 'accessory', label: 'Accessory', categories: ['womens-bags', 'womens-jewellery', 'womens-watches', 'sunglasses'] },
  M_ACCESSORY: { key: 'accessory', label: 'Accessory', categories: ['mens-watches', 'sunglasses'] },
});

/** Outfit templates (ordered role lists) per gender. @readonly */
const TEMPLATES = Object.freeze({
  [GENDER.WOMEN]: [
    [ROLE.DRESS, ROLE.W_SHOES, ROLE.W_ACCESSORY],
    [ROLE.TOP, ROLE.W_SHOES, ROLE.W_ACCESSORY],
  ],
  [GENDER.MEN]: [[ROLE.SHIRT, ROLE.M_SHOES, ROLE.M_ACCESSORY]],
});

/**
 * Templates for a gender selection ('any' mixes both).
 * @param {string} genderId
 * @returns {Array<Array<{key:string,label:string,categories:string[]}>>}
 */
function templatesFor(genderId) {
  if (genderId === GENDER.MEN) return TEMPLATES[GENDER.MEN];
  if (genderId === GENDER.WOMEN) return TEMPLATES[GENDER.WOMEN];
  return [...TEMPLATES[GENDER.WOMEN], ...TEMPLATES[GENDER.MEN]]; // ANY
}

/**
 * Score a product for a role under the current brief.
 * @param {import('../types.js').Product} product
 * @param {{key:string}} role
 * @param {Object} ctx
 * @returns {number}
 */
function scoreProduct(product, role, ctx) {
  const cat = product.category;
  let score =
    WEIGHTS.RATING * (product.rating / 5) +
    WEIGHTS.DISCOUNT * Math.min(product.discountPercentage / 100, 1) +
    WEIGHTS.OCCASION * ((ctx.occasion?.boosts[cat] || 0) / 3) +
    WEIGHTS.VIBE * ((ctx.vibeWeights[cat] || 0) / 3);
  if (role.key === 'accessory' && ctx.weather?.accessory && cat === ctx.weather.accessory) {
    score += WEIGHTS.WEATHER_ACCESSORY;
  }
  return score;
}

/**
 * Candidate products for a role, filtered to the gender pool and ranked.
 * @param {{categories:string[], key:string}} role
 * @param {import('../types.js').Product[]} pool
 * @param {ReadonlySet<string>} allowed Gender category pool.
 * @param {Object} ctx
 * @returns {import('../types.js').Product[]}
 */
function rankCandidates(role, pool, allowed, ctx) {
  return pool
    .filter((p) => role.categories.includes(p.category) && allowed.has(p.category))
    .map((p) => ({ p, s: scoreProduct(p, role, ctx) }))
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : fnv1a(`${a.p.id}:${ctx.seed}`) - fnv1a(`${b.p.id}:${ctx.seed}`)))
    .map((entry) => entry.p);
}

/**
 * @typedef {Object} OutfitSlot
 * @property {{key:string,label:string}} role
 * @property {import('../types.js').Product} product
 */

/**
 * @typedef {Object} Outfit
 * @property {string} id
 * @property {OutfitSlot[]} slots
 * @property {string} rationale
 * @property {string} note Weather styling note.
 * @property {string} inspireUrl
 * @property {number} totalInr
 */

/**
 * Build coordinated outfit recommendations.
 * @param {Object} brief
 * @param {import('../types.js').Product[]} brief.pool
 * @param {string} brief.gender
 * @param {string} brief.occasion Occasion id.
 * @param {string} brief.weather Weather id.
 * @param {string} brief.vibe Style vibe id.
 * @param {number} [brief.count]
 * @param {number} [brief.seed]
 * @returns {Outfit[]}
 */
export function buildOutfits(brief) {
  const count = brief.count ?? DEFAULT_COUNT;
  const seed = brief.seed ?? 0;
  const occasion = findOccasion(brief.occasion);
  const weather = findWeather(brief.weather);
  const gender = findGender(brief.gender) ?? findGender(GENDER.WOMEN);
  const vibeOption = findOption(QUIZ_STEP.VIBE, brief.vibe);
  const vibeWeights = vibeOption?.categoryWeights || {};
  const vibeLabel = vibeOption?.label || 'signature';
  const allowed = new Set(gender.categories);
  const ctx = { occasion, weather, vibeWeights, seed };

  const templates = templatesFor(brief.gender);
  // Pre-rank candidates per distinct role key+category signature.
  const ranked = new Map();
  const rankFor = (role) => {
    const key = `${role.key}:${role.categories.join(',')}`;
    if (!ranked.has(key)) ranked.set(key, rankCandidates(role, brief.pool, allowed, ctx));
    return ranked.get(key);
  };

  const note = weather?.note || '';
  const inspireUrl = buildInspirationUrl(`${occasion?.inspire || 'outfit'} ${vibeLabel}`);
  /** @type {Outfit[]} */
  const outfits = [];

  for (let i = 0; i < count; i += 1) {
    const template = templates[i % templates.length];
    /** @type {OutfitSlot[]} */
    const slots = [];
    template.forEach((role) => {
      const candidates = rankFor(role);
      if (!candidates.length) return;
      const product = candidates[(seed + i) % candidates.length];
      slots.push({ role: { key: role.key, label: role.label }, product });
    });
    // A useful outfit needs at least two coordinated pieces.
    if (slots.length < 2) continue;

    const totalInr = slots.reduce((sum, slot) => sum + usdToInr(slot.product.price), 0);
    outfits.push({
      id: `${seed}-${i}`,
      slots,
      rationale: `A ${vibeLabel.toLowerCase()} ${(occasion?.label || 'everyday').toLowerCase()} look for ${(weather?.label || 'any').toLowerCase()} weather.`,
      note,
      inspireUrl,
      totalInr,
    });
  }
  return outfits;
}
