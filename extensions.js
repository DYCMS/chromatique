/* Extensions locales : aucun service d’IA, aucun secret lu par le solveur. */
(function(root,factory){
  const engine=typeof module==='object'&&module.exports?require('./game.js'):root.CodeSecretEngine;
  const extensions=factory(engine);
  if(typeof module==='object'&&module.exports)module.exports=extensions;else root.CodeSecretExtensions=extensions;
})(typeof globalThis!=='undefined'?globalThis:this,function(engine){
  'use strict';
  const MODES=Object.freeze(['classic','assisted','automatic']);
  const STORAGE_KEY='chromatique.finished-games.v1';
  const LIMIT=100;
  const allCodes=[];
  for(const a of engine.PALETTE)for(const b of engine.PALETTE)for(const c of engine.PALETTE)for(const d of engine.PALETTE)allCodes.push([a,b,c,d]);
  function candidates(history){
    if(!Array.isArray(history))throw new TypeError('Historique invalide.');
    for(const row of history)if(!row||!engine.validCode(row.guess)||!Number.isInteger(row.wellPlaced)||!Number.isInteger(row.misplaced)||row.wellPlaced<0||row.misplaced<0||row.wellPlaced+row.misplaced>4)throw new TypeError('Indices invalides.');
    return allCodes.filter(code=>history.every(row=>{const result=engine.evaluate(code,row.guess);return result.wellPlaced===row.wellPlaced&&result.misplaced===row.misplaced;}));
  }
  function suggest(history){
    const pool=candidates(history);
    if(!pool.length)return {count:0,guess:null,explanation:'Aucun code ne correspond à ces indices.'};
    if(history.length===0)return {count:pool.length,guess:['rouge','rouge','bleu','bleu'],explanation:'Premier essai : deux paires de couleurs permettent de tester leur présence et leurs répétitions.'};
    if(pool.length===1)return {count:1,guess:[...pool[0]],explanation:'Un seul code reste compatible avec tous les indices reçus.'};
    // Minimise le plus grand groupe de réponses, sur au plus 48 propositions candidates.
    const sample=pool.length<=48?pool:Array.from({length:48},(_,i)=>pool[Math.floor(i*pool.length/48)]);
    let best=sample[0],smallestWorst=Infinity,bestSquares=Infinity;
    for(const guess of sample){
      const buckets=new Map();
      for(const possible of pool){const score=engine.evaluate(possible,guess);const key=score.wellPlaced*5+score.misplaced;buckets.set(key,(buckets.get(key)||0)+1);}
      const sizes=[...buckets.values()],worst=Math.max(...sizes),squares=sizes.reduce((sum,n)=>sum+n*n,0);
      if(worst<smallestWorst||(worst===smallestWorst&&squares<bestSquares)){best=guess;smallestWorst=worst;bestSquares=squares;}
    }
    return {count:pool.length,guess:[...best],explanation:`${pool.length} codes restent compatibles. Cette proposition cherche à départager les possibilités, à partir des seuls indices précédents.`};
  }
  function formatTime(ms){
    const total=Math.floor(Math.max(0,Number.isFinite(ms)?ms:0)/1000);
    const sec=String(total%60).padStart(2,'0'),min=String(Math.floor(total/60)%60).padStart(2,'0');
    return total>=3600?`${Math.floor(total/3600)}:${min}:${sec}`:`${min}:${sec}`;
  }
  function validateRecord(record){
    if(!record||!MODES.includes(record.mode)||!['won','lost'].includes(record.status)||!engine.validCode(record.secret)||!Number.isFinite(record.finishedAt)||record.finishedAt<0||!Number.isFinite(record.durationMs)||record.durationMs<0||!Array.isArray(record.history)||record.history.length<1||record.history.length>10)return false;
    for(let i=0;i<record.history.length;i++){
      const row=record.history[i];if(!row||!engine.validCode(row.guess))return false;
      const score=engine.evaluate(record.secret,row.guess);
      if(row.wellPlaced!==score.wellPlaced||row.misplaced!==score.misplaced||i<record.history.length-1&&score.wellPlaced===4)return false;
    }
    const last=record.history[record.history.length-1];
    return record.status==='won'?last.wellPlaced===4:record.history.length===10&&last.wellPlaced!==4;
  }
  function copyRecord(r){return {mode:r.mode,status:r.status,finishedAt:r.finishedAt,durationMs:r.durationMs,secret:[...r.secret],history:r.history.map((row,i)=>({attempt:i+1,guess:[...row.guess],wellPlaced:row.wellPlaced,misplaced:row.misplaced}))};}
  function createTracker({storage=null,now=Date.now,testMode=false}={}){
    let records=[],startedAt=now(),endedAt=null,recorded=false,storageAvailable=Boolean(storage),mode='classic';
    if(!testMode&&storage){try{const saved=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(saved))records=saved.filter(validateRecord).slice(-LIMIT).map(copyRecord);}catch{storageAvailable=false;}}
    function save(){if(testMode||!storage)return;try{storage.setItem(STORAGE_KEY,JSON.stringify(records));storageAvailable=true;}catch{storageAvailable=false;}}
    function observe(state,nextMode='classic'){
      if(state.attemptsUsed===0&&state.status==='playing'){mode=MODES.includes(nextMode)?nextMode:'classic';startedAt=now();endedAt=null;recorded=false;}
      if(state.status!=='playing'&&!recorded){endedAt=now();recorded=true;if(!testMode){const row={mode,status:state.status,finishedAt:endedAt,durationMs:Math.max(0,endedAt-startedAt),secret:state.secret,history:state.history};if(validateRecord(row)){records.push(copyRecord(row));records=records.slice(-LIMIT);save();}}}
    }
    function elapsed(){return Math.max(0,(endedAt===null?now():endedAt)-startedAt);}
    function getRecords(){return records.map(copyRecord);}
    function stats(){return Object.fromEntries(MODES.map(name=>{const games=records.filter(r=>r.mode===name),wins=games.filter(r=>r.status==='won');return [name,{played:games.length,wins:wins.length,losses:games.length-wins.length,winRate:games.length?Math.round(100*wins.length/games.length):0,averageAttempts:wins.length?wins.reduce((sum,r)=>sum+r.history.length,0)/wins.length:null}];}));}
    return Object.freeze({observe,elapsed,getRecords,stats,clear(){records=[];save();},isPersistent:()=>!testMode&&storageAvailable});
  }
  return Object.freeze({MODES,STORAGE_KEY,LIMIT,candidates,suggest,formatTime,validateRecord,createTracker});
});
