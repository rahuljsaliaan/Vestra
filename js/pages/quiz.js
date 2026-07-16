/**
 * @file Style quiz. A multi-step, animated questionnaire (vibe → fit → budget →
 * palette) with per-step validation (you can't advance without choosing). On
 * completion it derives a profile via personalization.deriveProfile, stores it
 * in the user store, and shows a results screen; the home page then surfaces a
 * personalized "For You" rail.
 */

import { html, toElement, Disposer, delegate, emit } from '../utils/dom.js';
import { routeTo } from '../config/routes.js';
import { STATE_CLASSES, EVENTS, TOAST_LEVEL } from '../config/constants.js';
import { QUIZ_STEPS, findOption } from '../config/quiz-content.js';
import { deriveProfile } from '../services/personalization.js';
import { userStore } from '../state/user-store.js';

/**
 * @returns {import('../types.js').Page}
 */
export function createQuizPage() {
  const disposer = new Disposer();
  /** @type {Record<string,string>} */
  let answers = {};
  let step = 0;
  /** @type {HTMLElement} */
  let stage;

  /** @returns {boolean} whether the current step has an answer. */
  function currentAnswered() {
    return Boolean(answers[QUIZ_STEPS[step].id]);
  }

  function renderProgress() {
    const total = QUIZ_STEPS.length;
    const pct = Math.round((Math.min(step, total) / total) * 100);
    const bar = stage.parentElement?.querySelector('[data-progress-fill]');
    if (bar instanceof HTMLElement) bar.style.width = `${pct}%`;
    const label = stage.parentElement?.querySelector('[data-progress-label]');
    if (label) label.textContent = step >= total ? 'Complete' : `Step ${step + 1} of ${total}`;
  }

  /**
   * Render the current step (or the results screen).
   */
  function render() {
    if (step >= QUIZ_STEPS.length) {
      renderResults();
      renderProgress();
      return;
    }
    const def = QUIZ_STEPS[step];
    const chosen = answers[def.id];
    const card = toElement(html`
      <div class="quiz-step" data-step="${def.id}">
        <p class="quiz-step__eyebrow">${def.hint}</p>
        <h2 class="quiz-step__q">${def.question}</h2>
        <div class="quiz-options" role="listbox" aria-label="${def.question}">
          ${def.options.map(
            (opt) => html`
              <button class="quiz-option ${opt.id === chosen ? STATE_CLASSES.SELECTED : ''}" type="button" role="option" data-option="${opt.id}" aria-selected="${String(opt.id === chosen)}">
                <span class="quiz-option__label">${opt.label}</span>
                <span class="quiz-option__desc">${opt.description}</span>
              </button>
            `,
          )}
        </div>
        <div class="quiz-nav">
          <button class="btn btn--ghost" type="button" data-back ${step === 0 ? 'disabled' : ''}>Back</button>
          <button class="btn btn--primary" type="button" data-next ${chosen ? '' : 'disabled'}>
            ${step === QUIZ_STEPS.length - 1 ? 'See my edit' : 'Next'}
          </button>
        </div>
      </div>
    `);
    stage.replaceChildren(card);
    renderProgress();
  }

  /**
   * Derive + persist the profile and render the summary.
   */
  function renderResults() {
    const profile = deriveProfile(answers);
    userStore.setQuizProfile(profile);
    emit(EVENTS.TOAST, { message: 'Your style profile is ready.', level: TOAST_LEVEL.SUCCESS });

    const summary = QUIZ_STEPS.map((s) => {
      const opt = findOption(s.id, answers[s.id]);
      return { label: s.question, value: opt ? opt.label : '—' };
    });

    stage.replaceChildren(
      toElement(html`
        <div class="quiz-results" data-reveal>
          <p class="eyebrow">Your Outfit Buddy profile</p>
          <h2 class="quiz-results__title">We've tuned the closet to you.</h2>
          <dl class="quiz-results__grid">
            ${summary.map((row) => html`<div class="quiz-results__row"><dt>${row.label}</dt><dd>${row.value}</dd></div>`)}
          </dl>
          <div class="quiz-results__cta">
            <a class="btn btn--primary" href="${routeTo.home()}">See your For You edit</a>
            <button class="btn btn--ghost" type="button" data-retake>Retake quiz</button>
          </div>
        </div>
      `),
    );
  }

  return {
    mount(root) {
      const existing = userStore.getQuizProfile();
      answers = existing ? { ...existing.answers } : {};
      step = 0;

      root.append(
        toElement(html`
          <div class="quiz section--narrow section" data-reveal>
            <header class="quiz__head">
              <p class="eyebrow">Style quiz</p>
              <h1 class="quiz__title">Find your Outfit Buddy look.</h1>
              <p class="quiz__lede">Four quick taps and your home feed learns what you love.</p>
              <div class="quiz__progress">
                <div class="quiz__progress-track"><span class="quiz__progress-fill" data-progress-fill></span></div>
                <span class="quiz__progress-label" data-progress-label></span>
              </div>
            </header>
            <div class="quiz__stage" data-stage></div>
          </div>
        `),
      );
      stage = /** @type {HTMLElement} */ (root.querySelector('[data-stage]'));

      // If a profile already exists, jump straight to results (with retake).
      if (existing) {
        step = QUIZ_STEPS.length;
        render();
      } else {
        render();
      }

      // Select an option
      disposer.add(
        delegate(root, 'click', '[data-option]', (_event, matched) => {
          const def = QUIZ_STEPS[step];
          if (!def) return;
          answers[def.id] = matched.getAttribute('data-option') || '';
          stage.querySelectorAll('[data-option]').forEach((btn) => {
            const sel = btn === matched;
            btn.classList.toggle(STATE_CLASSES.SELECTED, sel);
            btn.setAttribute('aria-selected', String(sel));
          });
          const next = stage.querySelector('[data-next]');
          if (next instanceof HTMLButtonElement) next.disabled = false;
        }),
      );

      // Next (validated)
      disposer.add(
        delegate(root, 'click', '[data-next]', () => {
          if (!currentAnswered()) {
            emit(EVENTS.TOAST, { message: 'Pick an option to continue.', level: TOAST_LEVEL.INFO });
            return;
          }
          step += 1;
          render();
        }),
      );

      // Back
      disposer.add(
        delegate(root, 'click', '[data-back]', () => {
          if (step > 0) {
            step -= 1;
            render();
          }
        }),
      );

      // Retake
      disposer.add(
        delegate(root, 'click', '[data-retake]', () => {
          answers = {};
          step = 0;
          userStore.clearQuizProfile();
          render();
        }),
      );
    },
    unmount() {
      disposer.dispose();
    },
  };
}
