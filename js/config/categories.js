/**
 * @file The catalog's category taxonomy — the single source of truth for the
 * DummyJSON fashion category slugs Outfit Buddy surfaces. Doubles as: the
 * navigation data, the shop filter facet list, the recommender's role pools,
 * and the whitelist used to strip non-fashion products that leak from
 * DummyJSON's global search endpoint.
 */

/** Category grouping for navigation. @readonly */
export const CATEGORY_GROUP = Object.freeze({
  WOMEN: 'women',
  MEN: 'men',
  ACCESSORIES: 'accessories',
});

/** Human labels for the groups, in display order. @readonly */
export const CATEGORY_GROUP_LABEL = Object.freeze({
  [CATEGORY_GROUP.WOMEN]: 'Women',
  [CATEGORY_GROUP.MEN]: 'Men',
  [CATEGORY_GROUP.ACCESSORIES]: 'Accessories',
});

/**
 * The fashion categories Outfit Buddy draws from DummyJSON.
 * `slug` is the exact DummyJSON category id.
 * @type {ReadonlyArray<{slug:string, label:string, group:string, blurb:string}>}
 */
export const CATEGORIES = Object.freeze([
  { slug: 'womens-dresses', label: 'Dresses', group: CATEGORY_GROUP.WOMEN, blurb: 'Silhouettes that make an entrance.' },
  { slug: 'tops', label: 'Tops', group: CATEGORY_GROUP.WOMEN, blurb: 'Everyday hero pieces, elevated.' },
  { slug: 'womens-shoes', label: "Women's Shoes", group: CATEGORY_GROUP.WOMEN, blurb: 'From boardroom to boulevard.' },
  { slug: 'womens-bags', label: 'Bags', group: CATEGORY_GROUP.ACCESSORIES, blurb: 'Carry the whole mood.' },
  { slug: 'womens-jewellery', label: 'Jewellery', group: CATEGORY_GROUP.ACCESSORIES, blurb: 'The finishing punctuation.' },
  { slug: 'womens-watches', label: "Women's Watches", group: CATEGORY_GROUP.ACCESSORIES, blurb: 'Time, tastefully kept.' },
  { slug: 'mens-shirts', label: 'Shirts', group: CATEGORY_GROUP.MEN, blurb: 'Sharp collars, softer rules.' },
  { slug: 'mens-shoes', label: "Men's Shoes", group: CATEGORY_GROUP.MEN, blurb: 'Grounded, never boring.' },
  { slug: 'mens-watches', label: "Men's Watches", group: CATEGORY_GROUP.MEN, blurb: 'Weighty little statements.' },
  { slug: 'sunglasses', label: 'Sunglasses', group: CATEGORY_GROUP.ACCESSORIES, blurb: 'Squint less, style more.' },
]);

/** All valid slugs, for O(1) whitelist checks. @type {ReadonlySet<string>} */
export const CATEGORY_SLUGS = Object.freeze(new Set(CATEGORIES.map((c) => c.slug)));

/**
 * Categories grouped for the nav menu.
 * @returns {Array<{group:string, label:string, categories:typeof CATEGORIES}>}
 */
export function categoriesByGroup() {
  return Object.values(CATEGORY_GROUP).map((group) => ({
    group,
    label: CATEGORY_GROUP_LABEL[group],
    categories: CATEGORIES.filter((c) => c.group === group),
  }));
}

/**
 * Look up a category descriptor by slug.
 * @param {string} slug
 * @returns {{slug:string, label:string, group:string, blurb:string}|undefined}
 */
export function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug);
}

/**
 * True when the slug is one of Outfit Buddy's fashion categories.
 * @param {unknown} slug
 * @returns {boolean}
 */
export function isFashionCategory(slug) {
  return typeof slug === 'string' && CATEGORY_SLUGS.has(slug);
}

/**
 * Human label for a slug, falling back to a title-cased version of the slug.
 * @param {string} slug
 * @returns {string}
 */
export function categoryLabel(slug) {
  const found = findCategory(slug);
  if (found) return found.label;
  return String(slug)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
