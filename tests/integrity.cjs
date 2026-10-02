// Offline regression coverage for the whole-app audit fixes. No production writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const original=fs.readFileSync(__dirname+'/brain-regression.cjs','utf8');
const harness=vm.runInNewContext(original.slice(0,original.indexOf('const brain=harness'))+'\nharness',{require,__dirname,console,URLSearchParams,AbortController,AbortSignal});
const h=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
for(const champ of ['Ornn','Rell','Sejuani']){
 const s=h.run(`advStructure([{role:'top',champ:${JSON.stringify(champ)}}])`);
 assert(s.frontQ>=2.2&&s.engageQ>=2,champ+' must have frontline and engage');
 assert.equal(h.run(`window.RiftProfiles.assess(['${champ}']).front`),s.frontQ);
}
h.storage.set('rs_draft_archive',JSON.stringify(Array.from({length:5},()=>({result:'win',ourPicks:[{champ:'Nautilus',role:'support'}],draftContext:{roster:{players:[{id:'core-support',role:'support'}]}}}))));
assert.equal(h.run('advFamiliarity("Nautilus","support")'),3);
h.run('window.RiftRoster.select("support","jacob-support")');assert.equal(h.run('advFamiliarity("Nautilus","support")'),0);
const practice=harness(['app.js']);
assert.equal(practice.run('practiceAssignment(["Nautilus","Leona"])'),null);
assert.equal(practice.run('practiceAssignment(["Renekton","Xin Zhao","Ahri","Ashe","Nautilus"]).length'),5);
practice.run('window.RiftRoster.pauseChampion("jungle","Xin Zhao",true)');
assert.equal(practice.run('practiceAssignment(["Xin Zhao"])'),null);
practice.run('mode="test";userSide="blue";step=0;picks=[];document.getElementById("championSearch").value="invalid";lockPick(false)');
assert(practice.elements.get('pickError').textContent.includes('söklistan'));
practice.storage.set('rs_match_history',JSON.stringify([{id:'<b data-audit>',savedAt:'2026-01-01',result:'win',matchType:'league',side:'blue',comp:'<b data-audit>',patch:'<b data-audit>',ourPicks:[{role:'jungle',champ:'<b data-audit>'}]}]));
practice.run('renderAnalysis()');
for(const id of ['matchHistory','compStats','champStats','learningCards','learningInsights','patchFilter'])assert(!practice.elements.get(id).innerHTML.includes('<b data-audit>'),id+' must escape stored strings');
const stale={id:'deleted-fixture',savedAt:'2026-01-01',result:'win',matchType:'league',side:'blue'};
const memory=new Map([['rs_team_access_key','fake-test-key'],['rs_match_history',JSON.stringify([stale])]]);
let fail=false,deleted=false;const remote=new Map(),posts=[];
const c={console:{warn(){}},CustomEvent:class{},queueMicrotask(){},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},window:{RIFT_DB_CONFIG:{enabled:true,functionUrl:'https://fixture.invalid',teamSlug:'fixture'},dispatchEvent(){}},fetch:async(url,o)=>{
 if(fail)throw Error('offline');let status=200;
 if(o.method==='POST'){const m=JSON.parse(o.body).match;posts.push(m);if(deleted)status=410;else remote.set(m.id,{id:m.id,payload:m});}
 return {ok:status===200,status,text:async()=>JSON.stringify(status===410?{error:'deleted'}:{matches:[...remote.values()]})};
}};
vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../shared-data.js','utf8'),c);
(async()=>{
 const shared=c.window.RiftSharedData;await shared.sync();assert.equal(posts.length,0);assert.equal(shared.localMatches().length,0);
 assert(memory.get('rs_match_cache_before_outbox_v2').includes(stale.id));
 fail=true;assert.equal((await shared.saveMatch({...stale,id:'new'})).cloud,false);
 assert.equal(JSON.parse(memory.get('rs_match_outbox_v2')).length,1);
 fail=false;await shared.sync();assert.equal(posts.length,1);assert.equal(JSON.parse(memory.get('rs_match_outbox_v2')).length,0);
 remote.clear();await shared.sync();assert.equal(posts.length,1,'remote deletion cannot be resurrected');
 fail=true;await shared.saveMatch({...stale,id:'gone'});fail=false;deleted=true;
 await shared.sync();assert.equal(JSON.parse(memory.get('rs_match_outbox_v2')).length,0);assert.equal(shared.localMatches().length,0);
 console.log('PASS: shared champion structure, per-player familiarity, unique practice roles, paused pools, visible errors, no deleted-match resurrection, offline outbox retry and 410 cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
