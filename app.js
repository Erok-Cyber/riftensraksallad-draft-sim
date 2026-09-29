const fallbackChampions = [
"Aatrox","Ahri","Akali","Alistar","Ambessa","Amumu","Anivia","Annie","Aphelios","Ashe","Aurora","Azir","Braum","Caitlyn","Camille","Cassiopeia","Darius","Ezreal","Fiora","Galio","Garen","Gnar","Gragas","Graves","Heimerdinger","Hwei","Ivern","Janna","Jarvan IV","Jax","Jayce","Jinx","K'Sante","Kai'Sa","Kalista","Kayle","Kayn","Kennen","Kindred","Lee Sin","Leona","Lillia","Lucian","Lulu","Malphite","Maokai","Milio","Miss Fortune","Mordekaiser","Nami","Nautilus","Nocturne","Olaf","Orianna","Ornn","Poppy","Rakan","Rell","Renekton","Rumble","Ryze","Samira","Sejuani","Senna","Shen","Sion","Sivir","Skarner","Smolder","Sylas","Syndra","Tahm Kench","Taliyah","Tristana","Trundle","Tryndamere","Twisted Fate","Udyr","Varus","Vex","Vi","Viego","Viktor","Volibear","Wukong","Xayah","Xin Zhao","Yone","Yunara","Zac","Zeri"
].sort();
let champions=[...fallbackChampions];

async function loadChampionRoster(){
  try{
    const versions=await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r=>r.json());
    const data=await fetch("https://ddragon.leagueoflegends.com/cdn/"+versions[0]+"/data/en_US/champion.json").then(r=>r.json());
    champions=Object.values(data.data).map(c=>c.name).sort((a,b)=>a.localeCompare(b));
    const list=document.getElementById("champions");
    list.innerHTML="";
    champions.forEach(c=>{const o=document.createElement("option");o.value=c;list.appendChild(o)});
  }catch(e){
    console.warn("Data Dragon roster fallback används.",e);
  }
}

const order = [
{side:"blue",slot:"B1"},{side:"red",slot:"R1"},{side:"red",slot:"R2"},
{side:"blue",slot:"B2"},{side:"blue",slot:"B3"},
{side:"red",slot:"R3"},{side:"red",slot:"R4"},
{side:"blue",slot:"B4"},{side:"blue",slot:"B5"},{side:"red",slot:"R5"}
];

const comps = {
  "EARLY SKIRMISH":{
    core:["Renekton","Xin Zhao","Ahri","Ashe","Nautilus"],
    alts:["Darius","Mordekaiser","Olaf","Trundle","Viego","Wukong","Volibear","Taliyah","Vex","Sylas","Varus","Xayah","Leona","Maokai"],
    why:"Prio + starka 2v2/3v3. Vill fightas tidigt och spela för första objectives.",
    focus:"Prio först. Fighta inte river om lanes sitter fast under tower.",
    call:"PRIO → FIGHT → OBJECTIVE. Chasa inte nästa kill."
  },
  "PRESS R":{
    core:["Malphite","Jarvan IV","Annie","Jinx","Leona"],
    alts:["Galio","Mordekaiser","Shen","Sion","Xin Zhao","Vi","Wukong","Viego","Vex","Hwei","Taliyah","Viktor","Ashe","Xayah","Nautilus","Maokai"],
    why:"Enkel 5v5. Flera tydliga GO-knappar och bra chain CC.",
    focus:"Håll engage-cooldowns. Carry ska inte starta fighten.",
    call:"HITTA CARRY → PRESS R → CHAIN CC → RESET."
  },
  "OBJECTIVE CONTROL":{
    core:["Mordekaiser","Udyr","Taliyah","Varus","Maokai"],
    alts:["Sion","Shen","Galio","Heimerdinger","Volibear","Xin Zhao","Lillia","Hwei","Ahri","Viktor","Anivia","Ashe","Xayah","Nautilus","Leona"],
    why:"Kom först till river och tvinga enemy att gå in i er.",
    focus:"Push waves, reset tidigt, setup vision. JAGA INTE.",
    call:"PUSH → RESET → RIVER → HÅLL CHOKES → TURNA."
  },
  "JUNGLE CARRY":{
    core:["Shen","Viego","Taliyah","Ashe","Nautilus"],
    alts:["Malphite","Sion","Mordekaiser","Kindred","Graves","Lillia","Ahri","Hwei","Viktor","Varus","Senna","Xayah","Leona","Maokai"],
    why:"Lanes enablear jungle med prio, setup och vision.",
    focus:"Kindred kräver prio. Ingen prio = Viego eller byt comp.",
    call:"LANES FÅR PRIO → JG TAR RIVER/ENEMY CAMPS → SPELA RUNT JG."
  }

};

