// node scripts/audit-drafts.cjs exported-matches.json
// Re-evaluate recorded prefixes with today's engine/default pool, without result leakage.
// This checks invariants, not whether a different pick would have won the game.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
if(!process.argv[2])throw Error('Provide a JSON export containing matches.');
const dir=path.join(__dirname,'../tests');
const source=fs.readFileSync(path.join(dir,'brain-regression.cjs'),'utf8');
const harness=vm.runInNewContext(source.slice(0,source.indexOf('const brain=harness'))+'\nharness',{require,__dirname:dir,console,URLSearchParams,AbortController,AbortSignal});
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));let checked=0,skipped=0,positions=0,maxMs=0;
for(const row of input.matches||input){
 const match=row.payload||row;let recorded;
 try{recorded=JSON.parse(match.draftContext?.key||'null');}catch{}
 if(!Array.isArray(recorded?.[1])||recorded[1].length!==20){skipped++;continue;}
 const h=harness(['live.js','advanced-engine.js','draft-ai.js']);
 h.run('location.search="?replay=1"');
 h.context.auditSide=recorded[0];h.run('userSide=auditSide');
 const events=recorded[1].map(([type,side,champ,role])=>({type,side,champ,role}));
 for(let i=0;i<events.length;i++){
  if(events[i].side!==recorded[0]||events[i].type!=='pick')continue;
  h.context.prefix=events.slice(0,i);h.context.position=i;h.run('events=prefix;step=position');
  const before=h.run('JSON.stringify(events)'),start=performance.now();
  const choices=h.run('aiDecision()');maxMs=Math.max(maxMs,performance.now()-start);
  if(choices.some(c=>!Number.isFinite(c.total)||events.slice(0,i).some(e=>e.champ===c.ch)))throw Error('Invalid candidate at '+match.id+':'+i);
  if(h.run('JSON.stringify(events)')!==before)throw Error('Simulation mutated draft');
  positions++;
 }
 checked++;
}
console.log(JSON.stringify({checked,skipped,positions,maxMs:Math.round(maxMs),scope:'Recorded order, current default pools; no current opponent scouting or match results supplied. Not a win-rate validation.'},null,2));
