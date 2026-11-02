const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PALETTE, evaluate, createGame, bindApi } = require('../game.js');
const secret = ['rouge', 'bleu', 'vert', 'jaune'];
const wrong = ['violet', 'violet', 'violet', 'violet'];
function setup(code = secret) {
  const game = createGame();
  const api = bindApi(game, { testMode:true });
  api.newGame({ secret:code });
  return { game, api };
}
test('palette exacte, quatre couleurs cachées, dix essais, historique vide', () => {
  const { api } = setup();
  assert.deepEqual(PALETTE, ['rouge','bleu','vert','jaune','orange','violet']);
  const state = api.getState();
  assert.equal(state.status,'playing'); assert.equal(state.secret,null);
  assert.equal(state.attemptsRemaining,10); assert.deepEqual(state.history,[]);
});
test('exemple 1 du cours : une bien placée et deux mal placées', () => {
  assert.deepEqual(evaluate(secret,['rouge','vert','bleu','orange']), {wellPlaced:1,misplaced:2});
});
test('répétitions : les rouges supplémentaires ne comptent pas', () => {
  assert.deepEqual(evaluate(['rouge','rouge','bleu','vert'],Array(4).fill('rouge')), {wellPlaced:2,misplaced:0});
  assert.deepEqual(evaluate(['rouge','rouge','bleu','vert'],['rouge','bleu','rouge','vert']), {wellPlaced:2,misplaced:2});
  assert.deepEqual(evaluate(['rouge','rouge','bleu','vert'],['bleu','vert','rouge','rouge']), {wellPlaced:0,misplaced:4});
});
test('propositions invalides : explication et état strictement inchangé', () => {
  const { api } = setup(); const initial = api.getState();
  for (const guess of [[],['rouge'],['rouge','bleu','vert','rose'],Array(4),null,'rouge',{},[...secret,'violet'],['Rouge','bleu','vert','jaune']]) {
    const result = api.submit(guess);
    assert.equal(result.ok,false); assert.ok(result.error.length > 0);
    assert.deepEqual(api.getState(),initial);
  }
});
test('chaque proposition valide est comptée et conservée dans son ordre', () => {
  const { api } = setup();
  const guess = ['rouge','vert','bleu','orange'];
  api.submit(guess); guess[0] = 'violet'; api.submit(wrong);
  const state=api.getState();
  assert.equal(state.attemptsUsed,2); assert.equal(state.attemptsRemaining,8);
  assert.deepEqual(state.history[0],{attempt:1,guess:['rouge','vert','bleu','orange'],wellPlaced:1,misplaced:2});
});
test('victoire au dixième essai prioritaire sur la défaite', () => {
  const { api }=setup(); for(let i=0;i<9;i++) assert.equal(api.submit(wrong).state.status,'playing');
  const result=api.submit(secret);
  assert.equal(result.ok,true); assert.equal(result.state.status,'won');
  assert.equal(result.state.attemptsUsed,10); assert.deepEqual(result.state.secret,secret);
});
test('dix essais incorrects donnent une défaite et révèlent le code', () => {
  const {api}=setup(); for(let i=0;i<10;i++) api.submit(wrong);
  const state=api.getState(); assert.equal(state.status,'lost');
  assert.equal(state.attemptsRemaining,0); assert.deepEqual(state.secret,secret);
});
test('après victoire ou défaite, les propositions ne changent plus rien', () => {
  for(const win of [true,false]) {
    const {api}=setup(); if(win) api.submit(secret); else for(let i=0;i<10;i++) api.submit(wrong);
    const before=api.getState(); assert.equal(api.submit(secret).ok,false); assert.deepEqual(api.getState(),before);
  }
});
test('nouvelle partie : état, historique et indices remis à zéro ; nouveau tirage', () => {
  let draws=0; const game=createGame({random:()=>((draws++ % 6)+.1)/6});
  const api=bindApi(game,{testMode:true}); api.newGame({secret}); api.submit(secret);
  const before=draws; api.newGame(); assert.equal(draws,before+4);
  const state=api.getState(); assert.equal(state.status,'playing'); assert.equal(state.attemptsUsed,0);
  assert.equal(state.secret,null); assert.deepEqual(state.history,[]);
});
test('le tirage autorise les répétitions et les six couleurs', () => {
  for(let i=0;i<6;i++) {
    const game=createGame({random:()=>(i+.1)/6});
    assert.equal(game.submit(Array(4).fill(PALETTE[i])).state.status,'won');
  }
});
test('les copies publiques ne permettent pas de modifier la partie', () => {
  const {api}=setup(); api.submit(wrong); const state=api.getState();
  state.history[0].guess[0]='rouge'; state.history.length=0; state.palette.length=0;
  assert.equal(api.getState().history.length,1); assert.deepEqual(api.getState().history[0].guess,wrong);
  assert.equal(api.getState().palette.length,6);
});
test('API et interface : même moteur, notifications et état partagés', () => {
  const {game,api}=setup(); const seen=[];
  game.subscribe(state=>seen.push(state)); api.submit(wrong);
  assert.equal(seen.length,1); assert.deepEqual(seen[0],api.getState());
  api.newGame(); assert.equal(seen.length,2); assert.equal(seen[1].attemptsUsed,0);
});
test('secret imposé : réservé au mode test et validation sans destruction', () => {
  const {game,api}=setup(); api.submit(wrong); const before=api.getState();
  assert.equal(bindApi(game).newGame({secret}).ok,false); assert.deepEqual(api.getState(),before);
  assert.equal(api.newGame({secret:['rose']}).ok,false); assert.deepEqual(api.getState(),before);
});
test('indices : comparaison exhaustive des 6⁴ propositions à un comptage indépendant', () => {
  const secrets=[secret,['rouge','rouge','bleu','vert'],Array(4).fill('rouge'),['rouge','bleu','rouge','bleu']];
  for(const code of secrets) for(const a of PALETTE) for(const b of PALETTE) for(const c of PALETTE) for(const d of PALETTE) {
    const guess=[a,b,c,d];
    const exact=guess.filter((color,i)=>color===code[i]).length;
    const total=PALETTE.reduce((sum,color)=>sum+Math.min(code.filter(x=>x===color).length,guess.filter(x=>x===color).length),0);
    assert.deepEqual(evaluate(code,guess),{wellPlaced:exact,misplaced:total-exact});
  }
});
