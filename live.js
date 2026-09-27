const teamPool={
top:["Renekton","Malphite","Shen","Mordekaiser","Sion","Darius","Garen","Olaf","Trundle","Heimerdinger"],
jungle:["Xin Zhao","Jarvan IV","Viego","Volibear","Udyr","Vi","Wukong","Graves","Kindred"],
mid:["Ahri","Annie","Vex","Hwei","Taliyah","Viktor","Sylas","Anivia"],
adc:["Ashe","Varus","Xayah","Jinx","Senna"],
support:["Nautilus","Leona","Maokai"]
};

const suggestions=[...new Set(Object.values(teamPool).flat().concat([
"Aatrox","Akali","Alistar","Ambessa","Aphelios","Aurora","Azir","Braum","Caitlyn","Camille","Cassiopeia","Ezreal","Fiora","Gnar","Gragas","Ivern","Jax","Jayce","Kai'Sa","Kalista","Kennen","K'Sante","Lee Sin","Lucian","Lulu","Milio","Miss Fortune","Nami","Nocturne","Orianna","Ornn","Poppy","Rakan","Rell","Rumble","Ryze","Sejuani","Skarner","Smolder","Syndra","Tahm Kench","Tristana","Tryndamere","Twisted Fate","Yone","Yunara","Zac","Zeri","Kayn","Samira","Janna","Kayle"
]))].sort();

const draftOrder=[
{type:"ban",side:"blue",label:"B1 BAN"},{type:"ban",side:"red",label:"R1 BAN"},
{type:"ban",side:"blue",label:"B2 BAN"},{type:"ban",side:"red",label:"R2 BAN"},
{type:"ban",side:"blue",label:"B3 BAN"},{type:"ban",side:"red",label:"R3 BAN"},
{type:"pick",side:"blue",label:"B1 PICK"},
{type:"pick",side:"red",label:"R1 PICK"},{type:"pick",side:"red",label:"R2 PICK"},
{type:"pick",side:"blue",label:"B2 PICK"},{type:"pick",side:"blue",label:"B3 PICK"},
{type:"pick",side:"red",label:"R3 PICK"},
{type:"ban",side:"red",label:"R4 BAN"},{type:"ban",side:"blue",label:"B4 BAN"},
{type:"ban",side:"red",label:"R5 BAN"},{type:"ban",side:"blue",label:"B5 BAN"},
{type:"pick",side:"red",label:"R4 PICK"},
{type:"pick",side:"blue",label:"B4 PICK"},{type:"pick",side:"blue",label:"B5 PICK"},
{type:"pick",side:"red",label:"R5 PICK"}
];

const comps={
"EARLY SKIRMISH":{
core:{top:"Renekton",jungle:"Xin Zhao",mid:"Ahri",adc:"Ashe",support:"Nautilus"},
alts:{
top:["Garen","Darius","Mordekaiser","Olaf","Trundle"],
jungle:["Viego","Wukong","Volibear"],
mid:["Taliyah","Vex","Sylas"],
adc:["Varus","Xayah"],
support:["Leona","Maokai"]},
plan:"Prio först → fighta 2v2/3v3 → objective. INTE chase."
},
"PRESS R":{
core:{top:"Malphite",jungle:"Jarvan IV",mid:"Annie",adc:"Jinx",support:"Leona"},
alts:{
top:["Galio","Mordekaiser","Shen","Sion"],
jungle:["Xin Zhao","Vi","Wukong","Viego"],
mid:["Vex","Hwei","Taliyah","Viktor"],
adc:["Ashe","Xayah"],
support:["Nautilus","Maokai"]},
plan:"5v5. Engage först → chain CC → carry följer → reset."
},
"OBJECTIVE CONTROL":{
core:{top:"Mordekaiser",jungle:"Udyr",mid:"Taliyah",adc:"Varus",support:"Maokai"},
alts:{
top:["Sion","Shen","Galio","Heimerdinger"],
jungle:["Volibear","Xin Zhao"],
mid:["Hwei","Ahri","Viktor","Anivia"],
adc:["Ashe","Xayah"],
support:["Nautilus","Leona"]},
plan:"Push → reset → river. Håll chokes. JAGA INTE."
},
"JUNGLE CARRY":{
core:{top:"Shen",jungle:"Viego",mid:"Taliyah",adc:"Ashe",support:"Nautilus"},
alts:{
top:["Malphite","Sion","Mordekaiser"],
jungle:["Kindred","Graves"],
mid:["Ahri","Hwei","Viktor"],
adc:["Varus","Senna","Xayah"],
support:["Leona","Maokai"]},
plan:"Lanes skapar prio/setup → jungle tar space och resurser."
}
};