const compGuides = {
  "EARLY SKIRMISH":{
    title:"Early Skirmish",
    identity:"Vinn prio, ta första move och använd stark 2v2/3v3 för att konvertera till objectives.",
    roles:{
      top:["Renekton","Darius","Olaf","Mordekaiser"],
      jungle:["Xin Zhao","Volibear","Jarvan IV","Wukong"],
      mid:["Ahri","Taliyah","Vex"],
      adc:["Ashe","Varus","Xayah"],
      support:["Nautilus","Leona","Maokai"]
    },
    variants:[
      {name:"Standard",tag:"BALANS",picks:["Renekton","Xin Zhao","Ahri","Ashe","Nautilus"],why:"Mest komplett early/midgame-version: prio, setup, engage och pick."},
      {name:"Hard engage",tag:"FORCE",picks:["Renekton","Jarvan IV","Vex","Ashe","Leona"],why:"När enemy har squishy/immobile carries och vi vill starta fights själva."},
      {name:"Anti-melee",tag:"CONTROL",picks:["Mordekaiser","Xin Zhao","Taliyah","Varus","Maokai"],why:"Behåller early pressure men ger mer zone/control när enemy måste gå in i oss."}
    ],
    goodInto:["Scaling jungle som vill fullcleara","Lanes vi kan få prio i","Enemy carries som kan straffas av tidiga moves","Comps som behöver tid innan första 1–2 items"],
    watch:["Fighta inte river utan lane-prio","Chasa inte kills efter vunnen skirmish — ta objective","För många losing lanes dödar compens identitet"],
    plan:{early:"Skapa push/prio → jungle möter lanes i river.",mid:"Spela Herald/Drake på tempo och attackera innan enemy stabiliserar.",late:"Sök picks/flanks; undvik att spela som ren scaling-comp."},
    rule:"Behåll minst två av: lane-prio, stark tidig jungle, säker engage/setup."
  },
  "PRESS R":{
    title:"PRESS R",
    identity:"Enkel execution: tydlig GO-knapp, samma target och chain CC innan enemy hinner spela fighten.",
    roles:{
      top:["Malphite","Shen","Sion","Mordekaiser"],
      jungle:["Jarvan IV","Vi","Wukong","Xin Zhao"],
      mid:["Annie","Vex","Hwei","Taliyah"],
      adc:["Jinx","Ashe","Xayah"],
      support:["Leona","Nautilus","Maokai"]
    },
    variants:[
      {name:"Standard",tag:"5V5",picks:["Malphite","Jarvan IV","Annie","Jinx","Leona"],why:"Maximal enkel engage + resetpotential för Jinx."},
      {name:"Carry access",tag:"PICK",picks:["Malphite","Vi","Vex","Ashe","Nautilus"],why:"Bättre när en specifik enemy carry måste dö och front-to-back är svårt."},
      {name:"Anti-dive",tag:"COUNTER",picks:["Shen","Jarvan IV","Taliyah","Xayah","Maokai"],why:"Enemy får gå in först; vi överlever commit och vänder med counter-engage."}
    ],
    goodInto:["Immobile carries","Poke som måste respektera hård engage","Hypercarry + enchanter","Comps utan stark disengage efter första engage"],
    watch:["Bränn inte alla engage-ults på frontline","Jinx/ADC ska följa — inte starta","Om enemy har mycket disengage behöver flank eller target access"],
    plan:{early:"Spela stabilt och samla ult-levels utan onödiga coinflips.",mid:"Forcea runt objectives när flera R är uppe.",late:"En bra engage kan avsluta matchen — synka cooldowns och target."},
    rule:"Behåll minst en pålitlig primär engage + en sekundär CC/engage. Annars är det inte längre PRESS R."
  },
  "OBJECTIVE CONTROL":{
    title:"Objective Control",
    identity:"Kom först till river, kontrollera chokes och tvinga enemy att gå genom vår zone för att nå objective.",
    roles:{
      top:["Mordekaiser","Sion","Shen","Heimerdinger"],
      jungle:["Udyr","Lillia","Volibear","Xin Zhao"],
      mid:["Taliyah","Hwei","Anivia","Viktor","Ahri"],
      adc:["Varus","Ashe","Xayah"],
      support:["Maokai","Nautilus","Leona"]
    },
    variants:[
      {name:"Standard",tag:"ZONE",picks:["Mordekaiser","Udyr","Taliyah","Varus","Maokai"],why:"Starkaste rena choke/objective-identiteten."},
      {name:"AP tempo",tag:"SKIRMISH",picks:["Shen","Lillia","Ahri","Varus","Nautilus"],why:"Mer rörlig version med pick och skirmish utan att tappa objective setup."},
      {name:"Anti-dive",tag:"PEEL",picks:["Sion","Udyr","Hwei","Xayah","Maokai"],why:"Mer defensiv setup när enemy har flera divers och vi vill låta dem gå in."}
    ],
    goodInto:["3+ melee / kort range","Enemy som måste facechecka","Comps med begränsad long-range poke","Matcher där drakar/Herald blir naturliga fightpunkter"],
    watch:["Kommer vi sent till objective tappar compen mycket värde","Jaga inte ut ur vår zone efter första killen","För lite waveclear gör resets/setup svårare"],
    plan:{early:"Säkra waves och planera reset före första objective.",mid:"Var först i river → vision → håll chokes → turna tillsammans.",late:"Skydda entrances och tvinga enemy ta dåliga vägar in i området."},
    rule:"Behåll zone/control + frontline. Byter vi bort båda blir compen bara en vanlig 5v5."
  },
  "JUNGLE CARRY":{
    title:"Jungle Carry",
    identity:"Lanes ger prio/setup så junglern får river, camps, resets och utrymme att bli matchens starkaste resurs.",
    roles:{
      top:["Shen","Malphite","Sion","Mordekaiser"],
      jungle:["Viego","Kindred","Graves","Lillia"],
      mid:["Taliyah","Ahri","Hwei","Viktor"],
      adc:["Ashe","Varus","Senna","Xayah"],
      support:["Nautilus","Maokai","Leona"]
    },
    variants:[
      {name:"Viego reset",tag:"RESET",picks:["Shen","Viego","Taliyah","Ashe","Nautilus"],why:"Mycket setup/CC så Viego får första reset och kan ta över fighten."},
      {name:"Kindred prio",tag:"MARKS",picks:["Shen","Kindred","Taliyah","Ashe","Nautilus"],why:"Maximerar river access och mark-kontroll; kräver att lanes faktiskt kan röra sig."},
      {name:"Graves tempo",tag:"ECONOMY",picks:["Malphite","Graves","Ahri","Ashe","Maokai"],why:"Lanes skapar picks/space medan Graves spelar camps, invade och itemtempo."},
      {name:"Lillia teamfight",tag:"AP CARRY",picks:["Sion","Lillia","Hwei","Varus","Nautilus"],why:"Frontline + range + setup ger Lillia tid att stacka och hitta sleep."}
    ],
    goodInto:["Enemy jungle som inte kan straffa våra lanes tidigt","Lanes med prio eller stark setup","Draft där vår jungle har bra matchup/invade-fönster","Enemy comp där resets/kiting får hög value"],
    watch:["Kindred/Graves utan lane-prio blir mycket svårare","Lanes får inte ta all jungle-tempo för egna coinflip fights","Om junglern blir neutraliserad måste compen fortfarande ha frontline/engage"],
    plan:{early:"Planera clear efter vilka lanes som faktiskt kan movea. Ta river/camps med prio.",mid:"Spela vision och fights runt junglerns power spike; lanes enablear.",late:"Jungle är en primär carry — frontline/setup måste köpa tid och space."},
    rule:"Minst två lanes måste bidra med prio, setup eller global hjälp. Annars välj Viego/Lillia eller byt comp."
  }
};

const scenarios = [
  {
    title:"Dive-komp mot er",
    brief:"Enemy vill gå hårt på backline och har tydlig engage.",
    difficulty:"Medel",
    goal:"Bygg en comp som överlever dive men fortfarande kan fighta objectives.",
    enemy:["Malphite","Vi","Vex","Kai'Sa","Rakan"],
    ideal:"PRESS R",
    recommended:["Xayah","Taliyah","Nautilus","Jarvan IV","Mordekaiser"],
    key:["Xayah","Taliyah","Nautilus","Maokai","Mordekaiser","Malphite","Jarvan IV"],
    avoid:["Kindred","Senna"]
  },
  {
    title:"Kort range / melee",
    brief:"Enemy måste gå in i er för att göra damage.",
    difficulty:"Lätt",
    goal:"Straffa deras korta range och äg objective-zoner.",
    enemy:["Darius","Wukong","Sylas","Samira","Leona"],
    ideal:"OBJECTIVE CONTROL",
    recommended:["Udyr","Taliyah","Varus","Maokai","Heimerdinger"],
    key:["Udyr","Taliyah","Varus","Maokai","Heimerdinger","Mordekaiser","Wukong"],
    avoid:["Kindred"]
  },
  {
    title:"Svag enemy early jungle",
    brief:"Enemy skalar och vill undvika tidiga 2v2/3v3.",
    difficulty:"Lätt",
    goal:"Drafta för att vinna river och snowballa innan deras scaling.",
    enemy:["Kayle","Kayn","Viktor","Sivir","Milio"],
    ideal:"EARLY SKIRMISH",
    recommended:["Renekton","Xin Zhao","Ahri","Ashe","Nautilus"],
    key:["Renekton","Xin Zhao","Ahri","Ashe","Nautilus","Varus","Leona"],
    avoid:["Kindred","Senna"]
  },
  {
    title:"Jungle carry-fönster",
    brief:"Enemy lanes är relativt passiva och er jungle kan få mycket space.",
    difficulty:"Svår",
    goal:"Ge junglern prio och setup utan att göra resten av compen för svag.",
    enemy:["Sion","Sejuani","Viktor","Ezreal","Braum"],
    ideal:"JUNGLE CARRY",
    recommended:["Shen","Viego","Taliyah","Ashe","Nautilus"],
    key:["Shen","Viego","Kindred","Taliyah","Ashe","Nautilus","Maokai"],
    avoid:["Darius","Olaf"]
  },
  {
    title:"Poke och disengage",
    brief:"Enemy vill spela långt bort och kitea engage.",
    difficulty:"Svår",
    goal:"Hitta pålitlig engage/target access istället för att långsamt bli pokade.",
    enemy:["Jayce","Graves","Syndra","Ezreal","Janna"],
    ideal:"PRESS R",
    recommended:["Malphite","Jarvan IV","Annie","Ashe","Leona"],
    key:["Malphite","Jarvan IV","Annie","Vi","Leona","Nautilus","Ashe"],
    avoid:["Udyr","Kindred"]
  }
];

const trainerRoles=["top","jungle","mid","adc","support"];
const trainerRoleNames={top:"TOP",jungle:"JUNGLE",mid:"MID",adc:"ADC",support:"SUPPORT"};
const trainerRolePools={
  top:["Aatrox","Ambessa","Camille","Darius","Fiora","Galio","Garen","Gnar","Gragas","Gwen","Heimerdinger","Jax","Jayce","Kayle","Kennen","K'Sante","Malphite","Mordekaiser","Olaf","Ornn","Poppy","Renekton","Rumble","Shen","Sion","Tahm Kench","Trundle","Tryndamere","Yone","Yorick"],
  jungle:["Amumu","Diana","Ekko","Gragas","Graves","Ivern","Jarvan IV","Kayn","Kindred","Lee Sin","Lillia","Nocturne","Poppy","Sejuani","Skarner","Trundle","Udyr","Vi","Viego","Volibear","Wukong","Xin Zhao","Zac"],
  mid:["Ahri","Akali","Anivia","Annie","Aurora","Azir","Cassiopeia","Galio","Hwei","Orianna","Ryze","Sylas","Syndra","Taliyah","Tristana","Twisted Fate","Vex","Viktor","Yone"],
  adc:["Aphelios","Ashe","Caitlyn","Ezreal","Jinx","Kai'Sa","Kalista","Lucian","Miss Fortune","Samira","Senna","Sivir","Smolder","Tristana","Varus","Xayah","Yunara","Zeri"],
  support:["Alistar","Braum","Janna","Leona","Lulu","Maokai","Milio","Nami","Nautilus","Poppy","Rakan","Rell","Senna","Tahm Kench"]
};

