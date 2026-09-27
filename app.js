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
  return trainerRoles.map((role,i)=>({role,champ:currentScenario.enemy[i]}));
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
    const planned=scenarioEnemyPlan[enemyIndex]?.champ;
    if(planned&&champions.includes(planned)&&!used.has(planned))return {champ:planned,role};
    return {champ:randomChampionForRole(role,used),role};
  }

  return {champ:randomChampionForRole(role,used),role};
}

const engage = new Set(["Malphite","Jarvan IV","Annie","Leona","Nautilus","Maokai","Vi","Wukong","Amumu","Sion","Rakan","Rell","Sejuani","Zac"]);
const frontline = new Set(["Malphite","Jarvan IV","Leona","Nautilus","Maokai","Mordekaiser","Udyr","Volibear","Sion","Shen","Galio","Renekton","Xin Zhao","Wukong","Vi","Poppy","Ornn","Sejuani","Zac"]);
const damage = new Set(["Jinx","Varus","Xayah","Ashe","Viego","Kindred","Graves","Lillia","Taliyah","Hwei","Viktor","Ahri","Annie","Darius","Olaf","Mordekaiser","Xin Zhao","Yone","Caitlyn","Kai'Sa","Lucian","Zeri","Syndra","Orianna"]);
const early = new Set(["Renekton","Xin Zhao","Ahri","Ashe","Nautilus","Leona","Jarvan IV","Volibear","Darius","Olaf","Taliyah","Varus","Vi","Wukong","Poppy","Lee Sin","Lucian","Caitlyn"]);

let mode=null,userSide=null,picks=[],step=0,currentScenario=null;

const $=id=>document.getElementById(id);
champions.forEach(c=>{const o=document.createElement("option");o.value=c;$("champions").appendChild(o)});
loadChampionRoster();

$("simModeBtn").addEventListener("click",()=>selectMode("sim"));
$("testModeBtn").addEventListener("click",()=>selectMode("test"));
$("resetBtn").addEventListener("click",()=>location.reload());
$("lockBtn").addEventListener("click",()=>lockPick(false));
$("randomEnemyBtn").addEventListener("click",()=>lockPick(true));
$("championSearch").addEventListener("keydown",e=>{if(e.key==="Enter")lockPick(false)});

document.querySelectorAll(".side-btn").forEach(btn=>btn.addEventListener("click",()=>{
  userSide=btn.dataset.side;
  $("setup").classList.add("hidden");
  $("draftArea").classList.remove("hidden");
  if(mode==="sim") $("analysis").classList.remove("hidden");
  prepareEnemyPlan();
  if(mode==="test") seedScenarioEnemyPicks();
  else render();
}));

function selectMode(m){
  mode=m;
  $("modeSelect").classList.add("hidden");
  $("setup").classList.remove("hidden");
  $("setupTitle").textContent=m==="test"?"Draft Test — välj sida":"Draft Sim — välj sida";
  if(m==="test"){
    currentScenario=scenarios[Math.floor(Math.random()*scenarios.length)];
    $("testBrief").classList.remove("hidden");
    $("scenarioTitle").textContent=currentScenario.title;
    $("scenarioBrief").textContent=currentScenario.brief;
    $("scenarioGoal").textContent="Mål: "+currentScenario.goal;
    $("scenarioDifficulty").textContent="Svårighet: "+currentScenario.difficulty;
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
  const best=bestComp(ours);
  let score=0;
  ours.forEach(ch=>{if(currentScenario.key.includes(ch))score+=12;if(currentScenario.recommended.includes(ch))score+=6;if(currentScenario.avoid.includes(ch))score-=10;});
  if(best.name===currentScenario.ideal)score+=20;
  if(score<0)score=0;if(score>100)score=100;

  const grade=score>=85?"S":score>=70?"A":score>=55?"B":score>=40?"C":"D";
  $("testGrade").classList.remove("hidden");$("testGrade").textContent=grade;
  $("resultTitle").textContent="Draft Test: "+score+"/100";
  $("testFeedback").classList.remove("hidden");
  $("idealComp").textContent=currentScenario.ideal;
  $("recommendedPicks").textContent=currentScenario.recommended.join(" / ");

  const good=ours.filter(ch=>currentScenario.key.includes(ch));
  const bad=ours.filter(ch=>currentScenario.avoid.includes(ch));
  $("goodFeedback").textContent=good.length?good.join(", ")+" passade scenariot bra.":"Du hittade inte riktigt scenario-picksen den här gången.";
  $("improveFeedback").textContent=bad.length?"Undvik helst "+bad.join(", ")+" i just detta scenario.":"Titta främst på om din comp-riktning matchade "+currentScenario.ideal+".";
}
