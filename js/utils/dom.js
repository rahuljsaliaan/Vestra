/**
 * @file DOM helpers. Hosts the `html` tagged template that is the app's single
 * XSS boundary (all interpolations are HTML-escaped unless explicitly marked
 * `raw`), a small element factory, an event-delegation helper, and a Disposer
 * used everywhere to guarantee listener/observer cleanup on unmount.
 */

/** Wrapper marking a string as pre-trusted HTML, exempt from escaping. */
class RawHtml {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }
}

/**
 * Mark a string as trusted raw HTML so `html` will not escape it. Only ever
 * pass values you constructed yourself — never untrusted/API data.
 * @param {string} value
 * @returns {RawHtml}
 */
export function raw(value) {
  return new RawHtml(String(value));
}

/**
 * Escape a value for safe insertion as HTML text/attribute content.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render one interpolated value to a string, escaping by default.
 * Arrays are joined (each element handled recursively); RawHtml passes through.
 * @param {unknown} value
 * @returns {string}
 */
function renderValue(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof RawHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return escapeHtml(value);
}

/**
 * Tagged template that builds an escaped HTML string. Use with `toElement` /
 * `toFragment` to turn the result into DOM.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {RawHtml}
 */
export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i += 1) {
    out += strings[i];
    if (i < values.length) out += renderValue(values[i]);
  }
  return new RawHtml(out);
}

/**
 * Parse an `html` result (or raw string) into a single root element.
 * @param {RawHtml|string} markup
 * @returns {HTMLElement}
 */
export function toElement(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup instanceof RawHtml ? markup.value : String(markup);
  const node = template.content.firstElementChild;
  if (!(node instanceof HTMLElement)) {
    throw new Error('toElement expected markup with a single root element.');
  }
  return node;
}

/**
 * Parse an `html` result into a document fragment (multiple roots allowed).
 * @param {RawHtml|string} markup
 * @returns {DocumentFragment}
 */
export function toFragment(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup instanceof RawHtml ? markup.value : String(markup);
  return template.content;
}

/**
 * Create an element with attributes and children in one call.
 * @param {string} tag
 * @param {Record<string, string|number|boolean>} [attrs]
 * @param {Array<Node|string>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/**
 * Collects teardown callbacks (removeEventListener, unsubscribe, disconnect…)
 * so a page/component can unwind everything in one `dispose()` call. This is
 * how the SPA avoids listener leaks across navigations.
 */
export class Disposer {
  constructor() {
    /** @type {Array<() => void>} */
    this._fns = [];
  }

  /**
   * Register a teardown callback.
   * @param {() => void} fn
   * @returns {() => void} the same fn, for convenience.
   */
  add(fn) {
    this._fns.push(fn);
    return fn;
  }

  /**
   * Add an event listener and register its removal.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} handler
   * @param {boolean|AddEventListenerOptions} [options]
   */
  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.add(() => target.removeEventListener(type, handler, options));
  }

  /** Run and clear all teardown callbacks. Safe to call more than once. */
  dispose() {
    const fns = this._fns;
    this._fns = [];
    for (let i = fns.length - 1; i >= 0; i -= 1) {
      try {
        fns[i]();
      } catch (err) {
        // A failing teardown must never block the rest.
        console.error('Disposer teardown failed:', err);
      }
    }
  }
}

/**
 * Delegated event binding: one listener on `root` that fires `handler` when the
 * event target matches `selector`. Returns an unbind function.
 * @param {HTMLElement} root
 * @param {string} type
 * @param {string} selector
 * @param {(event: Event, matched: HTMLElement) => void} handler
 * @returns {() => void}
 */
export function delegate(root, type, selector, handler) {
  /** @param {Event} event */
  const listener = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const matched = target.closest(selector);
    if (matched instanceof HTMLElement && root.contains(matched)) {
      handler(event, matched);
    }
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

/**
 * Replace all children of a node with the given content.
 * @param {HTMLElement} node
 * @param {Node|RawHtml|string} content
 */
export function setContent(node, content) {
  node.replaceChildren();
  if (content instanceof Node) node.append(content);
  else node.append(toFragment(content));
}

/**
 * Emit a namespaced custom event on `document` (used for toasts etc.).
 * @param {string} type
 * @param {unknown} [detail]
 */
export function emit(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}
