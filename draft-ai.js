/* Riftensräksallad Draft Brain — Hybrid AI layer
   Uses explainable heuristic search/lookahead on top of the team's core comps.
   This is deliberately NOT presented as a trained win-rate model. */

const deterministicCandidateScoreDetails = scoreCandidateDetails;

const AI_CONFIG = {
  baseWeight: 1.0,
  stateWeight: 0.28,
  lookaheadWeight: 0.22,
  flexibilityWeight: 2.2,
  coreAnchorWeight: 0.18,
  temperature: 11,
  beamWidth: 12,
  beamChoicesPerRole: 2,
  beamDepth: 2
};

let aiContextKey="";
const aiRoleCache=new Map(),aiStateCache=new Map();
function aiEnsureContext(){
  const key=JSON.stringify([userSide,events.map(e=>[e.side,e.type,e.role,e.champ]),
    window.RiftStats?.getStatus?.(),window.RiftOpponent?.key(),window.RiftRoster?.key(),localStorage.getItem("rs_draft_archive"),Object.keys(championMeta).length]);
  if(key!==aiContextKey){aiContextKey=key;aiRoleCache.clear();aiStateCache.clear();}
}
let aiHistoryCacheRaw=null;
let aiHistoryCache=[];
function aiHistoryArchive(){
  if(new URLSearchParams(location.search).has("replay"))return [];
  const raw=localStorage.getItem("rs_draft_archive")||"[]";
  if(raw===aiHistoryCacheRaw)return aiHistoryCache;
  aiHistoryCacheRaw=raw;
  try{
    aiHistoryCache=JSON.parse(raw).filter(m=>m&&(m.result==="win"||m.result==="loss"));
  }catch{aiHistoryCache=[]}
  return aiHistoryCache;
}
function aiHistoryTier(n){
  if(n>=10)return {label:"established",cap:3};
  if(n>=6)return {label:"emerging",cap:2};
  if(n>=3)return {label:"low confidence",cap:1};
  return {label:"observation",cap:0};
}
function aiPatchWeight(matchPatch){
  const current=String(window.RiftStats?.getStatus?.()?.patch||"");
  if(!current||!matchPatch)return .65;
  if(String(matchPatch)===current)return 1;
  const [a,b]=current.split(".").map(Number);
  const [ma,mb]=String(matchPatch).split(".").map(Number);
  if(Number.isFinite(a)&&Number.isFinite(b)&&a===ma&&Math.abs(b-mb)<=1)return .8;
  return .5;
}
function aiTeamHistorySignal(champ,role){
  const activeId=window.RiftRoster?.player(role)?.id||'core-'+role;
  const rows=aiHistoryArchive().filter(m=>{
    const saved=m.draftContext?.roster?.players?.find(p=>p.role===role);
    const samePlayer=saved?saved.id===activeId:!m.draftContext?.roster&&activeId==='core-'+role;
    return samePlayer&&(m.ourPicks||[]).some(p=>p?.champ===champ&&p?.role===role);
  });
  const n=rows.length,tier=aiHistoryTier(n);
  if(!n||tier.cap===0)return {n,w:rows.filter(m=>m.result==="win").length,l:rows.filter(m=>m.result==="loss").length,bonus:0,label:tier.label};
  let games=0,wins=0;
  rows.forEach(m=>{
    const weight=aiPatchWeight(m.patch);
    games+=weight;
    if(m.result==="win")wins+=weight;
  });
  const smoothed=(wins+1.5)/(games+3);
  const raw=(smoothed-.5)*8;
  const bonus=Math.max(-tier.cap,Math.min(tier.cap,raw));
  const w=rows.filter(m=>m.result==="win").length;
  return {n,w,l:n-w,bonus,label:tier.label};
}
function aiCompHistoryBonus(name){
  const rows=aiHistoryArchive().filter(m=>m.comp===name);
  const tier=aiHistoryTier(rows.length);
  if(tier.cap===0)return 0;
  let games=0,wins=0;
  rows.forEach(m=>{
    const weight=aiPatchWeight(m.patch);
    games+=weight;
    if(m.result==="win")wins+=weight;
  });
  const smoothed=(wins+1.5)/(games+3);
  return Math.max(-tier.cap*.8,Math.min(tier.cap*.8,(smoothed-.5)*6));
}