const tags={
engage:new Set(["Malphite","Jarvan IV","Annie","Leona","Nautilus","Maokai","Vi","Wukong","Amumu","Sion","Rakan","Rell","Sejuani","Zac"]),
frontline:new Set(["Malphite","Jarvan IV","Leona","Nautilus","Maokai","Mordekaiser","Udyr","Volibear","Sion","Shen","Galio","Renekton","Xin Zhao","Wukong","Vi","Poppy","Ornn","Sejuani","Zac"]),
damage:new Set(["Jinx","Varus","Xayah","Ashe","Viego","Kindred","Graves","Taliyah","Hwei","Viktor","Ahri","Annie","Darius","Olaf","Mordekaiser","Xin Zhao","Yone","Caitlyn","Kai'Sa","Lucian","Zeri","Syndra","Orianna","Miss Fortune"]),
early:new Set(["Renekton","Xin Zhao","Ahri","Ashe","Nautilus","Leona","Jarvan IV","Volibear","Darius","Olaf","Taliyah","Varus","Vi","Wukong","Poppy","Lee Sin","Lucian","Caitlyn"]),
dive:new Set(["Vi","Jarvan IV","Wukong","Malphite","Leona","Nocturne","Zac","Rakan","Rell","Camille","Akali","Yone","Kai'Sa","Lee Sin"]),
melee:new Set(["Darius","Garen","Renekton","Mordekaiser","Shen","Sion","Malphite","Jarvan IV","Vi","Wukong","Xin Zhao","Udyr","Volibear","Nautilus","Leona","Maokai","Olaf","Trundle","Tryndamere","Lee Sin","Rakan","Rell","Camille","Jax","Fiora","K'Sante","Ambessa"]),
poke:new Set(["Jayce","Hwei","Varus","Ezreal","Caitlyn","Syndra","Lux","Ziggs","Xerath","Vel'Koz","Miss Fortune"]),
disengage:new Set(["Milio","Janna","Lulu","Braum","Maokai","Poppy","Xayah"]),
immobileCarry:new Set(["Jinx","Miss Fortune","Varus","Syndra","Viktor","Aphelios","Caitlyn","Jhin","Ashe"])
};

let userSide=null,step=0,events=[],selectedRole=null;
const roles=["top","jungle","mid","adc","support"];
const roleNames={top:"TOP",jungle:"JUNGLE",mid:"MID",adc:"ADC",support:"SUPPORT",unknown:"?"};
const $=id=>document.getElementById(id);

suggestions.forEach(c=>{const o=document.createElement("option");o.value=c;$("champions").appendChild(o)});

document.querySelectorAll(".side-btn").forEach(btn=>btn.addEventListener("click",()=>{
  userSide=btn.dataset.side;
  $("startCard").classList.add("hidden");
  $("liveArea").classList.remove("hidden");
  render();
}));

document.querySelectorAll(".role-buttons button").forEach(btn=>btn.addEventListener("click",()=>{
  selectedRole=btn.dataset.role;
  document.querySelectorAll(".role-buttons button").forEach(b=>b.classList.toggle("active",b.dataset.role===selectedRole));
  renderRecommendation();
}));

$("lockBtn").addEventListener("click",lockCurrent);
$("championInput").addEventListener("keydown",e=>{if(e.key==="Enter")lockCurrent()});
$("resetBtn").addEventListener("click",()=>location.reload());

function current(){return draftOrder[step]||null}
function ours(){return events.filter(e=>e.type==="pick"&&e.side===userSide)}
function enemies(){return events.filter(e=>e.type==="pick"&&e.side!==userSide)}
function unavailable(){return new Set(events.map(e=>e.champ.toLowerCase()))}
function ownRoleMap(){const m={};ours().forEach(e=>{if(e.role&&e.role!=="unknown")m[e.role]=e.champ});return m}

