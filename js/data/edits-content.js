/**
 * @file Editorial "Edits" content. Curated fashion stories, authored as data.
 * Each story references Outfit Buddy categories (which are guaranteed to exist) rather
 * than specific product ids, so the imagery and "shop the look" rails are pulled
 * live and stay valid even as the catalog changes.
 */

/**
 * @typedef {Object} EditLook
 * @property {string} title
 * @property {string} copy
 * @property {string} category An Outfit Buddy category slug — source of imagery + rail.
 */

/**
 * @typedef {Object} EditStory
 * @property {string} slug
 * @property {string} title
 * @property {string} subtitle
 * @property {string} coverCategory Category used for the hero image.
 * @property {string} intro
 * @property {EditLook[]} looks
 */

/** @type {ReadonlyArray<EditStory>} */
export const EDITS = Object.freeze([
  {
    slug: 'monsoon-ink',
    title: 'Monsoon Ink',
    subtitle: 'Dressing for grey skies and gold light.',
    coverCategory: 'womens-dresses',
    intro:
      'When the light goes flat and the streets turn to mirror, dressing becomes an act of contrast. Deep tones, crisp tailoring, one warm note of saffron. This is the wardrobe for the in-between season.',
    looks: [
      { title: 'The overcast dress', copy: 'A fluid silhouette that moves with the weather. Layer it now, wear it bare come the heat.', category: 'womens-dresses' },
      { title: 'Crisp shirting', copy: 'The antidote to damp days: a shirt with structure, worn open over everything.', category: 'mens-shirts' },
      { title: 'Something that shines', copy: 'A little metal against grey light. Jewellery does the talking when the sky won’t.', category: 'womens-jewellery' },
    ],
  },
  {
    slug: 'off-duty-icon',
    title: 'Off-Duty Icon',
    subtitle: 'The uniform for doing absolutely nothing, beautifully.',
    coverCategory: 'womens-shoes',
    intro:
      'Effortless is engineered. The off-duty look is really three great pieces you can throw on without thinking — the right shoe, the easy top, the shades that end the conversation.',
    looks: [
      { title: 'Sneaker-first', copy: 'Everything starts from the ground. Build the fit around a shoe you’d run for the train in.', category: 'womens-shoes' },
      { title: 'The easy top', copy: 'One relaxed layer, endlessly restyled. This is the piece you’ll reach for on repeat.', category: 'tops' },
      { title: 'Ends the conversation', copy: 'A frame for the face and a full stop for the outfit. Wear them indoors, we won’t tell.', category: 'sunglasses' },
    ],
  },
  {
    slug: 'the-vows',
    title: 'The Vows',
    subtitle: 'Wedding-season dressing, from mandap to after-party.',
    coverCategory: 'womens-dresses',
    intro:
      'Season after season, the invitations stack up. Here’s how to show up like you meant it — occasion pieces that photograph beautifully and still let you dance.',
    looks: [
      { title: 'The entrance', copy: 'A dress built for the moment everyone turns. Movement, shine, a little drama.', category: 'womens-dresses' },
      { title: 'Kept time', copy: 'Because the ceremony always runs late. A watch that looks the part on the wrist.', category: 'womens-watches' },
      { title: 'Carry the night', copy: 'Phone, lipstick, the vows you scribbled down. A bag that closes the look.', category: 'womens-bags' },
    ],
  },
]);

/**
 * @param {string} slug
 * @returns {EditStory|undefined}
 */
export function findStory(slug) {
  return EDITS.find((story) => story.slug === slug);
}

/**
 * The next story after the given slug (wraps), for the "keep reading" link.
 * @param {string} slug
 * @returns {EditStory}
 */
export function nextStory(slug) {
  const index = EDITS.findIndex((s) => s.slug === slug);
  return EDITS[(index + 1) % EDITS.length];
}
