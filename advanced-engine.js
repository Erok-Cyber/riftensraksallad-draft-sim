/* Riftensräksallad Draft Brain — Advanced automatic layer
   Runs after live.js and before draft-ai.js.
   No extra user input: derives structure, dependencies and team patterns from the draft. */

const ADV_BURST=new Set(["Ahri","Annie","Darius","Jarvan IV","Malphite","Renekton","Sylas","Vex","Vi","Wukong"]);
const ADV_SUSTAINED=new Set(["Anivia","Graves","Hwei","Jinx","Kindred","Lillia","Mordekaiser","Olaf","Trundle","Udyr","Varus","Viego","Viktor","Xayah","Xin Zhao"]);
const ADV_PERCENT_HP=new Set(["Lillia","Mordekaiser","Trundle","Varus"]);
const ADV_CLEANUP=new Set(["Darius","Jinx","Kindred","Viego"]);
const ADV_HARD_ENGAGE=new Set(["Annie","Jarvan IV","Leona","Malphite","Maokai","Nautilus","Vi","Wukong"]);
const ADV_COUNTER_ENGAGE=new Set(["Anivia","Maokai","Shen","Taliyah","Vex","Xayah"]);
const ADV_BIG_ULT=new Set(["Annie","Ashe","Jarvan IV","Kindred","Lillia","Malphite","Maokai","Mordekaiser","Shen","Varus","Vex","Vi","Wukong"]);
const ADV_SIDE=new Set(["Darius","Garen","Mordekaiser","Olaf","Shen","Sion","Trundle","Yorick"]);
const ADV_FOG=new Set(["Ahri","Annie","Ashe","Jarvan IV","Leona","Maokai","Nautilus","Vex","Vi"]);
const ADV_OBJ_DPS=new Set(["Graves","Heimerdinger","Jinx","Kindred","Lillia","Mordekaiser","Trundle","Udyr","Varus","Viego","Volibear","Xayah","Xin Zhao"]);
const ADV_IMMOBILE_OWN=new Set(["Anivia","Annie","Ashe","Hwei","Jinx","Varus","Viktor"]);

const ADV_FRONT_Q={
  "Sion":3.0,"Maokai":3.0,"Malphite":2.8,"Shen":2.7,"Udyr":2.7,"Galio":2.6,
  "Nautilus":2.5,"Leona":2.4,"Mordekaiser":2.2,"Volibear":2.2,"Trundle":2.0,
  "Renekton":1.9,"Garen":1.8,"Jarvan IV":1.7,"Wukong":1.6,"Xin Zhao":1.5,"Vi":1.4
};
const ADV_ENGAGE_Q={
  "Malphite":3.0,"Jarvan IV":2.8,"Annie":2.7,"Leona":2.7,"Nautilus":2.6,
  "Maokai":2.5,"Vi":2.5,"Wukong":2.4,"Ashe":2.0,"Vex":1.8,"Sion":1.7,"Shen":1.2
};
const ADV_PEEL_Q={
  "Maokai":2.8,"Nautilus":2.6,"Shen":2.5,"Leona":2.3,"Taliyah":2.2,
  "Anivia":2.2,"Vex":1.9,"Xayah":1.8,"Malphite":1.4,"Ashe":1.4
};

const advClamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const advCount=(list,set)=>list.reduce((n,e)=>n+(set.has(e.champ)?1:0),0);
const advQ=(list,map)=>list.reduce((n,e)=>n+(map[e.champ]||0),0);

function advArchive(){
  try{return JSON.parse(localStorage.getItem("rs_draft_archive")||"[]")}catch{return[]}
}

