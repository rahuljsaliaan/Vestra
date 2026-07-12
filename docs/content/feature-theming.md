# Theming & motion

The last walkthrough covers how Vestra *looks* and *moves* — the design-token system that powers light/dark themes, and the motion layer that adds polish while always respecting a user's preference for less animation.

## Design tokens (`css/tokens.css`)

A **design token** is a named design value — a colour, a spacing, a font size — defined once as a CSS custom property and reused everywhere. Vestra's theme, "Ink & Saffron Atelier", lives entirely in `tokens.css`.

```css
:root {
  --saffron: #e07b2e;      /* brand accent */
  --paper: #f4ede0;        /* warm ivory background */
  --ink: #1d1813;          /* near-black text */
  --space-md: 1rem;
  --radius-md: 12px;
  --dur-base: 320ms;
}
```

Nothing else in the CSS hard-codes a colour. A button says `background: var(--accent)`, not `#e07b2e`. This is the CSS twin of the ["no magic strings"](#/architecture) rule in the JavaScript.

:::analogy A paint-by-numbers legend
Design tokens are the little legend on a paint-by-numbers kit: "1 = ivory, 2 = ink, 3 = saffron." The picture references numbers, not colours. Want a different palette? Change the legend, and the whole picture repaints. That's exactly how dark mode works below.
:::

## Dark mode: override the legend

Dark mode ("Midnight Ink") doesn't restyle a single component. It just **redefines the colour tokens** under a `data-theme="dark"` attribute:

```css
:root[data-theme='dark'] {
  --paper: #14110d;
  --ink: #f3ebdd;
  --accent: var(--saffron-bright);
  /* …only colours change; spacing, type, radii stay the same… */
}
```

Because every component reads `var(--paper)` and `var(--ink)`, flipping that one attribute on `<html>` repaints the entire app instantly. The [`userStore`](#/pattern-observer) owns the current theme and writes the attribute:

```js
// js/state/user-store.js
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
```

### No flash of the wrong theme

There's a subtle detail in `index.html`: a tiny inline script runs **before the CSS paints**, reads the saved (or OS-preferred) theme, and sets the attribute immediately:

```html
<script>
  var saved = localStorage.getItem('vestra.theme.v1');
  var theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
</script>
```

:::why Why inline this one script?
If Vestra waited for `app.js` to load before choosing a theme, a dark-mode user would see a bright flash of the light theme for a split second first (a "FOUC" — flash of unstyled/wrong content). Running the theme decision inline, before first paint, eliminates that flash. It's a small, deliberate exception to "all logic in modules," and the comment in the file says exactly why.
:::

## Motion, respectfully (`js/motion/`)

Vestra has lots of motion — scroll reveals, staggered grids, a kinetic hero, magnetic buttons, count-up numbers, parallax, marquee, momentum scrolling, page crossfades. **Every single one is disabled** when the user has asked their OS for reduced motion.

That check is one shared helper:

```js
// js/utils/async.js
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
```

And you'll find it guarding the top of every effect:

```js
// js/motion/effects.js
export function initEffects(root) {
  if (prefersReducedMotion()) {
    // still show counters' FINAL values, just don't animate to them
    return;
  }
  // …kinetic headings, magnetic buttons, count-ups…
}
```

### Two motion engines

- **`reveal.js`** — a single shared `IntersectionObserver` reveals any `[data-reveal]` element as it scrolls into view. A `MutationObserver` picks up elements added by later navigations automatically, and grouped children get a staggered `--reveal-index` so they cascade. One observer for the whole app, not one per element.
- **`effects.js`** — opt-in flourishes triggered by data attributes (`data-kinetic`, `data-magnetic`, `data-counter`). These attach their listeners to the element itself, so they're garbage-collected when a navigation removes the element — no manual cleanup needed.

:::why Why treat reduced-motion as non-negotiable?
Motion isn't just decoration — for some people it causes nausea, dizziness, or migraines (vestibular disorders). Honouring `prefers-reduced-motion` is an accessibility responsibility, not a nice-to-have. Vestra makes it structurally hard to forget: the check is one shared function, and effects are designed to *degrade gracefully* (a counter still shows its final number; the page still works) rather than simply vanish.
:::

## The important accessibility touches

Beyond motion, small choices add up:

- The `html` template escapes everything, so content can't break the page.
- Interactive controls carry `aria-label`, `aria-pressed`, `aria-expanded`; the toast host is an `aria-live` region.
- A "Skip to content" link and a focusable `<main>` help keyboard users.
- Images declare `width`/`height` to avoid layout shift, and `loading="lazy"`.

## Explaining it out loud

> *"All design values are CSS custom-property tokens in one file, so components reference `var(--accent)`, never a hex code. Dark mode just redefines the colour tokens under a `data-theme` attribute the theme store toggles, and an inline script sets that attribute before first paint to avoid a flash. Every animation is gated by one shared `prefers-reduced-motion` check and degrades gracefully — motion is treated as an accessibility responsibility, not just polish."*

That completes the walkthroughs. The reference section rounds things off: the [Glossary](#/glossary) and a script for [explaining Vestra out loud](#/presenting).