function aiSimList(map){
  return roles.filter(r=>map[r]).map(r=>({role:r,champ:map[r]}));
}

function aiCount(list,set){
  return list.reduce((n,e)=>n+(set.has(e.champ)?1:0),0);
}

function aiNeeds(map){
  const list=aiSimList(map);
  const carries=list.filter(e=>e.role!=="support");
  const ad=carries.filter(e=>damageType[e.champ]==="AD").length;
  const ap=carries.filter(e=>damageType[e.champ]==="AP").length;
  return {
    count:list.length,
    front:aiCount(list,traits.frontline),
    engage:aiCount(list.filter(e=>!(e.role==="support"&&e.champ==="Galio")),traits.engage),
    damage:carries.filter(e=>hasSmartTrait(e.champ,traits.damage,"Marksman")||hasSmartTrait(e.champ,traits.damage,"Mage")||hasSmartTrait(e.champ,traits.damage,"Assassin")).length,
    peel:aiCount(list,smartTraits.peel),
    wave:aiCount(list,smartTraits.waveclear),
    antiTank:aiCount(list,smartTraits.antiTank),
    ranged:aiCount(list,smartTraits.rangedDamage),
    pick:aiCount(list,smartTraits.pick),
    early:aiCount(list,traits.early),
    zone:aiCount(list,smartTraits.zone),
    objective:aiCount(list,smartTraits.objective),
    ad,ap
  };
}

function aiCompFitForMap(map,name){
  const c=comps[name];
  const p=enemyProfile();
  let s=aiCompPreference(map,name);
  roles.forEach(role=>{
    const ch=map[role];
    if(!ch)return;
    if(c.core[role]===ch)s+=10*(window.RiftRoster?.compWeight(role,ch)??1);
    else if((c.alts[role]||[]).includes(ch))s+=5;
  });

  const n=aiNeeds(map);
  if(name==="EARLY SKIRMISH"){
    s+=n.early*1.7;
    if(p.scalingJungle)s+=6;
    if(p.poke>=2)s-=2;
  }else if(name==="PRESS R"){
    s+=n.engage*1.8+n.pick*0.8+p.poke*1.8+p.immobile*1.3;
    if(p.hyper&&p.enchanter)s+=7;
  }else if(name==="OBJECTIVE CONTROL"){
    s+=n.zone*1.8+n.objective*1.1+p.melee*1.8+p.tanks*1.2;
    if(p.poke>=2)s-=2;
  }else if(name==="JUNGLE CARRY"){
    if(["Viego","Kindred","Graves","Lillia"].includes(map.jungle))s+=9;
    if(["Shen","Malphite","Sion"].includes(map.top))s+=3;
    if(["Taliyah","Ahri","Hwei"].includes(map.mid))s+=3;
    if(["Nautilus","Maokai","Leona"].includes(map.support))s+=3;
    if(p.earlyJungle)s-=2;
  }
  s+=aiCompHistoryBonus(name);
  return s;
}

function aiCompPreference(map,name){
  const core=comps['EARLY SKIRMISH'],used=unavailable();
  const viable=roles.every(role=>map[role]
    ?map[role]===core.core[role]||(core.alts[role]||[]).includes(map[role])
    :[core.core[role],...(core.alts[role]||[])].some(ch=>teamPool[role]?.includes(ch)&&!used.has(ch.toLowerCase())));
  // Team identity is a prior, not a demand to abandon already locked picks.
  if(name==='EARLY SKIRMISH')return viable?12:0;
  if(name==='PRESS R')return viable?0:8;
  return 0;
}

function aiCompRankForMap(map){
  return Object.keys(comps)
    .map(name=>({name,score:aiCompFitForMap(map,name)}))
    .sort((a,b)=>b.score-a.score);
}

