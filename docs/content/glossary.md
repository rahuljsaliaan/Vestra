# Glossary

Plain-English definitions of every technical term used in these docs. When a chapter drops a word you don't know, it's probably here. Terms are grouped roughly by topic.

## Web & browser basics

**DOM (Document Object Model)**
: The browser's live, in-memory representation of the page as a tree of elements. JavaScript changes the page by changing the DOM. When Outfit Buddy "renders a product card", it creates DOM elements and inserts them.

**Element / node**
: A single item in the DOM tree — an `<article>`, a `<button>`, a piece of text. Outfit Buddy builds these with the `html` template and `toElement`.

**Event / event listener**
: An event is "something happened" (a click, a scroll, typing). A listener is a function you register to run when a given event happens. `element.addEventListener('click', fn)`.

**Event delegation**
: Instead of putting a listener on many child elements, you put **one** listener on a shared parent and check what was clicked. Outfit Buddy uses one listener on `document.body` for *all* wishlist hearts. Fewer listeners, and it works for elements added later.

**CORS (Cross-Origin Resource Sharing)**
: Browser security rules about which addresses can load which resources. It's why ES modules won't load from `file://` and Outfit Buddy must be served over `http://` (see [Running the project](#/running)).

**SPA (Single-Page Application)**
: An app that lives in one HTML file and swaps content with JavaScript instead of loading new pages from the server. Navigation feels instant because the page never fully reloads.

**Hash routing**
: Using the part of the URL after `#` (e.g. `#/product/42`) to decide what to show. Changing the hash doesn't reload the page — it fires a `hashchange` event the [router](#/lifecycle) listens for.

**FOUC (Flash Of Unstyled/wrong Content)**
: A brief flash of the wrong appearance before the right styles apply — e.g. seeing light mode for a split second before dark mode kicks in. Outfit Buddy avoids it with an [inline theme-boot script](#/feature-theming).

## JavaScript language

**ES module**
: A `.js` file that uses `import`/`export`. The browser loads them as a dependency graph. Outfit Buddy uses these natively with no bundler (see [No framework, no build](#/no-build)).

**`export` / `import`**
: `export` marks what a file makes public; `import` pulls those public things into another file. Everything not exported is private to its file.

**Function / callback**
: A callback is simply a function you hand to another function to be called later — e.g. the function you pass to `addEventListener`, or a `.sort()` comparator.

**Closure**
: When a function "remembers" variables from where it was defined, even after that outer function has returned. Outfit Buddy's [store](#/pattern-observer) keeps its `state` private inside a closure — that's what makes it un-reachable from outside.

**Promise**
: An object representing a value that will be ready *later* (like a network response). You get the value with `.then(...)` or, more readably, `await`.

**`async` / `await`**
: `await` pauses inside an `async` function until a promise resolves, letting asynchronous code read top-to-bottom like normal steps. `const product = await getById(42);`

**`Object.freeze`**
: Makes an object read-only — attempts to change it are ignored (and throw in strict mode). Outfit Buddy freezes config and state to enforce [immutability](#/oop).

**Immutability**
: Treating data as unchangeable: to "change" it you make a new copy with the change applied. Prevents a whole class of shared-mutation bugs.

**Type guard**
: A function that checks whether a value has a certain shape and returns `true`/`false` (e.g. `isProduct`). Used to [validate](#/pattern-guards) untrusted data at boundaries.

**JSDoc**
: Structured `/** … */` comments that describe types (`@param`, `@returns`, `@typedef`). Editors read them to give autocomplete and type-checking — TypeScript-like safety with no build step.

## Async, timing & networking

**`fetch`**
: The browser's built-in function for making network requests. Outfit Buddy wraps it in `http.js` to add timeouts and retries.

**`AbortController` / `AbortSignal`**
: A controller whose `signal` can be passed into a `fetch` to cancel it. Outfit Buddy creates one per navigation, so leaving a page [cancels its in-flight requests](#/lifecycle).

**Debounce**
: Delaying an action until input has been quiet for a moment. The search box waits 300ms after you stop typing before searching, so fast typing is one search, not ten.

**TTL (Time To Live)**
: How long a cached value stays "fresh" before it's considered stale. Outfit Buddy's [cache](#/pattern-decorator-cache) uses a 5-minute TTL.

**Request de-duplication**
: When several callers ask for the same thing at once, sharing one in-flight request instead of firing duplicates. See the [cache chapter](#/pattern-decorator-cache).

**`localStorage` / `sessionStorage`**
: Browser key-value stores. `localStorage` persists across sessions (Outfit Buddy's wishlist/theme live here); `sessionStorage` lasts for the tab (the cache's second tier). Both store strings, so objects are `JSON.stringify`'d.

## Rendering & UI

**Tagged template**
: A function that processes a template string, e.g. `` html`<p>${x}</p>` ``. Outfit Buddy's `html` tag escapes every `${...}` value by default, making it the app's [XSS](#/pattern-guards) shield.

**XSS (Cross-Site Scripting)**
: A security hole where malicious text (like `<script>`) injected into a page runs as code. Escaping untrusted values into harmless text prevents it — which the `html` template does automatically.

**Escaping**
: Converting characters like `<` and `&` into their safe display forms (`&lt;`, `&amp;`) so they render as text instead of being interpreted as HTML.

**Skeleton**
: A grey placeholder shaped like the content that's loading, shown to signal "content is coming" instead of a blank screen or a spinner.

**Design token**
: A named design value (colour, spacing, radius) defined once as a CSS variable and reused everywhere. [Dark mode](#/feature-theming) just redefines the colour tokens.

**`IntersectionObserver`**
: A browser API that efficiently tells you when an element scrolls into view. Outfit Buddy uses one shared observer to trigger [scroll reveals](#/feature-theming).

**`MutationObserver`**
: A browser API that notifies you when the DOM changes (elements added/removed). Outfit Buddy uses it to sync hearts and reveal animations for content added by later navigations.

**`prefers-reduced-motion`**
: An OS/browser setting where users request less animation (often for health reasons). Outfit Buddy disables all motion when it's on — an [accessibility](#/feature-theming) requirement.

## Deterministic randomness

**Hash function**
: Turns a string into a number that looks scrambled but is always the same for the same input. Outfit Buddy uses **FNV-1a** to seed prices from a product id.

**PRNG (Pseudo-Random Number Generator)**
: An algorithm that produces "random-looking" numbers from a starting **seed**. Same seed → same sequence. Outfit Buddy uses **mulberry32** so simulated prices are varied but [stable across reloads](#/pattern-decorator-cache).

## Design-pattern names

Each links to its full chapter with a real-world analogy:

- **[Module](#/pattern-module-factory)** — a file with a public interface and private internals.
- **[Factory](#/pattern-module-factory)** — a function that builds and returns a fresh object.
- **[Observer](#/pattern-observer)** — subscribers are notified automatically when data changes.
- **[Pub/Sub](#/pattern-events)** — publishers and subscribers communicate via named messages, not direct references.
- **[Adapter](#/pattern-adapter)** — a wrapper giving different things one uniform interface.
- **[Registry](#/pattern-adapter)** — a single list where interchangeable things are declared.
- **[Strategy](#/pattern-strategy)** — interchangeable behaviours (e.g. sort orders) picked at runtime.
- **[Facade](#/pattern-facade)** — one simple front door over a complicated subsystem.
- **[Decorator / Wrapper](#/pattern-decorator-cache)** — adds behaviour around a function without changing how it's called.
- **[Disposer / Cleanup](#/pattern-disposer)** — collects "undo" callbacks to release everything on teardown.

Still stuck on a word? Search it with the box at the top (press `/`) — it searches every page.
