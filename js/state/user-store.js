/**
 * @file User preferences store: colour theme and the style-quiz profile.
 * Hydrates from localStorage on load (theme defaults to the OS preference),
 * persists changes, and applies the theme attribute to <html>. Personalization
 * consumes `quizProfile`; the quiz page writes it.
 */

import { STORAGE_KEYS, THEME, EVENTS } from '../config/constants.js';
import { createStore } from './store.js';
import { readString, writeString, readJson, writeJson, remove } from '../services/storage.js';
import { isQuizProfileV1 } from '../utils/validate.js';
import { emit } from '../utils/dom.js';

/**
 * @typedef {Object} UserState
 * @property {string} theme One of THEME.LIGHT | THEME.DARK.
 * @property {import('../types.js').QuizProfileV1|null} quizProfile
 */

/**
 * Resolve the initial theme: stored preference wins, else OS preference.
 * @returns {string}
 */
function resolveInitialTheme() {
  const stored = readString(STORAGE_KEYS.THEME);
  if (stored === THEME.LIGHT || stored === THEME.DARK) return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? THEME.DARK : THEME.LIGHT;
}

const store = createStore(
  /** @type {UserState} */ ({
    theme: resolveInitialTheme(),
    quizProfile: readJson(STORAGE_KEYS.QUIZ, isQuizProfileV1, null),
  }),
);

/**
 * Apply the theme to the document root so CSS custom properties switch.
 * @param {string} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute(THEME.ATTRIBUTE, theme);
}

export const userStore = {
  subscribe: store.subscribe,
  select: store.select,
  getState: store.getState,

  /** @returns {string} */
  getTheme() {
    return store.getState().theme;
  },

  /** Toggle between light and dark, persist, and notify. */
  toggleTheme() {
    const next = store.getState().theme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
    this.setTheme(next);
  },

  /**
   * @param {string} theme
   */
  setTheme(theme) {
    if (theme !== THEME.LIGHT && theme !== THEME.DARK) return;
    store.setState({ theme });
    applyTheme(theme);
    writeString(STORAGE_KEYS.THEME, theme);
    emit(EVENTS.THEME_CHANGED, { theme });
  },

  /** @returns {import('../types.js').QuizProfileV1|null} */
  getQuizProfile() {
    return store.getState().quizProfile;
  },

  /**
   * @param {import('../types.js').QuizProfileV1} profile
   */
  setQuizProfile(profile) {
    store.setState({ quizProfile: profile });
    writeJson(STORAGE_KEYS.QUIZ, profile);
  },

  /** Clear the saved quiz profile. */
  clearQuizProfile() {
    store.setState({ quizProfile: null });
    remove(STORAGE_KEYS.QUIZ);
  },
};

/** Apply the resolved theme immediately at module load. */
applyTheme(store.getState().theme);