function aiStateScore(map){
  const key=roles.map(r=>map[r]||"").join("|");
  if(aiStateCache.has(key))return aiStateCache.get(key);
  const n=aiNeeds(map),p=enemyProfile();
  let s=48;

  // Structural fundamentals.
  if(n.front>0)s+=6; else if(n.count>=3)s-=8;
  if(n.engage>0)s+=6; else if(n.count>=3)s-=7;
  if(n.damage>=2)s+=5;
  if(n.peel>0)s+=3;
  if(n.wave>0)s+=3;
  if(n.ranged>0)s+=2;
  if(n.pick>0)s+=2;
  if(n.objective>0)s+=2;

  // Damage profile.
  if(n.count>=3){
    if(n.ad>=3&&n.ap===0)s-=9;
    if(n.ap>=3&&n.ad===0)s-=8;
    if(n.ad>0&&n.ap>0)s+=5;
  }

  // Enemy-specific answers.
  if(p.dive>=2){
    if(n.peel>0)s+=6;
    if(n.front>0)s+=3;
  }
  if(p.poke>=2){
    if(n.engage>0||n.pick>0)s+=6;
    else s-=5;
  }
  if(p.melee>=3){
    s+=Math.min(7,n.zone*2+n.ranged);
  }
  if(p.tanks>=2){
    if(n.antiTank>0)s+=7;
    else if(n.count>=4)s-=7;
  }
  if(p.hyper>=1&&p.enchanter>=1){
    if(n.engage>0||n.pick>0)s+=5;
    else s-=5;
  }

  // Ease of execution matters for this team.
  if(n.front>0&&n.engage>0&&n.damage>=2)s+=5;
  if(n.engage>=2&&n.damage>=2)s+=2;
  // Initiation is only useful when allies can reach the same fight.
  const carries=aiSimList(map).filter(e=>e.role!=="support");
  const follow=carries.filter(e=>smartTraits.reliableFollow.has(e.champ)).length;
  if(n.count>=4&&n.engage>0&&!follow)s-=7;
  if(n.count>=4&&!n.wave&&!n.peel)s-=6; // Few options when playing from behind.
  if(map.jungle&&map.mid&&traits.early.has(map.jungle)&&laneSetupScore(map.mid)>0)s+=3;

  // Core comps are priors, not hard locks.
  const ranked=aiCompRankForMap(map);
  if(ranked[0])s+=Math.min(11,ranked[0].score*AI_CONFIG.coreAnchorWeight);

  const score=Math.max(0,Math.min(100,s));
  aiStateCache.set(key,score);
  return score;
}

function aiCandidatePoolForMap(role,map,used){
  return (teamPool[role]||[])
    .filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>{
      // Evaluate the hypothetical map itself, not the live draft's old needs.
      const next={...map,[role]:ch};
      const gain=aiStateScore(next)-aiStateScore(map);
      return {ch,score:gain*3+(comfort[role]?.[ch]||5)*2};
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,AI_CONFIG.beamChoicesPerRole);
}

function aiLookaheadScore(startMap,startUsed){
  const remaining=roles.filter(r=>!startMap[r]);
  if(!remaining.length)return aiStateScore(startMap);

  let beam=[{map:startMap,used:startUsed,score:aiStateScore(startMap)}];
  const depth=Math.min(AI_CONFIG.beamDepth,remaining.length);

  for(let d=0;d<depth;d++){
    const expanded=[];
    beam.forEach(node=>{
      const open=roles.filter(r=>!node.map[r]);
      open.forEach(role=>{
        aiCandidatePoolForMap(role,node.map,node.used).forEach(opt=>{
          const map={...node.map,[role]:opt.ch};
          const used=new Set(node.used);used.add(opt.ch.toLowerCase());
          const state=aiStateScore(map);
          expanded.push({map,used,score:state+opt.score*0.08});
        });
      });
    });
    if(!expanded.length)break;
    // Different role orders can reach the same map; do not waste beam slots on duplicates.
    const unique=new Map();
    expanded.forEach(node=>{
      const key=roles.map(r=>node.map[r]||"").join("|");
      if(!unique.has(key)||unique.get(key).score<node.score)unique.set(key,node);
    });
    beam=[...unique.values()].sort((a,b)=>b.score-a.score).slice(0,AI_CONFIG.beamWidth);
  }
  return beam.length?Math.max(...beam.map(x=>aiStateScore(x.map))):aiStateScore(startMap);
}

