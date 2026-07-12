# Vestra

**One closet. Every store.** Vestra is a premium fashion‑aggregator storefront: it
curates clothing from across India's biggest stores and sends shoppers to the
cheapest checkout via outbound deep links to **Amazon.in, Flipkart, Myntra, Ajio
and Tata CLiQ**.

Built with **vanilla HTML, CSS and JavaScript** — no frameworks, no build step,
no dependencies. Just native ES modules served statically.

---

## Running it

ES modules can't be loaded over `file://` (the browser's CORS policy blocks it),
so serve the folder over HTTP:

```bash
cd Vestra
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, VS Code Live
Server, …). No install, no compile.

---

## Data

Live product data comes from the free public **[DummyJSON](https://dummyjson.com)**
API — real network fetches with loading skeletons, retry‑with‑backoff, timeouts,
response validation and a two‑tier cache.

> **Why not the real Amazon/Flipkart APIs?** Their affiliate APIs require secret
> keys and server‑side request signing, which is impossible to do safely in a
> browser‑only app (the key would be exposed, and CORS blocks the calls). Vestra
> keeps a **retailer‑adapter seam** (`js/config/retailers.js`) so a real
> affiliate/pricing API could replace the simulation later — behind a small proxy
> — with **zero UI changes**. All outbound "Buy on …" links are real, working
> store‑search URLs today.

Per‑store prices are **simulated deterministically** (a hash of product id +
retailer id) so they're realistic and stable across reloads, with one guaranteed
cheapest retailer per product. See `js/services/offers-service.js`.

Prices are converted to **INR for display only** using a single named rate
(`PRICING.USD_TO_INR_DISPLAY_RATE`) — not a live FX rate.

---

## Features

- **Home** — kinetic editorial hero, live category/trending rails, a personalized
  "For You" rail (after the quiz), animated counters and an Edits teaser.
- **Shop** — debounced search, filters (category, price, rating, brand, on‑sale),
  five sort strategies, pagination, and fully **URL‑shareable state** (the hash
  reflects every filter).
- **Product detail** — image gallery with zoom, INR pricing, the **cross‑store
  price‑comparison table** (best‑price badge + real outbound links), reviews,
  a validated size selector and a related rail.
- **Wishlist + collections** — save items and organise them into named
  collections, persisted in `localStorage` (versioned, validated, corrupt‑data
  safe).
- **Style quiz** — a short animated, per‑step‑validated quiz that builds a style
  profile and personalizes the home feed.
- **Edits** — magazine‑style curated stories with scroll parallax, drag‑to‑scroll
  galleries and shop‑the‑look links.
- **Themes** — "Ink & Saffron Atelier" (light) and "Midnight Ink" (dark), toggled
  and persisted, defaulting to the OS preference.
- **Motion** — scroll reveals, staggered grids, magnetic buttons, marquee, drag
  momentum, View Transitions. **All motion respects `prefers-reduced-motion`.**

---

## Architecture

Strict one‑way layering (enforced by import direction):

```
config  →  utils  →  services  →  state  →  components  →  pages  →  app
```

- **config/** — the single source of truth for every constant: no magic strings.
  API endpoints, routes, retailer adapters, category taxonomy, quiz content,
  timings, storage keys, event names, CSS state‑class names.
- **utils/** — pure helpers: the `html` tagged template (the app's single XSS
  boundary — everything is escaped by default), formatting, hashing/PRNG, async
  (debounce/backoff), and validation guards.
- **services/** — I/O and domain logic: the HTTP client, the cache, the *only*
  DummyJSON consumer (`product-service`), pure catalog filtering/sorting, the
  offer simulation, safe storage, and personalization.
- **state/** — observer‑pattern stores (`createStore`) for user prefs/theme/quiz
  and the wishlist, persisted through the storage service.
- **components/** — presentational factories returning `{ el, …, destroy }`.
  They never fetch; pages pass data down.
- **pages/** — one module per route; each returns `{ mount, onQueryChange?,
  unmount }`. A per‑navigation `AbortController` cancels in‑flight fetches, and a
  `Disposer` unwinds every listener/observer on unmount.
- **router/** — a hash router with a mount/unmount lifecycle, a query‑only fast
  path (for filter changes), and View‑Transition page swaps with a fallback.

### Design patterns

Hash router · observer store · **retailer adapter registry** · strategy sort
registry · component factories · escaping template · disposer/cleanup collector ·
two‑tier cache with request de‑duplication.

### Project map

```
index.html            SPA shell (fonts, theme boot, module entry)
css/                  tokens · base · layout · components · pages · motion
js/
  config/             constants, api, routes, retailers, categories, quiz-content
  utils/              dom, format, hash, validate, async
  services/           http, cache, product-service, catalog, offers-service, storage, personalization
  state/              store, user-store, wishlist-store
  router/             router
  components/         layout, product-card, rail, skeleton, filters, product-detail, wishlist-interactions
  pages/              home, shop, product, wishlist, quiz, edits, not-found
  motion/             reveal, effects
  data/               edits-content
  types.js            shared JSDoc @typedefs
```

Type safety without a build step comes from **JSDoc** annotations and shared
`@typedef`s in `js/types.js` — open the project in an editor with TS language
support for full IntelliSense.
