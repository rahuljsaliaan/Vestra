/**
 * @file Wishlist + collections store. Holds saved item snapshots (so the
 * wishlist renders without re-fetching) and named collections, hydrated from
 * and persisted to localStorage through the storage service (versioned,
 * validated, corrupt-data safe). Every mutation persists and emits a
 * WISHLIST_CHANGED event carrying the current count (the header badge and heart
 * buttons listen for it).
 */

import { STORAGE_KEYS, EVENTS } from '../config/constants.js';
import { createStore } from './store.js';
import { readJson, writeJson } from '../services/storage.js';
import { isWishlistStateV1, sanitizeCollectionName } from '../utils/validate.js';
import { usdToInr } from '../utils/format.js';
import { emit } from '../utils/dom.js';

const SCHEMA_VERSION = 1;

/** @returns {import('../types.js').WishlistStateV1} */
function emptyState() {
  return { version: SCHEMA_VERSION, items: [], collections: [] };
}

const initial = readJson(STORAGE_KEYS.WISHLIST, isWishlistStateV1, emptyState());
const store = createStore(/** @type {import('../types.js').WishlistStateV1} */ (initial));

let idCounter = 0;
/**
 * Generate a reasonably unique collection id.
 * @returns {string}
 */
function newCollectionId() {
  idCounter += 1;
  return `col_${Date.now().toString(36)}_${idCounter}`;
}

/** Persist the current state and broadcast the count. */
function persistAndBroadcast() {
  const state = store.getState();
  writeJson(STORAGE_KEYS.WISHLIST, state);
  emit(EVENTS.WISHLIST_CHANGED, { count: state.items.length });
}

store.subscribe(persistAndBroadcast);

/**
 * Build a lightweight wishlist snapshot from a product (list or full).
 * @param {import('../types.js').Product} product
 * @returns {import('../types.js').WishlistItem}
 */
export function buildSnapshot(product) {
  return {
    id: product.id,
    title: product.title,
    thumbnail: product.thumbnail,
    category: product.category,
    priceInr: usdToInr(product.price),
    addedAt: Date.now(),
    collectionIds: [],
  };
}

export const wishlistStore = {
  subscribe: store.subscribe,
  getState: store.getState,

  /** @returns {import('../types.js').WishlistItem[]} */
  getItems() {
    return store.getState().items;
  },

  /** @returns {import('../types.js').Collection[]} */
  getCollections() {
    return store.getState().collections;
  },

  /** @returns {number} */
  count() {
    return store.getState().items.length;
  },

  /**
   * @param {number} id
   * @returns {boolean}
   */
  isWished(id) {
    return store.getState().items.some((item) => item.id === id);
  },

  /**
   * Add or remove an item by snapshot. Returns the new wished state.
   * @param {import('../types.js').WishlistItem} snapshot
   * @returns {boolean} true if now wished.
   */
  toggle(snapshot) {
    const exists = this.isWished(snapshot.id);
    if (exists) {
      store.setState((s) => ({ items: s.items.filter((i) => i.id !== snapshot.id) }));
      return false;
    }
    // addedAt is stamped here (not at render time) so ordering is accurate.
    store.setState((s) => ({ items: [{ ...snapshot, addedAt: Date.now(), collectionIds: [] }, ...s.items] }));
    return true;
  },

  /**
   * @param {number} id
   */
  remove(id) {
    store.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  /**
   * Create a collection. Returns its id, or null if the name is invalid/dupe.
   * @param {string} rawName
   * @returns {string|null}
   */
  createCollection(rawName) {
    const name = sanitizeCollectionName(rawName);
    if (!name) return null;
    const existing = store.getState().collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const id = newCollectionId();
    store.setState((s) => ({ collections: [...s.collections, { id, name, createdAt: Date.now() }] }));
    return id;
  },

  /**
   * @param {string} id
   * @param {string} rawName
   * @returns {boolean}
   */
  renameCollection(id, rawName) {
    const name = sanitizeCollectionName(rawName);
    if (!name) return false;
    store.setState((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
    return true;
  },

  /**
   * Delete a collection and detach it from every item.
   * @param {string} id
   */
  deleteCollection(id) {
    store.setState((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      items: s.items.map((i) => ({ ...i, collectionIds: i.collectionIds.filter((cid) => cid !== id) })),
    }));
  },

  /**
   * Toggle an item's membership in a collection.
   * @param {number} itemId
   * @param {string} collectionId
   */
  toggleInCollection(itemId, collectionId) {
    store.setState((s) => ({
      items: s.items.map((item) => {
        if (item.id !== itemId) return item;
        const has = item.collectionIds.includes(collectionId);
        return {
          ...item,
          collectionIds: has
            ? item.collectionIds.filter((cid) => cid !== collectionId)
            : [...item.collectionIds, collectionId],
        };
      }),
    }));
  },

  /**
   * Categories present in the wishlist — used to boost "For You" scoring.
   * @returns {Set<string>}
   */
  categorySet() {
    return new Set(store.getState().items.map((i) => i.category));
  },
};
