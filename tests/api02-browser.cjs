/* Contrat 0.2 dans le navigateur et dans la vraie interface, localement ou sur Pages. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const base=process.env.CHROMATIQUE_URL || pathToFileURL(path.join(__dirname,'../index.html')).href;
const testURL=new URL(base);testURL.searchParams.set('test','1');testURL.searchParams.set('verification','api02');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(testURL.href);await page.waitForFunction(()=>Boolean(window.codeSecretTest));
  assert.deepEqual(await page.evaluate(()=>codeSecretTest.getState()),{status:'not-started',attempts:0,history:[],lastGuess:null,lastResult:null,lastError:null});
  assert.equal(await page.locator('#result').isVisible(),false);assert.equal(await page.locator('#validate').isDisabled(),true);
  assert.equal(await page.evaluate(()=>codeSecretTest.version),'0.2');
  assert.deepEqual(await page.evaluate(()=>codeSecretTest.getConfig()),{apiVersion:'0.2',rulesVersion:'code-couleurs-1.0',secretLength:4,maxAttempts:10,allowDuplicates:true,colors:['rouge','bleu','vert','jaune','orange','violet']});
  let s=await page.evaluate(()=>codeSecretTest.submitGuess(null));assert.equal(s.lastError.code,'game-not-started');
  const R='rouge',B='bleu',V='vert',J='jaune',O='orange',Vi='violet';
  const cases=[[[R,B,V,J],[R,V,B,O],1,2],[[R,B,V,J],[O,Vi,R,B],0,2],[[R,B,V,J],[B,R,J,V],0,4],[[R,B,V,J],[R,B,J,V],2,2],[[R,B,V,J],[R,B,V,J],4,0],[[R,R,B,V],[R,R,R,R],2,0],[[R,R,B,V],[R,B,R,V],2,2],[[R,R,B,V],[R,R,B,V],4,0],[[R,R,B,V],[R,B,R,R],1,2]];
  for(const [secret,guess,wellPlaced,misplaced] of cases){
   await page.evaluate(secret=>codeSecretTest.startGame({secret}),secret);
   s=await page.evaluate(guess=>codeSecretTest.submitGuess(guess),guess);
   assert.deepEqual(s.lastResult,{wellPlaced,misplaced});assert.equal(s.attempts,1);assert.equal(s.status,wellPlaced===4?'won':'playing');
   assert.deepEqual(s.history,[{guess,result:{wellPlaced,misplaced}}]);assert.equal(s.lastError,null);
   assert.equal(await page.locator('.history-row').count(),1);
   assert.deepEqual(await page.locator('.feedback-number').allTextContents(),[String(wellPlaced),String(misplaced)]);
   assert.deepEqual(await page.locator('.history-row .peg').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label'))),guess);
   assert.equal(await page.locator('#history-count').textContent(),'1 / 10');
   assert.equal('secret'in s,false);assert.equal('solution'in s,false);assert.equal(await page.locator('#secret .peg').count(),0);
  }
  console.log('Navigateur API 0.2 : T01–T09, état initial, configuration et écran synchronisés.');
  // Sens interface -> API, sur la même partie que T09.
  for(const [i,value] of [R,R,R,R].entries())await page.locator('#color-'+i).selectOption(value);
  await page.locator('#validate').click();s=await page.evaluate(()=>codeSecretTest.getState());
  assert.equal(s.attempts,2);assert.deepEqual(s.lastGuess,[R,R,R,R]);assert.deepEqual(s.lastResult,{wellPlaced:2,misplaced:0});
  for(const [guess,code] of [[null,'invalid-type'],[[R,null],'invalid-type'],[[R],'invalid-length'],[[R,B,V,'Violet'],'invalid-color']]){
   const before=await page.evaluate(()=>codeSecretTest.getState());
   s=await page.evaluate(guess=>codeSecretTest.submitGuess(guess),guess);
   assert.equal(s.lastError.code,code);assert.equal(s.attempts,before.attempts);assert.deepEqual(s.history,before.history);
   assert.ok(await page.locator('#error').textContent());
  }
  const rejected=await page.evaluate(async()=>{
   const api=codeSecretTest,before=JSON.stringify(api.getState()),html=document.querySelector('main').innerHTML;
   const inputs=[[null,'invalid-options'],[[],'invalid-options'],[new Date(),'invalid-options'],[{other:1,secret:null},'invalid-options'],[{secret:undefined},'invalid-type'],[{secret:Array(4)},'invalid-type'],[{secret:['rouge']},'invalid-length'],[{secret:['rouge','bleu','vert','Violet']},'invalid-color']];
   for(const [input,code]of inputs){
    let refused=false;try{await api.startGame(input);}catch(e){refused=e instanceof Error&&e.code===code&&Boolean(e.message);}
    if(!refused||JSON.stringify(api.getState())!==before||document.querySelector('main').innerHTML!==html)return false;
   }
   const sparse=await api.submitGuess(Array(4));return sparse.lastError.code==='invalid-type';
  });assert.equal(rejected,true);
  await page.evaluate(()=>codeSecretTest.startGame({secret:Array(4).fill('rouge')}));
  for(let i=0;i<9;i++)await page.evaluate(()=>codeSecretTest.submitGuess(Array(4).fill('bleu')));
  s=await page.evaluate(()=>codeSecretTest.submitGuess(['rouge']));assert.equal(s.attempts,9);assert.equal(s.lastError.code,'invalid-length');
  s=await page.evaluate(()=>codeSecretTest.submitGuess(Array(4).fill('rouge')));assert.equal(s.status,'won');assert.equal(s.attempts,10);
  assert.equal(await page.locator('#result-title').textContent(),'Victoire !');assert.equal(await page.locator('#validate').isDisabled(),true);
  s=await page.evaluate(()=>codeSecretTest.submitGuess(null));assert.equal(s.lastError.code,'game-finished');assert.equal(s.history.length,10);
  // Le redémarrage visible remet aussi à zéro l’API et son erreur.
  await page.locator('#result-new-game').click();s=await page.evaluate(()=>codeSecretTest.getState());
  assert.equal(s.status,'playing');assert.equal(s.attempts,0);assert.equal(s.lastError,null);assert.equal(await page.locator('.history-row').count(),0);
  await page.evaluate(()=>codeSecretTest.startGame({secret:Array(4).fill('rouge')}));
  for(let i=0;i<10;i++)s=await page.evaluate(()=>codeSecretTest.submitGuess(Array(4).fill('bleu')));
  assert.equal(s.status,'lost');assert.equal(s.attempts,10);assert.deepEqual(s.lastResult,{wellPlaced:0,misplaced:0});
  assert.equal(await page.locator('#result-title').textContent(),'Partie perdue');assert.equal(await page.locator('#secret .peg').count(),0);
  assert.equal(await page.locator('#secret').textContent(),'????');
  const after=await page.evaluate(()=>codeSecretTest.submitGuess([]));assert.equal(after.lastError.code,'game-finished');assert.deepEqual(after.history,s.history);
  console.log('Navigateur API 0.2 : priorités, démarrages invalides sans mutation, victoire au dixième, défaite et redémarrage réussis.');
  const copies=await page.evaluate(async()=>{
   const api=codeSecretTest,secret=['rouge','rouge','bleu','vert'];await api.startGame({secret});secret.fill('violet');
   const guess=['rouge','bleu','rouge','vert'];const state=await api.submitGuess(guess);guess.fill('violet');
   state.lastGuess.fill('violet');state.lastResult.wellPlaced=4;state.history[0].guess.fill('violet');state.history[0].result.misplaced=0;
   const config=api.getConfig();config.colors.length=0;
   return api.getState().lastResult.wellPlaced===2&&api.getState().lastResult.misplaced===2&&api.getState().lastGuess[0]==='rouge'&&api.getConfig().colors.length===6;
  });assert.equal(copies,true);
  await page.reload();await page.waitForFunction(()=>Boolean(window.codeSecretTest));assert.equal(await page.evaluate(()=>codeSecretTest.getState().status),'not-started');
  const normalURL=new URL(base);normalURL.searchParams.delete('test');await page.goto(normalURL.href);await page.waitForFunction(()=>Boolean(window.codeSecret));
  assert.equal(await page.evaluate(()=>typeof window.codeSecretTest),'undefined');assert.equal(await page.locator('#validate').isDisabled(),false);
  assert.deepEqual(errors,[]);
  console.log('Navigateur API 0.2 : copies indépendantes, nouveau contexte sans secret conservé et absence hors test=1 réussis.');
  console.log('URL vérifiée : '+base);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