function advTeamPattern(){
  const archive=advArchive();
  if(!archive.length)return {text:"Ingen riktig draft sparad ännu.",drafts:0,champFreq:{},roleFreq:{}};

  const compCount={},riskCount={},champFreq={},roleFreq={};
  archive.forEach(d=>{
    if(d.comp)compCount[d.comp]=(compCount[d.comp]||0)+1;
    if(d.topRisk)riskCount[d.topRisk]=(riskCount[d.topRisk]||0)+1;
    (d.ourPicks||[]).forEach(p=>{
      champFreq[p.champ]=(champFreq[p.champ]||0)+1;
      const key=(p.role||"?")+"|"+p.champ;
      roleFreq[key]=(roleFreq[key]||0)+1;
    });
  });
  const topComp=Object.entries(compCount).sort((a,b)=>b[1]-a[1])[0];
  const topRisk=Object.entries(riskCount).sort((a,b)=>b[1]-a[1])[0];
  let text=archive.length+" riktiga drafts";
  if(topComp)text+=" · vanligast "+topComp[0]+" ("+topComp[1]+")";
  if(topRisk&&topRisk[1]>=2)text+=" · återkommande: "+topRisk[0];
  return {text,drafts:archive.length,champFreq,roleFreq};
}

function advDamageProfile(list=ours()){
  const ad=list.filter(e=>damageType[e.champ]==="AD").length;
  const ap=list.filter(e=>damageType[e.champ]==="AP").length;
  const mix=list.filter(e=>damageType[e.champ]==="MIX").length;
  const burst=advCount(list,ADV_BURST);
  const sustained=advCount(list,ADV_SUSTAINED);
  const pct=advCount(list,ADV_PERCENT_HP);
  const cleanup=advCount(list,ADV_CLEANUP);
  const parts=[];
  if(burst)parts.push("burst "+burst);
  if(sustained)parts.push("sustained "+sustained);
  if(pct)parts.push("%HP "+pct);
  if(cleanup)parts.push("reset/cleanup "+cleanup);
  return {ad,ap,mix,burst,sustained,pct,cleanup,text:(parts.join(" · ")||"damageprofil byggs")};
}

function advStructure(list=ours()){
  const p=enemyProfile();
  const frontQ=advQ(list,ADV_FRONT_Q);
  const engageQ=advQ(list,ADV_ENGAGE_Q);
  const peelQ=advQ(list,ADV_PEEL_Q);
  const damage=advDamageProfile(list);
  const wave=list.filter(e=>smartTraits.waveclear.has(e.champ)).length;
  const antiTank=list.filter(e=>smartTraits.antiTank.has(e.champ)||ADV_PERCENT_HP.has(e.champ)).length;
  const range=list.filter(e=>smartTraits.rangedDamage.has(e.champ)).length;
  const threats=list.filter(e=>traits.damage.has(e.champ)||ADV_SUSTAINED.has(e.champ)||ADV_BURST.has(e.champ)).length;
  const checks=[
    ["frontline",frontQ>=2.2],
    ["engage",engageQ>=2.0],
    ["2 threats",threats>=2],
    ["damage mix",!(damage.ad>=3&&damage.ap===0)&&!(damage.ap>=3&&damage.ad===0)],
    ["peel",p.dive<2||peelQ>=1.8],
    ["waveclear",wave>0],
    ["anti-tank",p.tanks<2||antiTank>0||damage.sustained>=2],
    ["range",range>0]
  ];
  const good=checks.filter(x=>x[1]).length;
  const missing=checks.filter(x=>!x[1]).map(x=>x[0]);
  return {frontQ,engageQ,peelQ,damage,wave,antiTank,range,threats,good,total:checks.length,missing};
}

function advHybridIdentity(){
  const ranks=compRankings();
  if(!ranks.length)return "ÖPPEN";
  const a=ranks[0],b=ranks[1];
  if(b&&a.score>=8&&b.score>=8&&(a.score-b.score)<=6)return a.name+" / "+b.name+" HYBRID";
  return a.name;
}

function advRoleCanSolve(role,need){
  const pool=(teamPool[role]||[]).filter(ch=>!unavailable().has(ch.toLowerCase()));
  const test=ch=>{
    if(need==="FRONTLINE")return (ADV_FRONT_Q[ch]||0)>=2||traits.frontline.has(ch);
    if(need==="ENGAGE")return (ADV_ENGAGE_Q[ch]||0)>=2||traits.engage.has(ch);
    if(need==="PEEL")return (ADV_PEEL_Q[ch]||0)>=1.8||smartTraits.peel.has(ch);
    if(need==="AP")return damageType[ch]==="AP"||damageType[ch]==="MIX";
    if(need==="AD")return damageType[ch]==="AD"||damageType[ch]==="MIX";
    if(need==="ANTI-TANK")return smartTraits.antiTank.has(ch)||ADV_PERCENT_HP.has(ch);
    if(need==="WAVECLEAR")return smartTraits.waveclear.has(ch);
    if(need==="RANGE")return smartTraits.rangedDamage.has(ch);
    if(need==="DAMAGE")return traits.damage.has(ch)||ADV_SUSTAINED.has(ch)||ADV_BURST.has(ch);
    return false;
  };
  return pool.some(test);
}

