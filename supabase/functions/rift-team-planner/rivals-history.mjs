// Read-only projection: never infer tournament picks from solo queue or lineup order.
const clean=(v,n=120)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const key=v=>clean(v).toLowerCase();
function statNumber(stats,names){
  const values=stats.filter(s=>names.includes(key(s.name).replace(/[^a-z]/g,''))).map(s=>{
    let v=s.serializedValue;try{v=JSON.parse(v);}catch{}
    return typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
  }).filter(v=>v!==null);
  return values.length&&new Set(values).size===1?values[0]:null;
}
export function seriesHistory(series,teamName,champions=new Map()){
  const target=(series.lineups||[]).find(l=>key(l.name)===key(teamName));
  if(!target)return null;
  const ids=new Set((target.members||[]).map(m=>m.user?.id).filter(Boolean));
  const rivals=(series.lineups||[]).filter(l=>l!==target).map(l=>clean(l.name));
  const names=new Map([...champions.values()].map(n=>[key(n).replace(/[^a-z0-9]/g,''),n]));
  function champion(stat){
    if(!/^champion(name|id)?$/i.test(stat.name||''))return '';
    for(let v of [stat.formattedValue,stat.serializedValue]){
      try{v=JSON.parse(v);}catch{}
      if(v&&typeof v==='object')v=v.name??v.championName??v.championId??v.id;
      const token=key(v).replace(/[^a-z0-9]/g,'');
      const aliases={monkeyking:'wukong',renata:'renataglasc',nunu:'nunuwillump'};
      const found=champions.get(Number(v))||names.get(token)||names.get(aliases[token]);
      if(found)return found;
    }
    return '';
  }
  const games=(series.matches||[]).filter(m=>m.state==='COMPLETED').map((m,index)=>{
    // IDs, not approximate display names, connect the team's members to each game.
    const ranked=(m.lineups||[]).map(l=>({l,n:(l.members||[]).filter(p=>ids.has(p.user?.id)).length})).sort((a,b)=>b.n-a.n);
    const lineup=ranked[0]?.n>0&&ranked[0].n>(ranked[1]?.n||0)?ranked[0].l:null;
    const members=lineup?.members||[],picks=[];
    const stats=m.statistics?.gameSessionStatistics?.competitorStatistics;
    const measurements=members.map(member=>{
      const own=(stats?.nodes||[]).filter(s=>s.competitor?.user?.id===member.user?.id);
      return {id:member.user?.id,kills:statNumber(own,['kills','championskilled']),
        deaths:statNumber(own,['deaths','numdeaths']),assists:statNumber(own,['assists']),
        damage:statNumber(own,['totaldamagedealttochampions','damagedealttochampions']),
        gold:statNumber(own,['goldearned','totalgoldearned'])};
    });
    const total=field=>measurements.length===5&&measurements.every(p=>p[field]!==null)?measurements.reduce((n,p)=>n+p[field],0):null;
    for(const member of members){
      const own=(stats?.nodes||[]).filter(s=>s.competitor?.user?.id===member.user?.id);
      const champ=own.map(champion).find(Boolean);
      if(champ){
        const p=measurements.find(p=>p.id===member.user?.id),performance={};
        for(const field of ['kills','deaths','assists'])if(p[field]!==null)performance[field]=p[field];
        const damage=total('damage'),gold=total('gold'),kills=total('kills');
        if(damage>0)performance.damageShare=Math.min(1,p.damage/damage);
        if(gold>0)performance.goldShare=Math.min(1,p.gold/gold);
        if(kills>0&&p.kills!==null&&p.assists!==null)performance.killParticipation=Math.min(1,(p.kills+p.assists)/kills);
        // Bounded within-team contribution signal, NOT a skill or win-probability estimate.
        const signals=[];
        if(performance.damageShare!=null)signals.push(Math.min(1,Math.max(0,(performance.damageShare-.2)/.2)));
        if(performance.goldShare!=null)signals.push(Math.min(1,Math.max(0,(performance.goldShare-.2)/.15)));
        if(performance.killParticipation!=null)signals.push(Math.min(1,Math.max(0,(performance.killParticipation-.5)/.4)));
        if(signals.length>=2&&!stats?.pageInfo?.hasNextPage)performance.impact=signals.reduce((n,v)=>n+v,0)/signals.length;
        picks.push({player:clean(member.user.username),champ,...(Object.keys(performance).length?{performance}:{})});
      }
    }
    const results=m.results?.lineupResults||[];
    const own=results.find(r=>r.lineupNumber===lineup?.number),other=results.find(r=>r.lineupNumber!==lineup?.number);
    const valid=lineup&&own?.score!=null&&other?.score!=null;
    const placed=lineup&&own?.placement!=null&&other?.placement!=null;
    const recorded=placed?(own.placement<other.placement?'win':own.placement>other.placement?'loss':'draw'):valid?(own.score>other.score?'win':own.score<other.score?'loss':'draw'):'';
    // LoL game results often have null scores/placements. The game's team-level
    // Win statistic carries the actual outcome; side numbers can swap each game.
    const winStats=m.statistics?.gameSessionStatistics?.lineupStatistics?.nodes||[];
    const flag=team=>{
      const memberIds=new Set((team.members||[]).map(m=>m.user?.id).filter(Boolean));
      const values=winStats.filter(s=>s.name==='Win'&&(s.lineup?.members?.length
        ?s.lineup.members.some(m=>memberIds.has(m.user?.id))
        :s.lineup?.number===team.number))
        .map(s=>key(s.serializedValue??s.formattedValue)).filter(v=>v==='true'||v==='false');
      return values.length&&new Set(values).size===1?values[0]:null;
    };
    const ownWin=lineup?flag(lineup):null;
    const opponentLineup=(m.lineups||[]).find(l=>l.number!==lineup?.number);
    const enemyWin=opponentLineup?flag(opponentLineup):null;
    const statResult=ownWin&&(!enemyWin||enemyWin!==ownWin)?(ownWin==='true'?'win':'loss'):'';
    const conflict=(ownWin&&enemyWin&&ownWin===enemyWin)||(statResult&&recorded&&statResult!==recorded);
    const result=m.results?.final===false||conflict?'':statResult||recorded;
    return {id:clean(m.id),number:index+1,picks,result,partial:!!stats?.pageInfo?.hasNextPage};
  });
  return {id:clean(series.id),team:clean(target.name),opponent:rivals.join(' / '),title:clean(series.title),playedAt:series.startedAt||'',games};
}


// Fixed own-team projection: reuse a known tournament, never opponent cached series.
export function ownTeamHistoryPlan(plan){
  return {opponent:'Riftens Räksallad',challengermodeTeamName:'Riftens Räksallad',
    challengermode:{tournamentId:plan.challengermode?.tournamentId,teamName:'Riftens Räksallad',series:[]}};
}