function shuffled(list){
  const a=[...list];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function scenarioRoleEntries(){
  if(currentScenario?.scoutLineup?.length){
    return trainerRoles.map(role=>{
      const entry=currentScenario.scoutLineup.find(x=>x.role===role);
      const pool=(entry?.pool||[]).map(c=>c.champ).filter(Boolean);
      return {role,champ:pool[0]||currentScenario.enemy?.[trainerRoles.indexOf(role)]||null,pool};
    });
  }
  return trainerRoles.map((role,i)=>({role,champ:currentScenario.enemy[i],pool:[currentScenario.enemy[i]]}));
}

let enemyRoleOrder=[],scenarioEnemyPlan=[];

function prepareEnemyPlan(){
  enemyRoleOrder=shuffled(trainerRoles);
  scenarioEnemyPlan=mode==="test"?shuffled(scenarioRoleEntries()):[];
}

function nextEnemyRole(){
  const enemyIndex=picks.filter(p=>p.side!==userSide).length;
  if(mode==="test")return scenarioEnemyPlan[enemyIndex]?.role||enemyRoleOrder[enemyIndex]||"support";
  return enemyRoleOrder[enemyIndex]||trainerRoles[enemyIndex]||"support";
}

function randomChampionForRole(role,used){
  let pool=(trainerRolePools[role]||[]).filter(ch=>champions.includes(ch)&&!used.has(ch));
  if(!pool.length){
    // Emergency fallback: keep draft moving, but prefer champions not already used.
    pool=champions.filter(ch=>!used.has(ch));
  }
  return pool[Math.floor(Math.random()*pool.length)];
}

function nextEnemyChampion(){
  const used=new Set(picks.map(p=>p.champ));
  const enemyIndex=picks.filter(p=>p.side!==userSide).length;
  const role=nextEnemyRole();

  if(mode==="test"){
    const plannedEntry=scenarioEnemyPlan[enemyIndex]||{};
    const pool=(plannedEntry.pool||[plannedEntry.champ]).filter(ch=>ch&&champions.includes(ch)&&!used.has(ch));
    if(pool.length){
      const r=Math.random();
      const idx=r<0.62?0:r<0.88?Math.min(1,pool.length-1):Math.min(2,pool.length-1);
      return {champ:pool[idx]||pool[0],role};
    }
    const planned=plannedEntry.champ;
    if(planned&&champions.includes(planned)&&!used.has(planned))return {champ:planned,role};
    return {champ:randomChampionForRole(role,used),role};
  }

  return {champ:randomChampionForRole(role,used),role};
}

function opponentIdealFromPicks(enemyChamps){
  const enemy=new Set(enemyChamps||[]);
  const poke=new Set(["Jayce","Hwei","Xerath","Ezreal","Varus","Caitlyn","Zoe","Lux","Vel'Koz","Syndra"]);
  const immobile=new Set(["Jinx","Aphelios","Ashe","Varus","Hwei","Viktor","Syndra","Smolder","Caitlyn","Miss Fortune"]);
  const melee=new Set(["Darius","Garen","Renekton","Mordekaiser","Shen","Sion","Malphite","Jarvan IV","Vi","Wukong","Xin Zhao","Udyr","Volibear","Nautilus","Leona","Maokai","Rakan","Tahm Kench","Yorick"]);
  const tanks=new Set(["Sion","Ornn","Malphite","Shen","Maokai","Sejuani","Skarner","Tahm Kench","Dr. Mundo","K'Sante"]);
  const scalingJungle=new Set(["Kayn","Kindred","Graves","Viego","Lillia","Nunu & Willump"]);
  const earlyJungle=new Set(["Xin Zhao","Volibear","Jarvan IV","Lee Sin","Vi","Wukong","Poppy"]);
  const count=set=>[...enemy].filter(ch=>set.has(ch)).length;
  const scores={
    "EARLY SKIRMISH":count(scalingJungle)*3+(count(earlyJungle)===0?2:0),
    "PRESS R":count(poke)*2.2+count(immobile)*2.3,
    "OBJECTIVE CONTROL":count(melee)*1.8+count(tanks)*2.2,
    "JUNGLE CARRY":(count(earlyJungle)===0?3:0)+(count(melee)<=2?1:0)
  };
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0]||"EARLY SKIRMISH";
}
function buildOpponentScenario(plan){
  const lineup=window.RiftBanPlanner?.roleLineup?.(plan)||[];
  const enemy=trainerRoles.map(role=>{
    const entry=lineup.find(x=>x.role===role);
    return entry?.pool?.[0]?.champ||null;
  }).filter(Boolean);
  const ideal=opponentIdealFromPicks(enemy);
  const threats=(plan.banPriority||[]).slice(0,3).map(x=>x.champ).filter(Boolean);
  return {
    title:"Scout-test · "+plan.opponent,
    brief:"Motståndaren draftar från de champion pools som autoscoutats i Ban Planner. Picks varierar mellan deras högst prioriterade roll-champs.",
    difficulty:(plan.scoutingConfidence||"preliminary").toLowerCase()==="high"?"Svår":(plan.scoutingConfidence||"").toLowerCase()==="medium"?"Medel":"Scoutad",
    goal:"Anpassa vår comp efter deras riktiga comfort. Håll extra koll på "+(threats.length?threats.join(" / "):"deras topp-picks")+".",
    enemy,
    ideal,
    recommended:[...comps[ideal].core],
    key:[...new Set([...comps[ideal].core,...comps[ideal].alts])],
    avoid:[],
    opponentPlanId:plan.id,
    opponentName:plan.opponent,
    scoutLineup:lineup
  };
}
function renderScenarioBrief(){
  if(!currentScenario)return;
  $("scenarioTitle").textContent=currentScenario.title;
  $("scenarioBrief").textContent=currentScenario.brief;
  $("scenarioGoal").textContent="Mål: "+currentScenario.goal;
  $("scenarioDifficulty").textContent=currentScenario.opponentPlanId
    ?"Scout: "+currentScenario.difficulty
    :"Svårighet: "+currentScenario.difficulty;
  if($("testOpponentHint")){
    $("testOpponentHint").textContent=currentScenario.opponentPlanId
      ?"Enemy picks hämtas från "+currentScenario.opponentName+"s scoutade roll-pools."
      :"Välj ett scoutat lag från Ban Planner eller kör ett vanligt scenario.";
  }
}
async function refreshTestOpponentOptions(){
  const select=$("testOpponentSelect");
  if(!select)return;
  try{await window.RiftBanPlanner?.load?.()}catch{}
  const plans=(window.RiftBanPlanner?.getPlans?.()||[])
    .filter(p=>p.status==="upcoming"&&(p.scoutingPlayers||[]).length)
    .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt));
  const keep=selectedTestOpponentId&&plans.some(p=>p.id===selectedTestOpponentId)?selectedTestOpponentId:"";
  select.innerHTML='<option value="">Slumpat träningsscenario</option>'+
    plans.map(p=>'<option value="'+p.id+'">'+p.opponent+' · '+(p.scoutingConfidence||"preliminary").toUpperCase()+'</option>').join("");
  select.value=keep;
}
function applyTestOpponentSelection(id){
  selectedTestOpponentId=id||"";
  if(selectedTestOpponentId){
    const plan=(window.RiftBanPlanner?.getPlans?.()||[]).find(p=>p.id===selectedTestOpponentId);
    currentScenario=plan?buildOpponentScenario(plan):scenarios[Math.floor(Math.random()*scenarios.length)];
  }else{
    currentScenario=scenarios[Math.floor(Math.random()*scenarios.length)];
  }
  renderScenarioBrief();
}

const engage = new Set(["Malphite","Jarvan IV","Annie","Leona","Nautilus","Maokai","Vi","Wukong","Amumu","Sion","Rakan","Rell","Sejuani","Zac"]);
const frontline = new Set(["Malphite","Jarvan IV","Leona","Nautilus","Maokai","Mordekaiser","Udyr","Volibear","Sion","Shen","Galio","Renekton","Xin Zhao","Wukong","Vi","Poppy","Ornn","Sejuani","Zac"]);
const damage = new Set(["Jinx","Varus","Xayah","Ashe","Viego","Kindred","Graves","Lillia","Taliyah","Hwei","Viktor","Ahri","Annie","Darius","Olaf","Mordekaiser","Xin Zhao","Yone","Caitlyn","Kai'Sa","Lucian","Zeri","Syndra","Orianna"]);
const early = new Set(["Renekton","Xin Zhao","Ahri","Ashe","Nautilus","Leona","Jarvan IV","Volibear","Darius","Olaf","Taliyah","Varus","Vi","Wukong","Poppy","Lee Sin","Lucian","Caitlyn"]);

