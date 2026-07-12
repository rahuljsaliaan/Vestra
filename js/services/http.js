/**
 * @file HTTP client. Wraps fetch with a per-request timeout (AbortController),
 * retry-with-exponential-backoff on network errors and 5xx responses, JSON
 * parsing, and a typed HttpError. Honours an external AbortSignal (e.g. the
 * router's per-navigation signal) so page navigations cancel in-flight work.
 */

import { HTTP } from '../config/constants.js';
import { backoffDelay, sleep } from '../utils/async.js';

/** Error thrown for non-OK responses / network failures. */
export class HttpError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, cause?: unknown, url?: string}} [info]
   */
  constructor(message, info = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = info.status ?? 0;
    this.url = info.url;
    this.cause = info.cause;
  }

  /** @returns {boolean} whether the failure was a user/route abort. */
  get isAbort() {
    return this.cause instanceof DOMException && this.cause.name === 'AbortError';
  }
}

/**
 * Combine an external signal with a timeout signal into one controller.
 * @param {AbortSignal|undefined} external
 * @param {number} timeoutMs
 * @returns {{signal: AbortSignal, cleanup: () => void}}
 */
function withTimeout(external, timeoutMs) {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = window.setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}

/**
 * Fetch JSON with timeout + retry. Aborts (via the external signal) are never
 * retried and rethrow immediately.
 * @param {string} url
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<unknown>}
 */
export async function fetchJson(url, options = {}) {
  const { signal } = options;
  let lastError;

  for (let attempt = 0; attempt <= HTTP.MAX_RETRIES; attempt += 1) {
    if (signal?.aborted) throw new HttpError('Request aborted', { url, cause: signal.reason });

    const { signal: reqSignal, cleanup } = withTimeout(signal, HTTP.TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: reqSignal, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        // Retry only server errors; client errors (4xx) are terminal.
        if (response.status >= HTTP.RETRYABLE_STATUS_MIN && attempt < HTTP.MAX_RETRIES) {
          lastError = new HttpError(`Server error ${response.status}`, { status: response.status, url });
          cleanup();
          await sleep(backoffDelay(attempt + 1), signal);
          continue;
        }
        cleanup();
        throw new HttpError(`Request failed (${response.status})`, { status: response.status, url });
      }
      const data = await response.json();
      cleanup();
      return data;
    } catch (err) {
      cleanup();
      // External abort → surface immediately, don't retry.
      if (signal?.aborted) throw new HttpError('Request aborted', { url, cause: signal.reason });
      if (err instanceof HttpError) throw err;
      // Network/timeout error — retry if attempts remain.
      lastError = new HttpError('Network request failed', { url, cause: err });
      if (attempt < HTTP.MAX_RETRIES) {
        await sleep(backoffDelay(attempt + 1), signal);
        continue;
      }
    }
  }

  throw lastError ?? new HttpError('Request failed', { url });
}
