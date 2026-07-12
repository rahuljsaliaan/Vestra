# The Facade pattern

When a page needs product data it writes one line:

```js
const products = await getByCategory('womens-dresses', { signal });
```

Behind that innocent call sit the network, retries, timeouts, a two-tier cache, request de-duplication, and data validation. All of it is hidden behind a **Facade** — `js/services/product-service.js`.

## The idea

A **facade** is a simple front door to a complicated system. It offers a few easy methods and takes care of coordinating all the messy parts behind the scenes, so callers never see the complexity.

:::analogy A hotel concierge
You ask the concierge, "book me a table at eight." You don't call the restaurant, negotiate the time, arrange the taxi, and confirm the booking yourself — the concierge orchestrates all of that and hands you back a simple "done, 8pm." The concierge is a facade over a dozen services. `product-service.js` is Vestra's concierge for product data.
:::

## What the facade hides

`product-service.js` is described in its own file as *"the ONLY module that talks to DummyJSON."* It composes three lower-level tools into a small, friendly domain API:

- the **HTTP client** (`http.js`) — timeouts + retries,
- the **cache** (`cache.js`) — two tiers + de-duplication,
- the **validation guards** (`validate.js`) — trust nothing from outside.

The public surface is just four functions:

```js
// js/services/product-service.js
export function getByCategory(slug, opts) { /* … */ }
export function getById(id, opts) { /* … */ }
export function search(query, opts) { /* … */ }
export function getAllFashion(opts) { /* … */ }
```

## One function, unpacked

Look at how much `getByCategory` coordinates in three lines — and how none of it leaks to the caller:

```js
export function getByCategory(slug, opts = {}) {
  const limit = opts.limit ?? CATEGORY_FETCH_LIMIT;
  const url = endpoints.category(slug, { limit, fields: LIST_FIELDS });  // build URL (config)
  return cached(url, async () =>                                         // cache + dedupe
    extractProducts(await fetchJson(url, { signal: opts.signal })));     // fetch + validate
}
```

- `endpoints.category(...)` builds the URL (from the [config](#/architecture) layer).
- `cached(url, …)` checks the cache first and shares in-flight requests (the [Decorator/Cache](#/pattern-decorator-cache) chapter).
- `fetchJson(...)` does the network call with retries and a timeout.
- `extractProducts(...)` **validates** every item and drops anything malformed.

The page that called it just gets a clean `Product[]`. It has no idea whether the data came from the network or the cache, whether a request was retried, or that three bad items were silently discarded.

## The anti-corruption touch

The facade is also where raw API data becomes *trusted* app data. `normalizeProduct` fills in the gaps so the rest of the app can rely on a consistent shape:

```js
// js/services/product-service.js
function normalizeProduct(raw) {
  if (!isProduct(raw)) return null;              // reject junk outright
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],       // guarantee arrays exist
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    images: Array.isArray(raw.images) ? raw.images : [],
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
  };
}
```

Now no component has to write `product.reviews?.length ?? 0` defensively — the facade guarantees `reviews` is always an array. Messiness is absorbed at the boundary. (More on this in [Guards & Validation](#/pattern-guards).)

:::why Why funnel all data access through one file?
- **One place to change.** If DummyJSON were swapped for a real backend, only this file (and `config/api.js`) would change. Pages are insulated.
- **Consistency for free.** Every product in the app has been through the same validation and normalisation, so downstream code can trust its shape.
- **A tiny surface to learn.** A newcomer needs to understand four functions to get *all* product data, not the fetch/cache/validate internals.
- **It enforces the [architecture](#/architecture).** Because only this facade imports the HTTP client, you can't accidentally scatter `fetch()` calls across the app.
:::

## Facade vs the patterns near it

It helps to contrast:

| Pattern | What it does | Vestra example |
| --- | --- | --- |
| **Facade** | Simplifies a *whole subsystem* behind a few methods. | `product-service.js` |
| **Adapter** | Makes *one* awkward interface match a desired one. | retailer `buildSearchUrl` |
| **Decorator** | *Wraps* a function to add behaviour, keeping its shape. | `cached(url, loader)` |

They are cousins — all about "hiding something behind a nicer interface" — but a facade's job is specifically to tame a *system*.

## Explaining it out loud

> *"All product data goes through one facade, `product-service.js`. It's the only file that talks to the API. Its four functions look simple, but each one orchestrates URL-building, caching, network retries, and validation, then normalises the result into a trusted shape. Pages get clean data and never see the plumbing — like asking a concierge to handle the details."*

Next: the wrappers that add caching and timeouts *around* functions — [Decorators & Caching](#/pattern-decorator-cache).
