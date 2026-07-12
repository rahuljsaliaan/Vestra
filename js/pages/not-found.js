/**
 * @file 404 page. Rendered by the router when no route matches.
 */

import { html, toElement, Disposer } from '../utils/dom.js';
import { routeTo } from '../config/routes.js';

/**
 * @returns {import('../types.js').Page}
 */
export function createNotFoundPage() {
  const disposer = new Disposer();
  return {
    mount(root) {
      root.append(
        toElement(html`
          <section class="notfound" data-reveal>
            <p class="notfound__code">404</p>
            <h1 class="notfound__title">This look is off the rack.</h1>
            <p class="notfound__body">The page you were after doesn't exist — but the closet is still open.</p>
            <a class="btn btn--primary" href="${routeTo.home()}">Back to Vestra</a>
          </section>
        `),
      );
    },
    unmount() {
      disposer.dispose();
    },
  };
}
