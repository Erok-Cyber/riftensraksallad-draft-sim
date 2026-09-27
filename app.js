const champions = [
"Ahri","Amumu","Anivia","Annie","Ashe","Darius","Galio","Garen","Graves","Heimerdinger","Hwei","Jarvan IV","Jinx","Kindred","Leona","Malphite","Maokai","Mordekaiser","Nautilus","Olaf","Renekton","Senna","Shen","Sion","Sylas","Taliyah","Trundle","Udyr","Varus","Vex","Vi","Viego","Viktor","Volibear","Wukong","Xayah","Xin Zhao",
"Aatrox","Akali","Alistar","Ambessa","Aphelios","Aurora","Azir","Braum","Caitlyn","Camille","Cassiopeia","Ezreal","Fiora","Gnar","Gragas","Ivern","Jax","Jayce","Kai'Sa","Kalista","Kennen","K'Sante","Lee Sin","Lucian","Lulu","Nami","Nocturne","Orianna","Ornn","Poppy","Rakan","Rell","Rumble","Ryze","Sejuani","Skarner","Smolder","Syndra","Tahm Kench","Tristana","Twisted Fate","Yone","Yunara","Zac","Zeri"
].sort();

const order = [
{side:"blue",slot:"B1"},{side:"red",slot:"R1"},{side:"red",slot:"R2"},
{side:"blue",slot:"B2"},{side:"blue",slot:"B3"},
{side:"red",slot:"R3"},{side:"red",slot:"R4"},
{side:"blue",slot:"B4"},{side:"blue",slot:"B5"},{side:"red",slot:"R5"}
];

const comps = {
  "EARLY SKIRMISH":{
    core:["Renekton","Xin Zhao","Ahri","Ashe","Nautilus"],
    alts:["Garen","Darius","Mordekaiser","Olaf","Trundle","Viego","Wukong","Volibear","Taliyah","Vex","Sylas","Varus","Xayah","Leona","Maokai"],
    why:"Prio + starka 2v2/3v3. Vill fightas tidigt och spela för första objectives.",
    focus:"Prio först. Fighta inte river om lanes sitter fast under tower.",
    call:"PRIO → FIGHT → OBJECTIVE. Chasa inte nästa kill."
  },
  "PRESS R":{
    core:["Malphite","Jarvan IV","Annie","Jinx","Leona"],
    alts:["Galio","Mordekaiser","Shen","Sion","Xin Zhao","Vi","Wukong","Viego","Vex","Hwei","Taliyah","Viktor","Ashe","Xayah","Nautilus","Maokai"],
    why:"Enkel 5v5. Flera tydliga GO-knappar och bra chain CC.",
    focus:"Håll engage-cooldowns. Jinx ska inte starta fighten.",
    call:"HITTA CARRY → PRESS R → CHAIN CC → JINX RESET."
  },
  "OBJECTIVE CONTROL":{
    core:["Mordekaiser","Udyr","Taliyah","Varus","Maokai"],
    alts:["Sion","Shen","Galio","Heimerdinger","Volibear","Xin Zhao","Hwei","Ahri","Viktor","Anivia","Ashe","Xayah","Nautilus","Leona"],
    why:"Kom först till river och tvinga enemy att gå in i er.",
    focus:"Push waves, reset tidigt, setup vision. JAGA INTE.",
    call:"PUSH → RESET → RIVER → HÅLL CHOKES → TURNA."
  },
  "JUNGLE CARRY":{
    core:["Shen","Kindred","Taliyah","Ashe","Nautilus"],
    alts:["Malphite","Sion","Mordekaiser","Graves","Viego","Ahri","Hwei","Viktor","Varus","Senna","Xayah","Leona","Maokai"],
    why:"Lanes ska enablea jungle med prio, setup och vision.",
    focus:"Kindred kräver prio. Ingen prio = byt till Viego eller annan comp.",
    call:"LANES FÅR PRIO → JG TAR RIVER/ENEMY CAMPS → SPELA RUNT JG."
  }
};

const engage = new Set(["Malphite","Jarvan IV","Annie","Leona","Nautilus","Maokai","Vi","Wukong","Amumu","Sion","Rakan","Rell","Sejuani","Zac"]);
const frontline = new Set(["Malphite","Jarvan IV","Leona","Nautilus","Maokai","Mordekaiser","Udyr","Volibear","Sion","Shen","Galio","Renekton","Xin Zhao","Wukong","Vi","Poppy","Ornn","Sejuani","Zac"]);
const damage = new Set(["Jinx","Varus","Xayah","Ashe","Viego","Kindred","Graves","Taliyah","Hwei","Viktor","Ahri","Annie","Darius","Olaf","Mordekaiser","Xin Zhao","Yone","Caitlyn","Kai'Sa","Lucian","Zeri","Syndra","Orianna"]);
const early = new Set(["Renekton","Xin Zhao","Ahri","Ashe","Nautilus","Leona","Jarvan IV","Volibear","Darius","Olaf","Taliyah","Varus","Vi","Wukong","Poppy","Lee Sin","Lucian","Caitlyn"]);

let userSide = null;
let picks = [];
let step = 0;

const $ = id => document.getElementById(id);
champions.forEach(c=>{const o=document.createElement("option");o.value=c;$("champions").appendChild(o)});

