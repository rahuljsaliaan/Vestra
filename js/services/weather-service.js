/**
 * @file Weather service. Resolves the user's current weather condition from the
 * free Open-Meteo API (no API key, browser-callable) using the browser's
 * geolocation. Everything degrades gracefully: denied/unsupported geolocation,
 * a failed fetch, or a malformed response all resolve to a null result so the
 * caller can fall back to the default condition. Uses the shared HTTP client.
 */

import { fetchJson } from './http.js';
import { mapOpenMeteo } from '../config/weather.js';
import { isObject, isFiniteNumber } from '../utils/validate.js';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_TIMEOUT_MS = 8000;

/**
 * Promisified geolocation with a timeout. Rejects if unsupported/denied.
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getGeolocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/**
 * Build the Open-Meteo request URL.
 * @param {number} lat
 * @param {number} lon
 * @returns {string}
 */
function forecastUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

/**
 * Fetch the current condition for a location and map it to a WEATHER_ID.
 * @param {number} lat
 * @param {number} lon
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{ conditionId: string, tempC: number }|null>}
 */
export async function getConditionAt(lat, lon, opts = {}) {
  try {
    const data = await fetchJson(forecastUrl(lat, lon), { signal: opts.signal });
    if (!isObject(data) || !isObject(data.current)) return null;
    const tempC = data.current.temperature_2m;
    const code = data.current.weather_code;
    if (!isFiniteNumber(tempC) || !isFiniteNumber(code)) return null;
    return { conditionId: mapOpenMeteo(tempC, code), tempC };
  } catch {
    return null;
  }
}

/**
 * Detect the user's current condition end-to-end (geolocation → Open-Meteo).
 * Returns null on any failure; the caller falls back to the default.
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{ conditionId: string, tempC: number }|null>}
 */
export async function detectCurrentWeather(opts = {}) {
  try {
    const { lat, lon } = await getGeolocation();
    return await getConditionAt(lat, lon, opts);
  } catch {
    return null;
  }
}
