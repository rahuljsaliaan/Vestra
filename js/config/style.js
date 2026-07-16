/**
 * @file Gender/style inputs for the recommender. Genders map to the catalog
 * category pool each draws from. Style vibes reuse the style-quiz vibe options
 * (same ids), so a saved quiz profile can pre-fill the recommender and their
 * category weights stay in one place (config/quiz-content.js).
 */

import { QUIZ_STEP, findStep } from './quiz-content.js';

/** Gender selection ids. @readonly */
export const GENDER = Object.freeze({
  WOMEN: 'women',
  MEN: 'men',
  ANY: 'any',
});

/**
 * @typedef {Object} GenderOption
 * @property {string} id
 * @property {string} label
 * @property {string[]} categories Category pool this gender draws from.
 */

const WOMEN_CATEGORIES = ['womens-dresses', 'tops', 'womens-shoes', 'womens-bags', 'womens-jewellery', 'womens-watches', 'sunglasses'];
const MEN_CATEGORIES = ['mens-shirts', 'mens-shoes', 'mens-watches', 'sunglasses'];

/** @type {ReadonlyArray<GenderOption>} */
export const GENDERS = Object.freeze([
  { id: GENDER.WOMEN, label: 'Womenswear', categories: WOMEN_CATEGORIES },
  { id: GENDER.MEN, label: 'Menswear', categories: MEN_CATEGORIES },
  { id: GENDER.ANY, label: 'Surprise me', categories: Array.from(new Set([...WOMEN_CATEGORIES, ...MEN_CATEGORIES])) },
]);

/** Default gender when nothing is chosen/saved. */
export const DEFAULT_GENDER = GENDER.WOMEN;

/**
 * @param {string} id
 * @returns {GenderOption|undefined}
 */
export function findGender(id) {
  return GENDERS.find((g) => g.id === id);
}

/**
 * Style vibes, sourced from the quiz's VIBE step so ids/labels stay in sync
 * with the deeper personalization and its category weights.
 * @type {ReadonlyArray<{id: string, label: string}>}
 */
export const STYLE_VIBES = Object.freeze(
  (findStep(QUIZ_STEP.VIBE)?.options ?? []).map((opt) => ({ id: opt.id, label: opt.label })),
);

/** Default vibe id (first quiz vibe option). */
export const DEFAULT_VIBE = STYLE_VIBES[0]?.id ?? 'minimal';
