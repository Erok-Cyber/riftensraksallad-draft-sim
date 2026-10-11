const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/brain-regression.cjs','utf8');
const harness=vm.runInNewContext(src.slice(0,src.indexOf('const brain=harness'))+'\nharness',{require,__dirname,console,URLSearchParams,AbortController,AbortSignal});
const h=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
h.run('userSide="blue";events=[];step=6');
assert.equal(h.run('aiCompPreference({},"TEAMFIGHT CONTROL")'),12);
assert.equal(h.run('aiCompPreference({},"EARLY SKIRMISH")'),12);
assert.equal(h.run('aiCompPreference({},"PRESS R")'),0);
h.run('events=[{type:"pick",side:"blue",role:"jungle",champ:"Jarvan IV"},{type:"pick",side:"blue",role:"mid",champ:"Viktor"}]');
assert.equal(h.run('desiredComp()'),'TEAMFIGHT CONTROL');
assert(h.run('buildFinalGameplan().mid.includes("Jarvan")'));
assert(!h.run('window.RiftRoster.compOptions()["TEAMFIGHT CONTROL"].top.includes("Sion")'));
assert.equal(h.run('JSON.stringify(window.RiftRoster.compOptions()["TEAMFIGHT CONTROL"].mid.sort())'),JSON.stringify(['Annie','Hwei','Taliyah','Viktor']));
const old=h.run('aiRoleCandidates("adc").find(c=>c.ch==="Xayah").score-aiRoleCandidates("adc").find(c=>c.ch==="Jinx").score');
h.run('events.push({type:"pick",side:"red",champ:"Vi",role:"jungle"},{type:"pick",side:"red",champ:"Malphite",role:"top"})');
const dive=h.run('aiRoleCandidates("adc").find(c=>c.ch==="Xayah").score-aiRoleCandidates("adc").find(c=>c.ch==="Jinx").score');
assert(dive>old,'enemy dive must improve Xayah relative to Jinx');
h.run('window.RiftRoster.select("support","jacob-support")');
assert(h.run('window.RiftRoster.compOptions()["TEAMFIGHT CONTROL"].support.includes("Braum")'));
h.run('window.RiftRoster.pauseChampion("support","Braum",true)');assert(!h.run('window.RiftRoster.compOptions()["TEAMFIGHT CONTROL"].support.includes("Braum")'));
h.run('events=[{type:"ban",side:"red",champ:"Viktor"}]');assert.equal(h.run('aiCompPreference({},"TEAMFIGHT CONTROL")'),12);
h.run('events.push({type:"ban",side:"blue",champ:"Hwei"})');assert.equal(h.run('aiCompPreference({},"TEAMFIGHT CONTROL")'),12,'Annie/Taliyah keep the main plan open');
h.run('events.push({type:"ban",side:"red",champ:"Annie"},{type:"ban",side:"blue",champ:"Taliyah"})');assert.equal(h.run('aiCompPreference({},"TEAMFIGHT CONTROL")'),0);assert.equal(h.run('aiCompPreference({},"PRESS R")'),0,'early plan still available');
h.run('events=[{type:"pick",side:"blue",role:"mid",champ:"Vex"},{type:"pick",side:"blue",role:"top",champ:"Shen"}]');assert.equal(h.run('aiCompPreference(ownRoleMap(),"PRESS R")'),8);
const p=harness(['app.js']);assert.equal(p.run('bestComp(["Malphite","Jarvan IV","Viktor","Jinx","Nautilus"]).name'),'TEAMFIGHT CONTROL');
p.run('openCompGuide("TEAMFIGHT CONTROL")');assert.equal(p.elements.get('compGuideTitle').textContent,'Teamfight Control');
(async()=>{const policy=await import('../supabase/functions/rift-draft-coach/policy.mjs');const d=policy.sanitizeDraft({side:'blue',events:[],pools:{mid:['Hwei']},compOptions:{'TEAMFIGHT CONTROL':{mid:['Hwei','Ahri']}},candidates:[{ch:'Garen'}]});assert.deepEqual(d.compOptions['TEAMFIGHT CONTROL'].mid,['Hwei']);assert(d.comps.includes('TEAMFIGHT CONTROL'));console.log('PASS: two primary comps, Jarvan/mage identity, contextual Xayah, active subs, paused champs, fallback gates, guide and AI payload.');})().catch(e=>{console.error(e);process.exitCode=1;});

const options=harness(['live.js','advanced-engine.js','draft-ai.js','team-roster.js']);
options.run('userSide="blue";events=[];step=6;window.RiftRoster.addChampion("jungle","Maokai");window.RiftRoster.setComfort("jungle","Maokai",8)');
assert(options.run('window.RiftRoster.compOptions()["TEAMFIGHT CONTROL"].jungle.includes("Maokai")'));
for(const jungle of ['Jarvan IV','Wukong','Maokai','Xin Zhao']){
  for(const mid of ['Viktor','Hwei','Annie','Taliyah']){
    const map={top:'Malphite',jungle,mid,adc:'Jinx',support:'Nautilus'};
    assert(options.run('aiPrimaryViable('+JSON.stringify(map)+',"TEAMFIGHT CONTROL")'),jungle+' / '+mid+' must remain valid');
    const plan=options.run('teamfightControlPlan('+JSON.stringify(map)+')');
    assert(plan.fight.includes(jungle==='Jarvan IV'?'Jarvan':jungle==='Xin Zhao'?'Xin':jungle));
    assert(plan.fight.includes(mid));
    if(jungle!=='Jarvan IV')assert(!JSON.stringify(plan).includes('Jarvan'),'no absent Jarvan in gameplan');
  }
}
assert(options.run('teamfightControlPlan({jungle:"Xin Zhao",top:"Garen",support:"Braum",mid:"Viktor"}).fight.includes("saknar säker start")'));
options.run('window.RiftRoster.pauseChampion("jungle","Maokai",true)');
assert(!options.run('window.RiftRoster.compOptions()["TEAMFIGHT CONTROL"].jungle.includes("Maokai")'));
options.run('window.RiftRoster.pauseChampion("jungle","Maokai",false);events=[];aiEnsureContext()');
const comfortable=options.run('aiCandidate("Maokai","jungle").score');
options.run('window.RiftRoster.setComfort("jungle","Maokai",3);aiEnsureContext()');
assert(options.run('aiCandidate("Maokai","jungle").score')<comfortable,'saved comfort must affect the new jungle alternative');
console.log('PASS: all 16 mid/jungle combinations, actual-pick plans, Xin setup warning, Maokai pause and comfort.');
