const fallbackChampions = [
"Aatrox","Ahri","Akali","Alistar","Ambessa","Amumu","Anivia","Annie","Aphelios","Ashe","Aurora","Azir","Braum","Caitlyn","Camille","Cassiopeia","Darius","Ezreal","Fiora","Galio","Garen","Gnar","Gragas","Graves","Heimerdinger","Hwei","Ivern","Jarvan IV","Jax","Jayce","Jinx","Kai'Sa","Kalista","Kayn","Kennen","Kindred","Kog'Maw","K'Sante","Lee Sin","Leona","Lucian","Lulu","Malphite","Maokai","Milio","Miss Fortune","Mordekaiser","Nami","Nautilus","Nocturne","Olaf","Orianna","Ornn","Poppy","Rakan","Rell","Renekton","Rumble","Ryze","Sejuani","Senna","Shen","Sion","Skarner","Smolder","Sylas","Syndra","Tahm Kench","Taliyah","Tristana","Trundle","Tryndamere","Twisted Fate","Udyr","Varus","Vex","Vi","Viego","Viktor","Volibear","Wukong","Xayah","Xin Zhao","Yone","Yunara","Zac","Zeri"
].sort();

let championRoster = [...fallbackChampions];
let championMeta = {};

const teamPool = {
  top:["Renekton","Malphite","Shen","Mordekaiser","Sion","Garen","Darius","Olaf","Trundle","Heimerdinger","Yorick","Galio"],
  jungle:["Xin Zhao","Jarvan IV","Viego","Volibear","Udyr","Vi","Wukong","Graves","Kindred"],
  mid:["Ahri","Annie","Vex","Hwei","Taliyah","Viktor","Sylas","Anivia"],
  adc:["Ashe","Varus","Xayah","Jinx","Senna"],
  support:["Nautilus","Leona","Maokai"]
};

const comfort = {
  top:{"Renekton":10,"Malphite":10,"Shen":9,"Mordekaiser":9,"Sion":8,"Garen":8,"Darius":7,"Olaf":7,"Trundle":7,"Heimerdinger":6,"Yorick":6,"Galio":6},
  jungle:{"Xin Zhao":10,"Jarvan IV":10,"Viego":9,"Volibear":9,"Udyr":9,"Vi":8,"Wukong":7,"Graves":7,"Kindred":6},
  mid:{"Ahri":10,"Annie":10,"Vex":9,"Hwei":8,"Taliyah":8,"Viktor":8,"Sylas":6,"Anivia":6},
  adc:{"Ashe":10,"Varus":9,"Xayah":9,"Jinx":8,"Senna":6},
  support:{"Nautilus":10,"Leona":9,"Maokai":9}
};

const comps = {
  "EARLY SKIRMISH":{
    core:{top:"Renekton",jungle:"Xin Zhao",mid:"Ahri",adc:"Ashe",support:"Nautilus"},
    alts:{
      top:["Garen","Darius","Mordekaiser","Olaf","Trundle"],
      jungle:["Viego","Wukong","Volibear"],
      mid:["Taliyah","Vex","Sylas"],
      adc:["Varus","Xayah"],
      support:["Leona","Maokai"]
    },
    plan:"Prio först → fighta 2v2/3v3 → objective. INTE chase.",
    wincon:"Vinn midgame genom river-prio, picks och första objectives."
  },
  "PRESS R":{
    core:{top:"Malphite",jungle:"Jarvan IV",mid:"Annie",adc:"Jinx",support:"Leona"},
    alts:{
      top:["Galio","Mordekaiser","Shen","Sion"],
      jungle:["Xin Zhao","Vi","Wukong","Viego"],
      mid:["Vex","Hwei","Taliyah","Viktor"],
      adc:["Ashe","Xayah"],
      support:["Nautilus","Maokai"]
    },
    plan:"5v5 → tydlig GO-knapp → chain CC → carry följer → reset.",
    wincon:"Tvinga fights där flera kan följa samma engage direkt."
  },
  "OBJECTIVE CONTROL":{
    core:{top:"Mordekaiser",jungle:"Udyr",mid:"Taliyah",adc:"Varus",support:"Maokai"},
    alts:{
      top:["Sion","Shen","Galio","Heimerdinger"],
      jungle:["Volibear","Xin Zhao"],
      mid:["Hwei","Ahri","Viktor","Anivia"],
      adc:["Ashe","Xayah"],
      support:["Nautilus","Leona"]
    },
    plan:"Push → reset → river → håll chokes. JAGA INTE.",
    wincon:"Kom först till objective och tvinga enemy att gå in i er zon."
  },
  "JUNGLE CARRY":{
    core:{top:"Shen",jungle:"Viego",mid:"Taliyah",adc:"Ashe",support:"Nautilus"},
    alts:{
      top:["Malphite","Sion","Mordekaiser"],
      jungle:["Kindred","Graves"],
      mid:["Ahri","Hwei","Viktor"],
      adc:["Varus","Senna","Xayah"],
      support:["Leona","Maokai"]
    },
    plan:"Lanes skapar prio/setup → jungle tar river/enemy camps → spela runt jungle.",
    wincon:"Junglern får resurser och blir primär carry; lanes enablear istället för att kräva allt."
  }
};

