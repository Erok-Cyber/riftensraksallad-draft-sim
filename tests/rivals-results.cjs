const assert=require('node:assert/strict');
(async()=>{
 const {seriesHistory}=await import('../supabase/functions/rift-team-planner/rivals-history.mjs');
 const member=id=>({user:{id,username:id}});
 const win=(number,value)=>({name:'Win',serializedValue:value,lineup:{number}});
 const game=(side,won)=>({id:'g'+side,state:'COMPLETED',lineups:[{number:side,members:[member('ours')]},{number:1-side,members:[member('theirs')]}],results:{final:true,lineupResults:[{lineupNumber:0,score:null,placement:null},{lineupNumber:1,score:null,placement:null}]},statistics:{gameSessionStatistics:{lineupStatistics:{nodes:[win(side,won?'True':'False'),win(1-side,won?'False':'True')]}}}});
 const series={id:'s',lineups:[{name:'Us',members:[member('ours')]},{name:'Them',members:[member('theirs')]}],matches:[game(0,true),game(1,false)]};
 const result=()=>seriesHistory(series,'Us').games.map(g=>g.result);
 assert.deepEqual(result(),['win','loss'],'same player, opposite side, real W/L');
 series.matches[0].statistics.gameSessionStatistics.lineupStatistics.nodes=[{name:'Kills',serializedValue:'40',lineup:{number:0}}];assert.equal(result()[0],'','kills never imply a win');
 series.matches[0]=game(0,true);series.matches[0].statistics.gameSessionStatistics.lineupStatistics.nodes.push(win(0,'False'));assert.equal(result()[0],'','conflicting flags stay unknown');
 series.matches[0]=game(0,true);series.matches[0].statistics.gameSessionStatistics.lineupStatistics.nodes[1]=win(1,'True');assert.equal(result()[0],'','both teams cannot win');
 series.matches[0]=game(0,true);series.matches[0].results.final=false;assert.equal(result()[0],'');
 series.matches[0]=game(0,true);
 series.matches[0].statistics.gameSessionStatistics.lineupStatistics.nodes=[{...win(1,'True'),lineup:{number:1,members:[member('ours')]}},{...win(0,'False'),lineup:{number:0,members:[member('theirs')]}}];assert.equal(result()[0],'win','statistic membership takes precedence over a side number');
 series.matches[0]=game(0,true);delete series.matches[0].statistics;series.matches[0].results.lineupResults=[{lineupNumber:0,score:1},{lineupNumber:1,score:0}];assert.equal(result()[0],'win','administrative recorded score remains usable');
 console.log('PASS: real team Win fields, side swaps, loss, missing/contradictory data, final status and administrative score fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
