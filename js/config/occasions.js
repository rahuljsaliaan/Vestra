/**
 * @file Occasion definitions for the Outfit Buddy recommender. Each occasion
 * biases which categories the stylist reaches for (via per-category boosts) and
 * carries a search term for the "get inspired" link. Authored as data so tuning
 * the recommender is an edit here, not a logic change.
 */

/** Occasion ids. @readonly */
export const OCCASION_ID = Object.freeze({
  WORK: 'work',
  WEDDING: 'wedding',
  CASUAL: 'casual',
  PARTY: 'party',
  DATE: 'date',
  TRAVEL: 'travel',
});

/**
 * @typedef {Object} Occasion
 * @property {string} id
 * @property {string} label
 * @property {string} emoji
 * @property {string} description
 * @property {string} inspire Search phrase for fashion-inspiration links.
 * @property {Record<string, number>} boosts Category slug → score boost.
 */

/** @type {ReadonlyArray<Occasion>} */
export const OCCASIONS = Object.freeze([
  {
    id: OCCASION_ID.CASUAL,
    label: 'Everyday casual',
    emoji: '🌿',
    description: 'Easy, comfortable, put-together.',
    inspire: 'casual everyday outfit',
    boosts: { tops: 3, 'womens-shoes': 2, 'mens-shoes': 2, sunglasses: 2, 'mens-shirts': 1 },
  },
  {
    id: OCCASION_ID.WORK,
    label: 'Work',
    emoji: '💼',
    description: 'Polished and office-ready.',
    inspire: 'smart workwear office outfit',
    boosts: { 'mens-shirts': 3, 'womens-dresses': 2, tops: 2, 'womens-watches': 2, 'mens-watches': 2 },
  },
  {
    id: OCCASION_ID.DATE,
    label: 'Date',
    emoji: '💛',
    description: 'A little extra, effortlessly.',
    inspire: 'date night outfit',
    boosts: { 'womens-dresses': 3, 'mens-shirts': 2, 'womens-jewellery': 2, tops: 1, 'womens-watches': 1 },
  },
  {
    id: OCCASION_ID.PARTY,
    label: 'Party / Night out',
    emoji: '✨',
    description: 'Turn-heads energy.',
    inspire: 'party night out outfit',
    boosts: { 'womens-dresses': 3, 'womens-jewellery': 3, 'womens-bags': 2, sunglasses: 1 },
  },
  {
    id: OCCASION_ID.WEDDING,
    label: 'Wedding / Festive',
    emoji: '🎉',
    description: 'Dressed for the celebration.',
    inspire: 'wedding guest festive outfit',
    boosts: { 'womens-dresses': 3, 'womens-jewellery': 3, 'womens-bags': 2, 'mens-shirts': 2, 'womens-watches': 1 },
  },
  {
    id: OCCASION_ID.TRAVEL,
    label: 'Travel',
    emoji: '🧳',
    description: 'Comfy, versatile, airport-ready.',
    inspire: 'travel airport comfortable outfit',
    boosts: { tops: 3, 'womens-shoes': 2, 'mens-shoes': 2, sunglasses: 2, 'womens-bags': 2 },
  },
]);

/**
 * @param {string} id
 * @returns {Occasion|undefined}
 */
export function findOccasion(id) {
  return OCCASIONS.find((o) => o.id === id);
}

/** Default occasion id. */
export const DEFAULT_OCCASION = OCCASION_ID.CASUAL;
