/* Small, shared preparation helpers. No model calls, no inferred draft order. */
(()=>{'use strict';
 const roles=['top','jungle','mid','adc','support'];
const matchupRules = [
  {enemy:["Tryndamere"],role:"top",boost:{"Renekton":22,"Malphite":24,"Shen":15}},
  {enemy:["Dr. Mundo"],role:"top",boost:{"Trundle":30,"Mordekaiser":22,"Darius":12}},
  {enemy:["Ornn","Sion","K'Sante","Malphite","Tahm Kench"],role:"top",boost:{"Trundle":24,"Mordekaiser":18,"Darius":12}},
  {enemy:["Lee Sin"],role:"jungle",boost:{"Xin Zhao":18,"Volibear":14,"Jarvan IV":10}},
  {enemy:["Nocturne"],role:"jungle",boost:{"Volibear":18,"Xin Zhao":14,"Vi":10}},
  {enemy:["Kog'Maw","Jinx","Aphelios"],role:"jungle",boost:{"Vi":26,"Jarvan IV":18,"Xin Zhao":8}},
  {enemy:["Nocturne","Vi","Jarvan IV","Wukong"],role:"mid",boost:{"Vex":22,"Taliyah":18,"Annie":8}},
  {enemy:["Nocturne","Vi","Jarvan IV","Wukong"],role:"adc",boost:{"Xayah":28,"Ashe":8}},
  {enemy:["Kog'Maw","Jinx","Aphelios"],role:"support",boost:{"Nautilus":22,"Leona":18,"Maokai":10}},
  {enemy:["Lulu","Milio","Janna"],role:"jungle",boost:{"Vi":16,"Jarvan IV":12}},
  {enemy:["Lulu","Milio","Janna"],role:"top",boost:{"Malphite":12,"Renekton":8}},
  {enemy:["Darius","Garen","Renekton","Mordekaiser","Olaf","Trundle"],role:"top",boost:{"Heimerdinger":10,"Renekton":8,"Olaf":8}}
];
 const profile=ch=>window.RiftProfiles?.get(ch);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stored=()=>{try{const a=JSON.parse(localStorage.getItem('rs_match_history')||'[]');return Array.isArray(a)?a:[];}catch{return [];}};
 function answerScore(ch,threat,rules=matchupRules,role){
  const own=profile(ch),enemy=profile(threat);let value=0,why='';
  for(const r of rules)if(r.role===role&&r.enemy.includes(threat)&&(r.boost[ch]||0)>value){value=r.boost[ch];why='Specifik kitregel';}
  if(!own||!enemy)return {value,why,unknown:!own||!enemy};
  const add=(n,label)=>{if(n>value){value=n;why=label;}};
  if(enemy.engage>=2&&enemy.tags.includes('melee')&&own.peel>=1.8)add(own.peel*3,'Skydd mot deras engage');
  if(enemy.front>=2&&own.tags.includes('antiTank'))add(8,'Anti-tank i profilen');
  if(enemy.tags.includes('zone')&&own.engage>=2)add(own.engage*2.5,'Kan nå deras zonkontroll');
  return {value,why,unknown:false};
 }
 function answers(threats,{map={},used=[],rules=matchupRules}={}){
  const unavailable=new Set(used.map(c=>c.toLowerCase()));
  return threats.map(t=>{
   const player=window.RiftRoster?.player(t.role),pool=map[t.role]?[map[t.role]]:(player?.pool||[]).filter(c=>!(player.paused||[]).includes(c)&&!unavailable.has(c.toLowerCase()));
   const safe=pool.filter(c=>(player?.comfort?.[c]??5)>=7).map(ch=>({ch,comfort:player.comfort[ch],...answerScore(ch,t.champ,rules,t.role)})).filter(a=>a.value>=5).sort((a,b)=>b.value-a.value||b.comfort-a.comfort);
   const unknown=!profile(t.champ)||(!safe.length&&pool.some(ch=>!profile(ch)));
   return {...t,answer:safe[0]||null,unknown,label:safe[0]?safe[0].ch+' · '+safe[0].why:unknown?'Okänd profil – inget styrkt svar':'Inget tryggt kitbaserat svar i denna roll'};
  });
 }
 function warnings(plan,stats,lineup=[],initialRoster){
  const out=[],age=d=>(Date.now()-Date.parse(d))/86400000;
  if(!stats?.hasData)out.push('Metadata saknas.');
  else if(stats.fallback||stats.patch!==stats.metaPatch||!Number.isFinite(age(stats.updated))||age(stats.updated)>14)out.push('Metadata är gammal, saknar datum eller avser en annan patch.');
  if(plan){
   if(!plan.scoutingUpdatedAt||!Number.isFinite(age(plan.scoutingUpdatedAt))||age(plan.scoutingUpdatedAt)>14)out.push('Scouting saknas eller är äldre än 14 dagar.');
   if(plan.competitiveEvidence?.rosterChanged)out.push('Motståndarnas roster har ändrats.');
   if(lineup.length!==5||lineup.some(p=>!['challengermode','team-confirmed'].includes(p.source)))out.push('Alla fem starters/roller är inte tävlingsbekräftade.');
  }else out.push('Inget motståndarlag valt.');
  if(initialRoster&&initialRoster!==JSON.stringify(window.RiftRoster?.snapshot().active))out.push('Er aktiva femma har ändrats sedan draftförberedelsen.');
  return out;
 }
 function flexRoles(ch){return roles.filter(r=>{const p=window.RiftRoster?.player(r);return p?.pool.includes(ch)&&!(p.paused||[]).includes(ch)&&(p.comfort[ch]??5)>=7&&profile(ch)?.roles?.includes(r);});}
 const rivalCache=new Map();
 const validMatch=m=>m&&m.id&&!m.testMode&&!m.deletedAt&&!m.walkover&&m.type!=='walkover'&&['win','loss'].includes(m.result);
 const matches=()=>[...new Map(stored().filter(validMatch).map(m=>[m.id,m])).values()].sort((a,b)=>(Date.parse(a.savedAt)||0)-(Date.parse(b.savedAt)||0));
 const seriesId=m=>String(m.series?.id||m.draftContext?.series?.id||'');
 const series=plan=>plan?.id?matches().filter(m=>seriesId(m)===String(plan.id)):[];
 const sameOpponent=(m,plan)=>!!plan&&(seriesId(m)===String(plan.id)||String(m.series?.opponent||m.draftContext?.series?.opponent||'').trim().toLowerCase()===String(plan.opponent||'!').trim().toLowerCase());
 function timeline(m){
  if(Array.isArray(m.draftTimeline)&&m.draftTimeline.length)return m.draftTimeline;
  try{const k=JSON.parse(m.draftContext?.key||'null');if(['blue','red'].includes(k?.[0])&&k[1]?.length===20)return k[1].map(([type,side,champ,role])=>({type,side,champ,role}));}catch{}
  return [];
 }
 function tendencies(plan){
  const rows=matches().filter(m=>sameOpponent(m,plan)),sides={blue:{games:0,first:{},bans:{}},red:{games:0,first:{},bans:{}}},against={},swaps=[],replacements=[];
  for(const m of rows){
   const side=m.side==='blue'?'red':m.side==='red'?'blue':null;if(!side)continue;
   const events=timeline(m).filter(e=>e.side===side),first=events.find(e=>e.type==='pick');
   if(first){const s=sides[side];s.games++;s.first[first.champ]=(s.first[first.champ]||0)+1;}
   const bans=[...new Set(events.filter(e=>e.type==='ban').map(e=>e.champ))];
   for(const ch of bans){sides[side].bans[ch]=(sides[side].bans[ch]||0)+1;const key=(m.comp||'Okänd comp')+' · '+ch;against[key]=(against[key]||0)+1;}
  }
  for(let i=1;i<rows.length;i++){
   const a=rows[i-1],b=rows[i];if(!seriesId(a)||seriesId(a)!==seriesId(b))continue;
   for(const old of a.enemyPicks||[]){
    if(!roles.includes(old.role)||!(b.ourBans||[]).includes(old.champ))continue;
    const next=(b.enemyPicks||[]).find(p=>p.role===old.role&&p.champ!==old.champ);
    if(next){swaps.push(old.champ+' bannad → '+next.champ+' ('+old.role+')');replacements.push({blocked:old.champ,reply:next.champ,role:old.role,game:b.id});}
   }
  }
  const fetched=rivalCache.get(String(plan?.id))?.series?.flatMap(s=>s.games||[])||[];
  const league=[...new Map([...(plan?.competitiveEvidence?.games||[]),...fetched].filter(g=>g.id).map(g=>[g.id,g])).values()];
  return {sides,against,swaps:[...new Set(swaps)],replacements,recorded:rows.length,league:league.length,leagueOrderMissing:league.length};
 }
 function branches(plan){
  const catalog=window.RiftRoster?.catalog?.()||[];
  const canonical=s=>catalog.find(c=>c.toLowerCase()===String(s||'').trim().toLowerCase());
  return (Array.isArray(plan?.draftBranches)?plan.draftBranches:[]).slice(0,3).map(b=>({when:canonical(b.when),reply:canonical(b.reply)})).filter(b=>b.when&&b.reply&&b.when!==b.reply);
 }
 function branchLines(plan,{enemy=[],used=[],map={}}={}){
  const taken=new Set(used.map(c=>c.toLowerCase()));
  return branches(plan).map(b=>{
   const can=roles.some(r=>!map[r]&&window.RiftRoster?.available(r).includes(b.reply)&&window.RiftRoster.comfort(r,b.reply)>=7);
   const status=taken.has(b.reply.toLowerCase())?'svaret är redan pickat/bannat':!can?'inget öppet tryggt poolval för svaret':enemy.includes(b.when)?'AKTIV gren':'förberedd';
   return 'Om de tar '+b.when+' → '+b.reply+' · '+status;
  });
 }
 function practice(threats,history=matches()){
  const lines=[];
  for(const role of roles){
   const gaps=answers(threats.filter(t=>t.role===role).slice(0,3)).filter(t=>!t.answer&&!t.unknown);
   if(gaps.length)lines.push('Öva '+role+': inget tryggt kitbaserat svar mot '+gaps.map(t=>t.champ).join(', ')+'. Kontrollera matchupen med spelaren.');
   const player=window.RiftRoster?.player(role);if(!player)continue;
   for(const ch of player.pool){
    if((player.comfort[ch]||0)<8)continue;
    const games=history.filter(m=>validMatch(m)&&m.draftContext?.roster?.players?.some(p=>p.id===player.id&&p.role===role)&&(m.ourPicks||[]).some(p=>p.role===role&&p.champ===ch));
    const wins=games.filter(m=>m.result==='win').length;
    if(games.length>=5&&wins/games.length<=.4)lines.push(player.name+' · '+ch+': comfort '+player.comfort[ch]+', '+wins+'W/'+(games.length-wins)+'L. Litet underlag; se över eller öva, comfort ändras inte.');
   }
  }
  return lines;
 }
 function decisionLog(history=matches()){
  const decisions=[],disagreedGames=new Map();
  for(const m of history.filter(validMatch))for(const [index,e] of (m.draftTimeline||[]).entries()){
   const log=e.brain?.decision;if(e.type!=='pick'||e.side!==m.side||log?.version!==1||!log.top3?.length)continue;
   const first=log.top3[0],disagreed=first.ch!==e.champ||first.role!==e.role;
   decisions.push({match:m.id,index,champ:e.champ,role:e.role,top3:log.top3,result:m.result,disagreed});
   if(disagreed)disagreedGames.set(m.id,m.result);
  }
  return {decisions,disagreed:decisions.filter(d=>d.disagreed).length,matches:new Set(decisions.map(d=>d.match)).size,disagreedGames:disagreedGames.size,wins:[...disagreedGames.values()].filter(r=>r==='win').length};
 }
 const counts=obj=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([ch,n])=>ch+' ×'+n).join(', ')||'saknar underlag';
 function summaryLines(plan,threats=[]){
  const lines=[],s=series(plan),t=tendencies(plan);
  if(plan){
   lines.push('BO'+(plan.bestOf||3)+' · '+s.length+' kopplade spelade games. W/O ingår inte i draftlärandet.');
   s.forEach((m,i)=>lines.push('Game '+(i+1)+': '+(m.result==='win'?'W':'L')+' · vår comp '+(m.comp||'okänd')+' · de visade '+(m.enemyPicks||[]).map(p=>p.champ).join('/')+' · de bannade '+(m.enemyBans||[]).join('/')));
   for(const [k,v]of Object.entries(plan.gameNotes||{}))if(String(v||'').trim())lines.push('Lagets notering ('+k+'): '+String(v).slice(0,600));
   for(const side of ['blue','red'])lines.push('Motståndaren '+side+' · '+t.sides[side].games+' registrerade draftordningar · förstapicks '+counts(t.sides[side].first)+' · bans '+counts(t.sides[side].bans));
   lines.push('Bans mot våra spelade comps: '+counts(t.against)+'. Inga antaganden om andra lag.');
   lines.push(t.league+' inlästa Rivals-games med championdata. Pick-/banordning saknas där; championlistan tolkas inte som pickordning.');
   lines.push(...t.swaps.map(s=>'Observerat byte: '+s+'. Inte bevis på ett bestämt svar.'));
  }
  lines.push(...practice(threats));
  const log=decisionLog();
  lines.push('Beslutslogg: '+log.decisions.length+' picks i '+log.matches+' games · '+log.disagreed+' avsteg från förstavalet. Games med avsteg: '+log.wins+'W/'+(log.disagreedGames-log.wins)+'L. Litet, selekterat underlag – ingen automatisk viktjustering. Äldre games utan exakt topplista räknas inte.');
  for(const d of log.decisions.filter(d=>d.disagreed).slice(-10))lines.push('Avsteg '+d.match+' · '+d.role+': Brain '+d.top3.map(c=>c.ch).join(' / ')+' → laget '+d.champ+' · '+(d.result==='win'?'W':'L'));
  return lines;
 }
 let predictionCache={key:null};
 function predictionFactor(plan,row,enemySide,banned=[]){
  if(!plan)return 1;
  const key=JSON.stringify([plan.id,plan.opponent,localStorage.getItem('rs_match_history')]);
  if(predictionCache.key!==key)predictionCache={key,t:tendencies(plan),last:series(plan).at(-1)};
  const s=predictionCache.t.sides[enemySide],last=predictionCache.last;
  const opening=s?.games>=2?(s.first[row.champ]||0)/(s.games+3):0;
  const shown=(last?.enemyPicks||[]).some(p=>p.champ===row.champ&&(p.role||p.inferredRole)===row.role);
  const replacement=predictionCache.t.replacements.filter(r=>banned.includes(r.blocked)&&r.reply===row.champ&&r.role===row.role).length;
  // Only reweight an already supported starter candidate, never invent a champion or role.
  return 1+Math.min(.2,opening*.2+(shown?.1:0)+(replacement>=2?.1:0));
 }
 function preparationHTML(plan,threats=[]){return '<details class="planner-section"><summary>Visa serie, draftgrenar och träning</summary>'+[...branchLines(plan),...summaryLines(plan,threats)].map(s=>'<p class="analysis-note">'+esc(s)+'</p>').join('')+'</details>';}
 window.RiftDraftContext={roles,rules:matchupRules,esc,stored,answerScore,answers,warnings,flexRoles,matches,series,tendencies,branches,branchLines,practice,decisionLog,summaryLines,predictionFactor,preparationHTML,observe:(plan,data)=>{rivalCache.set(String(plan.id),data);}};
})();
