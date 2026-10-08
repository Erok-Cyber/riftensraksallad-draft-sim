// Live history affects scouting without changing saved plans or trusting inferred roles.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const original=fs.readFileSync(__dirname+'/brain-regression.cjs','utf8');
const harness=vm.runInNewContext(original.slice(0,original.indexOf('const brain=harness'))+'\nharness',{require,__dirname,console,URLSearchParams,AbortController,AbortSignal});
const plan={id:'rivals-test',status:'upcoming',opponent:'Test',challengermode:{},competitiveEvidence:{currentRoster:[{player:'Starter',riotId:'Main#1',role:'jungle'}],games:[{id:'game-1',picks:[{player:'Starter',champ:'Wukong'}]}]},scoutingPlayers:[]};
const h=harness(['live.js','advanced-engine.js','draft-ai.js','scouting-lineup.js','brain-opponent.js'],{'rs_brain_opponent':plan.id});
let finish,calls=0;
h.context.window.RIFT_DB_CONFIG={plannerFunctionUrl:"https://example.test/planner"};
h.context.fetch=async()=>({ok:true,json:async()=>({plans:[{payload:plan}]})});
h.context.window.RiftRivals={mount(){},load:()=>{calls++;return new Promise(resolve=>finish=resolve);}};
(async()=>{
  await h.fire('document','DOMContentLoaded');
  assert.equal(calls,1,'selected opponent preloads without opening the history dropdown');
  const key=h.run('window.RiftOpponent.key()');
  const saved=h.run('JSON.stringify(window.RiftOpponent.active())');
  finish({series:[{playedAt:'2026-10-01',games:[
    {id:'game-1',picks:[{player:'Starter',champ:'Wukong'}]},
    {id:'game-2',picks:[{player:'Starter',champ:"Cho\'Gath"},{player:'Sub',champ:'Nocturne'}]}
  ]}]});
  await new Promise(resolve=>setImmediate(resolve));
  h.run('userSide="blue";step=0;events=[]');
  assert.notEqual(h.run('window.RiftOpponent.key()'),key,'new evidence invalidates engine/AI caches');
  assert.equal(h.run('JSON.stringify(window.RiftOpponent.active())'),saved,'read-only evidence does not alter saved plans');
  assert.equal(h.run('window.RiftOpponent.scouting().find(r=>r.champ==="Wukong").cm'),1,'same game not double counted');
  assert(h.run('banRecommendations().includes("Cho\'Gath")'),'actual tournament picks can be outside generic role pools');
  assert(!h.run('banRecommendations().includes("Nocturne")'),'sub not promoted to starter');
  h.run('events=[{side:"red",type:"pick",champ:"Ivern",role:"jungle"}]');
  assert.equal(h.run('banRecommendations().length'),0,'live evidence still respects revealed roles');
  assert.equal(calls,1,'rendering does not repeat history requests');
  console.log('PASS: automatic Rivals evidence, cache refresh, exact starters, deduplication, read-only plans and filled-role bans.');
})().catch(e=>{console.error(e);process.exitCode=1;});
