const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/brain-regression.cjs','utf8');
const harness=vm.runInNewContext(src.slice(0,src.indexOf('const brain=harness'))+'\nharness',{require,__dirname,console,URLSearchParams,AbortController,AbortSignal});
const h=harness(['live.js','advanced-engine.js','draft-ai.js']);
for(const events of [[],[{side:'red',type:'pick',role:'jungle',champ:'Vi'},{side:'red',type:'pick',role:'top',champ:'Malphite'}],[{side:'blue',type:'pick',role:'adc',champ:'Jinx'},{side:'blue',type:'pick',role:'mid',champ:'Viktor'}]]){
 h.context.prefix=events;h.run('userSide="blue";events=prefix;step=10;aiEnsureContext()');
 for(const c of h.run('aiDecision()')){
  h.context.candidate=c;const audit=h.run('aiScoreAudit(candidate)');
  assert(audit.valid,c.ch+' must account for every point');
  assert.equal(audit.rows.reduce((s,r)=>s+r.units,0)+audit.rounding,Math.round(c.total*100));
 }
}
h.run('window.RiftStats={scoreChampion:()=>({available:true,points:.37,reasons:["annotation 1","annotation 2"]})};aiContextKey="";aiEnsureContext()');
assert(h.run('aiDecision().every(c=>aiScoreAudit(c).valid)'),'metadata annotations must not be counted as points');
h.run('testMode=false;renderScoreAudit(aiDecision().slice(0,3))');assert.equal(h.elements.get('scoreBreakdown').hidden,true);
h.run('testMode=true;renderScoreAudit(aiDecision().slice(0,3))');assert.equal(h.elements.get('scoreBreakdown').hidden,false);
h.run('renderScoreAudit([])');assert.equal(h.elements.get('scoreBreakdown').hidden,true);
console.log('PASS: full score ledger, metadata annotations, exact displayed sums, pick timing and Test Mode isolation.');