function lockCurrent(){
  const turn=current(); if(!turn)return;
  const champ=$("championInput").value.trim();
  if(!champ)return;
  if(unavailable().has(champ.toLowerCase())){alert("Championen är redan pickad eller bannad.");return}
  let role=null;
  if(turn.type==="pick"){
    if(!selectedRole){alert("Välj roll för picken.");return}
    if(turn.side===userSide&&selectedRole==="unknown"){alert("Välj riktig roll för er pick.");return}
    if(turn.side===userSide&&ownRoleMap()[selectedRole]){alert("Den rollen är redan fylld.");return}
    role=selectedRole;
  }
  events.push({...turn,champ,role});
  step++; selectedRole=null; $("championInput").value="";
  document.querySelectorAll(".role-buttons button").forEach(b=>b.classList.remove("active"));
  render();
}

function render(){
  renderTeam("blue");renderTeam("red");renderTurn();renderStatus();renderCoach();renderRecommendation();
  $("draftProgress").textContent=step+" / "+draftOrder.length;
}

function renderTeam(side){
  const bans=events.filter(e=>e.side===side&&e.type==="ban");
  $(side+"Bans").innerHTML=bans.length?bans.map(e=>'<span class="ban-chip">'+e.champ+"</span>").join(""):'<span class="hint">—</span>';
  const picks=events.filter(e=>e.side===side&&e.type==="pick");
  const box=$(side+"Picks");box.innerHTML="";
  for(let i=0;i<5;i++){
    const p=picks[i],div=document.createElement("div");div.className="pick";
    div.innerHTML='<span class="slot">'+(p&&p.role?roleNames[p.role]:"P"+(i+1))+'</span><span class="champ">'+(p?p.champ:"—")+"</span>";
    box.appendChild(div);
  }
}

function renderTurn(){
  const t=current();
  if(!t){$("phaseLabel").textContent="KLAR";$("turnLabel").textContent="DRAFT KLAR";$("lockBtn").style.display="none";$("roleWrap").classList.add("hidden");return}
  $("phaseLabel").textContent=t.type==="ban"?"BAN":"PICK";
  $("turnLabel").textContent=t.label+" · "+(t.side===userSide?"NI":"ENEMY");
  $("roleWrap").classList.toggle("hidden",t.type!=="pick");
  if(t.type==="pick"){
    document.querySelectorAll(".role-buttons button").forEach(b=>{
      const isOwn=t.side===userSide;
      b.classList.toggle("hidden",isOwn&&b.dataset.role==="unknown");
      b.classList.toggle("locked",isOwn&&!!ownRoleMap()[b.dataset.role]);
    });
  }
}

function countTag(list,set){return list.filter(x=>set.has(x.champ)).length}
function compScore(name){
  const c=comps[name],map=ownRoleMap();let s=0;
  Object.entries(map).forEach(([r,ch])=>{if(c.core[r]===ch)s+=4;else if((c.alts[r]||[]).includes(ch))s+=2});
  return s;
}
function desiredComp(){
  const enemy=enemies();
  const dive=countTag(enemy,tags.dive),melee=countTag(enemy,tags.melee),poke=countTag(enemy,tags.poke),immobile=countTag(enemy,tags.immobileCarry);
  const scores=Object.keys(comps).map(n=>({n,s:compScore(n)})).sort((a,b)=>b.s-a.s);
  if(scores[0].s>=6)return scores[0].n;
  if(melee>=3)return "OBJECTIVE CONTROL";
  if(dive>=2||poke>=2||immobile>=2)return "PRESS R";
  const jg=ownRoleMap().jungle;
  if(["Viego","Kindred","Graves"].includes(jg))return "JUNGLE CARRY";
  return "EARLY SKIRMISH";
}

