/**
 * @file Two-tier TTL cache keyed by URL. Reads hit an in-memory Map first, then
 * a sessionStorage mirror (survives soft reloads within a tab). Writes are
 * quota-safe: a failed sessionStorage write is swallowed, leaving the in-memory
 * entry intact. Entries carry an expiry timestamp and are evicted lazily.
 */

import { CACHE } from '../config/constants.js';

/**
 * @typedef {Object} CacheEntry
 * @property {unknown} value
 * @property {number} expires Epoch ms.
 */

/** @type {Map<string, CacheEntry>} */
const memory = new Map();

/**
 * @param {string} key
 * @returns {string}
 */
function sessionKey(key) {
  return CACHE.SESSION_PREFIX + key;
}

/**
 * @param {CacheEntry} entry
 * @param {number} now
 * @returns {boolean}
 */
function isFresh(entry, now) {
  return entry.expires > now;
}

/**
 * Read a cached value, or undefined if missing/expired.
 * @param {string} key
 * @param {number} [now=Date.now()]
 * @returns {unknown|undefined}
 */
export function cacheGet(key, now = Date.now()) {
  const mem = memory.get(key);
  if (mem) {
    if (isFresh(mem, now)) return mem.value;
    memory.delete(key);
  }
  try {
    const raw = window.sessionStorage.getItem(sessionKey(key));
    if (raw) {
      const entry = /** @type {CacheEntry} */ (JSON.parse(raw));
      if (entry && typeof entry.expires === 'number' && isFresh(entry, now)) {
        memory.set(key, entry); // promote back to memory
        return entry.value;
      }
      window.sessionStorage.removeItem(sessionKey(key));
    }
  } catch {
    // sessionStorage unavailable or corrupt — ignore, memory tier still works.
  }
  return undefined;
}

/**
 * Store a value with the default TTL.
 * @param {string} key
 * @param {unknown} value
 * @param {number} [now=Date.now()]
 */
export function cacheSet(key, value, now = Date.now()) {
  /** @type {CacheEntry} */
  const entry = { value, expires: now + CACHE.TTL_MS };
  memory.set(key, entry);
  try {
    window.sessionStorage.setItem(sessionKey(key), JSON.stringify(entry));
  } catch {
    // Quota exceeded / blocked — memory tier is enough.
  }
}

/**
 * Get from cache or run the loader, caching its result. Concurrent calls for
 * the same key share one in-flight promise (dedupe).
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} loader
 * @returns {Promise<T>}
 */
const inFlight = new Map();
export async function cached(key, loader) {
  const hit = cacheGet(key);
  if (hit !== undefined) return /** @type {T} */ (hit);
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    try {
      const value = await loader();
      cacheSet(key, value);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

/** Clear the entire cache (both tiers). Used in tests / hard refresh flows. */
export function cacheClear() {
  memory.clear();
  try {
    const keys = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(CACHE.SESSION_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