const draftOrder = [
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

const traits = {
  engage:new Set(["Amumu","Annie","Ashe","Galio","Gragas","Jarvan IV","Leona","Malphite","Maokai","Nautilus","Nocturne","Ornn","Rakan","Rell","Sejuani","Sion","Skarner","Vi","Wukong","Zac"]),
  frontline:new Set(["Alistar","Amumu","Galio","Garen","Gragas","Jarvan IV","K'Sante","Leona","Malphite","Maokai","Mordekaiser","Nautilus","Ornn","Poppy","Rell","Renekton","Sejuani","Shen","Sion","Skarner","Tahm Kench","Trundle","Udyr","Vi","Volibear","Wukong","Xin Zhao","Zac"]),
  damage:new Set(["Ahri","Anivia","Annie","Ashe","Darius","Graves","Hwei","Jinx","Kindred","Mordekaiser","Olaf","Taliyah","Varus","Vex","Viego","Viktor","Xayah","Xin Zhao"]),
  early:new Set(["Ahri","Ashe","Darius","Jarvan IV","Leona","Nautilus","Olaf","Poppy","Renekton","Taliyah","Varus","Vi","Volibear","Wukong","Xin Zhao"]),
  dive:new Set(["Akali","Ambessa","Camille","Diana","Ekko","Hecarim","Irelia","Jarvan IV","Jax","Kai'Sa","Katarina","Kennen","Kled","Lee Sin","Leona","Malphite","Naafiri","Nocturne","Pantheon","Qiyana","Rakan","Rell","Renekton","Rengar","Samira","Sejuani","Vi","Wukong","Yone","Zac","Zed"]),
  melee:new Set(["Aatrox","Akali","Alistar","Ambessa","Amumu","Camille","Darius","Diana","Ekko","Fiora","Galio","Garen","Gragas","Hecarim","Irelia","Jarvan IV","Jax","K'Sante","Kayn","Kled","Lee Sin","Leona","Malphite","Maokai","Mordekaiser","Nautilus","Nocturne","Olaf","Ornn","Pantheon","Poppy","Rakan","Rell","Renekton","Rengar","Sejuani","Shen","Sion","Skarner","Sylas","Tahm Kench","Trundle","Tryndamere","Udyr","Vi","Viego","Volibear","Wukong","Xin Zhao","Yone","Yorick","Zac"]),
  poke:new Set(["Caitlyn","Corki","Ezreal","Hwei","Jayce","Jhin","Karma","Lux","Miss Fortune","Nidalee","Seraphine","Syndra","Varus","Vel'Koz","Xerath","Ziggs","Zoe"]),
  disengage:new Set(["Alistar","Braum","Gragas","Janna","Lulu","Maokai","Milio","Nami","Poppy","Renata Glasc","Tahm Kench","Thresh","Xayah"]),
  tanks:new Set(["Alistar","Amumu","Cho'Gath","Dr. Mundo","Galio","K'Sante","Leona","Malphite","Maokai","Nautilus","Ornn","Poppy","Rammus","Rell","Sejuani","Shen","Sion","Skarner","Tahm Kench","Zac"]),
  immobileCarry:new Set(["Anivia","Annie","Aphelios","Ashe","Caitlyn","Jhin","Jinx","Kog'Maw","Lux","Miss Fortune","Orianna","Syndra","Varus","Veigar","Viktor","Xerath"]),
  hyperCarry:new Set(["Aphelios","Jinx","Kai'Sa","Kayle","Kindred","Kog'Maw","Senna","Smolder","Tristana","Vayne","Viktor","Zeri"]),
  enchanter:new Set(["Janna","Karma","Lulu","Milio","Nami","Renata Glasc","Senna","Seraphine","Sona","Soraka","Yuumi"]),
  splitpush:new Set(["Camille","Fiora","Gwen","Jax","Nasus","Tryndamere","Yorick"]),
  earlyJungle:new Set(["Elise","Graves","Jarvan IV","Kindred","Lee Sin","Nidalee","Rek'Sai","Volibear","Xin Zhao"]),
  scalingJungle:new Set(["Evelynn","Karthus","Kayn","Master Yi","Shyvana"])
};

const damageType = {
  "Renekton":"AD","Malphite":"AP","Shen":"MIX","Mordekaiser":"AP","Sion":"AD","Garen":"AD","Darius":"AD","Olaf":"AD","Trundle":"AD","Heimerdinger":"AP","Yorick":"AD","Galio":"AP",
  "Xin Zhao":"AD","Jarvan IV":"AD","Viego":"AD","Volibear":"MIX","Udyr":"MIX","Vi":"AD","Wukong":"AD","Graves":"AD","Kindred":"AD",
  "Ahri":"AP","Annie":"AP","Vex":"AP","Hwei":"AP","Taliyah":"AP","Viktor":"AP","Sylas":"AP","Anivia":"AP",
  "Ashe":"AD","Varus":"MIX","Xayah":"AD","Jinx":"AD","Senna":"AD",
  "Nautilus":"UTIL","Leona":"UTIL","Maokai":"AP"
};

const specificRules = [
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

const synergyRules = [
  {own:["Ashe"],role:"support",boost:{"Nautilus":18,"Leona":14,"Maokai":12}},
  {own:["Nautilus"],role:"adc",boost:{"Ashe":15,"Varus":12,"Jinx":8}},
  {own:["Maokai"],role:"mid",boost:{"Vex":14,"Ahri":12,"Hwei":9}},
  {own:["Maokai"],role:"jungle",boost:{"Xin Zhao":12,"Viego":10,"Volibear":8}},
  {own:["Vex"],role:"jungle",boost:{"Xin Zhao":10,"Volibear":8,"Vi":8}},
  {own:["Annie"],role:"jungle",boost:{"Jarvan IV":16,"Vi":10,"Wukong":8}},
  {own:["Malphite"],role:"mid",boost:{"Annie":14,"Vex":8,"Hwei":7}},
  {own:["Shen"],role:"jungle",boost:{"Viego":15,"Kindred":13,"Graves":10}}
];

const banBase = {
  "Nocturne":18,"Poppy":16,"Janna":13,"Milio":13,"Lulu":12,"Skarner":12,"Rell":11,"Ornn":10,"K'Sante":10,"Vi":10,"Jarvan IV":10,"Aatrox":8,"Aurora":8,"Syndra":8
};

let userSide=null, step=0, events=[], selectedRole=null, historySaved=false;
const roles=["top","jungle","mid","adc","support"];
const roleNames={top:"TOP",jungle:"JUNGLE",mid:"MID",adc:"ADC",support:"SUPPORT",unknown:"?"};
const $=id=>document.getElementById(id);

function normalizeName(name){
  const hit=championRoster.find(c=>c.toLowerCase()===name.trim().toLowerCase());
  return hit || name.trim();
}

function populateDatalist(){
  const list=$("champions"); list.innerHTML="";
  championRoster.forEach(c=>{const o=document.createElement("option");o.value=c;list.appendChild(o)});
}

async function loadChampionRoster(){
  populateDatalist();
  try{
    const versions=await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r=>r.json());
    const version=versions[0];
    const data=await fetch("https://ddragon.leagueoflegends.com/cdn/"+version+"/data/en_US/champion.json").then(r=>r.json());
    const entries=Object.values(data.data);
    championRoster=entries.map(c=>c.name).sort((a,b)=>a.localeCompare(b));
    championMeta=Object.fromEntries(entries.map(c=>[c.name,{tags:c.tags||[],info:c.info||{}}]));
    populateDatalist();
  }catch(e){
    console.warn("Data Dragon roster fallback används.",e);
  }
}

function current(){return draftOrder[step]||null}
function ours(){return events.filter(e=>e.type==="pick"&&e.side===userSide)}
function enemies(){return events.filter(e=>e.type==="pick"&&e.side!==userSide)}
function unavailable(){return new Set(events.map(e=>e.champ.toLowerCase()))}
function ownRoleMap(){const m={};ours().forEach(e=>{if(e.role&&e.role!=="unknown")m[e.role]=e.champ});return m}
function enemyRoleMap(){const m={};enemies().forEach(e=>{if(e.role&&e.role!=="unknown")m[e.role]=e.champ});return m}
function countTrait(list,set){return list.filter(x=>set.has(x.champ)).length}
function hasEnemy(name){return enemies().some(e=>e.champ===name)}
function hasOwn(name){return ours().some(e=>e.champ===name)}
function recentPicks(){try{return JSON.parse(localStorage.getItem("rs_recent_picks")||"[]")}catch{return[]}}

function saveState(){
  localStorage.setItem("rs_draft_state",JSON.stringify({userSide,step,events,historySaved}));
}
function restoreState(){
  try{
    const state=JSON.parse(localStorage.getItem("rs_draft_state")||"null");
    if(state&&state.userSide&&Array.isArray(state.events)){
      userSide=state.userSide;step=state.step||0;events=state.events;historySaved=!!state.historySaved;
      $("startCard").classList.add("hidden");$("liveArea").classList.remove("hidden");
      return true;
    }
  }catch{}
  return false;
}
function clearState(){localStorage.removeItem("rs_draft_state")}

document.querySelectorAll(".side-btn").forEach(btn=>btn.addEventListener("click",()=>{
  userSide=btn.dataset.side;step=0;events=[];selectedRole=null;historySaved=false;
  $("startCard").classList.add("hidden");$("liveArea").classList.remove("hidden");
  saveState();render();
}));

document.querySelectorAll(".role-buttons button").forEach(btn=>btn.addEventListener("click",()=>{
  if(btn.classList.contains("locked"))return;
  selectedRole=btn.dataset.role;
  renderTurn();
  renderRecommendation();
  renderAllRoleRecommendations();
}));

$("lockBtn").addEventListener("click",lockCurrent);
$("championInput").addEventListener("keydown",e=>{if(e.key==="Enter")lockCurrent()});
$("undoBtn").addEventListener("click",()=>{
  if(!events.length)return;
  events.pop();step=Math.max(0,step-1);selectedRole=null;historySaved=false;saveState();render();
});
$("resetBtn").addEventListener("click",()=>{
  if(confirm("Starta en helt ny draft?")){clearState();location.reload()}
});

function lockCurrent(){
  const turn=current(); if(!turn)return;
  const raw=$("championInput").value.trim(); if(!raw)return;
  const champ=normalizeName(raw);
  if(unavailable().has(champ.toLowerCase())){alert("Championen är redan pickad eller bannad.");return}
  let role=null;
  if(turn.type==="pick"){
    if(!selectedRole){
      if(turn.side===userSide){
        const possibleRoles=championOpenRoles(champ);
        const suggested=recommendedNextRole();
        selectedRole=possibleRoles.length===1
          ? possibleRoles[0]
          : (suggested&&possibleRoles.includes(suggested) ? suggested : (possibleRoles[0]||suggested||firstOpenRole()));
      }else{
        selectedRole="unknown";
      }
    }
    if(turn.side===userSide&&selectedRole==="unknown"){alert("Välj riktig roll för er pick.");return}
    if(turn.side===userSide&&ownRoleMap()[selectedRole]){alert("Den rollen är redan fylld.");return}
    role=selectedRole;
  }
  events.push({...turn,champ,role});
  step++;selectedRole=null;$("championInput").value="";
  document.querySelectorAll(".role-buttons button").forEach(b=>b.classList.remove("active"));
  saveState();render();
}

function firstOpenRole(){
  const map=ownRoleMap();return roles.find(r=>!map[r])||"top";
}

function championOpenRoles(champ){
  const map=ownRoleMap();
  return roles.filter(role=>!map[role]&&(teamPool[role]||[]).includes(champ));
}

function recommendedNextRole(){
  const map=ownRoleMap();
  const open=roles.filter(role=>!map[role]);
  if(!open.length)return null;

  const enemyMap=enemyRoleMap();
  const comp=desiredComp();
  const need=currentNeeds();
  const ownCount=ours().length;
  const base={top:4,jungle:8,mid:5,adc:6,support:7};
  const counter={top:18,jungle:10,mid:15,adc:8,support:8};

  return open.map(role=>{
    const available=(teamPool[role]||[]).filter(ch=>!unavailable().has(ch.toLowerCase()));
    const bestScore=available.length?Math.max(...available.map(ch=>candidateScore(ch,role,comp))):0;
    const bestPick=topRecommendations(role)[0];
    let score=(base[role]||0)+(bestScore*0.35);

    // Om enemy redan har visat motsvarande roll är det mer värdefullt att svara/counterpicka den nu.
    if(enemyMap[role])score+=counter[role]||0;
    // Håll gärna solo-lanes öppna när motståndaren ännu inte visat dem.
    if(!enemyMap[role]&&role==="top")score-=10;
    if(!enemyMap[role]&&role==="mid")score-=6;
    // Om compen saknar grundverktyg prioriteras en roll vars bästa pick kan fylla hålet.
    if(bestPick&&need.front===0&&traits.frontline.has(bestPick))score+=9;
    if(bestPick&&need.engage===0&&traits.engage.has(bestPick))score+=9;
    // När draften börjar bli låst ska kvarvarande solo-lanes inte skjutas upp för länge.
    if(ownCount>=3&&(role==="top"||role==="mid"))score+=5;

    return {role,score};
  }).sort((a,b)=>b.score-a.score)[0].role;
}

function render(){
  if(!userSide)return;
  renderTeam("blue");renderTeam("red");renderTurn();renderStatus();renderCoach();renderRecommendation();renderAllRoleRecommendations();renderCompChecks();renderFinalGameplan();
  $("draftProgress").textContent=step+" / "+draftOrder.length;
  if(step>=draftOrder.length)saveRecentDraft();
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
  if(!t){
    $("phaseLabel").textContent="KLAR";$("turnLabel").textContent="DRAFT KLAR";$("lockBtn").style.display="none";$("roleWrap").classList.add("hidden");return;
  }
  $("lockBtn").style.display="block";
  $("phaseLabel").textContent=t.type==="ban"?"BAN":"PICK";
  $("turnLabel").textContent=t.label+" · "+(t.side===userSide?"NI":"ENEMY");
  $("roleWrap").classList.toggle("hidden",t.type!=="pick");
  if(t.type==="pick"){
    const isOwn=t.side===userSide;
    const suggested=isOwn?recommendedNextRole():null;
    document.querySelectorAll(".role-buttons button").forEach(b=>{
      const locked=isOwn&&!!ownRoleMap()[b.dataset.role];
      b.classList.toggle("hidden",isOwn&&b.dataset.role==="unknown");
      b.classList.toggle("locked",locked);
      b.classList.toggle("active",b.dataset.role===selectedRole);
      b.classList.toggle("suggested",isOwn&&!locked&&b.dataset.role===suggested);
    });
    const hint=$("suggestedRoleText");
    if(hint){
      hint.classList.toggle("hidden",!isOwn||!suggested);
      hint.textContent=suggested?"Rekommenderad nästa roll: "+roleNames[suggested]+" · gul markering = Draft Brains förslag":"";
    }
  }
}

function compScore(name){
  const c=comps[name],map=ownRoleMap();let s=0;
  Object.entries(map).forEach(([r,ch])=>{
    if(c.core[r]===ch)s+=5;
    else if((c.alts[r]||[]).includes(ch))s+=2.5;
  });
  return s;
}

function desiredComp(){
  const enemy=enemies();
  const scores=Object.keys(comps).map(n=>({n,s:compScore(n)})).sort((a,b)=>b.s-a.s);
  if(scores[0].s>=7)return scores[0].n;

  const dive=countTrait(enemy,traits.dive),melee=countTrait(enemy,traits.melee),poke=countTrait(enemy,traits.poke);
  const hyper=countTrait(enemy,traits.hyperCarry),ench=countTrait(enemy,traits.enchanter);
  if(melee>=3)return "OBJECTIVE CONTROL";
  if(hyper>=1&&ench>=1)return "PRESS R";
  if(dive>=2||poke>=2)return "PRESS R";

  const jg=ownRoleMap().jungle;
  if(["Viego","Kindred","Graves"].includes(jg))return "JUNGLE CARRY";
  return "EARLY SKIRMISH";
}

function currentNeeds(){
  const own=ours();
  const front=countTrait(own,traits.frontline);
  const engage=countTrait(own,traits.engage);
  const dmg=countTrait(own,traits.damage);
  const ad=own.filter(e=>damageType[e.champ]==="AD").length;
  const ap=own.filter(e=>damageType[e.champ]==="AP").length;
  return {front,engage,dmg,ad,ap};
}

function ruleBoost(champ,role){
  let score=0;
  specificRules.forEach(rule=>{
    if(rule.role===role&&rule.enemy.some(e=>hasEnemy(e)))score+=rule.boost[champ]||0;
  });
  synergyRules.forEach(rule=>{
    if(rule.role===role&&rule.own.every(o=>hasOwn(o)))score+=rule.boost[champ]||0;
  });
  return score;
}

function candidateScore(champ,role,compName){
  const c=comps[compName],enemy=enemies(),need=currentNeeds();let s=(comfort[role]?.[champ]||5)*3;
  if(c.core[role]===champ)s+=34;
  if((c.alts[role]||[]).includes(champ))s+=18;

  if(need.front===0&&traits.frontline.has(champ))s+=15;
  if(need.engage===0&&traits.engage.has(champ))s+=15;
  if(need.dmg<2&&traits.damage.has(champ))s+=8;

  if(need.ad>=2&&need.ap===0&&damageType[champ]==="AP")s+=18;
  if(need.ap>=2&&need.ad===0&&damageType[champ]==="AD")s+=12;

  const dive=countTrait(enemy,traits.dive),melee=countTrait(enemy,traits.melee),poke=countTrait(enemy,traits.poke);
  const tanks=countTrait(enemy,traits.tanks),hyper=countTrait(enemy,traits.hyperCarry),ench=countTrait(enemy,traits.enchanter);

  if(dive>=2&&["Xayah","Vex","Taliyah","Maokai","Malphite","Nautilus","Shen"].includes(champ))s+=18;
  if(melee>=3&&["Heimerdinger","Taliyah","Maokai","Udyr","Wukong","Mordekaiser","Varus"].includes(champ))s+=16;
  if(poke>=2&&["Jarvan IV","Vi","Malphite","Annie","Leona","Nautilus","Ashe"].includes(champ))s+=15;
  if(tanks>=2&&["Trundle","Mordekaiser","Varus","Viego"].includes(champ))s+=18;
  if(hyper>=1&&ench>=1&&["Vi","Jarvan IV","Malphite","Ashe","Nautilus","Leona"].includes(champ))s+=20;

  s+=ruleBoost(champ,role);

  const recent=recentPicks();
  const times=recent.filter(x=>x===champ).length;
  s-=Math.min(12,times*4);

  if(role==="mid"&&champ==="Taliyah"&&recent.slice(-2).includes("Taliyah"))s-=12;
  return s;
}

function topRecommendations(role){
  if(!role||role==="unknown")return[];
  const used=unavailable(),comp=desiredComp();
  return teamPool[role].filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>({ch,s:candidateScore(ch,role,comp)}))
    .sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.ch);
}

