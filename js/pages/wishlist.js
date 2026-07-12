/**
 * @file Wishlist page — the user's "closet". Lists saved item snapshots, lets
 * them create/delete named collections and toggle items in and out of them, and
 * filters by collection. It subscribes to the wishlist store so it re-renders
 * when items change here or anywhere else (e.g. a heart toggled on a card).
 */

import { html, toElement, Disposer, delegate, emit } from '../utils/dom.js';
import { routeTo } from '../config/routes.js';
import { STATE_CLASSES, EVENTS, TOAST_LEVEL } from '../config/constants.js';
import { categoryLabel } from '../config/categories.js';
import { formatInr } from '../utils/format.js';
import { sanitizeCollectionName } from '../utils/validate.js';
import { wishlistStore } from '../state/wishlist-store.js';

const FILTER_ALL = 'all';

/**
 * @returns {import('../types.js').Page}
 */
export function createWishlistPage() {
  const disposer = new Disposer();
  let currentFilter = FILTER_ALL;
  /** @type {HTMLElement} */
  let tabsEl;
  /** @type {HTMLElement} */
  let gridEl;

  /** @returns {import('../types.js').WishlistItem[]} */
  function filteredItems() {
    const items = wishlistStore.getItems();
    if (currentFilter === FILTER_ALL) return items;
    return items.filter((item) => item.collectionIds.includes(currentFilter));
  }

  function renderTabs() {
    const items = wishlistStore.getItems();
    const collections = wishlistStore.getCollections();
    // Reset to All if the active collection was deleted.
    if (currentFilter !== FILTER_ALL && !collections.some((c) => c.id === currentFilter)) {
      currentFilter = FILTER_ALL;
    }
    tabsEl.replaceChildren(
      toElement(html`
        <div class="wishlist__tabs" role="tablist">
          <button class="tab ${currentFilter === FILTER_ALL ? STATE_CLASSES.ACTIVE : ''}" type="button" role="tab" data-filter="${FILTER_ALL}" aria-selected="${String(currentFilter === FILTER_ALL)}">
            All <span class="tab__count">${items.length}</span>
          </button>
          ${collections.map((c) => {
            const count = items.filter((i) => i.collectionIds.includes(c.id)).length;
            return html`
              <span class="tab-wrap">
                <button class="tab ${currentFilter === c.id ? STATE_CLASSES.ACTIVE : ''}" type="button" role="tab" data-filter="${c.id}" aria-selected="${String(currentFilter === c.id)}">
                  ${c.name} <span class="tab__count">${count}</span>
                </button>
                <button class="tab__del" type="button" data-del-col="${c.id}" aria-label="Delete collection ${c.name}">×</button>
              </span>
            `;
          })}
        </div>
      `),
    );
  }

  function renderGrid() {
    const items = filteredItems();
    const collections = wishlistStore.getCollections();

    if (wishlistStore.count() === 0) {
      gridEl.replaceChildren(
        toElement(html`
          <div class="state-block" data-reveal>
            <h2 class="state-block__title">Your closet is empty.</h2>
            <p class="state-block__body">Tap the heart on anything you love — it'll wait for you here.</p>
            <a class="btn btn--primary" href="${routeTo.shop()}">Start browsing</a>
          </div>
        `),
      );
      return;
    }

    if (items.length === 0) {
      gridEl.replaceChildren(
        toElement(html`<div class="state-block" data-reveal><h2 class="state-block__title">Nothing in this collection yet.</h2><p class="state-block__body">Use the collection chips on a saved item to add it here.</p></div>`),
      );
      return;
    }

    const grid = toElement(html`<div class="wishlist__grid card-grid" data-reveal-group></div>`);
    items.forEach((item) => grid.append(renderItemCard(item, collections)));
    gridEl.replaceChildren(grid);
  }

  function renderAll() {
    renderTabs();
    renderGrid();
  }

  return {
    mount(root) {
      root.append(
        toElement(html`
          <div class="wishlist section" data-reveal>
            <header class="wishlist__head">
              <p class="eyebrow">Your closet</p>
              <h1 class="wishlist__title">Saved for later</h1>
            </header>
            <div class="wishlist__bar">
              <div data-tabs></div>
              <form class="wishlist__newcol" data-newcol>
                <input class="wishlist__newcol-input" name="collection" type="text" maxlength="40" placeholder="New collection (e.g. Wedding)" aria-label="New collection name" />
                <button class="btn btn--ghost" type="submit">Create</button>
              </form>
            </div>
            <div data-grid></div>
          </div>
        `),
      );

      tabsEl = /** @type {HTMLElement} */ (root.querySelector('[data-tabs]'));
      gridEl = /** @type {HTMLElement} */ (root.querySelector('[data-grid]'));
      renderAll();

      // Filter tabs
      disposer.add(
        delegate(root, 'click', '[data-filter]', (_event, matched) => {
          currentFilter = matched.getAttribute('data-filter') || FILTER_ALL;
          renderAll();
        }),
      );

      // Delete collection
      disposer.add(
        delegate(root, 'click', '[data-del-col]', (_event, matched) => {
          const id = matched.getAttribute('data-del-col');
          if (id) {
            wishlistStore.deleteCollection(id);
            emit(EVENTS.TOAST, { message: 'Collection deleted', level: TOAST_LEVEL.INFO });
          }
        }),
      );

      // Remove item
      disposer.add(
        delegate(root, 'click', '[data-remove]', (_event, matched) => {
          const id = Number(matched.getAttribute('data-remove'));
          wishlistStore.remove(id);
        }),
      );

      // Toggle item in a collection
      disposer.add(
        delegate(root, 'click', '[data-toggle-col]', (_event, matched) => {
          const itemId = Number(matched.getAttribute('data-item'));
          const colId = matched.getAttribute('data-toggle-col');
          if (colId) wishlistStore.toggleInCollection(itemId, colId);
        }),
      );

      // Create collection (validated)
      const form = root.querySelector('[data-newcol]');
      if (form instanceof HTMLFormElement) {
        disposer.listen(form, 'submit', (event) => {
          event.preventDefault();
          const input = /** @type {HTMLInputElement} */ (form.elements.namedItem('collection'));
          const name = sanitizeCollectionName(input.value);
          if (!name) {
            emit(EVENTS.TOAST, { message: 'Enter a collection name first.', level: TOAST_LEVEL.INFO });
            input.focus();
            return;
          }
          wishlistStore.createCollection(name);
          input.value = '';
          emit(EVENTS.TOAST, { message: `Created “${name}”`, level: TOAST_LEVEL.SUCCESS });
        });
      }

      // Re-render on any store change.
      disposer.add(wishlistStore.subscribe(() => renderAll()));
    },
    unmount() {
      disposer.dispose();
    },
  };
}