function aiFlexibility(map,used){
  const open=roles.filter(r=>!map[r]);
  if(!open.length)return 0;
  let goodBranches=0;
  open.forEach(role=>{
    const vals=(teamPool[role]||[])
      .filter(ch=>!used.has(ch.toLowerCase()))
      .map(ch=>(comfort[role]?.[ch]||5)*3+(aiStateScore({...map,[role]:ch})-aiStateScore(map))*2)
      .sort((a,b)=>b-a);
    if(vals[0]>=30)goodBranches++;
    if(vals[1]>=25)goodBranches+=0.5;
  });

  const compsOpen=aiCompRankForMap(map).filter(x=>x.score>=8).length;
  return Math.min(8,goodBranches+Math.min(3,compsOpen));
}

function aiRisk(champ,role,map){
  const enemyMap=enemyRoleMap();
  let risk=0;
  const reasons=[];
  const conf=comfort[role]?.[champ]||5;

  if(conf<=6){risk+=2;reasons.push("lägre comfort");}
  if(!enemyRoleShown(role)&&(role==="top"||role==="mid")&&smartTraits.counterSensitive.has(champ)){
    risk+=2;reasons.push("counterkänslig blind");
  }

  const n=aiNeeds(map);
  if(n.count>=3&&n.ad>=3&&n.ap===0){risk+=2;reasons.push("för AD-tungt");}
  if(n.count>=3&&n.ap>=3&&n.ad===0){risk+=2;reasons.push("för AP-tungt");}
  if(n.count>=4&&n.engage===0){risk+=2;reasons.push("saknar GO-knapp");}
  if(enemyProfile().tanks>=2&&n.count>=4&&n.antiTank===0){risk+=2;reasons.push("svagt mot tanks");}

  const dep=window.RiftAdvanced?.pickDependency?.(champ,role);
  if(dep?.penalty>=4){
    risk+=2;
    if(dep.deps?.[0]?.label)reasons.push(dep.deps[0].label);
  }else if(dep?.penalty>=2){
    risk+=1;
    if(dep.deps?.[0]?.label)reasons.push(dep.deps[0].label);
  }

  return {value:risk,label:risk>=5?"HÖG":risk>=3?"MEDEL":"LÅG",reasons};
}

