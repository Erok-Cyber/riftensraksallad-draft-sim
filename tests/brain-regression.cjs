// Offline invariants for the heuristic engine. No network or real match writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
function harness(files){
  const elements=new Map(),storage=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},style:{},disabled:false,
      classList:{add(){},remove(){},toggle(){},contains(){return false;}},
      addEventListener(){},setAttribute(){},appendChild(){},replaceChildren(){},querySelectorAll(){return [];}});
    return elements.get(id);
  };
  const store={getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val),removeItem:key=>storage.delete(key)};
  const context={console:{log(){},warn(){},error(){}},URLSearchParams,Date,Math,Set,Map,
    localStorage:store,sessionStorage:store,location:{search:'',pathname:'/index.html'},history:{replaceState(){}},
    fetch:async()=>{throw Error('offline test');},queueMicrotask(){},setTimeout(){},clearTimeout(){},
    confirm:()=>true,alert(){},document:{body:element('body'),getElementById:element,createElement:()=>element(Symbol()),
      querySelectorAll:()=>[],querySelector:()=>element('query'),addEventListener(){},dispatchEvent(){}},
    window:{addEventListener(){},scrollTo(){}}};
  vm.createContext(context);
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return {run:s=>vm.runInContext(s,context),elements,storage};
}
const brain=harness(['live.js','advanced-engine.js','draft-ai.js']);
brain.run('userSide="blue";step=6;events=[];');
let result=brain.run('aiDecision()');
assert(result.length>0);assert(result.every(x=>Number.isFinite(x.total)));
// Exhausted or occupied roles must never receive an illegal recommendation.
brain.run('events=[{type:"pick",side:"blue",role:"mid",champ:"Ahri"},{type:"ban",side:"red",champ:"Jarvan IV"}];');
result=brain.run('aiDecision()');
assert(result.every(x=>x.role!=='mid'&&x.ch!=='Ahri'&&x.ch!=='Jarvan IV'));
assert.equal(brain.run('aiRoleCandidates("mid").length'),0);
brain.run('events=teamPool.support.map(champ=>({type:"ban",side:"red",champ}));');
assert.equal(brain.run('aiRoleCandidates("support").length'),0);
// Cache must invalidate on draft changes and reproduce the same ranking after undo.
brain.run('events=[];');const before=brain.run('JSON.stringify(aiDecision())');
brain.run('events=[{type:"ban",side:"red",champ:aiDecision()[0].ch}];');
assert.notEqual(brain.run('JSON.stringify(aiDecision())'),before);
brain.run('events=[];');assert.equal(brain.run('JSON.stringify(aiDecision())'),before);
// Counter evidence should make an anti-dive carry more competitive, not less.
brain.run('events=[];');const neutral=brain.run('aiCandidate("Xayah","adc").score-aiCandidate("Ashe","adc").score');
brain.run('events=[{type:"pick",side:"red",champ:"Vi",role:"jungle"},{type:"pick",side:"red",champ:"Malphite",role:"top"}];aiEnsureContext();');
const dive=brain.run('aiCandidate("Xayah","adc").score-aiCandidate("Ashe","adc").score');
assert(dive>neutral,'enemy dive must improve Xayah relative to Ashe');
// Lookahead explores own legal continuations, without modifying the real draft.
const saved=brain.run('JSON.stringify(events)');
brain.run('aiLookaheadScore({adc:"Xayah"},new Set(["xayah","vi","malphite"]))');
assert.equal(brain.run('JSON.stringify(events)'),saved);
// No history influence below the minimum sample count.
brain.storage.set('rs_draft_archive',JSON.stringify([{result:'win',ourPicks:[{champ:'Xayah',role:'adc'}]}]));
assert.equal(brain.run('aiTeamHistorySignal("Xayah","adc").bonus'),0);
const practice=harness(['app.js']);
practice.run('selectMode("sim");userSide="blue";picks=[{side:"blue",champ:"Ahri",slot:"B1"}];step=1;rememberPractice();leavePractice();selectMode("test");');
assert.equal(practice.run('picks.length'),0);
practice.run('leavePractice();selectMode("sim");');
assert.equal(practice.run('picks[0].champ'),'Ahri');
practice.run('selectMode("sim",true);');assert.equal(practice.run('picks.length'),0);
assert(practice.storage.has('rs_practice_v1'));
console.log('PASS: legal candidates, undo/cache, dive response, lookahead isolation, small samples, independent practice sessions.');
// Review replay must be isolated from the real draft and must not contain future decisions.
brain.storage.set('rs_draft_state','real-draft-must-survive');
brain.storage.set('rs_review_replay',JSON.stringify({side:'blue',patch:'26.18',events:[{type:'ban',side:'blue',champ:'Garen'}]}));
brain.run('location.search="?replay=1";restoreState();saveState();');
assert.equal(brain.run('events.length'),1);
assert.equal(brain.run('step'),1);
assert.equal(brain.run('draftIsTest&&testMode'),true);
assert.equal(brain.storage.get('rs_draft_state'),'real-draft-must-survive');
console.log('PASS: review replay cannot overwrite the real draft.');
