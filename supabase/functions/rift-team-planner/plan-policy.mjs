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
  return {...incoming,administrativeGames:stored?.administrativeGames||[],seriesReview:incoming.seriesReview||stored?.seriesReview||null,
    competitiveEvidence:games.length?{...(stored?.competitiveEvidence||{}),...(incoming.competitiveEvidence||{}),games}:incoming.competitiveEvidence};
}