function aiCandidate(champ,role){
  const base=deterministicCandidateScoreDetails(champ,role,desiredComp());
  // Utility supports do not solve carry damage; Galio support is follow-up engage.
  if(role==="support"){
    const misleading=base.reasons.filter(r=>r.label==="fixar AD/AP-split"||r.label==="höjer damage"||(champ==="Galio"&&r.label==="ger engage"));
    base.score-=misleading.reduce((sum,r)=>sum+r.pts,0);
    base.reasons=base.reasons.filter(r=>!misleading.includes(r));
  }
  const map={...ownRoleMap(),[role]:champ};
  const used=new Set([...unavailable()].map(x=>x.toLowerCase()));used.add(champ.toLowerCase());
  const state=aiStateScore(map);
  const lookahead=aiLookaheadScore(map,used);
  const flex=aiFlexibility(map,used);
  const risk=aiRisk(champ,role,map);
  const compRanks=aiCompRankForMap(map);
  const history=aiTeamHistorySignal(champ,role);

  let score=base.score*AI_CONFIG.baseWeight;
  const preferred=aiCompPreference(ownRoleMap(),'EARLY SKIRMISH')>0?'EARLY SKIRMISH':'PRESS R';
  if(comps[preferred].core[role]===champ)score+=8*(window.RiftRoster?.compWeight(role,champ)??1);
  else if((comps[preferred].alts[role]||[]).includes(champ))score+=4;
  score+=(state-50)*AI_CONFIG.stateWeight;
  score+=(lookahead-50)*AI_CONFIG.lookaheadWeight;
  score+=flex*AI_CONFIG.flexibilityWeight;
  score-=risk.value*2.4;
  score+=history.bonus;
  const scouting=window.RiftOpponent?.pickSignal(champ,role);
  score+=scouting?.points||0;

  // Preserve the current core direction, but reward a useful second pivot.
  if(compRanks[1]&&compRanks[1].score>=9)score+=2;

  const reasons=base.reasons.filter(x=>x.pts>0&&x.label!=="comfort").slice(0,3).map(x=>x.label);
  if(role==="support"&&["Galio","Shen"].includes(champ)){
    const hasSetup=ours().some(e=>ADV_HARD_ENGAGE.has(e.champ));
    if(!hasSetup)score-=12;
    reasons.unshift(hasSetup?"follow-up på lagets engage":"behöver engage/setup från annan roll");
  }
  if(scouting?.points>=1&&scouting.reason)reasons.unshift(scouting.reason);
  if(history.n>=3&&history.bonus>=.35)reasons.unshift("teamdata "+history.w+"W/"+history.l+"L · "+history.label);
  if(flex>=4)reasons.push("håller flera pivots öppna");
  if(lookahead>=70)reasons.push("bra struktur efter egna följdpicks");

  return {
    ch:champ,role,score,state,lookahead,flex,risk,history,
    reasons:[...new Set(reasons)].slice(0,4),
    anchors:compRanks.slice(0,2)
  };
}

function aiRoleCandidates(role){
  if(!role||role==="unknown")return[];
  aiEnsureContext();
  if(ownRoleMap()[role])return [];
  if(aiRoleCache.has(role))return aiRoleCache.get(role);
  const used=unavailable();
  const ranked=(teamPool[role]||[])
    .filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>aiCandidate(ch,role))
    .sort((a,b)=>b.score-a.score);
  aiRoleCache.set(role,ranked);
  return ranked;
}

function aiRoleTimingBonus(role){
  const enemyMap=enemyRoleMap(),map=ownRoleMap();
  if(map[role])return -999;
  let s=0;
  if(enemyRoleShown(role))s+=role==="top"?12:role==="mid"?10:6;
  if(!enemyRoleShown(role)&&role==="top")s-=7;
  if(!enemyRoleShown(role)&&role==="mid")s-=4;

  const remaining=(teamPool[role]||[]).filter(ch=>!unavailable().has(ch.toLowerCase())).length;
  if(remaining<=2)s+=9;
  else if(remaining<=4)s+=4;
  return s;
}

function aiDecision(forcedRole=null){
  const map=ownRoleMap();
  const open=forcedRole?[forcedRole]:roles.filter(r=>!map[r]);
  const options=[];

  open.forEach(role=>{
    const ranked=aiRoleCandidates(role);
    const diverse=[...ranked.slice(0,2),
      [...ranked].sort((a,b)=>(comfort[role]?.[b.ch]||5)-(comfort[role]?.[a.ch]||5))[0],
      [...ranked].sort((a,b)=>b.state-a.state||b.score-a.score)[0]];
    [...new Map(diverse.filter(Boolean).map(x=>[x.ch,x])).values()].forEach(x=>{
      const timing=aiPickUrgency(x,ranked);
      options.push({...x,urgency:timing,comfort:comfort[role]?.[x.ch]||5,total:x.score+aiRoleTimingBonus(role)+timing.points});
    });
  });

  options.sort((a,b)=>b.total-a.total);
  return options;
}

