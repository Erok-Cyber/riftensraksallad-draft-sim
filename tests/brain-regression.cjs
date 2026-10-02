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
  const context={console:{log(){},warn(){},error(){}},URLSearchParams,Date,Math,Set,Map,AbortController,AbortSignal,
    localStorage:store,sessionStorage:store,location:{search:'',pathname:'/index.html'},history:{replaceState(){}},
    fetch:async()=>{throw Error('offline test');},queueMicrotask(){},setTimeout(){},clearTimeout(){},
    confirm:()=>true,alert(){},document:{body:element('body'),getElementById:element,createElement:()=>element(Symbol()),
      querySelectorAll:()=>[],querySelector:()=>element('query'),addEventListener(type,fn){listeners.set("document:"+type,fn);},dispatchEvent(){}},
    window:{addEventListener(){},scrollTo(){}}};
  vm.createContext(context);
  files=['team-data.js','roster-model.js',...files.filter(f=>!['team-data.js','roster-model.js'].includes(f))];
  for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return {context,run:s=>vm.runInContext(s,context),elements,storage,fire:(id,type)=>listeners.get(id+":"+type)?.()};
}
const brain=harness(['live.js','advanced-engine.js','draft-ai.js']);
brain.run('userSide="blue";step=6;events=[];');
let result=brain.run('aiDecision()');
assert(result.length>0);assert(result.every(x=>Number.isFinite(x.total)));
assert.equal(brain.run('comfort.jungle.Lillia'),4);
brain.run('aiEnsureContext()');const lowComfort=brain.run('aiCandidate("Lillia","jungle").score');
brain.run('comfort.jungle.Lillia=8;aiContextKey="";aiEnsureContext()');
assert(brain.run('aiCandidate("Lillia","jungle").score')>lowComfort,'lower Lillia comfort must reduce score');
brain.run('comfort.jungle.Lillia=4;aiContextKey="";aiEnsureContext()');
assert(result.length<=20);assert(result.every(x=>x.urgency&&Number.isFinite(x.urgency.points)));
const ids=result.map(x=>x.role+':'+x.ch);assert.equal(new Set(ids).size,ids.length);
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
// Local lineup changes affect all candidate/comp branches and invalidate cached picks.
const roster=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
roster.run('userSide="blue";step=6;events=[];');
const standardSupport=roster.run('JSON.stringify(aiRoleCandidates("support").map(x=>x.ch).sort())');
assert.equal(standardSupport,JSON.stringify(['Leona','Maokai','Nautilus']));
const coreBefore=roster.run('JSON.stringify(Object.values(comps).map(c=>c.core))');
roster.run('window.RiftRoster.select("support","jacob-support")');
assert.equal(roster.run('teamPool.support.length'),7);
assert.equal(roster.run('JSON.stringify(aiRoleCandidates("support").map(x=>x.ch).sort())'),JSON.stringify(['Braum','Galio','Leona','Maokai','Nautilus','Poppy','Shen']));
assert.equal(roster.run('JSON.stringify(Object.values(comps).map(c=>c.core))'),coreBefore);
assert(roster.run('comps["PRESS R"].alts.support.includes("Galio")'));
assert(!roster.run('comps["PRESS R"].alts.support.includes("Braum")'));
assert(roster.run('comps["JUNGLE CARRY"].alts.support.includes("Shen")'));
assert(roster.run('aiRoleCandidates("support").every(x=>Number.isFinite(x.score))'));
assert.equal(roster.run('aiNeeds({support:"Galio"}).engage'),0);
assert.equal(roster.run('aiNeeds({support:"Galio"}).ap'),0);
assert.equal(roster.run('advDamageProfile([{role:"support",champ:"Galio"}]).ap'),0);
assert(!roster.run('aiCandidate("Galio","support").reasons.includes("ger engage")'));
assert(roster.run('aiCandidate("Galio","support").reasons.includes("behöver engage/setup från annan roll")'));
roster.run('events=[{type:"pick",side:"blue",role:"top",champ:"Shen"},{type:"ban",side:"red",champ:"Poppy"}];');
assert(!roster.run('aiRoleCandidates("support").some(x=>["Shen","Poppy"].includes(x.ch))'));
const rosterEvents=roster.run('JSON.stringify(events)');
roster.run('window.RiftRoster.select("support","core-support")');
assert.equal(roster.run('JSON.stringify(events)'),rosterEvents);
assert(!roster.run('comps["JUNGLE CARRY"].alts.support.includes("Shen")'));
assert.equal(roster.run('JSON.stringify(aiRoleCandidates("support").map(x=>x.ch).sort())'),standardSupport);
assert.throws(()=>roster.run('window.RiftRoster.savePlayer("support","","Test","NotAChampion")'));
assert.throws(()=>roster.run('window.RiftRoster.savePlayer("support","","Test","")'));
roster.run('window.RiftRoster.savePlayer("support","","Test","naut, Braum, naut")');
assert.equal(roster.run('JSON.stringify(teamPool.support)'),JSON.stringify(['Nautilus','Braum']));
const reloaded=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js'],{'rs_own_roster_v1':roster.storage.get('rs_own_roster_v1')});
assert.equal(reloaded.run('window.RiftRoster.player("support").name'),'Test');
assert.equal(reloaded.run('JSON.stringify(teamPool.support)'),JSON.stringify(['Nautilus','Braum']));
const corrupt=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js'],{'rs_own_roster_v1':'{broken'});
assert.equal(corrupt.run('teamPool.support.length'),3);
assert.equal(corrupt.run('window.RiftRoster.player("support").name'),'Frippen');
const legacyRoster={profiles:[{id:'core-support',role:'support',name:'Ordinarie support',pool:['Braum']}],active:{support:'core-support'}};
const migrated=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js'],{'rs_own_roster_v1':JSON.stringify(legacyRoster)});
assert.equal(migrated.run('window.RiftRoster.player("support").name'),'Frippen');
assert.equal(migrated.run('teamPool.support[0]'),'Braum');
console.log('PASS: lineup profiles, seven Jacob candidates, core preservation, cache invalidation, legal picks, validation and reload.');
// Role-specific substitutions preserve the core and reject uncurated comp bonuses.
const subs=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
subs.run('window.RiftRoster.savePlayer("top","","Topsub","Ornn, Kennen")');
assert(subs.run('comps["PRESS R"].alts.top.includes("Ornn")'));
assert(!subs.run('comps["EARLY SKIRMISH"].alts.top.includes("Ornn")'));
subs.run('window.RiftRoster.savePlayer("jungle","","Junglesub","Amumu, Sejuani")');
subs.run('window.RiftRoster.savePlayer("mid","","Midsub","Orianna, Galio")');
subs.run('window.RiftRoster.savePlayer("adc","","ADCsub","Miss Fortune, Jinx")');
assert(subs.run('comps["PRESS R"].alts.jungle.includes("Amumu")'));
assert(subs.run('comps["PRESS R"].alts.mid.includes("Orianna")'));
assert(subs.run('comps["PRESS R"].alts.adc.includes("Miss Fortune")'));
assert.equal(subs.run('JSON.stringify(Object.values(comps).map(c=>c.core))'),coreBefore);
subs.run('userSide="blue";step=20;events=roles.map(role=>({type:"pick",side:"blue",champ:teamPool[role][0],role,player:window.RiftRoster.player(role)}));window.RiftOpponent={active:()=>({id:"series-1",opponent:"Opponent",bestOf:3})};captureDraftContext();');
const frozen=subs.run('JSON.stringify(savedDraftContext)');
subs.run('window.RiftRoster.select("top","core-top")');
assert.equal(subs.run('JSON.stringify(captureDraftContext())'),frozen,'changing roster cannot rewrite the finished draft');
const firstId=subs.run('buildMatchRecord().id');assert.equal(subs.run('buildMatchRecord().id'),firstId,'retry must reuse match ID');
assert.equal(subs.run('buildMatchRecord().draftContext.roster.players[0].name'),'Topsub');
subs.run('savedDraftContext=null;events=events.map(({player,...rest})=>rest)');
assert.equal(subs.run('captureDraftContext().roster'),null,'legacy drafts must not invent historical players');
console.log('PASS: subs in all roles, immutable historical roster, stable save ID, honest legacy data.');
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
// Equally practiced champions: stronger documented lane player outranks jungle.
const laneFixture={id:'lane',status:'upcoming',competitiveEvidence:{currentRoster:[{riotId:'J#1',role:'jungle'},{riotId:'M#1',role:'mid'}]},scoutingPlayers:[
 {riotId:'J#1',tier:'GOLD II',topChampions:[{champ:'Nocturne',seasonGames:100,recentGames:10,seasonWinrate:55}]},
 {riotId:'M#1',tier:'DIAMOND IV',topChampions:[{champ:'Ahri',seasonGames:100,recentGames:10,seasonWinrate:55}]}]};
const lane=harness(['live.js','advanced-engine.js','draft-ai.js','scouting-lineup.js','brain-opponent.js'],{'rs_ban_plans_cache':JSON.stringify([laneFixture]),'rs_brain_opponent':'lane'});
lane.fire('document','DOMContentLoaded');lane.run('userSide="blue";events=[];step=0;');
assert.equal(lane.run('banRecommendations()[0]'),'Ahri');
assert(lane.run('window.RiftOpponent.banScore("Ahri")>window.RiftOpponent.banScore("Nocturne")'));
lane.run('window.RiftOpponent.active().scoutingPlayers.forEach(p=>p.tier="")');
assert.equal(lane.run('window.RiftOpponent.banScore("Ahri")'),lane.run('window.RiftOpponent.banScore("Nocturne")'),'no hidden jungle preference');
lane.run('events=[];');assert.equal(lane.run('aiCompPreference({},"EARLY SKIRMISH")'),12);
assert.equal(lane.run('aiCompPreference({},"PRESS R")'),0);
lane.run('events=[{type:"ban",side:"red",champ:"Xin Zhao"}]');
assert.equal(lane.run('aiCompPreference({},"EARLY SKIRMISH")'),12,'one ban with alternatives must not force pivot');
lane.run('events=teamPool.jungle.map(champ=>({type:"ban",side:"red",champ}))');
assert.equal(lane.run('aiCompPreference({},"PRESS R")'),8,'blocked go-to unlocks fallback prior');
console.log('PASS: go-to/fallback priorities, comfort-backed strongest-player proxy, no jungle bias.');

// Remote recommendations are opt-in, roster-bound and never survive draft changes.
(async()=>{
 const remote=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js','groq-coach.js']);
 remote.run('userSide="blue";events=[];step=0;renderRecommendation();');
 let pendingResolve,analysisCalls=0;
 remote.run('document.getElementById("groqTeamCode").value="fixture-team-code"');
 remote.context.fetch=async(url,options)=>{
   const body=JSON.parse(options.body);
   if(body.verifyOnly)return {ok:true,json:async()=>({ok:true})};
   analysisCalls++;return new Promise(resolve=>{pendingResolve=resolve;});
 };
 const activating=remote.fire('groqAnalyze','click');
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(analysisCalls,1);
 pendingResolve({ok:true,json:async()=>({advice:{choices:[{id:'ban:Poppy',reason:'Anti-dash',risk:'Inte alltid bäst'}],plan:'Säkra engage',nextStep:'Flex',uncertainty:'Ingen scouting'}})});
 await activating;
 assert.equal(remote.run('window.RiftGroq.recommendations(banRecommendations().map(ch=>({ch})))[0].ch'),'Poppy');
 assert.equal(remote.run('events.length'),0,'AI must never lock a choice');
 remote.run('events=[{type:"ban",side:"blue",champ:"Poppy"}];step=1;renderRecommendation();');
 assert.equal(remote.elements.get('groqAdvice').hidden,true,'old advice removed on enemy turn');
 remote.run('events=[];step=0;renderRecommendation();');
 const request=remote.fire('groqAnalyze','click');
 for(let i=0;i<8;i++)await Promise.resolve();
 remote.run('events=[{type:"ban",side:"blue",champ:"Poppy"}];step=1;renderRecommendation();');
 pendingResolve({ok:true,json:async()=>({advice:{choices:[{id:'ban:Poppy',reason:'Old response'}]}})});
 await request;assert.equal(remote.elements.get('groqAdvice').hidden,true,'late response discarded');
 remote.run('events=[];step=0;renderRecommendation();');
 const invalid=remote.fire('groqAnalyze','click');for(let i=0;i<8;i++)await Promise.resolve();
 pendingResolve({ok:true,json:async()=>({advice:{choices:[{id:'ban:NotInList',reason:'Invented'}]}})});
 await invalid;assert.equal(remote.elements.get('groqBadge').textContent,'FALLBACK');
 assert.equal(remote.run('window.RiftGroq.recommendations(banRecommendations().map(ch=>({ch})))[0].ch'),remote.run('banRecommendations()[0]'));
 remote.run('events=draftOrder.map((t,i)=>({...t,champ:"Champion"+i,role:"unknown"}));step=20;window.RiftGroq.refresh();');
 const finalRequest=remote.fire('groqAnalyze','click');for(let i=0;i<8;i++)await Promise.resolve();
 const finalPlan=Object.fromEntries(['call','early','jungle','objectives','teamfight','behind','top','mid','adc','support','uncertainty'].map(k=>[k,'Plan '+k]));
 pendingResolve({ok:true,json:async()=>({advice:finalPlan})});await finalRequest;
 assert.equal(remote.elements.get('groqFinalAdvice').hidden,false);
 assert.equal(remote.elements.get('groqFinal-jungle').textContent,'Plan jungle');
 remote.run('events=events.slice(0,19);step=19;window.RiftGroq.refresh();');
 assert.equal(remote.elements.get('groqFinalAdvice').hidden,true,'undo invalidates final gameplan');
 remote.fire('groqPause','click');assert.equal(remote.elements.get('groqBadge').textContent,'AV');
 console.log('PASS: remote AI opt-in, reordering without locking, stale response rejection, invalid-output fallback, pause.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const xeniaGames=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/xenia-screenshots.json'),'utf8'));
const xeniaFixture={id:'xenia',status:'upcoming',competitiveEvidence:{currentRoster:xeniaGames[0].picks.map(({player,riotId,role})=>({player,riotId,role})),games:xeniaGames},scoutingPlayers:[]};
const xenia=harness(['live.js','advanced-engine.js','draft-ai.js','scouting-lineup.js','brain-opponent.js'],{'rs_ban_plans_cache':JSON.stringify([xeniaFixture]),'rs_brain_opponent':'xenia'});
xenia.fire('document','DOMContentLoaded');xenia.run('userSide="blue";events=[];step=0;championRoster.push("Lulu","Nasus");');
assert.equal(xenia.run('window.RiftOpponent.scouting().find(r=>r.champ==="Lulu").cm'),3);
assert.equal(xenia.run('window.RiftOpponent.scouting().find(r=>r.champ==="Sylas").role'),'jungle');
assert(xenia.run('window.RiftOpponent.banReason("Lulu").includes("Bildverifierat: 3")'));
assert(!xenia.run('window.RiftOpponent.banReason("Lulu").includes("CM:")'));
xenia.run('events=[{side:"red",type:"pick",role:"support",champ:"Lulu"}];');
assert(!xenia.run('window.RiftOpponent.banCandidates().includes("Lulu")'));
console.log('PASS: Xenia screenshots feed exact starters, off-role tournament picks and accurate source labels.');

const editable=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
editable.run('userSide="blue";step=6;events=[];');
const keyBefore=editable.run('window.RiftRoster.key()');
const highScore=editable.run('aiCandidate("Xin Zhao","jungle").score');
editable.run('window.RiftRoster.setComfort("jungle","Xin Zhao",1);');
assert.equal(editable.run('comfort.jungle["Xin Zhao"]'),1);
assert(editable.run('aiCandidate("Xin Zhao","jungle").score')<highScore);
assert.notEqual(editable.run('window.RiftRoster.key()'),keyBefore);
assert.notEqual(editable.run('window.RiftRoster.compPlan("EARLY SKIRMISH").jungle'),'Xin Zhao');
assert(editable.run('window.RiftRoster.rolesFor("Rell").includes("support")'),'unowned champions remain searchable with role filter');
editable.run('window.RiftRoster.addChampion("support","Rell");window.RiftRoster.setComfort("support","Rell",10);');
assert(editable.run('window.RiftRoster.compOptions()["PRESS R"].support.includes("Rell")'));
assert(editable.run('aiRoleCandidates("support").some(c=>c.ch==="Rell")'));
editable.run('window.RiftRoster.setComfort("support","Nautilus",1);window.RiftRoster.setComfort("support","Leona",1);');
assert.equal(editable.run('window.RiftRoster.compPlan("PRESS R").support'),'Rell');
editable.run('window.RiftRoster.select("support","jacob-support");');
assert.equal(editable.run('comfort.support.Nautilus'),8,'comfort must be player-specific');
editable.run('window.RiftRoster.select("support","core-support");window.RiftRoster.removeChampion("support","Rell");');
assert(!editable.run('aiRoleCandidates("support").some(c=>c.ch==="Rell")'));
const comfortReload=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js'],{'rs_own_roster_v1':editable.storage.get('rs_own_roster_v1')});
assert.equal(comfortReload.run('comfort.jungle["Xin Zhao"]'),1);
assert.throws(()=>editable.run('window.RiftRoster.setComfort("jungle","Xin Zhao",11)'));
assert.throws(()=>editable.run('window.RiftRoster.setComfort("jungle","Xin Zhao",0)'));
assert.equal(editable.run('new Set(Object.values(window.RiftRoster.compPlan("JUNGLE CARRY")).filter(Boolean)).size'),5);
console.log('PASS: editable comfort changes AI ranking, comp variants, cache key, isolated players, remove, reload and unique lineup.');
editable.run('window.RiftRoster.pauseChampion("jungle","Viego",true);');
assert(!editable.run('aiRoleCandidates("jungle").some(c=>c.ch==="Viego")'));
assert(editable.run('window.RiftRoster.player("jungle").pool.includes("Viego")'));
editable.run('window.RiftRoster.pauseChampion("jungle","Viego",false);');
assert(editable.run('aiRoleCandidates("jungle").some(c=>c.ch==="Viego")'));
assert(editable.run('aiCandidate("Viego","jungle").reasons[0].startsWith("comfort ")'));
const feasibility=harness(['live.js','advanced-engine.js','draft-ai.js']);
feasibility.run('userSide="blue";events=[];teamPool.top=["Shen"];teamPool.support=["Shen"];comps["EARLY SKIRMISH"].alts.top=["Shen"];comps["EARLY SKIRMISH"].alts.support=["Shen"];comfort.top.Shen=8;comfort.support.Shen=8;');
assert.equal(feasibility.run('aiCompPreference({},"EARLY SKIRMISH")'),0,'one flex champion cannot fill two open roles');
assert(feasibility.run('aiCompPreference({},"PRESS R")')>0);
console.log('PASS: paused picks excluded, comfort explained, duplicate flex completion rejected.');
