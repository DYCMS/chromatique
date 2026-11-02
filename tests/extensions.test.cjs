const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../game.js');
const ext=require('../extensions.js');
const secret=['rouge','rouge','bleu','vert'];
function memory(){let data={};return {getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;}};}
test('déduction : le secret compatible reste présent, répétitions et exemples du cours',()=>{
  const guess=['rouge','rouge','rouge','rouge'];
  const history=[{guess,...engine.evaluate(secret,guess)}];
  const pool=ext.candidates(history);
  assert.ok(pool.some(code=>JSON.stringify(code)===JSON.stringify(secret)));
  assert.ok(pool.every(code=>engine.evaluate(code,guess).wellPlaced===2&&engine.evaluate(code,guess).misplaced===0));
  assert.equal(ext.candidates([]).length,1296);
  const answer=ext.suggest([{guess:secret,wellPlaced:4,misplaced:0}]);
  assert.deepEqual(answer.guess,secret);assert.equal(answer.count,1);
});
test('déduction : même historique donne même choix ; aucun secret accepté en entrée',()=>{
  const history=[{guess:['rouge','bleu','vert','jaune'],wellPlaced:1,misplaced:2}];
  assert.deepEqual(ext.suggest(history),ext.suggest(history));
  assert.throws(()=>ext.candidates([{guess:['rose'],wellPlaced:0,misplaced:0}]));
  assert.equal(ext.suggest([{guess:secret,wellPlaced:4,misplaced:0},{guess:secret,wellPlaced:0,misplaced:0}]).guess,null);
});
test('joueur automatique : propositions compatibles et parties représentatives terminées en dix essais',()=>{
  const codes=[secret,Array(4).fill('violet'),['rouge','bleu','vert','jaune'],['orange','jaune','violet','bleu'],['bleu','vert','bleu','vert'],Array(4).fill('rouge')];
  for(const code of codes){const game=engine.createGame();game.newGame({secret:code});
    while(game.getState().status==='playing'){
      const before=game.getState(),answer=ext.suggest(before.history);
      assert.ok(ext.candidates(before.history).some(candidate=>JSON.stringify(candidate)===JSON.stringify(answer.guess)));
      assert.equal(game.submit(answer.guess).ok,true);
    }
    assert.equal(game.getState().status,'won');assert.ok(game.getState().attemptsUsed<=10);
  }
});
test('chronomètre : démarre, reste figé après la fin, repart à zéro',()=>{
  let now=1000;const tracker=ext.createTracker({now:()=>now});const game=engine.createGame();
  game.newGame({secret});tracker.observe(game.getState());now+=65000;assert.equal(ext.formatTime(tracker.elapsed()),'01:05');
  game.submit(secret);tracker.observe(game.getState());now+=5000;assert.equal(tracker.elapsed(),65000);
  game.newGame();tracker.observe(game.getState());assert.equal(tracker.elapsed(),0);
  assert.equal(ext.formatTime(3661000),'1:01:01');
});
test('statistiques distinctes, moyenne des victoires et un seul enregistrement par partie',()=>{
  const tracker=ext.createTracker();const game=engine.createGame();
  for(const mode of ext.MODES){game.newGame({secret});tracker.observe(game.getState(),mode);game.submit(secret);tracker.observe(game.getState(),mode);tracker.observe(game.getState(),mode);}
  game.newGame({secret});tracker.observe(game.getState(),'classic');for(let i=0;i<10;i++)game.submit(Array(4).fill('violet'));tracker.observe(game.getState(),'classic');
  assert.equal(tracker.getRecords().length,4);assert.deepEqual(tracker.stats().classic,{played:2,wins:1,losses:1,winRate:50,averageAttempts:1});
  assert.equal(tracker.stats().assisted.played,1);assert.equal(tracker.stats().automatic.played,1);
});
test('sauvegarde/relecture des archives et protection des copies',()=>{
  const storage=memory(),tracker=ext.createTracker({storage});const game=engine.createGame();game.newGame({secret});tracker.observe(game.getState(),'assisted');game.submit(secret);tracker.observe(game.getState(),'assisted');
  const restored=ext.createTracker({storage});assert.equal(restored.getRecords().length,1);assert.equal(restored.stats().assisted.wins,1);
  const copy=restored.getRecords();copy[0].history[0].guess[0]='violet';assert.equal(restored.getRecords()[0].history[0].guess[0],'rouge');
  restored.clear();assert.equal(ext.createTracker({storage}).getRecords().length,0);
});
test('mode test et abandons exclus, stockage bloqué non fatal',()=>{
  const storage={getItem:()=>{throw Error('bloqué');},setItem:()=>{throw Error('bloqué');}};
  const tracker=ext.createTracker({storage}),game=engine.createGame();game.newGame({secret});tracker.observe(game.getState());game.submit(['bleu','bleu','bleu','bleu']);game.newGame();tracker.observe(game.getState());assert.equal(tracker.getRecords().length,0);
  game.newGame({secret});tracker.observe(game.getState());game.submit(secret);tracker.observe(game.getState());assert.equal(tracker.getRecords().length,1);assert.equal(tracker.isPersistent(),false);
  const tests=ext.createTracker({storage:memory(),testMode:true});game.newGame({secret});tests.observe(game.getState());game.submit(secret);tests.observe(game.getState());assert.equal(tests.getRecords().length,0);
});
test('archives corrompues ignorées et limite des cent dernières parties',()=>{
  const storage=memory();storage.setItem(ext.STORAGE_KEY,'{"invalide":true}');assert.equal(ext.createTracker({storage}).getRecords().length,0);
  storage.setItem(ext.STORAGE_KEY,'[null,{"mode":"classic"}]');assert.equal(ext.createTracker({storage}).getRecords().length,0);
  const tracker=ext.createTracker({storage}),game=engine.createGame();
  for(let i=0;i<105;i++){game.newGame({secret});tracker.observe(game.getState());game.submit(secret);tracker.observe(game.getState());}
  assert.equal(tracker.getRecords().length,100);assert.equal(ext.createTracker({storage}).stats().classic.played,100);
});
