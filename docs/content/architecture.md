# How the app is organised

In [The big picture](#/big-picture) you saw the layers drawn as floors of a building. This page goes one level deeper: the **one rule** that governs those layers, and — the part that really matters — **why** that rule pays off. Still very little code; mostly ideas.

If you remember one line about Outfit Buddy, remember this:

```text
config  →  utils  →  services  →  state  →  components  →  pages  →  app
```

That is the **layered architecture**, written as a one-way street. This chapter unpacks the single rule behind it and what it buys you.

## The rule: dependencies point one way

Every file may only `import` from layers to its **left**. Never to its right.

- `utils/` may use `config/`.
- `services/` may use `config/` and `utils/`.
- `pages/` may use everything before it.
- `config/` may use **nothing** else in the app — it is pure data, the foundation everyone stands on.

That is the entire rule. There are no exceptions, and because imports are visible at the top of every file, any violation is obvious at a glance.

:::analogy Building a house
You pour the **foundation** (config) first. On it you frame the **structure** (utils, services). Then **plumbing and wiring** (state). Then **rooms** (components). Then you **decorate and furnish** (pages). You would never run a decorating decision back down into the foundation. Each layer rests on the ones below and knows nothing about the ones above. That is why you can repaint a room without re-pouring concrete.
:::

## The seven layers, one at a time

### config — the rule book

The single source of truth for every fixed value: API URLs, route patterns, timings, storage keys, the list of retailers, the category taxonomy, quiz questions. **No other file is allowed to write a "magic" number or string.** Instead of `setTimeout(fn, 300)` scattered around, you write `setTimeout(fn, TIMINGS.SEARCH_DEBOUNCE_MS)`.

```js
// js/config/constants.js
export const PRICING = Object.freeze({
  USD_TO_INR_DISPLAY_RATE: 84,
  CURRENCY: 'INR',
  LOCALE: 'en-IN',
  CHARM_ENDING: 99, // prices end in …99 for a retail feel
});
```

### utils — the Swiss-army knife

Small, **pure** helper functions with no memory and no side effects: format a price, escape HTML, hash a string, debounce a function. Give the same input, get the same output, every time. Because they touch nothing external, they are trivial to test and safe to reuse anywhere.

### services — the kitchen

Everything involving **I/O or real logic**: the HTTP client, the cache, the one module that talks to DummyJSON, the price-comparison simulation, catalog filtering/sorting, and safe `localStorage` access. Services are where "get me the products in this category" turns into real work.

### state — the notepad

Things that **change over time and must be remembered**: the wishlist, the colour theme, the quiz profile. Built on a tiny observer store (see [The Observer store](#/pattern-observer)) so the UI can react when they change.

### components — the Lego bricks

**Presentational** building blocks: a product card, a horizontal rail, a filter panel, a skeleton loader. A component is handed its data and draws itself. **It never fetches** and never decides *what* to show — only *how* to show it.

### pages — the instructions

One file per screen. A page's job is **assembly**: fetch the data it needs from services, arrange components on the screen, wire up the interactions, and clean up after itself. Home, Shop, Product, Wishlist, Quiz, Edits, 404.

### app — the light switch

`app.js` runs once. It grabs the header/main/footer elements, mounts the persistent layout, registers which page belongs to which route, and starts the router. After that, it steps back and the router runs the show.

## Why bother? The payoff

This structure is not bureaucracy for its own sake. It buys concrete things:

:::why The benefits, in plain terms
- **You always know where code goes.** New formatting helper? `utils/`. New screen? `pages/`. There is never a debate.
- **Changes stay contained.** Because nothing depends on the layers above it, editing a page can't possibly break a utility. Blast radius is small.
- **The swappable seam.** The prices are simulated, but only `services/offers-service.js` knows that. Because pages depend on services (not the other way round), a real pricing API could replace that one file and **no page would change**. The README calls this the "retailer-adapter seam".
- **It's testable.** Pure utils and services can be tested with plain Node, no browser — because they don't reach up into the DOM-heavy layers.
- **It onboards people fast.** A newcomer learns seven folders and one rule, and can then predict where anything lives.
:::

## Spotting the layers in an import block

You can read a file's "altitude" straight from its imports. Here is the top of a page:

```js
// js/pages/shop.js
import { html, toElement, Disposer, delegate } from '../utils/dom.js';       // utils
import { QUERY_KEYS, routeTo } from '../config/routes.js';                    // config
import { getAllFashion, getByCategory } from '../services/product-service.js';// services
import { applyCatalog, SORT_OPTIONS } from '../services/catalog.js';          // services
import { createFilters } from '../components/filters.js';                     // components
import { createProductCard } from '../components/product-card.js';            // components
```

Every import points *left* on the diagram — config, utils, services, components. A page pulling from all the lower layers is exactly what you expect. If you ever saw a `services/` file importing from `pages/`, you would know instantly that something is wrong.

:::tip The litmus test
Ask of any file: *"What is the highest layer it imports from?"* That tells you its own layer. And if the answer is "a layer above me", the design has been violated. In Outfit Buddy, it never is.
:::

Next: watch the layers cooperate in real time — [What happens when you click](#/lifecycle).
