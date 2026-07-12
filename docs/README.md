# Vestra Docs

A self-contained, beginner-friendly documentation site for the Vestra codebase —
built in the same spirit as the project itself: **vanilla HTML/CSS/JS, no build
step, no dependencies.** It looks and behaves like MkDocs / VitePress (sidebar
index, on-page table of contents, search, light/dark themes, syntax
highlighting) but every byte is in this folder.

## Run it

The pages are loaded with `fetch`, so serve the folder over HTTP (opening
`index.html` from `file://` will not work):

```bash
cd docs
python3 -m http.server 8090
# open http://localhost:8090
```

Any static server works (`npx serve`, `php -S localhost:8090`, VS Code Live
Server, …).

## What's inside

```
docs/
  index.html          the single-page shell (topbar, sidebar, content, TOC)
  assets/
    styles.css        the theme (design tokens, light + dark, responsive)
    app.js            the engine: Markdown renderer, router, search, TOC
  content/
    *.md              one Markdown file per documentation page
```

The reading order and sidebar grouping are defined once, in the `NAV` array at
the top of `assets/app.js`.

## Add or edit a page

1. Write a Markdown file in `content/`, e.g. `content/my-topic.md`.
2. Add an entry to the `NAV` array in `assets/app.js`:
   ```js
   { id: 'my-topic', text: 'My topic', file: 'my-topic.md' }
   ```
3. Reload. That's it — the sidebar, prev/next, search index and routing all
   pick it up automatically.

## Supported Markdown

Standard Markdown plus a few extras the renderer understands:

- Headings (`#`–`####`); `##`/`###` become on-page TOC entries with anchors.
- Fenced code blocks with light JS/bash syntax highlighting and a copy button.
- Tables, blockquotes, ordered/unordered (and nested) lists, `**bold**`,
  `*italic*`, `` `inline code` `` and `[links](#/other-page)`.
- **Callout blocks** for analogies and "why" notes:
  ```
  :::analogy A kitchen brigade
  Data flows one way, like ingredients toward the plate…
  :::
  ```
  Types: `note`, `tip`, `warning`, `danger`, `analogy`, `why`.

## Keyboard

- Press `/` to focus search; `Esc` to dismiss it.
