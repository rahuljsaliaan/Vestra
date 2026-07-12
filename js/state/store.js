/**
 * @file createStore — a tiny observer-pattern state container. Holds an
 * immutable-by-convention state object, shallow-merges updates, and notifies
 * subscribers with `(nextState, prevState)`. This is the base other stores
 * (wishlist, user) are built on.
 */

/**
 * @template S
 * @typedef {Object} Store
 * @property {() => Readonly<S>} getState
 * @property {(patch: Partial<S> | ((s: Readonly<S>) => Partial<S>)) => void} setState
 * @property {(listener: (state: Readonly<S>, prev: Readonly<S>) => void) => (() => void)} subscribe
 * @property {<T>(selector: (s: Readonly<S>) => T, listener: (value: T, prev: T) => void) => (() => void)} select
 */

/**
 * Create an observable store.
 * @template S
 * @param {S} initialState
 * @returns {Store<S>}
 */
export function createStore(initialState) {
  let state = Object.freeze({ ...initialState });
  /** @type {Set<(state: any, prev: any) => void>} */
  const listeners = new Set();

  function getState() {
    return state;
  }

  /**
   * @param {Partial<S> | ((s: Readonly<S>) => Partial<S>)} patch
   */
  function setState(patch) {
    const resolved = typeof patch === 'function' ? patch(state) : patch;
    if (!resolved) return;
    const prev = state;
    const next = Object.freeze({ ...state, ...resolved });
    // Skip notification when nothing actually changed (shallow compare).
    let changed = false;
    for (const key of Object.keys(resolved)) {
      if (prev[key] !== next[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = next;
    for (const listener of listeners) {
      listener(state, prev);
    }
  }

  /**
   * @param {(state: any, prev: any) => void} listener
   * @returns {() => void}
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Subscribe to a derived slice; the listener only fires when the slice
   * changes (compared with Object.is).
   * @template T
   * @param {(s: Readonly<S>) => T} selector
   * @param {(value: T, prev: T) => void} listener
   * @returns {() => void}
   */
  function select(selector, listener) {
    let current = selector(state);
    return subscribe((next) => {
      const value = selector(next);
      if (!Object.is(value, current)) {
        const prev = current;
        current = value;
        listener(value, prev);
      }
    });
  }

  return { getState, setState, subscribe, select };
}