function banScore(champ){
  let s=banBase[champ]||0;
  const map=ownRoleMap(),enemy=enemies();
  if(map.adc&&["Ashe","Jinx","Varus"].includes(map.adc)&&["Nocturne","Vi","Malphite"].includes(champ))s+=18;
  if(map.jungle&&["Kindred","Graves","Viego"].includes(map.jungle)&&["Poppy","Vi","Nocturne"].includes(champ))s+=16;
  if(map.top&&["Malphite","Sion","Shen"].includes(map.top)&&["Gwen","Fiora","Trundle"].includes(champ))s+=12;
  if(enemy.some(e=>traits.enchanter.has(e.champ))&&["Kog'Maw","Jinx","Aphelios"].includes(champ))s+=8;
  return s;
}

function banRecommendations(){
  const used=unavailable();
  const candidates=[
    "Nocturne","Poppy","Janna","Milio","Lulu","Skarner","Rell","Ornn","K'Sante","Vi","Jarvan IV",
    "Aatrox","Aurora","Syndra","Gwen","Fiora","Trundle","Kog'Maw","Jinx","Aphelios"
  ];
  return candidates.filter(c=>!used.has(c.toLowerCase()))
    .map(ch=>({ch,s:banScore(ch)})).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.ch);
}

function renderRecommendation(){
  const t=current(),box=$("recommendationBox");
  if(!t||t.side!==userSide){box.classList.add("hidden");return}

  if(t.type==="ban"){
    const bans=banRecommendations();box.classList.remove("hidden");
    $("recommendEyebrow").textContent="BANFÖRSLAG";$("recommendRole").textContent="BAN:";
    $("recommendPicks").textContent=bans.join(" / ");
    $("recommendReason").textContent="Prioriterar hot mot er nuvarande comp + generellt svåra draftverktyg.";
    return;
  }

  const autoRole=recommendedNextRole();
  const role=selectedRole||autoRole;
  if(!role){box.classList.add("hidden");return}
  const recs=topRecommendations(role);
  box.classList.remove("hidden");
  $("recommendEyebrow").textContent=selectedRole?"PICKFÖRSLAG":"REKOMMENDERAD NÄSTA ROLL";
  $("recommendRole").textContent=roleNames[role]+":";
  $("recommendPicks").textContent=recs.length?recs.join(" / "):"Inga tillgängliga picks i team-poolen";
  $("recommendReason").textContent=(selectedRole?"Manuellt vald roll. ":"Draft Brain föreslår denna roll nu. ")+"Riktning: "+desiredComp()+" · bans/picks + comfort + comp-behov + enemy hot + countervärde.";
}

