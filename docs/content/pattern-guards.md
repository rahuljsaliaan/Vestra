# Guards & Validation

Data from *outside* your program is never trustworthy: an API might change its shape, a network response might be half-broken, `localStorage` might hold corrupt JSON from an old version, a user might type junk into the address bar. Vestra treats every one of these as a **trust boundary** and checks data at the door. The tools live in `js/utils/validate.js` and `js/utils/dom.js`.

## The idea: guards and the "anti-corruption layer"

A **guard** is a small function that answers a yes/no question about a value — *"is this really a product?"* — and, in a typed sense, *narrows* the value to a known shape when the answer is yes. Cluster your guards at the edges of the app and you get an **anti-corruption layer**: a wall that stops malformed outside data from leaking into your clean internal code.

:::analogy Airport security
Every passenger passes through security before entering the secure zone. Inside, staff can trust that everyone was screened — they don't re-check each person at every gate. Guards are Vestra's security checkpoint: validate once at the boundary, and the entire app downstream can trust the data without defensive re-checking everywhere.
:::

## Guard functions

The validators are tiny and composable — bigger guards are built from smaller ones:

```js
// js/utils/validate.js
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Only the always-present, card-critical fields are required. */
export function isProduct(value) {
  return (
    isObject(value) &&
    isFiniteNumber(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.category) &&
    isFiniteNumber(value.price) &&
    isNonEmptyString(value.thumbnail)
  );
}
```

:::warning A real gotcha this guard encodes
`isProduct` deliberately does **not** require `images` or `reviews`. Why? Because list/rail responses fetch only a few fields (`select`) and omit those, while the product-detail response includes them. If the guard demanded `images`, it would wrongly reject every card in every rail. The [facade](#/pattern-facade)'s `normalizeProduct` then *defaults* the missing arrays to `[]`. Guards must match reality, not an idealised shape — this one is a great example of a check tuned to how the API actually behaves.
:::

## Validated storage reads

`localStorage` is a classic trust boundary — the data there might be from a previous, incompatible version of the app. The storage service refuses to hand back anything that fails its guard:

```js
// js/services/storage.js
export function readJson(key, guard, fallback) {
  const rawValue = readRaw(key);
  if (rawValue === null) return fallback;
  try {
    const parsed = JSON.parse(rawValue);
    if (guard(parsed)) return parsed;   // ← only trust it if the guard passes
  } catch { /* corrupt JSON */ }
  remove(key);       // proactively clear garbage so we don't re-parse it
  return fallback;   // hand back a safe default instead
}
```

So the wishlist store can hydrate fearlessly: pass a guard and a safe empty state, and corrupt or outdated data simply becomes the empty state instead of a crash:

```js
// js/state/wishlist-store.js
const initial = readJson(STORAGE_KEYS.WISHLIST, isWishlistStateV1, emptyState());
```

:::note The version lives in the key
Notice `STORAGE_KEYS.WISHLIST = 'vestra.wishlist.v1'`. The schema version (`v1`) is baked into the key. If the shape ever changes incompatibly, the app switches to `v2` — a brand-new key — and old data is simply ignored rather than mis-read. Clever and cheap.
:::

## Sanitising user input

User text is coerced into a safe range rather than trusted:

```js
// js/utils/validate.js
export function sanitizeSearch(value, maxLength = 80) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
export function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;   // e.g. a sort id from the URL
}
```

`oneOf` is why pasting `#/shop?sort=DROP_TABLE` can't break anything — an unrecognised sort silently becomes `RELEVANCE`.

## The XSS guard: the `html` tagged template

There's one more trust boundary: rendering data *into the page*. If you drop an API string straight into `innerHTML` and it contains `<script>`, you have a cross-site-scripting (XSS) hole. Vestra renders through a **tagged template** that escapes every interpolated value by default:

```js
// js/utils/dom.js
export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i += 1) {
    out += strings[i];
    if (i < values.length) out += renderValue(values[i]); // renderValue → escapeHtml
  }
  return new RawHtml(out);
}
```

So this is automatically safe even if `product.title` contains angle brackets:

```js
html`<h3 class="card__title">${product.title}</h3>`;
```

To insert HTML you built yourself (like an inline SVG icon), you must *opt out* explicitly with `raw(...)` — a deliberate, visible signal that says "I trust this string." Safe by default; unsafe only on request.

:::why Why put so much effort into distrusting data?
Because the alternative is defensive checks smeared through every component (`product?.reviews?.length ?? 0`), plus real security holes. Concentrating validation at the boundaries means: the core app code is clean and assumes good data; corrupt inputs fail loudly at the edge with a safe fallback; and there is exactly one place (`html`) responsible for escaping, so XSS can't sneak in through a forgotten spot.
:::

## Explaining it out loud

> *"Anything from outside — the API, `localStorage`, the URL, user text — is validated at the boundary by small guard functions before the app trusts it. Storage reads take a guard and a fallback, so corrupt data becomes a safe default instead of a crash, and the schema version is in the storage key. Rendering goes through an `html` tagged template that escapes everything by default, so API data can't inject scripts. Validate at the door, trust inside — like airport security."*

That completes the pattern tour. Next we zoom into the language itself: [OOP, explained here](#/oop).
