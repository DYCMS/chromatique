// Exécute app.js avec un DOM simulé. Cela ne vérifie ni le rendu CSS ni un vrai appareil.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../game.js');
const extensions=require('../extensions.js');
class Element {
  constructor(tag='div') {
    this.tagName=tag.toUpperCase(); this.children=[]; this.attributes={}; this.listeners={};
    this.className=''; this.value=''; this.disabled=false; this.hidden=false;
    this._text=''; this.focused=false;
    const properties={};
    this.style={setProperty:(k,v)=>properties[k]=v,removeProperty:k=>delete properties[k],getPropertyValue:k=>properties[k]};
    this.classList={toggle:(token,force)=>{
      const classes=new Set(this.className.split(/\s+/).filter(Boolean));
      const add=force===undefined?!classes.has(token):force;
      if(add)classes.add(token);else classes.delete(token);this.className=[...classes].join(' ');
    }};
  }
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  append(...items){for(const item of items)this.children.push(typeof item==='object'?item:Object.assign(new Element('#text'),{textContent:item}));}
  replaceChildren(...items){this._text='';this.children=[];this.append(...items);}
  setAttribute(k,v){this.attributes[k]=String(v);}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  dispatch(type){for(const fn of this.listeners[type]||[])fn({preventDefault(){},target:this});}
  click(){if(!this.disabled)this.dispatch('click');}
  focus(){this.focused=true;this.dispatch('focus');}
}
function setup(testMode=true, { confirmAnswer=true, storage=null }={}){
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const elements={}; for(const match of html.matchAll(/<([a-z0-9-]+)[^>]*\bid="([^"]+)"/gi))elements[match[2]]=new Element(match[1]);
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})};
  const confirmations=[];
  const pending=new Map();let nextTimer=1;
  const window={localStorage:storage,confirm:message=>{confirmations.push(message);return confirmAnswer;},setTimeout:fn=>{const id=nextTimer++;pending.set(id,fn);return id;},clearTimeout:id=>pending.delete(id)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),{document,window,CodeSecretEngine:engine,CodeSecretExtensions:extensions,URLSearchParams,location:{search:testMode?'?test=1':''}});
  const api=window.codeSecret;
  const fill=guess=>guess.forEach((value,i)=>{const select=elements.slots.children[i].children[2];select.value=value;select.dispatch('change');});
  const submit=()=>elements.proposal.dispatch('submit');
  return {elements,api,fill,submit,confirmations,pending,runTimer(){const entry=pending.entries().next().value;if(entry){pending.delete(entry[0]);entry[1]();}}};
}
const secret=['rouge','bleu','vert','jaune'];
const wrong=Array(4).fill('violet');
test('interface : quatre cases vides, six choix, historique vide et secret caché',()=>{
  const {elements:e,api}=setup();
  assert.equal(e.slots.children.length,4);assert.equal(e.palette.children.length,6);
  assert.equal(e.secret.textContent,'????');assert.equal(e.history.children.length,0);
  assert.equal(api.getState().attemptsUsed,0);assert.equal(e['test-banner'].hidden,false);
  assert.equal(e.result.hidden,true);
});
test('interface : proposition incomplète refusée avec message sans consommer un essai',()=>{
  const {elements:e,api,submit}=setup();submit();
  assert.match(e.error.textContent,/quatre couleurs/);assert.equal(api.getState().attemptsUsed,0);
  assert.equal(e.history.children.length,0);
});
test('interface : choix par palette, modification et validation alimentent l’historique',()=>{
  const {elements:e,api,submit}=setup();api.newGame({secret});
  for(const i of [0,1,2,3])e.palette.children[i].click();
  // Remplacer la quatrième case avant de valider : jaune devient orange.
  e.palette.children[4].click();submit();
  assert.deepEqual(api.getState().history[0].guess,['rouge','bleu','vert','orange']);
  assert.equal(e.history.children.length,1);
  assert.match(e.history.children[0].attributes['aria-label'],/3 bien placées et 0 mal placées/);
  assert.equal(e.slots.children[0].children[2].value,'');
});
test('interface : les propositions de l’API mettent à jour les mêmes indices visibles',()=>{
  const {elements:e,api}=setup();api.newGame({secret});api.submit(['rouge','vert','bleu','orange']);
  assert.equal(e.history.children.length,1);
  assert.match(e.history.children[0].attributes['aria-label'],/1 bien placées et 2 mal placées/);
  assert.match(e.status.textContent,/9 essais restants/);
});
test('interface : victoire au dixième, résultat, secret révélé et commandes bloquées',()=>{
  const {elements:e,api,fill,submit}=setup();api.newGame({secret});
  for(let i=0;i<9;i++){fill(wrong);submit();}fill(secret);submit();
  assert.match(e.status.textContent,/gagné en 10 essais/);assert.equal(e.history.children.length,10);
  assert.equal(e.result.hidden,false); assert.equal(e['result-title'].textContent,'Victoire !');
  assert.match(e['result-message'].textContent,/trouvé le code en 10 essais/); assert.equal(e.result.focused,true);
  assert.equal(e.validate.disabled,true);assert.equal(e['palette-fieldset'].disabled,true);
  assert.ok(e.slots.children.every(s=>s.children[1].disabled&&s.children[2].disabled));
  assert.equal(e.secret.children[0].style.getPropertyValue('--color'),'#c73c40');
  assert.equal(e.secret.attributes['aria-label'],'Code secret : rouge, bleu, vert, jaune');
  const before=api.getState();submit();e.palette.children[0].click();assert.deepEqual(api.getState(),before);
  e['result-new-game'].click(); assert.equal(e.result.hidden,true); assert.equal(e['result-title'].textContent,'');
  assert.equal(e['result-message'].textContent,''); assert.equal(api.getState().attemptsUsed,0);
});
test('interface : défaite après dix propositions puis nouvelle partie complète',()=>{
  const {elements:e,api,fill,submit}=setup();api.newGame({secret});
  for(let i=0;i<10;i++){fill(wrong);submit();}
  assert.match(e.status.textContent,/dix essais sont écoulés/);assert.equal(api.getState().status,'lost');
  assert.equal(e.result.hidden,false); assert.equal(e['result-title'].textContent,'Partie perdue');
  assert.match(e['result-message'].textContent,/10 essais/);
  e['new-game'].click();assert.equal(api.getState().status,'playing');
  assert.equal(e.secret.textContent,'????');assert.equal(e.history.children.length,0);
  assert.equal(e.validate.disabled,false);assert.equal(e.error.textContent,'');
  assert.equal(e.result.hidden,true); assert.equal(e['result-title'].textContent,'');
  assert.ok(e.slots.children.every(s=>s.children[2].value===''));
  assert.equal(e.slots.children[0].children[1].focused,true);
});
test('interface : mode normal sans bandeau et sans secret imposé',()=>{
  const {elements:e,api}=setup(false);assert.equal(e['test-banner'].hidden,true);
  assert.equal(api.newGame({secret}).ok,false);assert.equal(api.getState().secret,null);
});

