# Tour of the layers

This is a **reference map** of every folder and file, so when you open the project you know what each thing is for. Read it once top-to-bottom, then come back to it as a lookup. The folders are listed in dependency order — remember, each may only use the ones above it (see [The layered architecture](#/architecture)).

## `config/` — the rule book

Pure data and settings. No logic that *does* anything; just the values everything else agrees on.

| File | What it holds |
| --- | --- |
| `constants.js` | Timings, HTTP tuning, cache policy, pricing, pagination, storage keys, event names, CSS state-class names, theme ids. |
| `api.js` | The **only** place DummyJSON URLs are assembled (`endpoints.category/search/product`). |
| `routes.js` | Route ids, the route table (`:param` patterns), and `routeTo.*` href builders. No page writes a `#/…` string by hand. |
| `retailers.js` | The five [retailer adapters](#/pattern-adapter) and their `buildSearchUrl`. |
| `categories.js` | The fashion category taxonomy — doubles as nav data, the shop facet list, and the whitelist that filters non-fashion products out of search. |
| `quiz-content.js` | Every quiz question, option, and its personalization weights — tuning is a data edit, never a logic change. |

:::note The "no magic strings" rule lives here
Any meaningful number or string in the whole app is defined once in `config/`. That's why you'll see `TIMINGS.SEARCH_DEBOUNCE_MS` instead of `300`, and `EVENTS.TOAST` instead of `'outfitbuddy:toast'`. One definition, one place to change.
:::

## `utils/` — the Swiss-army knife

Small, **pure** helpers. Same input → same output, no side effects, easy to test.

| File | What it does |
| --- | --- |
| `dom.js` | The `html` tagged template (the app's single [XSS boundary](#/pattern-guards)), `el`/`toElement`/`setContent`, event `delegate`, `emit`, and the [`Disposer`](#/pattern-disposer). |
| `format.js` | USD→INR conversion, `formatInr`, charm rounding (…99), discount maths, `slugify`, date formatting. |
| `hash.js` | Deterministic hashing (FNV-1a) and a seeded PRNG (`mulberry32`) — stable "randomness" with no `Math.random`. |
| `validate.js` | Type [guards](#/pattern-guards) (`isProduct`, `isObject`…) and input sanitisers (`sanitizeSearch`, `oneOf`, `clampInt`). |
| `async.js` | `debounce`, `sleep` (abortable), retry `backoffDelay`, `withMinDuration`, and `prefersReducedMotion`. |

## `services/` — the kitchen

I/O and domain logic. Where "get me products" becomes real work.

| File | What it does |
| --- | --- |
| `http.js` | `fetch` wrapped with timeout + retry-with-backoff; throws the `HttpError` class. |
| `cache.js` | Two-tier (memory + `sessionStorage`) TTL cache with request de-duplication (`cached`). |
| `product-service.js` | The [facade](#/pattern-facade): the only DummyJSON consumer. Fetch → validate → normalise → cache. |
| `catalog.js` | Pure filtering + the [`SORTERS` strategy registry](#/pattern-strategy) + facet extraction. |
| `offers-service.js` | The deterministic [cross-store price simulation](#/feature-shopping). |
| `storage.js` | Safe, validated `localStorage` wrapper that degrades to an in-memory map if storage is blocked. |
| `personalization.js` | Turns quiz answers into a profile, scores products against it, builds the "For You" rail. |

## `state/` — the notepad

Things that change and must be remembered, built on the [observer store](#/pattern-observer).

| File | What it does |
| --- | --- |
| `store.js` | `createStore` — the tiny observable state container everything else builds on. |
| `wishlist-store.js` | Saved items + named collections; persists to storage and broadcasts `WISHLIST_CHANGED` on every change. |
| `user-store.js` | Theme (defaults to OS preference) + the quiz profile; applies the theme attribute to `<html>`. |

## `components/` — the Lego bricks

Presentational [factories](#/pattern-module-factory). Handed data, they draw UI. They never fetch.

| File | What it draws |
| --- | --- |
| `layout.js` | The persistent header (nav, search, wishlist badge, theme toggle), footer, and toast host. Mounted once at boot. |
| `product-card.js` | A product card: image with lazy crossfade, INR price + discount, rating, wishlist heart. |
| `rail.js` | A horizontal scroll-snap track with drag-to-scroll momentum and prev/next controls. |
| `skeleton.js` | Grey shimmer placeholders shown while data loads. |
| `filters.js` | The shop filter panel (category chips, price, rating, brand, on-sale); reports changes as a patch. |
| `product-detail.js` | The PDP sub-parts: gallery with zoom, the cross-store price table, and the validated size selector. |
| `wishlist-interactions.js` | One global controller for every heart button in the app (see below). |

:::tip A pattern worth noticing: the global heart controller
Rather than wiring a click handler onto every heart, `wishlist-interactions.js` puts **one** delegated listener on `document.body` for `[data-wishlist-toggle]`. Each heart embeds a tiny `data-wish` JSON snapshot, so toggling needs no re-fetch. A `MutationObserver` keeps hearts rendered *later* in sync too. This is the [event-delegation](#/pattern-events) and [observer](#/pattern-observer) ideas combined into a neat, memory-light solution.
:::

## `pages/` — the instructions

One file per screen. Each exports a `create*Page()` [factory](#/pattern-module-factory) returning `{ mount, onQueryChange?, unmount }` (see [the lifecycle](#/lifecycle)).

| File | The screen |
| --- | --- |
| `home.js` | Kinetic hero, marquee, trending + category rails, optional "For You" rail, Edits teaser. |
| `shop.js` | Search, filters, sort, pagination — with fully [URL-shareable state](#/feature-shopping). |
| `product.js` | Product detail: gallery, pricing, cross-store table, reviews, related rail. |
| `wishlist.js` | The "closet": saved items and named collections. |
| `quiz.js` | The multi-step style quiz that builds a personalization profile. |
| `edits.js` | Magazine-style editorial stories with parallax and "shop the look" rails. |
| `not-found.js` | The 404 page. |

## `router/` — the usher

| File | What it does |
| --- | --- |
| `router.js` | Compiles route patterns to regexes, listens for `hashchange`, and drives the mount/unmount [lifecycle](#/lifecycle) with per-navigation `AbortController`s and View-Transition page swaps. |

## `motion/` — the flourishes

Animation, always gated by `prefers-reduced-motion` (see [Theming & motion](#/feature-theming)).

| File | What it does |
| --- | --- |
| `reveal.js` | One shared `IntersectionObserver` that reveals `[data-reveal]` elements as they scroll into view, with CSS-staggered groups. |
| `effects.js` | Opt-in flourishes: word-by-word kinetic headings, magnetic buttons, count-up numbers. |

## `data/` and the root files

| File | What it is |
| --- | --- |
| `data/edits-content.js` | The editorial stories, authored as data. Each references a *category* (not fixed product ids) so imagery stays valid as the catalog changes. |
| `types.js` | Shared JSDoc `@typedef`s (`Product`, `Offer`, `WishlistItem`…). No runtime code — pure [type safety without a build](#/no-build). |
| `app.js` | The bootstrap: mount layout, register routes, start the router. |
| `index.html` | The SPA shell: the theme-boot script, font/CSS links, and the three mount points. |

:::note CSS mirrors the same discipline
The `css/` folder is layered too — `tokens.css` (design variables) → `base.css` → `layout.css` → `components.css` → `pages.css` → `motion.css`, loaded in that order. Colours and spacing are all variables in `tokens.css`; nothing else hard-codes a colour. More in [Theming & motion](#/feature-theming).
:::

Now let's watch these layers cooperate in real features, starting with [The shopping flow](#/feature-shopping).
