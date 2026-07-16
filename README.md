# Outfit Buddy

**Dressed for the occasion.** Outfit Buddy recommends complete outfit
combinations for a given **occasion**, the current **weather**, and your
**personal style** — then links you straight out to shop each piece or to a
fashion-inspiration page.

Built with **vanilla HTML, CSS and JavaScript** — no frameworks, no build step,
no dependencies. Just native ES modules served statically.

> Outfit Buddy grew out of a fashion-discovery storefront, so it also keeps a
> full browse experience (catalog, product pages with cross-store price
> comparison, wishlist + collections, a style quiz and editorial "Edits") — all
> of which now feed the recommender.

---

## Running it

ES modules can't be loaded over `file://` (the browser's CORS policy blocks it),
so serve the folder over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, VS Code Live
Server, …). No install, no compile.

---

## How the recommender works

The home page **is** the stylist. Four inputs, one tap:

1. **Occasion** — Everyday casual, Work, Date, Party/Night out, Wedding/Festive,
   Travel. (`js/config/occasions.js`)
2. **Weather** — auto-detected from your location via the free **Open-Meteo**
   API (no API key, called straight from the browser) and always overridable by
   hand; falls back to "mild" if location is denied. (`js/services/weather-service.js`,
   `js/config/weather.js`)
3. **Who for** — Womenswear / Menswear / Surprise me. (`js/config/style.js`)
4. **Your vibe** — Quiet minimal, Street & sport, Timeless classic, Soft
   romantic, Bold statement — pre-filled from your saved **style quiz** if you've
   taken it.

**"Style me"** then assembles coordinated looks. Each look:
- shows its pieces (a dress/top/shirt + shoes + an accessory), each linking to
  the in-app product page **and** to the best in-store deal;
- carries a styling rationale and a weather note;
- has **"Get inspired"** → a Pinterest search for that occasion + vibe;
- can be **saved** — "Save this look" drops every piece into your wishlist under
  an auto-created collection named for the occasion.

"Shuffle looks" regenerates fresh combinations. Your last brief is remembered.

### How outfits are generated

`js/services/outfit-service.js` is a **pure, deterministic** engine. Given the
product pool and your brief, it scores each catalog item per *role* (rating +
discount + occasion boost + vibe weight + a weather-accessory bonus), then
assembles the looks. The same brief + seed always yields the same outfits;
"shuffle" bumps the seed. No randomness, so results are stable across reloads.

> **Catalog note.** Product data comes from the free public
> [DummyJSON](https://dummyjson.com) API, which has dresses, tops, shirts, shoes,
> watches, sunglasses, bags and jewellery — **but no trousers/jeans or
> outerwear.** So a "look" is (dress | top | shirt) + shoes + accessory, and
> cold-weather advice is given as a styling note ("layer a jacket over this")
> rather than by adding coats the catalog doesn't have.

### Why no real store / weather API keys?

Retailer affiliate APIs (Amazon, Flipkart, …) require secret keys and
server-side request signing — impossible to do safely in a browser-only app.
Outfit Buddy keeps a **retailer-adapter seam** (`js/config/retailers.js`) so a
real pricing/affiliate API could replace the simulated per-store prices later,
behind a small proxy, with no UI changes. Every "Shop" link is a real store
search URL today. Open-Meteo, by contrast, needs **no key** and is CORS-enabled,
so weather is genuinely live. Prices are converted to **INR for display only**
via a single named rate.

---

## Other features (kept from the storefront)

- **Shop** — debounced search, filters (category, price, rating, brand, sale),
  five sort strategies, pagination, fully **URL-shareable state**.
- **Product detail** — gallery, INR pricing, a **cross-store price-comparison
  table** (best-price badge + real outbound links), reviews, size selector.
- **Wishlist + collections** — persisted in `localStorage` (versioned,
  validated, corrupt-data safe); the recommender's "Save look" writes here.
- **Style quiz** — deeper personalization that pre-fills the recommender vibe
  and powers a "For You" rail.
- **Edits** — magazine-style stories with parallax and shop-the-look links.
- **Themes** — light + "Midnight Ink" dark mode, persisted, OS-default.
- **Motion** — kinetic hero, scroll reveals, magnetic buttons, drag rails, View
  Transitions. **All motion respects `prefers-reduced-motion`.**

---

## Architecture

Strict one-way layering (enforced by import direction):

```
config  →  utils  →  services  →  state  →  components  →  pages  →  app
```

- **config/** — single source of truth for every constant (no magic strings):
  API endpoints, routes, retailer + inspiration adapters, category taxonomy,
  **occasions, weather, gender/style**, quiz content, timings, storage keys,
  events, CSS state-classes.
- **utils/** — the `html` tagged template (the app's single XSS boundary),
  formatting, hashing/PRNG, async (debounce/backoff), validation guards.
- **services/** — I/O + domain logic: HTTP client, cache, the DummyJSON
  consumer, weather (Open-Meteo), the pure **outfit recommender**, catalog
  filtering/sorting, offer simulation, safe storage, personalization.
- **state/** — observer stores for user prefs/theme/quiz/**stylist prefs** and
  the wishlist, persisted via the storage service.
- **components/** — presentational factories returning `{ el, …, destroy }`;
  they never fetch.
- **pages/** — one module per route; `{ mount, onQueryChange?, unmount }` with a
  per-navigation `AbortController` and a `Disposer` that unwinds every listener.
- **router/** — hash router with a mount/unmount lifecycle, a query-only fast
  path, and View-Transition page swaps.

### Recommender-specific files

```
js/config/occasions.js      occasion definitions + category boosts + inspire terms
js/config/weather.js        conditions + Open-Meteo (WMO code + temp) → condition
js/config/style.js          genders → category pools; vibes (reused from the quiz)
js/config/inspiration.js    fashion-inspiration link adapter (Pinterest)
js/services/weather-service.js   geolocation + Open-Meteo fetch, graceful fallback
js/services/outfit-service.js    pure buildOutfits() recommender engine
js/components/outfit-card.js     one look: pieces, shop links, get-inspired, save
js/pages/home.js                 the stylist experience (inputs → looks) + explore rails
```

Type safety without a build step comes from **JSDoc** annotations and shared
`@typedef`s in `js/types.js`.

> Note: the project folder is still named `Vestra/` (its original name); the
> application itself is Outfit Buddy throughout.
