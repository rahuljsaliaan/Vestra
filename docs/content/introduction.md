# Vestra, explained for humans

Welcome. This is a **guided tour of the Vestra codebase**, written for someone who is about to explain the project to other people — a teammate, a mentor, an interviewer, a class — and who is *not* yet an expert. Every concept is introduced from zero, with a real-world analogy and, most importantly, an answer to the question **"why is the code written this way?"**

:::note What is Vestra?
**Vestra** is a *fashion-aggregator storefront*. You browse clothing from one beautiful website, and when you want to buy, Vestra sends you to whichever store (Amazon, Flipkart, Myntra, Ajio, Tata CLiQ) has the best price. Think of it as a **price-comparison mall** for clothes: one entrance, many shops inside.
:::

The remarkable thing about Vestra, from a learning point of view, is that it is built with **plain HTML, CSS and JavaScript** — no React, no Vue, no build tools, nothing to install. Yet it is organised with the same discipline you would find in a large professional application. That makes it a near-perfect specimen for learning **how good software is structured**, without any framework magic hiding the moving parts.

## Who these docs are for

You do not need to know React, TypeScript, or any framework. You *should* be comfortable reading basic JavaScript (variables, functions, `if`/`for`). Everything beyond that — modules, classes, promises, design patterns, object-oriented programming — is explained here as we meet it in the code.

:::tip How to read this
Read the sections **in order** the first time. Each one builds on the last: the architecture chapter gives you the map, the patterns chapters teach you the vocabulary, and the walkthroughs show you the vocabulary being used in real features. If you only have ten minutes, read the [guided tour](#/tour).
:::

## What you will be able to explain

By the end you will be able to stand in front of the code and confidently answer:

- **"How is the project organised, and why?"** — the [layered architecture](#/architecture).
- **"What happens, step by step, when I click a link?"** — the [page lifecycle](#/lifecycle).
- **"What is a design pattern, and which ones are used here?"** — the [patterns chapters](#/patterns-intro).
- **"What does object-oriented programming actually mean in this code?"** — the [OOP chapter](#/oop).
- **"How does feature X work?"** — the [feature walkthroughs](#/feature-shopping).

<div class="card-grid">
<a class="nav-card" href="#/running"><b>▶ Run it first</b><span>Get Vestra on screen in two commands, then come back.</span></a>
<a class="nav-card" href="#/architecture"><b>🏛 The big picture</b><span>The one diagram that explains the whole app.</span></a>
<a class="nav-card" href="#/patterns-intro"><b>🧩 Design patterns</b><span>Reusable solutions, each with a real-world analogy.</span></a>
<a class="nav-card" href="#/presenting"><b>🎤 Present it</b><span>A script for explaining Vestra out loud.</span></a>
</div>

## The shape of the code

Here is the entire project in one glance. Do not worry about the details yet — just notice that everything has a place.

```text
index.html            the single web page everything loads into
css/                  design tokens, layout, components, pages, motion
js/
  config/             constants & settings — the "rule book"
  utils/              tiny reusable helpers (formatting, escaping, hashing)
  services/           talking to the network, caching, business logic
  state/              remembering things (wishlist, theme, quiz answers)
  router/             deciding which page to show for a given URL
  components/         reusable pieces of UI (a product card, a rail)
  pages/              one file per screen (home, shop, product…)
  motion/             scroll animations and flourishes
  app.js              the "on" switch that starts everything
```

The golden rule that holds it all together is a **one-way flow of dependencies**:

```text
config → utils → services → state → components → pages → app
```

A file may only use things to its *left*. A utility may use config; a page may use everything before it; but config may never reach forward into pages. We will unpack exactly why this matters in [The layered architecture](#/architecture).

:::analogy A kitchen brigade
A professional kitchen has stations: prep, sauté, plating, pass. Ingredients flow one way — from prep toward the plate — never backward. You would never send a finished dish back to the vegetable-peeling station. Vestra's layers are those stations. Data flows one way, so no matter how big the "restaurant" gets, everyone knows where they stand and nothing loops back on itself.
:::

## A taste of the code

Vestra never scatters "magic values" through the code. Every meaningful number or string is named once, in the config layer. Here is a real slice of `js/config/constants.js`:

```js
/** Time-related tuning, all in milliseconds. */
export const TIMINGS = Object.freeze({
  SEARCH_DEBOUNCE_MS: 300, // wait this long after typing before searching
  SKELETON_MIN_MS: 350,    // show the loading placeholder at least this long
  TOAST_MS: 3200,          // how long a little notification stays on screen
});
```

Notice three things a beginner can already appreciate:

1. `Object.freeze(...)` makes the object **read-only** — nobody can accidentally change a timing at runtime.
2. Each value has a **name and a comment**, so `TIMINGS.SEARCH_DEBOUNCE_MS` reads like a sentence.
3. It is **exported**, so every other file shares the *same* number. Change it once, it changes everywhere.

> This single habit — "no magic strings, everything named in config" — is one of the biggest reasons the codebase feels calm and easy to change.

## Where things live at a glance

| If you want to understand… | Read the chapter | It lives in |
| --- | --- | --- |
| How screens are chosen from the URL | [The life of a page](#/lifecycle) | `js/router/` |
| How data is fetched and cached | [Facade](#/pattern-facade), [Caching](#/pattern-decorator-cache) | `js/services/` |
| How the wishlist remembers items | [The Observer store](#/pattern-observer) | `js/state/` |
| How prices compare across stores | [Adapters & registries](#/pattern-adapter) | `js/services/offers-service.js` |
| How the UI is drawn | [Modules & factories](#/pattern-module-factory) | `js/components/`, `js/pages/` |

Ready? The very first thing to do is **see it running**, so the words on these pages have pictures to attach to. Head to [Running the project](#/running).
