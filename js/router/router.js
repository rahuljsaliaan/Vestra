/**
 * @file Hash router. Compiles the route table to matchers, listens for
 * `hashchange`, and drives the page lifecycle (mount → onQueryChange →
 * unmount). Each navigation gets an AbortController whose signal is passed to
 * the page and aborted on unmount, so in-flight fetches cancel cleanly. Path
 * changes remount; query-only changes take a fast path. Swaps are wrapped in a
 * View Transition when supported (and motion is allowed).</p>
 */

import { ROUTES, ROUTE_ID, DEFAULT_TITLE } from '../config/routes.js';
import { TIMINGS } from '../config/constants.js';
import { prefersReducedMotion } from '../utils/async.js';

/**
 * @typedef {Object} CompiledRoute
 * @property {string} id
 * @property {RegExp} regex
 * @property {string[]} paramNames
 * @property {string} title
 */

/**
 * @typedef {Object} RouteMatch
 * @property {string} id
 * @property {Record<string,string>} params
 * @property {URLSearchParams} query
 * @property {string} title
 * @property {string} path
 */

/**
 * Compile a `:param` pattern into a regex plus its ordered param names.
 * @param {string} pattern
 * @returns {{regex: RegExp, paramNames: string[]}}
 */
function compilePattern(pattern) {
  /** @type {string[]} */
  const paramNames = [];
  const source = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex metachars in literal parts
    .replace(/:([A-Za-z0-9_]+)/g, (_match, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${source}$`), paramNames };
}

const COMPILED = ROUTES.map((route) => {
  const { regex, paramNames } = compilePattern(route.pattern);
  return /** @type {CompiledRoute} */ ({ id: route.id, regex, paramNames, title: route.title });
});

/**
 * Split a raw hash into its path and query parts.
 * @param {string} rawHash
 * @returns {{path: string, query: URLSearchParams}}
 */
function parseHash(rawHash) {
  let hash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  if (hash === '' || hash === '/') hash = '/';
  const queryIndex = hash.indexOf('?');
  const path = queryIndex >= 0 ? hash.slice(0, queryIndex) : hash;
  const query = new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : '');
  return { path: path || '/', query };
}

/**
 * Match a path against the compiled route table.
 * @param {string} path
 * @param {URLSearchParams} query
 * @returns {RouteMatch}
 */
function matchRoute(path, query) {
  for (const route of COMPILED) {
    const result = route.regex.exec(path);
    if (!result) continue;
    /** @type {Record<string,string>} */
    const params = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(result[index + 1]);
    });
    return { id: route.id, params, query, title: route.title, path };
  }
  return { id: ROUTE_ID.NOT_FOUND, params: {}, query, title: DEFAULT_TITLE, path };
}

/**
 * Create the router.
 * @param {Object} options
 * @param {HTMLElement} options.outlet Element pages mount into.
 * @param {Record<string, () => import('../types.js').Page>} options.pageFactories Map of routeId → factory.
 * @param {() => import('../types.js').Page} options.notFoundFactory
 * @param {(match: RouteMatch) => void} [options.onNavigated] Called after each successful navigation.
 */
export function createRouter({ outlet, pageFactories, notFoundFactory, onNavigated }) {
  /** @type {import('../types.js').Page|null} */
  let currentPage = null;
  /** @type {string|null} */
  let currentRouteId = null;
  /** @type {string|null} */
  let currentPath = null;
  /** @type {AbortController|null} */
  let currentAbort = null;
  let navToken = 0;

  /**
   * @param {RouteMatch} match
   * @returns {import('../types.js').RouteContext}
   */
  function makeContext(match, signal) {
    return { routeId: match.id, params: match.params, query: match.query, signal };
  }

  /** Tear down the current page and abort its pending work. */
  function teardownCurrent() {
    if (currentAbort) currentAbort.abort();
    if (currentPage) {
      try {
        currentPage.unmount();
      } catch (err) {
        console.error('Page unmount failed:', err);
      }
    }
    currentPage = null;
    currentAbort = null;
  }

  /**
   * Mount a freshly matched page into the outlet.
   * @param {RouteMatch} match
   */
  async function mountMatch(match) {
    const token = (navToken += 1);
    teardownCurrent();

    const factory = pageFactories[match.id] || notFoundFactory;
    const page = factory();
    const abort = new AbortController();
    currentPage = page;
    currentAbort = abort;
    currentRouteId = match.id;
    currentPath = match.path;

    outlet.replaceChildren();
    outlet.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });

    document.title = match.title;

    try {
      await page.mount(outlet, makeContext(match, abort.signal));
    } catch (err) {
      // A stale mount (user navigated again) should be ignored.
      if (token === navToken) console.error('Page mount failed:', err);
    }
    if (token === navToken && onNavigated) onNavigated(match);
  }

  /**
   * Handle a resolved match: fast-path query-only changes, else remount
   * (optionally inside a View Transition).
   * @param {RouteMatch} match
   */
  function handleMatch(match) {
    const samePath = match.id === currentRouteId && match.path === currentPath;
    if (samePath && currentPage) {
      currentPath = match.path;
      const signal = currentAbort ? currentAbort.signal : new AbortController().signal;
      if (typeof currentPage.onQueryChange === 'function') {
        currentPage.onQueryChange(makeContext(match, signal));
      }
      document.title = match.title;
      if (onNavigated) onNavigated(match);
      return;
    }

    const canTransition =
      typeof document.startViewTransition === 'function' && !prefersReducedMotion();
    if (canTransition) {
      document.startViewTransition(() => mountMatch(match));
    } else {
      mountMatch(match);
    }
  }

  /** Read the current hash and route to it. */
  function resolve() {
    const { path, query } = parseHash(window.location.hash);
    handleMatch(matchRoute(path, query));
  }

  const onHashChange = () => resolve();

  return {
    /** Start listening and route to the current URL. */
    start() {
      window.addEventListener('hashchange', onHashChange);
      resolve();
    },
    /** Stop listening (used only in teardown/tests). */
    stop() {
      window.removeEventListener('hashchange', onHashChange);
      teardownCurrent();
    },
    /**
     * Reflect state into the hash without triggering a navigation
     * (no hashchange fires for replaceState). Pages use this for filters.
     * @param {string} href e.g. `#/shop?q=linen`
     */
    replaceQuery(href) {
      const normalized = href.startsWith('#') ? href : `#${href}`;
      history.replaceState(null, '', normalized);
    },
    /** @returns {string|null} */
    getCurrentRouteId() {
      return currentRouteId;
    },
  };
}
