# OOP, explained here

**Object-Oriented Programming (OOP)** is a way of organising code around **objects** — bundles of data together with the operations that work on that data. Vestra is not written in a heavy, class-everywhere OOP style, but it uses the core OOP *ideas* precisely where they earn their keep. That makes it a great place to learn what the ideas actually mean, without the noise.

This chapter walks the four classic pillars — **encapsulation, abstraction, inheritance, polymorphism** — plus **immutability**, each anchored to real Vestra code.

:::analogy Objects are things with skills
Think of an object as a **kitchen appliance**. A blender *has* data (what's inside it, its speed setting) and *skills* (blend, pulse, stop). You interact with its buttons, not its motor. OOP is just modelling your program as a set of such appliances — each one owning its data and offering a few buttons.
:::

## Objects without classes: the closure store

You don't need the `class` keyword to do OOP. A function that returns an object with methods — a [factory](#/pattern-module-factory) — is object-oriented too. Vestra's store is the clearest example:

```js
// js/state/store.js
export function createStore(initialState) {
  let state = Object.freeze({ ...initialState });   // private data
  const listeners = new Set();                        // private data

  function getState() { return state; }               // public method
  function setState(patch) { /* … */ }                // public method
  function subscribe(listener) { /* … */ }            // public method

  return { getState, setState, subscribe, select };   // the object's "buttons"
}
```

The returned object *is* an object with behaviour. `state` and `listeners` are its private fields, invisible from outside. This leads straight to the first pillar.

## Encapsulation

**Encapsulation** means keeping an object's data *private* and only allowing changes through its own methods. The object protects its own consistency.

In `createStore`, there is **no way** to reach `state` from outside — it lives in the function's closure. The only door is `setState`, which enforces the rules (freeze the new state, skip no-op updates, notify listeners). You physically *cannot* corrupt the store's state by reaching in, because there's nothing to reach.

:::analogy A vending machine
You can't open a vending machine and rearrange the cans — you interact through the slot and the buttons. The machine controls its own contents. Encapsulation is designing your objects like vending machines: a small, controlled interface over protected internals. Contrast a "bag of loose data" anyone can rummage through and mess up.
:::

:::why Why it matters in Vestra
Because the wishlist's data can only change through `wishlistStore.toggle`, `remove`, etc., every change automatically persists to storage and broadcasts the new count. If any code could mutate the items array directly, those side effects would be skipped and the header badge would go stale. Encapsulation is what lets the store *guarantee* its invariants.
:::

## Abstraction

**Abstraction** means exposing *what* something does while hiding *how*. It's encapsulation's purpose: a simple outside, a complex (irrelevant-to-you) inside.

The whole [services layer](#/pattern-facade) is abstraction. A page calls `getById(42)` and receives a product. It does not know — and must not need to know — about caching, retries, timeouts, or validation. Those are implementation details hidden behind the function's name.

```js
// The caller's entire mental model:
const product = await getById(id, { signal });
```

:::analogy Driving a car
You steer, brake, and accelerate. You don't think about fuel injection or the differential. The car *abstracts* its mechanics behind three controls. Good code does the same: the more you can ignore while still using something correctly, the better abstracted it is.
:::

## Classes and objects

When something needs to be *instantiated many times* with its own identity, Vestra reaches for the `class` keyword. There are three neat examples.

### `Disposer` — an object with state and behaviour

```js
// js/utils/dom.js
export class Disposer {
  constructor() { this._fns = []; }        // each disposer has its OWN list
  add(fn) { this._fns.push(fn); return fn; }
  listen(target, type, handler) { /* … */ }
  dispose() { /* run and clear */ }
}
```

Every page does `new Disposer()` and gets its own independent bin bag (see [The Disposer](#/pattern-disposer)). That "its own" is why a class fits: many instances, each with private state.

### `RawHtml` — a class used purely as a *type tag*

```js
// js/utils/dom.js
class RawHtml {
  constructor(value) { this.value = value; }
}
```

`RawHtml` wraps a string to *mark* it as "already-safe HTML." The [`html` template](#/pattern-guards) checks `value instanceof RawHtml` to decide whether to escape. The class exists so the code can *ask a question about a value's kind* — `instanceof` — which brings us to inheritance and polymorphism.

## Inheritance & polymorphism

**Inheritance** lets one class build on another, gaining its capabilities. **Polymorphism** ("many shapes") lets you treat different types through a shared interface, and lets a subclass add or specialise behaviour.

Vestra's HTTP client defines a custom error that **inherits from the built-in `Error`**:

```js
// js/services/http.js
export class HttpError extends Error {
  constructor(message, info = {}) {
    super(message);                       // reuse Error's setup
    this.name = 'HttpError';
    this.status = info.status ?? 0;       // add HTTP-specific data
    this.url = info.url;
    this.cause = info.cause;
  }

  get isAbort() {                          // add HTTP-specific behaviour
    return this.cause instanceof DOMException && this.cause.name === 'AbortError';
  }
}
```

- **Inheritance:** `extends Error` means an `HttpError` *is* an `Error`. It works with `try/catch`, has a stack trace, prints nicely — all inherited — while adding `status`, `url`, and `cause`.
- **Polymorphism:** code can `catch (err)` and treat everything as an `Error`, then ask `if (err instanceof HttpError)` to access the richer shape. The same `catch` block handles many error *types* through the shared `Error` interface.

The `isAbort` **getter** is a small polymorphic touch: reading `err.isAbort` runs logic, but *looks* like reading a property. Callers ask "was this an abort?" without knowing how the answer is computed.

:::analogy A specialised job title
A "Barista" *is an* "Employee" — they inherit the ability to clock in, get paid, and take breaks (from Employee), and they *add* the ability to pull espresso. Anywhere a business treats "an employee", a barista fits (polymorphism); but where you need coffee, the barista's extra skill is there. `HttpError extends Error` is exactly this: an error everywhere an Error is expected, with extra HTTP skills when you need them.
:::

:::why Why not just throw a plain string or object?
Because `extends Error` gives you the whole ecosystem for free — stack traces, `instanceof` checks, integration with dev tools — while letting you attach domain data (`status`, `url`) and domain questions (`isAbort`). The HTTP client can then throw one consistent error type that the rest of the app recognises and can inspect, e.g. to tell "the user navigated away" apart from "the server is down."
:::

## Immutability

**Immutability** means data that, once created, cannot be changed. Instead of editing an object, you make a new one with the change applied. It's not a "pillar" of OOP, but Vestra leans on it hard, and it pairs beautifully with encapsulation.

- **Config is frozen:** every config object uses `Object.freeze`, so a timing or price rate can't be mutated at runtime.
- **State is frozen:** `setState` produces a *new* frozen object rather than mutating the old one. Subscribers even receive both `(nextState, prevState)` so they can compare.
- **Catalog operations don't mutate inputs:** `applyCatalog` returns a *new* filtered/sorted array and leaves the original list untouched.

```js
// js/state/store.js
const next = Object.freeze({ ...state, ...resolved });   // new object, old one intact
```

:::analogy Bank statements, not a whiteboard
A whiteboard balance gets erased and rewritten — and you lose the history and risk two people editing at once. A bank keeps an **append-only ledger**: each transaction is a new immutable entry. Vestra's frozen state is the ledger approach: changes create new versions, the old version is never scribbled over, and comparing "before vs after" is trivial.
:::

:::why Why immutability helps
When state can't be mutated in place, a whole class of bugs vanishes: no spooky action-at-a-distance where one part of the app changes an object another part is still using. It also makes change-detection cheap — the store can compare `prev !== next` by reference to decide whether to notify. This is the same reasoning behind React's "don't mutate state" rule.
:::

## Explaining it out loud

> *"Vestra uses OOP ideas surgically. **Encapsulation:** the store hides its state in a closure and only exposes methods, so it can guarantee side effects like persistence. **Abstraction:** services expose simple functions and hide caching/retries. **Classes:** `Disposer`, `RawHtml`, and `HttpError` are instantiated with their own identity. **Inheritance & polymorphism:** `HttpError extends Error`, so it works anywhere an Error does but carries HTTP data and an `isAbort` getter. And **immutability** — frozen config and frozen state — kills a whole class of bugs."*

Next: a quick reference tour of every folder — [Tour of the layers](#/layers).
