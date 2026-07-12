# Patterns in plain English

This section is the heart of the docs. If you can explain the design patterns in Vestra, you can explain the codebase — because the patterns *are* the recurring ideas that everything else is built from.

:::note You're now past the essentials — this is the deeper dive
If you've read [The big picture](#/big-picture), [How the app is organised](#/architecture) and [What happens when you click](#/lifecycle), you already understand Vestra well enough to describe it. Everything from here on is the *deeper dive*. Treat these pattern chapters as **reference** — read one when you're curious, not all in one sitting. Each is short and stands on its own.
:::

## What is a design pattern?

A **design pattern** is a *named, reusable solution to a problem that comes up again and again* in software. Nobody invents them from scratch; they are discovered, then given names so programmers can talk about them quickly.

:::analogy Recipes, not ingredients
A pattern is like a **recipe**. "Make a roux" is a named technique any cook recognises — you don't re-explain "melt butter, whisk in flour" every time; you just say "roux". Patterns give programmers the same shared shorthand. When someone says *"the wishlist is an observer store,"* an experienced developer instantly knows roughly how it works, without reading a line of code.
:::

Patterns are **not** libraries or features you install. They are shapes your code takes. The same pattern looks slightly different in every codebase, but the underlying idea is the same.

## Why learn them here?

Two reasons, both practical:

1. **They make you fluent.** Once you know the names, you can describe a 40-file project in a few sentences — which is exactly what you need to do when explaining it.
2. **They reveal intent.** Recognising "ah, this is the Strategy pattern" tells you not just *what* the code does but *why* it is shaped that way, and what the author was trying to make easy.

## The patterns you will meet in Vestra

Vestra is unusually rich in clean, textbook examples. Here is the tour, each linked to its own chapter:

| Pattern | The problem it solves | Where it lives |
| --- | --- | --- |
| [Module](#/pattern-module-factory) | Keep code in small, single-purpose files with clear public surfaces. | Every `.js` file |
| [Factory](#/pattern-module-factory) | Produce fresh, self-contained objects on demand (pages, components, stores). | `create*` functions everywhere |
| [Observer](#/pattern-observer) | Let the UI react automatically when data changes. | `state/store.js` |
| [Publish/Subscribe](#/pattern-events) | Let distant parts of the app talk without knowing each other. | custom DOM events |
| [Adapter + Registry](#/pattern-adapter) | Treat five different stores through one uniform interface. | `config/retailers.js` |
| [Strategy](#/pattern-strategy) | Swap one interchangeable behaviour (e.g. a sort order) for another. | `services/catalog.js` |
| [Facade](#/pattern-facade) | Hide a messy subsystem behind one simple function. | `services/product-service.js` |
| [Decorator / Wrapper](#/pattern-decorator-cache) | Add behaviour (timeout, caching) around existing functions. | `services/cache.js`, `http.js` |
| [Disposer / Cleanup](#/pattern-disposer) | Guarantee every resource is released on teardown. | `utils/dom.js` |
| [Guard / Validation](#/pattern-guards) | Never trust data from outside; check it at the door. | `utils/validate.js` |

:::tip You don't need to memorise this table
Read the chapters in order. Each one teaches its pattern with a real-world analogy first, then shows the exact Vestra code, then answers "why here?". By the end the table above will read like a list of old friends.
:::

## A word of reassurance

Patterns can sound intimidating ("Abstract Factory", "Dependency Inversion") but the ideas are almost always simpler than the names. Vestra uses them in their *plainest* form — no clever indirection, no over-engineering. If a chapter ever feels heavy, drop down to the code snippet; the code is short, and it will ground the words.

Let's begin with the two that appear in literally every file: [Modules & Factories](#/pattern-module-factory).
