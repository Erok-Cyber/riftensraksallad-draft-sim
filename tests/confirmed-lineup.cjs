const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const {applyConfirmedLineup,preserveEvidence}=await import('../supabase/functions/rift-team-planner/plan-policy.mjs');
 const rows=['top','jungle','mid','adc','support'].map((role,i)=>({role,player:'P'+i,riotId:'P'+i+'#1'}));
 const game={id:'old',picks:[{player:'Old',champ:'Garen'}]};
 const plan={competitiveEvidence:{confirmedRoster:rows,currentRoster:[{player:'Old'}],games:[game]},challengermode:{registeredPlayers:[...rows.map(p=>({username:p.player,riotId:p.riotId})),{username:'Old',riotId:'Old#1'}]}};
 const result=applyConfirmedLineup(plan);
 assert.deepEqual(result.competitiveEvidence.currentRoster.map(p=>p.role),rows.map(p=>p.role));
 assert.equal(result.challengermode.substitutePlayers[0].username,'Old');
 assert.deepEqual(result.competitiveEvidence.games,[game]);
 assert.deepEqual(applyConfirmedLineup({...result,competitiveEvidence:{...result.competitiveEvidence,currentRoster:[{player:'Old'}]}}),result,'later CM sync cannot overwrite confirmation');
 assert.deepEqual(preserveEvidence({competitiveEvidence:{currentRoster:[{player:'Old'}]}},result).competitiveEvidence.currentRoster,result.competitiveEvidence.currentRoster,'stale browser save preserves confirmation');
 const invalid={competitiveEvidence:{confirmedRoster:[rows[0]]}};assert.equal(applyConfirmedLineup(invalid),invalid);
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/../scouting-lineup.js','utf8'),ctx);
 const lineup=ctx.window.RiftScouting.lineup(result);
 assert.deepEqual(Array.from(lineup,p=>p.player.riotId),rows.map(p=>p.riotId));
 assert(lineup.every(p=>p.source==='team-confirmed'&&p.roleConfidence===100));
 console.log('PASS: confirmed five survives CM refresh and stale saves, roles locked, prior games preserved, old starters become subs.');
})();
