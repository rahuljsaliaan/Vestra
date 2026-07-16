# The outfit recommender

This is Outfit Buddy's front door and its reason to exist. The home page is a **stylist**: you give it a brief — occasion, weather, style — and it assembles complete looks. This page follows that feature from the buttons you tap down to the engine that picks the clothes.

## The four inputs (all just data)

Each choice group is defined once, as data, so adding an occasion or a weather condition is an edit to a config file — never a change to logic.

| Input | Lives in | Example values |
| --- | --- | --- |
| Occasion | `js/config/occasions.js` | Everyday casual, Work, Date, Party, Wedding, Travel |
| Weather | `js/config/weather.js` | Hot, Warm, Mild, Cool, Cold, Rainy |
| Who for | `js/config/style.js` | Womenswear, Menswear, Surprise me |
| Vibe | `js/config/style.js` (reused from the quiz) | Minimal, Street, Classic, Romantic, Bold |

:::why Why reuse the quiz's vibes?
The [style quiz](#/feature-personal) already defines "vibe" options and their category weights. The recommender imports the *same* list (`STYLE_VIBES` is built from the quiz's vibe step), so the two features can never drift apart, and a saved quiz answer can pre-fill the stylist. One source of truth, two features.
:::

## The weather knows where you are

Weather is the one input Outfit Buddy can fill in for you. It uses the **free Open-Meteo API** — no API key, callable straight from the browser — together with the browser's geolocation.

```js
// js/services/weather-service.js
export async function detectCurrentWeather(opts = {}) {
  try {
    const { lat, lon } = await getGeolocation();          // browser asks permission
    return await getConditionAt(lat, lon, opts);          // Open-Meteo → temp + WMO code
  } catch {
    return null;                                          // denied / offline → caller falls back
  }
}
```

The raw reading (a temperature and a WMO weather code) is turned into one of our friendly conditions by a pure function:

```js
// js/config/weather.js
export function mapOpenMeteo(tempC, code) {
  if (SNOW_CODES.has(code)) return WEATHER_ID.COLD;
  if (RAIN_CODES.has(code)) return WEATHER_ID.RAINY;      // rain beats temperature
  if (tempC >= 30) return WEATHER_ID.HOT;
  if (tempC >= 23) return WEATHER_ID.WARM;
  // …down to COLD
}
```

:::note Everything degrades gracefully
If the user blocks location, or is offline, or the response is malformed, `detectCurrentWeather` returns `null` and the page simply keeps the default ("mild") and shows *"Location off — pick manually."* The feature never breaks the page — it just quietly steps aside. That's the same defensive spirit as the [guards](#/pattern-guards) elsewhere.
:::

## The engine: how a look is built

`js/services/outfit-service.js` is a **pure function** — no network, no DOM — which makes it easy to reason about and test. Given the product pool and your brief, `buildOutfits` does three things: define what a look is made of, rank candidates for each slot, then assemble.

### 1. A look is a template of roles

Because the catalog has no trousers or coats (see the note below), a look is a small, coordinated set:

<figure class="diagram">
  <div class="d-flow">
    <li><b>👗</b> a <strong>dress</strong> — or a top, or a shirt</li>
    <li><b>👠</b> <strong>shoes</strong></li>
    <li><b>🕶</b> an <strong>accessory</strong> — bag, jewellery, watch or sunglasses</li>
  </div>
  <figcaption>Templates differ by gender; "Surprise me" mixes both women's and men's templates.</figcaption>
</figure>

### 2. Each candidate is scored

For a given role, every eligible product gets a score that blends its quality with how well it fits the brief:

```js
// js/services/outfit-service.js (scoreProduct)
score = RATING·(rating/5)
      + DISCOUNT·discount
      + OCCASION·occasionBoost[category]   // party → dresses & jewellery
      + VIBE·vibeWeight[category]           // bold, minimal, …
      + (weather wants this accessory ? WEATHER_ACCESSORY : 0);  // hot → sunglasses
```

Ties are broken with a hash of the product id **and the seed**, which is what makes the next trick possible.

### 3. Assemble — deterministically

The engine picks a candidate per role and builds `count` looks. The **same brief always yields the same looks**; the "Shuffle" button just increments a `seed`, sliding the picks along:

```js
const product = candidates[(seed + i) % candidates.length];
```

:::why Why deterministic instead of random?
Two reasons. First, stability: reloading the page shouldn't scramble the looks you were just shown. Second, testability: a pure, seeded function can be checked with plain assertions — "same brief + same seed ⇒ identical looks", "every piece is in the chosen gender's pool". This mirrors the deterministic price simulation described in [the shopping flow](#/feature-shopping).
:::

:::warning A catalog limitation, handled honestly
The product data (DummyJSON) has dresses, tops, shirts, shoes, watches, sunglasses, bags and jewellery — but **no trousers/jeans or outerwear**. So a look is (dress \| top \| shirt) + shoes + accessory, and cold-weather advice is delivered as a styling *note* ("layer a jacket over this") rather than by adding coats that don't exist. The docs and UI say so rather than pretending otherwise.
:::

## Two ways out, and a way to keep it

Every look connects to the rest of the app:

- **Shop each piece** — the item's "Shop" button opens the best in-store deal, built by that retailer's [adapter](#/pattern-adapter); the image links to the in-app [product page](#/feature-shopping) with the full price comparison.
- **Get inspired** — one link per look to a fashion-inspiration search, built by a tiny adapter (`js/config/inspiration.js`) so the destination can change in one place.
- **Save this look** — drops every piece into your [wishlist](#/feature-personal) under a collection auto-named for the occasion (e.g. *"Party / Night out looks"*), reusing the wishlist store's existing `createCollection` / `toggle` / `toggleInCollection`.

```js
// js/pages/home.js (saveLook) — reuses the wishlist store, no new storage code
const collectionId = wishlistStore.createCollection(`${occasion.label} looks`);
outfit.slots.forEach((slot) => {
  if (!wishlistStore.isWished(slot.product.id)) wishlistStore.toggle(buildSnapshot(slot.product));
  wishlistStore.toggleInCollection(slot.product.id, collectionId);
});
```

Your last brief is remembered in `user-store` (`stylistPrefs`), so a return visit is one tap.

## Explaining it out loud

> *"The home page is a stylist. You pick an occasion, weather and vibe — all defined as data in config. Weather can auto-fill from Open-Meteo, which needs no key, and falls back to 'mild' if location is off. A pure, deterministic engine scores each catalog item per role — dress/top, shoes, accessory — by rating, occasion, vibe and weather, then assembles coordinated looks; 'Shuffle' just bumps a seed. Each look links out to shop each piece or to an inspiration page, and 'Save look' reuses the wishlist to file every piece under an occasion collection."*

Next: the storefront the stylist is built on — [The shopping flow](#/feature-shopping).
