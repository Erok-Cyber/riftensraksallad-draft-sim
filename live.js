const fallbackChampions = [
"Aatrox","Ahri","Akali","Alistar","Ambessa","Amumu","Anivia","Annie","Aphelios","Ashe","Aurora","Azir","Braum","Caitlyn","Camille","Cassiopeia","Darius","Ezreal","Fiora","Galio","Garen","Gnar","Gragas","Graves","Heimerdinger","Hwei","Ivern","Jarvan IV","Jax","Jayce","Jinx","Kai'Sa","Kalista","Kayn","Kennen","Kindred","Kog'Maw","K'Sante","Lee Sin","Leona","Lillia","Lucian","Lulu","Malphite","Maokai","Milio","Miss Fortune","Mordekaiser","Nami","Nautilus","Nocturne","Olaf","Orianna","Ornn","Poppy","Rakan","Rell","Renekton","Rumble","Ryze","Sejuani","Senna","Shen","Sion","Skarner","Smolder","Sylas","Syndra","Tahm Kench","Taliyah","Tristana","Trundle","Tryndamere","Twisted Fate","Udyr","Varus","Vex","Vi","Viego","Viktor","Volibear","Wukong","Xayah","Xin Zhao","Yone","Yunara","Zac","Zeri"
].sort();

let championRoster = [...fallbackChampions];
let championMeta = {};

const teamPool = {
  top:["Renekton","Malphite","Shen","Mordekaiser","Sion","Garen","Darius","Olaf","Trundle","Heimerdinger","Yorick","Galio"],
  jungle:["Xin Zhao","Jarvan IV","Viego","Volibear","Udyr","Lillia","Vi","Wukong","Graves","Kindred"],
  mid:["Ahri","Annie","Vex","Hwei","Taliyah","Viktor","Sylas","Anivia"],
  adc:["Ashe","Varus","Xayah","Jinx","Senna"],
  support:["Nautilus","Leona","Maokai"]
};

const comfort = {
  top:{"Renekton":10,"Malphite":10,"Shen":9,"Mordekaiser":9,"Sion":8,"Garen":8,"Darius":7,"Olaf":7,"Trundle":7,"Heimerdinger":6,"Yorick":6,"Galio":6},
  jungle:{"Xin Zhao":10,"Jarvan IV":10,"Viego":9,"Volibear":9,"Udyr":9,"Lillia":8,"Vi":8,"Wukong":7,"Graves":7,"Kindred":6},
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
      jungle:["Volibear","Xin Zhao","Lillia"],
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
      jungle:["Kindred","Graves","Lillia"],
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
  damage:new Set(["Ahri","Anivia","Annie","Ashe","Darius","Graves","Hwei","Jinx","Kindred","Lillia","Mordekaiser","Olaf","Taliyah","Varus","Vex","Viego","Viktor","Xayah","Xin Zhao"]),
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
  scalingJungle:new Set(["Evelynn","Karthus","Kayn","Lillia","Master Yi","Shyvana"])
};

const damageType = {
  "Renekton":"AD","Malphite":"AP","Shen":"MIX","Mordekaiser":"AP","Sion":"AD","Garen":"AD","Darius":"AD","Olaf":"AD","Trundle":"AD","Heimerdinger":"AP","Yorick":"AD","Galio":"AP",
  "Xin Zhao":"AD","Jarvan IV":"AD","Viego":"AD","Volibear":"MIX","Udyr":"MIX","Lillia":"AP","Vi":"AD","Wukong":"AD","Graves":"AD","Kindred":"AD",
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
  {own:["Maokai"],role:"jungle",boost:{"Xin Zhao":12,"Viego":10,"Lillia":10,"Volibear":8}},
  {own:["Vex"],role:"jungle",boost:{"Xin Zhao":10,"Volibear":8,"Vi":8}},
  {own:["Annie"],role:"jungle",boost:{"Jarvan IV":16,"Vi":10,"Wukong":8}},
  {own:["Malphite"],role:"mid",boost:{"Annie":14,"Vex":8,"Hwei":7}},
  {own:["Shen"],role:"jungle",boost:{"Viego":15,"Kindred":13,"Lillia":11,"Graves":10}}
];

const banBase = {
  "Nocturne":18,"Poppy":16,"Janna":13,"Milio":13,"Lulu":12,"Skarner":12,"Rell":11,"Ornn":10,"K'Sante":10,"Vi":10,"Jarvan IV":10,"Aatrox":8,"Aurora":8,"Syndra":8
};

let userSide=null, step=0, events=[], selectedRole=null, historySaved=false;
let pendingMatchResult=null,pendingMatchType=null;
let testMode=(new URLSearchParams(location.search).get("test")==="1")||localStorage.getItem("rs_test_mode")==="1";
let draftIsTest=testMode;
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
    championMeta=Object.fromEntries(entries.map(c=>[c.name,{tags:c.tags||[],info:c.info||{},image:"https://ddragon.leagueoflegends.com/cdn/"+version+"/img/champion/"+c.image.full}]));
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
  if(testMode||draftIsTest)return;
  localStorage.setItem("rs_draft_state",JSON.stringify({userSide,step,events,historySaved,pendingMatchResult,pendingMatchType}));
}
function restoreState(){
  if(new URLSearchParams(location.search).get("replay")==="1"){
    try{
      const replay=JSON.parse(sessionStorage.getItem("rs_review_replay")||"null");
      const valid=replay&&["blue","red"].includes(replay.side)&&Array.isArray(replay.events)&&replay.events.length<draftOrder.length&&
        replay.events.every((e,i)=>e.type===draftOrder[i].type&&e.side===draftOrder[i].side&&typeof e.champ==="string");
      if(valid){
        testMode=true;draftIsTest=true;userSide=replay.side;events=replay.events;step=events.length;
        $("startCard").classList.add("hidden");$("liveArea").classList.remove("hidden");
        renderTestMode();$("testModeBtn").disabled=true;
        $("replayNotice").classList.remove("hidden");
        $("replayNotice").textContent="Övning från Draft Review · endast tidigare picks/bans är inlästa. Förslagen använder dagens motor och metadata"+(replay.patch?" (matchen: "+replay.patch+")":"")+". Sparas inte i matchhistoriken.";
        return true;
      }
    }catch{}
    testMode=true;draftIsTest=true;renderTestMode();
    $("replayNotice").classList.remove("hidden");$("replayNotice").textContent="Övningen kunde inte läsas. Välj ett beslut igen i Draft Review.";
    return false;
  }
  if(testMode)return false;
  try{
    const state=JSON.parse(localStorage.getItem("rs_draft_state")||"null");
    if(state&&state.userSide&&Array.isArray(state.events)){
      userSide=state.userSide;step=state.step||0;events=state.events;historySaved=!!state.historySaved;
      pendingMatchResult=state.pendingMatchResult||null;pendingMatchType=state.pendingMatchType||null;
      $("startCard").classList.add("hidden");$("liveArea").classList.remove("hidden");
      return true;
    }
  }catch{}
  return false;
}
function clearState(){localStorage.removeItem("rs_draft_state");pendingMatchResult=null;pendingMatchType=null}

document.querySelectorAll(".side-btn").forEach(btn=>btn.addEventListener("click",()=>{
  userSide=btn.dataset.side;step=0;events=[];selectedRole=null;historySaved=false;pendingMatchResult=null;pendingMatchType=null;draftIsTest=testMode;
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
$("championInput").addEventListener("input",()=>{
  const value=$("championInput").value.trim();
  $("lockBtn").textContent=value?"Lås "+value:"Lås";
  $("championInput").classList.toggle("suggestion-selected",false);
});

function chooseSuggestedChampion(champ,role=null){
  const turn=current();
  if(!turn||turn.side!==userSide||!champ)return;
  if(unavailable().has(champ.toLowerCase()))return;

  $("championInput").value=champ;
  $("championInput").classList.add("suggestion-selected");

  if(turn.type==="pick"&&role){
    selectedRole=role;
    document.querySelectorAll(".role-buttons button").forEach(b=>b.classList.toggle("active",b.dataset.role===role));
    renderTurn();
    renderRecommendation();
  }

  $("lockBtn").textContent="Lås "+champ;
}

document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-suggest-champ]");
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  const champ=decodeURIComponent(btn.dataset.suggestChamp||"");
  const role=btn.dataset.suggestRole||null;
  chooseSuggestedChampion(champ,role);
});
$("undoBtn").addEventListener("click",()=>{
  if(historySaved&&step>=draftOrder.length){
    alert("Matchen är redan sparad. Starta en ny draft eller radera matchen från Analys om registreringen blev fel.");
    return;
  }
  if(step===0)return;
  events.pop();enemyInferenceCache={key:null,value:null};enemyProfileCache={key:null,value:null};finalAnalysisCache={key:null,value:null};
  step=Math.max(0,step-1);selectedRole=null;historySaved=false;pendingMatchResult=null;pendingMatchType=null;saveState();render();
});
$("resetBtn").addEventListener("click",()=>{
  const unsaved=step>=draftOrder.length&&!historySaved&&!testMode&&!draftIsTest;
  const msg=unsaved
    ?"Den färdiga matchen är inte sparad ännu. Starta ny draft ändå?"
    :"Starta en helt ny draft?";
  if(confirm(msg)){
    if(new URLSearchParams(location.search).has("replay")){location.href="live.html?test=1";return;}
    if(!testMode&&!draftIsTest)clearState();
    location.reload();
  }
});

