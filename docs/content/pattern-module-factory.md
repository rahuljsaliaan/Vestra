# Modules & Factories

Two patterns appear in every single file of Vestra. Learn these first and the rest of the code stops looking like a wall of text.

## The Module pattern

### The idea

A **module** is a self-contained file that keeps some things **private** and deliberately **exposes** others. In modern JavaScript, `export` marks what is public; everything else in the file is invisible to the outside world.

:::analogy A shop with a counter
A module is a shop. The **shop floor and cash register** (its `export`s) are what customers touch. The **stock room** (its un-exported functions and variables) is staff-only. Customers get a clean counter to interact with and never see the mess in the back. If you reorganise the stock room, no customer notices — that's *encapsulation*, and it's the whole point.
:::

### In Vestra

Look at `js/config/api.js`. It exposes exactly three ways to build a URL, and hides the helper that does the fiddly bits:

```js
// PRIVATE — only this file can see it
function applyListParams(params, opts = {}) {
  if (typeof opts.limit === 'number') params.set('limit', String(opts.limit));
  if (opts.fields?.length) params.set('select', opts.fields.join(','));
}

// PUBLIC — the shop counter
export const endpoints = Object.freeze({
  category(slug, opts) { /* uses applyListParams internally */ },
  search(query, opts) { /* … */ },
  product(id) { /* … */ },
});
```

The rest of the app calls `endpoints.product(42)` and never learns how query strings are assembled. That knowledge is sealed inside one file.

:::why Why split code into modules like this?
- **One reason to change.** Each file has a single job, so a bug or a new feature usually touches one file, not ten.
- **A small public surface.** You only have to understand a module's exports to use it — the private internals can be as clever as they like.
- **Safe refactoring.** You can rewrite anything private without fear, because nothing outside can depend on it.
:::

## The Factory pattern

### The idea

A **factory** is a function whose job is to **build and return a new object** (or element), fully assembled and ready to use. Instead of scattering `new Thing()` and setup code around, you call one function that hands you a finished product.

:::analogy A car factory vs building your own
You could source an engine, weld a chassis, and wire the electrics yourself every time you needed a car — or you could go to a factory and say "one car, please." The factory knows the assembly steps; you just get a working car. And every car it produces is **its own independent object** — your car and mine don't share a fuel tank.
:::

### In Vestra: component factories

Components are factory functions named `create…`. Give one some data, get back a ready DOM element:

```js
// js/components/product-card.js
export function createProductCard(product, options = {}) {
  const priceInr = usdToInr(product.price);
  const card = toElement(html`
    <article class="card">
      <a href="${routeTo.product(product.id)}">…</a>
    </article>
  `);
  // …attach behaviour…
  return card; // a finished, independent element
}
```

A page can call this in a loop to build a grid, and each card is its own object:

```js
pageItems.forEach((product, index) =>
  grid.append(createProductCard(product, { index })),
);
```

### In Vestra: page factories

Every page is a factory too. It returns the `{ mount, unmount }` object the [router](#/lifecycle) expects:

```js
// js/pages/product.js
export function createProductPage() {
  const disposer = new Disposer();     // private state for THIS page instance
  const teardowns = [];
  return {
    async mount(root, ctx) { /* … */ },
    unmount() { /* … */ },
  };
}
```

:::why Why a factory here instead of a plain object?
Because each navigation needs a **fresh, independent instance**. The `disposer` and `teardowns` above are created *per page visit*. If pages were shared singletons, visiting the product page twice would tangle the second visit's listeners with the first's. The factory guarantees a clean slate every time — the same reason you want a new hotel room, not the last guest's.
:::

### Factories that return richer handles

Some component factories return an object with the element *plus* methods to control it later:

```js
// js/components/rail.js returns:
return { el, track, setItems, destroy };
```

The page mounts `rail.el`, later calls `rail.setItems([...])` to swap the contents, and `rail.destroy()` on cleanup. The factory decides what controls to expose — again, a small public surface over private internals. This is the Module pattern and the Factory pattern working together.

## How to spot them when explaining the code

- A **module** is just "a file with `export`s." Point at the exports: *"this is the public API; everything else is private."*
- A **factory** is "a `create…` function that returns a new thing." Point at the `return`: *"call this and you get a fresh, self-contained object."*

Next: how Vestra remembers changing data and lets the UI react — [The Observer store](#/pattern-observer).
