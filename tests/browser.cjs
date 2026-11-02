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
    assert.deepEqual(await page.locator('.feedback span').allTextContents(),['1','2']);
    await page.evaluate(()=>{
      codeSecret.newGame({secret:['rouge','bleu','vert','jaune']});
      for(let i=0;i<9;i++)codeSecret.submit(['violet','violet','violet','violet']);
      codeSecret.submit(['rouge','bleu','vert','jaune']);
    });
    assert.match(await page.locator('#status').textContent(),/gagné en 10 essais/);
    assert.equal(await page.locator('#validate').isDisabled(),true);
    assert.equal(await page.locator('#secret .peg').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(199, 60, 64)');
    assert.deepEqual(await page.locator('#secret .peg').evaluateAll(els=>els.map(el=>el.textContent)),['R','B','V','J']);
    await page.locator('#new-game').click();
    assert.equal(await page.locator('.history-row').count(),0);
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
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('Navigateur : interface, API partagée, clavier, CSS du secret et émulation tactile réussis.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
