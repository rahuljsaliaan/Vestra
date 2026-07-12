# Events & Pub/Sub

The [Observer store](#/pattern-observer) connects things that hold a reference to the store. But sometimes two parts of the app need to talk without knowing anything about each other at all. For that, Vestra uses **Publish/Subscribe** built on the browser's own **custom events**.

## The idea

**Pub/Sub** (publish–subscribe) lets a "publisher" announce that something happened, and any number of "subscribers" react — but the publisher does not know who is listening, and the listeners do not know who spoke. They only share the **name** of the message.

:::analogy A public address system
When an airport announces *"Flight 402 is now boarding,"* the announcer has no idea who is in the terminal. Passengers for 402 react; everyone else ignores it. New passengers can arrive and start listening; some can leave. The announcer and the passengers are completely **decoupled** — connected only by the words of the announcement. That is Pub/Sub.
:::

## How Vestra does it

The browser already has a message bus: DOM events. Vestra publishes custom events on `document` and lets anyone listen. The two ends are tiny helpers in `js/utils/dom.js`:

```js
// publish
export function emit(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}
// subscribe — just the standard document.addEventListener(type, handler)
```

Crucially, the **event names are constants**, so publisher and subscriber can never disagree on spelling:

```js
// js/config/constants.js
export const EVENTS = Object.freeze({
  TOAST: 'vestra:toast',
  WISHLIST_CHANGED: 'vestra:wishlist-changed',
  THEME_CHANGED: 'vestra:theme-changed',
  NAVIGATE: 'vestra:navigate',
});
```

## Worked example: the toast notification

A "toast" is the little message that slides in ("Saved to your closet"). *Any* code, anywhere, can raise one without importing the toast UI:

```js
// somewhere deep in a page:
emit(EVENTS.TOAST, { message: 'Choose a size to continue.', level: 'info' });
```

And the layout — mounted once at boot, in a totally different file — listens and renders it:

```js
// js/components/layout.js
disposer.listen(document, EVENTS.TOAST, (event) => {
  const { message, level } = event.detail;
  showToast(toastHost, message, level);
});
```

The page that raised the toast has **no reference** to the toast host, the layout, or `showToast`. It just shouts a named message into the room. That is the decoupling Pub/Sub buys.

## Worked example: the wishlist badge

This one shows Observer and Pub/Sub working as a relay:

1. You tap a heart. The global controller calls `wishlistStore.toggle(...)` — an [Observer](#/pattern-observer) change.
2. The store's own subscriber fires and **publishes** a count:

   ```js
   // js/state/wishlist-store.js
   emit(EVENTS.WISHLIST_CHANGED, { count: state.items.length });
   ```
3. The header **subscribes** and animates the badge:

   ```js
   // js/components/layout.js
   disposer.listen(document, EVENTS.WISHLIST_CHANGED, (event) => {
     renderBadge(event.detail.count);
   });
   ```

The heart button and the header badge never meet. They are joined only by the string `'vestra:wishlist-changed'`.

:::why When to use Pub/Sub instead of the store directly?
Use the **store** when a component genuinely owns or needs the data (the wishlist page renders items, so it subscribes to the store). Use **events** for fire-and-forget cross-cutting messages where coupling the two sides would be silly — a toast, a "count changed" ping, a "theme flipped" nudge. The rule of thumb: if wiring a direct reference between two parts feels like overkill for a one-off signal, shout an event instead.
:::

:::warning A note for later
Decoupling is powerful but can make flow harder to trace — you can't "click through" an event the way you can a function call. Vestra keeps this manageable by (a) using very few event types and (b) naming them all in one `EVENTS` constant, so you can grep for every publisher and subscriber of a message in seconds.
:::

## Explaining it out loud

> *"Some things need to talk without knowing each other — like a page raising a toast, or the wishlist telling the header its new count. Vestra uses custom DOM events for that: one side `emit`s a named message, the other listens. The names are constants so they can't drift. It's the announcement-board model — publishers and subscribers share only a message name."*

Next: how Vestra treats five different online stores as one — [Adapters & Registries](#/pattern-adapter).
