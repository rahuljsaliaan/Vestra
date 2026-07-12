# Start here

Welcome! These docs teach you the **Vestra** codebase from zero — so that you can *understand* it and *explain* it to someone else. No prior experience with frameworks is needed. We go slowly, we use lots of pictures, and we always explain **why** things are the way they are before showing any code.

:::tip Read this page first, then follow the arrows
Every page has a **Next →** button at the bottom. If you just follow it from here, you'll travel the docs in the intended order — easy things first, harder things later. You are not expected to read all 23 pages before you understand the project; see the short path below.
:::

## What is Vestra?

Vestra is a **fashion price-comparison store**. You browse clothes on one nice website. When you decide to buy, Vestra sends you to whichever real shop — Amazon, Flipkart, Myntra, Ajio or Tata CLiQ — has the best price. It doesn't sell anything itself; it's a helpful middle-man.

<figure class="diagram">
  <div class="d-hub">
    <div class="d-hub__node">🧑 &nbsp;A shopper</div>
    <div class="d-arrow">↓</div>
    <div class="d-hub__node d-hub__node--center">Vestra<span>one website to browse</span></div>
    <div class="d-hub__label">links out to the cheapest real store ↓</div>
    <div class="d-hub__fan">
      <span class="d-chip">Amazon</span>
      <span class="d-chip">Flipkart</span>
      <span class="d-chip">Myntra</span>
      <span class="d-chip">Ajio</span>
      <span class="d-chip">Tata CLiQ</span>
    </div>
  </div>
  <figcaption>One place to browse; the actual buying happens on whichever store is cheapest.</figcaption>
</figure>

Think of it as a **shopping mall directory**: the mall itself doesn't sell shoes, but it shows you every shoe shop and points you to the best deal.

## Why is this codebase worth learning from?

Vestra is built with **plain HTML, CSS and JavaScript** — no React, no build tools, nothing to install. But it is organised with the same care as a big professional app. That combination is rare and valuable: you can see *how good software is structured*, with nothing hidden behind framework magic.

So learning Vestra teaches you two things at once:
- how *this* app works, and
- the general ideas — architecture, design patterns, object-oriented thinking — that appear in almost every serious software project.

## Who these docs are for

You should be comfortable reading very basic JavaScript (a variable, a function, an `if`). That's it. Words like *module*, *class*, *promise*, *design pattern* are all explained the moment we meet them, and there's a [Glossary](#/glossary) for anything unfamiliar — press `/` at any time to search it.

## The short path (start with just these five)

If the sidebar looks long, don't worry. Read these **five pages** and you'll already be able to explain the whole project:

1. **Start here** — this page.
2. [Running the project](#/running) — see it on your screen.
3. [The big picture](#/big-picture) — the whole app as a few simple diagrams. *(the most important page)*
4. [How the app is organised](#/architecture) — the one idea that shapes everything.
5. [What happens when you click](#/lifecycle) — the app in motion.

Everything after that — the **Design Patterns**, **OOP**, and **Feature** chapters — is the *deeper dive*. Read those later, one at a time, whenever you're curious. They are reference material, not a reading marathon.

<div class="card-grid">
<a class="nav-card" href="#/running"><b>▶ First, run it</b><span>Two commands and it's on your screen. Do this before reading on.</span></a>
<a class="nav-card" href="#/big-picture"><b>🗺 Then, the big picture</b><span>The overall architecture, drawn as pictures. No code yet.</span></a>
<a class="nav-card" href="#/glossary"><b>📖 Stuck on a word?</b><span>Plain-English definitions of every term used here.</span></a>
<a class="nav-card" href="#/presenting"><b>🎤 Need to present it?</b><span>A ready-made script for explaining Vestra out loud.</span></a>
</div>

## How to get the most from this

:::note Keep three windows open
The docs read best alongside the real thing. Open **(1)** these docs, **(2)** the running app, and **(3)** the project files in your editor. When a page mentions a file, glance at it. Reading the explanation, the picture, and the real code together is by far the fastest way to *get it*.
:::

Ready? Let's put Vestra on your screen first — head to **[Running the project](#/running)**.
