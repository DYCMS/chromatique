// Exécute app.js avec un DOM simulé. Cela ne vérifie ni le rendu CSS ni un vrai appareil.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../game.js');
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
function setup(testMode=true){
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const elements={}; for(const match of html.matchAll(/<([a-z0-9-]+)[^>]*\bid="([^"]+)"/gi))elements[match[2]]=new Element(match[1]);
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),createTextNode:text=>Object.assign(new Element('#text'),{textContent:text})};
  const window={};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),{document,window,CodeSecretEngine:engine,URLSearchParams,location:{search:testMode?'?test=1':''}});
  const api=window.codeSecret;
  const fill=guess=>guess.forEach((value,i)=>{const select=elements.slots.children[i].children[2];select.value=value;select.dispatch('change');});
  const submit=()=>elements.proposal.dispatch('submit');
  return {elements,api,fill,submit};
}
const secret=['rouge','bleu','vert','jaune'];
const wrong=Array(4).fill('violet');
test('interface : quatre cases vides, six choix, historique vide et secret caché',()=>{
  const {elements:e,api}=setup();
  assert.equal(e.slots.children.length,4);assert.equal(e.palette.children.length,6);
  assert.equal(e.secret.textContent,'????');assert.equal(e.history.children.length,0);
  assert.equal(api.getState().attemptsUsed,0);assert.equal(e['test-banner'].hidden,false);
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
  assert.equal(e.validate.disabled,true);assert.equal(e['palette-fieldset'].disabled,true);
  assert.ok(e.slots.children.every(s=>s.children[1].disabled&&s.children[2].disabled));
  assert.equal(e.secret.children[0].style.getPropertyValue('--color'),'#c73c40');
  assert.equal(e.secret.attributes['aria-label'],'Code secret : rouge, bleu, vert, jaune');
  const before=api.getState();submit();e.palette.children[0].click();assert.deepEqual(api.getState(),before);
});
test('interface : défaite après dix propositions puis nouvelle partie complète',()=>{
  const {elements:e,api,fill,submit}=setup();api.newGame({secret});
  for(let i=0;i<10;i++){fill(wrong);submit();}
  assert.match(e.status.textContent,/dix essais sont écoulés/);assert.equal(api.getState().status,'lost');
  e['new-game'].click();assert.equal(api.getState().status,'playing');
  assert.equal(e.secret.textContent,'????');assert.equal(e.history.children.length,0);
  assert.equal(e.validate.disabled,false);assert.equal(e.error.textContent,'');
  assert.ok(e.slots.children.every(s=>s.children[2].value===''));
  assert.equal(e.slots.children[0].children[1].focused,true);
});
test('interface : mode normal sans bandeau et sans secret imposé',()=>{
  const {elements:e,api}=setup(false);assert.equal(e['test-banner'].hidden,true);
  assert.equal(api.newGame({secret}).ok,false);assert.equal(api.getState().secret,null);
});