function aiPickUrgency(candidate,ranked){
  const turnIndex=step;
  const nextOwn=draftOrder.findIndex((t,i)=>i>turnIndex&&t.side===userSide&&t.type==='pick');
  const intervening=nextOwn<0?[]:draftOrder.slice(turnIndex+1,nextOwn);
  const exposed=intervening.some(t=>t.side!==userSide||t.type==='ban');
  const alternatives=ranked.filter(x=>x.ch!==candidate.ch&&x.score>=candidate.score-10);
  const observed=window.RiftOpponent?.scouting?.().filter(x=>x.champ===candidate.ch)||[];
  const contested=observed.some(x=>x.cm>0||x.recent>=3);
  let points=exposed&&alternatives.length===0?5:0;
  if(exposed&&contested)points+=4;
  return {points,reason:points?`${contested?'Finns i deras observerade pool. ':''}${alternatives.length===0?'Få jämnstarka alternativ. ':''}Risk att vänta till nästa egna pick.`:'Ingen belagd brådska; prioritera comp och comfort.',alternatives:alternatives.slice(0,2).map(x=>x.ch)};
}

// Replace per-role ranking with the hybrid AI score.
function topRecommendationDetails(role){
  return aiRoleCandidates(role).slice(0,3).map(x=>({
    ch:x.ch,
    score:x.score,
    reasons:x.reasons.map((label,i)=>({pts:10-i,label})),
    ai:x
  }));
}

function topRecommendations(role){
  return topRecommendationDetails(role).map(x=>x.ch);
}

function recommendedNextRole(){
  const d=aiDecision();
  return d[0]?.role||firstOpenRole();
}

function aiConfidenceLabel(gap){
  return gap>=8?"Tydligt förstaval":gap>=3?"Litet försprång":"Jämna alternativ";
}

function renderAIInsight(){
  const card=document.getElementById("aiInsightCard");
  if(!card)return;
  const t=current();
  if(!t||t.type!=="pick"||t.side!==userSide||step>=draftOrder.length){
    card.classList.add("hidden");return;
  }

  const forced=selectedRole||null;
  const list=aiDecision(forced);
  if(!list.length){card.classList.add("hidden");return;}
  card.classList.remove("hidden");

  const best=list[0],second=list[1];
  const gap=second?best.total-second.total:20;
  const confidence=aiConfidenceLabel(gap);
  const anchor=best.anchors[0]?.name||desiredComp();
  const pivot=best.anchors[1]?.name||"—";

  document.getElementById("aiCall").textContent=roleNames[best.role]+": "+best.ch;
  document.getElementById("aiConfidence").textContent=confidence;
  document.getElementById("aiAnchor").textContent=anchor;
  document.getElementById("aiPivot").textContent=pivot;
  document.getElementById("aiLookahead").textContent=Math.round(best.lookahead)+"/100 · struktur, inte vinstchans";
  document.getElementById("aiRisk").textContent=best.risk.label+(best.risk.reasons.length?" · "+best.risk.reasons.join(", "):"");
  document.getElementById("aiWhy").textContent=(best.reasons.join(" · ")||"Bäst total balans mellan comfort, comp och enemy draft.")+
    ". Lookahead testar egna följdpicks; motståndarens framtida svar simuleras inte.";

  const alternatives=list.slice(1,3).map(x=>roleNames[x.role]+" "+x.ch).join(" · ");
  document.getElementById("aiAlternatives").textContent=alternatives||"—";
}