function renderAllRoleRecommendations(){
  const t=current(),card=$("allRoleRecsCard"),box=$("allRoleRecommendations");
  if(!t||t.type!=="pick"||t.side!==userSide){card.classList.add("hidden");return}
  card.classList.remove("hidden");box.innerHTML="";
  const map=ownRoleMap(),suggested=recommendedNextRole();
  roles.filter(r=>!map[r]).forEach(role=>{
    const recs=topRecommendations(role),div=document.createElement("div");div.className="role-rec"+(role===suggested?" recommended":"");
    div.innerHTML="<span>"+roleNames[role]+"</span><strong>"+(recs.join(" / ")||"—")+"</strong>";
    div.addEventListener("click",()=>{
      selectedRole=role;
      document.querySelectorAll(".role-buttons button").forEach(b=>b.classList.toggle("active",b.dataset.role===role));
      renderRecommendation();
      window.scrollTo({top:document.querySelector(".center").offsetTop-20,behavior:"smooth"});
    });
    box.appendChild(div);
  });
}

function renderStatus(){
  const map=ownRoleMap(),box=$("roleStatus");box.innerHTML="";
  roles.forEach(r=>{
    const d=document.createElement("div");d.className="role-slot"+(map[r]?" filled":"");
    d.innerHTML="<span>"+roleNames[r]+"</span><strong>"+(map[r]||"—")+"</strong>";box.appendChild(d);
  });
  const left=roles.filter(r=>!map[r]).length;$("needsBadge").textContent=left+" roller kvar";
}

function renderCompChecks(){
  const n=currentNeeds(),box=$("compChecks");box.innerHTML="";
  const checks=[
    ["Frontline",n.front>0,n.front+" st"],
    ["Engage",n.engage>0,n.engage+" st"],
    ["Damage",n.dmg>=2,n.dmg+" threats"],
    ["AD/AP",!(n.ad>=3&&n.ap===0)&&!(n.ap>=3&&n.ad===0),n.ad+" AD / "+n.ap+" AP"],
    ["Identitet",compScore(desiredComp())>=5,desiredComp()]
  ];
  checks.forEach(([name,good,val])=>{
    const d=document.createElement("div");d.className="check "+(good?"good":"bad");d.textContent=name+": "+val;box.appendChild(d);
  });
}

function buildWatch(){
  const enemy=enemies();
  const dive=countTrait(enemy,traits.dive),melee=countTrait(enemy,traits.melee),poke=countTrait(enemy,traits.poke);
  const dis=countTrait(enemy,traits.disengage),tank=countTrait(enemy,traits.tanks),split=countTrait(enemy,traits.splitpush);
  const hyper=countTrait(enemy,traits.hyperCarry),ench=countTrait(enemy,traits.enchanter);

  if(hyper>=1&&ench>=1)return "Hypercarry + enchanter → döda/CC:a carryn; spela inte lång front-to-back genom deras frontline.";
  if(dive>=2)return "Mycket dive → skydda Ashe/mid, håll peel och stacka inte defensiva cooldowns för tidigt.";
  if(melee>=3)return "Mycket melee → låt dem gå in i er. Objective setup blir starkt. JAGA INTE.";
  if(poke>=2&&dis>=1)return "Poke + disengage → ni behöver flank/target access. Undvik långsam front-to-back.";
  if(tank>=2)return "Mycket frontline → säkra anti-tank/sustained damage och undvik att bränna allt på första tanken.";
  if(split>=1)return "Stark sidelane → planera vem som matchar side innan objective-spawn.";
  return "Kolla damage split + frontline + vem som faktiskt startar fighten.";
}