function advUrgentNeeds(list=ours()){
  const s=advStructure(list),p=enemyProfile(),d=s.damage;
  const out=[];
  const add=(priority,key,label)=>out.push({priority,key,label});
  if(s.frontQ<2.2)add(10,"FRONTLINE","frontline");
  if(s.engageQ<2)add(9,"ENGAGE","engage");
  if(d.ad>=2&&d.ap===0)add(10,"AP","AP damage");
  if(d.ap>=2&&d.ad===0)add(8,"AD","AD damage");
  if(p.dive>=2&&s.peelQ<1.8)add(9,"PEEL","peel");
  if(p.tanks>=2&&s.antiTank===0&&d.sustained<2)add(9,"ANTI-TANK","anti-tank");
  if(s.threats<2&&list.length>=3)add(8,"DAMAGE","andra damage threat");
  if(s.range===0&&list.length>=3)add(6,"RANGE","range");
  if(s.wave===0&&list.length>=3)add(5,"WAVECLEAR","waveclear");
  return out.sort((a,b)=>b.priority-a.priority);
}

function advRoleResponsibility(){
  const own=ownRoleMap();
  const open=roles.filter(r=>!own[r]);
  const needs=advUrgentNeeds().slice(0,2);
  if(!open.length)return "Alla roller låsta.";
  if(!needs.length)return "Ingen akut strukturell lucka — spela comp-fit/counter.";
  return needs.map(n=>{
    const solvers=open.filter(r=>advRoleCanSolve(r,n.key));
    return n.label.toUpperCase()+" → "+(solvers.length?solvers.map(r=>roleNames[r]).join("/"):"svårt med kvarvarande pool");
  }).join(" · ");
}

function advPickDependency(champ,role){
  const list=ours().filter(e=>e.role!==role).concat([{champ,role}]);
  const s=advStructure(list),d=s.damage;
  const own=ownRoleMap();
  const open=roles.filter(r=>r!==role&&!own[r]);
  const deps=[];
  const add=(key,label,weight)=>{
    const can=open.some(r=>advRoleCanSolve(r,key));
    deps.push({key,label,weight:can?weight:weight+2,can});
  };

  if(["Lillia","Graves","Kindred","Viego"].includes(champ)&&s.frontQ<2.2&&list.length>=2)add("FRONTLINE","kräver frontline från annan roll",2);
  if(ADV_IMMOBILE_OWN.has(champ)&&s.peelQ<1.5&&list.length>=2)add("PEEL","vill ha peel runt carryn",1.5);
  if(role==="jungle"&&["Lillia","Graves","Kindred"].includes(champ)){
    const lanePicks=list.filter(e=>e.role&&e.role!=="jungle");
    const pressure=lanePicks.filter(e=>smartTraits.lanePressure.has(e.champ)).length;
    if(lanePicks.length>=2&&pressure===0)add("ENGAGE","behöver mer lane-prio/setup",1.5);
  }
  if(d.ad>=3&&d.ap===0)add("AP","låser er AD-tungt",2.5);
  if(d.ap>=3&&d.ad===0)add("AD","låser er AP-tungt",2.0);
  if(s.engageQ<1.5&&list.length>=3)add("ENGAGE","kräver tydligare GO-knapp",1.5);

  const penalty=advClamp(deps.reduce((n,x)=>n+x.weight,0),0,7);
  return {deps,penalty};
}

function advFamiliarity(champ,role){
  const pat=advTeamPattern();
  if(pat.drafts<5)return 0;
  const n=pat.roleFreq[role+"|"+champ]||0;
  return advClamp((n/pat.drafts)*5,0,3);
}