/**
 * @param {import('../types.js').WishlistItem} item
 * @param {import('../types.js').Collection[]} collections
 * @returns {HTMLElement}
 */
function renderItemCard(item, collections) {
  return toElement(html`
    <article class="wcard" data-reveal="scale" data-item="${item.id}">
      <a class="wcard__media" href="${routeTo.product(item.id)}" aria-label="${item.title}">
        <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" decoding="async" />
      </a>
      <div class="wcard__body">
        <p class="wcard__brand">${categoryLabel(item.category)}</p>
        <a class="wcard__title" href="${routeTo.product(item.id)}">${item.title}</a>
        <span class="wcard__price">${formatInr(item.priceInr)}</span>
        ${collections.length
          ? html`<div class="wcard__cols" aria-label="Collections">
              ${collections.map((c) => {
                const inCol = item.collectionIds.includes(c.id);
                return html`<button class="chip chip--sm" type="button" data-toggle-col="${c.id}" data-item="${item.id}" aria-pressed="${String(inCol)}">${inCol ? '✓ ' : '+ '}${c.name}</button>`;
              })}
            </div>`
          : html`<p class="wcard__hint">Create a collection to organise saves.</p>`}
        <button class="wcard__remove" type="button" data-remove="${item.id}">Remove</button>
      </div>
    </article>
  `);
}