function candidateScore(champ,role,compName){
  const c=comps[compName],own=ours(),enemy=enemies();let s=0;
  if(c.core[role]===champ)s+=40;
  if((c.alts[role]||[]).includes(champ))s+=22;
  if(!tags.frontline.has.bind(tags.frontline)){}
  const ownFront=countTag(own,tags.frontline),ownEngage=countTag(own,tags.engage),ownDmg=countTag(own,tags.damage);
  if(ownFront===0&&tags.frontline.has(champ))s+=16;
  if(ownEngage===0&&tags.engage.has(champ))s+=16;
  if(ownDmg<2&&tags.damage.has(champ))s+=10;

  const dive=countTag(enemy,tags.dive),melee=countTag(enemy,tags.melee),poke=countTag(enemy,tags.poke),dis=countTag(enemy,tags.disengage);
  if(dive>=2&&["Xayah","Vex","Taliyah","Maokai","Malphite","Nautilus"].includes(champ))s+=18;
  if(melee>=3&&["Heimerdinger","Taliyah","Maokai","Udyr","Wukong","Mordekaiser","Varus"].includes(champ))s+=17;
  if(poke>=2&&["Jarvan IV","Vi","Malphite","Annie","Leona","Nautilus","Ashe"].includes(champ))s+=16;
  if(dis>=2&&["Vi","Jarvan IV","Malphite","Ashe"].includes(champ))s+=10;
  if(role==="top"&&melee>=2&&["Renekton","Darius","Olaf","Heimerdinger","Mordekaiser"].includes(champ))s+=7;
  if(role==="jungle"&&enemy.some(e=>e.champ==="Lee Sin")&&["Xin Zhao","Volibear","Jarvan IV"].includes(champ))s+=8;
  return s;
}

function topRecommendations(role){
  if(!role||role==="unknown")return[];
  const used=unavailable();
  const comp=desiredComp();
  return teamPool[role].filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>({ch,s:candidateScore(ch,role,comp)}))
    .sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.ch);
}

function renderRecommendation(){
  const t=current();
  const box=$("recommendationBox");
  if(!t||t.type!=="pick"||t.side!==userSide||!selectedRole){box.classList.add("hidden");return}
  const recs=topRecommendations(selectedRole);
  box.classList.remove("hidden");
  $("recommendRole").textContent=roleNames[selectedRole]+":";
  $("recommendPicks").textContent=recs.length?recs.join(" / "):"Inga tillgängliga picks i team-poolen";
  $("recommendReason").textContent="Riktning: "+desiredComp()+" · filtrerat på bans/picks + engage/frontline/damage + enemy hot.";
}

function renderStatus(){
  const map=ownRoleMap(),box=$("roleStatus");box.innerHTML="";
  roles.forEach(r=>{
    const d=document.createElement("div");d.className="role-slot"+(map[r]?" filled":"");
    d.innerHTML="<span>"+roleNames[r]+"</span><strong>"+(map[r]||"—")+"</strong>";box.appendChild(d);
  });
  const left=roles.filter(r=>!map[r]).length;$("needsBadge").textContent=left+" roller kvar";
}

function renderCoach(){
  const comp=desiredComp(),enemy=enemies(),own=ours();
  $("compCall").textContent="COMP: "+comp;
  $("planCall").textContent=comps[comp].plan;

  const dive=countTag(enemy,tags.dive),melee=countTag(enemy,tags.melee),poke=countTag(enemy,tags.poke),dis=countTag(enemy,tags.disengage);
  let watch="Kolla damage split + frontline innan sista picks.";
  if(dive>=2)watch="Mycket dive → Xayah / Vex / Taliyah / peel upp i prio.";
  else if(melee>=3)watch="Mycket melee → Objective Control/Wukong blir bättre. JAGA INTE.";
  else if(poke>=2)watch="Poke/range → ni behöver säker engage/target access.";
  else if(dis>=2)watch="Mycket disengage → undvik lång chase; engage på isolerad target.";
  $("watchCall").textContent=watch;

  const map=ownRoleMap(),enemyJg=enemies().find(e=>e.role==="jungle");
  let path="Låses när jungle + lanes börjar synas.";
  if(map.jungle){
    const botSetup=["Ashe","Nautilus","Leona","Maokai"].filter(x=>[map.adc,map.support].includes(x)).length;
    const topSetup=["Renekton","Darius","Malphite","Shen"].includes(map.top)?1:0;
    if(botSetup>=2)path="Top → bot. Spela mot bot setup + första drake.";
    else if(topSetup&&botSetup===0)path="Bot → top. Spela för top setup/Herald-sida.";
    else path="Path mot starkaste prio-lanen; contestera inte river utan lane prio.";
    if(enemyJg&&enemyJg.champ==="Lee Sin")path+=" Tracka Lee tidigt och undvik blind invade.";
  }
  $("pathCall").textContent=path;
}

render();