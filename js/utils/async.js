/**
 * @file Async & timing helpers: debounce, sleep, retry backoff, a minimum-
 * duration wrapper (so skeletons never flash), and a reduced-motion check used
 * to gate every JS-driven animation.
 */

import { HTTP } from '../config/constants.js';

/**
 * Debounce a function: it runs only after `waitMs` of no further calls.
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} waitMs
 * @returns {F & { cancel: () => void }}
 */
export function debounce(fn, waitMs) {
  /** @type {number|undefined} */
  let timer;
  /** @type {any} */
  const debounced = function (...args) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(this, args), waitMs);
  };
  debounced.cancel = () => window.clearTimeout(timer);
  return debounced;
}

/**
 * Resolve after `ms`, rejecting early if the signal aborts.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    function cleanup() {
      signal?.removeEventListener('abort', onAbort);
    }
    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * Exponential backoff delay for a retry attempt (1-based), with jitter.
 * @param {number} attempt 1 = first retry.
 * @returns {number} milliseconds.
 */
export function backoffDelay(attempt) {
  const base = HTTP.BACKOFF_BASE_MS * 2 ** (attempt - 1);
  const jitter = Math.floor((attempt * 7919) % HTTP.BACKOFF_JITTER_MS);
  return base + jitter;
}

/**
 * Ensure a promise takes at least `minMs` (so skeleton → content isn't a flash).
 * The result resolves with the original value once both the work and the floor
 * have elapsed.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} minMs
 * @returns {Promise<T>}
 */
export async function withMinDuration(promise, minMs) {
  const [value] = await Promise.all([promise, sleep(minMs)]);
  return value;
}

/**
 * @returns {boolean} whether the user has asked for reduced motion.
 */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Run a callback on the next animation frame, returning a canceller.
 * @param {FrameRequestCallback} cb
 * @returns {() => void}
 */
export function onNextFrame(cb) {
  const id = window.requestAnimationFrame(cb);
  return () => window.cancelAnimationFrame(id);
}