let mode=null,userSide=null,picks=[],step=0,currentScenario=null;
let selectedTestOpponentId="";

const $=id=>document.getElementById(id);
champions.forEach(c=>{const o=document.createElement("option");o.value=c;$("champions").appendChild(o)});
loadChampionRoster();
setTrainerNav(false);
const requestedView=new URLSearchParams(location.search).get("view");
if(requestedView==="analysis")queueMicrotask(()=>showAnalysisView());
if(requestedView==="planner")queueMicrotask(()=>showBanPlannerView());

$("startTabBtn").addEventListener("click",()=>showHomeView());
$("analysisTabBtn").addEventListener("click",()=>showAnalysisView());
$("plannerTabBtn")?.addEventListener("click",()=>showBanPlannerView());
document.querySelectorAll(".analysis-filter").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".analysis-filter").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  currentAnalysisFilter=btn.dataset.filter;
  renderAnalysis();
}));
$("patchFilter")?.addEventListener("change",e=>{
  currentAnalysisPatch=e.target.value||"all";
  renderAnalysis();
});
$("matchHistory").addEventListener("click",async e=>{
  const review=e.target.closest("[data-review-match]");
  if(review){
    openDraftReview(review.dataset.reviewMatch);
    return;
  }
  const btn=e.target.closest("[data-delete-match]");
  if(!btn)return;
  const id=btn.dataset.deleteMatch;
  if(confirm("Radera den här sparade matchen för hela laget?")){
    try{
      if(window.RiftSharedData)await window.RiftSharedData.deleteMatch(id);
      else localStorage.setItem("rs_match_history",JSON.stringify(matchHistoryData().filter(m=>m.id!==id)));
      syncDraftArchiveFromMatches(matchHistoryData());
      renderAnalysis();
    }catch(err){
      alert("Kunde inte radera från den delade databasen. Kontrollera anslutningen.");
    }
  }
});

$("simModeBtn").addEventListener("click",()=>selectMode("sim"));
$("testModeBtn").addEventListener("click",()=>selectMode("test"));
$("testOpponentSelect")?.addEventListener("change",e=>applyTestOpponentSelection(e.target.value));
$("matchDayOpenPlanner")?.addEventListener("click",()=>{
  const id=$("matchDayOpenPlanner")?.dataset.planId;
  showBanPlannerView();
  if(id)window.RiftBanPlanner?.selectPlan?.(id);
});
$("resetBtn").addEventListener("click",()=>location.reload());
$("homeBtn").addEventListener("click",goHome);
$("undoBtn").addEventListener("click",undoPick);
$("lockBtn").addEventListener("click",()=>lockPick(false));
$("randomEnemyBtn").addEventListener("click",()=>lockPick(true));
$("championSearch").addEventListener("keydown",e=>{if(e.key==="Enter")lockPick(false)});

document.querySelectorAll(".side-btn").forEach(btn=>btn.addEventListener("click",()=>{
  userSide=btn.dataset.side;
  setTrainerNav(true);
  $("setup").classList.add("hidden");
  $("draftArea").classList.remove("hidden");
  if(mode==="sim") $("analysis").classList.remove("hidden");
  prepareEnemyPlan();
  if(mode==="test"){
    if($("testOpponentSelect"))$("testOpponentSelect").disabled=true;
    seedScenarioEnemyPicks();
  }
  else render();
}));


const compGuideRoles=["top","jungle","mid","adc","support"];
const compGuideRoleNames={top:"TOP",jungle:"JUNGLE",mid:"MID",adc:"ADC",support:"SUPPORT"};

function compGuideEscape(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function openCompGuide(name){
  const g=compGuides[name],base=comps[name];
  if(!g||!base)return;
  $("compGuideEyebrow").textContent="COMP GUIDE · "+name;
  $("compGuideTitle").textContent=g.title;
  $("compGuideIdentity").textContent=g.identity;
  $("compGuideCall").textContent=base.call;

  $("compGuideCore").innerHTML=base.core.map((ch,i)=>
    '<div class="comp-core-slot"><span>'+compGuideRoleNames[compGuideRoles[i]]+'</span><strong>'+compGuideEscape(ch)+'</strong></div>'
  ).join("");

  $("compGuideRoleAlts").innerHTML=compGuideRoles.map(role=>
    '<div class="comp-role-alt"><span>'+compGuideRoleNames[role]+'</span><div>'+
      (g.roles[role]||[]).map((ch,i)=>'<b class="'+(i===0?"primary":"")+'">'+compGuideEscape(ch)+'</b>').join("")+
    '</div></div>'
  ).join("");

  $("compGuideVariants").innerHTML=g.variants.map(v=>
    '<article class="comp-variant">'+
      '<div class="comp-variant-head"><strong>'+compGuideEscape(v.name)+'</strong><span>'+compGuideEscape(v.tag)+'</span></div>'+
      '<div class="comp-variant-picks">'+v.picks.map((ch,i)=>'<span><small>'+compGuideRoleNames[compGuideRoles[i]]+'</small>'+compGuideEscape(ch)+'</span>').join("")+'</div>'+
      '<p>'+compGuideEscape(v.why)+'</p>'+
    '</article>'
  ).join("");

  $("compGuideGoodInto").innerHTML=g.goodInto.map(x=>'<p>'+compGuideEscape(x)+'</p>').join("");
  $("compGuideWatch").innerHTML=g.watch.map(x=>'<p>'+compGuideEscape(x)+'</p>').join("");
  $("compGuidePlan").innerHTML=[
    ["EARLY",g.plan.early],["MIDGAME",g.plan.mid],["LATE",g.plan.late]
  ].map(([phase,text])=>'<div><span>'+phase+'</span><p>'+compGuideEscape(text)+'</p></div>').join("");
  $("compGuideRule").textContent=g.rule;

  const overlay=$("compGuideOverlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden","false");
  document.body.classList.add("comp-guide-open");
}
function closeCompGuide(){
  const overlay=$("compGuideOverlay");
  if(!overlay)return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("comp-guide-open");
}
document.querySelectorAll("[data-comp-guide]").forEach(card=>{
  card.addEventListener("click",()=>openCompGuide(card.dataset.compGuide));
  card.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();openCompGuide(card.dataset.compGuide)}
  });
});
$("closeCompGuide")?.addEventListener("click",closeCompGuide);
$("compGuideOverlay")?.addEventListener("click",e=>{if(e.target===$("compGuideOverlay"))closeCompGuide()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("compGuideOverlay")?.classList.contains("hidden"))closeCompGuide()});

let currentAnalysisFilter="all";
let currentAnalysisPatch="all";

