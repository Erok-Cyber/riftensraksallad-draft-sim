/* Small, shared preparation helpers. No model calls, no inferred draft order. */
(()=>{'use strict';
 const roles=['top','jungle','mid','adc','support'];
 const profile=ch=>window.RiftProfiles?.get(ch);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stored=()=>{try{const a=JSON.parse(localStorage.getItem('rs_match_history')||'[]');return Array.isArray(a)?a:[];}catch{return [];}};
 function answerScore(ch,threat,rules=[],role){
  const own=profile(ch),enemy=profile(threat);let value=0,why='';
  for(const r of rules)if(r.role===role&&r.enemy.includes(threat)&&(r.boost[ch]||0)>value){value=r.boost[ch];why='Specifik kitregel';}
  if(!own||!enemy)return {value,why,unknown:!own||!enemy};
  const add=(n,label)=>{if(n>value){value=n;why=label;}};
  if(enemy.engage>=2&&enemy.tags.includes('melee')&&own.peel>=1.8)add(own.peel*3,'Skydd mot deras engage');
  if(enemy.front>=2&&own.tags.includes('antiTank'))add(8,'Anti-tank i profilen');
  if(enemy.tags.includes('zone')&&own.engage>=2)add(own.engage*2.5,'Kan nå deras zonkontroll');
  return {value,why,unknown:false};
 }
 function answers(threats,{map={},used=[],rules=[]}={}){
  const unavailable=new Set(used.map(c=>c.toLowerCase()));
  return threats.map(t=>{
   const player=window.RiftRoster?.player(t.role),pool=map[t.role]?[map[t.role]]:(player?.pool||[]).filter(c=>!(player.paused||[]).includes(c)&&!unavailable.has(c.toLowerCase()));
   const safe=pool.filter(c=>(player?.comfort?.[c]??5)>=7).map(ch=>({ch,comfort:player.comfort[ch],...answerScore(ch,t.champ,rules,t.role)})).filter(a=>a.value>=5).sort((a,b)=>b.value-a.value||b.comfort-a.comfort);
   return {...t,answer:safe[0]||null,unknown:!profile(t.champ),label:safe[0]?safe[0].ch+' · '+safe[0].why:!profile(t.champ)?'Okänd hotprofil – inget styrkt svar':'Inget tryggt kitbaserat svar i denna roll'};
  });
 }
 function warnings(plan,stats,lineup=[],initialRoster){
  const out=[],age=d=>(Date.now()-Date.parse(d))/86400000;
  if(!stats?.hasData)out.push('Metadata saknas.');
  else if(stats.fallback||stats.patch!==stats.metaPatch||age(stats.updated)>14)out.push('Metadata är gammal eller avser en annan patch.');
  if(plan){
   if(!plan.scoutingUpdatedAt||!Number.isFinite(age(plan.scoutingUpdatedAt))||age(plan.scoutingUpdatedAt)>14)out.push('Scouting saknas eller är äldre än 14 dagar.');
   if(plan.competitiveEvidence?.rosterChanged)out.push('Motståndarnas roster har ändrats.');
   if(lineup.length!==5||lineup.some(p=>p.source!=='challengermode'))out.push('Alla fem starters/roller är inte tävlingsbekräftade.');
  }else out.push('Inget motståndarlag valt.');
  if(initialRoster&&initialRoster!==JSON.stringify(window.RiftRoster?.snapshot().active))out.push('Er aktiva femma har ändrats sedan draftförberedelsen.');
  return out;
 }
 function flexRoles(ch){return roles.filter(r=>{const p=window.RiftRoster?.player(r);return p?.pool.includes(ch)&&!(p.paused||[]).includes(ch)&&(p.comfort[ch]??5)>=7&&profile(ch)?.roles?.includes(r);});}
 window.RiftDraftContext={roles,esc,stored,answerScore,answers,warnings,flexRoles};
})();
