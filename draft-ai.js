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

function aiSimList(map){
  return roles.filter(r=>map[r]).map(r=>({role:r,champ:map[r]}));
}

function aiCount(list,set){
  return list.reduce((n,e)=>n+(set.has(e.champ)?1:0),0);
}

function aiNeeds(map){
  const list=aiSimList(map);
  const ad=list.filter(e=>damageType[e.champ]==="AD").length;
  const ap=list.filter(e=>damageType[e.champ]==="AP").length;
  return {
    count:list.length,
    front:aiCount(list,traits.frontline),
    engage:aiCount(list,traits.engage),
    damage:list.filter(e=>hasSmartTrait(e.champ,traits.damage,"Marksman")||hasSmartTrait(e.champ,traits.damage,"Mage")||hasSmartTrait(e.champ,traits.damage,"Assassin")).length,
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
  let s=0;
  roles.forEach(role=>{
    const ch=map[role];
    if(!ch)return;
    if(c.core[role]===ch)s+=10;
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
    if(["Viego","Kindred","Graves"].includes(map.jungle))s+=9;
    if(["Shen","Malphite","Sion"].includes(map.top))s+=3;
    if(["Taliyah","Ahri","Hwei"].includes(map.mid))s+=3;
    if(["Nautilus","Maokai","Leona"].includes(map.support))s+=3;
    if(p.earlyJungle)s-=2;
  }
  return s;
}

function aiCompRankForMap(map){
  return Object.keys(comps)
    .map(name=>({name,score:aiCompFitForMap(map,name)}))
    .sort((a,b)=>b.score-a.score);
}

function aiStateScore(map){
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

  // Core comps are priors, not hard locks.
  const ranked=aiCompRankForMap(map);
  if(ranked[0])s+=Math.min(11,ranked[0].score*AI_CONFIG.coreAnchorWeight);

  return Math.max(0,Math.min(100,s));
}

function aiCandidatePoolForMap(role,map,used){
  return (teamPool[role]||[])
    .filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>{
      const base=deterministicCandidateScoreDetails(ch,role,desiredComp()).score;
      const next={...map,[role]:ch};
      return {ch,score:base+aiStateScore(next)*0.18};
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
    beam=expanded.sort((a,b)=>b.score-a.score).slice(0,AI_CONFIG.beamWidth);
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
      .map(ch=>deterministicCandidateScoreDetails(ch,role,desiredComp()).score)
      .sort((a,b)=>b-a);
    if(vals[0]>=55)goodBranches++;
    if(vals[1]>=50)goodBranches+=0.5;
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
  if(!enemyMap[role]&&(role==="top"||role==="mid")&&smartTraits.counterSensitive.has(champ)){
    risk+=2;reasons.push("counterkänslig blind");
  }

  const n=aiNeeds(map);
  if(n.count>=3&&n.ad>=3&&n.ap===0){risk+=2;reasons.push("för AD-tungt");}
  if(n.count>=3&&n.ap>=3&&n.ad===0){risk+=2;reasons.push("för AP-tungt");}
  if(n.count>=4&&n.engage===0){risk+=2;reasons.push("saknar GO-knapp");}
  if(enemyProfile().tanks>=2&&n.count>=4&&n.antiTank===0){risk+=2;reasons.push("svagt mot tanks");}

  return {value:risk,label:risk>=5?"HÖG":risk>=3?"MEDEL":"LÅG",reasons};
}

function aiCandidate(champ,role){
  const base=deterministicCandidateScoreDetails(champ,role,desiredComp());
  const map={...ownRoleMap(),[role]:champ};
  const used=new Set([...unavailable()].map(x=>x.toLowerCase()));used.add(champ.toLowerCase());
  const state=aiStateScore(map);
  const lookahead=aiLookaheadScore(map,used);
  const flex=aiFlexibility(map,used);
  const risk=aiRisk(champ,role,map);
  const compRanks=aiCompRankForMap(map);

  let score=base.score*AI_CONFIG.baseWeight;
  score+=(state-50)*AI_CONFIG.stateWeight;
  score+=(lookahead-50)*AI_CONFIG.lookaheadWeight;
  score+=flex*AI_CONFIG.flexibilityWeight;
  score-=risk.value*2.4;

  // Preserve the current core direction, but reward a useful second pivot.
  const current=desiredComp();
  if(comps[current].core[role]===champ)score+=6;
  else if((comps[current].alts[role]||[]).includes(champ))score+=3;
  if(compRanks[1]&&compRanks[1].score>=9)score+=2;

  const reasons=base.reasons.filter(x=>x.pts>0).slice(0,3).map(x=>x.label);
  if(flex>=4)reasons.push("håller flera pivots öppna");
  if(lookahead>=70)reasons.push("stark 1–2 picks framåt");

  return {
    ch:champ,role,score,state,lookahead,flex,risk,
    reasons:[...new Set(reasons)].slice(0,4),
    anchors:compRanks.slice(0,2)
  };
}

function aiRoleCandidates(role){
  if(!role||role==="unknown")return[];
  const used=unavailable();
  return (teamPool[role]||[])
    .filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>aiCandidate(ch,role))
    .sort((a,b)=>b.score-a.score);
}

function aiSoftmaxConfidence(list,index=0){
  if(!list.length)return 0;
  const top=list.slice(0,5);
  const max=Math.max(...top.map(x=>x.score));
  const exps=top.map(x=>Math.exp((x.score-max)/AI_CONFIG.temperature));
  const sum=exps.reduce((a,b)=>a+b,0)||1;
  return Math.round((exps[index]||0)/sum*100);
}

function aiRoleTimingBonus(role){
  const enemyMap=enemyRoleMap(),map=ownRoleMap();
  if(map[role])return -999;
  let s=0;
  if(enemyMap[role])s+=role==="top"?12:role==="mid"?10:6;
  if(!enemyMap[role]&&role==="top")s-=7;
  if(!enemyMap[role]&&role==="mid")s-=4;

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
    aiRoleCandidates(role).slice(0,3).forEach(x=>{
      options.push({...x,total:x.score+aiRoleTimingBonus(role)});
    });
  });

  options.sort((a,b)=>b.total-a.total);
  options.forEach((x,i)=>x.confidence=aiSoftmaxConfidence(options,i));
  return options;
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

function aiConfidenceLabel(pct,gap){
  if(pct>=60&&gap>=8)return "HÖG";
  if(pct>=43&&gap>=3)return "MEDEL";
  return "LÅG";
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
  const confidence=aiConfidenceLabel(best.confidence,gap);
  const anchor=best.anchors[0]?.name||desiredComp();
  const pivot=best.anchors[1]?.name||"—";

  document.getElementById("aiCall").textContent=roleNames[best.role]+": "+best.ch;
  document.getElementById("aiConfidence").textContent=confidence+" · "+best.confidence+"% relativ confidence";
  document.getElementById("aiAnchor").textContent=anchor;
  document.getElementById("aiPivot").textContent=pivot;
  document.getElementById("aiLookahead").textContent=Math.round(best.lookahead)+"/100";
  document.getElementById("aiRisk").textContent=best.risk.label+(best.risk.reasons.length?" · "+best.risk.reasons.join(", "):"");
  document.getElementById("aiWhy").textContent=(best.reasons.join(" · ")||"Bäst total balans mellan comfort, comp och enemy draft.")+
    ". Core comps används som ankare, inte som hårda lås.";

  const alternatives=list.slice(1,4).map(x=>roleNames[x.role]+" "+x.ch).join(" · ");
  document.getElementById("aiAlternatives").textContent=alternatives||"—";
}

// Keep the familiar recommendation box, but let the hybrid score drive it.
function renderRecommendation(){
  const t=current(),box=$("recommendationBox");
  if(!t||t.side!==userSide){box.classList.add("hidden");return}

  if(t.type==="ban"){
    const bans=banRecommendations();box.classList.remove("hidden");
    $("recommendEyebrow").textContent="BANFÖRSLAG";$("recommendRole").textContent="BAN:";
    $("recommendPicks").textContent=bans.join(" / ");
    $("recommendReason").textContent="Core comp + enemy threats + phase-2 rollvärde.";
    return;
  }

  const role=selectedRole||recommendedNextRole();
  const recs=aiRoleCandidates(role).slice(0,3);
  if(!role||!recs.length){box.classList.add("hidden");return;}
  box.classList.remove("hidden");
  $("recommendEyebrow").textContent=selectedRole?"HYBRID PICK":"HYBRID NÄSTA ROLL";
  $("recommendRole").textContent=roleNames[role]+":";
  $("recommendPicks").textContent=recs.map(x=>x.ch).join(" / ");
  const top=recs[0];
  $("recommendReason").textContent=
    "Core: "+(top.anchors[0]?.name||desiredComp())+
    " · Lookahead "+Math.round(top.lookahead)+
    " · Risk "+top.risk.label+
    " · "+(top.reasons.slice(0,2).join(" + ")||"stark helhetsfit");
}

const deterministicRender = render;
render = function(){
  deterministicRender();
  renderAIInsight();
};

if(userSide)render();