function matchHistoryData(){
  if(window.RiftSharedData)return window.RiftSharedData.localMatches();
  try{return JSON.parse(localStorage.getItem("rs_match_history")||"[]")}catch{return[]}
}
function syncDraftArchiveFromMatches(matches){
  const archive=matches.slice(-50).map(m=>({
    savedAt:m.savedAt,side:m.side,ourPicks:m.ourPicks||[],enemyPicks:m.enemyPicks||[],
    ourBans:m.ourBans||[],enemyBans:m.enemyBans||[],comp:m.comp||null,
    scaling:m.scaling||null,bestWindow:m.bestWindow||null,topRisk:m.topRisk||null,
    fightStyle:m.fightStyle||null,objectiveStyle:m.objectiveStyle||null,
    result:m.result||null,matchType:m.matchType||null,patch:m.patch||null,
    matchup:m.matchup||null,draftTimeline:m.draftTimeline||[]
  }));
  localStorage.setItem("rs_draft_archive",JSON.stringify(archive));
}
function percent(w,n){return n?Math.round(w/n*100)+"%":"—"}
function sampleConfidence(n){
  if(n>=10)return {label:"ESTABLISHED TREND",className:"high"};
  if(n>=6)return {label:"EMERGING TREND",className:"medium"};
  if(n>=3)return {label:"LOW CONFIDENCE",className:"low"};
  if(n>=1)return {label:"OBSERVATION",className:"low"};
  return {label:"NO SAMPLE",className:"low"};
}
function sampleText(n){
  const c=sampleConfidence(n);
  return (n===1?"1 match":n+" matcher")+" · "+c.label;
}
function resultCounts(list){
  const w=list.filter(m=>m.result==="win").length;
  return {w,l:list.length-w,n:list.length};
}
function patchSortValue(p){
  const [a,b]=String(p||"0.0").split(".").map(Number);
  return (Number.isFinite(a)?a:0)*100+(Number.isFinite(b)?b:0);
}
function syncPatchFilter(all){
  const select=$("patchFilter");
  if(!select)return;
  const patches=[...new Set(all.map(m=>m.patch).filter(Boolean))].sort((a,b)=>patchSortValue(b)-patchSortValue(a));
  if(currentAnalysisPatch!=="all"&&!patches.includes(currentAnalysisPatch))currentAnalysisPatch="all";
  select.innerHTML='<option value="all">Alla patchar</option>'+patches.map(p=>'<option value="'+p+'">'+p+'</option>').join("");
  select.value=currentAnalysisPatch;
}
function filteredMatches(){
  const all=matchHistoryData().sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
  return all.filter(m=>
    (currentAnalysisFilter==="all"||m.matchType===currentAnalysisFilter)&&
    (currentAnalysisPatch==="all"||m.patch===currentAnalysisPatch)
  );
}
function sameLocalDay(a,b){
  const x=new Date(a),y=new Date(b);
  return !isNaN(x)&&!isNaN(y)&&x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate();
}
function renderMatchDayDashboard(){
  const card=$("matchDayDashboard");
  if(!card)return;
  if(mode){card.classList.add("hidden");return}
  const now=new Date();
  const plans=(window.RiftBanPlanner?.getPlans?.()||[])
    .filter(p=>p.status==="upcoming"&&sameLocalDay(p.scheduledAt,now))
    .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt));
  const plan=plans[0];
  if(!plan){card.classList.add("hidden");return}
  card.classList.remove("hidden");
  $("matchDayOpponent").textContent=plan.opponent;
  const d=new Date(plan.scheduledAt);
  const time=isNaN(d)?"—":d.toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"});
  $("matchDayMeta").textContent=["Idag "+time,"BO"+(plan.bestOf||3),plan.competition||null].filter(Boolean).join(" · ");
  const calls=["b1","b2","b3"].map((key,i)=>({label:"B"+(i+1),champ:plan.phase1Plan?.[key]||"Öppen"}));
  $("matchDayBans").innerHTML=calls.map(x=>'<div><span>'+x.label+'</span><strong>'+x.champ+'</strong></div>').join("");
  $("matchDayScout").textContent="Scout: "+String(plan.scoutingConfidence||"preliminary").toUpperCase();
  const targets=(plan.banPriority||[]).filter(x=>x.type==="target").slice(0,3).map(x=>x.champ);
  $("matchDayTargets").textContent=targets.length?"Targets: "+targets.join(" / "):"Targets: inte låsta ännu";
  $("matchDayOpenPlanner").dataset.planId=plan.id;
}
async function refreshPlannerData(){
  try{await window.RiftBanPlanner?.load?.()}catch{}
  renderMatchDayDashboard();
  refreshTestOpponentOptions();
}

function showHomeView(){
  if(mode)return goHome();
  $("analysisDashboard").classList.add("hidden");
  $("banPlannerDashboard")?.classList.add("hidden");
  $("modeSelect").classList.remove("hidden");
  renderMatchDayDashboard();
  document.querySelector(".comps").classList.remove("hidden");
  $("startTabBtn").classList.add("active");
  $("analysisTabBtn").classList.remove("active");
  $("plannerTabBtn")?.classList.remove("active");
  renderMatchDayDashboard();
}
async function showAnalysisView(){
  if(mode)goHome();
  $("matchDayDashboard")?.classList.add("hidden");
  $("modeSelect").classList.add("hidden");
  document.querySelector(".comps").classList.add("hidden");
  $("banPlannerDashboard")?.classList.add("hidden");
  $("analysisDashboard").classList.remove("hidden");
  $("startTabBtn").classList.remove("active");
  $("analysisTabBtn").classList.add("active");
  $("plannerTabBtn")?.classList.remove("active");
  renderAnalysis();
  if(window.RiftSharedData){
    await window.RiftSharedData.sync();
    syncDraftArchiveFromMatches(matchHistoryData());
    renderAnalysis();
  }
}
function showBanPlannerView(){
  if(mode)goHome();
  $("matchDayDashboard")?.classList.add("hidden");
  $("modeSelect").classList.add("hidden");
  $("analysisDashboard").classList.add("hidden");
  document.querySelector(".comps").classList.add("hidden");
  $("banPlannerDashboard")?.classList.remove("hidden");
  $("startTabBtn").classList.remove("active");
  $("analysisTabBtn").classList.remove("active");
  $("plannerTabBtn")?.classList.add("active");
  window.RiftBanPlanner?.show?.();
}

function renderAnalysis(){
  const all=matchHistoryData().sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
  syncPatchFilter(all);
  const list=filteredMatches();
  const patchScoped=currentAnalysisPatch==="all"?all:all.filter(m=>m.patch===currentAnalysisPatch);
  const c=resultCounts(list),league=resultCounts(patchScoped.filter(m=>m.matchType==="league")),flex=resultCounts(patchScoped.filter(m=>m.matchType==="flex"));
  const recent=list.slice(0,10),rc=resultCounts(recent);

  $("statMatches").textContent=c.n;
  $("statWinrate").textContent=percent(c.w,c.n);
  $("statRecord").textContent=c.w+"W · "+c.l+"L";
  $("statLeagueWr").textContent=percent(league.w,league.n);$("statLeagueCount").textContent=league.n+" matcher";
  $("statFlexWr").textContent=percent(flex.w,flex.n);$("statFlexCount").textContent=flex.n+" matcher";
  $("statRecent").textContent=recent.length?percent(rc.w,rc.n):"—";
  $("statRecentRecord").textContent=recent.length?rc.w+"W · "+rc.l+"L":"Ingen data";
  const typeLabel=currentAnalysisFilter==="all"?"Alla matcher":currentAnalysisFilter==="league"?"Ligamatcher":"Flex / 5v5";
  $("statFilterLabel").textContent=typeLabel+(currentAnalysisPatch==="all"?"":" · patch "+currentAnalysisPatch);

  $("analysisEmpty").classList.toggle("hidden",all.length>0);
  document.querySelectorAll(".analysis-panel,.analysis-kpis").forEach(el=>el.classList.toggle("hidden",all.length===0));
  if(!all.length)return;

  const compsMap={};
  list.forEach(m=>{const k=m.comp||"Övrig";const x=compsMap[k]||(compsMap[k]={n:0,w:0});x.n++;if(m.result==="win")x.w++});
  const compRows=Object.entries(compsMap).sort((a,b)=>b[1].n-a[1].n);
  $("compStats").innerHTML=compRows.length?compRows.map(([name,x])=>{
    const wr=x.n?Math.round(x.w/x.n*100):0;
    return '<div class="stat-row"><span class="stat-name">'+name+'</span><span class="stat-bar"><i style="width:'+wr+'%"></i></span><span class="stat-value">'+wr+'% <small>('+x.n+')</small></span></div>';
  }).join(""):'<span class="analysis-note">Ingen data i filtret.</span>';
  const eligible=compRows.slice().sort((a,b)=>(b[1].w/b[1].n)-(a[1].w/a[1].n)||b[1].n-a[1].n)[0];
  $("bestCompStat").textContent=eligible?"Bäst observerad: "+eligible[0]+" · "+percent(eligible[1].w,eligible[1].n)+" · "+sampleConfidence(eligible[1].n).label:"Ingen sample ännu";

  const blue=resultCounts(list.filter(m=>m.side==="blue")),red=resultCounts(list.filter(m=>m.side==="red"));
  $("sideStats").innerHTML=[
    ["Blue side",blue],["Red side",red]
  ].map(([name,x])=>'<div class="stat-row"><span class="stat-name">'+name+'</span><span class="stat-bar"><i style="width:'+(x.n?Math.round(x.w/x.n*100):0)+'%"></i></span><span class="stat-value">'+percent(x.w,x.n)+' <small>('+x.n+')</small></span></div>').join("");

  const leagueShare=list.length?Math.round(list.filter(m=>m.matchType==="league").length/list.length*100):0;
  const compKinds=new Set(list.map(m=>m.comp).filter(Boolean)).size;
  $("profileStats").innerHTML=
    '<div><span>Ligandel</span><strong>'+leagueShare+'%</strong></div>'+
    '<div><span>Comps spelade</span><strong>'+compKinds+'</strong></div>'+
    '<div><span>Blue matcher</span><strong>'+blue.n+'</strong></div>'+
    '<div><span>Red matcher</span><strong>'+red.n+'</strong></div>';

  const champs={};
  list.forEach(m=>(m.ourPicks||[]).forEach(p=>{const ch=p.champ||p;champs[ch]=(champs[ch]||0)+1}));
  const champRows=Object.entries(champs).sort((a,b)=>b[1]-a[1]).slice(0,10);
  $("champStats").innerHTML=champRows.map(([ch,n])=>'<div class="champ-stat"><strong>'+ch+'</strong><span>'+n+' picks</span></div>').join("")||'<span class="analysis-note">Ingen data.</span>';

  const patterns=[];
  if(c.n>=3){
    if(blue.n>=2&&red.n>=2){
      const bw=blue.w/blue.n,rw=red.w/red.n;
      if(Math.abs(bw-rw)>=.15)patterns.push((bw>rw?"Blue":"Red")+" side har hittills bättre resultat ("+percent(Math.max(blue.w,red.w),bw>rw?blue.n:red.n)+").");
    }
    if(eligible)patterns.push(eligible[0]+" är bästa comp-trenden med minst två matcher: "+percent(eligible[1].w,eligible[1].n)+" WR över "+eligible[1].n+" matcher.");
    const recentFive=resultCounts(list.slice(0,5));
    if(recentFive.n>=3)patterns.push("Senaste "+recentFive.n+": "+recentFive.w+"W · "+recentFive.l+"L.");
    const riskCounts={};
    list.forEach(m=>{if(m.topRisk)riskCounts[m.topRisk]=(riskCounts[m.topRisk]||0)+1});
    const topRisk=Object.entries(riskCounts).sort((a,b)=>b[1]-a[1])[0];
    if(topRisk&&topRisk[1]>=2)patterns.push("Återkommande draft-risk: "+topRisk[0]+" ("+topRisk[1]+" matcher).");
  }
  if(!patterns.length)patterns.push("Mer data behövs innan tydliga lagmönster går att skilja från enstaka matcher.");
  $("patternInsights").innerHTML=patterns.slice(0,4).map(t=>'<div class="pattern-item">'+t+'</div>').join("");

  renderTeamLearning(list);

  $("historyCount").textContent=list.length+" matcher";
  $("matchHistory").innerHTML=list.slice(0,50).map(m=>{
    const d=new Date(m.savedAt);const date=isNaN(d)?m.savedAt:d.toLocaleDateString("sv-SE",{month:"2-digit",day:"2-digit"});
    const picks=(m.ourPicks||[]).map(p=>p.champ||p).join(" · ");
    const matchup=m.matchup?.score!=null?'<span class="matchup-mini">'+m.matchup.score+'/100</span>':'';
    const canDelete=!!window.RiftSharedData?.hasTeamKey?.();
    return '<div class="match-row">'+
      '<span class="match-result '+m.result+'">'+(m.result==="win"?"WIN":"LOSS")+'</span>'+
      '<span class="match-type">'+(m.matchType==="league"?"LIGA":"FLEX")+'</span>'+
      '<span class="match-date">'+date+(m.patch?' · '+m.patch:'')+'</span>'+
      '<span class="match-comp">'+(m.comp||"—")+' '+matchup+'</span>'+
      '<span class="match-picks">'+picks+'</span>'+
      '<span class="match-actions">'+
        '<button class="review-match" data-review-match="'+m.id+'">Review</button>'+
        (canDelete?'<button class="delete-match" data-delete-match="'+m.id+'" title="Radera match">×</button>':'')+
      '</span>'+
    '</div>';
  }).join("")||'<span class="analysis-note">Ingen data i filtret.</span>';
}


