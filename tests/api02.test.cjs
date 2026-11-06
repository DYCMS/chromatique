const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createGame,createTestApi,PALETTE}=require('../game.js');
const R='rouge',B='bleu',V='vert',J='jaune',O='orange',Vi='violet';
const initial={status:'not-started',attempts:0,history:[],lastGuess:null,lastResult:null,lastError:null};
const fresh=()=>{const game=createGame({autoStart:false,revealSecret:false});return {game,api:createTestApi(game)};};
const core=s=>{const {lastError,...rest}=s;return rest;};
test('0.2 configuration exacte, lectures synchrones, not-started et refus prioritaire',async()=>{
 const {api}=fresh();assert.equal(api.version,'0.2');assert.deepEqual(api.getState(),initial);
 assert.deepEqual(api.getConfig(),{apiVersion:'0.2',rulesVersion:'code-couleurs-1.0',secretLength:4,maxAttempts:10,allowDuplicates:true,colors:[R,B,V,J,O,Vi]});
 const promise=api.submitGuess(null);assert.equal(typeof promise.then,'function');
 const state=await promise;assert.equal(state.lastError.code,'game-not-started');assert.deepEqual(core(state),core(initial));
 assert.deepEqual(api.getState(),state);assert.ok(state.lastError.message.length);
});
const cases=[
 ['T01',[R,B,V,J],[R,V,B,O],1,2],['T02',[R,B,V,J],[O,Vi,R,B],0,2],
 ['T03',[R,B,V,J],[B,R,J,V],0,4],['T04',[R,B,V,J],[R,B,J,V],2,2],
 ['T05',[R,B,V,J],[R,B,V,J],4,0],['T06',[R,R,B,V],[R,R,R,R],2,0],
 ['T07',[R,R,B,V],[R,B,R,V],2,2],['T08',[R,R,B,V],[R,R,B,V],4,0],
 ['T09',[R,R,B,V],[R,B,R,R],1,2]
];
for(const [id,secret,guess,wellPlaced,misplaced]of cases)test(`0.2 ${id} indices, historique et statut du contrat`,async()=>{
 const {api}=fresh();const started=api.startGame({secret});assert.equal(typeof started.then,'function');
 assert.deepEqual(await started,{...initial,status:'playing'});
 const state=await api.submitGuess(guess),result={wellPlaced,misplaced};
 assert.deepEqual(state,{status:wellPlaced===4?'won':'playing',attempts:1,history:[{guess,result}],lastGuess:guess,lastResult:result,lastError:null});
 assert.equal('secret'in state,false);assert.equal('solution'in state,false);
});
test('0.2 priorités type dense puis longueur puis couleur et refus sans consommer',async()=>{
 const {api}=fresh();await api.startGame();
 const sparse=Array(4);sparse[0]=R;
 for(const [guess,code]of [[null,'invalid-type'],[{},'invalid-type'],['rouge','invalid-type'],[sparse,'invalid-type'],[[R,null],'invalid-type'],[[R],'invalid-length'],[[R,B,V,J,Vi],'invalid-length'],[[R,B,V,'Violet'],'invalid-color'],[[R,B,V,'violet '],'invalid-color'],[[R,B,V,'purple'],'invalid-color']]){
  const before=api.getState(),state=await api.submitGuess(guess);
  assert.equal(state.lastError.code,code);assert.ok(state.lastError.message.length);assert.deepEqual(core(state),core(before));
 }
 assert.equal((await api.submitGuess([R,R,R,R])).lastError,null);
});
test('0.2 options invalides et secret présent undefined rejettent sans changer même lastError',async()=>{
 const {api}=fresh();await api.startGame({secret:[R,R,B,V]});await api.submitGuess([R]);
 const before=api.getState();
 const custom=Object.create({secret:[R,R,R,R]});
 for(const [options,code]of [[null,'invalid-options'],[[],'invalid-options'],[42,'invalid-options'],[new Date(),'invalid-options'],[custom,'invalid-options'],[{other:1,secret:null},'invalid-options'],[{secret:undefined},'invalid-type'],[{secret:null},'invalid-type'],[{secret:Array(4)},'invalid-type'],[{secret:[R,null]},'invalid-type'],[{secret:[R]},'invalid-length'],[{secret:[R,R,R,'Violet']},'invalid-color']]){
  await assert.rejects(api.startGame(options),error=>error instanceof Error&&error.code===code&&Boolean(error.message));
  assert.deepEqual(api.getState(),before);
 }
 for(const options of [undefined,{}])assert.deepEqual(await api.startGame(options),{...initial,status:'playing'});
});
test('0.2 victoire au dixième, refus au neuvième et refus prioritaires après victoire',async()=>{
 const {api}=fresh();await api.startGame({secret:[R,R,R,R]});
 for(let i=0;i<9;i++)await api.submitGuess([B,B,B,B]);
 assert.equal((await api.submitGuess([R])).lastError.code,'invalid-length');assert.equal(api.getState().attempts,9);
 const won=await api.submitGuess([R,R,R,R]);assert.equal(won.status,'won');assert.equal(won.attempts,10);assert.equal(won.lastError,null);
 const after=await api.submitGuess(null);assert.equal(after.lastError.code,'game-finished');assert.deepEqual(core(after),core(won));
 assert.deepEqual(await api.startGame(),{...initial,status:'playing'});
});
test('0.2 défaite au dixième, refus et redémarrage depuis lost',async()=>{
 const {api}=fresh();await api.startGame({secret:[R,R,R,R]});
 for(let i=0;i<10;i++)await api.submitGuess([B,B,B,B]);
 const lost=api.getState();assert.equal(lost.status,'lost');assert.equal(lost.attempts,10);assert.deepEqual(lost.lastResult,{wellPlaced:0,misplaced:0});
 assert.equal((await api.submitGuess([R])).lastError.code,'game-finished');assert.deepEqual(core(api.getState()),core(lost));
 assert.equal('secret'in lost,false);assert.deepEqual(await api.startGame({}),{...initial,status:'playing'});
});
test('0.2 tableaux fournis et tous les résultats sont indépendants de la partie',async()=>{
 const {api}=fresh(),secret=[R,R,B,V];await api.startGame({secret});secret.fill(Vi);
 const guess=[R,B,R,V];let result=await api.submitGuess(guess);guess.fill(Vi);
 result.history[0].guess.fill(Vi);result.history[0].result.wellPlaced=4;result.lastGuess.fill(Vi);result.lastResult.misplaced=0;result.history=[];
 assert.deepEqual(api.getState().lastGuess,[R,B,R,V]);assert.deepEqual(api.getState().lastResult,{wellPlaced:2,misplaced:2});
 const config=api.getConfig();config.colors.length=0;assert.deepEqual(api.getConfig().colors,PALETTE);
 await api.submitGuess([R]);const state=api.getState();state.lastError.code='changed';assert.equal(api.getState().lastError.code,'invalid-length');
 assert.doesNotThrow(()=>JSON.stringify(api.getState()));
});
test('0.2 aucune révélation interne en mode test et lectures sans notification',async()=>{
 const {game,api}=fresh();let notifications=0;game.subscribe(()=>notifications++);
 await api.startGame({secret:[R,R,R,R]});await api.submitGuess([R,R,R,R]);
 const count=notifications;api.getState();api.getConfig();assert.equal(notifications,count);assert.equal(game.getState().secret,null);
});