// One primary call, two alternatives. Extra analysis stays behind disclosure controls.
let aiPreviousCall=null;
function renderRecommendation(){
  window.RiftGroq?.refresh();
  const t=current(),box=$("recommendationBox");
  if(!t||t.side!==userSide){box.classList.add("hidden");return;}
  box.classList.remove("hidden");
  $("scoreBreakdown").replaceChildren();
  const localList=t.type==="ban"?banRecommendations().slice(0,3).map(ch=>({ch})):aiDecision(selectedRole||null);
  const list=(window.RiftGroq?.recommendations(localList)||localList).slice(0,3);
  if(!list.length){
    if(t.type==="ban"&&window.RiftOpponent?.active()){
      $("recommendEyebrow").textContent="MOTSTÅNDARSCOUTING";$("recommendRole").textContent="BAN";
      $("recommendPicks").textContent="Inga styrkta banförslag kvar";
      $("recommendReason").textContent="Underlaget saknas, rollerna är visade eller poolen är redan pickad/bannad. Välj generellt läge om du vill se generiska bans.";
      $("recommendAlternatives").replaceChildren();$("recommendStrength").textContent="";$("recommendChange").textContent="";
      $("brainDataStatus").textContent=window.RiftOpponent.summary();return;
    }
    box.classList.add("hidden");return;
  }
  const top=list[0];
  $("recommendEyebrow").textContent=t.type==="ban"?"BANFÖRSLAG":"REKOMMENDERAT PICK";
  $("recommendRole").textContent=top.role?roleNames[top.role]:"BAN";
  $("recommendPicks").replaceChildren();
  const addButton=(item,parent)=>{
    const b=document.createElement("button");b.type="button";b.className="champ-suggestion";
    b.dataset.suggestChamp=encodeURIComponent(item.ch);
    if(item.role)b.dataset.suggestRole=item.role;
    b.textContent=item.ch;parent.appendChild(b);
  };
  addButton(top,$("recommendPicks"));
  $("recommendReason").textContent=top.reasons?.slice(0,2).join(" · ")||window.RiftOpponent?.banReason(top.ch)||"Baserat på comp och visade hot.";
  const stats=window.RiftStats?.getStatus?.();
  $("brainDataStatus").textContent=window.RiftOpponent?.active()?window.RiftOpponent.summary():stats?.hasData?stats.source+" · data "+(stats.metaPatch||"?")+(stats.fallback?" · äldre underlag":""):"Metadata saknas · regler och lagpool används";
  const alternatives=$("recommendAlternatives");alternatives.replaceChildren();
  list.slice(1).forEach(x=>addButton(x,alternatives));
  $("recommendStrength").textContent=t.type==="pick"?aiConfidenceLabel(list[1]?top.total-list[1].total:20)+" · regelbaserat stöd":window.RiftOpponent?.active()?"Endast styrkta motståndarpicks":"Alternativ om banplanen ändras";
  if(top.groqReason){
    $("recommendReason").textContent=top.groqReason+(top.groqRisk?' · Risk: '+top.groqRisk:'');
    $("recommendStrength").textContent='AI-prioritering · kontrollerad mot draft och roster';
  }
  const change=$("recommendChange");
  const context=JSON.stringify(events.map(e=>[e.side,e.type,e.champ,e.role]));
  const prior=aiPreviousCall;
  if(t.type==="pick"){
    if(prior&&prior.side===userSide&&prior.context!==context&&prior.ch!==top.ch){
      const unavailableNow=unavailable().has(prior.ch.toLowerCase());
      change.textContent=prior.ch+" → "+top.ch+": "+(unavailableNow?"tidigare förstaval är pickat eller bannat":(top.reasons?.[0]||"bättre balans i den nya draften"))+".";
    }else if(!prior||prior.context!==context||prior.role!==selectedRole){change.textContent="";}
    aiPreviousCall={side:userSide,context,ch:top.ch,role:selectedRole};
  }else change.textContent="";
  renderAIInsight();
}

const deterministicRender = render;
render = function(){
  try{
    deterministicRender();
  }catch(err){
    console.error("Draft Brain core render error:",err);
    const badge=document.getElementById("autoRiskBadge");
    if(badge){badge.className="badge high";badge.textContent="RENDER ERROR";}
    const risk=document.getElementById("autoRisk");
    if(risk)risk.textContent="En analysmodul föll, men draften är kvar. Prova Undo och fortsätt.";
  }
  try{
    renderAIInsight();
  }catch(err){
    console.error("Draft Brain AI insight error:",err);
    document.getElementById("aiInsightCard")?.classList.add("hidden");
  }
};

if(userSide)render();
