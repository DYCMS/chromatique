(function () {
  'use strict';
  const COLORS = [
    { id:'rouge', name:'Rouge', symbol:'R', color:'#c73c40', on:'#ffffff' },
    { id:'bleu', name:'Bleu', symbol:'B', color:'#3463b4', on:'#ffffff' },
    { id:'vert', name:'Vert', symbol:'V', color:'#34754d', on:'#ffffff' },
    { id:'jaune', name:'Jaune', symbol:'J', color:'#f2d256', on:'#253b35' },
    { id:'orange', name:'Orange', symbol:'O', color:'#e99541', on:'#253b35' },
    { id:'violet', name:'Violet', symbol:'Vi', color:'#8054a4', on:'#ffffff' }
  ];
  const $ = id => document.getElementById(id);
  const game = CodeSecretEngine.createGame();
  const testMode = new URLSearchParams(location.search).get('test') === '1';
  const api = CodeSecretEngine.bindApi(game, { testMode });
  window.codeSecret = api;
  const ext = CodeSecretExtensions;
  const modeNames = {classic:'Classique', assisted:'Assisté', automatic:'Automatique'};
  let mode = 'classic';
  let storage = null;
  try { storage = window.localStorage; } catch {}
  const tracker = ext.createTracker({ storage, testMode });
  let autoRunning = false, autoTimer = null, hint = null;
  let draft = ['', '', '', ''];
  let selected = 0;
  let renderedAttempts = 0;
  let previousStatus = 'playing';

  function applyColor(element, id) {
    const color = COLORS.find(c => c.id === id);
    element.style.removeProperty('--color');
    element.style.removeProperty('--on-color');
    element.textContent = color ? color.symbol : '+';
    if (color) {
      element.style.setProperty('--color', color.color);
      element.style.setProperty('--on-color', color.on);
    }
    element.classList.toggle('peg', Boolean(color));
  }
  function peg(id) {
    const element = document.createElement('span');
    applyColor(element, id);
    element.setAttribute('aria-label', id);
    element.title = id;
    return element;
  }
  const slots = Array.from({ length:4 }, (_, i) => {
    const container = document.createElement('div');
    container.className = 'slot';
    const label = document.createElement('label');
    label.htmlFor = `color-${i}`;
    label.textContent = `CASE ${i + 1}`;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'slot-button';
    button.addEventListener('click', () => { selected = i; updateDraft(); });
    const select = document.createElement('select');
    select.id = `color-${i}`;
    select.setAttribute('aria-label', `Couleur de la case ${i + 1}`);
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Choisir'; select.append(empty);
    COLORS.forEach(color => {
      const option = document.createElement('option'); option.value = color.id; option.textContent = color.name; select.append(option);
    });
    select.addEventListener('focus', () => { selected = i; updateDraft(); });
    select.addEventListener('change', () => { draft[i] = select.value; $('error').textContent = ''; updateDraft(); });
    container.append(label, button, select); $('slots').append(container);
    return { container, button, select };
  });
  COLORS.forEach(color => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'color-button';
    button.setAttribute('aria-label', `Choisir ${color.name}`);
    button.append(peg(color.id), document.createTextNode(color.name));
    button.addEventListener('click', () => {
      if (game.getState().status !== 'playing' || mode === 'automatic') return;
      draft[selected] = color.id;
      const nextEmpty = draft.findIndex((value, index) => index > selected && !value);
      if (nextEmpty !== -1) selected = nextEmpty;
      else { const empty = draft.indexOf(''); if (empty !== -1) selected = empty; }
      $('error').textContent = ''; updateDraft();
    });
    $('palette').append(button);
  });
  function updateDraft() {
    const ended = game.getState().status !== 'playing';
    const controlsDisabled = ended || mode === 'automatic';
    slots.forEach((slot, i) => {
      slot.container.classList.toggle('active', !controlsDisabled && i === selected);
      applyColor(slot.button, draft[i]);
      slot.button.setAttribute('aria-label', `Sélectionner la case ${i + 1} : ${draft[i] || 'vide'}`);
      slot.button.setAttribute('aria-pressed', String(i === selected && !controlsDisabled));
      slot.select.value = draft[i];
      slot.select.disabled = controlsDisabled; slot.button.disabled = controlsDisabled;
    });
    $('palette-prompt').textContent = ended ? 'Partie terminée — lancez une nouvelle partie pour rejouer.' : `Choisissez la couleur de la case ${selected + 1}`;
    $('palette-fieldset').disabled = controlsDisabled;
    $('validate').disabled = controlsDisabled;
    if (mode === 'automatic' && !ended) $('palette-prompt').textContent = 'Le programme compose les propositions dans ce mode.';
  }
  function drawHistory(state) {
    $('history').replaceChildren();
    state.history.forEach(row => {
      const li = document.createElement('li'); li.className = 'history-row';
      li.setAttribute('aria-label', `Essai ${row.attempt} : ${row.guess.join(', ')}. ${row.wellPlaced} bien placées et ${row.misplaced} mal placées.`);
      const group = document.createElement('div'); group.className = 'guess-group';
      const number = document.createElement('span'); number.className = 'row-number'; number.textContent = String(row.attempt).padStart(2,'0'); group.append(number);
      row.guess.forEach(color => group.append(peg(color)));
      const feedback = document.createElement('div'); feedback.className = 'feedback';
      const good = document.createElement('span'); good.textContent = row.wellPlaced; good.title = 'Bien placées'; good.setAttribute('aria-label', `${row.wellPlaced} bien placées`);
      const other = document.createElement('span'); other.textContent = row.misplaced; other.title = 'Mal placées'; other.setAttribute('aria-label', `${row.misplaced} mal placées`);
      good.className = 'feedback-number'; other.className = 'feedback-number';
      function labeledFeedback(number, text) {
        const item = document.createElement('div'); item.className = 'feedback-item';
        const label = document.createElement('small'); label.textContent = text;
        item.append(number, label); return item;
      }
      feedback.append(labeledFeedback(good, 'Bien placées'), labeledFeedback(other, 'Mal placées'));
      li.append(group, feedback); $('history').append(li);
    });
    $('empty-history').hidden = state.attemptsUsed !== 0;
    $('history-count').textContent = `${state.attemptsUsed} / 10`;
  }
  function render(state) {
    tracker.observe(state, mode);
    if (state.attemptsUsed === 0 || state.status !== 'playing') stopAuto();
    hint = null;
    $('use-hint').disabled = true;
    if (state.attemptsUsed === 0) $('deduction-message').textContent = '';
    $('error').textContent = '';
    if (state.attemptsUsed === 0) {
      draft = ['', '', '', '']; selected = 0;
    }
    if (state.attemptsUsed !== renderedAttempts && state.status === 'playing' && state.attemptsUsed > 0) {
      draft = ['', '', '', '']; selected = 0;
    }
    renderedAttempts = state.attemptsUsed;
    drawHistory(state);
    $('attempt-label').textContent = state.status === 'playing' ? `Essai ${state.attemptsUsed + 1} / 10` : 'Partie terminée';
    if (state.status === 'won') $('status').textContent = `Code trouvé ! Vous avez gagné en ${state.attemptsUsed} essai${state.attemptsUsed > 1 ? 's' : ''}.`;
    else if (state.status === 'lost') $('status').textContent = 'Les dix essais sont écoulés. Le code est dévoilé : retentez votre chance !';
    else if (state.attemptsUsed === 0) $('status').textContent = mode === 'automatic'
      ? 'Cliquez sur « Démarrer la démonstration » ou « Jouer un coup » dans le panneau ci-dessus.'
      : 'Choisissez vos quatre couleurs.';
    else {
      const last = state.history[state.history.length - 1];
      $('status').textContent = `Essai ${last.attempt} : ${last.wellPlaced} bien placées, ${last.misplaced} mal placées. ${state.attemptsRemaining} essai${state.attemptsRemaining > 1 ? 's' : ''} restant${state.attemptsRemaining > 1 ? 's' : ''}.`;
    }
    $('secret-title').textContent = state.status === 'won' ? 'Code trouvé !' : state.status === 'lost' ? 'Le code secret était…' : 'Le code à découvrir';
    $('secret').replaceChildren();
    if (state.secret) {
      state.secret.forEach(color => $('secret').append(peg(color)));
      $('secret').setAttribute('aria-label', 'Code secret : ' + state.secret.join(', '));
      $('secret-caption').textContent = state.secret.join(' · ');
    } else {
      for (let i = 0; i < 4; i++) { const hidden = document.createElement('span'); hidden.textContent = '?'; $('secret').append(hidden); }
      $('secret').setAttribute('aria-label', 'Code secret caché');
      $('secret-caption').textContent = 'Les répétitions sont possibles.';
    }
    updateDraft();
    const ended = state.status !== 'playing';
    $('result').hidden = !ended;
    $('result').classList.toggle('victory', state.status === 'won');
    $('result').classList.toggle('defeat', state.status === 'lost');
    $('result-icon').textContent = state.status === 'won' ? '✓' : '×';
    $('result-title').textContent = ended ? (state.status === 'won' ? 'Victoire !' : 'Partie perdue') : '';
    $('result-message').textContent = !ended ? '' : state.status === 'won'
      ? `Bravo ! Vous avez trouvé le code en ${state.attemptsUsed} essai${state.attemptsUsed > 1 ? 's' : ''}. Lancez une nouvelle partie pour rejouer.`
      : 'Les 10 essais sont écoulés. Le code secret est dévoilé ci-dessus. Lancez une nouvelle partie pour retenter votre chance.';
    if (ended && previousStatus === 'playing') {
      $('result').focus();
      if (typeof $('result').scrollIntoView === 'function') $('result').scrollIntoView({ block:'center', behavior:'instant' });
    }
    previousStatus = state.status;
    updateExtras(state);
  }
  $('proposal').addEventListener('submit', event => {
    event.preventDefault();
    if (mode === 'automatic') return;
    const result = api.submit([...draft]);
    if (!result.ok) $('error').textContent = result.error;
  });
  function restart(nextMode = mode) {
    const state = api.getState();
    if (state.status === 'playing' && state.attemptsUsed > 0 &&
        !window.confirm('Abandonner cette partie et recommencer ?')) { $('game-mode').value = mode; return; }
    stopAuto();
    mode = ext.MODES.includes(nextMode) ? nextMode : mode;
    $('game-mode').value = mode;
    api.newGame();
    if (mode === 'automatic') $('auto-toggle').focus();
    else slots[0].button.focus();
  }
  $('new-game').addEventListener('click', () => restart());
  $('result-new-game').addEventListener('click', () => restart());
  function node(tag, text, className) {
    const el = document.createElement(tag); if (text !== undefined) el.textContent = text;
    if (className) el.className = className; return el;
  }
  function tick() { $('elapsed').textContent = ext.formatTime(tracker.elapsed()); }
  function drawRecords() {
    $('stats-grid').replaceChildren();
    const stats = tracker.stats();
    for (const name of ext.MODES) {
      const item = stats[name], card = node('article', undefined, 'stat-card');
      card.append(node('h3', modeNames[name]));
      card.append(node('p', `${item.wins} victoire${item.wins > 1 ? 's' : ''} · ${item.losses} défaite${item.losses > 1 ? 's' : ''}`));
      card.append(node('strong', `${item.winRate} % de réussite`));
      card.append(node('p', item.averageAttempts === null ? 'Moyenne : —' : `Moyenne des victoires : ${item.averageAttempts.toFixed(1)} essais`));
      $('stats-grid').append(card);
    }
    $('game-archive').replaceChildren();
    const filter = $('archive-filter').value || 'all';
    const records = tracker.getRecords().reverse().filter(r => filter === 'all' || r.mode === filter);
    $('archive-empty').hidden = records.length !== 0;
    for (const record of records) {
      const details = node('details', undefined, 'archived-game');
      const date = new Date(record.finishedAt).toLocaleString('fr-CH');
      const summary = node('summary', `${modeNames[record.mode]} · ${record.status === 'won' ? 'Victoire' : 'Défaite'} · ${record.history.length} essais · ${ext.formatTime(record.durationMs)} — ${date}`);
      details.append(summary, node('p', 'Code secret : ' + record.secret.join(' · ')));
      const rows = node('ol');
      for (const row of record.history) rows.append(node('li', `${row.guess.join(' · ')} — ${row.wellPlaced} bien placées, ${row.misplaced} mal placées`));
      details.append(rows); $('game-archive').append(details);
    }
    $('storage-message').textContent = testMode
      ? 'Mode de test : ces parties sont exclues des statistiques et de l’historique.'
      : tracker.isPersistent()
        ? 'Données conservées uniquement dans ce navigateur. Une navigation privée ou un effacement du stockage peut les supprimer.'
        : 'Sauvegarde locale indisponible : les données restent disponibles pendant cette session uniquement.';
  }
  function updateExtras(state) {
    tick(); drawRecords();
    $('assistant-panel').hidden = mode !== 'assisted';
    $('automatic-panel').hidden = mode !== 'automatic';
    $('mode-description').textContent = {
      classic:'Classique : à vous de déduire le code, sans aide.',
      assisted:'Assisté : vous jouez et pouvez demander une déduction à partir des indices.',
      automatic:'Automatique : cliquez sur « Démarrer la démonstration » ci-dessous pour lancer le joueur.'
    }[mode];
    for (const id of ['get-hint','auto-step','auto-toggle']) $(id).disabled = state.status !== 'playing';
  }
  function stopAuto() {
    autoRunning = false;
    if (autoTimer !== null && typeof window.clearTimeout === 'function') window.clearTimeout(autoTimer);
    autoTimer = null;
    $('auto-toggle').textContent = 'Démarrer la démonstration';
  }
  function autoStep() {
    autoTimer = null;
    const state = api.getState();
    if (mode !== 'automatic' || state.status !== 'playing') { stopAuto(); return; }
    try {
      const deduction = ext.suggest(state.history);
      if (!deduction.guess) { $('deduction-message').textContent = deduction.explanation; stopAuto(); return; }
      $('deduction-message').textContent = deduction.explanation + ' Proposition : ' + deduction.guess.join(' · ');
      api.submit(deduction.guess);
      if (autoRunning && api.getState().status === 'playing') autoTimer = window.setTimeout(autoStep, 1200);
    } catch {
      $('deduction-message').textContent = 'La déduction est indisponible. Vous pouvez lancer une nouvelle partie.';
      stopAuto();
    }
  }
  $('game-mode').value = mode;
  $('archive-filter').value = 'all';
  $('game-mode').addEventListener('change', () => restart($('game-mode').value));
  $('archive-filter').addEventListener('change', drawRecords);
  $('get-hint').addEventListener('click', () => {
    const state = api.getState(); if (mode !== 'assisted' || state.status !== 'playing') return;
    hint = ext.suggest(state.history);
    $('deduction-message').textContent = hint.explanation + (hint.guess ? ' Proposition : ' + hint.guess.join(' · ') : '');
    $('use-hint').disabled = !hint.guess;
  });
  $('use-hint').addEventListener('click', () => {
    if (mode !== 'assisted' || api.getState().status !== 'playing' || !hint || !hint.guess) return;
    draft = [...hint.guess]; selected = 0; updateDraft();
  });
  $('auto-step').addEventListener('click', () => { stopAuto(); autoStep(); });
  $('auto-toggle').addEventListener('click', () => {
    if (mode !== 'automatic' || api.getState().status !== 'playing') return;
    if (autoRunning) { stopAuto(); return; }
    autoRunning = true; $('auto-toggle').textContent = 'Mettre en pause'; autoStep();
  });
  $('clear-records').addEventListener('click', () => {
    if (tracker.getRecords().length && window.confirm('Effacer les statistiques et l’historique enregistrés dans ce navigateur ?')) { tracker.clear(); drawRecords(); }
  });
  if (typeof window.setInterval === 'function') window.setInterval(tick, 1000);
  $('test-banner').hidden = !testMode;
  game.subscribe(render);
  render(api.getState());
})();
