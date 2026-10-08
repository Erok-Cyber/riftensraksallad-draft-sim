const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const {seriesHistory}=await import('../supabase/functions/rift-team-planner/rivals-history.mjs');
 const member=(id,name)=>({user:{id,username:name}}),stat=(id,name,value)=>({name,serializedValue:value,competitor:{user:{id}}});
 const raw={id:'s',title:'Match 1',startedAt:'2026-10-02',lineups:[{name:'Crimson',members:[member('a','Starter')]},{name:'Other',members:[member('b','Enemy')]}],matches:[{id:'g',state:'COMPLETED',lineups:[{number:1,members:[member('b','Enemy')]},{number:0,members:[member('a','Starter')]}],results:{lineupResults:[{lineupNumber:0,placement:1},{lineupNumber:1,placement:2}]},statistics:{gameSessionStatistics:{competitorStatistics:{nodes:[stat('b','championId','103'),stat('a','championId','111'),stat('a','DamageDealtToChampions','103')],pageInfo:{hasNextPage:false}}}}}]};
 let row=seriesHistory(raw,'crimson',new Map([[103,'Ahri'],[111,'Nautilus']]));
 assert.deepEqual(row.games[0].picks,[{player:'Starter',champ:'Nautilus'}]);assert.equal(row.games[0].result,'win');assert.equal(row.opponent,'Other');
 raw.matches[0].statistics.gameSessionStatistics.competitorStatistics.nodes[1]=stat('a','ChampionName','MonkeyKing');
 assert.equal(seriesHistory(raw,'Crimson',new Map([[62,'Wukong']])).games[0].picks[0].champ,'Wukong');
 raw.matches[0].statistics.gameSessionStatistics.competitorStatistics.nodes[1]=stat('a','ChampionName','UnknownChampion');
 assert.equal(seriesHistory(raw,'Crimson',new Map([[103,'Ahri']])).games[0].picks.length,0,'damage statistics cannot become a champion ID');
 assert.equal(seriesHistory(raw,'Crim',new Map()),null,'partial team names must not select another team');
 assert.equal(seriesHistory(raw,'Crimson',new Map()).games[0].picks.length,0,'unknown champions are not invented');
 raw.matches[0].lineups[1].members=[member('c','Starter')];assert.equal(seriesHistory(raw,'Crimson',new Map([[111,'Nautilus']])).games[0].picks.length,0,'same username is not a matching user ID');
 const ctx={window:{},Map,Set,Date};vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('rivals-history.js','utf8').replace('window.RiftRivals={mount,load};','window.RiftRivals={mount,rows};'),ctx);
 const html=ctx.window.RiftRivals.rows({series:[{team:'<img>',opponent:'Other',games:[{number:1,result:'win',picks:[{champ:'Nautilus',player:'<script>'}]}]}]});
 assert(!html.includes('<img>'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('Vissa championval saknas'));assert(!html.includes('Förlust'));
 console.log('PASS: exact tournament identity, side swaps, observed champions only, unknown-team safety, escaped history and honest missing picks.');
})().catch(e=>{console.error(e);process.exitCode=1;});

