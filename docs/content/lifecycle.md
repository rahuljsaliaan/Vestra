# What happens when you click

In [The big picture](#/big-picture) we saw the six-step journey a click takes. Here it is again as a reminder — this page zooms into it:

<figure class="diagram">
  <ol class="d-flow">
    <li><b>1</b> You click something.</li>
    <li><b>2</b> The web address changes (no reload).</li>
    <li><b>3</b> The <strong>router</strong> works out which screen to show.</li>
    <li><b>4</b> The old screen is <strong>torn down</strong> (loads cancelled, listeners removed).</li>
    <li><b>5</b> The new screen <strong>mounts</strong> and asks a service for data.</li>
    <li><b>6</b> Data returns and the screen <strong>fills in</strong>.</li>
  </ol>
  <figcaption>The page lifecycle: the same journey, every single navigation.</figcaption>
</figure>

A Single-Page App has no page reloads, so *something* has to play the role the browser normally plays: deciding what to show, cleaning up the old screen, and drawing the new one. In Vestra that something is the **router** (`js/router/router.js`), and the contract it enforces is called the **page lifecycle**. This is where a little code starts to appear — but you've already got the shape of it from the picture above.

## What a "page" actually is

A page is not a file of HTML. It is an **object with three methods**, described in `js/types.js`:

```js
/**
 * @typedef {Object} Page
 * @property {(root, ctx) => void|Promise<void>} mount        // draw yourself into `root`
 * @property {(ctx) => void} [onQueryChange]                  // optional: the ?query changed
 * @property {() => void} unmount                             // clean yourself up
 */
```

Each page file exports a **factory** — `createHomePage()`, `createShopPage()`, and so on — that returns a fresh object with these methods. (Why a factory? See [Modules & Factories](#/pattern-module-factory).)

:::analogy A hotel room
`mount` is check-in: the room is prepared for you. `unmount` is check-out: housekeeping strips the bed and empties the bin so the next guest gets a clean room. `onQueryChange` is asking for extra towels *without checking out* — a small change while you stay in the same room. A hotel that never cleaned rooms between guests would be a disaster; a router that never called `unmount` would leak memory.
:::

## The whole cycle

```text
hashchange ──► parse the URL ──► match a route
                                     │
                    ┌────────────────┴─────────────────┐
              same page?                          different page?
                    │                                   │
             onQueryChange(ctx)                   teardownCurrent():
             (fast path, no                         • abort old requests
              refetch/rebuild)                       • old.unmount()
                    │                                   │
                    │                              new = factory()
                    │                              new.mount(root, ctx)
                    └────────────────┬─────────────────┘
                              onNavigated(match)
                        (highlight nav, run motion effects)
```

## Step 1 — the URL is parsed

The router listens for the browser's `hashchange` event. When it fires, it splits the hash into a **path** and a **query**:

```js
// #/shop?q=linen&sort=price-asc
//   path = "/shop"
//   query = URLSearchParams { q: "linen", sort: "price-asc" }
```

## Step 2 — the route is matched

At startup the router compiled each route pattern (like `/product/:id`) into a regular expression. Matching `/product/42` against that regex both confirms the route *and* pulls out `id = "42"`:

```js
// js/router/router.js
.replace(/:([A-Za-z0-9_]+)/g, (_m, name) => {
  paramNames.push(name);
  return '([^/]+)';        // ":id" becomes "capture anything but a slash"
});
```

Route order matters: more specific patterns come first, so `/edits/:slug` is tried before the looser `/edits`. If nothing matches, the router falls back to the 404 page.

## Step 3 — the old page is torn down

This is the step beginners forget and pros obsess over. Before mounting anything new, the router runs `teardownCurrent()`:

```js
function teardownCurrent() {
  if (currentAbort) currentAbort.abort();   // cancel in-flight fetches
  if (currentPage) currentPage.unmount();   // let the page clean up
}
```

Two mechanisms do the cleaning:

- **`AbortController`** — each navigation creates one. Its `signal` is passed down into every `fetch`. Calling `.abort()` cancels any request still in flight, so if you click away from a slow page, its half-finished network call is dropped instead of arriving late and scribbling onto the wrong screen.
- **The `Disposer`** — every page keeps one. Each listener, subscription, and timer it creates is registered with the disposer, and `unmount()` calls `disposer.dispose()` to unwind them all. This is what prevents listener leaks. It gets its own chapter: [The Disposer](#/pattern-disposer).

:::why Why cancel and clean up at all?
Without it, navigating around a SPA slowly poisons itself: old pages' click handlers keep firing, old timers keep ticking, and a slow request from three screens ago can resolve and overwrite what you're now looking at. Vestra treats teardown as a first-class responsibility, which is why it stays responsive no matter how much you click around.
:::

## Step 4 — the new page mounts

The router looks up the factory for the matched route, calls it to get a fresh page object, and calls `mount(root, ctx)`. The **context** object (`ctx`) is the page's whole world:

```js
/**
 * @typedef {Object} RouteContext
 * @property {Record<string,string>} params   // e.g. { id: "42" }
 * @property {URLSearchParams} query           // e.g. ?q=linen
 * @property {AbortSignal} signal              // aborts when the page unmounts
 */
```

Because `ctx.signal` aborts on unmount, a page can pass it straight into its fetches and get free cancellation. Notice the pattern in every page:

```js
product = await getById(id, { signal: ctx.signal });
if (ctx.signal.aborted) return;   // navigated away mid-fetch? bail out quietly.
```

## Step 5 — the fast path for query changes

Here is a clever optimisation. If you are on the shop page and only change a *filter* — the path `/shop` stays the same, only the `?query` changes — there is no need to tear down and rebuild the whole screen. The router detects "same path, different query" and calls the lighter `onQueryChange(ctx)` instead:

```js
const samePath = match.id === currentRouteId && match.path === currentPath;
if (samePath && currentPage) {
  currentPage.onQueryChange?.(makeContext(match, signal));
  return; // skip the full remount
}
```

The shop page uses this to re-filter the products it *already* loaded, instead of re-fetching from the network. (There is a subtlety here: the shop reflects filters into the URL with `history.replaceState`, which does **not** fire `hashchange`, avoiding an infinite loop. More in the [shopping walkthrough](#/feature-shopping).)

## Step 6 — the finishing touches

After a successful mount, the router calls `onNavigated(match)`, which highlights the active link in the header and triggers the [motion effects](#/feature-theming) for the newly-drawn content. Page swaps are even wrapped in the browser's **View Transitions API** for a smooth crossfade when supported — and, like all motion, it is skipped when the user prefers reduced motion.

:::tip Read the router with this in mind
Open `js/router/router.js` now. It is under 220 lines, and every one of them maps to a step above. `mountMatch` is steps 3–4, `handleMatch` is step 5, `resolve` is steps 1–2. Seeing the lifecycle first makes the file read like prose.
:::

You now understand the *skeleton* of the app. Next we learn the *vocabulary* — the design patterns that appear over and over. Start with [Patterns in plain English](#/patterns-intro).