function roleChamp(match,role){
  const p=(match.ourPicks||[]).find(x=>(x.role||"")===role);
  return p?.champ||null;
}
function groupedRecord(list,keyFn){
  const map={};
  list.forEach(m=>{
    const key=keyFn(m);
    if(!key)return;
    const row=map[key]||(map[key]={n:0,w:0});
    row.n++;if(m.result==="win")row.w++;
  });
  return Object.entries(map).map(([name,x])=>({name,...x,wr:x.n?x.w/x.n:0}));
}
function bestObserved(rows,minN=3){
  return rows.filter(x=>x.n>=minN).sort((a,b)=>b.wr-a.wr||b.n-a.n)[0]||null;
}
function renderTeamLearning(list){
  const n=list.length,c=resultCounts(list);
  const confidence=sampleConfidence(n);
  const badge=$("learningConfidence");
  if(badge){
    badge.textContent=confidence.label;
    badge.className="learning-confidence "+confidence.className;
  }

  const comps=groupedRecord(list,m=>m.comp||null);
  const jgMid=groupedRecord(list,m=>{
    const j=roleChamp(m,"jungle"),mid=roleChamp(m,"mid");
    return j&&mid?j+" + "+mid:null;
  });
  const bot=groupedRecord(list,m=>{
    const a=roleChamp(m,"adc"),s=roleChamp(m,"support");
    return a&&s?a+" + "+s:null;
  });
  const bestComp=bestObserved(comps,1);
  const bestJgMid=bestObserved(jgMid,1);
  const bestBot=bestObserved(bot,1);
  const observedText=row=>row?percent(row.w,row.n)+" · "+sampleText(row.n):"Ingen komplett data";

  const favorable=list.filter(m=>Number(m.matchup?.score)>=58);
  const difficult=list.filter(m=>Number(m.matchup?.score)<47&&m.matchup?.score!=null);
  const fav=resultCounts(favorable),dif=resultCounts(difficult);
  const matchupSaved=list.filter(m=>m.matchup?.score!=null);
  const avgMatchup=matchupSaved.length
    ?Math.round(matchupSaved.reduce((sum,m)=>sum+Number(m.matchup.score),0)/matchupSaved.length)
    :null;

  const cards=[
    ["UNDERLAG",n+" matcher",confidence.label],
    ["OBS. COMP",bestComp?bestComp.name:"—",observedText(bestComp)],
    ["JUNGLE + MID",bestJgMid?bestJgMid.name:"—",observedText(bestJgMid)],
    ["BOTDUO",bestBot?bestBot.name:"—",observedText(bestBot)],
    ["AVG MATCHUP",avgMatchup!=null?avgMatchup+"/100":"—",matchupSaved.length?sampleText(matchupSaved.length):"Nya matcher börjar samla detta"],
    ["TOTALT",percent(c.w,c.n),c.w+"W · "+c.l+"L · "+confidence.label]
  ];
  $("learningCards").innerHTML=cards.map(([label,value,sub])=>
    '<div class="learning-card"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>'
  ).join("");

  const insights=[];
  if(n<3){
    insights.push("Team Learning visar observationer direkt, men använder dem inte som starka slutsatser förrän samma mönster har mer sample.");
  }
  if(bestComp)insights.push((bestComp.n<3?"Observation: ":"Trend: ")+bestComp.name+" · "+percent(bestComp.w,bestComp.n)+" över "+bestComp.n+" matcher · "+sampleConfidence(bestComp.n).label+".");
  if(bestJgMid)insights.push((bestJgMid.n<3?"Observation: ":"Trend: ")+"Jungle+mid "+bestJgMid.name+" · "+percent(bestJgMid.w,bestJgMid.n)+" över "+bestJgMid.n+" matcher.");
  if(bestBot)insights.push((bestBot.n<3?"Observation: ":"Trend: ")+"Botduo "+bestBot.name+" · "+percent(bestBot.w,bestBot.n)+" över "+bestBot.n+" matcher.");
  if(fav.n>=3)insights.push("När Draft Matchup varit ≥58 har resultatet varit "+percent(fav.w,fav.n)+" ("+fav.w+"W · "+fav.l+"L, n="+fav.n+").");
  if(dif.n>=3)insights.push("När Draft Matchup varit <47 har resultatet varit "+percent(dif.w,dif.n)+" ("+dif.w+"W · "+dif.l+"L, n="+dif.n+").");
  const recent=resultCounts(list.slice(0,5)),older=resultCounts(list.slice(5,15));
  if(recent.n>=5&&older.n>=5)insights.push("Senaste 5: "+percent(recent.w,recent.n)+" · föregående "+older.n+": "+percent(older.w,older.n)+".");
  if(!insights.length)insights.push("Mer data behövs för att skilja lagmönster från normal matchvarians.");
  $("learningInsights").innerHTML=insights.slice(0,5).map(x=>'<div class="learning-insight">'+x+'</div>').join("");
}