function renderTestMode(){
  const btn=$("testModeBtn");
  if(!btn)return;
  btn.classList.toggle("active",testMode);
  btn.textContent=testMode?"🧪 TEST MODE: PÅ":"🧪 TEST MODE: AV";
  document.body.classList.toggle("test-mode",testMode);
}
$("testModeBtn")?.addEventListener("click",()=>{
  testMode=!testMode;
  localStorage.setItem("rs_test_mode",testMode?"1":"0");
  if(testMode){
    draftIsTest=true;
  }
  renderTestMode();
});
renderTestMode();

function lockCurrent(){
  const turn=current(); if(!turn)return;
  const raw=$("championInput").value.trim(); if(!raw)return;
  const champ=normalizeName(raw);
  if(!championRoster.includes(champ)){alert("Välj en champion från listan.");return;}
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
  const brainBefore=turn.side===userSide?{
    role:role||null,
    suggestions:turn.type==="ban"?banRecommendations().slice(0,3):topRecommendations(role).slice(0,3),
    comp:desiredComp(),
    matchup:draftMatchupAnalysis()
  }:null;
  events.push({...turn,champ,role,brain:brainBefore});
  enemyInferenceCache={key:null,value:null};enemyProfileCache={key:null,value:null};finalAnalysisCache={key:null,value:null};
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
  const done=step>=draftOrder.length;
  document.body.classList.toggle("draft-complete",done);
  renderTeam("blue");renderTeam("red");renderTurn();renderStatus();
  $("draftProgress").textContent=step+" / "+draftOrder.length;
  renderDraftMatchup();

  if(done){
    renderFinalGameplan();
    renderMatchSave();
    return;
  }

  renderCoach();
  renderRecommendation();
  renderAllRoleRecommendations();
  renderCompChecks();
  renderAutoRead();
  renderFinalGameplan();
}

function renderTeam(side){
  const bans=events.filter(e=>e.side===side&&e.type==="ban");
  $(side+"Bans").innerHTML=bans.length?bans.map(e=>'<span class="ban-chip">'+e.champ+"</span>").join(""):'<span class="hint">—</span>';
  const picks=events.filter(e=>e.side===side&&e.type==="pick");
  const box=$(side+"Picks");box.innerHTML="";
  const isEnemy=side!==userSide;
  const inferred=isEnemy?inferEnemyRoles().byChamp:{};
  for(let i=0;i<5;i++){
    const p=picks[i],div=document.createElement("div");div.className="pick"+(isEnemy&&p?" inferred-pick":"");
    if(!p){
      div.innerHTML='<span class="slot">P'+(i+1)+'</span><span class="champ">—</span>';
    }else if(isEnemy){
      const g=inferred[p.champ];
      const hard=p.role&&p.role!=="unknown";
      const role=g?.role||p.role||"unknown";
      const confidence=Math.round((g?.confidence||0)*100);
      const alt=g?.alternatives?.[0];
      const altText=alt&&alt.p>=.12?" · "+roleNames[alt.role]+" "+Math.round(alt.p*100)+"%":"";
      const roleText=hard?roleNames[role]:"~ "+roleNames[role]+" "+confidence+"%";
      div.innerHTML='<span class="slot enemy-inferred-role">'+roleText+'</span><span class="champ">'+p.champ+'</span>';
      if(!hard&&g){
        div.title="Draft Brain inference: "+roleNames[role]+" "+confidence+"%"+altText+". Räknas om efter varje enemy-pick.";
      }else if(hard){
        div.title="Manuellt låst enemy-roll.";
      }
    }else{
      div.innerHTML='<span class="slot">'+(p.role?roleNames[p.role]:"P"+(i+1))+'</span><span class="champ">'+p.champ+"</span>";
    }
    box.appendChild(div);
  }
}

