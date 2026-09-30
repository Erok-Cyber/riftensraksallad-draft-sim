// Offline invariants for the heuristic engine. No network or real match writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
function harness(files,fixtures={}){
  const elements=new Map(),storage=new Map(Object.entries(fixtures)),listeners=new Map();
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},style:{},disabled:false,
      classList:{add(){},remove(){},toggle(){},contains(){return false;}},
      addEventListener(type,fn){listeners.set(String(id)+":"+type,fn);},setAttribute(){},appendChild(){},replaceChildren(){},querySelectorAll(){return [];}});
    return elements.get(id);
  };
  const store={getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val),removeItem:key=>storage.delete(key)};
  const context={console:{log(){},warn(){},error(){}},URLSearchParams,Date,Math,Set,Map,
    localStorage:store,sessionStorage:store,location:{search:'',pathname:'/index.html'},history:{replaceState(){}},
    fetch:async()=>{throw Error('offline test');},queueMicrotask(){},setTimeout(){},clearTimeout(){},
    confirm:()=>true,alert(){},document:{body:element('body'),getElementById:element,createElement:()=>element(Symbol()),
      querySelectorAll:()=>[],querySelector:()=>element('query'),addEventListener(type,fn){listeners.set("document:"+type,fn);},dispatchEvent(){}},
    window:{addEventListener(){},scrollTo(){}}};
  vm.createContext(context);
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return {run:s=>vm.runInContext(s,context),elements,storage,fire:(id,type)=>listeners.get(id+":"+type)?.()};
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

// Opponent context must use actual starters and remain an optional, bounded prior.
const fixture={id:'opponent',opponent:'Testlag',status:'upcoming',phase1Plan:{b1:'Nocturne',b2:'Poppy',b3:'Janna'},
 competitiveEvidence:{currentRoster:[{riotId:'Starter#1',role:'jungle'}]},
 scoutingPlayers:[{riotId:'Starter#1',found:true,topChampions:[{champ:'Nocturne',seasonGames:100}]},
 {riotId:'Sub#1',found:true,topChampions:[{champ:'Vi',seasonGames:500}]}]};
const opponent=harness(['live.js','advanced-engine.js','draft-ai.js','scouting-lineup.js','brain-opponent.js'],
 {'rs_ban_plans_cache':JSON.stringify([fixture]),'rs_brain_opponent':'opponent'});
opponent.fire('document','DOMContentLoaded');
opponent.run('userSide="blue";events=[];step=0;');
assert.equal(opponent.run('window.RiftOpponent.active().id'),'opponent');
assert.equal(opponent.run('window.RiftScouting.lineup(window.RiftOpponent.active())[0].player.riotId'),'Starter#1');
assert(opponent.run('window.RiftOpponent.pickSignal("Xayah","adc").points')>0);
assert(opponent.run('window.RiftOpponent.pickSignal("Xayah","adc").points')<=24);
assert.equal(opponent.run('JSON.stringify(banRecommendations())'),JSON.stringify(['Nocturne']));
assert(opponent.run('window.RiftOpponent.pickSignal("Xayah","adc").points')>8,'scouting must influence picks more strongly');
opponent.run('events=[{side:"red",type:"ban",champ:"Nocturne"}];');
assert.equal(opponent.run('banRecommendations().length'),0,'must not fill exhausted pool with generic bans');
assert.equal(opponent.run('window.RiftOpponent.pickSignal("Xayah","adc").points'),0);
opponent.run('events=[{side:"red",type:"pick",role:"jungle",champ:"Ivern"}];');
assert.equal(opponent.run('window.RiftOpponent.pickSignal("Xayah","adc").points'),0);
opponent.elements.get('brainOpponent').value='';opponent.fire('brainOpponent','change');
assert.equal(opponent.run('window.RiftOpponent.active()'),null);
assert.equal(opponent.run('window.RiftOpponent.pickSignal("Xayah","adc").points'),0);
console.log('PASS: optional opponent, starters over subs, planned bans, unavailable picks, revealed roles supersede scouting.');


const tournamentFixture=JSON.parse(JSON.stringify(fixture));
tournamentFixture.competitiveEvidence.games=[{picks:[
 {riotId:'Starter#1',role:'jungle',champ:'Jarvan IV'},
 {riotId:'Sub#1',role:'jungle',champ:'Vi'},
 {player:'Unmatched old player',role:'mid',champ:'Annie'}]}];
const tournament=harness(['live.js','advanced-engine.js','draft-ai.js','scouting-lineup.js','brain-opponent.js'],
 {'rs_ban_plans_cache':JSON.stringify([tournamentFixture]),'rs_brain_opponent':'opponent'});
tournament.fire('document','DOMContentLoaded');tournament.run('userSide="blue";events=[];step=0;');
assert.equal(tournament.run('JSON.stringify(banRecommendations())'),JSON.stringify(['Jarvan IV','Nocturne']));
assert(tournament.run('window.RiftOpponent.banReason("Jarvan IV").includes("CM: 1")'));
assert(!tournament.run('banRecommendations().includes("Vi")'));
tournament.run('events=[{side:"red",type:"pick",role:"jungle",champ:"Ivern"}];step=12;');
assert.equal(tournament.run('banRecommendations().length'),0,'do not target a role already shown');
const emptyFixture={...fixture,scoutingPlayers:[],competitiveEvidence:{currentRoster:[{riotId:'Starter#1',role:'jungle'}]}};
const empty=harness(['live.js','advanced-engine.js','draft-ai.js','scouting-lineup.js','brain-opponent.js'],
 {'rs_ban_plans_cache':JSON.stringify([emptyFixture]),'rs_brain_opponent':'opponent'});
empty.fire('document','DOMContentLoaded');empty.run('userSide="blue";events=[];step=0;renderRecommendation();');
assert.equal(empty.run('banRecommendations().length'),0);
assert.equal(empty.elements.get('recommendPicks').textContent,'Inga styrkta banförslag kvar');
console.log('PASS: source-only bans, CM over season stats, no substitutes/unmatched identities, honest empty state.');
