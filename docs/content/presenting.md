# Explaining Outfit Buddy out loud

This page is your **script**. If you have to present or defend this codebase — to a class, a mentor, an interviewer, a teammate — here is how to do it confidently, from a 30-second pitch to a full walkthrough, plus the tough questions you might get and how to answer them.

:::tip The golden rule of explaining code
Go **top-down**: big picture first, then zoom in. Never start by opening a random file and reading it line by line — you'll lose your audience. Start with *what it is*, then *how it's organised*, then *one feature end-to-end*. Everything in this order below follows that shape.
:::

## The 30-second elevator pitch

> *"Outfit Buddy is a fashion price-comparison storefront. You browse clothes from one site and it links you out to whichever store — Amazon, Flipkart, Myntra — is cheapest. What's interesting technically is that it's built in **plain HTML, CSS and JavaScript with no framework and no build step**, yet it's organised like a professional app: a strict layered architecture, a hand-rolled router and state store, and a dozen classic design patterns you can see in the open. It's basically a working tutorial on how good front-end software is structured."*

## The 5-minute walkthrough

Follow these five beats. Each links to the chapter that gives you the detail.

**1. What it is (30s).** Give the pitch above. Mention: real outbound links, simulated-but-stable prices, INR display, live data from DummyJSON.

**2. The one diagram (60s).** Draw or state the layering:

```text
config → utils → services → state → components → pages → app
```

Say: *"Dependencies only ever point one way. Config is pure data everyone shares; each layer only uses the ones to its left. That single rule is why you always know where code goes and why changes stay contained."* → [The layered architecture](#/architecture)

**3. Follow a click (90s).** Narrate what happens when you click a product: URL hash changes → router matches the route → it tears down the old page (aborts fetches, disposes listeners) → mounts the new page → the page asks a service for data → the service checks the cache, else fetches with retries, validates, and normalises → the page assembles components and wires up events. → [The life of a page](#/lifecycle)

**4. Show off one pattern (60s).** Pick the **cross-store price table** — it's the signature feature and touches three patterns at once: [adapters](#/pattern-adapter) (each store builds its own URL), [deterministic hashing](#/pattern-decorator-cache) (prices look random but never change), and a [facade](#/pattern-facade)/[cache](#/pattern-decorator-cache) feeding the data. → [The shopping flow](#/feature-shopping)

**5. Name the quality bar (30s).** *"No magic strings — every value is named in config. Validation at every boundary. Clean teardown so nothing leaks. Full type hints via JSDoc with no build. And all motion respects reduced-motion."*

## Impressive things to point at

If you want a few "look how thoughtful this is" moments:

- **The retailer-adapter seam.** Prices are simulated today, but because stores are adapters behind one interface and pricing is isolated in one service, a real API could replace it with **zero UI changes**. → [Adapters](#/pattern-adapter)
- **Deterministic prices.** No `Math.random()` anywhere — a hash of product+store id seeds the price, so it looks varied but is identical on every reload, and exactly one store is guaranteed cheapest and in stock. → [Decorators & Caching](#/pattern-decorator-cache)
- **The fetch-vs-filter split on Shop.** Dragging a price slider re-filters in memory instantly; only changing the search term or category hits the network. State is fully URL-shareable. → [The shopping flow](#/feature-shopping)
- **Request de-duplication.** Several home-page rails asking for the same data fire **one** network request, not several. → [Decorators & Caching](#/pattern-decorator-cache)
- **The `Disposer` + `AbortController` combo.** Nothing a page starts ever outlives it — no leaked listeners, no late responses scribbling on the wrong screen. → [The Disposer](#/pattern-disposer)
- **`html` as the single XSS boundary.** Everything is escaped by default; inserting raw HTML requires an explicit, visible `raw(...)`. → [Guards & Validation](#/pattern-guards)

## Questions you might get (and good answers)

:::note "Why no framework? Isn't that a step backwards?"
*"For a small, self-contained storefront it's a deliberate choice: no dependencies to maintain or get outdated, a tiny fast bundle, and total control. It also means every mechanism a framework hides — routing, reactive state, cleanup — is visible and hand-built here, which makes it a superb teaching codebase. For a large team app I'd reach for a framework, but the trade-offs here favour vanilla."*
:::

:::note "Isn't a global event bus (Pub/Sub) hard to trace?"
*"It can be, so it's used sparingly — only for genuinely cross-cutting, fire-and-forget signals like toasts and the wishlist count. All event names are constants in one place, so you can grep every publisher and subscriber instantly. For data a component actually owns, it subscribes to the store directly instead."*
:::

:::note "How would you add a new store, or a real pricing API?"
*"A new store is one object added to the `RETAILERS` registry — the offer simulation, the comparison table, and the links all pick it up automatically. A real pricing API would replace the body of `offers-service.js` (probably behind a small proxy for the secret key); because pages depend on that service and not the reverse, no page or component would change. That's the whole point of the adapter seam."*
:::

:::note "How do you know it works without a test framework?"
*"The pure layers — formatting, hashing, offers, personalization, validation — are plain functions with no I/O, so they can be exercised directly in Node. The UI is verified by driving the running app in a headless browser and watching for console/page errors. The architecture is what makes this feasible: logic is deliberately kept out of the DOM-heavy layers."*
:::

:::note "What would you improve or add next?"
Good honest answers: *a formal test suite; a real backend/proxy for live pricing; server-side rendering or prerendering for SEO (a hash-router SPA isn't crawler-friendly); and splitting the larger pages into more sub-components.* Showing you can critique it is more impressive than claiming it's perfect.
:::

## A one-paragraph summary to memorise

> *"Outfit Buddy is a no-framework, no-build fashion price-comparison SPA. It's organised as a strict one-way layered architecture — config, utils, services, state, components, pages, app — and leans on classic design patterns: a factory per component and page, an observer store for state, Pub/Sub via custom events, retailer adapters in a registry, a strategy registry for sorting, a service facade over a two-tier de-duplicating cache, and a Disposer that guarantees clean teardown. Data from outside is validated at every boundary, HTML is escaped by default, prices are deterministically simulated so they're stable, and every animation respects reduced-motion. It's small enough to read in an afternoon and disciplined enough to learn professional structure from."*

You're ready. Open the app, open the code, and talk through the five beats. Good luck.
