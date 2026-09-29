/* Shared Ban Planner for Riftensräksallad. */
(function(){
  const CACHE_KEY="rs_ban_plans_cache";
  const TEAM_KEY_STORAGE="rs_team_access_key";
  let plans=[];
  let selectedId=null;
  let editing=false;
  let loading=false;
  let cmPollTimer=null;
  let cmApiState={configured:null,error:""};
  const cmSyncingIds=new Set();
  const scoutingIds=new Set();
  const autoScoutAttempted=new Set();

  const $=id=>document.getElementById(id);
  const cfg=()=>window.RIFT_DB_CONFIG||{};
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  const nl=value=>esc(value||"").replace(/\n/g,"<br>");
  const teamKey=()=>localStorage.getItem(TEAM_KEY_STORAGE)||"";
  const hasKey=()=>!!teamKey();

  function endpoint(query=""){
    return String(cfg().plannerFunctionUrl||"").replace(/\/$/,"")+query;
  }
  function headers(){
    const h={"Content-Type":"application/json"};
    if(teamKey())h["x-team-key"]=teamKey();
    return h;
  }
  async function request(method,query="",body=null){
    const res=await fetch(endpoint(query),{
      method,
      headers:headers(),
      body:body==null?undefined:JSON.stringify(body)
    });
    const txt=await res.text().catch(()=>"");
    let data={};
    try{data=txt?JSON.parse(txt):{}}catch{data={error:txt}}
    if(!res.ok)throw new Error(data.error||("Planner "+res.status));
    return data;
  }
  function rowToPlan(row){
    const p=row.payload||{};
    return {...p,id:row.id||p.id,opponent:row.opponent||p.opponent,scheduledAt:row.scheduled_at||p.scheduledAt,status:row.status||p.status,updatedAt:row.updated_at||p.updatedAt};
  }
  function cache(){
    try{return JSON.parse(localStorage.getItem(CACHE_KEY)||"[]")}catch{return[]}
  }
  function writeCache(list){
    localStorage.setItem(CACHE_KEY,JSON.stringify(list));
  }
  function normalize(plan){
    return {
      id:plan.id,
      opponent:plan.opponent||"Motståndare",
      scheduledAt:plan.scheduledAt||new Date().toISOString(),
      status:plan.status||"upcoming",
      bestOf:Number(plan.bestOf)||3,
      opggUrl:plan.opggUrl||"",
      challengermodeUrl:plan.challengermodeUrl||"",
      challengermodeTeamUrl:plan.challengermodeTeamUrl||"",
      challengermodeTournamentId:plan.challengermodeTournamentId||"",
      challengermodeTeamName:plan.challengermodeTeamName||plan.opponent||"",
      challengermode:plan.challengermode||null,
      competitiveEvidence:plan.competitiveEvidence||null,
      competition:plan.competition||"",
      scoutingConfidence:plan.scoutingConfidence||"preliminary",
      scoutingUpdatedAt:plan.scoutingUpdatedAt||"",
      scoutingSource:plan.scoutingSource||"",
      scoutingStatus:plan.scoutingStatus||"",
      scoutingError:plan.scoutingError||"",
      scoutingPlayers:Array.isArray(plan.scoutingPlayers)?plan.scoutingPlayers:[],
      scoutingSummary:plan.scoutingSummary||null,
      scoutingDetails:plan.scoutingDetails||null,
      players:Array.isArray(plan.players)?plan.players:[],
      banPriority:Array.isArray(plan.banPriority)?plan.banPriority:[],
      phase1Plan:plan.phase1Plan||{b1:"",b2:"",b3:"",note:""},
      conditionalBans:Array.isArray(plan.conditionalBans)?plan.conditionalBans:[],
      ourFallbacks:Array.isArray(plan.ourFallbacks)?plan.ourFallbacks:[],
      gameNotes:plan.gameNotes||{preSeries:"",game1:"",game2:"",general:""}
    };
  }
  function current(){
    return normalize(plans.find(p=>p.id===selectedId)||plans[0]||{});
  }
  const SCOUT_ROLES=["top","jungle","mid","adc","support"];
  const SCOUT_ROLE_NAMES={top:"TOP",jungle:"JUNGLE",mid:"MID",adc:"ADC",support:"SUPPORT"};
  const SCOUT_ROLE_POOLS={
    top:new Set(["Aatrox","Ambessa","Camille","Darius","Fiora","Galio","Garen","Gnar","Gragas","Gwen","Heimerdinger","Jax","Jayce","Kayle","Kennen","K'Sante","Malphite","Mordekaiser","Olaf","Ornn","Poppy","Renekton","Rumble","Shen","Sion","Tahm Kench","Trundle","Tryndamere","Yone","Yorick","Dr. Mundo"]),
    jungle:new Set(["Amumu","Diana","Ekko","Gragas","Graves","Ivern","Jarvan IV","Kayn","Kindred","Lee Sin","Lillia","Nocturne","Nunu & Willump","Poppy","Sejuani","Skarner","Trundle","Udyr","Vi","Viego","Volibear","Wukong","Xin Zhao","Zac"]),
    mid:new Set(["Ahri","Akali","Anivia","Annie","Aurora","Azir","Cassiopeia","Diana","Ekko","Galio","Hwei","LeBlanc","Malzahar","Orianna","Ryze","Sylas","Syndra","Taliyah","Tristana","Twisted Fate","Vex","Viktor","Yone","Zed","Zoe"]),
    adc:new Set(["Aphelios","Ashe","Caitlyn","Corki","Ezreal","Jinx","Kai'Sa","Kalista","Lucian","Miss Fortune","Samira","Senna","Sivir","Smolder","Tristana","Varus","Xayah","Yunara","Zeri"]),
    support:new Set(["Alistar","Bard","Blitzcrank","Braum","Janna","Leona","Lulu","Maokai","Milio","Nami","Nautilus","Pantheon","Poppy","Pyke","Rakan","Rell","Senna","Seraphine","Tahm Kench","Thresh","Zilean"])
  };
  function scoutRoleScore(player,role){
    return (player?.topChampions||[]).slice(0,8).reduce((sum,c,i)=>{
      if(!SCOUT_ROLE_POOLS[role]?.has(c.champ))return sum;
      const games=Number(c.seasonGames||c.recentGames||0);
      return sum+(9-i)*(1+Math.log2(games+2));
    },0);
  }
  function scoutLineup(plan){
    const players=(plan?.scoutingPlayers||[])
      .filter(p=>p?.found!==false&&Array.isArray(p?.topChampions))
      .slice(0,12);
    const cmRoster=Array.isArray(plan?.competitiveEvidence?.currentRoster)
      ?plan.competitiveEvidence.currentRoster.filter(Boolean).slice(0,5)
      :[];

    const playerForRow=row=>{
      const riot=String(row?.riotId||"").trim().toLowerCase();
      if(riot){
        const exact=players.find(p=>String(p?.riotId||"").trim().toLowerCase()===riot);
        if(exact)return exact;
      }
      return {
        riotId:row?.riotId||row?.player||"Okänd spelare",
        found:false,
        tier:"",
        topChampions:[]
      };
    };
    const makeEntry=(row,player,role,source,confidence)=>{
      let pool=(player?.topChampions||[]).filter(c=>SCOUT_ROLE_POOLS[role]?.has(c.champ));
      if(pool.length<2)pool=[...(player?.topChampions||[])];
      pool=pool
        .filter((c,idx,arr)=>c?.champ&&arr.findIndex(x=>x.champ===c.champ)===idx)
        .slice(0,6);
      return {
        role,
        roleName:SCOUT_ROLE_NAMES[role]||String(role||"").toUpperCase(),
        roleConfidence:confidence,
        source,
        cmUsername:row?.player||"",
        player,
        pool
      };
    };

    // Challengermode owns the five starters. Never let a sub enter the
    // displayed starting five just because OP.GG makes its pool look plausible.
    if(cmRoster.length){
      const starterRows=cmRoster.map(row=>({
        row,
        player:playerForRow(row),
        lockedRole:SCOUT_ROLES.includes(String(row?.role||"").toLowerCase())
          ?String(row.role).toLowerCase()
          :""
      }));

      const lockedRoles=new Set(starterRows.map(x=>x.lockedRole).filter(Boolean));
      const remainingRoles=SCOUT_ROLES.filter(role=>!lockedRoles.has(role));
      const unresolved=starterRows.filter(x=>!x.lockedRole);

      let best={score:-Infinity,assign:[]};
      const walk=(i,left,assign,score)=>{
        if(i>=unresolved.length){
          if(score>best.score)best={score,assign:[...assign]};
          return;
        }
        if(!left.length){
          if(score>best.score)best={score,assign:[...assign]};
          return;
        }
        left.forEach((role,idx)=>{
          const next=left.slice();
          next.splice(idx,1);
          walk(i+1,next,[...assign,role],score+scoutRoleScore(unresolved[i].player,role));
        });
      };
      walk(0,remainingRoles,[],0);

      let unresolvedIndex=0;
      const entries=starterRows.map(item=>{
        if(item.lockedRole){
          return makeEntry(item.row,item.player,item.lockedRole,"challengermode",100);
        }
        const role=best.assign[unresolvedIndex++]||remainingRoles[unresolvedIndex-1]||"";
        const candidateScores=remainingRoles.map(r=>scoutRoleScore(item.player,r));
        const total=candidateScores.reduce((a,b)=>a+b,0);
        const score=scoutRoleScore(item.player,role);
        const confidence=total?Math.max(1,Math.round(score/total*100)):0;
        return makeEntry(item.row,item.player,role,"challengermode-inferred",confidence);
      });

      return entries.sort((a,b)=>SCOUT_ROLES.indexOf(a.role)-SCOUT_ROLES.indexOf(b.role));
    }

    // No competitive lineup yet: fall back to the old OP.GG-only inference.
    const usable=players.filter(p=>Array.isArray(p?.topChampions)&&p.topChampions.length).slice(0,5);
    if(!usable.length)return [];

    const roles=SCOUT_ROLES.slice();
    let best={score:-1,assign:[]};
    const walk=(i,left,assign,score)=>{
      if(i>=usable.length||!left.length){
        if(score>best.score)best={score,assign:[...assign]};
        return;
      }
      left.forEach((role,idx)=>{
        const next=left.slice();
        next.splice(idx,1);
        walk(i+1,next,[...assign,role],score+scoutRoleScore(usable[i],role));
      });
    };
    walk(0,roles,[],0);

    return usable.map((player,i)=>{
      const role=best.assign[i]||roles[i]||"";
      const scores=SCOUT_ROLES.map(r=>scoutRoleScore(player,r));
      const total=scores.reduce((a,b)=>a+b,0);
      const roleScore=scoutRoleScore(player,role);
      return makeEntry(
        {player:player.riotId,riotId:player.riotId},
        player,
        role,
        "opgg-inferred",
        total?Math.round(roleScore/total*100):0
      );
    }).sort((a,b)=>SCOUT_ROLES.indexOf(a.role)-SCOUT_ROLES.indexOf(b.role));
  }
  function scoutProfileCard(entry){
    const p=entry.player||{};
    const champRows=(entry.pool||[]).slice(0,4).map(c=>{
      const games=Number(c.seasonGames||c.recentGames||0);
      const wr=Number(c.seasonWinrate||c.recentWinrate||0);
      return '<div class="planner-profile-champ"><strong>'+esc(c.champ)+'</strong><span>'+esc(games?games+" matcher":"sample saknas")+(games?' · '+esc(wr)+'% WR':'')+'</span></div>';
    }).join("");
    return '<article class="planner-scout-profile">'+
      '<div class="planner-scout-profile-head"><div><span class="planner-role-chip">'+esc(entry.roleName)+'</span><strong>'+esc(p.riotId||"Okänd spelare")+'</strong></div>'+
      '<small>'+esc(p.tier||"UNRANKED")+
        (entry.source==="challengermode"
          ?' · RIVALS-roll'
          :entry.source==="challengermode-inferred"
            ?' · CM-starter · rollsignal '+esc(entry.roleConfidence||0)+'%'
            :entry.roleConfidence
              ?' · rollsignal '+esc(entry.roleConfidence)+'%'
              :' · roll osäker')+
      '</small></div>'+
      '<div class="planner-profile-champs">'+(champRows||'<span class="analysis-note">Ingen championdata.</span>')+'</div>'+
    '</article>';
  }
  function getPlans(){return sortPlans(plans.map(normalize))}
  function selectPlan(id){
    if(!plans.some(p=>p.id===id))return false;
    selectedId=id;editing=false;render();return true;
  }
  function sortPlans(list){
    return [...list].sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt));
  }
  function dateText(iso){
    const d=new Date(iso);
    if(isNaN(d))return iso||"—";
    return d.toLocaleString("sv-SE",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  }
  function cmLinkKind(raw){
    try{
      const u=new URL(String(raw||""));
      const p=u.pathname.toLowerCase();
      if(p.includes("/tournaments/"))return "tournament";
      if(p.includes("/teams/"))return "team";
      return "unknown";
    }catch{
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(raw||"").trim())?"tournament":"unknown";
    }
  }
  function safeCmUrl(raw){
    try{
      const u=new URL(String(raw||""));
      const host=u.hostname.toLowerCase();
      if(!["http:","https:"].includes(u.protocol))return "";
      if(host!=="challengermode.com"&&host!=="www.challengermode.com"&&!host.endsWith(".challengermode.com"))return "";
      return u.href;
    }catch{return ""}
  }
  function cmTime(iso){
    const d=new Date(iso);
    if(isNaN(d))return "—";
    return d.toLocaleString("sv-SE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  }
  function cmRosterHtml(plan){
    const cm=plan?.challengermode;
    if(!cm)return "";
    const activePlayers=Array.isArray(cm.activePlayers)&&cm.activePlayers.length
      ?cm.activePlayers
      :(Array.isArray(cm.activeRoster)?cm.activeRoster.map(username=>({username,riotId:""})):[]);
    const registeredPlayers=Array.isArray(cm.registeredPlayers)&&cm.registeredPlayers.length
      ?cm.registeredPlayers
      :(Array.isArray(cm.registeredRoster)?cm.registeredRoster.map(username=>({username,riotId:""})):[]);
    const subPlayers=Array.isArray(cm.substitutePlayers)&&cm.substitutePlayers.length
      ?cm.substitutePlayers
      :(Array.isArray(cm.substitutes)?cm.substitutes.map(username=>({username,riotId:""})):[]);
    const recent=(cm.series||[]).slice(-4).reverse();
    const person=row=>'<div class="planner-cm-person"><strong>'+esc(row.username||"Okänd")+'</strong>'+
      '<span>'+(row.riotId?'Playing as '+esc(row.riotId):'Riot ID saknas')+'</span></div>';
    return '<section class="planner-section planner-cm-section">'+
      '<div class="planner-section-head"><h3>Challengermode Live</h3><span class="planner-cm-badge '+(cm.rosterChanged?'changed':'live')+'">'+(cm.rosterChanged?'ROSTER ÄNDRAD':'LIVE')+'</span></div>'+
      '<div class="planner-cm-meta"><strong>'+esc(cm.teamName||plan.challengermodeTeamName||plan.opponent)+'</strong>'+
        '<span>'+esc(cm.tournamentName||"Rivals")+' · '+esc(cm.tournamentState||"")+'</span>'+
        '<small>Senast synkad '+esc(cmTime(cm.lastSyncedAt))+'</small></div>'+
      '<div class="planner-cm-resolve">'+
        '<strong>'+esc(cm.riotIdsResolved||0)+'/'+esc(cm.rosterSize||cm.registeredPlayers?.length||5)+' rosterkonton lösta · '+esc(cm.activeRiotIdsResolved||0)+'/5 starters</strong>'+
        '<span>'+(cm.generatedOpggUrl?'OP.GG Multisearch innehåller hela aktuella rostern inklusive subs.':'När Riot IDs hittas byggs OP.GG Multisearch automatiskt.')+'</span>'+
      '</div>'+
      '<div class="planner-cm-grid">'+
        '<div><span>AKTIV LINEUP</span><div class="planner-cm-people">'+(activePlayers.length?activePlayers.map(person).join(""):'<em>Ingen spelad lineup ännu</em>')+'</div></div>'+
        '<div><span>SUBS / ÖVRIG ROSTER</span><div class="planner-cm-people">'+(subPlayers.length?subPlayers.map(person).join(""):(registeredPlayers.length?'<em>Inga subs identifierade ännu</em>':'<em>Ingen rosterdata</em>'))+'</div></div>'+
      '</div>'+
      (recent.length?'<div class="planner-cm-history">'+recent.map(series=>'<div><strong>Serie '+esc(series.ordinal||"—")+'</strong><span>'+esc(series.state||"")+(series.score!=null?' · score '+esc(series.score):'')+'</span><small>'+esc((series.matches||[]).map(m=>m.state||"").filter(Boolean).join(" / "))+'</small></div>').join("")+'</div>':'')+
    '</section>';
  }
  function toLocalInput(iso){
    const d=new Date(iso);
    if(isNaN(d))return "";
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }
  function updateDbBadge(){
    const el=$("plannerDbBadge");
    if(!el)return;
    el.classList.toggle("write",hasKey());
    el.textContent=hasKey()?"Delad · skrivning":"Delad · läsning";
  }
  async function ensureWrite(){
    if(hasKey())return true;
    const code=prompt("Lagkoden behövs för att ändra Ban Planner:");
    if(!code)return false;
    try{
      if(window.RiftSharedData?.connect)await window.RiftSharedData.connect(code);
      else localStorage.setItem(TEAM_KEY_STORAGE,code.trim());
      updateDbBadge();
      return true;
    }catch{
      alert("Fel lagkod.");
      return false;
    }
  }
  async function load(){
    if(loading)return;
    loading=true;
    const cached=cache().map(normalize);
    if(cached.length){
      plans=sortPlans(cached);
      if(!selectedId)selectedId=plans.find(p=>p.status==="upcoming")?.id||plans[0]?.id;
      render();
    }
    try{
      const data=await request("GET");
      if(data?.capabilities&&typeof data.capabilities.challengermode==="boolean"){
        cmApiState.configured=data.capabilities.challengermode;
        cmApiState.error="";
      }
      plans=sortPlans((data.plans||[]).map(rowToPlan).map(normalize));
      writeCache(plans);
      if(!selectedId||!plans.some(p=>p.id===selectedId))selectedId=plans.find(p=>p.status==="upcoming")?.id||plans[0]?.id||null;
      render();
      queueAutoScout();
    }catch(err){
      console.warn("Ban Planner sync failed; using cache.",err);
      if(!plans.length)renderError("Kunde inte läsa den delade Ban Planner-databasen.");
    }finally{
      loading=false;
    }
  }
  function renderError(message){
    const list=$("plannerMatchList"),detail=$("plannerDetail");
    if(list)list.innerHTML='<div class="planner-loading">'+esc(message)+'</div>';
    if(detail)detail.innerHTML='<div class="planner-empty"><strong>Planner offline</strong><p>'+esc(message)+'</p></div>';
  }
  function renderList(){
    const list=$("plannerMatchList");
    if(!list)return;
    $("plannerMatchCount").textContent=plans.length+" matcher";
    if(!plans.length){
      list.innerHTML='<div class="planner-loading">Inga planerade matcher ännu.</div>';
      return;
    }
    list.innerHTML=plans.map(p=>{
      const status=p.status==="completed"?"KLAR":p.status==="cancelled"?"INSTÄLLD":"KOMMANDE";
      return '<button type="button" class="planner-match-card '+(p.id===selectedId?"active":"")+'" data-plan-id="'+esc(p.id)+'">'+
        '<span class="top"><strong>'+esc(p.opponent)+'</strong><span class="status '+esc(p.status)+'">'+status+'</span></span>'+
        '<span class="date">'+esc(dateText(p.scheduledAt))+' · BO'+esc(p.bestOf||3)+'</span>'+
        '<small>'+(scoutingIds.has(p.id)?'Scoutar OP.GG…':esc((p.phase1Plan?.b1||"—")+" / "+(p.phase1Plan?.b2||"—")+" / "+(p.phase1Plan?.b3||"—")))+'</small>'+
      '</button>';
    }).join("");
  }
  function renderRead(plan){
    const detail=$("plannerDetail");
    const bans=(plan.banPriority||[]).slice(0,5);
    const conditionals=plan.conditionalBans||[];
    const fallbacks=plan.ourFallbacks||[];
    const notes=plan.gameNotes||{};
    detail.innerHTML=
      '<div class="planner-detail-head">'+
        '<div><p class="eyebrow">KOMMANDE MATCH</p><h2>'+esc(plan.opponent)+'</h2>'+
          '<div class="planner-meta">'+esc(dateText(plan.scheduledAt))+' · BO'+esc(plan.bestOf)+(plan.competition?' · '+esc(plan.competition):'')+' · '+esc(plan.status.toUpperCase())+'</div></div>'+
        '<div class="planner-detail-actions">'+
          (plan.opggUrl?'<a class="planner-link" href="'+esc(plan.opggUrl)+'" target="_blank" rel="noopener">OP.GG ↗</a>':'')+
          (safeCmUrl(plan.challengermodeUrl)?'<a class="planner-link cm" href="'+esc(safeCmUrl(plan.challengermodeUrl))+'" target="_blank" rel="noopener">Challengermode ↗</a>':'')+
          (hasKey()&&plan.challengermodeUrl?'<button type="button" class="planner-cm-sync-btn" data-planner-action="cm-sync" '+(cmSyncingIds.has(plan.id)?'disabled':'')+'>'+(cmSyncingIds.has(plan.id)?'Synkar CM…':'Synka CM')+'</button>':'')+
          (hasKey()&&plan.opggUrl&&(plan.players||[]).length?'<button type="button" class="planner-scout-btn" data-planner-action="scout" '+(scoutingIds.has(plan.id)?'disabled':'')+'>'+(scoutingIds.has(plan.id)?'Scoutar…':'Scouta om')+'</button>':'')+
          '<button type="button" class="planner-edit-btn" data-planner-action="edit">Redigera plan</button>'+
          (hasKey()?'<button type="button" class="planner-delete-btn" data-planner-action="delete">Radera match</button>':'')+
        '</div>'+
      '</div>'+
      '<div class="planner-phase1">'+
        ['b1','b2','b3'].map((k,i)=>'<div class="planner-ban-call"><span>B'+(i+1)+'</span><strong>'+esc(plan.phase1Plan?.[k]||"Öppen")+'</strong></div>').join("")+
      '</div>'+
      '<p class="planner-ban-note">'+esc(plan.phase1Plan?.note||"")+'</p>'+
      '<section class="planner-section">'+
        '<div class="planner-section-head"><h3>Scouting</h3><span class="planner-scout-badge '+esc(plan.scoutingStatus||"")+'">'+esc((plan.scoutingConfidence||"preliminary").toUpperCase())+'</span></div>'+
        '<div class="planner-player-grid">'+(plan.players||[]).map(x=>'<span class="planner-player">'+esc(x)+'</span>').join("")+'</div>'+
        '<p class="analysis-note" style="margin:9px 0 0">'+
          (scoutingIds.has(plan.id)?'Hämtar champion-volym, winrate och senaste ranked från OP.GG…':
            (plan.scoutingUpdatedAt?esc((plan.scoutingSource||"OP.GG")+' · uppdaterad '+plan.scoutingUpdatedAt):'Riot IDs hittade · scouting väntar'))+
        '</p>'+
        (plan.scoutingError?'<div class="planner-scout-warning">'+esc(plan.scoutingError)+'</div>':'')+
        (scoutLineup(plan).length?'<div class="planner-scout-profile-grid">'+scoutLineup(plan).map(scoutProfileCard).join("")+'</div>':'')+
      '</section>'+
      (plan.challengermode?cmRosterHtml(plan):(plan.challengermodeUrl?'<section class="planner-section planner-cm-section"><div class="planner-section-head"><h3>Challengermode Live</h3><span class="planner-cm-badge pending">VÄNTAR</span></div><p class="analysis-note">'+esc(cmApiState.error||'Turneringen är länkad. Synka för roster, subs och matchhistorik.')+'</p></section>':''))+
      '<section class="planner-section">'+
        '<div class="planner-section-head"><h3>Ban-prioritet</h3><span class="analysis-note">3–5 champs</span></div>'+
        '<div class="planner-ban-list">'+(bans.length?bans.map((b,i)=>'<div class="planner-ban-row">'+
          '<span class="planner-ban-num">'+(i+1)+'</span>'+
          '<strong class="planner-ban-champ">'+esc(b.champ||"—")+'</strong>'+
          '<span class="planner-ban-type '+esc(b.type||"watch")+'">'+esc(b.type||"watch")+'</span>'+
          '<span class="planner-ban-why">'+esc(b.why||"")+'</span>'+
        '</div>').join(""):'<span class="analysis-note">Ingen banlista ännu.</span>')+'</div>'+
      '</section>'+
      '<div class="planner-two-col">'+
        '<section class="planner-section"><div class="planner-section-head"><h3>Comp-bans</h3><span class="analysis-note">om vi visar X</span></div>'+
          '<div class="planner-condition-list">'+(conditionals.length?conditionals.map(c=>'<div class="planner-condition"><strong>'+esc(c.condition||"")+'</strong><span class="bans">'+esc((c.bans||[]).join(" / "))+'</span><p>'+esc(c.why||"")+'</p></div>').join(""):'<span class="analysis-note">Inga conditional bans.</span>')+'</div>'+
        '</section>'+
        '<section class="planner-section"><div class="planner-section-head"><h3>Om våra picks bannas</h3><span class="analysis-note">fallback</span></div>'+
          '<div class="planner-fallback-list">'+(fallbacks.length?fallbacks.map(f=>'<div class="planner-fallback"><strong>'+esc(f.champ||"")+'</strong><span class="options">→ '+esc((f.options||[]).join(" / "))+'</span></div>').join(""):'<span class="analysis-note">Inga fallbacks.</span>')+'</div>'+
        '</section>'+
      '</div>'+
      '<section class="planner-section">'+
        '<div class="planner-section-head"><h3>BO3 notes</h3><span class="analysis-note">uppdatera mellan games</span></div>'+
        '<div class="planner-note-grid">'+
          noteBlock("INFÖR SERIEN",notes.preSeries)+noteBlock("GAME 1",notes.game1)+noteBlock("GAME 2",notes.game2)+noteBlock("ÖVRIGT",notes.general)+
        '</div>'+
      '</section>';
  }
  function noteBlock(label,text){
    return '<div class="planner-note"><span>'+esc(label)+'</span><p>'+(text?nl(text):'<em>Tomt</em>')+'</p></div>';
  }
  function field(label,input){
    return '<div class="planner-field"><label>'+esc(label)+'</label>'+input+'</div>';
  }
  function renderEdit(plan){
    const detail=$("plannerDetail");
    const bans=[...(plan.banPriority||[])];
    while(bans.length<5)bans.push({champ:"",type:"watch",priority:bans.length+1,why:""});
    const conditionals=[...(plan.conditionalBans||[])];
    while(conditionals.length<3)conditionals.push({condition:"",bans:[],why:""});
    const fallbacks=[...(plan.ourFallbacks||[])];
    while(fallbacks.length<6)fallbacks.push({champ:"",options:[]});
    const notes=plan.gameNotes||{};
    detail.innerHTML=
      '<div class="planner-detail-head"><div><p class="eyebrow">REDIGERA PLAN</p><h2>'+esc(plan.opponent)+'</h2></div>'+
        '<div class="planner-detail-actions"><span id="plannerSaveStatus" class="planner-save-status"></span>'+
          (hasKey()?'<button type="button" class="planner-delete-btn" data-planner-action="delete">Radera match</button>':'')+
          '<button type="button" class="planner-cancel-btn" data-planner-action="cancel">Avbryt</button>'+
          '<button type="button" class="planner-save-btn" data-planner-action="save">Spara</button></div></div>'+
      '<div class="planner-two-col">'+
        '<section class="planner-section planner-edit-grid">'+
          '<h3>Match</h3>'+
          field("Motståndare",'<input id="peOpponent" value="'+esc(plan.opponent)+'">')+
          field("Datum / tid",'<input id="peScheduled" type="datetime-local" value="'+esc(toLocalInput(plan.scheduledAt))+'">')+
          field("Status",'<select id="peStatus"><option value="upcoming" '+(plan.status==="upcoming"?"selected":"")+'>Kommande</option><option value="completed" '+(plan.status==="completed"?"selected":"")+'>Klar</option><option value="cancelled" '+(plan.status==="cancelled"?"selected":"")+'>Inställd</option></select>')+
          field("Best of",'<select id="peBestOf"><option value="1" '+(plan.bestOf===1?"selected":"")+'>BO1</option><option value="3" '+(plan.bestOf===3?"selected":"")+'>BO3</option><option value="5" '+(plan.bestOf===5?"selected":"")+'>BO5</option></select>')+
          field("Liga / turnering",'<input id="peCompetition" value="'+esc(plan.competition||'')+'" placeholder="Rivals">')+
          field("OP.GG"+(plan.challengermodeUrl?" · auto-genererad":""),'<input id="peOpgg" '+(plan.challengermodeUrl?'readonly ':'')+'value="'+esc(plan.opggUrl||'')+'">')+
          field("Challengermode lagprofil",'<input id="peCmTeamUrl" value="'+esc(plan.challengermodeTeamUrl||'')+'" placeholder="https://www.challengermode.com/teams/UUID">')+
          field("Rivals-turnering",'<input id="peCmUrl" value="'+esc(plan.challengermodeUrl||'')+'" placeholder="https://www.challengermode.com/.../tournaments/UUID">')+
          '<div class="planner-form-hint">Live-sync använder <b>/tournaments/...</b>-länken. En <b>/teams/...</b>-länk är bara lagprofilen och räcker inte för roster/matchhistorik.</div>'+
          field("Lagnamn på Challengermode",'<input id="peCmTeamName" value="'+esc(plan.challengermodeTeamName||plan.opponent||'')+'" placeholder="'+esc(plan.opponent||'')+'">')+
          field("Spelare · en per rad",'<textarea id="pePlayers">'+esc((plan.players||[]).join("\n"))+'</textarea>')+
        '</section>'+
        '<section class="planner-section planner-edit-grid">'+
          '<h3>Phase 1</h3>'+
          field("B1",'<input id="peB1" value="'+esc(plan.phase1Plan?.b1||'')+'">')+
          field("B2",'<input id="peB2" value="'+esc(plan.phase1Plan?.b2||'')+'">')+
          field("B3",'<input id="peB3" value="'+esc(plan.phase1Plan?.b3||'')+'">')+
          field("Phase 1-note",'<textarea id="pePhaseNote">'+esc(plan.phase1Plan?.note||'')+'</textarea>')+
          field("Scouting confidence",'<select id="peConfidence"><option value="preliminary" '+(plan.scoutingConfidence==="preliminary"?"selected":"")+'>Preliminär</option><option value="medium" '+(plan.scoutingConfidence==="medium"?"selected":"")+'>Medium</option><option value="high" '+(plan.scoutingConfidence==="high"?"selected":"")+'>High</option></select>')+
        '</section>'+
      '</div>'+
      '<section class="planner-section"><div class="planner-section-head"><h3>Ban-prioritet</h3><span class="analysis-note">1 = högst</span></div>'+
        '<div class="planner-edit-grid">'+bans.map((b,i)=>'<div class="planner-edit-ban" data-edit-ban="'+i+'">'+
          '<input data-field="champ" placeholder="Champion" value="'+esc(b.champ||'')+'">'+
          '<select data-field="type"><option value="target" '+(b.type==="target"?"selected":"")+'>Target</option><option value="comp" '+(b.type==="comp"?"selected":"")+'>Comp</option><option value="watch" '+(b.type==="watch"?"selected":"")+'>Watch</option></select>'+
          '<textarea data-field="why" placeholder="Varför?">'+esc(b.why||'')+'</textarea>'+
        '</div>').join("")+'</div>'+
      '</section>'+
      '<div class="planner-two-col">'+
        '<section class="planner-section"><div class="planner-section-head"><h3>Conditional bans</h3></div><div class="planner-edit-grid">'+conditionals.map((c,i)=>'<div class="planner-edit-conditional" data-edit-conditional="'+i+'">'+
          '<input data-field="condition" placeholder="Om vi spelar..." value="'+esc(c.condition||'')+'">'+
          '<input data-field="bans" placeholder="Poppy, Vi" value="'+esc((c.bans||[]).join(", "))+'">'+
          '<input data-field="why" placeholder="Varför?" value="'+esc(c.why||'')+'">'+
        '</div>').join("")+'</div></section>'+
        '<section class="planner-section"><div class="planner-section-head"><h3>Våra fallbacks</h3></div><div class="planner-edit-grid">'+fallbacks.map((f,i)=>'<div class="planner-edit-fallback" data-edit-fallback="'+i+'">'+
          '<input data-field="champ" placeholder="Jarvan IV" value="'+esc(f.champ||'')+'">'+
          '<input data-field="options" placeholder="Wukong, Vi" value="'+esc((f.options||[]).join(", "))+'">'+
        '</div>').join("")+'</div></section>'+
      '</div>'+
      '<section class="planner-section"><div class="planner-section-head"><h3>BO3 notes</h3></div><div class="planner-note-grid">'+
        field("Inför serien",'<textarea id="pePreSeries">'+esc(notes.preSeries||'')+'</textarea>')+
        field("Game 1",'<textarea id="peGame1">'+esc(notes.game1||'')+'</textarea>')+
        field("Game 2",'<textarea id="peGame2">'+esc(notes.game2||'')+'</textarea>')+
        field("Övrigt",'<textarea id="peGeneral">'+esc(notes.general||'')+'</textarea>')+
      '</div></section>';
  }
  function collect(plan){
    const val=id=>$(id)?.value?.trim()||"";
    const dt=val("peScheduled");
    const out={...plan};
    out.opponent=val("peOpponent")||plan.opponent;
    out.scheduledAt=dt?new Date(dt).toISOString():plan.scheduledAt;
    out.status=$("peStatus")?.value||"upcoming";
    out.bestOf=Number($("peBestOf")?.value)||3;
    out.opggUrl=val("peOpgg");
    out.challengermodeTeamUrl=val("peCmTeamUrl");
    out.challengermodeUrl=val("peCmUrl");
    out.challengermodeTeamName=val("peCmTeamName")||out.opponent;
    out.competition=val("peCompetition");
    out.players=val("pePlayers").split(/\n+/).map(x=>x.trim()).filter(Boolean);
    out.phase1Plan={b1:val("peB1"),b2:val("peB2"),b3:val("peB3"),note:val("pePhaseNote")};
    out.scoutingConfidence=$("peConfidence")?.value||"preliminary";
    out.scoutingUpdatedAt=new Date().toISOString().slice(0,10);
    out.banPriority=[...document.querySelectorAll("[data-edit-ban]")].map((row,i)=>({
      champ:row.querySelector('[data-field="champ"]').value.trim(),
      type:row.querySelector('[data-field="type"]').value,
      priority:i+1,
      why:row.querySelector('[data-field="why"]').value.trim()
    })).filter(x=>x.champ);
    out.conditionalBans=[...document.querySelectorAll("[data-edit-conditional]")].map(row=>({
      condition:row.querySelector('[data-field="condition"]').value.trim(),
      bans:row.querySelector('[data-field="bans"]').value.split(",").map(x=>x.trim()).filter(Boolean),
      why:row.querySelector('[data-field="why"]').value.trim()
    })).filter(x=>x.condition||x.bans.length);
    out.ourFallbacks=[...document.querySelectorAll("[data-edit-fallback]")].map(row=>({
      champ:row.querySelector('[data-field="champ"]').value.trim(),
      options:row.querySelector('[data-field="options"]').value.split(",").map(x=>x.trim()).filter(Boolean)
    })).filter(x=>x.champ);
    out.gameNotes={preSeries:val("pePreSeries"),game1:val("peGame1"),game2:val("peGame2"),general:val("peGeneral")};
    return normalize(out);
  }
  async function saveCurrent(){
    if(!(await ensureWrite()))return;
    const plan=collect(current());
    const status=$("plannerSaveStatus");
    if(status)status.textContent="Sparar…";
    try{
      await request("POST","",{plan});
      const i=plans.findIndex(p=>p.id===plan.id);
      if(i>=0)plans[i]=plan;else plans.push(plan);
      plans=sortPlans(plans);writeCache(plans);
      editing=false;
      if(status)status.textContent="Sparad ✓";
      render();
      await load();
    }catch(err){
      if(status)status.textContent="Kunde inte spara";
      alert("Kunde inte spara Ban Planner: "+err.message);
    }
  }
  function parseOpggPlayers(url){
    const raw=(url||"").trim();
    if(!raw)return [];
    try{
      const u=new URL(raw);
      const host=u.hostname.toLowerCase();
      if(!host.endsWith("op.gg"))return [];
      const value=u.searchParams.get("summoners")||"";
      return value.split(",")
        .map(x=>decodeURIComponent(x).trim())
        .filter(Boolean)
        .map(x=>x.replace(/%23/gi,"#"))
        .slice(0,10);
    }catch{
      return [];
    }
  }
  function defaultFallbacks(){
    return [
      {champ:"Jarvan IV",options:["Wukong","Vi","Xin Zhao"]},
      {champ:"Annie",options:["Vex","Taliyah","Hwei"]},
      {champ:"Xin Zhao",options:["Volibear","Jarvan IV","Wukong"]},
      {champ:"Ashe",options:["Varus","Xayah"]},
      {champ:"Nautilus",options:["Leona","Maokai"]},
      {champ:"Malphite",options:["Sion","Shen","Mordekaiser"]}
    ];
  }
  function slugify(value){
    return String(value||"match").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"match";
  }
  function defaultNewMatchTime(){
    const d=new Date();
    d.setDate(d.getDate()+7);
    d.setHours(19,30,0,0);
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }
  function showNewMatchModal(){
    $("pnOpponent").value="";
    $("pnScheduled").value=defaultNewMatchTime();
    $("pnBestOf").value="3";
    $("pnCmTeamUrl").value="";
    $("pnCmUrl").value="";
    $("pnCmTeamName").value="";
    $("pnCompetition").value="";
    $("pnPreNotes").value="";
    $("pnCreateStatus").textContent="";
    const modal=$("plannerNewMatchOverlay");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
    document.body.classList.add("planner-modal-open");
    queueMicrotask(()=>$("pnOpponent")?.focus());
  }
  function hideNewMatchModal(){
    const modal=$("plannerNewMatchOverlay");
    modal?.classList.add("hidden");
    modal?.setAttribute("aria-hidden","true");
    document.body.classList.remove("planner-modal-open");
  }
  function renderOpggPreview(){
    const players=parseOpggPlayers($("pnOpgg")?.value||"");
    const box=$("pnPlayerPreview");
    if(!box)return;
    if(!($("pnOpgg")?.value||"").trim()){
      box.innerHTML='<span class="analysis-note">Klistra in en OP.GG Multisearch-länk så läser vi Riot IDs automatiskt.</span>';
      return;
    }
    if(!players.length){
      box.innerHTML='<span class="planner-form-error">Kunde inte läsa spelarna. Kontrollera att det är en OP.GG Multisearch-länk.</span>';
      return;
    }
    box.innerHTML='<span class="planner-preview-label">'+players.length+' spelare hittade</span>'+
      '<div class="planner-preview-players">'+players.map(p=>'<b>'+esc(p)+'</b>').join("")+'</div>';
  }
  async function syncChallengermodePlan(id=selectedId,{silent=false}={}){
    const plan=plans.find(p=>p.id===id);
    if(!plan||cmSyncingIds.has(id))return false;
    if(!plan.challengermodeUrl){
      if(!silent)alert("Lägg till Rivals-turneringens Challengermode-länk först. Den ska innehålla /tournaments/.");
      return false;
    }
    if(cmLinkKind(plan.challengermodeUrl)==="team"){
      if(!silent)alert("Det där är lagprofilen (/teams/...). Live-sync behöver länken till själva Rivals-turneringen (/tournaments/...).");
      return false;
    }
    if(!hasKey()&&!(await ensureWrite()))return false;
    cmSyncingIds.add(id);
    render();
    try{
      const data=await request("POST","",{plan,syncChallengermode:true,scout:true});
      cmApiState={
        configured:data.challengermodeConfigured!==false,
        error:data.challengermodeError||""
      };
      const updated=normalize(data.plan||plan);
      const i=plans.findIndex(p=>p.id===id);
      if(i>=0)plans[i]=updated;
      plans=sortPlans(plans);
      writeCache(plans);
      render();
      if(data.challengermodeError){
        if(!silent){
          let msg=data.challengermodeError;
          if(msg==="CHALLENGERMODE_NOT_CONFIGURED")msg="Challengermode kräver auth för den här datan och serverns refresh key är inte ansluten ännu.";
          if(String(msg).startsWith("CM_TEAM_LINK:"))msg="Det där är en /teams/-länk. Lägg in Rivals-turneringens /tournaments/-länk i fältet Rivals-turnering.";
          if(String(msg).startsWith("CM_TOURNAMENT_LINK:"))msg="Fel länktyp. Fältet Rivals-turnering måste innehålla en Challengermode-länk med /tournaments/.";
          alert("Challengermode-sync: "+msg);
        }
        return false;
      }
      return true;
    }catch(err){
      cmApiState={configured:cmApiState.configured,error:String(err?.message||err)};
      console.error("Challengermode sync failed:",err);
      if(!silent)alert("Kunde inte synka Challengermode: "+err.message);
      return false;
    }finally{
      cmSyncingIds.delete(id);
      render();
    }
  }
  async function syncAllChallengermode({silent=true}={}){
    if(!hasKey()||document.hidden)return;
    const dashboard=$("banPlannerDashboard");
    if(dashboard?.classList.contains("hidden"))return;
    const targets=plans.filter(p=>p.status==="upcoming"&&p.challengermodeUrl).slice(0,8);
    for(const plan of targets){
      await syncChallengermodePlan(plan.id,{silent});
    }
  }
  function startCmPolling(){
    if(cmPollTimer)clearInterval(cmPollTimer);
    cmPollTimer=setInterval(()=>syncAllChallengermode({silent:true}),5*60*1000);
  }

  async function scoutPlan(id=selectedId,{silent=false}={}){
    const plan=plans.find(p=>p.id===id);
    if(!plan||scoutingIds.has(id))return false;
    if(!hasKey()&&!(await ensureWrite()))return false;
    if(!plan.opggUrl||!(plan.players||[]).length){
      if(!silent)alert("Lägg till en OP.GG Multisearch-länk med Riot IDs först.");
      return false;
    }
    scoutingIds.add(id);
    render();
    try{
      const data=await request("POST","",{scout:true,plan});
      const updated=normalize(data.plan||plan);
      const i=plans.findIndex(p=>p.id===id);
      if(i>=0)plans[i]=updated;
      plans=sortPlans(plans);
      writeCache(plans);
      render();
      queueMicrotask(queueAutoScout);
      return true;
    }catch(err){
      console.error("Ban Planner autoscout failed:",err);
      if(!silent)alert("Kunde inte auto-scouta laget: "+err.message);
      return false;
    }finally{
      scoutingIds.delete(id);
      render();
    }
  }
  function queueAutoScout(){
    if(!hasKey())return;
    const target=plans.find(p=>
      p.status==="upcoming"&&
      p.opggUrl&&
      (p.players||[]).length&&
      !(p.banPriority||[]).length&&
      !autoScoutAttempted.has(p.id)&&
      !scoutingIds.has(p.id)
    );
    if(!target)return;
    autoScoutAttempted.add(target.id);
    queueMicrotask(()=>scoutPlan(target.id,{silent:true}));
  }

  async function createMatchFromForm(){
    if(!(await ensureWrite()))return;
    const opponent=$("pnOpponent")?.value?.trim()||"";
    const dt=$("pnScheduled")?.value||"";
    const challengermodeTeamUrl=$("pnCmTeamUrl")?.value?.trim()||"";
    const challengermodeUrl=$("pnCmUrl")?.value?.trim()||"";
    const challengermodeTeamName=$("pnCmTeamName")?.value?.trim()||opponent;
    const bestOf=Number($("pnBestOf")?.value)||3;
    const competition=$("pnCompetition")?.value?.trim()||"";
    const preNotes=$("pnPreNotes")?.value?.trim()||"";
    const status=$("pnCreateStatus");
    if(!opponent){if(status)status.textContent="Skriv motståndarlag.";return}
    const d=new Date(dt);
    if(!dt||isNaN(d)){if(status)status.textContent="Välj giltigt datum och tid.";return}
    const players=[];

    const baseId=slugify(opponent)+"-"+d.toISOString().slice(0,10);
    let id=baseId;
    let suffix=2;
    while(plans.some(p=>p.id===id)){id=baseId+"-"+suffix++}

    const plan=normalize({
      id,
      opponent,
      scheduledAt:d.toISOString(),
      status:"upcoming",
      bestOf,
      competition,
      opggUrl:"",
      challengermodeTeamUrl,
      challengermodeUrl,
      challengermodeTeamName,
      players,
      scoutingConfidence:"preliminary",
      scoutingUpdatedAt:"",
      banPriority:[],
      phase1Plan:{b1:"",b2:"",b3:"",note:"Ny matchup — fyll banplan efter scouting."},
      conditionalBans:[],
      ourFallbacks:defaultFallbacks(),
      gameNotes:{
        preSeries:preNotes,
        game1:"",
        game2:"",
        general:""
      }
    });
    if(status)status.textContent=challengermodeUrl?"Skapar match, hämtar roster & bygger OP.GG…":"Skapar match…";
    try{
      const data=await request("POST","",{plan,scout:!!challengermodeUrl,syncChallengermode:!!challengermodeUrl});
      const savedPlan=normalize(data.plan||plan);
      plans.push(savedPlan);
      plans=sortPlans(plans);
      writeCache(plans);
      selectedId=id;
      editing=false;
      hideNewMatchModal();
      render();
      if(data.scoutError)console.warn("Match created, autoscout failed:",data.scoutError);
      await load();
    }catch(err){
      console.error(err);
      if(status)status.textContent="Kunde inte skapa matchen.";
    }
  }
  async function deleteCurrent(){
    const plan=plans.find(p=>p.id===selectedId);
    if(!plan)return;
    if(!(await ensureWrite()))return;

    const when=dateText(plan.scheduledAt);
    const ok=confirm("Radera "+plan.opponent+" · "+when+"?\n\nMatchplanen, bans och anteckningarna tas bort för hela laget. Detta går inte att ångra.");
    if(!ok)return;

    try{
      await request("DELETE","?id="+encodeURIComponent(plan.id));
      plans=plans.filter(p=>p.id!==plan.id);
      plans=sortPlans(plans);
      writeCache(plans);
      selectedId=plans.find(p=>p.status==="upcoming")?.id||plans[0]?.id||null;
      editing=false;
      render();
      await load();
    }catch(err){
      console.error("Could not delete Ban Planner match:",err);
      alert("Kunde inte radera matchen från den delade databasen.");
    }
  }

  function render(){
    updateDbBadge();
    renderList();
    const p=plans.find(x=>x.id===selectedId);
    if(!p){
      $("plannerDetail").innerHTML='<div class="planner-empty"><strong>Välj en match</strong><p>Banplan, scouting och BO3-notes visas här.</p></div>';
      return;
    }
    editing?renderEdit(normalize(p)):renderRead(normalize(p));
  }
  function show(){
    updateDbBadge();
    if(!plans.length)load();else{render();load();}
    startCmPolling();
    queueMicrotask(()=>syncAllChallengermode({silent:true}));
  }

  $("plannerMatchList")?.addEventListener("click",e=>{
    const card=e.target.closest("[data-plan-id]");
    if(!card)return;
    selectedId=card.dataset.planId;editing=false;render();
  });
  $("plannerDetail")?.addEventListener("click",async e=>{
    const btn=e.target.closest("[data-planner-action]");
    if(!btn)return;
    const action=btn.dataset.plannerAction;
    if(action==="edit"){if(await ensureWrite()){editing=true;render();}}
    if(action==="cancel"){editing=false;render();}
    if(action==="save")await saveCurrent();
    if(action==="scout")await scoutPlan();
    if(action==="cm-sync")await syncChallengermodePlan();
    if(action==="delete")await deleteCurrent();
  });
  $("plannerNewMatchBtn")?.addEventListener("click",async()=>{
    if(await ensureWrite())showNewMatchModal();
  });
  $("plannerNewMatchCancel")?.addEventListener("click",hideNewMatchModal);
  $("plannerNewMatchCancelBottom")?.addEventListener("click",hideNewMatchModal);
  $("plannerNewMatchCreate")?.addEventListener("click",createMatchFromForm);
  $("plannerNewMatchOverlay")?.addEventListener("click",e=>{if(e.target===$("plannerNewMatchOverlay"))hideNewMatchModal()});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!$("plannerNewMatchOverlay")?.classList.contains("hidden"))hideNewMatchModal();
  });
  window.addEventListener("storage",e=>{if(e.key===TEAM_KEY_STORAGE)updateDbBadge()});
  window.RiftSharedData?.subscribe?.(()=>updateDbBadge());

  window.RiftBanPlanner={show,load,render,deleteCurrent,scoutPlan,syncChallengermodePlan,getPlans,selectPlan,roleLineup:scoutLineup};
})();