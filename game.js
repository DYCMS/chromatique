/* Moteur partagé par l'interface et l'API provisoire. Aucune dépendance. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.CodeSecretEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.2';
  const PALETTE = Object.freeze(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
  const MAX_ATTEMPTS = 10;

  function validCode(code) {
    return Array.isArray(code) && code.length === 4 &&
      Array.from(code).every(color => PALETTE.includes(color));
  }

  function evaluate(secret, guess) {
    if (!validCode(secret) || !validCode(guess)) throw new TypeError('Il faut quatre couleurs autorisées.');
    let wellPlaced = 0;
    const remainingSecret = {};
    const remainingGuess = {};
    for (let i = 0; i < 4; i++) {
      if (secret[i] === guess[i]) wellPlaced++;
      else {
        remainingSecret[secret[i]] = (remainingSecret[secret[i]] || 0) + 1;
        remainingGuess[guess[i]] = (remainingGuess[guess[i]] || 0) + 1;
      }
    }
    const misplaced = PALETTE.reduce((total, color) =>
      total + Math.min(remainingSecret[color] || 0, remainingGuess[color] || 0), 0);
    return { wellPlaced, misplaced };
  }

  function randomSecret(random = Math.random) {
    return Array.from({ length: 4 }, () => PALETTE[Math.floor(random() * PALETTE.length)]);
  }

  function createGame({ random = Math.random } = {}) {
    let secret, history, status;
    const listeners = new Set();
    function getState() {
      return {
        version: VERSION,
        rules: 'code-couleurs-1.0',
        palette: [...PALETTE],
        status,
        attemptsUsed: history.length,
        attemptsRemaining: MAX_ATTEMPTS - history.length,
        maxAttempts: MAX_ATTEMPTS,
        history: history.map(row => ({
          attempt: row.attempt, guess: [...row.guess],
          wellPlaced: row.wellPlaced, misplaced: row.misplaced
        })),
        secret: status === 'playing' ? null : [...secret]
      };
    }
    function notify() { listeners.forEach(fn => fn(getState())); }
    function newGame(options = {}) {
      if (!options || typeof options !== 'object' || Array.isArray(options)) {
        return { ok: false, error: 'Les options de partie doivent être un objet.', state: getState() };
      }
      const next = options.secret === undefined ? randomSecret(random) : options.secret;
      if (!validCode(next)) {
        return { ok: false, error: 'Le secret doit contenir quatre couleurs autorisées.', state: getState() };
      }
      secret = [...next]; history = []; status = 'playing';
      notify();
      return { ok: true, state: getState() };
    }
    function submit(guess) {
      if (status !== 'playing') return { ok: false, error: 'Cette partie est terminée. Lancez une nouvelle partie.', state: getState() };
      if (!validCode(guess)) return {
        ok: false,
        error: 'Choisissez exactement quatre couleurs : rouge, bleu, vert, jaune, orange ou violet.',
        state: getState()
      };
      const feedback = evaluate(secret, guess);
      history.push({ attempt: history.length + 1, guess: [...guess], ...feedback });
      if (feedback.wellPlaced === 4) status = 'won';
      else if (history.length === MAX_ATTEMPTS) status = 'lost';
      notify();
      return { ok: true, feedback: { ...feedback }, state: getState() };
    }
    newGame();
    return Object.freeze({
      newGame, submit, getState,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    });
  }

  // Ce contrat est local et provisoire : le contrat pédagogique 0.2 n'a pas été fourni.
  function bindApi(game, { testMode = false } = {}) {
    return Object.freeze({
      version: 'provisional-1',
      newGame(options = {}) {
        if (!testMode && options && options.secret !== undefined) return {
          ok: false, error: 'Le secret imposé nécessite le mode de test (?test=1).', state: game.getState()
        };
        return game.newGame(options);
      },
      submit: guess => game.submit(guess),
      getState: () => game.getState()
    });
  }
  return Object.freeze({ VERSION, PALETTE, MAX_ATTEMPTS, validCode, evaluate, createGame, bindApi });
});
