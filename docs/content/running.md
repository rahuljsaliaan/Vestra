# Running the project

Before reading about *how* Vestra works, get it running so the explanations have something to point at. It takes about thirty seconds.

## Why you can't just double-click the file

Vestra is made of **ES modules** — JavaScript files that `import` from each other. For security reasons, browsers refuse to load modules from a `file://` address (the kind you get when you double-click `index.html`). You will see a blank page and a CORS error in the console.

The fix is to serve the folder over **HTTP** with any tiny web server. Nothing gets compiled; the server just hands the files to the browser over `http://` instead of `file://`.

:::analogy A library vs a locked house
Opening `index.html` directly is like trying to borrow a book by walking into someone's private house — the browser slams the door (CORS). Running a local server is like putting the same books in a public library with an address; now anyone (the browser) is allowed to walk in and read.
:::

## Run the app

```bash
cd Vestra
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Any static server works — pick whichever you have:

```bash
npx serve            # Node
php -S localhost:8000 # PHP
# or the "Live Server" extension in VS Code
```

There is **no install step and no build step**. You are running the exact files that live in the repository.

## Run these docs

The documentation site you are reading is itself a static site with the same rule — serve it over HTTP:

```bash
cd Vestra/docs
python3 -m http.server 8090
# then open http://localhost:8090
```

:::tip Keep both open
Open the app on one port and these docs on another, side by side. When a chapter mentions `js/services/http.js`, open that file in your editor too. Reading the doc, the code, and the running app together is the fastest way to *get* it.
:::

## What "working" looks like

When Vestra loads you should see:

- A serif **hero** headline that animates in word by word.
- Horizontal **rails** of products that fill in from grey placeholders (called *skeletons*) as live data arrives.
- A **theme toggle** (sun/moon) in the top-right that flips between light and a dark "Midnight Ink" mode.

The product data is fetched live from the free public [DummyJSON](https://dummyjson.com) API, so you need an internet connection the first time. After that, responses are cached (see [Decorators & Caching](#/pattern-decorator-cache)).

## A note on the data

:::note Real links, simulated prices
The **outbound "Buy on…" links are real** — they open a genuine search for that product on Amazon, Flipkart, and so on. The **per-store prices are simulated**, because the real retailer APIs need secret keys and server-side signing that a browser-only app cannot do safely. Vestra makes the prices look believable and keeps them stable using a hashing trick you will meet in [Adapters & Registries](#/pattern-adapter) and [Decorators & Caching](#/pattern-decorator-cache).
:::

Now that it is on screen, let's build a mental model of the whole thing in ten minutes: the [guided tour](#/tour).
