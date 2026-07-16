/**
 * @file Weather conditions for the recommender, plus the mapping from Open-Meteo
 * readings (WMO weather code + temperature) to one of our conditions. Each
 * condition carries a styling note and preferences that nudge the stylist
 * (which accessory suits it, whether closed shoes are preferable). Authored as
 * data. See services/weather-service.js for the fetch.
 */

/** Weather condition ids. @readonly */
export const WEATHER_ID = Object.freeze({
  HOT: 'hot',
  WARM: 'warm',
  MILD: 'mild',
  COOL: 'cool',
  COLD: 'cold',
  RAINY: 'rainy',
});

/**
 * @typedef {Object} WeatherCondition
 * @property {string} id
 * @property {string} label
 * @property {string} emoji
 * @property {string} note Styling guidance shown with recommendations.
 * @property {string} [accessory] Preferred accessory category slug.
 * @property {boolean} [closedShoes] Prefer closed footwear.
 */

/** @type {ReadonlyArray<WeatherCondition>} */
export const WEATHER = Object.freeze([
  { id: WEATHER_ID.HOT, label: 'Hot & sunny', emoji: '☀️', note: 'Keep it light and breathable — sunglasses on.', accessory: 'sunglasses' },
  { id: WEATHER_ID.WARM, label: 'Warm', emoji: '🌤️', note: 'Comfortable and airy works best.', accessory: 'sunglasses' },
  { id: WEATHER_ID.MILD, label: 'Mild', emoji: '⛅', note: 'A flexible day — dress how you feel.' },
  { id: WEATHER_ID.COOL, label: 'Cool', emoji: '🍃', note: 'A light layer wouldn’t hurt.' },
  { id: WEATHER_ID.COLD, label: 'Cold', emoji: '❄️', note: 'Layer up — throw a jacket or coat over this.', closedShoes: true },
  { id: WEATHER_ID.RAINY, label: 'Rainy', emoji: '🌧️', note: 'Closed shoes and a bag you don’t mind getting wet.', accessory: 'womens-bags', closedShoes: true },
]);

/** Default condition when detection fails or is skipped. */
export const DEFAULT_WEATHER = WEATHER_ID.MILD;

/**
 * @param {string} id
 * @returns {WeatherCondition|undefined}
 */
export function findWeather(id) {
  return WEATHER.find((w) => w.id === id);
}

/**
 * WMO weather codes that indicate precipitation (drizzle, rain, showers,
 * thunderstorm). Snow (71–77, 85–86) is treated as cold below.
 * @type {ReadonlySet<number>}
 */
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

/**
 * Map an Open-Meteo reading to one of our conditions. Precipitation wins over
 * temperature; otherwise temperature bands decide.
 * @param {number} tempC
 * @param {number} code WMO weather code.
 * @returns {string} a WEATHER_ID.
 */
export function mapOpenMeteo(tempC, code) {
  if (SNOW_CODES.has(code)) return WEATHER_ID.COLD;
  if (RAIN_CODES.has(code)) return WEATHER_ID.RAINY;
  if (!Number.isFinite(tempC)) return DEFAULT_WEATHER;
  if (tempC >= 30) return WEATHER_ID.HOT;
  if (tempC >= 23) return WEATHER_ID.WARM;
  if (tempC >= 16) return WEATHER_ID.MILD;
  if (tempC >= 8) return WEATHER_ID.COOL;
  return WEATHER_ID.COLD;
}