function buildWincon(comp){
  const enemy=enemies();
  const carries=enemy.filter(e=>traits.hyperCarry.has(e.champ)||traits.immobileCarry.has(e.champ)).map(e=>e.champ);
  if(carries.length)return "Primärt target: "+carries.slice(0,2).join(" / ")+". "+comps[comp].wincon;
  return comps[comp].wincon;
}

function laneSetupScore(champ){
  const scores={"Nautilus":3,"Leona":3,"Maokai":3,"Ashe":2,"Varus":2,"Renekton":2,"Malphite":2,"Shen":2,"Vex":2,"Ahri":2,"Annie":2,"Taliyah":1,"Mordekaiser":1,"Garen":1,"Darius":1};
  return scores[champ]||0;
}

function buildPath(){
  const map=ownRoleMap(),enemyMap=enemyRoleMap();
  if(!map.jungle)return "Låses när er jungle är pickad.";

  const bot=laneSetupScore(map.adc)+laneSetupScore(map.support);
  const top=laneSetupScore(map.top);
  const mid=laneSetupScore(map.mid);
  let path;
  if(bot>=4&&bot>=top+1)path="Top → bot. Spela för bot setup + första drake.";
  else if(top>=2&&top>bot)path="Bot → top. Spela för top setup och topside tempo.";
  else if(mid>=2)path="Flexa clear mot mid-prio; använd mid för river och objective.";
  else path="Full clear mot starkaste prio-lanen. Contestera inte river utan lane prio.";

  if(enemyMap.jungle&&traits.earlyJungle.has(enemyMap.jungle))path+=" Tracka "+enemyMap.jungle+" tidigt.";
  if(enemyMap.jungle&&traits.scalingJungle.has(enemyMap.jungle))path+=" Ni kan spela mer aktivt före deras scaling.";
  return path;
}

function renderCoach(){
  const comp=desiredComp();
  $("compCall").textContent="COMP: "+comp;
  $("planCall").textContent=comps[comp].plan;
  $("winconCall").textContent=buildWincon(comp);
  $("watchCall").textContent=buildWatch();
  $("pathCall").textContent=buildPath();
}


function buildFinalGameplan(){
  const comp=desiredComp(), enemy=enemies(), map=ownRoleMap(), enemyMap=enemyRoleMap();
  const dive=countTrait(enemy,traits.dive), melee=countTrait(enemy,traits.melee), poke=countTrait(enemy,traits.poke);
  const dis=countTrait(enemy,traits.disengage), tanks=countTrait(enemy,traits.tanks), split=countTrait(enemy,traits.splitpush);
  const hyper=countTrait(enemy,traits.hyperCarry), ench=countTrait(enemy,traits.enchanter);

  let early="", mid="", fight="", objective="", rule="";

  if(comp==="EARLY SKIRMISH"){
    early="Spela för prio + 2v2/3v3. Patha mot lane med bäst setup.";
    mid="Flytta mid/jg/support tillsammans. Pick → tower/objective.";
    fight="Starta på isolerad target; undvik lång front-to-back.";
    objective="Kom först, få vision och tvinga fight med prio.";
    rule="VINN TEMPO → KONVERTERA. Chasa inte efter extra kill.";
  }else if(comp==="PRESS R"){
    early="Spela stabilt tills era engage-tools är online.";
    mid="Gruppera 4–5 och leta tydliga engage-fönster.";
    fight="En GO-call. Chain CC samma target och följ direkt.";
    objective="Tvinga fights i chokes där engage blir enkelt.";
    rule="INGEN SPLIT ENGAGE. Alla följer samma knapp.";
  }else if(comp==="OBJECTIVE CONTROL"){
    early="Säkra lanes + tempo; ta inga coinflip-riverfights.";
    mid="Push waves → reset tillsammans → setup river tidigt.";
    fight="Låt dem gå in i er zon. Fronta, zona och turna.";
    objective="Var där 45–60s tidigt. Vision först, objective sen.";
    rule="JAGA INTE. De ska komma in i ER.";
  }else{
    early="Lanes skapar prio så jungle kan ta camps/river/marks.";
    mid="Spela runt jungle-tempo och invades med lane support.";
    fight="Jungle ska cleanup/carry — inte vara första sacrifice.";
    objective="Använd prio för att äga river före spawn.";
    rule="ENABLEA JUNGLE. Ge carryn space och resurser.";
  }

  if(dive>=2){
    fight+=" Spara peel till deras dive.";
    rule="ÖVERLEV FÖRSTA DIVE → kontra när deras cooldowns är nere.";
  }
  if(hyper>=1&&ench>=1){
    fight="Hitta hypercarryn direkt eller tvinga bort supporten först. Undvik lång front-to-back.";
    rule="GE INTE "+enemy.filter(e=>traits.hyperCarry.has(e.champ)).map(e=>e.champ).slice(0,1).join("")+" GRATIS DPS.";
  }
  if(poke>=2&&dis>=1){
    mid="Skapa flank/vision denial; gå inte rakt genom deras poke.";
    fight="Kort, explosiv engage. Missad engage = reset.";
  }
  if(melee>=3){
    objective="Setup chokes tidigt och låt dem gå in i er CC/damage.";
  }
  if(tanks>=2){
    fight+=" Bränn inte alla cooldowns på första tanken.";
  }
  if(split>=1){
    mid+=" Bestäm vem som matchar side innan ni tappar tempo.";
  }

  const path=buildPath();
  if(map.jungle&&path&&!path.startsWith("Låses"))early=path;

  if(enemyMap.jungle&&traits.earlyJungle.has(enemyMap.jungle)){
    early+=" Ward/track "+enemyMap.jungle+" tidigt.";
  }

  return {comp,early,mid,fight,objective,rule};
}

function renderFinalGameplan(){
  const card=$("finalGameplanCard");
  if(step<draftOrder.length){card.classList.add("hidden");return}
  const gp=buildFinalGameplan();
  card.classList.remove("hidden");
  $("finalCompBadge").textContent=gp.comp;
  $("gpEarly").textContent=gp.early;
  $("gpMid").textContent=gp.mid;
  $("gpFight").textContent=gp.fight;
  $("gpObjective").textContent=gp.objective;
  $("gpRule").textContent=gp.rule;
}

function saveRecentDraft(){
  if(historySaved)return;
  const picks=ours().map(e=>e.champ);
  try{
    const old=recentPicks();
    localStorage.setItem("rs_recent_picks",JSON.stringify([...old,...picks].slice(-20)));
  }catch{}
  historySaved=true;saveState();
}


/* ============================================================
   DRAFT BRAIN v2
   Explainable multi-factor draft engine.
   Keeps team comfort first, then weighs composition, counters,
   synergy, pick timing, inferred enemy roles and execution.
   ============================================================ */

const roleHints = {
  top:new Set(["Aatrox","Akali","Ambessa","Aurora","Camille","Darius","Fiora","Galio","Garen","Gnar","Gragas","Gwen","Heimerdinger","Irelia","Jax","Jayce","Kennen","K'Sante","Malphite","Mordekaiser","Nasus","Olaf","Ornn","Poppy","Renekton","Rumble","Shen","Sion","Tahm Kench","Trundle","Tryndamere","Yone","Yorick"]),
  jungle:new Set(["Amumu","Bel'Veth","Briar","Diana","Ekko","Elise","Evelynn","Gragas","Graves","Hecarim","Ivern","Jarvan IV","Karthus","Kayn","Kha'Zix","Kindred","Lee Sin","Lillia","Master Yi","Naafiri","Nocturne","Nunu & Willump","Poppy","Rek'Sai","Rengar","Sejuani","Shyvana","Skarner","Talon","Trundle","Udyr","Vi","Viego","Volibear","Wukong","Xin Zhao","Zac"]),
  mid:new Set(["Ahri","Akali","Anivia","Annie","Aurora","Azir","Cassiopeia","Corki","Ekko","Galio","Hwei","Irelia","Katarina","Lux","Orianna","Ryze","Sylas","Syndra","Taliyah","Tristana","Twisted Fate","Veigar","Vel'Koz","Vex","Viktor","Xerath","Yone","Zed","Ziggs"]),
  adc:new Set(["Aphelios","Ashe","Caitlyn","Draven","Ezreal","Jhin","Jinx","Kai'Sa","Kalista","Kog'Maw","Lucian","Miss Fortune","Samira","Senna","Sivir","Smolder","Tristana","Varus","Vayne","Xayah","Yunara","Zeri"]),
  support:new Set(["Alistar","Bard","Blitzcrank","Braum","Janna","Karma","Leona","Lulu","Lux","Maokai","Milio","Nami","Nautilus","Poppy","Rakan","Rell","Renata Glasc","Senna","Seraphine","Sona","Soraka","Tahm Kench","Thresh","Vel'Koz","Xerath","Yuumi","Zyra"])
};

