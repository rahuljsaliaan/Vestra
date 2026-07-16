# The big picture

This is the most important page in the docs. Before we look at a single line of code, let's build a **mental picture** of the whole app — one you can hold in your head and describe to anyone. If you can picture these four things, everything else will make sense.

We'll cover:

1. What the app *is* (one page that swaps its middle).
2. How the code is *organised* (layers, like floors of a building).
3. What *happens* when you use it (a simple six-step journey).
4. Where things *live* (a folder map).

No code on this page — just pictures and plain words.

## What it does, in one picture

Before the shape of the code, the shape of the *idea*. The home screen is a **stylist**: you make four quick choices and it builds looks.

<figure class="diagram">
  <ol class="d-flow">
    <li><b>1</b> Pick an <strong>occasion</strong> (work, date, party…).</li>
    <li><b>2</b> Confirm the <strong>weather</strong> — auto-detected, or tap to set it.</li>
    <li><b>3</b> Choose <strong>who for</strong> and your <strong>vibe</strong>.</li>
    <li><b>4</b> Hit <strong>Style me</strong> → coordinated looks, each with links to <em>shop</em> or <em>get inspired</em>.</li>
  </ol>
  <figcaption>The recommender is the front door. Everything else — browsing, price comparison, wishlist — supports it.</figcaption>
</figure>

Keep that flow in mind; the [recommender walkthrough](#/feature-recommender) shows exactly how the code assembles a look. Now, the technical shape:

## 1. It's one page that swaps its middle

Outfit Buddy is a **Single-Page Application** (SPA). That sounds technical, but it means something simple: there is only **one** web page. As you click around, the app doesn't load new pages from a server — it just **replaces the middle section** of the page you're already on. The top (header) and bottom (footer) stay put.

<figure class="diagram">
  <div class="d-window">
    <div class="d-window__bar"><span></span><span></span><span></span></div>
    <div class="d-region d-region--fixed">HEADER — logo, menu, search (always here)</div>
    <div class="d-region d-region--swap">MAIN<small>the only part that changes as you navigate</small></div>
    <div class="d-region d-region--fixed">FOOTER — always here</div>
  </div>
  <figcaption>Home, Shop, Product… are all the same page — only the highlighted middle is swapped out.</figcaption>
</figure>

:::analogy A theatre stage
The theatre (header + footer) stays the same all night. When the scene changes, stagehands don't rebuild the theatre — they just swap the **set** on the stage. In Outfit Buddy, the "stage" is the middle section, and swapping the set is what "changing page" means. That's why moving around feels instant: nothing is rebuilt from scratch.
:::

## 2. The code is organised in layers

Now, *inside* the code, how are the files arranged? In **layers** — like the floors of a building. Each floor rests on the ones below it and only ever depends on what's underneath.

<figure class="diagram">
  <div class="d-stack">
    <div class="d-layer" style="--i:6"><b>app</b><span>the “on” switch that starts everything</span></div>
    <div class="d-layer" style="--i:5"><b>pages</b><span>one whole screen each — Home, Shop, Product…</span></div>
    <div class="d-layer" style="--i:4"><b>components</b><span>reusable UI pieces — a product card, a carousel</span></div>
    <div class="d-layer" style="--i:3"><b>state</b><span>remembers things that change — your wishlist, the theme</span></div>
    <div class="d-layer" style="--i:2"><b>services</b><span>fetches data, caches it, does the thinking</span></div>
    <div class="d-layer" style="--i:1"><b>utils</b><span>tiny reusable tools — format a price, escape text</span></div>
    <div class="d-layer d-layer--base" style="--i:0"><b>config</b><span>the rule book — every fixed setting and value</span></div>
  </div>
  <figcaption>Read it bottom-to-top. Each layer may only use the layers below it — never above.</figcaption>
</figure>

The golden rule: **things only depend downward.** A page (near the top) can use everything below it. But `config` (the foundation) knows nothing about the floors above. This one rule is what keeps the project tidy as it grows — we'll see exactly why on the next page.

:::analogy Floors of a building
You pour the foundation first, then frame the lower floors, then the upper ones. The penthouse relies on the foundation; the foundation doesn't rely on the penthouse. You can redecorate the top floor without touching the concrete below. Outfit Buddy's layers work the same way — change a page without any risk to the foundation.
:::

## 3. What happens when you use it

Here's the whole app in motion. Say you're on the Shop page and you click a product. This is the journey, start to finish:

<figure class="diagram">
  <ol class="d-flow">
    <li><b>1</b> You <strong>click</strong> a product.</li>
    <li><b>2</b> The <strong>web address changes</strong> (the bit after the <code>#</code>). The page does <em>not</em> reload.</li>
    <li><b>3</b> The <strong>router</strong> notices and works out which screen to show.</li>
    <li><b>4</b> It <strong>clears away the old screen</strong> — cancelling anything still loading, tidying up.</li>
    <li><b>5</b> It <strong>builds the new screen</strong> and asks a service, “get me this product.”</li>
    <li><b>6</b> The data comes back — from memory if we fetched it recently, otherwise from the internet — and the screen <strong>fills in</strong>.</li>
  </ol>
  <figcaption>Every navigation follows these same six steps. Learn this journey and you understand the app.</figcaption>
</figure>

Two small heroes make step 4 and step 6 reliable, and you'll meet them again later:

- A **router** — the "usher" that reads the address and decides which screen to show.
- A **service** — the "kitchen" that fetches and prepares data, so screens don't have to worry about the network.

## 4. Where things live

When you open the project, you'll see these folders. Here is the one-line job of each — the same layers as the stack above, in the order they appear:

| Folder | Its job, in one line | Think of it as… |
| --- | --- | --- |
| `config/` | Every fixed value and setting. | The rule book |
| `utils/` | Tiny reusable tools. | A Swiss-army knife |
| `services/` | Fetch data, cache it, do the logic. | The kitchen |
| `state/` | Remember things that change. | A notepad |
| `components/` | Reusable UI pieces. | Lego bricks |
| `pages/` | One full screen each. | Lego instructions |
| `router/` | Pick the screen for the address. | An usher |
| `app.js` | Turn everything on. | The light switch |

:::tip You can now guess where anything lives
Need a helper to format a date? It's in `utils/`. A new screen? `pages/`. Something about the wishlist being remembered? `state/`. Trusting the folders is half of understanding a codebase — and Outfit Buddy's folders are honest.
:::

## You now have the map

That's the entire application:

> **One page that swaps its middle, built in downward-only layers, that responds to clicks with a six-step journey, and keeps every kind of code in its own folder.**

Everything else in these docs simply zooms into one of those ideas. If you only wanted the big picture, you have it — feel free to stop here and come back later.

To go one level deeper on *why* the layering matters so much, continue to **[How the app is organised](#/architecture)**.
