# The shopping flow

Now we put the patterns to work in real features. This chapter follows the three screens a shopper actually uses — **Home**, **Shop**, and **Product** — and points out which pattern is doing the heavy lifting at each step.

## Home (`js/pages/home.js`)

The home page is the [outfit recommender](#/feature-recommender) — the stylist controls and results sit at the top. *Below* the recommender is a stack of **rails** (horizontal product carousels) for browsing: Trending and — if you've taken the quiz — a personalized "For You" rail.

The key idea in those rails is **independent loading**. Each rail fetches its own data, shows its own skeleton, and handles its own empty/error state. One slow request can't block the rest of the page.

```js
// each rail loads on its own; a failure in one doesn't sink the others
async function loadRail(slot, categorySlug, signal) {
  // show skeletons, fetch via the service facade, then swap in real cards
}
```

Two patterns make this cheap:

- The [cache with de-duplication](#/pattern-decorator-cache): several rails ask for "all fashion" at once, but only **one** network request actually goes out; the rest share it.
- The [`withMinDuration` wrapper](#/pattern-decorator-cache): skeletons show for a pleasant minimum time instead of flickering.

The hero headline animates word-by-word via the [kinetic effect](#/feature-theming), and the numbers count up — both no-ops under reduced motion.

## Shop (`js/pages/shop.js`)

The shop page is the most sophisticated screen, and its standout feature is that **all of its state lives in the URL**. Search term, category, price range, rating, brand, on-sale, sort, and page number are every one reflected into the address bar — so a filtered view is shareable and survives a reload.

### Reading state *from* the URL (with guards)

On mount, the page reconstructs its filters from the query string, validating every value (see [Guards](#/pattern-guards)):

```js
// js/pages/shop.js
function readFilters(query) {
  return {
    search:  sanitizeSearch(query.get('q') || ''),
    category: isFashionCategory(query.get('category')) ? query.get('category') : '',
    minRating: /* clamped to 0..5 */,
    sort:    oneOf(query.get('sort'), SORT_IDS, SORT.RELEVANCE), // junk → Relevance
    page:    clampInt(query.get('page'), 1, 9999, 1),
    // …
  };
}
```

### Writing state *back* to the URL — without a reload loop

When you change a filter, the page writes the new query into the hash using `history.replaceState`, which — critically — does **not** fire a `hashchange` event:

```js
function syncUrl() {
  window.__outfitBuddyRouter?.replaceQuery(routeTo.shop(toQuery(filters)));
}
```

:::warning The gotcha this avoids
If the shop used a normal hash change to reflect filters, that change would trigger the router, which would re-run the page, which would reflect the filters again… an infinite loop. Using `replaceState` updates the address bar *silently*. And when an *external* navigation does change the query (e.g. clicking a category in the header menu), the router's fast path calls `onQueryChange` instead of remounting. Two mechanisms, carefully separated.
:::

### Fetch vs filter — knowing when to hit the network

This is the cleverest part. Changing the **data source** (search term or category) needs a new fetch. Changing a *refinement* (price, rating, sort) does not — it just re-filters the products already in memory. The page decides with a "source key":

```js
function sourceKey(f) {
  if (f.search)   return `search:${f.search}`;
  if (f.category) return `cat:${f.category}`;
  return 'all';
}
// re-fetch only when the source key changes:
const refetch = sourceKey(next) !== sourceKey(prev);
```

So dragging the price slider re-renders instantly from memory (via the pure [`applyCatalog`](#/pattern-strategy) function), while typing a new search — after a [debounce](#/glossary) — triggers one network call. Fast where it can be, fresh where it must be.

:::note The search box is debounced
Typing fires on every keystroke, but `debounce` waits 300ms (`TIMINGS.SEARCH_DEBOUNCE_MS`) of *quiet* before actually searching — so "dress" is one search, not five. The pending debounce is even cancelled on unmount via the [Disposer](#/pattern-disposer).
:::

## Product (`js/pages/product.js`)

The product-detail page (PDP) is pure **assembly** — it fetches one product and composes components: the gallery, the info panel, the **cross-store price table**, reviews, and a related rail.

### The cross-store comparison table

This is Outfit Buddy's signature feature, and it ties together three patterns:

1. `offers-service.js` builds one [`Offer`](#/pattern-adapter) per retailer.
2. Prices are **simulated deterministically** — a hash of `productId:retailerId` seeds a generator, so they look varied but never change between reloads ([deterministic hashing](#/pattern-decorator-cache)).
3. Each offer's link comes from that retailer's [adapter](#/pattern-adapter) (`buildSearchUrl`).

```js
// js/services/offers-service.js
const bestIndex = fnv1a(String(product.id)) % RETAILER_COUNT;   // one guaranteed cheapest
const offers = RETAILERS.map((retailer, index) => {
  const rng = mulberry32(fnv1a(`${product.id}:${retailer.id}`));
  const isBestPrice = index === bestIndex;
  const multiplier = isBestPrice
    ? OFFERS.VARIATION_MIN * OFFERS.BEST_PRICE_MULTIPLIER  // engineered to be lowest
    : lerp(rng(), OFFERS.VARIATION_MIN, OFFERS.VARIATION_MAX);
  return { retailer, priceInr: roundToCharm(baseInr * multiplier),
           inStock: isBestPrice ? true : rng() >= OFFERS.OOS_PROBABILITY,
           isBestPrice, url: retailer.buildSearchUrl(product) };
});
offers.sort(/* in-stock first, then cheapest */);
```

:::why Why engineer a guaranteed cheapest, in-stock store?
So the "Best price" badge and its call-to-action are always **truthful and functional**. If prices were purely random, sometimes the "best" store might be out of stock or tie with another, and the headline CTA would be misleading. The simulation deliberately constructs exactly one store that is strictly cheapest and always in stock — the product decision drives the maths.
:::

### The size selector validates before buying

The primary "Shop best price on <store>" button doesn't just open the link — it first checks that a size is chosen (for clothing/shoes; "one size" items skip the check), nudging you with a toast if not:

```js
// js/pages/product.js
if (!sizeSelector.validate()) {
  emit(EVENTS.TOAST, { message: 'Choose a size to continue.', level: 'info' });
  return;
}
window.open(best.url, '_blank', 'noopener,noreferrer');
```

That's [validation](#/pattern-guards) and a [Pub/Sub toast](#/pattern-events) working together at the moment of purchase.

## Explaining it out loud

> *"Home is independent rails that each load and fail on their own, sharing one cached fetch. Shop keeps all its state in the URL — validated on the way in, written back with `replaceState` to avoid a reload loop — and only re-fetches when the search term or category changes, otherwise re-filtering in memory. The product page assembles components and shows the cross-store table, where prices are deterministically simulated so they look real, always have one truthful cheapest store, and link out through each retailer's adapter."*

Next: the personal and editorial features — [Wishlist, quiz & edits](#/feature-personal).