const smartTraits = {
  peel:new Set(["Alistar","Braum","Galio","Gragas","Janna","Karma","Leona","Lulu","Maokai","Milio","Nami","Nautilus","Poppy","Rakan","Renata Glasc","Shen","Tahm Kench","Thresh","Xayah"]),
  waveclear:new Set(["Anivia","Annie","Ashe","Hwei","Jinx","Malphite","Maokai","Mordekaiser","Sion","Taliyah","Varus","Vex","Viktor","Xayah"]),
  antiTank:new Set(["Darius","Kindred","Mordekaiser","Olaf","Trundle","Udyr","Varus","Viego","Xayah"]),
  pick:new Set(["Ahri","Annie","Ashe","Jarvan IV","Leona","Maokai","Nautilus","Shen","Taliyah","Varus","Vex","Vi"]),
  zone:new Set(["Anivia","Heimerdinger","Hwei","Maokai","Taliyah","Varus","Viktor"]),
  rangedDamage:new Set(["Ahri","Anivia","Annie","Ashe","Graves","Heimerdinger","Hwei","Jinx","Kindred","Senna","Taliyah","Varus","Vex","Viktor","Xayah"]),
  objective:new Set(["Graves","Heimerdinger","Kindred","Mordekaiser","Trundle","Udyr","Varus","Viego","Volibear","Xin Zhao"]),
  lanePressure:new Set(["Ahri","Ashe","Darius","Heimerdinger","Olaf","Renekton","Taliyah","Trundle","Varus","Vex","Xin Zhao"]),
  reliableFollow:new Set(["Ahri","Annie","Ashe","Hwei","Jinx","Taliyah","Varus","Vex","Viego","Viktor","Xayah"]),
  safeBlind:new Set(["Ahri","Ashe","Hwei","Jarvan IV","Malphite","Maokai","Nautilus","Shen","Sion","Taliyah","Varus","Xayah"]),
  counterSensitive:new Set(["Darius","Garen","Heimerdinger","Kindred","Olaf","Trundle","Yorick"])
};

const roleBlindSafety = {
  top:new Set(["Malphite","Shen","Sion","Mordekaiser"]),
  jungle:new Set(["Jarvan IV","Xin Zhao","Volibear","Udyr","Viego"]),
  mid:new Set(["Ahri","Hwei","Taliyah","Viktor"]),
  adc:new Set(["Ashe","Varus","Xayah"]),
  support:new Set(["Nautilus","Maokai","Leona"])
};

function hasSmartTrait(champ,set,tag){
  if(set.has(champ))return true;
  if(tag && championMeta[champ] && (championMeta[champ].tags||[]).includes(tag))return true;
  return false;
}

function enemyRoleCandidates(champ){
  const found=roles.filter(r=>roleHints[r]&&roleHints[r].has(champ));
  return found.length?found:["unknown"];
}

function enemyRoleMap(){
  const map={};
  const unresolved=[];
  enemies().forEach(e=>{
    if(e.role&&e.role!=="unknown")map[e.role]=e.champ;
    else unresolved.push(e.champ);
  });

  const used=new Set(Object.keys(map));
  let changed=true;
  while(changed){
    changed=false;
    for(let i=unresolved.length-1;i>=0;i--){
      const champ=unresolved[i];
      const candidates=enemyRoleCandidates(champ).filter(r=>r!=="unknown"&&!used.has(r));
      if(candidates.length===1){
        map[candidates[0]]=champ;used.add(candidates[0]);unresolved.splice(i,1);changed=true;
      }
    }
  }

  // When four roles are effectively known, the last remaining role is safe to infer.
  if(unresolved.length===1){
    const open=roles.filter(r=>!used.has(r));
    const candidates=enemyRoleCandidates(unresolved[0]).filter(r=>open.includes(r));
    if(candidates.length===1)map[candidates[0]]=unresolved[0];
  }
  return map;
}

function enemyProfile(){
  const enemy=enemies();
  return {
    dive:countTrait(enemy,traits.dive),
    melee:countTrait(enemy,traits.melee),
    poke:countTrait(enemy,traits.poke),
    disengage:countTrait(enemy,traits.disengage),
    tanks:enemy.filter(e=>hasSmartTrait(e.champ,traits.tanks,"Tank")).length,
    immobile:countTrait(enemy,traits.immobileCarry),
    hyper:countTrait(enemy,traits.hyperCarry),
    enchanter:countTrait(enemy,traits.enchanter),
    split:countTrait(enemy,traits.splitpush),
    engage:countTrait(enemy,traits.engage),
    earlyJungle:enemy.some(e=>enemyRoleCandidates(e.champ).includes("jungle")&&traits.earlyJungle.has(e.champ)),
    scalingJungle:enemy.some(e=>enemyRoleCandidates(e.champ).includes("jungle")&&traits.scalingJungle.has(e.champ))
  };
}

function currentNeeds(){
  const own=ours();
  const front=countTrait(own,traits.frontline);
  const engage=countTrait(own,traits.engage);
  const dmg=own.filter(e=>hasSmartTrait(e.champ,traits.damage,"Marksman")||hasSmartTrait(e.champ,traits.damage,"Mage")||hasSmartTrait(e.champ,traits.damage,"Assassin")).length;
  const ad=own.filter(e=>damageType[e.champ]==="AD").length;
  const ap=own.filter(e=>damageType[e.champ]==="AP").length;
  const peel=own.filter(e=>smartTraits.peel.has(e.champ)).length;
  const wave=own.filter(e=>smartTraits.waveclear.has(e.champ)).length;
  const antiTank=own.filter(e=>smartTraits.antiTank.has(e.champ)).length;
  const ranged=own.filter(e=>smartTraits.rangedDamage.has(e.champ)).length;
  const pick=own.filter(e=>smartTraits.pick.has(e.champ)).length;
  return {front,engage,dmg,ad,ap,peel,wave,antiTank,ranged,pick};
}

function compFitScore(name){
  const own=ours(), p=enemyProfile();
  let s=compScore(name)*4;

  if(name==="EARLY SKIRMISH"){
    s+=countTrait(own,traits.early)*3;
    if(p.scalingJungle)s+=8;
    if(p.poke>=2)s-=3;
  }
  if(name==="PRESS R"){
    s+=p.poke*3+p.immobile*2+p.disengage;
    if(p.hyper&&p.enchanter)s+=10;
    if(p.dive>=2)s+=3;
  }
  if(name==="OBJECTIVE CONTROL"){
    s+=p.melee*3+p.tanks*2;
    if(p.dive>=2)s+=4;
    if(p.poke>=2)s-=2;
  }
  if(name==="JUNGLE CARRY"){
    const jg=ownRoleMap().jungle;
    if(["Viego","Kindred","Graves"].includes(jg))s+=12;
    if(hasOwn("Shen"))s+=6;
    if(hasOwn("Taliyah")||hasOwn("Ahri"))s+=4;
    if(p.earlyJungle)s-=3;
  }
  return s;
}

