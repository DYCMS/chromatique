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
      if (game.getState().status !== 'playing') return;
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
    slots.forEach((slot, i) => {
      slot.container.classList.toggle('active', !ended && i === selected);
      applyColor(slot.button, draft[i]);
      slot.button.setAttribute('aria-label', `Sélectionner la case ${i + 1} : ${draft[i] || 'vide'}`);
      slot.button.setAttribute('aria-pressed', String(i === selected && !ended));
      slot.select.value = draft[i];
      slot.select.disabled = ended; slot.button.disabled = ended;
    });
    $('palette-fieldset').disabled = ended;
    $('validate').disabled = ended;
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
      feedback.append(good, other); li.append(group, feedback); $('history').append(li);
    });
    $('empty-history').hidden = state.attemptsUsed !== 0;
    $('history-count').textContent = `${state.attemptsUsed} / 10`;
  }
  function render(state) {
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
    else if (state.attemptsUsed === 0) $('status').textContent = 'Choisissez vos quatre couleurs.';
    else {
      const last = state.history[state.history.length - 1];
      $('status').textContent = `Essai ${last.attempt} : ${last.wellPlaced} bien placées, ${last.misplaced} mal placées. ${state.attemptsRemaining} essai${state.attemptsRemaining > 1 ? 's' : ''} restant${state.attemptsRemaining > 1 ? 's' : ''}.`;
    }
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
  }
  $('proposal').addEventListener('submit', event => {
    event.preventDefault();
    const result = api.submit([...draft]);
    if (!result.ok) $('error').textContent = result.error;
  });
  function restart() { api.newGame(); slots[0].button.focus(); }
  $('new-game').addEventListener('click', restart);
  $('result-new-game').addEventListener('click', restart);
  $('test-banner').hidden = !testMode;
  game.subscribe(render);
  render(api.getState());
})();
