# Adapters & Registries

Vestra compares prices across five very different stores — Amazon, Flipkart, Myntra, Ajio, Tata CLiQ — and sends you to whichever is cheapest. Those stores build their search URLs in completely different ways. The **Adapter pattern** (kept in a **Registry**) is how Vestra treats them uniformly.

## The problem

Each store expects a different URL shape:

- Amazon: `amazon.in/s?k=<terms>` (a query parameter)
- Myntra: `myntra.com/<slug>` (a path, not a query)
- Ajio: `ajio.com/search/?text=<terms>`
- …and so on.

The rest of the app should not have to know or care about these differences. It just wants to say: *"give me the link to this product on this store."*

## The Adapter pattern

An **adapter** wraps something with an awkward or inconsistent interface and presents a **uniform** one instead.

:::analogy A travel power adapter
Your laptop charger has one plug. Every country has different sockets. A travel adapter lets the *same* charger work in Japan, India, and the UK — it hides the socket differences behind one consistent fitting. Vestra's retailer adapters do the same: five different URL "sockets", one consistent fitting called `buildSearchUrl(product)`.
:::

## The code

Each retailer is an object with a common shape. The differences are sealed inside its own `buildSearchUrl`:

```js
// js/config/retailers.js
export const RETAILERS = Object.freeze([
  {
    id: 'amazon', name: 'Amazon', color: '#ff9900',
    buildSearchUrl: (product) =>
      `https://www.amazon.in/s?k=${encodeURIComponent(searchTerms(product))}`,
  },
  {
    id: 'myntra', name: 'Myntra', color: '#ff3f6c',
    // Myntra is path-based, not query-based — hence slugify.
    buildSearchUrl: (product) => `https://www.myntra.com/${slugify(searchTerms(product))}`,
  },
  // …flipkart, ajio, tatacliq…
]);
```

The **shape** they all share is written down as a type, so the compiler-in-your-editor enforces it:

```js
// js/types.js
/**
 * @typedef {Object} Retailer
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {(product: Product) => string} buildSearchUrl
 */
```

Now any code can loop over all five identically, blissfully unaware that Myntra is special:

```js
RETAILERS.map((retailer) => retailer.buildSearchUrl(product));
```

## The Registry part

Notice that `RETAILERS` is a single frozen **list** — a *registry* — that is the one place stores are declared. To add a sixth store (say, Nykaa), you add one object to this array and **nothing else in the app changes**. The offer simulation, the comparison table, and the outbound links all pick it up automatically because they iterate the registry.

:::why Why this is the codebase's most important seam
The README calls this the **"retailer-adapter seam"**, and it's the clearest example of *designing for change*. Today the per-store prices are simulated (real affiliate APIs need secret keys a browser can't hold). But because every store is an adapter behind one interface, and because pricing logic is isolated in `services/offers-service.js`, a real pricing API could be dropped in later — behind a small server proxy — and **not a single page or component would change.** The uniform interface is a promise: *"depend on this shape, and I can swap the implementation under you."*
:::

## Where the adapters get used

The offer service iterates the registry to build one offer per store, then asks each adapter for its link:

```js
// js/services/offers-service.js
const offers = RETAILERS.map((retailer, index) => {
  // …compute a deterministic simulated price…
  return {
    retailer,
    priceInr,
    isBestPrice: index === bestIndex,
    url: retailer.buildSearchUrl(product),   // ← the adapter in action
  };
});
```

(How the prices are *simulated* so they feel real and never change between reloads is a neat hashing trick covered in [Decorators & Caching](#/pattern-decorator-cache) and the [shopping walkthrough](#/feature-shopping).)

## Explaining it out loud

> *"Each store builds its URLs differently, so Vestra wraps every store in an adapter — an object with a common `buildSearchUrl(product)` method that hides the store's quirks. All the adapters live in one frozen registry list. The rest of the app loops over that list without knowing any store's specifics, and adding a store is a one-line change. It's the same idea as a travel plug adapter."*

Next: swapping interchangeable behaviours, like sort orders — [The Strategy pattern](#/pattern-strategy).