test('interface : consigne de case dynamique et libellés des deux indices visibles',()=>{
  const {elements:e,api,fill,submit}=setup();api.newGame({secret});
  assert.equal(e['palette-prompt'].textContent,'Choisissez la couleur de la case 1');
  e.palette.children[0].click();
  assert.equal(e['palette-prompt'].textContent,'Choisissez la couleur de la case 2');
  e.slots.children[3].children[1].click();
  assert.equal(e['palette-prompt'].textContent,'Choisissez la couleur de la case 4');
  e.slots.children[1].children[2].focus();
  assert.equal(e['palette-prompt'].textContent,'Choisissez la couleur de la case 2');
  fill(['rouge','vert','bleu','orange']);submit();
  const feedback=e.history.children[0].children[1];
  assert.equal(feedback.children[0].children[0].textContent,'1');
  assert.equal(feedback.children[0].children[1].textContent,'Bien placées');
  assert.equal(feedback.children[1].children[0].textContent,'2');
  assert.equal(feedback.children[1].children[1].textContent,'Mal placées');
  assert.equal(e['palette-prompt'].textContent,'Choisissez la couleur de la case 1');
});
test('interface : titre adapté à la victoire, à la défaite et au redémarrage',()=>{
  const {elements:e,api,confirmations}=setup();
  assert.equal(e['secret-title'].textContent,'Le code à découvrir');
  api.newGame({secret});api.submit(secret);
  assert.equal(e['secret-title'].textContent,'Code trouvé !');
  e['result-new-game'].click();
  assert.equal(e['secret-title'].textContent,'Le code à découvrir');
  api.newGame({secret});for(let i=0;i<10;i++)api.submit(wrong);
  assert.equal(e['secret-title'].textContent,'Le code secret était…');
  assert.match(e['palette-prompt'].textContent,/Partie terminée/);
  e['new-game'].click();
  assert.equal(e['secret-title'].textContent,'Le code à découvrir');
  assert.equal(confirmations.length,0);
});
test('interface : annuler un abandon conserve état, saisie, indices et sélection',()=>{
  const {elements:e,api,fill,submit,confirmations}=setup(true,{confirmAnswer:false});
  api.newGame({secret});fill(wrong);submit();fill(['rouge','bleu','','']);
  e.slots.children[2].children[1].click();
  const before=api.getState(),history=e.history.textContent,prompt=e['palette-prompt'].textContent;
  e['new-game'].click();
  assert.deepEqual(api.getState(),before);
  assert.equal(e.history.textContent,history);
  assert.equal(e.slots.children[0].children[2].value,'rouge');
  assert.equal(e.slots.children[1].children[2].value,'bleu');
  assert.equal(e['palette-prompt'].textContent,prompt);
  assert.deepEqual(confirmations,['Abandonner cette partie et recommencer ?']);
});
test('interface : confirmer abandonne la partie ; avant le premier essai aucun dialogue',()=>{
  const {elements:e,api,fill,submit,confirmations}=setup();
  fill(['rouge','','','']);e['new-game'].click();
  assert.equal(confirmations.length,0);
  api.newGame({secret});fill(wrong);submit();e['new-game'].click();
  assert.equal(confirmations.length,1);
  assert.equal(api.getState().attemptsUsed,0);
  assert.equal(e.history.children.length,0);
  assert.equal(e.secret.textContent,'????');
  assert.equal(e['palette-prompt'].textContent,'Choisissez la couleur de la case 1');
  assert.ok(e.slots.children.every(slot=>slot.children[2].value===''));
});

