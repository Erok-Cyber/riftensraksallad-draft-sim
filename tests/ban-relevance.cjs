const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/brain-regression.cjs','utf8');
const harness=vm.runInNewContext(source.slice(0,source.indexOf('const brain=harness'))+'\nharness',{require,__dirname,console,URLSearchParams,AbortController,AbortSignal});
const h=harness(['live.js','advanced-engine.js','draft-ai.js']);
for(const side of ['blue','red']){
 h.run(`userSide='${side}';step=${side==='blue'?13:12};events=[{side:'${side==='blue'?'red':'blue'}',type:'pick',champ:'Ahri',role:'mid'}];banBase.Syndra=99999;`);
 assert(!h.run('banRecommendations()').includes('Syndra'),'filled mid must beat even extreme ban scores');
 assert.equal(h.run('banIsRelevant("Syndra")'),false);
 assert.equal(h.run('banIsRelevant("Aurora")'),true,'top remains open for a genuine flex');
 assert(h.run('generalBanReason("Aurora")').includes('TOP'));
 h.run(`events.push({side:'${side==='blue'?'red':'blue'}',type:'pick',champ:'Renekton',role:'top'});`);
 assert.equal(h.run('banIsRelevant("Aurora")'),false,'all credible flex roles filled');
 h.run('events.push({side:userSide,type:"ban",champ:"Nocturne"})');assert.equal(h.run('banIsRelevant("Nocturne")'),false);
}
h.run('userSide="blue";step=13;events=[{side:"red",type:"pick",champ:"Ahri"}];');
assert.equal(h.run('enemyRoleShown("mid")'),true);assert.equal(h.run('banIsRelevant("Syndra")'),false,'confident automatic mid read');
h.run('events=[{side:"red",type:"pick",champ:"Poppy"}];');assert.equal(h.run('banIsRelevant("Vi")'),true,'uncertain enemy flex must not falsely close jungle');
h.run('events=[{side:"red",type:"pick",champ:"Ahri",role:"mid"}];window.RiftGroq={refresh(){},recommendations:()=>[{ch:"Syndra"},{ch:"Nocturne"}]};renderRecommendation();');
assert(h.elements.get('recommendReason').textContent.includes('JUNGLE'),'last display gate removes invalid AI candidate');
console.log('PASS: both draft sides, filled mid, high-score regression, true flex roles, automatic role reads, ambiguous flex and AI display guard.');
