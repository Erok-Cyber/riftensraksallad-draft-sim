// Preserve manually verified scouting and keep post-match edits scoped to review fields.
export function mergeReview(plan,raw,now=new Date().toISOString()){
  const review={};
  for(const key of ['result','worked','difficult','next'])review[key]=String(raw?.[key]??'').trim().slice(0,key==='result'?40:600);
  if(!Object.values(review).some(Boolean))throw new Error('Svara på minst en fråga.');
  return {...plan,status:'completed',seriesReview:{...review,updatedAt:now}};
}
export function preserveEvidence(incoming,stored){
  const fingerprint=g=>JSON.stringify([g.playedAt||'',g.duration||'',g.result||'',(g.picks||[]).map(p=>[p.riotId||p.player,p.champ]).sort()]);
  const rows=[...(stored?.competitiveEvidence?.games||[]).filter(g=>g.source==='manual-screenshot'),...(incoming?.competitiveEvidence?.games||[])];
  const ids=new Set(),signatures=new Set();
  const games=rows.filter(g=>{const f=g.playedAt&&g.duration?fingerprint(g):null;if((g.id&&ids.has(g.id))||(f&&signatures.has(f)))return false;if(g.id)ids.add(g.id);if(f)signatures.add(f);return true;});
  return applyConfirmedLineup({...incoming,administrativeGames:stored?.administrativeGames||[],seriesReview:incoming.seriesReview||stored?.seriesReview||null,
    competitiveEvidence:{...(stored?.competitiveEvidence||{}),...(incoming.competitiveEvidence||{}),confirmedRoster:stored?.competitiveEvidence?.confirmedRoster||incoming.competitiveEvidence?.confirmedRoster,...(games.length?{games}:{})}});
}

// A match-specific, explicitly confirmed five takes precedence over the last played lineup.
export function applyConfirmedLineup(plan){
  const rows=plan?.competitiveEvidence?.confirmedRoster;
  const roles=['top','jungle','mid','adc','support'];
  if(!Array.isArray(rows)||rows.length!==5||roles.some(role=>rows.filter(p=>p.role===role).length!==1)||rows.some(p=>!p.riotId||!p.player)||new Set(rows.map(p=>p.riotId.toLowerCase())).size!==5)return plan;
  const currentRoster=roles.map(role=>({...rows.find(p=>p.role===role),confirmedBy:'team'}));
  const cm=plan.challengermode||{};
  const registered=cm.registeredPlayers||[];
  const activePlayers=currentRoster.map(row=>({...registered.find(p=>p.riotId?.toLowerCase()===row.riotId.toLowerCase()),username:row.player,riotId:row.riotId,role:row.role}));
  const substitutePlayers=registered.filter(p=>!currentRoster.some(row=>row.riotId.toLowerCase()===p.riotId?.toLowerCase()));
  return {...plan,competitiveEvidence:{...plan.competitiveEvidence,currentRoster,substitutes:substitutePlayers.map(p=>({player:p.username,riotId:p.riotId,role:p.role||''}))},challengermode:{...cm,activePlayers,activeRoster:activePlayers.map(p=>p.username),substitutePlayers,substitutes:substitutePlayers.map(p=>p.username),activeRiotIdsResolved:5}};
}

