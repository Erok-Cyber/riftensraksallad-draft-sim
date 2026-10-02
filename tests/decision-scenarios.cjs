// Fixed decision scenarios; offline, no real match or roster writes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const original=fs.readFileSync(__dirname+'/brain-regression.cjs','utf8');
const harness=vm.runInNewContext(original.slice(0,original.indexOf('const brain=harness'))+'\nharness',{require,__dirname,console,URLSearchParams,AbortController,AbortSignal});
const h=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
h.run('userSide="blue";events=[];step=6;');
// Explicit turn windows: no urgency between consecutive own picks or on last pick.
h.run('draftOrder.splice(0,draftOrder.length,{side:"blue",type:"pick"},{side:"blue",type:"pick"});step=0;');
const urgency=()=>h.run('aiPickUrgency({ch:"Xin Zhao",role:"jungle",score:100},[{ch:"Lillia",role:"jungle",score:98}])');
assert.equal(urgency().points,0);
h.run('draftOrder.splice(0,draftOrder.length,{side:"blue",type:"pick"},{side:"red",type:"ban"},{side:"blue",type:"pick"});');
assert.equal(urgency().points,5,'low-comfort Lillia is not a safe substitute');
h.run('comfort.jungle.Lillia=8');assert.equal(urgency().points,0);
h.run('comfort.jungle.Lillia=4;step=2');assert.equal(urgency().points,0);
h.run('step=0');
assert.equal(h.run('aiPickUrgency({ch:"Lillia",role:"jungle",score:100},[]).points'),0);
// Comp fit uses the active player, role and comfort everywhere.
h.run('window.RiftRoster.select("support","jacob-support")');
const fit=h.run('window.RiftRoster.compFit("EARLY SKIRMISH",{support:"Braum"})');assert(fit>0);
h.run('window.RiftRoster.setComfort("support","Braum",3)');
assert(h.run('window.RiftRoster.compFit("EARLY SKIRMISH",{support:"Braum"})')<fit);
h.run('window.RiftRoster.pauseChampion("support","Braum",true)');
assert.equal(h.run('window.RiftRoster.compFit("EARLY SKIRMISH",{support:"Braum"})'),0);
assert.equal(h.run('window.RiftRoster.compFit("EARLY SKIRMISH",{mid:"Braum"})'),0);
assert.equal(h.run('JSON.stringify(compRankings())'),h.run('JSON.stringify(aiCompRankForMap(ownRoleMap()))'));
const p=harness(['app.js']);
assert.equal(p.run('bestComp(["Renekton","Xin Zhao","Ahri","Ashe","Nautilus"]).name'),'EARLY SKIRMISH');
assert.equal(p.run('bestComp(["Malphite","Jarvan IV","Annie","Jinx","Leona"]).name'),'PRESS R');
assert.equal(p.run('window.RiftProfiles.assess([{role:"support",champ:"Galio"}]).damage'),0);
// A scouted dive pool exposes an unprotected trio, without writing enemy events.
h.run('window.RiftOpponent={prospects:()=>[{champ:"Vi",role:"jungle",weight:1}],key:()=>"fixture"}');
const before=h.run('JSON.stringify(events)');
assert(h.run('aiResponseRisk({top:"Renekton",jungle:"Graves",adc:"Jinx"})')>0);
assert.equal(h.run('aiResponseRisk({top:"Renekton",jungle:"Graves",adc:"Jinx",support:"Braum"})'),0);
assert.equal(h.run('JSON.stringify(events)'),before);
h.run('window.RiftOpponent=null');assert.equal(h.run('aiResponseRisk({top:"Renekton",jungle:"Graves",adc:"Jinx"})'),0);
// Short final plan stays usable offline and contains all five instructions.
h.run('events=[{type:"pick",side:"blue",role:"support",champ:"Leona"},{type:"pick",side:"blue",role:"adc",champ:"Jinx"}]');
const plan=h.run('shortLoadingPlan({comp:"PRESS R",behind:"Ta säkra waves."})');
for(const key of ['plan','fight','protect','watch','behind'])assert.equal(typeof plan[key],'string');
assert(plan.fight.includes('Leona'));assert(plan.protect.includes('Jinx'));
console.log('PASS: consecutive picks, ban exposure, comfort alternatives, shared comp fit, role safety, scouted response risk, isolated predictions and five-point final plan.');
