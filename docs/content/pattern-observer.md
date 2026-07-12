# The Observer store

How does the little wishlist counter in the header update the instant you tap a heart on a product card — even though the heart and the counter are in completely different parts of the app? The answer is the **Observer pattern**, and Vestra's whole state layer is built on one tiny implementation of it: `createStore` in `js/state/store.js`.

## The idea

In the Observer pattern, one object (the **subject**) holds some data. Other objects (the **observers**) say "tell me whenever that data changes." When it changes, the subject notifies every observer automatically. The observers never have to keep *asking* "has it changed yet?"

:::analogy A newspaper subscription
The newspaper (the subject) doesn't phone every reader to ask if they want today's edition. Readers **subscribe** once; whenever a new edition is printed, every subscriber gets a copy delivered. New readers can subscribe, and readers can cancel, without the paper changing how it prints. That's exactly a store: subscribe once, get notified on every change, unsubscribe when you leave.
:::

## The implementation

`createStore` is under 90 lines. Here is its skeleton:

```js
// js/state/store.js
export function createStore(initialState) {
  let state = Object.freeze({ ...initialState });
  const listeners = new Set();

  function getState() { return state; }

  function setState(patch) {
    const resolved = typeof patch === 'function' ? patch(state) : patch;
    const prev = state;
    const next = Object.freeze({ ...state, ...resolved });
    // …skip if nothing actually changed…
    state = next;
    for (const listener of listeners) listener(state, prev);  // notify everyone
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);   // calling this unsubscribes
  }

  return { getState, setState, subscribe, select };
}
```

Four things worth pausing on:

1. **`state` and `listeners` are private.** They live in the function's closure — nothing outside `createStore` can touch them directly. (This is [encapsulation](#/oop); the closure *is* the private box.)
2. **`setState` merges a patch** and then loops over listeners to notify them. It also **skips notifying if nothing changed**, so the UI doesn't re-render for no reason.
3. **`subscribe` returns an unsubscribe function.** You call `subscribe`, and you get back the exact function to call later to stop listening — no bookkeeping on your side.
4. **State is frozen.** `Object.freeze` makes each state object read-only, so the only way to change anything is through `setState`. Nobody can reach in and mutate state behind the store's back.

## `select` — only wake up when it matters

`subscribe` fires on *every* change. Often you only care about one slice — the theme, say, not the whole user object. `select` handles that:

```js
function select(selector, listener) {
  let current = selector(state);
  return subscribe((next) => {
    const value = selector(next);
    if (!Object.is(value, current)) {   // did MY slice change?
      current = value;
      listener(value, current);
    }
  });
}
```

The header uses it so the theme button only redraws when the theme actually flips:

```js
// js/components/layout.js
userStore.select(
  (s) => s.theme,
  (theme) => { btn.innerHTML = theme === 'dark' ? icon('sun') : icon('moon'); },
);
```

## The stores built on top

Vestra doesn't expose the raw store. It wraps `createStore` in two purpose-built stores with friendly, domain-specific methods:

### `userStore` — theme + quiz profile

```js
// js/state/user-store.js
const store = createStore({ theme: resolveInitialTheme(), quizProfile: readJson(...) });

export const userStore = {
  subscribe: store.subscribe,
  select: store.select,
  getState: store.getState,
  toggleTheme() { /* flips and persists */ },
  setQuizProfile(profile) { /* stores and persists */ },
};
```

### `wishlistStore` — saved items + collections

`wishlistStore` adds methods like `toggle`, `isWished`, `createCollection`, and `remove`. Two touches make it robust:

```js
// js/state/wishlist-store.js
store.subscribe(persistAndBroadcast);   // any change → save to localStorage + announce
```

Every change automatically **persists to `localStorage`** and **broadcasts a `WISHLIST_CHANGED` event**. That event is how the header badge updates from anywhere — which is the [Pub/Sub pattern](#/pattern-events), the next chapter.

:::why Why build a store at all, instead of just using variables?
A plain global variable can be changed, but nothing *notices*. You'd have to manually find and update every part of the UI that cares — and you'd forget one. The store inverts that: parts of the UI declare their interest once (`subscribe`/`select`) and are kept in sync forever, automatically. This is precisely the problem React's `useState` solves; Vestra shows you the ~30 lines of machinery underneath the magic.
:::

## Explaining it out loud

> *"State that changes lives in a store. A store holds frozen data and a set of listeners. You change it only through `setState`, which merges your patch and notifies every listener. UI pieces `subscribe` (or `select` a slice) to stay in sync, and unsubscribe when they leave. The wishlist and theme are both just stores."*

Next: how the store's changes travel to code that isn't even subscribed — [Events & Pub/Sub](#/pattern-events).
