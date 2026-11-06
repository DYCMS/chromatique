/* Moteur unique de l’interface et du contrat commun 0.2. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.CodeSecretEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.2.0';
  const PALETTE = Object.freeze(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
  const MAX_ATTEMPTS = 10;
  const MESSAGES = {
    'invalid-options':'Les options doivent être un objet contenant uniquement la clé secret.',
    'invalid-type':'La proposition doit être un tableau complet de chaînes de caractères.',
    'invalid-length':'Choisissez exactement quatre couleurs.',
    'invalid-color':'Choisissez quatre couleurs autorisées : rouge, bleu, vert, jaune, orange ou violet.',
    'game-not-started':'Démarrez une nouvelle partie avant de proposer des couleurs.',
    'game-finished':'Cette partie est terminée. Lancez une nouvelle partie.'
  };
  function codeError(code) {
    if (!Array.isArray(code)) return 'invalid-type';
    for (let i=0; i<code.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(code,i) || typeof code[i] !== 'string') return 'invalid-type';
    }
    if (code.length !== 4) return 'invalid-length';
    if (!code.every(color => PALETTE.includes(color))) return 'invalid-color';
    return null;
  }
  function validCode(code) { return codeError(code) === null; }
  function evaluate(secret, guess) {
    if (!validCode(secret) || !validCode(guess)) throw new TypeError('Il faut quatre couleurs autorisées.');
    let wellPlaced=0;
    const remainingSecret={}, remainingGuess={};
    for(let i=0;i<4;i++) {
      if(secret[i]===guess[i]) wellPlaced++;
      else {
        remainingSecret[secret[i]]=(remainingSecret[secret[i]]||0)+1;
        remainingGuess[guess[i]]=(remainingGuess[guess[i]]||0)+1;
      }
    }
    const misplaced=PALETTE.reduce((total,color)=>total+Math.min(remainingSecret[color]||0,remainingGuess[color]||0),0);
    return {wellPlaced,misplaced};
  }
  function randomSecret(random=Math.random) {
    return Array.from({length:4},()=>PALETTE[Math.floor(random()*PALETTE.length)]);
  }
  function ordinaryOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) return false;
    const proto=Object.getPrototypeOf(options);
    return proto===null || (Object.prototype.toString.call(options)==='[object Object]' &&
      Object.getPrototypeOf(proto)===null && Object.prototype.hasOwnProperty.call(proto,'constructor') && proto.constructor.name==='Object');
  }
  function createGame({random=Math.random, autoStart=true, revealSecret=true}={}) {
    let secret=null, history=[], status='not-started', lastError=null;
    const listeners=new Set();
    // Vue interne historique, également conservée pour la compatibilité des extensions.
    function getState() {
      return {
        version:VERSION,rules:'code-couleurs-1.0',palette:[...PALETTE],status,
        attemptsUsed:history.length,attemptsRemaining:MAX_ATTEMPTS-history.length,maxAttempts:MAX_ATTEMPTS,
        history:history.map(row=>({attempt:row.attempt,guess:[...row.guess],wellPlaced:row.wellPlaced,misplaced:row.misplaced})),
        secret:revealSecret && ['won','lost'].includes(status) ? [...secret] : null
      };
    }
    function getContractState() {
      const rows=history.map(row=>({guess:[...row.guess],result:{wellPlaced:row.wellPlaced,misplaced:row.misplaced}}));
      const last=rows[rows.length-1];
      return {
        status,attempts:history.length,history:rows,
        lastGuess:last ? [...last.guess] : null,
        lastResult:last ? {...last.result} : null,
        lastError:lastError ? {...lastError} : null
      };
    }
    function notify() { listeners.forEach(fn=>fn(getState())); }
    function failure(code) {return {ok:false,code,error:MESSAGES[code],state:getState()};}
    function newGame(options={}) {
      if (!ordinaryOptions(options) || Reflect.ownKeys(options).some(key=>key!=='secret')) return failure('invalid-options');
      const imposed=Object.prototype.hasOwnProperty.call(options,'secret');
      if (imposed) {const error=codeError(options.secret);if(error)return failure(error);}
      secret=imposed ? [...options.secret] : randomSecret(random);
      history=[];status='playing';lastError=null;
      notify();
      return {ok:true,state:getState()};
    }
    function submit(guess) {
      const code=status==='not-started' ? 'game-not-started' : status!=='playing' ? 'game-finished' : codeError(guess);
      if(code) {
        lastError={code,message:MESSAGES[code]};
        notify();
        return failure(code);
      }
      const feedback=evaluate(secret,guess);
      history.push({attempt:history.length+1,guess:[...guess],...feedback});lastError=null;
      if(feedback.wellPlaced===4)status='won';else if(history.length===MAX_ATTEMPTS)status='lost';
      notify();
      return {ok:true,feedback:{...feedback},state:getState()};
    }
    if(autoStart)newGame();
    return Object.freeze({newGame,submit,getState,getContractState,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}});
  }
  // Adaptateur interne synchrone : l’interface et les extensions gardent la même partie.
  function bindApi(game,{testMode=false}={}) {
    return Object.freeze({
      version:VERSION,
      newGame(options={}) {
        if(!testMode && options && Object.prototype.hasOwnProperty.call(options,'secret'))return {ok:false,error:'Le secret imposé nécessite le mode de test (?test=1).',state:game.getState()};
        return game.newGame(options);
      },
      submit:guess=>game.submit(guess),getState:()=>game.getState()
    });
  }
  function createTestApi(game) {
    return Object.freeze({
      version:'0.2',
      getConfig() {return {apiVersion:'0.2',rulesVersion:'code-couleurs-1.0',secretLength:4,maxAttempts:10,allowDuplicates:true,colors:[...PALETTE]};},
      async startGame(options) {
        const result=game.newGame(options);
        if(!result.ok) {const error=new Error(result.error);error.code=result.code;throw error;}
        return game.getContractState();
      },
      async submitGuess(guess) {game.submit(guess);return game.getContractState();},
      getState:()=>game.getContractState()
    });
  }
  return Object.freeze({VERSION,PALETTE,MAX_ATTEMPTS,validCode,evaluate,createGame,bindApi,createTestApi});
});