function advCandidateStructuralBonus(champ,role){
  const urgent=advUrgentNeeds();
  if(!urgent.length)return {points:0,label:null};
  const top=urgent[0];
  let solves=false;
  if(top.key==="FRONTLINE")solves=(ADV_FRONT_Q[champ]||0)>=2||traits.frontline.has(champ);
  if(top.key==="ENGAGE")solves=(ADV_ENGAGE_Q[champ]||0)>=2||traits.engage.has(champ);
  if(top.key==="PEEL")solves=(ADV_PEEL_Q[champ]||0)>=1.8||smartTraits.peel.has(champ);
  if(top.key==="AP")solves=damageType[champ]==="AP"||damageType[champ]==="MIX";
  if(top.key==="AD")solves=damageType[champ]==="AD"||damageType[champ]==="MIX";
  if(top.key==="ANTI-TANK")solves=smartTraits.antiTank.has(champ)||ADV_PERCENT_HP.has(champ);
  if(top.key==="WAVECLEAR")solves=smartTraits.waveclear.has(champ);
  if(top.key==="RANGE")solves=smartTraits.rangedDamage.has(champ);
  if(top.key==="DAMAGE")solves=traits.damage.has(champ)||ADV_SUSTAINED.has(champ)||ADV_BURST.has(champ);
  return solves?{points:4,label:"löser "+top.label}:{points:0,label:null};
}

const advBaseScoreCandidateDetails=scoreCandidateDetails;
scoreCandidateDetails=function(champ,role,compName){
  const out=advBaseScoreCandidateDetails(champ,role,compName);
  out.reasons=[...(out.reasons||[])];

  const dep=advPickDependency(champ,role);
  if(dep.penalty>0){
    out.score-=dep.penalty;
    const d=dep.deps[0];
    if(d)out.reasons.push({pts:-dep.penalty,label:d.label});
  }

  const solve=advCandidateStructuralBonus(champ,role);
  if(solve.points){
    out.score+=solve.points;
    out.reasons.push({pts:solve.points,label:solve.label});
  }

  const fam=advFamiliarity(champ,role);
  if(fam>=1){
    out.score+=fam;
    out.reasons.push({pts:fam,label:"team familiarity"});
  }

  const p=enemyProfile(),s=advStructure();
  if(p.tanks>=2&&ADV_SUSTAINED.has(champ)&&s.damage.sustained===0){
    out.score+=4;out.reasons.push({pts:4,label:"sustained mot frontline"});
  }
  if(p.dive>=2&&(ADV_PEEL_Q[champ]||0)>=2&&s.peelQ<1.8){
    out.score+=4;out.reasons.push({pts:4,label:"kvalitets-peel"});
  }
  if(s.engageQ<1.8&&(ADV_ENGAGE_Q[champ]||0)>=2.4){
    out.score+=4;out.reasons.push({pts:4,label:"pålitlig GO-knapp"});
  }
  out.reasons.sort((a,b)=>b.pts-a.pts);
  out.advanced={dependency:dep};
  return out;
};

function advObjectiveProfile(){
  const own=ours();
  const dps=advCount(own,ADV_OBJ_DPS);
  const engage=advQ(own,ADV_ENGAGE_Q);
  const zone=own.filter(e=>smartTraits.zone.has(e.champ)).length;
  const pick=own.filter(e=>smartTraits.pick.has(e.champ)).length;
  let label,detail;
  if(dps>=3&&engage>=2){
    label="START → TURN";
    detail="Bra objective DPS + engage. Starta för att dra in dem och turna på tydlig call.";
  }else if(zone>=2){
    label="ZONE → START";
    detail="Äg chokepoints/vision först; objective är belöningen när enemy tappat space.";
  }else if(pick>=2){
    label="PICK → START";
    detail="Sök numbers advantage från fog innan ni committar till objective.";
  }else if(dps>=2){
    label="FAST START";
    detail="Ni kan ta objective snabbt, men säkra enemy position innan full commit.";
  }else{
    label="SETUP FÖRST";
    detail="Låg ren objective DPS: vinn space/fight före ni börjar.";
  }
  return {label,detail,dps};
}