function compRankings(){
  return Object.keys(comps).map(n=>({name:n,score:compFitScore(n)})).sort((a,b)=>b.score-a.score);
}

function desiredComp(){
  return compRankings()[0].name;
}

function compConfidence(){
  const r=compRankings();
  const margin=(r[0]?.score||0)-(r[1]?.score||0);
  if((r[0]?.score||0)<10)return "öppen";
  if(margin>=12)return "hög";
  if(margin>=5)return "medel";
  return "låg";
}

function scoreCandidateDetails(champ,role,compName){
  const c=comps[compName], need=currentNeeds(), p=enemyProfile(), enemyMap=enemyRoleMap();
  const reasons=[];
  let s=0;
  const add=(pts,label)=>{s+=pts;if(pts>=5&&label)reasons.push({pts,label})};

  add((comfort[role]?.[champ]||5)*3,"comfort");
  if(c.core[role]===champ)add(28,"core i "+compName);
  else if((c.alts[role]||[]).includes(champ))add(14,"passar "+compName);

  if(need.front===0&&traits.frontline.has(champ))add(14,"ger frontline");
  if(need.engage===0&&traits.engage.has(champ))add(14,"ger engage");
  if(need.dmg<2&&hasSmartTrait(champ,traits.damage,"Marksman"))add(6,"höjer damage");
  if(need.peel===0&&smartTraits.peel.has(champ)&&(hasOwn("Jinx")||hasOwn("Ashe")||hasOwn("Varus")||hasOwn("Viktor")||hasOwn("Hwei")))add(9,"peel för carry");
  if(need.wave===0&&smartTraits.waveclear.has(champ)&&ours().length>=2)add(6,"fixar waveclear");
  if(need.ranged===0&&smartTraits.rangedDamage.has(champ)&&ours().length>=2)add(7,"ger range");

  if(need.ad>=2&&need.ap===0&&damageType[champ]==="AP")add(16,"fixar AD/AP-split");
  if(need.ap>=2&&need.ad===0&&damageType[champ]==="AD")add(12,"fixar AD/AP-split");

  if(p.dive>=2){
    if(smartTraits.peel.has(champ)||traits.disengage.has(champ))add(10,"bra mot dive");
    if(["Xayah","Vex","Taliyah","Maokai","Malphite","Nautilus","Shen"].includes(champ))add(7,"starkt anti-dive-val");
  }
  if(p.melee>=3){
    if(smartTraits.zone.has(champ)||traits.poke.has(champ))add(9,"straffar kort range");
    if(["Udyr","Wukong","Mordekaiser","Maokai"].includes(champ))add(6,"stark i melee-fights");
  }
  if(p.poke>=2){
    if(traits.engage.has(champ)||smartTraits.pick.has(champ))add(10,"ger access mot poke");
  }
  if(p.tanks>=2&&smartTraits.antiTank.has(champ))add(15,"anti-tank");
  if(p.hyper>=1&&p.enchanter>=1&&(traits.engage.has(champ)||smartTraits.pick.has(champ)))add(12,"kan nå hypercarry");
  if(p.immobile>=1&&smartTraits.pick.has(champ))add(6,"straffar immobile carry");

  if(role==="jungle"&&p.scalingJungle&&traits.earlyJungle.has(champ))add(9,"kan pressa scaling-jungle");
  if(role==="jungle"&&p.earlyJungle&&["Xin Zhao","Volibear","Udyr","Jarvan IV"].includes(champ))add(6,"stabil tidig 2v2");

  if(ours().some(e=>traits.engage.has(e.champ))&&smartTraits.reliableFollow.has(champ))add(5,"bra follow-up");
  if(ours().some(e=>traits.immobileCarry.has(e.champ))&&(smartTraits.peel.has(champ)||traits.frontline.has(champ)))add(6,"skyddar egen carry");

  // Generic enabling for the team's jungle-carry identity.
  const ownJg=ownRoleMap().jungle;
  if(["Viego","Kindred","Graves"].includes(ownJg)){
    if(role==="top"&&["Shen","Malphite","Sion"].includes(champ))add(6,"enablear jungle carry");
    if(role==="mid"&&["Taliyah","Ahri","Hwei"].includes(champ))add(6,"prio/setup för jungle");
    if(role==="support"&&["Nautilus","Maokai","Leona"].includes(champ))add(6,"setup för jungle");
  }

  // Known matchup/synergy rules remain useful, but are no longer the whole brain.
  const rule=ruleBoost(champ,role);
  if(rule)add(rule,"specifik matchup/synergy");

  // Draft-order intelligence: reward safe blinds, reward counters once lane is shown.
  if(enemyMap[role]){
    add(role==="top"||role==="mid"?7:4,"rollen är visad");
  }else if(ours().length<3){
    if(roleBlindSafety[role]?.has(champ))add(6,"säker blind");
    else if((role==="top"||role==="mid")&&smartTraits.counterSensitive.has(champ)){s-=6;reasons.push({pts:-6,label:"counterkänslig blind"});}
  }

  const recent=recentPicks();
  const times=recent.filter(x=>x===champ).length;
  s-=Math.min(10,times*3);
  if(role==="mid"&&champ==="Taliyah"&&recent.slice(-2).includes("Taliyah"))s-=8;

  return {ch:champ,score:s,reasons:reasons.sort((a,b)=>b.pts-a.pts)};
}

function candidateScore(champ,role,compName){
  return scoreCandidateDetails(champ,role,compName).score;
}

function topRecommendationDetails(role){
  if(!role||role==="unknown")return[];
  const used=unavailable(),comp=desiredComp();
  return (teamPool[role]||[]).filter(ch=>!used.has(ch.toLowerCase()))
    .map(ch=>scoreCandidateDetails(ch,role,comp))
    .sort((a,b)=>b.score-a.score).slice(0,3);
}

function topRecommendations(role){
  return topRecommendationDetails(role).map(x=>x.ch);
}

function recommendedNextRole(){
  const map=ownRoleMap();
  const open=roles.filter(role=>!map[role]);
  if(!open.length)return null;
  const enemyMap=enemyRoleMap(), need=currentNeeds();

  const scored=open.map(role=>{
    const details=topRecommendationDetails(role);
    if(!details.length)return {role,score:-999};
    const best=details[0];
    const available=(teamPool[role]||[]).filter(ch=>!unavailable().has(ch.toLowerCase()));
    let score=best.score*0.24;

    // Counterpick value.
    if(enemyMap[role])score+=({top:19,jungle:10,mid:16,adc:9,support:9}[role]||8);
    // Preserve counter-sensitive solo lanes when enemy has not shown them.
    if(!enemyMap[role]&&role==="top")score-=10;
    if(!enemyMap[role]&&role==="mid")score-=6;
    // Scarcity: if bans/picks are squeezing a role, do not wait too long.
    if(available.length<=2)score+=9;
    else if(available.length<=4)score+=4;
    // If the best pick solves an urgent structural hole, raise the role.
    if(need.front===0&&traits.frontline.has(best.ch))score+=8;
    if(need.engage===0&&traits.engage.has(best.ch))score+=8;
    if(need.peel===0&&smartTraits.peel.has(best.ch)&&ours().length>=2)score+=4;
    if(ours().length>=3&&(role==="top"||role==="mid"))score+=5;
    return {role,score};
  });
  return scored.sort((a,b)=>b.score-a.score)[0].role;
}