function reviewEscape(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function closeDraftReview(){
  const overlay=$("draftReviewOverlay");
  if(!overlay)return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("review-open");
}
function openDraftReview(id){
  const m=matchHistoryData().find(x=>x.id===id);
  if(!m)return;
  const overlay=$("draftReviewOverlay");
  const d=new Date(m.savedAt);
  const date=isNaN(d)?m.savedAt:d.toLocaleString("sv-SE",{dateStyle:"medium",timeStyle:"short"});
  $("draftReviewTitle").textContent=(m.result==="win"?"WIN":"LOSS")+" · "+(m.comp||"Draft");
  $("draftReviewMeta").textContent=[date,m.matchType==="league"?"Liga":"Flex / 5v5",m.patch?"Patch "+m.patch:null,m.side?m.side.toUpperCase()+" side":null].filter(Boolean).join(" · ");

  const matchup=m.matchup;
  const summary=[
    ["RESULTAT",m.result==="win"?"WIN":"LOSS"],
    ["COMP",m.comp||"—"],
    ["MATCHUP",matchup?.score!=null?matchup.score+"/100 · "+(matchup.label||""):"Legacy · ej sparad"],
    ["COUNTERVALUE",matchup?.counterValue!=null?matchup.counterValue+"/100":"—"],
    ["POWER WINDOW",m.bestWindow||"—"],
    ["SCALING",m.scaling||"—"]
  ];
  $("draftReviewSummary").innerHTML=summary.map(([a,b])=>'<div><span>'+reviewEscape(a)+'</span><strong>'+reviewEscape(b)+'</strong></div>').join("");
  $("draftReviewMatchup").textContent=matchup?.confidence?"Confidence "+matchup.confidence:"";

  $("reviewOurPicks").innerHTML=(m.ourPicks||[]).map(p=>'<span><b>'+reviewEscape((p.role||"").toUpperCase())+'</b>'+reviewEscape(p.champ||p)+'</span>').join("");
  $("reviewEnemyPicks").innerHTML=(m.enemyPicks||[]).map(p=>'<span><b>'+reviewEscape((p.inferredRole||p.role||"?").toUpperCase())+'</b>'+reviewEscape(p.champ||p)+'</span>').join("");

  if(Array.isArray(m.draftTimeline)&&m.draftTimeline.length){
    $("draftReviewTimeline").innerHTML=m.draftTimeline.map((e,i)=>{
      const ours=e.side===m.side;
      const suggestions=e.brain?.suggestions||[];
      const inTop=suggestions.includes(e.champ);
      let brain="";
      if(ours&&suggestions.length){
        brain='<div class="review-brain '+(inTop?"followed":"deviated")+'"><b>Brain:</b> '+suggestions.map(reviewEscape).join(" / ")+(inTop?" · ✓ inom top 3":" · valde annat")+'</div>';
      }
      return '<div class="review-step '+(ours?"ours":"enemy")+'">'+
        '<span class="review-step-num">'+(i+1)+'</span>'+
        '<div><small>'+reviewEscape(e.label||((e.side||"").toUpperCase()+" "+e.type))+' · '+(ours?"VI":"ENEMY")+'</small>'+
        '<strong>'+reviewEscape(e.champ)+'</strong>'+
        (e.role?'<em>'+reviewEscape(String(e.role).toUpperCase())+'</em>':'')+brain+'</div>'+
      '</div>';
    }).join("");
  }else{
    $("draftReviewTimeline").innerHTML='<div class="legacy-review">Den här matchen sparades innan full Draft Review började loggas. Slutpicks och bans finns kvar, men den exakta pick/ban-sekvensen och Brain-förslagen saknas.</div>';
  }

  const reasons=matchup?.why?.length?'<p><b>Matchup +:</b> '+matchup.why.map(reviewEscape).join(" ")+'</p>':"";
  const risks=matchup?.risks?.length?'<p><b>Matchup risk:</b> '+matchup.risks.map(reviewEscape).join(" ")+'</p>':"";
  $("draftReviewPlan").innerHTML=
    '<p><b>Loading call:</b> '+reviewEscape(m.loadingCall||"—")+'</p>'+
    '<p><b>Top risk:</b> '+reviewEscape(m.topRisk||"—")+'</p>'+
    '<p><b>Fight:</b> '+reviewEscape(m.fightStyle||"—")+'</p>'+
    '<p><b>Objective:</b> '+reviewEscape(m.objectiveStyle||"—")+'</p>'+reasons+risks;

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden","false");
  document.body.classList.add("review-open");
}
$("closeDraftReview")?.addEventListener("click",closeDraftReview);
$("draftReviewOverlay")?.addEventListener("click",e=>{if(e.target===$("draftReviewOverlay"))closeDraftReview()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDraftReview()});

function renderDbStatus(s=window.RiftSharedData?.getState?.()||{mode:"local",status:"Lokal"}){
  const wrap=document.querySelector(".db-status-wrap");
  if(!wrap)return;
  wrap.classList.remove("shared","offline","locked","readonly");
  if(["shared","offline","locked","readonly"].includes(s.mode))wrap.classList.add(s.mode);
  $("dbStatusText").textContent=s.status||"Lokal";
  const configured=!!window.RiftSharedData?.configured?.();
  const connected=!!window.RiftSharedData?.hasTeamKey?.();
  $("dbConnectBtn").classList.toggle("hidden",!configured||connected);
  $("dbConnectBtn").textContent="Lås upp skrivning";
  $("dbSyncBtn").classList.toggle("hidden",!configured);
}
window.RiftSharedData?.subscribe?.(s=>{
  renderDbStatus(s);
  if(s.mode==="shared"||s.mode==="readonly"){
    syncDraftArchiveFromMatches(matchHistoryData());
    if(!$("analysisDashboard").classList.contains("hidden"))renderAnalysis();
  }
});
$("dbConnectBtn")?.addEventListener("click",async()=>{
  const code=prompt("Lagkoden behövs bara för att spara eller radera matcher. Ange Riftensräksallads lagkod:");
  if(!code)return;
  try{
    await window.RiftSharedData.connect(code);
    syncDraftArchiveFromMatches(matchHistoryData());
    renderAnalysis();
  }catch{
    alert("Lagkoden kunde inte verifieras.");
  }
});
$("dbSyncBtn")?.addEventListener("click",async()=>{
  await window.RiftSharedData?.sync?.();
  syncDraftArchiveFromMatches(matchHistoryData());
  renderAnalysis();
});
renderDbStatus();
queueMicrotask(()=>refreshPlannerData());

function setTrainerNav(active){
  $("homeTabs").classList.toggle("hidden",active);
  $("homeBtn").classList.toggle("hidden",!active);
  $("undoBtn").classList.toggle("hidden",!active);
  $("resetBtn").classList.toggle("hidden",!active);
}

function goHome(){
  mode=null;userSide=null;picks=[];step=0;currentScenario=null;selectedTestOpponentId="";
  enemyRoleOrder=[];scenarioEnemyPlan=[];
  if($("testOpponentSelect"))$("testOpponentSelect").disabled=false;
  $("modeSelect").classList.remove("hidden");
  $("setup").classList.add("hidden");
  $("testBrief").classList.add("hidden");
  $("draftArea").classList.add("hidden");
  $("analysis").classList.add("hidden");
  $("scoreCard").classList.add("hidden");
  $("testFeedback").classList.add("hidden");
  $("testGrade").classList.add("hidden");
  $("championSearch").value="";
  setTrainerNav(false);
  $("analysisDashboard").classList.add("hidden");
  $("banPlannerDashboard")?.classList.add("hidden");
  $("modeSelect").classList.remove("hidden");
  document.querySelector(".comps").classList.remove("hidden");
  $("startTabBtn").classList.add("active");
  $("analysisTabBtn").classList.remove("active");
  $("plannerTabBtn")?.classList.remove("active");
}

function undoPick(){
  if(!userSide||!picks.length)return;

  if(mode==="test"){
    let foundOwn=false;
    while(picks.length){
      const last=picks[picks.length-1];
      picks.pop();
      if(last.side===userSide){foundOwn=true;break;}
    }
    // On red side B1 is auto-seeded before the user's first decision.
    if(!foundOwn){
      prepareEnemyPlan();
      picks=[];step=0;autoEnemy();
      return;
    }
  }else{
    picks.pop();
  }

  step=picks.length;
  $("scoreCard").classList.add("hidden");
  $("testFeedback").classList.add("hidden");
  $("testGrade").classList.add("hidden");
  if(mode==="sim")$("analysis").classList.remove("hidden");
  render();
}

function selectMode(m){
  mode=m;
  setTrainerNav(true);
  $("matchDayDashboard")?.classList.add("hidden");
  $("modeSelect").classList.add("hidden");
  $("setup").classList.remove("hidden");
  $("setupTitle").textContent=m==="test"?"Draft Test — välj sida":"Draft Sim — välj sida";
  if(m==="test"){
    currentScenario=scenarios[Math.floor(Math.random()*scenarios.length)];
    selectedTestOpponentId="";
    if($("testOpponentSelect"))$("testOpponentSelect").disabled=false;
    $("testBrief").classList.remove("hidden");
    renderScenarioBrief();
    refreshTestOpponentOptions();
  }
}

function seedScenarioEnemyPicks(){
  picks=[];step=0;
  autoEnemy();
}

function lockPick(randomEnemy){
  if(step>=order.length)return;
  const turn=order[step];
  const used=new Set(picks.map(p=>p.champ));
  let champ=$("championSearch").value.trim();

  let role=null;
  if(turn.side!==userSide){
    if(mode==="test"||randomEnemy){
      const enemyPick=nextEnemyChampion();
      champ=enemyPick.champ;
      role=enemyPick.role;
    }else{
      $("coachCall").textContent="Slumpa enemy pick.";
      return;
    }
  }

  if(!champions.includes(champ)){$("coachCall").textContent="Välj en champion från listan.";return;}
  if(used.has(champ)){$("coachCall").textContent="Championen är redan pickad.";return;}

  picks.push({...turn,champ,role});
  step++;
  $("championSearch").value="";
  render();

  if(mode==="test") autoEnemy();
}

function autoEnemy(){
  while(step<order.length && order[step].side!==userSide){
    const enemyPick=nextEnemyChampion();
    if(!enemyPick.champ)break;
    picks.push({...order[step],champ:enemyPick.champ,role:enemyPick.role});
    step++;
  }
  render();
}

function render(){
  renderSide("blue","bluePicks"); renderSide("red","redPicks");
  const canUndo=mode==="test"
    ? picks.some(p=>p.side===userSide)
    : picks.length>0;
  $("undoBtn").disabled=!canUndo;
  $("undoBtn").style.opacity=canUndo?"1":".45";
  $("undoBtn").style.cursor=canUndo?"pointer":"not-allowed";

  if(step<order.length){
    const t=order[step];
    $("turnLabel").textContent=t.slot+" · "+t.side.toUpperCase();
    const enemyTurn=t.side!==userSide;
    $("randomEnemyBtn").style.display=(mode==="sim"&&enemyTurn)?"block":"none";
    if(mode==="sim"&&enemyTurn)$("randomEnemyBtn").textContent="Slumpa enemy "+trainerRoleNames[nextEnemyRole()];
    $("lockBtn").style.display=enemyTurn?"none":"block";
    $("championSearch").style.display=enemyTurn?"none":"block";
    document.querySelector('label[for="championSearch"]').style.display=enemyTurn?"none":"block";
    if(mode==="test") $("coachBox").classList.add("hidden");
    else $("coachBox").classList.remove("hidden");
  }else{
    $("turnLabel").textContent="DRAFT KLAR";
    $("lockBtn").style.display="none";
    $("randomEnemyBtn").style.display="none";
    $("championSearch").style.display="none";
    document.querySelector('label[for="championSearch"]').style.display="none";
    $("scoreCard").classList.remove("hidden");
    if(mode==="test") finishTest();
  }

  if(mode==="sim") updateCoach();
  if(step>=order.length) updateScore();
}

function renderSide(side,id){
  const list=$(id);list.innerHTML="";
  [0,1,2,3,4].forEach(i=>{
    const p=picks.filter(x=>x.side===side)[i];
    const div=document.createElement("div");div.className="pick";
    const roleText=p&&p.role?" · "+trainerRoleNames[p.role]:"";
    div.innerHTML='<span class="slot">'+(side==="blue"?"B":"R")+(i+1)+roleText+'</span><span class="champ">'+(p?p.champ:"—")+'</span>';
    list.appendChild(div);
  });
}

function bestComp(ours){
  let bestName=null,best=-1;
  Object.entries(comps).forEach(([name,c])=>{
    const score=ours.reduce((s,ch)=>s+(c.core.includes(ch)?3:c.alts.includes(ch)?1:0),0);
    if(score>best){best=score;bestName=name}
  });
  return {name:bestName,score:best};
}

function updateCoach(){
  const ours=picks.filter(p=>p.side===userSide).map(p=>p.champ);
  const enemies=picks.filter(p=>p.side!==userSide).map(p=>p.champ);
  if(!ours.length){
    $("compName").textContent="Comp: Öppen";$("confidence").textContent="Öppen draft";
    $("compWhy").textContent="Börja med safe/flex: Ashe, Ahri, Taliyah, Nautilus eller Maokai.";
    $("nextFocus").textContent="Se enemy 2–3 picks innan ni låser identiteten.";
    $("watch").textContent="Spara niche/counters till senare.";
    $("coachCall").textContent="SAFE PICK FÖRST. Håll 2 comps öppna.";return;
  }
  const best=bestComp(ours),c=comps[best.name];
  $("compName").textContent="Comp: "+best.name;
  $("confidence").textContent=best.score>=7?"Tydlig riktning":best.score>=3?"Lutar hit":"Öppen";
  $("compWhy").textContent=c.why;$("nextFocus").textContent=c.focus;
  const dive=enemies.filter(ch=>["Vi","Jarvan IV","Wukong","Malphite","Leona","Nocturne","Zac","Rakan","Rell"].includes(ch)).length;
  const melee=enemies.filter(ch=>["Darius","Garen","Renekton","Mordekaiser","Shen","Sion","Malphite","Jarvan IV","Vi","Wukong","Xin Zhao","Udyr","Volibear","Nautilus","Leona","Maokai"].includes(ch)).length;
  $("watch").textContent=dive>=2?"Mycket dive → Xayah/Vex/Taliyah upp i prio.":melee>=3?"Mycket melee → Control/Wukong blir bättre.":"Kolla damage split + frontline innan sista picks.";
  $("coachCall").textContent=c.call;
}

function scoreSet(set,ours){return Math.min(3,ours.filter(x=>set.has(x)).length)}
function updateScore(){
  const ours=picks.filter(p=>p.side===userSide).map(p=>p.champ);
  const e=scoreSet(engage,ours),f=scoreSet(frontline,ours),d=scoreSet(damage,ours),er=scoreSet(early,ours);
  $("engageScore").textContent=e+"/3";$("frontScore").textContent=f+"/3";$("damageScore").textContent=d+"/3";$("earlyScore").textContent=er+"/3";
  const issues=[];if(e<1)issues.push("lite engage");if(f<1)issues.push("ingen tydlig frontline");if(d<2)issues.push("kan sakna damage");if(er<2)issues.push("svagare early");
  $("finalPlan").textContent=issues.length?"WATCH: "+issues.join(" · "):"Bra grund. Spela efter comp-identiteten och konvertera fights till objectives.";
}

function finishTest(){
  const ours=picks.filter(p=>p.side===userSide).map(p=>p.champ);
  const enemy=picks.filter(p=>p.side!==userSide).map(p=>p.champ);
  let reference=currentScenario;
  if(currentScenario?.opponentPlanId){
    const ideal=opponentIdealFromPicks(enemy);
    reference={
      ...currentScenario,
      ideal,
      recommended:[...comps[ideal].core],
      key:[...new Set([...comps[ideal].core,...comps[ideal].alts])],
      avoid:[]
    };
  }
  const best=bestComp(ours);
  let score=0;
  ours.forEach(ch=>{if(reference.key.includes(ch))score+=12;if(reference.recommended.includes(ch))score+=6;if(reference.avoid.includes(ch))score-=10;});
  if(best.name===reference.ideal)score+=20;
  if(score<0)score=0;if(score>100)score=100;

  const grade=score>=85?"S":score>=70?"A":score>=55?"B":score>=40?"C":"D";
  $("testGrade").classList.remove("hidden");$("testGrade").textContent=grade;
  $("resultTitle").textContent=(reference.opponentName?"Draft Test mot "+reference.opponentName:"Draft Test")+": "+score+"/100";
  $("testFeedback").classList.remove("hidden");
  $("idealComp").textContent=reference.ideal;
  $("recommendedPicks").textContent=reference.recommended.join(" / ");

  const good=ours.filter(ch=>reference.key.includes(ch));
  const bad=ours.filter(ch=>reference.avoid.includes(ch));
  $("goodFeedback").textContent=good.length?good.join(", ")+" passade matchupen bra.":"Du hittade inte riktigt de tydligaste comp-picksen den här gången.";
  $("improveFeedback").textContent=bad.length?"Undvik helst "+bad.join(", ")+" i just detta scenario.":"Titta främst på om din comp-riktning matchade "+reference.ideal+" mot det enemy faktiskt visade.";
}
