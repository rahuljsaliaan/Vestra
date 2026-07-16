# The Disposer (cleanup)

In a Single-Page App the page never truly reloads, so the browser never automatically clears away old event listeners, subscriptions, and timers. If you don't clean them up yourself, they pile up — a **memory leak** and a source of weird bugs. Outfit Buddy solves this with one small, reusable class: the **`Disposer`** in `js/utils/dom.js`.

## The problem, concretely

Every screen adds listeners: click handlers, scroll handlers, store subscriptions, `setTimeout`s. When you navigate away, the DOM those handlers were attached to is thrown out — but the handlers, and anything they reference, may linger. Do this a few dozen times and you have zombie handlers firing on ghosts, and memory that never gets freed.

:::analogy Leaving the campsite
Good campers follow one rule: *pack out everything you packed in.* Every tent peg, every bit of litter. The `Disposer` is a **bin bag you carry through your whole visit**: every time you set something up, you drop the matching "undo" into the bag. When you leave, you empty the bag in one go and the site is spotless. No peg left in the ground, no timer left ticking.
:::

## The class

```js
// js/utils/dom.js
export class Disposer {
  constructor() { this._fns = []; }

  /** Register a teardown callback. */
  add(fn) { this._fns.push(fn); return fn; }

  /** Add an event listener AND register its removal in one call. */
  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.add(() => target.removeEventListener(type, handler, options));
  }

  /** Run every teardown callback (newest first) and clear the list. */
  dispose() {
    const fns = this._fns;
    this._fns = [];
    for (let i = fns.length - 1; i >= 0; i -= 1) {
      try { fns[i](); } catch (err) { console.error('Disposer teardown failed:', err); }
    }
  }
}
```

Three details make it robust:

1. **`listen` pairs setup with teardown atomically.** You can't add a listener and forget to record its removal — the method does both, so they can never drift apart.
2. **`dispose` runs teardowns in reverse order** (last-in, first-out), the natural order for unwinding nested setup — like taking your shoes off after your socks.
3. **A failing teardown can't block the others.** Each runs in a `try/catch`, so one broken cleanup doesn't strand the rest.

## How pages use it

Every page factory creates a `Disposer`, threads it through every subscription and listener, and empties it on `unmount`:

```js
// pattern seen in every page (here: shop.js)
export function createShopPage() {
  const disposer = new Disposer();
  return {
    async mount(root, ctx) {
      disposer.listen(searchInput, 'input', () => onSearch(searchInput.value));
      disposer.listen(sortSelect, 'change', () => change({ sort: sortSelect.value }));
      disposer.add(() => filtersComp?.destroy());   // components clean up too
      disposer.add(() => onSearch.cancel());         // cancel a pending debounce
    },
    unmount() {
      disposer.dispose();   // ← one line unwinds everything above
    },
  };
}
```

The store's `subscribe` and `select` methods return their *own* unsubscribe functions, which slot straight into the disposer:

```js
disposer.add(userStore.select((s) => s.theme, (theme) => { /* redraw button */ }));
```

Because `select` returns "the function that unsubscribes," and `disposer.add` returns the function it was given, they compose beautifully — the subscription is registered for cleanup in the same breath it's created.

## It works with the router's other cleanup

Recall the [page lifecycle](#/lifecycle): on navigation the router does two things — it `abort()`s the navigation's `AbortController` (killing in-flight fetches) and calls the page's `unmount()` (which calls `disposer.dispose()`). Together they guarantee that when a page leaves, **nothing it started outlives it**: no pending request, no listener, no timer, no subscription.

:::why Why not just rely on the browser or a framework?
Frameworks like React hide this behind `useEffect` cleanup returns — but they're doing the exact same bookkeeping under the hood. Vanilla JS gives you nothing for free, so Outfit Buddy builds the minimum: a list of undo-functions and a method to run them. It's ~30 lines, it's easy to reason about, and it makes "clean teardown" a habit the code physically enforces (you tend to reach for `disposer.listen` instead of raw `addEventListener`).
:::

## Explaining it out loud

> *"Because a SPA never reloads, old listeners and timers would leak. Every page keeps a `Disposer` — think of it as a bin bag. Whenever the page adds a listener, subscription, or timer, it drops the matching cleanup into the bag, usually via `disposer.listen(...)` which pairs add-and-remove automatically. On unmount, `disposer.dispose()` empties the bag in reverse order. Combined with the router aborting in-flight fetches, nothing a page starts ever outlives it."*

Next: how Outfit Buddy refuses to trust data from the outside world — [Guards & Validation](#/pattern-guards).