function banScore(champ){
  let s=banBase[champ]||0;
  const map=ownRoleMap(), enemyMap=enemyRoleMap(), p=enemyProfile();
  if(map.adc&&traits.immobileCarry.has(map.adc)&&traits.dive.has(champ))s+=16;
  if(map.jungle&&["Kindred","Graves","Viego"].includes(map.jungle)&&["Poppy","Vi","Nocturne"].includes(champ))s+=17;
  if(map.top&&["Malphite","Sion","Shen"].includes(map.top)&&["Gwen","Fiora","Trundle"].includes(champ))s+=12;
  if(p.enchanter>=1&&["Kog'Maw","Jinx","Aphelios"].includes(champ))s+=9;
  if(p.poke>=2&&traits.disengage.has(champ))s+=6;

  // Do not waste a phase-2 ban on a role the opponent has already clearly filled.
  const candidates=enemyRoleCandidates(champ).filter(r=>r!=="unknown");
  if(candidates.length===1&&enemyMap[candidates[0]])s-=18;
  return s;
}

function renderRecommendation(){
  const t=current(),box=$("recommendationBox");
  if(!t||t.side!==userSide){box.classList.add("hidden");return}

  if(t.type==="ban"){
    const bans=banRecommendations();box.classList.remove("hidden");
    $("recommendEyebrow").textContent="BANFÖRSLAG";$("recommendRole").textContent="BAN:";
    $("recommendPicks").textContent=bans.join(" / ");
    $("recommendReason").textContent="Hot mot er comp + deny-synergy + phase-2 rollvärde. Undviker i möjligaste mån bans på redan fyllda roller.";
    return;
  }

  const autoRole=recommendedNextRole();
  const role=selectedRole||autoRole;
  if(!role){box.classList.add("hidden");return}
  const details=topRecommendationDetails(role);
  box.classList.remove("hidden");
  $("recommendEyebrow").textContent=selectedRole?"PICKFÖRSLAG":"REKOMMENDERAD NÄSTA ROLL";
  $("recommendRole").textContent=roleNames[role]+":";
  $("recommendPicks").textContent=details.length?details.map(x=>x.ch).join(" / "):"Inga tillgängliga picks i team-poolen";
  const top=details[0];
  const why=top?top.reasons.filter(x=>x.pts>0).slice(0,3).map(x=>x.label).join(" · "):"";
  $("recommendReason").textContent=(selectedRole?"Manuellt vald roll. ":"Draft Brain väljer även roll. ")+"Riktning: "+desiredComp()+" · confidence "+compConfidence()+(why?" · "+top.ch+": "+why:"");
}

function renderCompChecks(){
  const n=currentNeeds(),p=enemyProfile(),box=$("compChecks");box.innerHTML="";
  const checks=[
    ["Frontline",n.front>0,n.front+" st"],
    ["Engage",n.engage>0,n.engage+" st"],
    ["Damage",n.dmg>=2,n.dmg+" threats"],
    ["AD/AP",!(n.ad>=3&&n.ap===0)&&!(n.ap>=3&&n.ad===0),n.ad+" AD / "+n.ap+" AP"],
    ["Peel",n.peel>0||p.dive<2,n.peel+" st"],
    ["Waveclear",n.wave>0,n.wave+" st"],
    ["Anti-tank",p.tanks<2||n.antiTank>0,p.tanks>=2?n.antiTank+" svar":"ej akut"],
    ["Identitet",compFitScore(desiredComp())>=12,desiredComp()+" · "+compConfidence()]
  ];
  checks.forEach(([name,good,val])=>{
    const d=document.createElement("div");d.className="check "+(good?"good":"bad");d.textContent=name+": "+val;box.appendChild(d);
  });
}

function buildWatch(){
  const p=enemyProfile(), enemy=enemies();
  const carry=enemy.find(e=>traits.hyperCarry.has(e.champ))||enemy.find(e=>traits.immobileCarry.has(e.champ));
  const warnings=[];
  if(p.hyper>=1&&p.enchanter>=1)warnings.push("Hypercarry + enchanter: access på "+(carry?carry.champ:"carryn")+" är prio.");
  if(p.dive>=2)warnings.push("Mycket dive: spara peel/CC till deras första commit.");
  if(p.poke>=2&&p.disengage>=1)warnings.push("Poke + disengage: flank eller hård engage; gå inte långsamt framifrån.");
  else if(p.poke>=2)warnings.push("Mycket poke: korta setup-tiden och hitta engage från fog.");
  if(p.melee>=3)warnings.push("Kort range: spela chokes och låt dem gå in i er.");
  if(p.tanks>=2)warnings.push("2+ tanks: säkra sustained/anti-tank damage.");
  if(p.split>=1)warnings.push("Stark sidelane: bestäm side-match innan objective.");
  return warnings.slice(0,2).join(" ")||"Kolla damage split, frontline och vem som faktiskt startar fighten.";
}

function buildWincon(comp){
  const enemy=enemies(), own=ours();
  const target=enemy.find(e=>traits.hyperCarry.has(e.champ))||enemy.find(e=>traits.immobileCarry.has(e.champ));
  const ownCarry=own.find(e=>traits.hyperCarry.has(e.champ))||own.find(e=>["Viego","Kindred","Graves","Jinx","Viktor","Xayah"].includes(e.champ));
  let text=comps[comp].wincon;
  if(target)text="Enemy key target: "+target.champ+". "+text;
  if(ownCarry)text+=" Skydda/enablea "+ownCarry.champ+" när fighten väl startat.";
  return text;
}

function smartLaneValue(role){
  const own=ownRoleMap(), enemy=enemyRoleMap();
  if(role==="top"){
    const a=own.top,e=enemy.top;if(!a)return -99;
    let v=laneSetupScore(a)*2;
    if(a&&traits.early.has(a))v+=2;
    if(e&&traits.melee.has(e))v+=1;
    if(e&&traits.immobileCarry.has(e))v+=2;
    if(e&&traits.disengage.has(e))v-=1;
    return v;
  }
  if(role==="bot"){
    if(!own.adc&&!own.support)return -99;
    let v=laneSetupScore(own.adc||"")+laneSetupScore(own.support||"");
    if(own.support&&traits.engage.has(own.support))v+=2;
    if(own.adc&&traits.early.has(own.adc))v+=1;
    if(enemy.adc&&traits.immobileCarry.has(enemy.adc))v+=2;
    if(enemy.support&&traits.enchanter.has(enemy.support))v+=1;
    if(enemy.support&&traits.disengage.has(enemy.support))v-=2;
    return v;
  }
  return 0;
}

function buildPath(){
  const map=ownRoleMap(), enemyMap=enemyRoleMap();
  if(!map.jungle)return "Låses när er jungle är pickad.";

  const top=smartLaneValue("top"),bot=smartLaneValue("bot");
  const mid=laneSetupScore(map.mid||"");
  let path;

  if(top>-90&&bot>-90&&Math.abs(top-bot)<2){
    path="Fullclear flexibelt. Låt första waves/prio avgöra top vs bot.";
  }else if(top>bot){
    path="Bot → top. Topsidan har bättre setup/volatilitet.";
  }else{
    path="Top → bot. Botsidan har bättre setup/target access.";
  }

  if(mid>=2)path+=" Mid har bra setup och kan bli pivot efter clear.";
  if(enemyMap.jungle&&traits.earlyJungle.has(enemyMap.jungle))path+=" Tracka "+enemyMap.jungle+"; undvik blind river-fight utan prio.";
  else if(enemyMap.jungle&&traits.scalingJungle.has(enemyMap.jungle))path+=" Straffa "+enemyMap.jungle+"s scaling med prio/invade när lanes kan röra sig.";
  return path;
}

loadChampionRoster();
restoreState();
if(userSide)render();
