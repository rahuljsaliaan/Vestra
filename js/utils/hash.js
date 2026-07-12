/**
 * @file Deterministic hashing & pseudo-randomness. Used to derive stable,
 * reproducible values (cross-store offers, tie-break ordering) from ids —
 * "random-feeling" but identical across reloads and sessions. No Math.random.
 */

/**
 * FNV-1a 32-bit hash of a string.
 * @param {string} str
 * @returns {number} unsigned 32-bit integer.
 */
export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    // hash *= 16777619, kept in 32-bit range via Math.imul.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Map a 32-bit hash to a float in [0, 1).
 * @param {number} hash
 * @returns {number}
 */
export function hashToUnitFloat(hash) {
  return (hash >>> 0) / 0x100000000;
}

/**
 * mulberry32 seeded PRNG. Returns a function producing floats in [0, 1); great
 * for taking several independent-looking draws from one seed.
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * Deterministically pick one element of a list from a seed string.
 * @template T
 * @param {ReadonlyArray<T>} list
 * @param {string} seed
 * @returns {T}
 */
export function pickDeterministic(list, seed) {
  if (list.length === 0) throw new Error('pickDeterministic: empty list');
  return list[fnv1a(seed) % list.length];
}

/**
 * Map a float in [0,1) to a value in [min, max).
 * @param {number} unit
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function lerp(unit, min, max) {
  return min + unit * (max - min);
}
