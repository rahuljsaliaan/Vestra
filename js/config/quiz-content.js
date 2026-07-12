/**
 * @file Style-quiz content and personalization weights. All quiz copy, options,
 * their category/tag weight contributions, the budget→price-band mapping, and
 * the scoring weights live here as data — tuning personalization is an edit to
 * this file, never to logic.
 */

/** Quiz step ids. @readonly */
export const QUIZ_STEP = Object.freeze({
  VIBE: 'vibe',
  FIT: 'fit',
  BUDGET: 'budget',
  PALETTE: 'palette',
});

/** Relative scoring weights combined by personalization.scoreProduct. @readonly */
export const SCORING_WEIGHTS = Object.freeze({
  CATEGORY: 3,
  TAGS: 1.5,
  PRICE: 2,
  RATING: 1,
  DISCOUNT: 0.6,
});

/** Number of items in the "For You" rail. */
export const FORYOU_COUNT = 10;

/** Discount% at which the discount score saturates. */
export const DISCOUNT_SATURATION = 20;

/**
 * The quiz definition. Non-budget options carry `categoryWeights`/`tagWeights`;
 * budget options carry a `priceBand` (in INR).
 * @type {ReadonlyArray<{
 *   id: string, question: string, hint: string,
 *   options: ReadonlyArray<{
 *     id: string, label: string, description: string,
 *     categoryWeights?: Record<string, number>, tagWeights?: Record<string, number>,
 *     priceBand?: {minInr: number, maxInr: number}
 *   }>
 * }>}
 */
export const QUIZ_STEPS = Object.freeze([
  {
    id: QUIZ_STEP.VIBE,
    question: "What's your everyday vibe?",
    hint: 'Pick the one that feels most like you.',
    options: [
      {
        id: 'minimal',
        label: 'Quiet minimal',
        description: 'Clean lines, few pieces, no noise.',
        categoryWeights: { tops: 3, 'mens-shirts': 3, 'womens-watches': 2, 'mens-watches': 2 },
        tagWeights: { clothing: 1 },
      },
      {
        id: 'street',
        label: 'Street & sport',
        description: 'Sneakers-first, easy layers, attitude.',
        categoryWeights: { 'mens-shoes': 3, 'womens-shoes': 3, sunglasses: 2, tops: 1 },
        tagWeights: { clothing: 1 },
      },
      {
        id: 'classic',
        label: 'Timeless classic',
        description: 'Tailored, polished, never dated.',
        categoryWeights: { 'mens-shirts': 3, 'womens-dresses': 2, 'mens-watches': 2, 'womens-watches': 2 },
      },
      {
        id: 'romantic',
        label: 'Soft romantic',
        description: 'Flow, detail, a little sparkle.',
        categoryWeights: { 'womens-dresses': 3, 'womens-jewellery': 3, tops: 1 },
      },
      {
        id: 'bold',
        label: 'Bold statement',
        description: 'Colour, drama, turn heads.',
        categoryWeights: { 'womens-dresses': 2, sunglasses: 3, 'womens-bags': 2, 'womens-jewellery': 2 },
      },
    ],
  },
  {
    id: QUIZ_STEP.FIT,
    question: 'How do you like things to fit?',
    hint: 'There are no wrong answers.',
    options: [
      { id: 'relaxed', label: 'Relaxed', description: 'Room to breathe.', categoryWeights: { tops: 2, 'mens-shirts': 2 } },
      { id: 'tailored', label: 'Tailored', description: 'Sharp and structured.', categoryWeights: { 'mens-shirts': 2, 'womens-dresses': 2, 'mens-watches': 1 } },
      { id: 'fitted', label: 'Fitted', description: 'Close to the body.', categoryWeights: { 'womens-dresses': 3, tops: 1 } },
      { id: 'mixed', label: 'Depends on the day', description: 'A bit of everything.', categoryWeights: { tops: 1, 'mens-shirts': 1, 'womens-dresses': 1 } },
    ],
  },
  {
    id: QUIZ_STEP.BUDGET,
    question: "What's your typical spend on a piece?",
    hint: 'We tune prices to this — you can always browse beyond it.',
    options: [
      { id: 'value', label: 'Under ₹1,500', description: 'Smart everyday buys.', priceBand: { minInr: 0, maxInr: 1500 } },
      { id: 'mid', label: '₹1,500 – ₹4,000', description: 'The sweet spot.', priceBand: { minInr: 1500, maxInr: 4000 } },
      { id: 'premium', label: '₹4,000 – ₹8,000', description: 'Investment pieces.', priceBand: { minInr: 4000, maxInr: 8000 } },
      { id: 'luxe', label: '₹8,000+', description: 'Treat yourself.', priceBand: { minInr: 8000, maxInr: 100000 } },
    ],
  },
  {
    id: QUIZ_STEP.PALETTE,
    question: 'Which palette pulls you in?',
    hint: 'Last one — promise.',
    options: [
      { id: 'neutral', label: 'Neutrals', description: 'Ivory, sand, black, grey.', tagWeights: { clothing: 1 } },
      { id: 'earthy', label: 'Earthy', description: 'Terracotta, olive, rust.', tagWeights: { clothing: 1 } },
      { id: 'jewel', label: 'Jewel tones', description: 'Emerald, sapphire, ruby.', categoryWeights: { 'womens-jewellery': 1, 'womens-dresses': 1 } },
      { id: 'pastel', label: 'Pastels', description: 'Soft, light, airy.', categoryWeights: { tops: 1, 'womens-dresses': 1 } },
      { id: 'mono', label: 'Monochrome', description: 'All-black everything.', categoryWeights: { sunglasses: 1, 'mens-shirts': 1 } },
    ],
  },
]);

/**
 * Look up a step by id.
 * @param {string} id
 * @returns {(typeof QUIZ_STEPS)[number]|undefined}
 */
export function findStep(id) {
  return QUIZ_STEPS.find((s) => s.id === id);
}

/**
 * Look up a chosen option object within a step.
 * @param {string} stepId
 * @param {string} optionId
 * @returns {(typeof QUIZ_STEPS)[number]['options'][number]|undefined}
 */
export function findOption(stepId, optionId) {
  return findStep(stepId)?.options.find((o) => o.id === optionId);
}
