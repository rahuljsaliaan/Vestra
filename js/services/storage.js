/**
 * @file Safe, validated localStorage wrapper. Every read is guard-validated and
 * falls back to a default on missing/corrupt data (never throws to callers).
 * Every write is wrapped so quota errors / private-mode restrictions degrade to
 * an in-memory map instead of crashing the app.
 */

/** In-memory fallback used when Web Storage is unavailable or throws. @type {Map<string,string>} */
const memoryStore = new Map();

/** Whether real localStorage is usable in this environment. */
let storageAvailable = detectStorage();

/**
 * Feature-detect a writable localStorage (Safari private mode throws on set).
 * @returns {boolean}
 */
function detectStorage() {
  try {
    const probe = '__vestra_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Low-level string read.
 * @param {string} key
 * @returns {string|null}
 */
function readRaw(key) {
  if (storageAvailable) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      storageAvailable = false;
    }
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

/**
 * Low-level string write, degrading to memory on failure.
 * @param {string} key
 * @param {string} value
 * @returns {boolean} true if written to real storage.
 */
function writeRaw(key, value) {
  if (storageAvailable) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      // Quota exceeded or blocked — fall through to memory.
      storageAvailable = false;
    }
  }
  memoryStore.set(key, value);
  return false;
}

/**
 * Read and validate a JSON value.
 * @template T
 * @param {string} key
 * @param {(value: unknown) => value is T} guard
 * @param {T} fallback returned on missing/corrupt/invalid data.
 * @returns {T}
 */
export function readJson(key, guard, fallback) {
  const rawValue = readRaw(key);
  if (rawValue === null) return fallback;
  try {
    const parsed = JSON.parse(rawValue);
    if (guard(parsed)) return parsed;
  } catch {
    // Corrupt JSON — fall through.
  }
  // Invalid/corrupt: proactively clear so we don't keep re-parsing garbage.
  remove(key);
  return fallback;
}

/**
 * Write a JSON-serialisable value.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} true if persisted to real storage.
 */
export function writeJson(key, value) {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/**
 * Read a plain string value.
 * @param {string} key
 * @param {string|null} [fallback=null]
 * @returns {string|null}
 */
export function readString(key, fallback = null) {
  const value = readRaw(key);
  return value === null ? fallback : value;
}

/**
 * Write a plain string value.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
export function writeString(key, value) {
  return writeRaw(key, value);
}

/**
 * Remove a key from both real and in-memory storage.
 * @param {string} key
 */
export function remove(key) {
  if (storageAvailable) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      storageAvailable = false;
    }
  }
  memoryStore.delete(key);
}

/** @returns {boolean} whether persistent storage is available. */
export function isPersistent() {
  return storageAvailable;
}