document.querySelectorAll(".side-btn").forEach(btn=>btn.addEventListener("click",()=>{
  userSide=btn.dataset.side;
  $("setup").classList.add("hidden");
  $("draftArea").classList.remove("hidden");
  $("analysis").classList.remove("hidden");
  render();
}));

$("lockBtn").addEventListener("click",()=>lockPick(false));
$("randomEnemyBtn").addEventListener("click",()=>lockPick(true));
$("resetBtn").addEventListener("click",()=>location.reload());
$("championSearch").addEventListener("keydown",e=>{if(e.key==="Enter")lockPick(false)});

function lockPick(randomEnemy){
  if(step>=order.length) return;
  const turn=order[step];
  const used=new Set(picks.map(p=>p.champ));
  let champ=$("championSearch").value.trim();

  if(randomEnemy){
    if(turn.side===userSide){$("coachCall").textContent="Det är er tur — välj champion själv.";return;}
    const pool=champions.filter(c=>!used.has(c));
    champ=pool[Math.floor(Math.random()*pool.length)];
  }

  if(!champions.includes(champ)){$("coachCall").textContent="Välj en champion från listan.";return;}
  if(used.has(champ)){$("coachCall").textContent="Championen är redan pickad.";return;}

  picks.push({...turn,champ});
  step++;
  $("championSearch").value="";
  render();
}

function render(){
  renderSide("blue","bluePicks");
  renderSide("red","redPicks");

  if(step<order.length){
    const t=order[step];
    $("turnLabel").textContent=`${t.slot} · ${t.side.toUpperCase()}`;
    const enemyTurn=t.side!==userSide;
    $("randomEnemyBtn").style.display=enemyTurn?"block":"none";
    $("lockBtn").style.display=enemyTurn?"none":"block";
  } else {
    $("turnLabel").textContent="DRAFT KLAR";
    $("lockBtn").style.display="none";
    $("randomEnemyBtn").style.display="none";
    $("scoreCard").classList.remove("hidden");
  }

  updateCoach();
  if(step>=order.length) updateScore();
}

function renderSide(side,id){
  const list=$(id); list.innerHTML="";
  ["1","2","3","4","5"].forEach((_,i)=>{
    const p=picks.filter(x=>x.side===side)[i];
    const div=document.createElement("div");div.className="pick";
    div.innerHTML=`<span class="slot">${side==="blue"?"B":"R"}${i+1}</span><span class="champ">${p?p.champ:"—"}</span>`;
    list.appendChild(div);
  });
}

function updateCoach(){
  const ours=picks.filter(p=>p.side===userSide).map(p=>p.champ);
  const enemies=picks.filter(p=>p.side!==userSide).map(p=>p.champ);

  let bestName=null,best=-1;
  Object.entries(comps).forEach(([name,c])=>{
    const score=ours.reduce((s,ch)=>s+(c.core.includes(ch)?3:c.alts.includes(ch)?1:0),0);
    if(score>best){best=score;bestName=name;}
  });

  if(!ours.length){
    $("compName").textContent="Comp: Öppen";
    $("confidence").textContent="Öppen draft";
    $("compWhy").textContent="Börja med safe/flex: Ashe, Ahri, Taliyah, Nautilus eller Maokai.";
    $("nextFocus").textContent="Se enemy 2–3 picks innan ni låser hela identiteten.";
    $("watch").textContent="Spara niche/counters till senare.";
    $("coachCall").textContent="SAFE PICK FÖRST. Håll 2 comps öppna.";
    return;
  }

  const c=comps[bestName];
  $("compName").textContent="Comp: "+bestName;
  $("confidence").textContent=best>=7?"Tydlig riktning":best>=3?"Lutar hit":"Öppen";
  $("compWhy").textContent=c.why;
  $("nextFocus").textContent=c.focus;

  const enemyDive=enemies.filter(ch=>["Vi","Jarvan IV","Wukong","Malphite","Leona","Nocturne","Zac","Rakan","Rell"].includes(ch)).length;
  const enemyMelee=enemies.filter(ch=>["Darius","Garen","Renekton","Mordekaiser","Shen","Sion","Malphite","Jarvan IV","Vi","Wukong","Xin Zhao","Udyr","Volibear","Nautilus","Leona","Maokai"].includes(ch)).length;
  $("watch").textContent=enemyDive>=2?"Mycket dive → Xayah/Vex/Taliyah upp i prio.":enemyMelee>=3?"Mycket melee → Control/Wukong blir bättre.":"Kolla damage split + frontline innan sista picks.";
  $("coachCall").textContent=c.call;
}

function scoreSet(set,ours){return Math.min(3,ours.filter(x=>set.has(x)).length)}
function updateScore(){
  const ours=picks.filter(p=>p.side===userSide).map(p=>p.champ);
  const e=scoreSet(engage,ours),f=scoreSet(frontline,ours),d=scoreSet(damage,ours),er=scoreSet(early,ours);
  $("engageScore").textContent=e+"/3";$("frontScore").textContent=f+"/3";$("damageScore").textContent=d+"/3";$("earlyScore").textContent=er+"/3";
  const issues=[];
  if(e<1)issues.push("lite engage");
  if(f<1)issues.push("ingen tydlig frontline");
  if(d<2)issues.push("kan sakna damage");
  if(er<2)issues.push("svagare early");
  $("finalPlan").textContent=issues.length?"WATCH: "+issues.join(" · "):"Bra grund. Spela efter comp-identiteten och konvertera picks/fights till objectives.";
}
