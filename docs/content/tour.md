# A guided tour

This chapter gives you the **whole mental model in ten minutes**. We will follow one real action — *clicking a product* — and watch it travel through every layer. Once you can narrate this journey, the rest of the docs are just zooming in on each stop.

## The cast of characters

Vestra has a handful of "kinds of files". Here is the one-sentence job of each:

| Layer | One-sentence job | Analogy |
| --- | --- | --- |
| `config/` | Remember every fixed value and setting. | The rule book |
| `utils/` | Tiny reusable tools with no memory. | The Swiss-army knife |
| `services/` | Fetch data, cache it, apply business logic. | The kitchen |
| `state/` | Remember things that change (wishlist, theme). | The notepad |
| `components/` | Draw a reusable piece of UI. | Lego bricks |
| `pages/` | Assemble bricks into one screen. | The Lego instructions |
| `router/` | Pick which page to show for the URL. | The usher |
| `app.js` | Turn everything on. | The light switch |

## The single page

Open `index.html`. It is almost empty:

```html
<header id="app-header"></header>
<main id="app-main"></main>
<footer id="app-footer"></footer>
<script type="module" src="js/app.js"></script>
```

This is a **Single-Page Application (SPA)**. There is exactly one HTML file. JavaScript fills in the header, main, and footer, and swaps out the `<main>` contents as you navigate — the page never fully reloads. The `<script type="module">` line is the only entry point; it loads `app.js`, which loads everything else.

:::analogy A theatre stage
Think of `<main>` as a theatre stage. The set (the header/footer) stays put. When you "change page", stagehands don't rebuild the theatre — they just swap the scenery on the stage. That swap is what the [router](#/lifecycle) orchestrates.
:::

## Following a click, step by step

Say you are on the shop page and you click a product card. Here is the whole trip.

### 1. The URL changes

Every product card is just a link to a **hash URL**:

```js
// js/config/routes.js
product: (id) => buildHref(`/product/${encodeURIComponent(String(id))}`),
// produces e.g. href="#/product/42"
```

Clicking it changes the part of the address after the `#`. Crucially, changing the hash does **not** reload the page — the browser just fires a `hashchange` event. That is the trick every SPA uses to feel instant.

### 2. The router wakes up

The [router](#/lifecycle) is listening for `hashchange`. It reads `#/product/42`, matches it against its list of route patterns, and finds the one for `/product/:id`. It extracts `id = "42"`.

### 3. The old page is torn down

Before showing the new screen, the router **cleans up** the previous one: it aborts any half-finished network requests and removes every event listener the old page added. This is done by two helpers you will meet often — an `AbortController` and a `Disposer`. This is why navigating around Vestra never leaks memory or leaves zombie timers running.

### 4. The new page mounts

The router calls the product page's `mount()` function. The page immediately draws a grey **skeleton** placeholder so the screen isn't blank, then asks a service for the data:

```js
// js/pages/product.js (simplified)
product = await getById(id, { signal: ctx.signal });
```

### 5. The service does the real work

`getById` lives in the [product service](#/pattern-facade). Behind that one friendly function call, a lot happens — but it is all hidden:

- Check the **cache** first. If we fetched product 42 recently, return it instantly.
- Otherwise call the network via the **HTTP client**, which adds a timeout and retries on failure.
- **Validate** the response — is this really a product shape? — before trusting it.

### 6. The page renders and comes alive

With real data in hand, the page builds the gallery, the price, the **cross-store comparison table**, the reviews, and a "you may also like" rail — all from small reusable [components](#/pattern-module-factory). Then it wires up buttons (like "Shop best price"), remembering each listener in its `Disposer` so step 3 can clean them up next time.

## The one diagram to remember

```text
   click a link
        │
   URL hash changes  ──►  hashchange event
        │
   ROUTER  ──►  tear down old page (abort + dispose)
        │
   ROUTER  ──►  mount new PAGE
        │
   PAGE  ──►  ask a SERVICE for data
        │              │
        │         cache? ──► yes ──► return instantly
        │              │
        │              no  ──► HTTP client ──► validate ──► cache ──► return
        │
   PAGE  ──►  build UI from COMPONENTS  ──►  wire up events (remember them to dispose later)
```

That's the entire application in one picture. Everything else in these docs is a close-up of one of those boxes.

:::tip You already know enough to explore
With this map in your head, open any file and you can guess its job from its folder. A file in `services/` fetches or computes; a file in `components/` draws; a file in `pages/` assembles. Trust the folders.
:::

Next: why this one-way layering is such a big deal — [The layered architecture](#/architecture).
