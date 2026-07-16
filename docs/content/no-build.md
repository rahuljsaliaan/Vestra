# No framework, no build

One of the most unusual — and educational — decisions in Outfit Buddy is that it uses **no framework and no build step**. This chapter explains what that means and why it was chosen, because you will certainly be asked.

## What "no build step" means

Most modern web apps go through a **build**: you write code in React/TypeScript/Sass, then a tool (Webpack, Vite, etc.) *compiles* it into plain files the browser can run. The code you write is not the code that ships.

Outfit Buddy skips all of that. The `.js` and `.css` files in the repository are **exactly** what runs in the browser. There is nothing to install (`node_modules` does not exist here) and nothing to compile.

:::analogy Fresh ingredients vs a ready-meal factory
A build step is like a food factory: raw ingredients go in, packaged meals come out, and you can't see the original ingredients anymore. Outfit Buddy is a home kitchen — what's on the counter is what you eat. For *learning*, the home kitchen is priceless: nothing is hidden.
:::

## The two things that make it possible

### 1. Native ES modules

Browsers can now load JavaScript modules directly. Outfit Buddy uses `import` / `export` exactly as a bundler would, but the browser resolves them itself:

```js
// js/pages/home.js
import { getAllFashion } from '../services/product-service.js';
import { createProductCard } from '../components/product-card.js';
```

The `<script type="module">` in `index.html` is what unlocks this. The browser downloads `app.js`, sees its imports, downloads those, and so on — a dependency graph resolved live.

:::note Note the .js extensions
In module imports Outfit Buddy always writes the full `../services/http.js`, extension and all. Bundlers let you drop the extension, but the *browser* needs it. This is a small tax you pay for having no build step.
:::

### 2. JSDoc instead of TypeScript

TypeScript gives you type-checking, but it needs a compile step. Outfit Buddy gets much of the same safety with **JSDoc comments** — structured comments that editors like VS Code understand:

```js
/**
 * @param {string} slug
 * @param {{limit?: number, skip?: number}} [opts]
 * @returns {Promise<Product[]>}
 */
export function getByCategory(slug, opts = {}) { /* … */ }
```

All the shared shapes (what a `Product` looks like, what an `Offer` looks like) are declared once in `js/types.js` as `@typedef`s, then referenced everywhere:

```js
/** @type {import('../types.js').Product} */
```

Open the project in an editor with TypeScript support and you get autocomplete, red squiggles on mistakes, and inline docs — **type safety with zero build**.

:::why Why choose this for a real product?
For a small, self-contained storefront, a framework would add megabytes of dependencies, a toolchain to maintain, and a layer of abstraction between you and the browser. Vanilla keeps the app tiny, fast to load, and dependency-free (nothing to get outdated or hacked via a supply-chain attack). The trade-off — you write some plumbing (a router, a store) yourself — is exactly what makes this codebase such a good teacher: **you can see every wire.**
:::

## What you give up (and how Outfit Buddy copes)

A framework hands you things for free. Without one, Outfit Buddy rebuilds the essentials by hand — and each becomes a chapter in these docs:

| A framework gives you… | Outfit Buddy hand-rolls it in… |
| --- | --- |
| Routing (URL → screen) | [`router/router.js`](#/lifecycle) |
| Reactive state | [`state/store.js`](#/pattern-observer) |
| Components | [factory functions](#/pattern-module-factory) |
| Safe HTML rendering | the [`html` tagged template](#/pattern-guards) |
| Cleanup on unmount | the [`Disposer`](#/pattern-disposer) |

Seeing these built from scratch demystifies what frameworks are *actually doing* under the hood. When you later learn React, you will recognise every idea — because you saw the manual version here first.

Next, the map that ties every file together: [The layered architecture](#/architecture).