function chooseMode(e,mode){e['game-mode'].value=mode;e['game-mode'].dispatch('change');}
test('extensions visibles : classique sans aide ; assistance activable sans consommer un essai',()=>{
  const {elements:e,api,submit}=setup();
  assert.equal(e['assistant-panel'].hidden,true);assert.equal(e['automatic-panel'].hidden,true);
  chooseMode(e,'assisted');assert.equal(e['assistant-panel'].hidden,false);
  e['get-hint'].click();assert.match(e['deduction-message'].textContent,/Premier essai/);
  assert.equal(api.getState().attemptsUsed,0);e['use-hint'].click();submit();
  assert.deepEqual(api.getState().history[0].guess,['rouge','rouge','bleu','bleu']);
  assert.equal(e['use-hint'].disabled,true);
});
test('automatique : coup unique, pause, redémarrage et API arrêtent les actions programmées',()=>{
  const {elements:e,api,pending,runTimer}=setup();
  chooseMode(e,'automatic');assert.equal(e['automatic-panel'].hidden,false);assert.equal(e.validate.disabled,true);
  api.newGame({secret});e['auto-step'].click();assert.equal(api.getState().attemptsUsed,1);
  e['auto-toggle'].click();assert.equal(pending.size,1);
  e['auto-toggle'].click();assert.equal(pending.size,0);
  const count=api.getState().attemptsUsed;runTimer();assert.equal(api.getState().attemptsUsed,count);
  e['auto-toggle'].click();api.newGame({secret});assert.equal(pending.size,0);
  e['auto-toggle'].click();
  for(let i=0;i<10&&pending.size;i++)runTimer();
  assert.equal(api.getState().status,'won');assert.equal(pending.size,0);
});
test('changer de mode : annulation conserve mode et partie ; parties de test non archivées',()=>{
  const {elements:e,api,confirmations}=setup(true,{confirmAnswer:false});
  api.newGame({secret});api.submit(wrong);chooseMode(e,'assisted');
  assert.equal(e['game-mode'].value,'classic');assert.equal(api.getState().attemptsUsed,1);
  assert.equal(e['assistant-panel'].hidden,true);assert.equal(confirmations.length,1);
  api.submit(secret);assert.equal(e['game-archive'].children.length,0);
});
test('statistiques/historique visibles, séparés et rechargeables ; effacement confirmé',()=>{
  const data={};const storage={getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v};
  const {elements:e,api}=setup(false,{storage});
  // Une proposition du premier essai ne révèle pas le secret : tester le moteur partagé avec un code connu en mode normal par l’historique sauvegardé.
  const seed={mode:'assisted',status:'won',finishedAt:1000,durationMs:65000,secret,history:[{guess:secret,wellPlaced:4,misplaced:0}]};
  storage.setItem(extensions.STORAGE_KEY,JSON.stringify([seed]));
  const other=setup(false,{storage}),ui=other.elements;
  assert.equal(ui['game-archive'].children.length,1);
  assert.match(ui['stats-grid'].children[1].textContent,/1 victoire/);
  ui['archive-filter'].value='classic';ui['archive-filter'].dispatch('change');assert.equal(ui['game-archive'].children.length,0);
  ui['clear-records'].click();assert.equal(JSON.parse(storage.getItem(extensions.STORAGE_KEY)).length,0);
  assert.equal(ui['game-archive'].children.length,0);
});
