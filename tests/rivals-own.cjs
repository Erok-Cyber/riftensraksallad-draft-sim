const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {ownTeamHistoryPlan,seriesHistory}=await import('../supabase/functions/rift-team-planner/rivals-history.mjs');
 const source={opponent:'Enemy',challengermode:{tournamentId:'known-tournament',teamName:'Enemy',series:[{id:'enemy-series'}]}};
 const own=ownTeamHistoryPlan(source);assert.equal(own.challengermode.tournamentId,'known-tournament');assert.equal(own.challengermode.teamName,'Riftens Räksallad');assert.deepEqual(own.challengermode.series,[]);assert.equal(source.challengermode.teamName,'Enemy');
 assert.equal(seriesHistory({lineups:[{name:'Enemy'}]},own.opponent),null);
 assert(fs.readFileSync('rivals-history.js','utf8').includes("if(plan.isOwnTeam)url.searchParams.set('own','1')"));
 assert(fs.readFileSync('rivals-page.js','utf8').includes("sourcePlanId:source.id"));
 console.log('PASS: own-team uses known tournament, exact team identity, no opponent fallback or source mutation');
})().catch(e=>{console.error(e);process.exitCode=1});