function renderTurn(){
  const t=current();
  if(!t){
    $("phaseLabel").textContent="KLAR";$("turnLabel").textContent="DRAFT KLAR";$("lockBtn").style.display="none";$("roleWrap").classList.add("hidden");return;
  }
  $("lockBtn").style.display="block";
  const inputValue=$("championInput").value.trim();
  $("lockBtn").textContent=inputValue?"Lås "+inputValue:"Lås";
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
      if(isOwn){
        hint.classList.toggle("hidden",!suggested);
        hint.textContent=selectedRole?"Vald roll: "+roleNames[selectedRole]:(suggested?"Föreslagen roll: "+roleNames[suggested]:"");
      }else{
        hint.classList.remove("hidden");
        hint.textContent="Enemy: lämna ? för AUTO. Draft Brain infererar mest sannolik roll och räknar om när fler picks visas.";
      }
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
    const buttons=recs.map(ch=>'<button type="button" class="champ-suggestion compact" data-suggest-champ="'+encodeURIComponent(ch)+'" data-suggest-role="'+role+'">'+ch+'</button>').join("");
    div.innerHTML="<span>"+roleNames[role]+"</span><div class=\"role-rec-picks\">"+(buttons||"—")+"</div>";
    div.addEventListener("click",e=>{
      if(e.target.closest("[data-suggest-champ]"))return;
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
  if(compConfidence()==="öppen"){
    $("compCall").textContent="COMP: Öppen";
    $("planCall").textContent="Säkra ett flexibelt pick. Anpassa riktningen efter det motståndaren visar.";
    $("winconCall").textContent="Bygg frontline, damage och ett tydligt sätt att starta eller vända fights.";
    $("watchCall").textContent=buildWatch();$("pathCall").textContent=buildPath();return;
  }
  $("compCall").textContent="COMP: "+comp;
  $("planCall").textContent=comps[comp].plan;
  $("winconCall").textContent=buildWincon(comp);
  $("watchCall").textContent=buildWatch();
  $("pathCall").textContent=buildPath();
}


const powerCurve = {
  hardScale:new Set(["Aurelion Sol","Azir","Cassiopeia","Kayle","Kassadin","Kog'Maw","Jinx","Aphelios","Smolder","Senna","Vayne","Zeri","Veigar","Viktor","Kindred"]),
  goodScale:new Set(["Anivia","Graves","Gwen","Hwei","Kai'Sa","Lillia","Master Yi","Nasus","Orianna","Ryze","Sion","Sylas","Tristana","Xayah","Yone","Yorick","Viego","Taliyah"]),
  earlyHeavy:new Set(["Darius","Draven","Elise","Jarvan IV","Kalista","Lee Sin","Olaf","Pantheon","Rek'Sai","Renekton","Xin Zhao","Volibear","Nidalee"]),
  midSpike:new Set(["Ahri","Annie","Ashe","Garen","Leona","Malphite","Maokai","Mordekaiser","Nautilus","Nocturne","Rell","Shen","Trundle","Udyr","Varus","Vex","Vi","Wukong"]),
  utilityScale:new Set(["Alistar","Braum","Ivern","Janna","Lulu","Milio","Nami","Poppy","Rakan","Renata Glasc","Seraphine","Soraka","Tahm Kench","Thresh"])
};

function championCurve(champ){
  if(powerCurve.hardScale.has(champ))return {early:2.1,mid:3.4,late:4.8};
  if(powerCurve.goodScale.has(champ))return {early:2.6,mid:3.7,late:4.15};
  if(powerCurve.earlyHeavy.has(champ))return {early:4.5,mid:4.0,late:2.45};
  if(powerCurve.midSpike.has(champ))return {early:3.45,mid:4.4,late:3.15};
  if(powerCurve.utilityScale.has(champ))return {early:3.0,mid:3.75,late:3.85};
  return {early:3.05,mid:3.35,late:3.3};
}

function teamCurve(list){
  if(!list.length)return {early:3,mid:3,late:3};
  const total=list.reduce((a,e)=>{
    const c=championCurve(e.champ);
    a.early+=c.early;a.mid+=c.mid;a.late+=c.late;return a;
  },{early:0,mid:0,late:0});
  return {
    early:total.early/list.length,
    mid:total.mid/list.length,
    late:total.late/list.length
  };
}

function curveGrade(v){
  if(v>=4.25)return "MYCKET BRA";
  if(v>=3.7)return "BRA";
  if(v>=3.15)return "OKEJ";
  return "SVAG";
}

function buildPowerCurvePlan(){
  const own=teamCurve(ours()), enemy=teamCurve(enemies());
  const lateDiff=own.late-enemy.late;
  const earlyDiff=own.early-enemy.early;
  const midDiff=own.mid-enemy.mid;
  const comp=desiredComp();

  let scaling,scalingDetail;
  if(lateDiff>=0.55){
    scaling=curveGrade(own.late)+" · NI OUTSCALAR";
    scalingDetail="Ni blir relativt starkare ju längre matchen går.";
  }else if(lateDiff<=-0.55){
    scaling=curveGrade(own.late)+" · DE OUTSCALAR";
    scalingDetail="Enemy får tydlig relativ fördel om matchen går väldigt sent.";
  }else{
    scaling=curveGrade(own.late)+" · JÄMNT";
    scalingDetail="Ingen sida har en massiv ren late-scalingfördel.";
  }

  let earlyNeed,earlyNeedDetail;
  if(lateDiff<=-0.55 && earlyDiff>=0){
    earlyNeed="JA · SKAPA LEAD";
    earlyNeedDetail="Ni behöver inte stomp, men vill gå in i 15–20 min med tempo/objectives.";
  }else if(comp==="EARLY SKIRMISH" && lateDiff<0.25){
    earlyNeed="HELST · VINN TEMPO";
    earlyNeedDetail="Vår comp betalar mest när ni konverterar early till starkt midgame.";
  }else if(lateDiff>=0.55){
    earlyNeed="NEJ · INGEN PANIK";
    earlyNeedDetail="Spela stabilt. Ni behöver inte coinflippa early för att vinna.";
  }else{
    earlyNeed="NEJ · MEN GE INTE GRATIS";
    earlyNeedDetail="Jämn kurva: håll matchen kontrollerad och spela för våra spikes.";
  }

  const phases=[
    {name:"0–10",value:own.early,enemy:enemy.early},
    {name:"10–25",value:own.mid,enemy:enemy.mid},
    {name:"25+",value:own.late,enemy:enemy.late}
  ];
  const best=phases.sort((a,b)=>(b.value-b.enemy)-(a.value-a.enemy))[0];
  let window=best.name+" MIN";
  let windowDetail;
  if(best.name==="0–10")windowDetail="Ni har mest relativ edge tidigt: prio, skirmish och första objective.";
  else if(best.name==="10–25")windowDetail="Det här är er viktigaste power window: grupperingar, picks och objectives.";
  else windowDetail="Ni blir starkast relativt sent: håll economy och undvik onödiga coinflips.";

  let behind,behindDetail;
  if(lateDiff>=0.55){
    behind="STABILISERA";
    behindDetail="Catch waves, trade objectives och dra ut matchen — ni har scaling att falla tillbaka på.";
  }else if(lateDiff<=-0.55){
    behind="SKAPA PICKS";
    behindDetail="Undvik passiv farmfest. Sök numbers advantage, fog-picks och cross-map innan enemy når full late.";
  }else{
    behind="BYT TEMPO";
    behindDetail="Trade istället för att contestera allt. Hitta nästa starka objective/setup-fönster.";
  }

  let p010,p1025,p25;
  if(earlyDiff>=0.4)p010="Använd lane-prio och jungle för första tempo. Fighta bara där lanes kan röra sig.";
  else p010="Spela disciplinerat. Fullclear/farm där det behövs och ge inte gratis deaths för river.";

  if(comp==="OBJECTIVE CONTROL")p1025="Detta är setup-fasen: push → reset → vision 45–60s före objective → tvinga dem in i er.";
  else if(comp==="PRESS R")p1025="Gruppera runt våra R-cooldowns. En tydlig GO-call → kill → objective.";
  else if(comp==="JUNGLE CARRY")p1025="Lanes enablear jungle. Ta river/enemy camps och spela runt carryns tempo.";
  else p1025="Spela mid/jg/sup tillsammans. Pick eller prio ska direkt konverteras till tower/objective.";

  if(lateDiff>=0.55)p25="Bra läge för er. Spela front-to-back/kring carry och låt scaling göra jobbet — forcea inte.";
  else if(lateDiff<=-0.55)p25="Enemy har bättre ren late. Undvik raka 5v5 utan setup; spela vision, flank och picks före objective.";
  else p25="Late är spelbar för båda. Vision + engage execution och target selection avgör mer än scaling.";

  return {
    scaling,scalingDetail,earlyNeed,earlyNeedDetail,
    window,windowDetail,behind,behindDetail,
    p010,p1025,p25,
    own,enemy,lateDiff,earlyDiff,midDiff
  };
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
    early="Spela stabilt tills våra engage-tools är online.";
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

  const power=buildPowerCurvePlan();
  const firstObjective=objectiveAutoPlan();
  const fightJobText=fightJobs();
  const risks=draftRiskEngine();
  if(risks[0]?.severity>=3) rule+=" WATCH: "+risks[0].text;
  return {comp,early,mid,fight,objective,rule,firstObjective,fightJobText,...power};
}

let finalAnalysisCache={key:null,value:null};
function finalAnalysisKey(){
  return events.map(e=>e.type+"@"+e.side+"@"+e.champ+"@"+(e.role||"")).join("|");
}
function getFinalAnalysis(){
  const key=(window.RIFT_ENGINE_VERSION||"base")+"::"+finalAnalysisKey();
  if(finalAnalysisCache.key===key&&finalAnalysisCache.value)return finalAnalysisCache.value;

  let value=buildFinalGameplan()||{};
  const power=buildPowerCurvePlan();

  // Self-healing fallback: never leave the explanation grid blank.
  value={
    ...power,
    ...value,
    comp:value.comp||desiredComp(),
    early:value.early||buildPath(),
    mid:value.mid||"Spela runt prio, resets och nästa objective.",
    fight:value.fight||"Ta en tydlig fight på samma target och spela era cooldowns tillsammans.",
    objective:value.objective||"Prio → reset → vision → objective.",
    rule:value.rule||"Spela samma plan tillsammans — jaga inte efter extra kills.",
    firstObjective:value.firstObjective||objectiveAutoPlan(),
    fightJobText:value.fightJobText||fightJobs()
  };

  finalAnalysisCache={key,value};
  return value;
}

function shortLoadingPlan(gp){
  const comp=gp.comp||desiredComp(), map=ownRoleMap();
  let plan,objective,fight,watch;

  if(comp==="EARLY SKIRMISH"){
    plan="Prio först. Fighta bara 2v2/3v3 när lanes kan flytta.";
    fight="Pick → kill → direkt tower/objective. Jaga inte.";
  }else if(comp==="PRESS R"){
    plan="Spela stabilt tills engage-ults. Gruppera när knapparna är uppe.";
    fight="En person startar. Alla följer samma target direkt.";
  }else if(comp==="OBJECTIVE CONTROL"){
    plan="Push → reset → kom först till river. Jaga inte.";
    fight="Låt dem gå in i er setup och turna tillsammans.";
  }else{
    plan="Lanes skapar prio. Spela runt jungle-tempo och river.";
    fight="Junglern ska följa/cleana, inte vara första sacrifice.";
  }

  const obj=gp.firstObjective||objectiveAutoPlan();
  if(obj.call==="BOTSIDE NEUTRAL")objective="Spela första setup botside med mid/bot-prio.";
  else if(obj.call==="TOPSIDE NEUTRAL")objective="Spela första setup topside med top/mid-prio.";
  else if(obj.call==="TRADEA FÖRSTA")objective="Coinflippa inte första objective — crossmap/tradea.";
  else objective="Låt lane-prio avgöra första objective. Forcea inte utan move.";

  const jobs=gp.fightJobText||fightJobs();
  if(jobs&&jobs.length<150)fight+=" "+jobs;

  const risk=draftRiskEngine()[0];
  watch=risk?.severity>=2?risk.text:buildWatch();
  if(watch.length>125)watch=watch.split(".")[0]+".";

  let jungle=gp.early||buildPath();
  const directPath=buildPath();
  if(directPath&&!directPath.startsWith("Låses"))jungle=directPath;
  if(jungle.length>135)jungle=jungle.split(".").slice(0,2).join(".")+".";
  if(!map.jungle)jungle="Spela mot sidan som faktiskt har prio.";

  const call="Vi spelar "+comp+". "+plan+" "+objective+" "+fight+" WATCH: "+watch;
  return {comp,plan,jungle,objective,fight,watch,call};
}

function renderFinalGameplan(){
  const card=$("finalGameplanCard");
  if(step<draftOrder.length){card.classList.add("hidden");return}

  const gp=getFinalAnalysis();
  const call=shortLoadingPlan(gp);
  card.classList.remove("hidden");

  $("finalCompBadge").textContent=call.comp;
  $("gpLoadingCall").textContent=call.call;
  $("gpCallPlan").textContent=call.plan;
  $("gpCallJungle").textContent=call.jungle;
  $("gpCallObjective").textContent=call.objective;
  $("gpCallFight").textContent=call.fight;
  $("gpCallWatch").textContent=call.watch;

  $("gpScaling").textContent=gp.scaling||"—";
  $("gpScalingDetail").textContent=gp.scalingDetail||"—";
  $("gpEarlyNeed").textContent=gp.earlyNeed||"—";
  $("gpEarlyNeedDetail").textContent=gp.earlyNeedDetail||"—";
  $("gpWindow").textContent=gp.window||"—";
  $("gpWindowDetail").textContent=gp.windowDetail||"—";
  $("gpBehind").textContent=gp.behind||"—";
  $("gpBehindDetail").textContent=gp.behindDetail||"—";

  $("gp010").textContent=gp.p010||"—";
  $("gp1025").textContent=gp.p1025||"—";
  $("gp25").textContent=gp.p25||"—";

  $("gpEarly").textContent=gp.early||"—";
  $("gpMid").textContent=gp.mid||"—";
  $("gpFight").textContent=gp.fight||"—";
  $("gpObjective").textContent=gp.objective||"—";
  $("gpFirstObjective").textContent=gp.firstObjective
    ? gp.firstObjective.call+" — "+gp.firstObjective.detail
    : "—";
  $("gpFightJobs").textContent=gp.fightJobText||"—";

  $("gpFightStyle").textContent=gp.advFightStyle||"—";
  $("gpCooldowns").textContent=gp.advCooldowns||"—";
  $("gpSideLane").textContent=gp.advSideLane||"—";
  $("gpRule").textContent=gp.rule||"—";
}

function matchHistoryData(){
  if(window.RiftSharedData)return window.RiftSharedData.localMatches();
  try{return JSON.parse(localStorage.getItem("rs_match_history")||"[]")}catch{return[]}
}

function renderLiveDbStatus(s=window.RiftSharedData?.getState?.()||{mode:"local",status:"Lokal"}){
  const el=$("liveDbStatus");
  if(!el)return;
  el.className="live-db-status"+(["shared","offline","locked","readonly"].includes(s.mode)?" "+s.mode:"");
  el.textContent=s.status||"Lokal lagring";
  const configured=!!window.RiftSharedData?.configured?.();
  const connected=!!window.RiftSharedData?.hasTeamKey?.();
  $("liveDbConnectBtn")?.classList.toggle("hidden",!configured||connected);
  if($("liveDbConnectBtn"))$("liveDbConnectBtn").textContent="Lås upp sparning";
  $("liveDbSyncBtn")?.classList.toggle("hidden",!configured);
}
window.RiftSharedData?.subscribe?.(renderLiveDbStatus);
$("liveDbConnectBtn")?.addEventListener("click",async()=>{
  const code=prompt("Lagkoden behövs bara för att spara matcher. Ange Riftensräksallads lagkod:");
  if(!code)return;
  try{
    const matches=await window.RiftSharedData.connect(code);
    const synced=await window.RiftSharedData.sync();
    localStorage.setItem("rs_draft_archive",JSON.stringify((synced||[]).slice(-50)));
    renderLiveDbStatus();
    renderMatchSave();
  }catch{
    alert("Lagkoden kunde inte verifieras.");
  }
});
$("liveDbSyncBtn")?.addEventListener("click",async()=>{
  const matches=await window.RiftSharedData?.sync?.();
  localStorage.setItem("rs_draft_archive",JSON.stringify((matches||[]).slice(-50)));
  renderLiveDbStatus();
});
if(window.RiftSharedData?.configured?.()){
  window.RiftSharedData.sync().then(matches=>{
    const archive=(matches||[]).slice(-50).map(m=>({...m}));
    localStorage.setItem("rs_draft_archive",JSON.stringify(archive));
  }).catch(()=>{});
}

function renderMatchSave(){
  const card=$("matchSaveCard");
  if(!card)return;
  if(step<draftOrder.length){card.classList.add("hidden");return}
  card.classList.remove("hidden");

  if(testMode||draftIsTest){
    card.classList.remove("saved");
    $("matchSaveTitle").textContent="TEST MODE — matchen sparas inte";
    $("matchSaveStatus").textContent="TEST";
    document.querySelectorAll(".result-choice,.type-choice").forEach(b=>b.disabled=true);
    $("saveMatchBtn").disabled=true;
    $("openAnalysisBtn")?.classList.add("hidden");
    $("matchSaveHint").textContent="Testdrafts påverkar inte vår statistik eller team learning.";
    return;
  }

  const saved=historySaved;
  card.classList.toggle("saved",saved);
  $("matchSaveTitle").textContent=saved?"Matchen är sparad":"Registrera innan matchen sparas";
  $("matchSaveStatus").textContent=saved?"SPARAD":"EJ SPARAD";
  document.querySelectorAll(".result-choice").forEach(b=>{
    b.disabled=saved;b.classList.toggle("active",b.dataset.result===pendingMatchResult);
  });
  document.querySelectorAll(".type-choice").forEach(b=>{
    b.disabled=saved;b.classList.toggle("active",b.dataset.matchType===pendingMatchType);
  });
  $("saveMatchBtn").disabled=saved||!pendingMatchResult||!pendingMatchType;
  $("saveMatchBtn").textContent=saved?"Match sparad ✓":"Spara match";
  $("openAnalysisBtn")?.classList.toggle("hidden",!saved);
  $("matchSaveHint").textContent=saved
    ?"Matchen räknas nu i Analys och team learning."
    :(!pendingMatchResult||!pendingMatchType?"Välj både Win/Loss och Liga/Flex.":"Redo att spara.");
}

function buildMatchRecord(){
  const inferred=inferEnemyRoles();
  const final=getFinalAnalysis();
  return {
    id:(window.crypto?.randomUUID?.()||("match-"+Date.now()+"-"+Math.random().toString(16).slice(2))),
    savedAt:new Date().toISOString(),
    patch:window.RiftStats?.getStatus?.()?.patch||"26.19",
    result:pendingMatchResult,
    matchType:pendingMatchType,
    side:userSide,
    ourPicks:ours().map(e=>({champ:e.champ,role:e.role})),
    enemyPicks:enemies().map(e=>({champ:e.champ,inferredRole:inferred.byChamp[e.champ]?.role||e.role||"unknown"})),
    ourBans:events.filter(e=>e.side===userSide&&e.type==="ban").map(e=>e.champ),
    enemyBans:events.filter(e=>e.side!==userSide&&e.type==="ban").map(e=>e.champ),
    comp:final.comp||desiredComp(),
    scaling:final.scaling||null,
    bestWindow:final.window||null,
    topRisk:draftRiskEngine()[0]?.text||null,
    fightStyle:final.advFightStyle||null,
    objectiveStyle:final.advObjectiveStyle||null,
    loadingCall:shortLoadingPlan(final).call||null,
    matchup:draftMatchupAnalysis(),
    draftTimeline:events.map(e=>({
      label:e.label,type:e.type,side:e.side,champ:e.champ,role:e.role||null,
      brain:e.brain?{
        role:e.brain.role||null,
        suggestions:[...(e.brain.suggestions||[])],
        comp:e.brain.comp||null,
        matchup:e.brain.matchup?{
          score:e.brain.matchup.score,
          label:e.brain.matchup.label,
          counterValue:e.brain.matchup.counterValue,
          confidence:e.brain.matchup.confidence
        }:null
      }:null
    }))
  };
}

async function saveCompletedMatch(){
  if(testMode||draftIsTest||historySaved||!pendingMatchResult||!pendingMatchType)return;

  if(window.RiftSharedData?.configured?.()&&!window.RiftSharedData?.hasTeamKey?.()){
    const code=prompt("För att spara i lagets databas behövs lagkoden en gång på den här enheten:");
    if(!code)return;
    try{
      await window.RiftSharedData.connect(code);
    }catch{
      alert("Fel lagkod. Matchen har inte sparats.");
      return;
    }
  }

  $("saveMatchBtn").disabled=true;
  $("matchSaveHint").textContent="Sparar match…";
  try{
    const record=buildMatchRecord();

    let sharedSave=null;
    if(window.RiftSharedData)sharedSave=await window.RiftSharedData.saveMatch(record);
    else{
      const matches=matchHistoryData();
      localStorage.setItem("rs_match_history",JSON.stringify([...matches,record].slice(-250)));
    }

    const old=recentPicks();
    const current=ours().map(e=>e.champ);
    localStorage.setItem("rs_recent_picks",JSON.stringify([...old,...current].slice(-20)));

    const archive=JSON.parse(localStorage.getItem("rs_draft_archive")||"[]");
    localStorage.setItem("rs_draft_archive",JSON.stringify([...archive,record].slice(-50)));

    historySaved=true;
    saveState();
    renderMatchSave();

    const db=window.RiftSharedData?.getState?.();
    if(sharedSave?.cloud||db?.mode==="shared")$("matchSaveHint").textContent="Sparad i lagets delade databas.";
    else if(window.RiftSharedData?.configured?.()&&!window.RiftSharedData?.hasTeamKey?.())$("matchSaveHint").textContent="Sparad lokalt. Tryck Anslut lagdatabas för att dela den med laget.";
    else if(window.RiftSharedData?.configured?.())$("matchSaveHint").textContent="Sparad lokalt. Synkas automatiskt när databasen är tillgänglig.";
  }catch(err){
    console.error("Could not save match:",err);
    $("matchSaveHint").textContent="Kunde inte spara matchen.";
    $("saveMatchBtn").disabled=false;
  }
}

document.querySelectorAll(".result-choice").forEach(btn=>btn.addEventListener("click",()=>{
  if(historySaved)return;
  pendingMatchResult=btn.dataset.result;
  renderMatchSave();
}));
document.querySelectorAll(".type-choice").forEach(btn=>btn.addEventListener("click",()=>{
  if(historySaved)return;
  pendingMatchType=btn.dataset.matchType;
  renderMatchSave();
}));
$("saveMatchBtn")?.addEventListener("click",saveCompletedMatch);


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
  antiTank:new Set(["Darius","Kindred","Lillia","Mordekaiser","Olaf","Trundle","Udyr","Varus","Viego","Xayah"]),
  pick:new Set(["Ahri","Annie","Ashe","Jarvan IV","Leona","Maokai","Nautilus","Shen","Taliyah","Varus","Vex","Vi"]),
  zone:new Set(["Anivia","Heimerdinger","Hwei","Lillia","Maokai","Taliyah","Varus","Viktor"]),
  rangedDamage:new Set(["Ahri","Anivia","Annie","Ashe","Graves","Heimerdinger","Hwei","Jinx","Kindred","Senna","Taliyah","Varus","Vex","Viktor","Xayah"]),
  objective:new Set(["Graves","Heimerdinger","Kindred","Lillia","Mordekaiser","Trundle","Udyr","Varus","Viego","Volibear","Xin Zhao"]),
  lanePressure:new Set(["Ahri","Ashe","Darius","Heimerdinger","Olaf","Renekton","Taliyah","Trundle","Varus","Vex","Xin Zhao"]),
  reliableFollow:new Set(["Ahri","Annie","Ashe","Hwei","Jinx","Lillia","Taliyah","Varus","Vex","Viego","Viktor","Xayah"]),
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

const enemyRolePriors = {
  "Braum":{support:.995},
  "Alistar":{support:.995},
  "Leona":{support:.995},
  "Lulu":{support:.995},
  "Milio":{support:.995},
  "Nami":{support:.995},
  "Renata Glasc":{support:.995},
  "Thresh":{support:.995},
  "Poppy":{top:.15,jungle:.43,support:.42},
  "Maokai":{top:.04,jungle:.38,support:.58},
  "Gragas":{top:.50,jungle:.44,mid:.04,support:.02},
  "Galio":{top:.08,mid:.82,support:.10},
  "Trundle":{top:.33,jungle:.67},
  "Senna":{adc:.38,support:.62},
  "Seraphine":{mid:.18,adc:.25,support:.57},
  "Karma":{top:.05,mid:.18,support:.77},
  "Lux":{mid:.45,support:.55},
  "Xerath":{mid:.61,support:.39},
  "Vel'Koz":{mid:.42,support:.58},
  "Brand":{jungle:.18,mid:.17,support:.65},
  "Swain":{top:.05,mid:.37,adc:.12,support:.46},
  "Tahm Kench":{top:.55,support:.45},
  "Pantheon":{top:.29,jungle:.08,mid:.33,support:.30},
  "Sett":{top:.75,mid:.10,support:.15},
  "Akali":{top:.22,mid:.78},
  "Irelia":{top:.45,mid:.55},
  "Yone":{top:.31,mid:.69},
  "Aurora":{top:.32,mid:.68},
  "Vladimir":{top:.22,mid:.78},
  "Cassiopeia":{top:.08,mid:.84,adc:.08},
  "Tristana":{mid:.24,adc:.76},
  "Smolder":{mid:.20,adc:.80},
  "Corki":{mid:.46,adc:.54},
  "Ziggs":{mid:.52,adc:.48},
  "Veigar":{mid:.70,adc:.12,support:.18},
  "Morgana":{jungle:.08,mid:.14,support:.78},
  "Zyra":{jungle:.10,support:.90},
  "Rumble":{top:.69,jungle:.06,mid:.25},
  "Kennen":{top:.90,mid:.10},
  "Jayce":{top:.67,mid:.33},
  "Vayne":{top:.13,adc:.87},
  "Quinn":{top:.91,adc:.09},
  "Karthus":{jungle:.79,adc:.08,mid:.13},
  "Taliyah":{jungle:.31,mid:.69},
  "Ekko":{jungle:.42,mid:.58},
  "Diana":{jungle:.74,mid:.26},
  "Naafiri":{jungle:.28,mid:.72},
  "Talon":{jungle:.18,mid:.82},
  "Shaco":{jungle:.72,support:.28},
  "Fiddlesticks":{jungle:.96,support:.04},
  "Rell":{jungle:.05,support:.95},
  "Nautilus":{mid:.03,support:.97},
  "Ashe":{adc:.86,support:.14},
  "Varus":{mid:.07,adc:.93},
  "Heimerdinger":{top:.45,mid:.24,adc:.05,support:.26}
};

function normalizedRolePriors(champ){
  const explicit=enemyRolePriors[champ];
  if(explicit){
    const out={top:.003,jungle:.003,mid:.003,adc:.003,support:.003,...explicit};
    const sum=roles.reduce((n,r)=>n+(out[r]||0),0);
    roles.forEach(r=>out[r]=(out[r]||0)/sum);
    return out;
  }

  const found=roles.filter(r=>roleHints[r]&&roleHints[r].has(champ));
  const out={top:.006,jungle:.006,mid:.006,adc:.006,support:.006};
  if(found.length===1){
    out[found[0]]=.976;
  }else if(found.length>1){
    const each=.97/found.length;
    found.forEach(r=>out[r]=each);
  }else{
    roles.forEach(r=>out[r]=.20);
  }
  const sum=roles.reduce((n,r)=>n+out[r],0);
  roles.forEach(r=>out[r]/=sum);
  return out;
}

let enemyInferenceCache={key:null,value:null};
function enemyInferenceKey(){
  return enemies().map(p=>p.champ+"@"+(p.role||"unknown")).join("|");
}

function inferEnemyRoles(){
  const picks=enemies();
  if(!picks.length)return {map:{},byChamp:{},assignments:[]};
  const cacheKey=enemyInferenceKey();
  if(enemyInferenceCache.key===cacheKey&&enemyInferenceCache.value)return enemyInferenceCache.value;

  const probs=picks.map(p=>{
    if(p.role&&p.role!=="unknown"){
      const hard={top:.000001,jungle:.000001,mid:.000001,adc:.000001,support:.000001};
      hard[p.role]=1;
      return hard;
    }
    return normalizedRolePriors(p.champ);
  });

  const assignments=[];
  const allowedRoles=probs.map(pr=>{
    const ranked=roles.map(r=>({r,p:pr[r]||0})).sort((a,b)=>b.p-a.p);
    if(ranked[0]?.p>=.97&&ranked[1]?.p<.02)return [ranked[0].r];
    return ranked.filter(x=>x.p>=.06).map(x=>x.r);
  });
  function walk(i,used,current,score,relaxed=false){
    if(i>=picks.length){
      assignments.push({roles:[...current],score});
      return;
    }
    const candidates=relaxed?roles:(allowedRoles[i].length?allowedRoles[i]:roles);
    for(const role of candidates){
      if(used.has(role))continue;
      const p=Math.max(.000001,probs[i][role]||.000001);
      used.add(role);current.push(role);
      walk(i+1,used,current,score+Math.log(p),relaxed);
      current.pop();used.delete(role);
    }
  }
  walk(0,new Set(),[],0,false);
  if(!assignments.length)walk(0,new Set(),[],0,true);
  assignments.sort((a,b)=>b.score-a.score);
  const best=assignments[0]||{roles:[],score:0};

  // Soft marginals: confidence can change as later picks constrain the whole composition.
  const marginals=picks.map(()=>Object.fromEntries(roles.map(r=>[r,0])));
  let totalWeight=0;
  for(const a of assignments){
    const w=Math.exp(Math.max(-25,a.score-best.score));
    totalWeight+=w;
    a.roles.forEach((r,i)=>marginals[i][r]+=w);
  }
  if(totalWeight){
    marginals.forEach(m=>roles.forEach(r=>m[r]/=totalWeight));
  }

  const map={},byChamp={};
  picks.forEach((p,i)=>{
    const role=best.roles[i]||"unknown";
    if(role!=="unknown")map[role]=p.champ;
    const ranked=roles.map(r=>({role:r,p:marginals[i][r]||0})).sort((a,b)=>b.p-a.p);
    byChamp[p.champ]={
      role,
      confidence:marginals[i][role]||0,
      alternatives:ranked.filter(x=>x.role!==role).slice(0,2),
      explicit:!!(p.role&&p.role!=="unknown")
    };
  });
  const result={map,byChamp,assignments};
  enemyInferenceCache={key:cacheKey,value:result};
  return result;
}

function enemyRoleCandidates(champ){
  const inf=inferEnemyRoles().byChamp[champ];
  if(inf){
    const candidates=[{role:inf.role,p:inf.confidence},...inf.alternatives]
      .filter(x=>x.role&&x.role!=="unknown"&&x.p>=.08)
      .map(x=>x.role);
    if(candidates.length)return [...new Set(candidates)];
    if(inf.role&&inf.role!=="unknown")return [inf.role];
  }
  const priors=normalizedRolePriors(champ);
  return roles.filter(r=>priors[r]>=.08);
}

function enemyRoleMap(){
  return inferEnemyRoles().map;
}
function enemyRoleShown(role){
  const inferred=inferEnemyRoles();
  const champion=inferred.map[role],evidence=inferred.byChamp[champion];
  return !!evidence&&(evidence.explicit||evidence.confidence>=0.8);
}

let enemyProfileCache={key:null,value:null};
function enemyProfile(){
  const key=enemyInferenceKey();
  if(enemyProfileCache.key===key&&enemyProfileCache.value)return enemyProfileCache.value;
  const enemy=enemies();
  const value={
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
  enemyProfileCache={key,value};
  return value;
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
  // A tied/open comp is not evidence to force its core picks.
  const anchorWeight=({öppen:0.25,låg:0.4,medel:0.7,hög:1})[compConfidence()]||0.25;
  if(c.core[role]===champ)add(18*anchorWeight,"core i "+compName);
  else if((c.alts[role]||[]).includes(champ))add(9*anchorWeight,"passar "+compName);

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
    if(["Udyr","Wukong","Lillia","Mordekaiser","Maokai"].includes(champ))add(6,"stark i melee-fights");
  }
  if(p.poke>=2){
    if(traits.engage.has(champ)||smartTraits.pick.has(champ))add(10,"ger access mot poke");
  }
  if(p.tanks>=2&&smartTraits.antiTank.has(champ))add(15,"anti-tank");
  if(p.hyper>=1&&p.enchanter>=1&&(traits.engage.has(champ)||smartTraits.pick.has(champ)))add(12,"kan nå hypercarry");
  if(p.immobile>=1&&smartTraits.pick.has(champ))add(6,"straffar immobile carry");

  if(role==="jungle"&&p.scalingJungle&&traits.earlyJungle.has(champ))add(9,"kan pressa scaling-jungle");
  if(role==="jungle"&&p.earlyJungle&&["Xin Zhao","Volibear","Udyr","Jarvan IV"].includes(champ))add(6,"stabil tidig 2v2");
  if(role==="jungle"&&champ==="Lillia"&&p.melee>=2)add(7,"Lillia kitar melee");
  if(role==="jungle"&&champ==="Lillia"&&p.tanks>=1)add(6,"%HP + sustained mot frontline");
  if(role==="jungle"&&["Lillia","Graves","Kindred","Viego"].includes(champ)){
    if(need.front===0&&ours().length>=2){
      s-=7;
      reasons.push({pts:-7,label:"behöver frontline från annan roll"});
    }else if(need.front>0&&need.engage>0){
      add(6,"laget enablear carry-jungle");
    }
    if(need.engage===0&&ours().length>=3){
      s-=4;
      reasons.push({pts:-4,label:"lite setup för carry-jungle"});
    }
  }

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
  if(enemyRoleShown(role)){
    add(role==="top"||role==="mid"?7:4,"rollen är visad");
  }else if(ours().length<3){
    if(roleBlindSafety[role]?.has(champ))add(6,"säker blind");
    else if((role==="top"||role==="mid")&&smartTraits.counterSensitive.has(champ)){s-=6;reasons.push({pts:-6,label:"counterkänslig blind"});}
  }

  const riotStat=window.RiftStats?.scoreChampion({
    champ,
    role,
    enemies:enemies().map(e=>e.champ),
    allies:ours().map(e=>e.champ)
  });
  if(riotStat?.available){
    s+=riotStat.points;
    if(Math.abs(riotStat.points)>=1.5){
      reasons.push({pts:riotStat.points,label:"LoLalytics "+(riotStat.points>=0?"+":"")+riotStat.points.toFixed(1)});
    }
    for(const rr of (riotStat.reasons||[]).slice(0,2)){
      reasons.push({pts:Math.max(1,Math.abs(riotStat.points)/2),label:rr});
    }
  }


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
  const t=current(),box=$("recommendationBox"),breakdown=$("scoreBreakdown");
  if(!t||t.side!==userSide){box.classList.add("hidden");if(breakdown)breakdown.innerHTML="";return}

  if(t.type==="ban"){
    const bans=banRecommendations();box.classList.remove("hidden");
    $("recommendEyebrow").textContent="BANFÖRSLAG";$("recommendRole").textContent="BAN:";
    $("recommendPicks").innerHTML=bans.map(ch=>'<button type="button" class="champ-suggestion" data-suggest-champ="'+encodeURIComponent(ch)+'">'+ch+'</button>').join("");
    $("recommendReason").textContent="Klicka ett namn för att fylla i direkt. Hot mot er comp + deny-synergy + phase-2 rollvärde.";
    if(breakdown)breakdown.innerHTML="";
    return;
  }

  const autoRole=recommendedNextRole();
  const role=selectedRole||autoRole;
  if(!role){box.classList.add("hidden");if(breakdown)breakdown.innerHTML="";return}
  const details=topRecommendationDetails(role);
  box.classList.remove("hidden");
  $("recommendEyebrow").textContent=selectedRole?"PICKFÖRSLAG":"REKOMMENDERAD NÄSTA ROLL";
  $("recommendRole").textContent=roleNames[role]+":";
  $("recommendPicks").innerHTML=details.length
    ?details.map(x=>'<button type="button" class="champ-suggestion" data-suggest-champ="'+encodeURIComponent(x.ch)+'" data-suggest-role="'+role+'">'+x.ch+' <span>'+Math.round(x.score)+'</span></button>').join("")
    :"Inga tillgängliga picks i team-poolen";
  const top=details[0];
  const why=top?top.reasons.filter(x=>x.pts>0).slice(0,3).map(x=>x.label).join(" · "):"";
  $("recommendReason").textContent=(selectedRole?"Manuellt vald roll. ":"Draft Brain väljer även roll. ")+"Riktning: "+desiredComp()+" · confidence "+compConfidence()+(why?" · "+top.ch+": "+why:"");
  if(breakdown){
    breakdown.innerHTML=details.map(x=>{
      const r=x.reasons.slice(0,3).map(y=>y.label).join(" · ")||"comfort + draft fit";
      return '<div class="score-row"><button type="button" class="score-champ-btn" data-suggest-champ="'+encodeURIComponent(x.ch)+'" data-suggest-role="'+role+'">'+x.ch+'</button><span class="score-num">'+Math.round(x.score)+'</span><span class="score-why">'+r+'</span></div>';
    }).join("");
  }
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
  const map=ownRoleMap();
  if(!map.jungle)return "Låses när er jungle är pickad.";
  const p=jungleAutoPlan();
  return p.focus+". "+p.reason;
}


const mobilityThreats=new Set(["Ahri","Akali","Ambessa","Camille","Ezreal","Fiora","Fizz","Kassadin","Katarina","LeBlanc","Lucian","Rakan","Tristana","Vayne","Yone","Zed"]);
const backlineAccess=new Set(["Ahri","Annie","Jarvan IV","Leona","Malphite","Maokai","Nautilus","Nocturne","Vi","Vex","Wukong"]);
const sustainedDamage=new Set(["Aphelios","Cassiopeia","Graves","Jinx","Kindred","Kog'Maw","Lillia","Master Yi","Tristana","Varus","Vayne","Viego","Viktor","Xayah","Yunara","Zeri"]);
const strongPeelSet=new Set(["Alistar","Braum","Galio","Janna","Lulu","Maokai","Milio","Nami","Nautilus","Poppy","Rakan","Renata Glasc","Shen","Tahm Kench","Thresh","Xayah"]);
const reliableEngageSet=new Set(["Alistar","Amumu","Annie","Ashe","Galio","Jarvan IV","Leona","Malphite","Maokai","Nautilus","Nocturne","Rakan","Rell","Sejuani","Vi","Vex","Wukong"]);
const highWaveclearSet=new Set(["Anivia","Azir","Hwei","Jinx","Orianna","Sivir","Smolder","Taliyah","Tristana","Varus","Veigar","Vex","Viktor","Xayah","Ziggs"]);
const rangedSet=new Set(["Ahri","Anivia","Annie","Aphelios","Ashe","Azir","Caitlyn","Ezreal","Graves","Heimerdinger","Hwei","Jhin","Jinx","Kai'Sa","Kindred","Kog'Maw","Lucian","Senna","Sivir","Smolder","Taliyah","Tristana","Varus","Vayne","Vex","Viktor","Xayah","Yunara","Zeri"]);

function lanePrioUnit(ally,enemy){
  if(!ally)return {score:0,label:"okänd"};
  let s=0;
  if(smartTraits.lanePressure.has(ally))s+=2;
  if(powerCurve.earlyHeavy.has(ally))s+=1.5;
  if(powerCurve.hardScale.has(ally))s-=1;
  if(rangedSet.has(ally))s+=.5;
  if(enemy){
    if(smartTraits.lanePressure.has(enemy))s-=1.5;
    if(powerCurve.earlyHeavy.has(enemy))s-=1;
    if(powerCurve.hardScale.has(enemy))s+=.6;
    if(rangedSet.has(enemy)&&!rangedSet.has(ally))s-=.5;
  }
  return {score:s,label:s>=1.5?"PRIO":s<=-1.2?"SVAG":"JÄMN"};
}

function laneRead(){
  const own=ownRoleMap(), enemy=enemyRoleMap();
  const top=lanePrioUnit(own.top,enemy.top);
  const mid=lanePrioUnit(own.mid,enemy.mid);
  let botScore=0;
  if(own.adc||own.support){
    botScore+=(smartTraits.lanePressure.has(own.adc)?1.3:0)+(traits.engage.has(own.support)?1.2:0)+(rangedSet.has(own.adc)?0.4:0);
    botScore-=(enemy.adc&&smartTraits.lanePressure.has(enemy.adc)?1.0:0)-(enemy.support&&traits.enchanter.has(enemy.support)?-.2:0);
    if(enemy.support&&traits.disengage.has(enemy.support))botScore-=.8;
    if(powerCurve.hardScale.has(own.adc))botScore-=.4;
  }
  const bot={score:botScore,label:botScore>=1.6?"PRIO":botScore<=-.9?"SVAG":"JÄMN"};
  return {top,mid,bot};
}

function draftRiskEngine(){
  const n=currentNeeds(), p=enemyProfile(), own=ours(), enemy=enemies();
  const risks=[];
  const access=own.filter(e=>backlineAccess.has(e.champ)).length;
  const sustained=own.filter(e=>sustainedDamage.has(e.champ)).length;
  const range=own.filter(e=>rangedSet.has(e.champ)).length;
  const peel=own.filter(e=>strongPeelSet.has(e.champ)).length;
  const engage=own.filter(e=>reliableEngageSet.has(e.champ)).length;
  const wave=own.filter(e=>highWaveclearSet.has(e.champ)).length;

  const add=(severity,text)=>risks.push({severity,text});
  if(own.length>=3&&n.front===0)add(3,"Ingen riktig frontline ännu.");
  if(own.length>=3&&engage===0)add(3,"Ingen pålitlig fight-start.");
  if(p.dive>=2&&peel===0&&own.length>=3)add(3,"Enemy har dive men ni saknar tydlig peel.");
  if(p.hyper>=1&&p.enchanter>=1&&access===0&&own.length>=3)add(3,"Hypercarry + enchanter och ni saknar backline access.");
  if(p.tanks>=2&&sustained===0&&n.antiTank===0&&own.length>=3)add(3,"2+ tanks men låg sustained/anti-tank damage.");
  if(own.length>=4&&n.ad>=4&&n.ap===0)add(3,"Nästan full AD — enemy kan stacka armor.");
  if(own.length>=4&&n.ap>=4&&n.ad===0)add(3,"Nästan full AP — enemy kan stacka MR.");
  if(enemy.length>=3&&p.poke>=2&&engage===0)add(2,"Enemy poke; ni behöver access/engage.");
  if(own.length>=4&&range<=1)add(2,"Väldigt kort range; svårt att spela långsamma front-to-back fights.");
  if(own.length>=4&&wave===0)add(2,"Låg waveclear kan göra siege/defense jobbigt.");
  if(p.split>=1&&!own.some(e=>traits.splitpush.has(e.champ)||["Shen","Mordekaiser","Trundle","Garen","Yorick"].includes(e.champ)))add(2,"Enemy sidelane kan kräva tydlig side-assign.");
  if(!risks.length&&own.length>=2)add(1,"Inga stora strukturella problem just nu.");
  risks.sort((a,b)=>b.severity-a.severity);
  return risks;
}

function jungleAutoPlan(){
  const map=ownRoleMap(), enemy=enemyRoleMap(), lr=laneRead();
  if(!map.jungle)return {focus:"Väntar på er jungle.",first:"—",reason:""};
  const lanes=[
    {name:"TOP",score:lr.top.score+(laneSetupScore(map.top)||0)*.7,target:map.top},
    {name:"MID",score:lr.mid.score+(laneSetupScore(map.mid)||0)*.7,target:map.mid},
    {name:"BOT",score:lr.bot.score+((laneSetupScore(map.adc)||0)+(laneSetupScore(map.support)||0))*.55,target:(map.adc||"")+"+"+(map.support||"")}
  ].sort((a,b)=>b.score-a.score);
  const best=lanes[0];
  let focus;
  if(best.score>=2.4)focus="PATHA MOT "+best.name;
  else if(lanes.every(x=>x.score<.5))focus="FULLCLEAR / REAGERA";
  else focus="FLEXA MOT "+best.name;

  let reason=best.name+" har bäst kombination av prio + setup.";
  if(enemy.jungle&&traits.earlyJungle.has(enemy.jungle))reason+=" Tracka "+enemy.jungle+" och undvik river utan lane-move.";
  else if(enemy.jungle&&traits.scalingJungle.has(enemy.jungle))reason+=" Ni kan trycka tempo före "+enemy.jungle+" skalar.";
  return {focus,first:best.name,reason};
}

function objectiveAutoPlan(){
  const lr=laneRead(), map=ownRoleMap(), enemy=enemyRoleMap();
  const botSide=lr.bot.score+lr.mid.score*.65;
  const topSide=lr.top.score+lr.mid.score*.65;
  let call,detail;
  if(botSide>=1.8&&botSide>topSide+.5){
    call="BOTSIDE NEUTRAL";
    detail="Mid/bot ser bäst ut för första setupen. Ta vision med prio; forcea bara om lanes kan flytta.";
  }else if(topSide>=1.8&&topSide>botSide+.5){
    call="TOPSIDE NEUTRAL";
    detail="Top/mid ger bäst första setup. Spela för topside tempo och tradea hellre än coinflippa botside.";
  }else if(botSide<0&&topSide<0){
    call="TRADEA FÖRSTA";
    detail="Låg sannolik prio runt båda sidor. Cross-map/camps/waves är bättre än blind contest.";
  }else{
    call="PRIO AVGÖR";
    detail="Ingen sida är självklar i draften. Låt första waves avgöra och gå till sidan som faktiskt har move.";
  }
  if(map.jungle&&["Udyr","Volibear","Xin Zhao"].includes(map.jungle))detail+=" Er jungle kan spela aktivt runt första neutrala.";
  if(enemy.jungle&&traits.earlyJungle.has(enemy.jungle))detail+=" Respektera enemy jungle tidigt.";
  return {call,detail};
}

function counterpickAutoRead(){
  const own=ownRoleMap(), enemy=enemyRoleMap();
  const open=roles.filter(r=>!own[r]);
  if(!open.length)return "Alla roller låsta.";
  if(open.includes("top")&&!enemy.top)return "SPARA TOP om möjligt — enemy top är fortfarande dold.";
  if(open.includes("mid")&&!enemy.mid)return "SPARA MID om möjligt — enemy mid är fortfarande flexibel/dold.";
  const shown=open.filter(r=>enemy[r]);
  if(shown.length)return "Bra läge att låsa "+roleNames[shown[0]]+" — enemy-roll är redan visad.";
  const scarce=open.map(r=>({r,n:(teamPool[r]||[]).filter(ch=>!unavailable().has(ch.toLowerCase())).length})).sort((a,b)=>a.n-b.n)[0];
  if(scarce&&scarce.n<=3)return "LÅS "+roleNames[scarce.r]+" snart — poolen börjar bli pressad.";
  return "Behåll solo-lane countervärde och ta flexibel/robust pick först.";
}

function fightJobs(){
  const own=ownRoleMap(), enemy=enemies();
  const starter=ours().find(e=>reliableEngageSet.has(e.champ));
  const peel=ours().find(e=>strongPeelSet.has(e.champ)&&(!starter||e.champ!==starter.champ));
  const carry=ours().find(e=>traits.hyperCarry.has(e.champ))||ours().find(e=>sustainedDamage.has(e.champ));
  const target=enemy.find(e=>traits.hyperCarry.has(e.champ))||enemy.find(e=>traits.immobileCarry.has(e.champ));
  const jobs=[];
  if(starter)jobs.push(starter.champ+" startar");
  if(peel)jobs.push(peel.champ+" sparar peel");
  if(carry)jobs.push(carry.champ+" följer/cleanar");
  if(target)jobs.push("target: "+target.champ);
  return jobs.join(" → ")||"Bestäm en starter och en carry innan fighten.";
}

function executionRead(){
  const comp=desiredComp(), own=ours(), n=currentNeeds();
  let score=0, reasons=[];
  if(comp==="PRESS R"){score-=2;reasons.push("tydlig engage");}
  if(comp==="EARLY SKIRMISH"){score+=1;reasons.push("kräver tempo/prio");}
  if(comp==="OBJECTIVE CONTROL"){score+=1;reasons.push("setup/disciplin");}
  if(comp==="JUNGLE CARRY"){score+=3;reasons.push("resurs- och tempo-beroende");}
  const engageCount=own.filter(e=>reliableEngageSet.has(e.champ)).length;
  if(engageCount>=2){score-=1;reasons.push("flera GO-knappar");}
  if(own.length>=4&&engageCount===0){score+=2;reasons.push("otydlig start");}
  if(n.front===0&&own.length>=4){score+=1;reasons.push("svårare spacing");}
  if(own.filter(e=>mobilityThreats.has(e.champ)).length>=2){score+=1;reasons.push("mer mekanik");}
  const label=score<=-1?"LÄTT":score<=2?"MEDEL":"SVÅR";
  return {label,detail:reasons.slice(0,3).join(" · ")||"normal execution"};
}

function nextPickNeed(){
  const n=currentNeeds(), p=enemyProfile(), own=ours();
  if(own.length<2)return "Bygg först en flexibel kärna.";
  const needs=[];
  if(n.front===0)needs.push({p:10,t:"FRONTLINE"});
  if(n.engage===0)needs.push({p:9,t:"ENGAGE"});
  if(n.ad>=2&&n.ap===0)needs.push({p:10,t:"AP DAMAGE"});
  if(n.ap>=2&&n.ad===0)needs.push({p:8,t:"AD DAMAGE"});
  if(p.dive>=2&&n.peel===0)needs.push({p:9,t:"PEEL"});
  if(p.tanks>=2&&n.antiTank===0)needs.push({p:9,t:"ANTI-TANK"});
  if(n.ranged===0&&own.length>=3)needs.push({p:6,t:"RANGE"});
  if(n.wave===0&&own.length>=3)needs.push({p:5,t:"WAVECLEAR"});
  if(n.dmg<2&&own.length>=3)needs.push({p:8,t:"SECOND DAMAGE THREAT"});
  needs.sort((a,b)=>b.p-a.p);
  if(!needs.length)return "Ingen akut lucka — välj bästa comp-fit/counter.";
  return needs.slice(0,2).map(x=>x.t).join(" + ");
}


function matchupClamp(n,min=0,max=100){return Math.max(min,Math.min(max,n))}
function matchupCount(list,set){return list.filter(e=>set.has(e.champ)).length}
function matchupLabel(score){
  if(score>=68)return "MYCKET BRA";
  if(score>=58)return "BRA";
  if(score>=47)return "JÄMNT";
  if(score>=38)return "SVÅRT";
  return "MYCKET SVÅRT";
}
function matchupConfidence(){
  const a=ours().length,b=enemies().length,total=a+b;
  if(a===5&&b===5)return "HÖG";
  if(a>=3&&b>=3)return "MEDEL";
  if(total>=4&&a>=1&&b>=1)return "LÅG";
  return "TIDIG READ";
}
function draftMatchupAnalysis(){
  const own=ours(), enemy=enemies();
  if(!own.length||!enemy.length){
    return {
      available:false,score:null,label:"VÄNTAR",counterValue:null,confidence:"TIDIG READ",
      why:["Behöver picks från båda lagen innan comp-vs-comp kan bedömas."],risks:[],dimensions:{}
    };
  }

  const ownEngage=matchupCount(own,traits.engage);
  const enemyEngage=matchupCount(enemy,traits.engage);
  const ownDive=matchupCount(own,traits.dive);
  const enemyDive=matchupCount(enemy,traits.dive);
  const ownDis=matchupCount(own,traits.disengage);
  const enemyDis=matchupCount(enemy,traits.disengage);
  const ownPeel=matchupCount(own,smartTraits.peel);
  const enemyPeel=matchupCount(enemy,smartTraits.peel);
  const ownFront=matchupCount(own,traits.frontline);
  const enemyFront=matchupCount(enemy,traits.frontline);
  const ownRange=matchupCount(own,smartTraits.rangedDamage)+matchupCount(own,traits.poke)*.6;
  const enemyRange=matchupCount(enemy,smartTraits.rangedDamage)+matchupCount(enemy,traits.poke)*.6;
  const ownAnti=matchupCount(own,smartTraits.antiTank);
  const enemyAnti=matchupCount(enemy,smartTraits.antiTank);
  const ownObj=matchupCount(own,smartTraits.objective)+matchupCount(own,smartTraits.zone)*.55;
  const enemyObj=matchupCount(enemy,smartTraits.objective)+matchupCount(enemy,smartTraits.zone)*.55;
  const ownPick=matchupCount(own,smartTraits.pick);
  const enemyImmobile=matchupCount(enemy,traits.immobileCarry);
  const enemyHyper=matchupCount(enemy,traits.hyperCarry);
  const enemyTanks=enemy.filter(e=>hasSmartTrait(e.champ,traits.tanks,"Tank")).length;
  const ownTanks=own.filter(e=>hasSmartTrait(e.champ,traits.tanks,"Tank")).length;
  const enemyMelee=matchupCount(enemy,traits.melee);
  const ownZone=matchupCount(own,smartTraits.zone);

  const access=matchupClamp(50+(ownEngage+ownDive+ownPick)*6-(enemyDis+enemyPeel)*5+(enemyImmobile+enemyHyper)*3,15,90);
  const antiDive=matchupClamp(50+(ownPeel+ownDis)*11-enemyDive*9,15,90);
  const range=matchupClamp(50+(ownRange-enemyRange)*8,15,90);
  const frontline=matchupClamp(50+(ownFront-enemyFront)*8+ownTanks*2-enemyAnti*3,15,90);
  const antiTank=matchupClamp(50+ownAnti*11-enemyTanks*9,15,90);
  const objective=matchupClamp(50+(ownObj-enemyObj)*7+(ownZone-(matchupCount(enemy,smartTraits.zone)))*3,15,90);

  const ownCurve=teamCurve(own), enemyCurve=teamCurve(enemy);
  const early=matchupClamp(50+(ownCurve.early-enemyCurve.early)*18,20,85);
  const scaling=matchupClamp(50+(ownCurve.late-enemyCurve.late)*18,20,85);

  let pairCounter=0;
  const roleMap=ownRoleMap();
  for(const [role,champ] of Object.entries(roleMap)){
    specificRules.forEach(rule=>{
      if(rule.role===role&&rule.enemy.some(x=>hasEnemy(x)))pairCounter+=rule.boost[champ]||0;
    });
  }
  let metaCounter=0;
  own.forEach(e=>{
    const stat=window.RiftStats?.scoreChampion?.({champ:e.champ,role:e.role,enemies:enemy.map(x=>x.champ),allies:own.map(x=>x.champ)});
    (stat?.reasons||[]).forEach(r=>{
      if(String(r).startsWith("statstarkt mot "))metaCounter+=2;
      if(String(r).startsWith("statssvagt mot "))metaCounter-=2;
    });
  });
  const explicitCounter=matchupClamp(50+Math.min(18,pairCounter*.45)+metaCounter,20,88);

  const n=currentNeeds();
  let structure=50;
  if(n.front>0)structure+=7; else if(own.length>=4)structure-=10;
  if(n.engage>0)structure+=7; else if(own.length>=4)structure-=9;
  if(n.dmg>=2)structure+=6; else if(own.length>=4)structure-=7;
  if(n.ad>=2&&n.ap===0)structure-=5;
  if(n.ap>=2&&n.ad===0)structure-=5;
  structure=matchupClamp(structure,25,80);

  const counterValue=Math.round(
    access*.23+antiDive*.20+range*.13+antiTank*.17+explicitCounter*.27
  );
  const score=Math.round(matchupClamp(
    counterValue*.52+objective*.13+frontline*.10+early*.08+scaling*.07+structure*.10,
    20,85
  ));

  const positives=[],risks=[];
  const addPos=(cond,text)=>{if(cond)positives.push(text)};
  const addRisk=(cond,text)=>{if(cond)risks.push(text)};

  addPos(enemyDive>=2&&ownPeel+ownDis>=2,"Bra anti-dive: vår peel/disengage matchar deras commit.");
  addRisk(enemyDive>=2&&ownPeel+ownDis===0,"Deras dive har få tydliga svar i vår draft.");
  addPos(enemyTanks>=2&&ownAnti>=1,"Vi har anti-tank/sustained svar mot deras frontline.");
  addRisk(enemyTanks>=2&&ownAnti===0,"Deras frontline kan bli svår att döda i lång fight.");
  addPos((enemyImmobile+enemyHyper)>=1&&(ownEngage+ownDive+ownPick)>=2,"Bra carry access mot deras viktiga backline.");
  addRisk((enemyImmobile+enemyHyper)>=1&&(ownEngage+ownDive+ownPick)===0,"Vi saknar tydlig access på deras carry.");
  addPos(enemyMelee>=3&&ownZone>=2,"Deras korta range går in i vår zone/control.");
  addPos(range>=62,"Vi har tydlig range-fördel i setup.");
  addRisk(range<=38,"De outrangar oss; vi behöver flank/hård engage.");
  addPos(objective>=62,"Objective setup/chokes lutar åt oss.");
  addRisk(objective<=38,"Deras objective setup ser starkare ut än vår.");
  addPos(explicitCounter>=62,"Direkt champion-countervalue lutar åt oss.");
  addRisk(explicitCounter<=38,"Flera direkta championinteraktioner lutar åt enemy.");
  addPos(early>=62,"Vår draft har bättre tidigt tempo/skirmishprofil.");
  addRisk(scaling<=38,"De har tydligare late scaling om matchen drar ut.");
  addPos(scaling>=62,"Vi har bättre scaling-fallback.");
  addRisk(structure<=40,"Vår egen compstruktur har fortfarande en tydlig lucka.");

  if(!positives.length)positives.push("Ingen massiv counteredge ännu; matchupen avgörs mer av execution och lane state.");
  if(!risks.length)risks.push("Ingen enskild matchup-risk sticker ut just nu.");

  return {
    available:true,
    score,
    label:matchupLabel(score),
    counterValue,
    confidence:matchupConfidence(),
    why:positives.slice(0,3),
    risks:risks.slice(0,3),
    dimensions:{
      access:Math.round(access),
      antiDive:Math.round(antiDive),
      range:Math.round(range),
      frontline:Math.round(frontline),
      antiTank:Math.round(antiTank),
      objective:Math.round(objective),
      early:Math.round(early),
      scaling:Math.round(scaling),
      explicitCounter:Math.round(explicitCounter)
    }
  };
}

function renderDraftMatchup(){
  const card=$("draftMatchupCard");
  if(!card)return;
  const m=draftMatchupAnalysis();
  card.classList.remove("hidden");
  const badge=$("matchupBadge");
  badge.className="badge matchup-badge "+(m.score>=58?"good":m.score!=null&&m.score<47?"bad":"even");
  badge.textContent=m.available?m.label:"VÄNTAR";
  $("matchupScore").textContent=m.available?m.score+"/100":"—";
  $("matchupScoreCaption").textContent="Draft matchup score · inte win probability";
  $("matchupConfidence").textContent=m.confidence;
  $("matchupCounterValue").textContent=m.counterValue!=null?m.counterValue+"/100":"—";

  const dims=[
    ["CARRY ACCESS","access"],["ANTI-DIVE","antiDive"],["RANGE","range"],
    ["FRONTLINE","frontline"],["ANTI-TANK","antiTank"],["OBJECTIVE","objective"],
    ["EARLY","early"],["SCALING","scaling"]
  ];
  $("matchupDimensions").innerHTML=dims.map(([name,key])=>{
    const val=m.dimensions[key];
    const cls=val>=60?"good":val<45?"bad":"even";
    return '<div class="matchup-dim '+cls+'"><span>'+name+'</span><strong>'+(val??"—")+'</strong><i><b style="width:'+(val??0)+'%"></b></i></div>';
  }).join("");

  $("matchupWhy").textContent=m.why.join(" ");
  $("matchupRisk").textContent=m.risks.join(" ");
}

function renderAutoRead(){
  const risks=draftRiskEngine(), top=risks[0], lr=laneRead(), jg=jungleAutoPlan();
  const badge=$("autoRiskBadge");
  if(!badge)return;
  const sev=top?.severity||1;
  badge.className="badge "+(sev>=3?"high":sev===2?"medium":"low");
  badge.textContent=sev>=3?"HÖG RISK":sev===2?"WATCH":"STABIL";
  $("autoRisk").textContent=top?.text||"För få picks ännu.";
  $("autoPrio").textContent="TOP "+lr.top.label+" · MID "+lr.mid.label+" · BOT "+lr.bot.label;
  $("autoJungle").textContent=jg.focus+(jg.reason?" — "+jg.reason:"");
  $("autoDraftOrder").textContent=counterpickAutoRead();
  const obj=objectiveAutoPlan(), exec=executionRead();
  $("autoObjective").textContent=obj.call+" — "+obj.detail;
  $("autoExecution").textContent=exec.label+" — "+exec.detail;
  $("autoNextNeed").textContent=nextPickNeed();
  $("autoReadTitle").textContent=ours().length<2?"Draften läses automatiskt":"AUTO: "+desiredComp()+" · "+compConfidence()+" confidence";
}

function renderStatsStatus(){
  const status=window.RiftStats?.getStatus?.();
  const el=$("statsStatus");
  if(!el||!status)return;
  el.className="stats-status";
  if(status.hasData){
    el.classList.add("live");
    const confidence=String(status.confidence||"").toUpperCase();
    const fallback=status.fallback?" · FALLBACK":"";
    el.textContent=status.source+" · data "+(status.metaPatch||"?")+" · "+confidence+fallback;
    el.title=(status.bracket||"Gold+")+" · "+(status.region||"")+" · "+status.coverage+" pool-picks · "+(status.blendText||"")+" · snapshot "+(status.updated||"");
  }else if(status.state==="loading"){
    el.classList.add("waiting");el.textContent="Laddar…";
  }else{
    el.classList.add("waiting");el.textContent="Meta snapshot offline";
  }
}

document.addEventListener("riftstats:change",()=>{
  renderStatsStatus();
  if(userSide)render();
});

loadChampionRoster();
restoreState();
renderStatsStatus();
if(userSide)render();


window.RiftChampionPicker?.attach({inputId:"championInput",roster:()=>championRoster,
  used:unavailable,rolesFor:ch=>enemyRoleCandidates(ch),
  imageFor:ch=>championMeta[ch]?.image,
  onSelect:(champ,role)=>{
    $("lockBtn").textContent="Lås "+champ;
    if(current()?.type==="pick"&&role){selectedRole=role;renderTurn();renderRecommendation();}
  }});
