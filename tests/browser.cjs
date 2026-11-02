/* Vérification facultative avec un vrai Chromium.
   Prérequis : npm install --no-save --package-lock=false playwright
               npx playwright install chromium
   Exécuter : node tests/browser.cjs
   Aucun de ces outils n'est chargé par le jeu publié. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();
    const errors=[];const external=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href+'?test=1');
    await page.waitForFunction(()=>Boolean(window.codeSecret));
    await page.evaluate(()=>codeSecret.newGame({secret:['rouge','bleu','vert','jaune']}));
    await page.locator('#validate').click();
    assert.match(await page.locator('#error').textContent(),/quatre couleurs/);
    assert.equal(await page.evaluate(()=>codeSecret.getState().attemptsUsed),0);
    for(const color of ['Rouge','Vert','Bleu','Orange'])await page.getByRole('button',{name:'Choisir '+color,exact:true}).click();
    await page.locator('#validate').click();
    assert.equal(await page.locator('.history-row').count(),1);
    assert.deepEqual(await page.locator('.feedback-number').allTextContents(),['1','2']);
    assert.deepEqual(await page.locator('.feedback-item small').allTextContents(),['Bien placées','Mal placées']);
    assert.equal(await page.locator('#palette-prompt').textContent(),'Choisissez la couleur de la case 1');
    page.once('dialog',dialog=>dialog.dismiss());
    await page.locator('#new-game').click();
    assert.equal(await page.locator('.history-row').count(),1);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#new-game').click();
    assert.equal(await page.locator('.history-row').count(),0);
    await page.evaluate(()=>{
      codeSecret.newGame({secret:['rouge','bleu','vert','jaune']});
      for(let i=0;i<9;i++)codeSecret.submit(['violet','violet','violet','violet']);
      codeSecret.submit(['rouge','bleu','vert','jaune']);
    });
    assert.match(await page.locator('#status').textContent(),/gagné en 10 essais/);
    assert.equal(await page.locator('#result').isVisible(),true);
    assert.equal(await page.locator('#result-title').textContent(),'Victoire !');
    assert.equal(await page.locator('#secret-title').textContent(),'Code trouvé !');
    assert.equal(await page.locator('#validate').isDisabled(),true);
    assert.equal(await page.locator('#secret .peg').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(199, 60, 64)');
    assert.deepEqual(await page.locator('#secret .peg').evaluateAll(els=>els.map(el=>el.textContent)),['R','B','V','J']);
    await page.locator('#new-game').click();
    assert.equal(await page.locator('.history-row').count(),0);
    assert.equal(await page.locator('#result').isVisible(),false);
    // Parcours clavier : focus rendu à la première case puis Tab vers sa liste.
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'color-0');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#color-0').inputValue(),'rouge');
    const touchPage=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
    await touchPage.goto(pathToFileURL(path.join(__dirname,'../index.html')).href+'?test=1');
    await touchPage.waitForFunction(()=>Boolean(window.codeSecret));
    await touchPage.getByRole('button',{name:'Choisir Rouge',exact:true}).tap();
    assert.equal(await touchPage.locator('#color-0').inputValue(),'rouge');
    assert.ok(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await touchPage.evaluate(()=>{
      codeSecret.newGame({secret:['rouge','bleu','vert','jaune']});
      for(let i=0;i<10;i++)codeSecret.submit(['violet','violet','violet','violet']);
    });
    assert.ok(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.equal(await touchPage.locator('.history-row').count(),10);
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href+'?test=1');
    await page.waitForFunction(()=>Boolean(window.codeSecret));
    await page.locator('#game-mode').selectOption('assisted');
    assert.equal(await page.locator('#assistant-panel').isVisible(),true);
    await page.locator('#get-hint').click();
    await page.locator('#use-hint').click();
    assert.equal(await page.locator('#color-0').inputValue(),'rouge');
    assert.equal(await page.locator('#color-2').inputValue(),'bleu');
    assert.equal(await page.evaluate(()=>codeSecret.getState().attemptsUsed),0);
    await page.locator('#game-mode').selectOption('automatic');
    assert.equal(await page.locator('#auto-toggle').evaluate(el=>document.activeElement===el),true);
    assert.ok(await page.locator('#automatic-panel').evaluate(el=>el.getBoundingClientRect().bottom <= document.querySelector('.game-layout').getBoundingClientRect().top));
    await page.evaluate(()=>codeSecret.newGame({secret:['violet','orange','vert','jaune']}));
    assert.equal(await page.locator('#validate').isDisabled(),true);
    await page.locator('#auto-step').click();
    assert.equal(await page.evaluate(()=>codeSecret.getState().attemptsUsed),1);
    await page.waitForTimeout(1400);
    assert.equal(await page.evaluate(()=>codeSecret.getState().attemptsUsed),1);
    await page.locator('#auto-toggle').click();
    await page.locator('#auto-toggle').click();
    const pausedCount=await page.evaluate(()=>codeSecret.getState().attemptsUsed);
    await page.waitForTimeout(1400);
    assert.equal(await page.evaluate(()=>codeSecret.getState().attemptsUsed),pausedCount);
    await page.locator('#auto-toggle').click();
    await page.waitForFunction(()=>codeSecret.getState().status!=='playing',{},{timeout:25000});
    assert.equal(await page.evaluate(()=>codeSecret.getState().status),'won');
    assert.equal(await page.locator('#game-archive details').count(),0);
    assert.equal(await page.locator('#stats-grid article').count(),3);
    await page.locator('#result-new-game').click();
    assert.equal(await page.locator('.history-row').count(),0);
    const initialTime=await page.locator('#elapsed').textContent();
    assert.equal(initialTime,'00:00');
    await touchPage.locator('#new-game').tap();
    await touchPage.locator('#game-mode').selectOption('assisted');
    await touchPage.locator('#get-hint').tap();
    assert.ok(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await touchPage.locator('#game-mode').selectOption('automatic');
    assert.ok(await touchPage.locator('#automatic-panel').evaluate(el=>el.getBoundingClientRect().bottom <= document.querySelector('.game-layout').getBoundingClientRect().top));
    await touchPage.locator('#auto-step').tap();
    assert.equal(await touchPage.evaluate(()=>codeSecret.getState().attemptsUsed),1);
    assert.ok(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('Navigateur : interface, API partagée, clavier, CSS du secret et émulation tactile réussis.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
