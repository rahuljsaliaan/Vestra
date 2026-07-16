# Decorators & Caching

This chapter covers a family of closely related ideas that make Outfit Buddy fast and resilient: **wrapping** a function to add behaviour (the Decorator idea), and using it to build a **two-tier cache** with **request de-duplication**. We'll finish with the neat **deterministic hashing** trick that keeps simulated prices stable.

## Wrappers (the Decorator idea)

A **wrapper** (or decorator) takes an existing function and returns a new one with the *same shape* but *extra behaviour* bolted on. The caller can't tell the difference — it still calls one function and gets a result.

:::analogy Gift wrapping
Wrapping a present doesn't change the present — it adds a layer around it. You still hand over "a gift"; it just now also looks nice and hides what's inside. A function wrapper adds a layer (a timeout, a cache check, a delay) around the original, without changing how you call it.
:::

Outfit Buddy has several. Each keeps the wrapped function's signature but adds one concern:

```js
// utils/async.js — guarantee a promise takes at least minMs (so loading skeletons
// don't flash on screen for 40ms and vanish).
export async function withMinDuration(promise, minMs) {
  const [value] = await Promise.all([promise, sleep(minMs)]);
  return value;
}
```

```js
// services/http.js — wrap fetch with a timeout by combining abort signals.
function withTimeout(external, timeoutMs) { /* returns a signal that aborts on timeout */ }
```

You'll see `withMinDuration(getById(id, …), TIMINGS.SKELETON_MIN_MS)` in the pages: the data-fetch is *wrapped* so the skeleton always shows for a pleasant minimum time. Same call shape, extra behaviour.

## The two-tier cache

Fetching the same products twice is wasteful, so `js/services/cache.js` remembers responses. It has **two tiers**:

1. an in-memory `Map` (instant, but cleared on reload), and
2. a `sessionStorage` mirror (survives a soft reload within the tab).

```js
// js/services/cache.js
export function cacheGet(key, now = Date.now()) {
  const mem = memory.get(key);
  if (mem && isFresh(mem, now)) return mem.value;      // tier 1: memory
  // …else read sessionStorage, and if fresh, "promote" it back into memory…
}
```

:::analogy Desk drawer vs filing cabinet
Tier 1 (memory) is the pen on your desk — instant to grab, but it's gone when you leave. Tier 2 (`sessionStorage`) is the desk drawer — a half-second slower, but still there when you come back from lunch (a page reload). When you fetch from the drawer, you also put a copy on the desk (that's the "promote back to memory" line) so the next grab is instant.
:::

Writes are **quota-safe**: if `sessionStorage` is full or blocked (private browsing), the write silently fails and the in-memory tier still works. The app never crashes over a storage hiccup.

## Request de-duplication

Here's a subtle, important detail. The home page shows several rails that all draw from "all fashion products." If three of them ask at the same moment, you do **not** want three identical network calls. `cached` shares a single in-flight promise:

```js
// js/services/cache.js
const inFlight = new Map();
export async function cached(key, loader) {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;               // already cached? done.
  if (inFlight.has(key)) return inFlight.get(key); // already loading? share it.

  const promise = (async () => {
    try { const value = await loader(); cacheSet(key, value); return value; }
    finally { inFlight.delete(key); }
  })();
  inFlight.set(key, promise);
  return promise;
}
```

The first caller starts the request and registers its promise; the others find that promise and `await` the *same* one. One network call, three happy callers.

:::why Why is this worth the cleverness?
On the home page alone, several independent rails need overlapping data. Naïvely, that's a burst of duplicate requests hammering the API on every visit. The `cached` wrapper turns that into at most one request per unique URL, plus instant repeats from memory. It's a lot of resilience and speed for ~30 lines — and because it's a wrapper, the [facade](#/pattern-facade) gets it "for free" just by calling `cached(url, loader)`.
:::

## Bonus: deterministic "randomness" for stable prices

The per-store prices are simulated — but if they were truly random, they'd change on every reload, which would feel broken ("wasn't this ₹1,499 a second ago?"). Outfit Buddy makes them *look* random but stay *stable* using **deterministic hashing** (`utils/hash.js`).

```js
// A hash of (productId + retailerId) seeds a tiny pseudo-random generator.
const rng = mulberry32(fnv1a(`${product.id}:${retailer.id}`));
const variation = lerp(rng(), OFFERS.VARIATION_MIN, OFFERS.VARIATION_MAX);
```

Same product + same store → same hash → same seed → same "random" numbers, forever. No `Math.random()` anywhere.

:::analogy A dealt-once card shuffle
Imagine a deck shuffled by a rule based on today's date rather than by hand. Everyone who shuffles "for July 12" gets the identical order. It *looks* shuffled, but it's reproducible. Outfit Buddy's prices are shuffled by the product-and-store id, so they look varied but never move.
:::

This is also why one retailer is always the guaranteed cheapest and in stock — the simulation is engineered so the "best price" badge is always truthful. Details in the [shopping walkthrough](#/feature-shopping).

## Explaining it out loud

> *"Outfit Buddy wraps functions to add behaviour without changing how they're called — a minimum-duration wrapper so skeletons don't flash, a timeout wrapper around fetch. The cache is two-tier: instant memory plus a sessionStorage mirror that survives reloads, and it de-duplicates concurrent requests for the same URL by sharing one in-flight promise. And simulated prices use deterministic hashing so they look random but never change between reloads."*

Next: the small class that guarantees nothing leaks when a page closes — [The Disposer](#/pattern-disposer).
