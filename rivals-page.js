/* Read-only archive. Uses the same paginated source as Planner and Brain. */
(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLocaleLowerCase('sv-SE');
  const roles={top:'TOP',jungle:'JGL',mid:'MID',adc:'BOT',support:'SUP'};
  const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('sv-SE',{year:'numeric',month:'short',day:'numeric'}):'Datum saknas';
  const query=new URLSearchParams(location.search);
  const $=id=>document.getElementById(id);
  let plans=[],plan=null,data=null,requestId=0,icons=new Map(),openSeries=new Set();
  const seriesId=s=>'series-'+encodeURIComponent(String(s.id));
  function picks(g){return window.RiftRivals.orderedPicks(Array.isArray(g.picks)?g.picks:[],plan);}
  function filtered(series,search,result,role){
    return series.map(s=>({...s,games:(s.games||[]).filter(g=>{
      if(result&&(result==='unknown'?!!g.result:g.result!==result))return false;
      const candidates=picks(g).filter(p=>!role||(role==='unknown'?!p.role:p.role===role));
      if(role&&!candidates.length)return false;
      return !search||norm(s.opponent+' '+s.team).includes(search)||candidates.some(p=>norm(p.champ+' '+p.player).includes(search));
    })})).filter(s=>s.games.length||(!search&&!result&&!role));
  }
  function score(s){const games=s.games||[],w=games.filter(g=>g.result==='win').length,l=games.filter(g=>g.result==='loss').length;
    return !games.length?'—':games.every(g=>g.result==='win'||g.result==='loss')?w+' – '+l:w+' – '+l+' *';}
  function renderGame(g,search,role){
    const rows=picks(g),result={win:'VINST',loss:'FÖRLUST',draw:'OAVGJORT'}[g.result]||'RESULTAT SAKNAS';
    return '<article class="game"><div class="game-heading"><h3>Game '+esc(g.number)+'</h3><span class="result '+(g.result==='win'?'win':g.result==='loss'?'loss':'')+'">'+result+'</span></div><div class="picks">'+rows.map(p=>{
      const perf=p.performance||{},kda=['kills','deaths','assists'].every(k=>Number.isFinite(perf[k]))?[perf.kills,perf.deaths,perf.assists].join(' / '):'';
      const image=icons.get(p.champ);
      const matched=(!!search&&norm(p.champ+' '+p.player).includes(search))||(!!role&&(role==='unknown'?!p.role:p.role===role));
      return '<div class="pick'+(matched?' match':'')+'"><span class="role">'+esc((roles[p.role]||'ROLL OKÄND')+(p.inferred?' ≈':''))+'</span><div class="portrait">'+(image?'<img loading="lazy" alt="" src="'+esc(image)+'">':esc(String(p.champ||'?').slice(0,2)))+'</div><strong>'+esc(p.champ)+'</strong><span class="player">'+esc(p.player||'Spelare saknas')+'</span>'+(kda?'<p class="performance">'+esc(kda)+' <span class="note">KDA</span></p>':'')+(Number.isFinite(perf.damageShare)?'<p class="note">'+Math.round(perf.damageShare*100)+'% av lagskadan</p>':'')+'</div>';
    }).join('')+'</div>'+(rows.length<5?'<p class="note">'+(rows.length?'Vissa championval saknas.':'Championdata saknas för detta game.')+'</p>':'')+(rows.some(p=>!p.role)?'<p class="note">Historiska roller saknas i underlaget. Spelarna visas utan uppskattad roll.</p>':'')+(g.partial?'<p class="note">Statistiken för detta game är ofullständig.</p>':'')+'</article>';
  }
  function render(){
    if(!data)return;
    const search=norm($('search').value.trim()),result=$('result').value,role=$('role').value;
    const all=[...data.series].sort((a,b)=>(Date.parse(b.playedAt)||0)-(Date.parse(a.playedAt)||0));
    const games=all.flatMap(s=>s.games||[]),known=games.filter(g=>g.result==='win'||g.result==='loss'),wins=known.filter(g=>g.result==='win').length;
    $('overview').innerHTML='<div class="stats"><div class="stat"><b>'+all.length+'</b><span>Serier inlästa</span></div><div class="stat"><b>'+games.length+'</b><span>Registrerade games</span></div><div class="stat"><b>'+(known.length?Math.round(wins/known.length*100)+'%':'—')+'</b><span>Vinster · '+known.length+' games med känt W/L</span></div></div>';
    const counts=new Map();games.forEach(g=>(g.picks||[]).forEach(p=>{if(p.champ)counts.set(p.champ,(counts.get(p.champ)||0)+1);}));
    $('overview').innerHTML+='<div class="frequent"><span>Mest spelade</span>'+[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8).map(([c,n])=>'<button type="button" data-champion="'+esc(c)+'">'+esc(c)+' · '+n+'</button>').join('')+'</div>';
    $('overview').querySelectorAll('[data-champion]').forEach(b=>b.onclick=()=>{$('search').value=b.dataset.champion;render();});
    const visible=filtered(all,search,result,role);
    $('count').textContent=visible.length+' serier · '+visible.reduce((n,s)=>n+s.games.length,0)+' games visas';
    $('matches').innerHTML=visible.length?visible.map(s=>{
      const original=all.find(x=>x.id===s.id),id=seriesId(s),target=location.hash.slice(1)===id;
      return '<details class="series" id="'+esc(id)+'"'+(target||openSeries.has(String(s.id))||search||result||role?' open':'')+'><summary><div class="series-head"><strong>'+esc(s.team||plan.opponent)+' <span class="note">vs</span> '+esc(s.opponent||'Motståndare saknas')+'</strong><small>'+esc(date(s.playedAt))+' · '+(original.games||[]).length+' registrerade games</small></div><span class="series-score" title="Resultat i registrerade games; * betyder att resultat saknas eller är oavgjort">'+score(original)+'</span></summary><div class="games"><a class="series-link" href="#'+esc(id)+'">Länk till serien</a>'+(s.games.length?s.games.map(g=>renderGame(g,search,role)).join(''):'<p class="note">Inga spelade games registrerade. Serien kan vara administrativt avgjord.</p>')+'</div></details>';
    }).join(''):'<div class="empty">'+(all.length?'Inga matcher matchar filtren. Prova att rensa dem.':'Inga tidigare Rivals-serier finns tillgängliga för laget ännu.')+'</div>';
    $('matches').querySelectorAll('details').forEach(el=>el.addEventListener('toggle',()=>{const id=decodeURIComponent(el.id.slice(7));el.open?openSeries.add(id):openSeries.delete(id);}));
    $('matches').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));
  }
  function focusSeries(){const el=document.getElementById(location.hash.slice(1));if(el?.classList.contains('series')){el.open=true;el.scrollIntoView({block:'start'});}}
  async function select(id){
    const ticket=++requestId;plan=plans.find(p=>String(p.id)===String(id));data=null;openSeries.clear();
    $('overview').replaceChildren();$('matches').replaceChildren();$('count').textContent='';
    if(!plan){$('status').textContent='Laget finns inte i de tillgängliga banplanerna. Välj ett annat lag.';return;}
    $('team').value=String(plan.id);query.set('plan',plan.id);history.replaceState(null,'','?'+query.toString()+location.hash);
    document.title=plan.opponent+' · Rivals matcharkiv';
    $('status').textContent='Hämtar '+plan.opponent+'s tidigare Rivals-matcher…';
    try{
      const loaded=await window.RiftRivals.load(plan);if(ticket!==requestId)return;data=loaded;
      $('status').textContent=(loaded.partial?'Delvis hämtat underlag. ':'')+loaded.series.length+' av '+loaded.totalSeries+' serier inlästa från Challengermode.';
      if(loaded.partial){const retry=document.createElement('button');retry.textContent='Försök igen';retry.onclick=()=>{window.RiftRivals.clear(plan.id);select(plan.id);};$('status').append(retry);}
      render();focusSeries();
    }catch{if(ticket!==requestId)return;$('status').textContent='Kunde inte hämta matchhistoriken. ';const retry=document.createElement('button');retry.textContent='Försök igen';retry.onclick=()=>select(id);$('status').append(retry);}
  }
  async function start(){
    $('status').textContent='Hämtar banplaner…';
    try{
      const endpoint=window.RIFT_DB_CONFIG?.plannerFunctionUrl;if(!endpoint)throw Error('Ingen anslutning');
      const res=await fetch(endpoint,{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!res.ok)throw Error('HTTP');
      const body=await res.json();if(!Array.isArray(body.plans))throw Error('Data');
      plans=body.plans.map(r=>({...r.payload,id:r.id,opponent:r.opponent||r.payload?.opponent})).filter(p=>p.id&&(p.challengermode||p.challengermodeUrl));
      plans.sort((a,b)=>String(a.opponent).localeCompare(String(b.opponent),'sv'));
      $('team').innerHTML=plans.length?plans.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.opponent)+(p.scheduledAt?' · '+esc(date(p.scheduledAt)):'')+'</option>').join(''):'<option>Inga lag med Rivals-koppling</option>';
      $('team').disabled=!plans.length;
      if(!plans.length){$('status').textContent='Lägg till en Rivals-koppling på lagets plan i Ban Planner först.';return;}
      const wanted=query.get('plan');if(wanted&&!plans.some(p=>String(p.id)===wanted)){$('team').selectedIndex=-1;$('status').textContent='Den länkade banplanen finns inte längre. Välj ett lag ovan.';return;}
      await select(wanted||plans[0].id);
    }catch{$('status').textContent='Kunde inte hämta lagen. ';const retry=document.createElement('button');retry.textContent='Försök igen';retry.onclick=start;$('status').append(retry);}
  }
  async function loadIcons(){
    try{
      const versions=await fetch('https://ddragon.leagueoflegends.com/api/versions.json',{signal:AbortSignal.timeout(12000)}).then(r=>r.json());
      const version=versions[0];const json=await fetch('https://ddragon.leagueoflegends.com/cdn/'+encodeURIComponent(version)+'/data/en_US/champion.json',{signal:AbortSignal.timeout(12000)}).then(r=>r.json());
      icons=new Map(Object.values(json.data||{}).map(c=>[c.name,'https://ddragon.leagueoflegends.com/cdn/'+encodeURIComponent(version)+'/img/champion/'+encodeURIComponent(c.image.full)]));render();
    }catch{/* Champion names remain usable without optional images. */}
  }
  window.RiftRivalsArchive={filtered,score,renderGame};
  $('filters').addEventListener('submit',e=>e.preventDefault());
  ['search','result','role'].forEach(id=>$(id).addEventListener('input',render));
  $('filters').addEventListener('reset',()=>setTimeout(render,0));
  $('team').addEventListener('change',()=>{history.replaceState(null,'',location.pathname+location.search);$('filters').reset();select($('team').value);});
  window.addEventListener('hashchange',focusSeries);
  start();loadIcons();
})();
