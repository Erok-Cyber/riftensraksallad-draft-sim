/* Shared Ban Planner for Riftensräksallad. */
(function(){
  const CACHE_KEY="rs_ban_plans_cache";
  const TEAM_KEY_STORAGE="rs_team_access_key";
  let plans=[];
  let selectedId=null;
  let editing=false,reviewing=false;
  let dirty=false,saving=false,matchView=false,editPlan=null;
  let lastSavedId=null;
  function mayDiscard(){return !saving&&(!dirty||confirm("Du har osparade ändringar. Lämna redigeringen ändå?"));}
  window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
  document.addEventListener("click",e=>{
    const nav=e.target.closest(".os-sidebar .os-nav-item");
    if(dirty&&nav&&nav.dataset.workspaceTarget!=="planner"&&!mayDiscard()){e.preventDefault();e.stopImmediatePropagation();}
  },true);
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
      seriesReview:plan.seriesReview||null,
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
  const scoutLineup=plan=>window.RiftScouting.lineup(plan);
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
    if(!plans.some(p=>p.id===id)||!mayDiscard())return false;
    dirty=false;editPlan=null;
    selectedId=id;editing=false;reviewing=false;render();return true;
  }
  function sortPlans(list){
    const group=p=>p.status==='completed'||p.status==='cancelled'?2:matchStage(p).past?1:0;
    return [...list].sort((a,b)=>group(a)-group(b)||(group(a)===0?new Date(a.scheduledAt)-new Date(b.scheduledAt):new Date(b.scheduledAt)-new Date(a.scheduledAt)));
  }
  function matchStage(plan,now=Date.now()){
    if(plan.status==='completed')return {label:'MATCH SPELAD',heading:'EFTER MATCHEN',past:true,tone:'completed'};
    if(plan.status==='cancelled')return {label:'INSTÄLLD',heading:'INSTÄLLD MATCH',past:false,tone:'cancelled'};
    const at=Date.parse(plan.scheduledAt);
    if(Number.isFinite(at)&&now>=at+6*60*60*1000)return {label:'KVAR ATT REVIEWA',heading:'EFTER MATCHTIDEN',past:true,tone:'review'};
    if(Number.isFinite(at)&&now>=at)return {label:'MATCHDAG',heading:'MATCHDAG',past:true,tone:'review'};
    return {label:'KOMMANDE',heading:'KOMMANDE MATCH',past:false,tone:'upcoming'};
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
      '<div class="planner-section-head"><h3>Challengermode</h3><span class="planner-cm-badge '+(cm.rosterChanged?'changed':'')+'">'+(cm.rosterChanged?'ROSTER ÄNDRAD':'SPARAD SCOUTING')+'</span></div>'+
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
    list.innerHTML=sortPlans(plans).map(p=>{
      const stage=matchStage(p),status=stage.label;
      return '<button type="button" class="planner-match-card '+(p.id===selectedId?"active":"")+'" data-plan-id="'+esc(p.id)+'">'+
        '<span class="top"><strong>'+esc(p.opponent)+'</strong><span class="status '+esc(stage.tone)+'">'+status+'</span></span>'+
        '<span class="date">'+esc(dateText(p.scheduledAt))+' · BO'+esc(p.bestOf||3)+'</span>'+
        '<small>'+(scoutingIds.has(p.id)?'Scoutar OP.GG…':esc((p.phase1Plan?.b1||"—")+" / "+(p.phase1Plan?.b2||"—")+" / "+(p.phase1Plan?.b3||"—")))+'</small>'+
      '</button>';
    }).join("");
  }
  const reviewQuestions={result:'Hur slutade serien?',worked:'Vad fungerade?',difficult:'Vad blev svårt?',next:'Vad ändrar vi nästa gång?'};
  function renderReview(plan){
    const detail=$('plannerDetail'),review=plan.seriesReview||{},writable=hasKey();
    detail.classList.remove('planner-match-view');
    detail.innerHTML='<div class="planner-detail-head"><div><p class="eyebrow">EFTER MATCHEN</p><h2>'+esc(plan.opponent)+'</h2><p class="analysis-note">'+esc(dateText(plan.scheduledAt))+'</p></div><button type="button" class="secondary" data-planner-action="cancel">Tillbaka</button></div>'+
      '<section id="seriesReviewForm" class="planner-section planner-review-form"><p>Hur gick matchen? Korta svar räcker.</p>'+
      Object.entries(reviewQuestions).map(([key,label])=>'<label class="postmatch-field">'+label+'<textarea id="pr-'+key+'" maxlength="'+(key==='result'?40:600)+'" rows="'+(key==='result'?1:3)+'" '+(!writable?'readonly':'')+' placeholder="'+(key==='result'?'Till exempel 2–1 till oss':'En konkret observation räcker')+'">'+esc(review[key]||'')+'</textarea></label>').join('')+
      (plan.gameNotes?.general?'<details><summary>Tidigare anteckningar</summary><p>'+nl(plan.gameNotes.general)+'</p></details>':'')+
      '<p id="plannerSaveStatus" class="planner-save-status" role="status"></p>'+
      '<button type="button" class="planner-save-btn" data-planner-action="'+(writable?'save-review':'unlock-review')+'">'+(writable?'Spara review & markera spelad':'Lås upp för att skriva review')+'</button></section>';
  }
  async function saveReview(){
    if(saving||!hasKey())return;
    const review=Object.fromEntries(Object.keys(reviewQuestions).map(k=>[k,$('pr-'+k).value.trim().slice(0,k==='result'?40:600)]));
    const status=$('plannerSaveStatus');
    if(!Object.values(review).some(Boolean)){status.textContent='Svara på minst en fråga innan du sparar.';return;}
    saving=true;status.textContent='Sparar…';
    const fields=[...$('plannerDetail').querySelectorAll('button,textarea')];fields.forEach(el=>el.disabled=true);
    try{
      const data=await request('POST','',{reviewOnly:true,id:current().id,review});
      if(!data.plan)throw Error('Servern bekräftade inte sparningen. Försök igen.');
      const plan=normalize(data.plan),i=plans.findIndex(p=>p.id===plan.id);if(i>=0)plans[i]=plan;
      writeCache(plans);dirty=false;reviewing=false;lastSavedId=plan.id;render();
    }catch(err){status.textContent='Kunde inte spara: '+err.message+' Dina svar finns kvar.';}
    finally{saving=false;fields.forEach(el=>el.disabled=false);}
  }
  function evidenceHtml(plan){
    const games=(plan.competitiveEvidence?.games||[]).filter(g=>g.source==='manual-screenshot');
    if(!games.length)return '';
    return '<section class="planner-section planner-preparation"><h3>Bildverifierade matcher</h3><p class="analysis-note">Manuellt tillagda eftersom matchdata saknas i Challengermode. Används i scouting och Draft Brain. KDA är matchutfall, inte ett mått på spelarstyrka.</p>'+
      games.map(g=>'<details class="planner-evidence-game"><summary>'+esc(g.playedAt||g.dateLabel||'Datum saknas')+' · '+(g.result==='win'?'VINST':'FÖRLUST')+' · '+esc(g.duration)+' · '+esc(g.teamKills)+'–'+esc(g.enemyKills)+'</summary><div class="planner-evidence-picks">'+(g.picks||[]).map(p=>'<div><span>'+esc(String(p.role||'').toUpperCase())+'</span><strong>'+esc(p.champ)+'</strong><span>'+esc(p.displayName||p.player)+'</span><b>'+esc(p.kda)+'</b></div>').join('')+'</div><p class="analysis-note">'+esc(g.note||'')+'</p></details>').join('')+'</section>';
  }
  function renderRead(plan){
    const detail=$("plannerDetail");
    detail.classList.toggle("planner-match-view",matchView);
    const bans=(plan.banPriority||[]).slice(0,5);
    const notes=plan.gameNotes||{};
    const stage=matchStage(plan);
    detail.innerHTML=
      '<div class="planner-detail-head">'+
        '<div><p class="eyebrow">'+stage.heading+'</p><h2>'+esc(plan.opponent)+'</h2>'+
          '<div class="planner-meta">'+esc(dateText(plan.scheduledAt))+' · BO'+esc(plan.bestOf)+(plan.competition?' · '+esc(plan.competition):'')+' · '+stage.label+'</div></div>'+
        '<div class="planner-detail-actions">'+
          (lastSavedId===plan.id?'<span class="planner-save-status" role="status">Sparad ✓</span>':'')+
          '<button type="button" class="secondary" data-planner-action="view" aria-pressed="'+matchView+'">'+(matchView?'Visa förberedelser':'Under match')+'</button>'+
          (plan.opggUrl?'<a class="planner-link" href="'+esc(plan.opggUrl)+'" target="_blank" rel="noopener">OP.GG ↗</a>':'')+
          (safeCmUrl(plan.challengermodeUrl)?'<a class="planner-link cm" href="'+esc(safeCmUrl(plan.challengermodeUrl))+'" target="_blank" rel="noopener">Challengermode ↗</a>':'')+
          (hasKey()&&plan.challengermodeUrl?'<button type="button" class="planner-cm-sync-btn" data-planner-action="cm-sync" '+(cmSyncingIds.has(plan.id)?'disabled':'')+'>'+(cmSyncingIds.has(plan.id)?'Synkar CM…':'Synka CM')+'</button>':'')+
          (hasKey()&&plan.opggUrl&&(plan.players||[]).length?'<button type="button" class="planner-scout-btn" data-planner-action="scout" '+(scoutingIds.has(plan.id)?'disabled':'')+'>'+(scoutingIds.has(plan.id)?'Scoutar…':'Scouta om')+'</button>':'')+
          '<button type="button" class="planner-edit-btn" data-planner-action="edit">Redigera plan</button>'+
          (hasKey()?'<button type="button" class="planner-delete-btn" data-planner-action="delete">Radera match</button>':'')+
        '</div>'+
      '</div>'+
      (plan.status!=='cancelled'&&(stage.past||plan.status==='completed')?'<section class="planner-section"><div class="planner-section-head"><h3>Efter matchen</h3></div>'+
        '<p class="analysis-note">'+(plan.status==='completed'?'Serien är markerad som spelad. Banplan och scouting finns kvar som underlag.':'Matchtiden har passerat. Bekräfta att serien är spelad, eller ändra datumet om den flyttats.')+'</p>'+
        (plan.seriesReview?'<div class="planner-note-grid">'+noteBlock('Resultat',plan.seriesReview.result)+noteBlock('Vad fungerade?',plan.seriesReview.worked)+noteBlock('Vad blev svårt?',plan.seriesReview.difficult)+noteBlock('Nästa gång',plan.seriesReview.next)+'</div>':noteBlock('Tidigare anteckningar',notes.general))+
        '<button type="button" class="planner-edit-btn" data-planner-action="followup">'+(plan.status==='completed'?'Öppna matchreview':'Reviewa matchen')+'</button>'+
        '<p class="analysis-note">En kort review räcker. Resultaten per game finns under kopplade games.</p></section>':'')+
      (window.RiftPostmatch?.seriesHTML(plan)||'')+
      '<div class="planner-phase1">'+
        ['b1','b2','b3'].map((k,i)=>'<div class="planner-ban-call"><span>B'+(i+1)+'</span><strong>'+esc(plan.phase1Plan?.[k]||"Öppen")+'</strong></div>').join("")+
      '</div>'+
      '<p class="planner-ban-note">Sparad banplan. Draft Brain omvärderar utifrån aktuell draft och verifierade motståndarpicks.</p>'+
      '<p class="planner-ban-note">'+esc(plan.phase1Plan?.note||"")+'</p>'+
      '<section class="planner-section planner-preparation">'+
        '<div class="planner-section-head"><h3>Scouting</h3><span class="planner-scout-badge '+esc(plan.scoutingStatus||"")+'">'+esc((plan.scoutingConfidence||"preliminary").toUpperCase())+'</span></div>'+
        '<div class="planner-player-grid">'+(plan.players||[]).map(x=>'<span class="planner-player">'+esc(x)+'</span>').join("")+'</div>'+
        '<p class="analysis-note" style="margin:9px 0 0">'+
          (scoutingIds.has(plan.id)?'Hämtar champion-volym, winrate och senaste ranked från OP.GG…':
            (plan.scoutingUpdatedAt?esc((plan.scoutingSource||"OP.GG")+' · uppdaterad '+plan.scoutingUpdatedAt):'Riot IDs hittade · scouting väntar'))+
        '</p>'+
        (plan.scoutingError?'<div class="planner-scout-warning">'+esc(plan.scoutingError)+'</div>':'')+
        (scoutLineup(plan).length?'<div class="planner-scout-profile-grid">'+scoutLineup(plan).map(scoutProfileCard).join("")+'</div>':'')+
      '</section>'+
      evidenceHtml(plan)+
      '<div class="planner-preparation">'+(plan.challengermode?cmRosterHtml(plan):(plan.challengermodeUrl?'<section class="planner-section planner-cm-section"><div class="planner-section-head"><h3>Challengermode Live</h3><span class="planner-cm-badge pending">VÄNTAR</span></div><p class="analysis-note">'+esc(cmApiState.error||'Turneringen är länkad. Synka för roster, subs och matchhistorik.')+'</p></section>':''))+'</div>'+
      '<section class="planner-section">'+
        '<div class="planner-section-head"><h3>Ban-prioritet</h3><span class="analysis-note">3–5 champs</span></div>'+
        '<div class="planner-ban-list">'+(bans.length?bans.map((b,i)=>'<div class="planner-ban-row">'+
          '<span class="planner-ban-num">'+(i+1)+'</span>'+
          '<strong class="planner-ban-champ">'+esc(b.champ||"—")+'</strong>'+
          '<span class="planner-ban-type '+esc(b.type||"watch")+'">'+esc(b.type||"watch")+'</span>'+
          '<span class="planner-ban-why">'+esc(b.why||"")+'</span>'+
        '</div>').join(""):'<span class="analysis-note">Ingen banlista ännu.</span>')+'</div>'+
      '</section>'+
      '<section class="planner-section">'+
        '<div class="planner-section-head"><h3>Matchanteckningar</h3><span class="analysis-note">uppdatera mellan games</span></div>'+
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
    detail.classList.remove("planner-match-view");
    const bans=[...(plan.banPriority||[])];
    while(bans.length<5)bans.push({champ:"",type:"watch",priority:bans.length+1,why:""});
    const notes=plan.gameNotes||{};
    detail.innerHTML=
      '<div class="planner-detail-head"><div><p class="eyebrow">REDIGERA PLAN</p><h2>'+esc(plan.opponent)+'</h2></div>'+
        '<div class="planner-detail-actions"><span id="plannerSaveStatus" class="planner-save-status" role="status">Inga ändringar</span>'+
          (hasKey()?'<button type="button" class="planner-delete-btn" data-planner-action="delete">Radera match</button>':'')+
          '<button type="button" class="planner-cancel-btn" data-planner-action="cancel">Avbryt</button>'+
          '<button type="button" class="planner-save-btn" data-planner-action="save">Spara</button></div></div>'+
      '<div class="planner-two-col">'+
        '<section class="planner-section planner-edit-grid">'+
          '<h3>Match</h3>'+
          field("Motståndare",'<input id="peOpponent" value="'+esc(plan.opponent)+'">')+
          field("Datum / tid",'<input id="peScheduled" type="datetime-local" value="'+esc(toLocalInput(plan.scheduledAt))+'">')+
          field("Status",'<select id="peStatus"><option value="upcoming" '+(plan.status==="upcoming"?"selected":"")+'>Kommande</option><option value="completed" '+(plan.status==="completed"?"selected":"")+'>Spelad</option><option value="cancelled" '+(plan.status==="cancelled"?"selected":"")+'>Inställd</option></select>')+
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
      '<section class="planner-section"><div class="planner-section-head"><h3>Matchanteckningar</h3></div><div class="planner-note-grid">'+
        field("Inför serien",'<textarea id="pePreSeries">'+esc(notes.preSeries||'')+'</textarea>')+
        field("Game 1",'<textarea id="peGame1">'+esc(notes.game1||'')+'</textarea>')+
        field("Game 2",'<textarea id="peGame2">'+esc(notes.game2||'')+'</textarea>')+
        field("Efter matchen / övrigt",'<textarea id="peGeneral" placeholder="Seriescore, vad fungerade och vad ändrar vi nästa gång?">'+esc(notes.general||'')+'</textarea>')+
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
    out.gameNotes={preSeries:val("pePreSeries"),game1:val("peGame1"),game2:val("peGame2"),general:val("peGeneral")};
    return normalize(out);
  }
  async function saveCurrent(){
    if(saving||!(await ensureWrite()))return;
    saving=true;
    const plan=collect(editPlan||current());
    const status=$("plannerSaveStatus");
    if(status)status.textContent="Sparar…";
    try{
      await request("POST","",{plan});
      const i=plans.findIndex(p=>p.id===plan.id);
      if(i>=0)plans[i]=plan;else plans.push(plan);
      plans=sortPlans(plans);writeCache(plans);
      editing=false;dirty=false;editPlan=null;lastSavedId=plan.id;
      if(status)status.textContent="Sparad ✓";
      render();
      await load();
    }catch(err){
      if(status)status.textContent="Kunde inte spara";
      alert("Kunde inte spara Ban Planner: "+err.message);
    }finally{saving=false;}
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
      ourFallbacks:[],
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
    // Background sync must never replace a form the user is editing.
    if((editing&&$("peOpponent"))||(reviewing&&$("seriesReviewForm")))return;
    const p=editing&&editPlan?editPlan:plans.find(x=>x.id===selectedId);
    if(!p){
      $("plannerDetail").innerHTML='<div class="planner-empty"><strong>Välj en match</strong><p>Banplan, scouting och BO3-notes visas här.</p></div>';
      return;
    }
    reviewing?renderReview(normalize(p)):editing?renderEdit(normalize(p)):renderRead(normalize(p));
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
    selectPlan(card.dataset.planId);
  });
  $("plannerDetail")?.addEventListener("click",async e=>{
    const review=e.target.closest('[data-series-review]');
    if(review){if(typeof openDraftReview==='function')openDraftReview(review.dataset.seriesReview);return;}
    const btn=e.target.closest("[data-planner-action]");
    if(!btn)return;
    const action=btn.dataset.plannerAction;
    if(action==='link-game'&&await ensureWrite()){
      const id=$('plannerUnlinkedGame')?.value;
      if(id&&typeof openDraftReview==='function')openDraftReview(id,current());
    }
    if(action==="edit"){if(await ensureWrite()){reviewing=false;editing=true;dirty=false;editPlan=normalize(current());render();}}
    if(action==="followup"){
      reviewing=true;editing=false;dirty=false;render();
    }
    if(action==="unlock-review"&&await ensureWrite()){
      $('seriesReviewForm')?.remove();render();
    }
    if(action==="save-review")await saveReview();
    if(action==="cancel"&&mayDiscard()){editing=false;reviewing=false;dirty=false;editPlan=null;render();}
    if(action==="view"){matchView=!matchView;render();}
    if(action==="save")await saveCurrent();
    if(action==="scout")await scoutPlan();
    if(action==="cm-sync")await syncChallengermodePlan();
    if(action==="delete")await deleteCurrent();
  });
  $("plannerDetail")?.addEventListener("input",()=>{
    if(!editing&&!reviewing)return;
    dirty=true;lastSavedId=null;
    if($("plannerSaveStatus"))$("plannerSaveStatus").textContent="Osparade ändringar";
  });
  $("plannerNewMatchBtn")?.addEventListener("click",async()=>{
    if(mayDiscard()&&await ensureWrite())showNewMatchModal();
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