function advSideVision(){
  const map=ownRoleMap();
  const side=roles.map(r=>({role:r,ch:map[r]})).filter(x=>x.ch&&ADV_SIDE.has(x.ch))[0];
  const fog=advCount(ours(),ADV_FOG);
  const sideText=side?side.ch+" sidear; övriga håller mid/objective-tempo":"håll gruppen kompakt; ingen självklar deep side";
  const vision=fog>=2?"HÖG fog-value: sweeper/control wards före engage":"normal vision: säkra entrances innan objective";
  return {sideText,vision,text:sideText+" · "+vision};
}

function advCooldownPlan(){
  const big=ours().filter(e=>ADV_BIG_ULT.has(e.champ)).map(e=>e.champ);
  if(big.length>=3)return {label:"HÖG ULT-DEPENDENCY",detail:"Fighta när "+big.slice(0,3).join("/")+" har R. Saknas flera ults → tradea hellre än forcea."};
  if(big.length===2)return {label:"MEDEL",detail:"Synka "+big.join(" + ")+" inför större objective; ni kan fortfarande skirmisha utan allt."};
  return {label:"LÅG",detail:"Ni är mindre bundna till stora ult-cycles och kan spela mer kontinuerligt tempo."};
}

function advFightStyle(){
  const s=advStructure(),p=enemyProfile();
  if(p.dive>=2&&s.peelQ>=1.8)return "COUNTER-ENGAGE → överlev deras första commit och vänd.";
  if(s.engageQ>=4&&s.damage.burst>=1)return "HARD ENGAGE → samma target → direkt conversion.";
  if(s.damage.sustained>=2&&s.frontQ>=2.2)return "FRONT-TO-BACK → fronta för sustained carry damage.";
  if(advCount(ours(),ADV_FOG)>=2)return "PICK/FOG → skapa numbers advantage innan 5v5.";
  if(ours().filter(e=>smartTraits.zone.has(e.champ)).length>=2)return "ZONE/CONTROL → låt enemy gå genom chokes.";
  return "FLEX → spela runt prio, cooldowns och tydlig första target.";
}

function advTeamHealthText(){
  const s=advStructure();
  const miss=s.missing.slice(0,3);
  return s.good+"/"+s.total+" löst"+(miss.length?" · saknas: "+miss.join(", "):" · komplett struktur");
}

const advBaseRenderAutoRead=renderAutoRead;
renderAutoRead=function(){
  advBaseRenderAutoRead();
  const s=advStructure(),pat=advTeamPattern(),obj=advObjectiveProfile(),sv=advSideVision();
  const health=document.getElementById("advHealth");
  if(!health)return;
  health.textContent=advTeamHealthText()+" · "+advHybridIdentity();
  document.getElementById("advDamage").textContent=s.damage.text+" · "+s.damage.ad+" AD / "+s.damage.ap+" AP / "+s.damage.mix+" MIX";
  document.getElementById("advResponsibility").textContent=advRoleResponsibility();
  document.getElementById("advObjectiveStyle").textContent=obj.label+" — "+obj.detail;
  document.getElementById("advSideVision").textContent=sv.text;
  document.getElementById("advTeamPattern").textContent=testMode?"TEST MODE · historiken läses men påverkas inte":pat.text;
  if(document.getElementById("autoReadTitle")&&ours().length>=2){
    document.getElementById("autoReadTitle").textContent="AUTO: "+advHybridIdentity()+" · "+compConfidence()+" confidence";
  }
};

const advBaseBuildFinalGameplan=buildFinalGameplan;
buildFinalGameplan=function(){
  const gp=advBaseBuildFinalGameplan();
  const obj=advObjectiveProfile(),sv=advSideVision(),cd=advCooldownPlan();
  return {...gp,
    advFightStyle:advFightStyle(),
    advCooldowns:cd.label+" — "+cd.detail,
    advSideLane:sv.text,
    advObjectiveStyle:obj.label+" — "+obj.detail
  };
};

const advBaseRenderFinalGameplan=renderFinalGameplan;
renderFinalGameplan=function(){
  advBaseRenderFinalGameplan();
};

// Expose a small read-only surface for debugging/future UI.
window.RiftAdvanced={
  damageProfile:advDamageProfile,
  structure:advStructure,
  hybridIdentity:advHybridIdentity,
  roleResponsibility:advRoleResponsibility,
  pickDependency:advPickDependency,
  teamPattern:advTeamPattern,
  objectiveProfile:advObjectiveProfile
};
