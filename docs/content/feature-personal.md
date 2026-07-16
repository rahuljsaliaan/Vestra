# Wishlist, quiz & edits

These three features show how Outfit Buddy remembers things about *you* and turns that into a personalized experience — using the [state stores](#/pattern-observer), [validated storage](#/pattern-guards), and a small scoring engine.

## Wishlist & collections (`js/pages/wishlist.js`)

The wishlist — Outfit Buddy calls it your "closet" — lets you save items and organise them into named collections ("Work", "Weekend"). Everything persists across reloads.

### How saving works, end to end

1. You tap a heart. The **global** [`wishlist-interactions`](#/layers) controller catches the click (one delegated listener for the whole app), reads the `data-wish` snapshot embedded in the button, and calls `wishlistStore.toggle(snapshot)`.
2. The [store](#/pattern-observer) updates its frozen state and notifies subscribers.
3. Its built-in subscriber **persists to `localStorage`** and **emits `WISHLIST_CHANGED`**, which the header badge listens for ([Pub/Sub](#/pattern-events)).
4. The wishlist *page*, if open, is also subscribed, so it re-renders to show the new item.

```js
// js/state/wishlist-store.js — the snapshot avoids a re-fetch on the wishlist page
export function buildSnapshot(product) {
  return {
    id: product.id, title: product.title, thumbnail: product.thumbnail,
    category: product.category, priceInr: usdToInr(product.price),
    addedAt: Date.now(), collectionIds: [],
  };
}
```

:::note Why store a snapshot instead of just an id?
If the wishlist only stored product ids, opening the "closet" would require re-fetching every product from the network just to show a thumbnail and title. By saving a small **snapshot** (id, title, thumbnail, category, price) at the moment you heart it, the wishlist page renders instantly, fully offline. It's a deliberate trade of a little storage for a lot of speed.
:::

### Collections are immutable updates

Every collection operation produces a *new* state rather than mutating the old one — [immutability](#/oop) in practice. Deleting a collection also detaches it from every item in one atomic update:

```js
// js/state/wishlist-store.js
deleteCollection(id) {
  store.setState((s) => ({
    collections: s.collections.filter((c) => c.id !== id),
    items: s.items.map((i) => ({ ...i,
      collectionIds: i.collectionIds.filter((cid) => cid !== id) })),
  }));
}
```

The whole thing is hydrated safely on boot with a [guard and a fallback](#/pattern-guards), so corrupt or outdated saved data becomes an empty closet, never a crash.

## The style quiz (`js/pages/quiz.js`)

The quiz is a short, animated, multi-step form: **vibe → fit → budget → palette**. It's a nice example of a tiny **state machine** — the page tracks a `step` index and an `answers` object, and won't let you advance without choosing.

```js
// js/pages/quiz.js
function currentAnswered() {
  return Boolean(answers[QUIZ_STEPS[step].id]);   // per-step validation gate
}
```

### Content is data, logic is separate

Every question, option, and its scoring influence lives in `config/quiz-content.js` as pure data. The page just *renders* whatever is in that array. Tuning the quiz — adding a question, changing how much "minimal vibe" favours shirts — is a **data edit**, never a code change:

```js
// js/config/quiz-content.js
{ id: 'minimal', label: 'Quiet minimal',
  categoryWeights: { tops: 3, 'mens-shirts': 3, 'womens-watches': 2 },
  tagWeights: { clothing: 1 } },
```

### From answers to a profile to a feed

When you finish, `personalization.deriveProfile(answers)` folds your choices into weight maps and a price band, and stores it in the [`userStore`](#/pattern-observer). Later, the home page scores every product against that profile and shows the top matches:

```js
// js/services/personalization.js
export function scoreProduct(product, profile, ctx = {}) {
  return (
    SCORING_WEIGHTS.CATEGORY * (profile.categoryWeights[product.category] || 0 + boost) +
    SCORING_WEIGHTS.TAGS     * tagOverlap(product.tags, profile.tagWeights) +
    SCORING_WEIGHTS.PRICE    * priceBandFit(priceInr, profile.priceBand) +
    SCORING_WEIGHTS.RATING   * (product.rating / 5) +
    SCORING_WEIGHTS.DISCOUNT * Math.min(product.discountPercentage / DISCOUNT_SATURATION, 1)
  );
}
```

Two thoughtful details:

- **Wishlisted categories get a small boost** at scoring time — your *behaviour* nudges the feed, not just your quiz answers.
- **Ties are broken deterministically** by an id hash (not `Math.random`), so the "For You" order is stable between visits. Same [hashing idea](#/pattern-decorator-cache) as the offers.

:::why Why keep personalization as pure functions?
`personalization.js` does no I/O — it only transforms data (answers → profile, products + profile → ranked list). That makes it trivial to reason about and test: feed it inputs, check the outputs, no network or DOM required. All the "remembering" is delegated to the store; all the "deciding" is pure. Clean separation of concerns.
:::

## The Edits (`js/pages/edits.js`)

The Edits are magazine-style curated stories ("Monsoon Ink", etc.), each a set of "looks". The clever design choice is that a story references a **category**, not fixed product ids:

```js
// js/data/edits-content.js
{ title: 'The rain-ready trench', category: 'womens-dresses' }
```

Because of that, the imagery and "shop the look" rails are pulled **live** from the catalog and stay valid even as products come and go — no dead links. The detail pages add scroll **parallax** and drag-to-scroll galleries, all gated by reduced-motion.

## Explaining it out loud

> *"The wishlist saves small product snapshots to `localStorage` through the store, so the closet renders instantly and offline; every change persists and pings the header badge. The quiz is a validated multi-step form whose questions and scoring weights are pure data in config — finishing it derives a profile that the home page uses to score and rank products, with a behavioural boost from what you've wishlisted and deterministic tie-breaks. The Edits reference categories rather than product ids, so their content is pulled live and never goes stale."*

Next: how it all looks and moves — [Theming & motion](#/feature-theming).
