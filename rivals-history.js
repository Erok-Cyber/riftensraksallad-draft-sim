/* Shared, lazy read-only Rivals history for Ban Planner and Draft Brain. */
(()=>{
  const cache=new Map(),expanded=new Set();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('sv-SE',{day:'numeric',month:'short'}):'Datum saknas';
  const roleOrder=['top','jungle','mid','adc','support'];
  function orderedPicks(picks,plan){
    const lineup=window.RiftScouting?.lineup?.(plan)||[];
    const identity=v=>String(v||'').trim().toLowerCase();
    const rows=picks.map((p,index)=>{
      if(roleOrder.includes(p.role))return {...p,index,inferred:false};
      const matches=lineup.filter(e=>e.roleConfidence>0&&e.cmUsername&&identity(e.cmUsername)===identity(p.player));
      const role=matches.length===1&&roleOrder.includes(matches[0].role)?matches[0].role:'';
      // Current lineup roles are a display fallback, not proof of a historical role.
      return {...p,index,role,inferred:!!role};
    });
    return rows.sort((a,b)=>(roleOrder.includes(a.role)?roleOrder.indexOf(a.role):5)-(roleOrder.includes(b.role)?roleOrder.indexOf(b.role):5)||a.index-b.index);
  }
  function rows(data,plan){
    const series=Array.isArray(data.series)?data.series:[];
    return (data.partial?'<p class="rivals-note">Vissa matcher kunde inte hämtas. Försök igen senare.</p>':'')+
      (series.length?series.map(s=>'<details class="rivals-series"><summary><span><strong>'+esc(s.team)+' <span class="rivals-vs">vs</span> '+esc(s.opponent||'Motståndare saknas')+'</strong><small>'+esc(date(s.playedAt))+' · '+(s.games||[]).length+' registrerade games</small></span></summary>'+
        '<div class="rivals-games">'+((s.games||[]).length?(s.games||[]).map(g=>'<section class="rivals-game"><h4>Game '+esc(g.number)+'<span class="rivals-result '+(g.result==='win'?'win':g.result==='loss'?'loss':'')+'">'+(g.result==='win'?'Vinst':g.result==='loss'?'Förlust':g.result==='draw'?'Oavgjort':'Resultat saknas')+'</span></h4>'+
          ((g.picks||[]).length?'<ul class="rivals-picks">'+orderedPicks(g.picks,plan).map(p=>'<li><span>'+esc(p.role?p.role.toUpperCase()+(p.inferred?' ≈':''):'ROLL OKÄND')+'</span><strong>'+esc(p.champ)+'</strong><span>'+esc(p.player)+'</span></li>').join('')+'</ul>'+
            (orderedPicks(g.picks,plan).some(p=>p.inferred)?'<p class="rivals-note">≈ Rollordning uppskattad från aktuell scouting; historisk roll är inte bekräftad.</p>':''):'')+
          ((g.picks||[]).length<5?'<p class="rivals-note">'+((g.picks||[]).length?'Vissa championval saknas.':'Championdata saknas för detta game.')+'</p>':'')+'</section>').join(''):'<p class="rivals-note">Inga spelade games registrerade. Serien kan vara administrativt avgjord.</p>')+'</div></details>').join(''):'<p class="rivals-note">Inga spelade Rivals-serier tillgängliga ännu.</p>');
  }
  async function load(plan){
    const id=String(plan.id),existing=cache.get(id);
    if(existing&&existing.until>Date.now())return existing.promise;
    const promise=(async()=>{
      const endpoint=window.RIFT_DB_CONFIG?.plannerFunctionUrl;if(!endpoint)throw Error('Saknar anslutning');
      const url=new URL(endpoint);url.searchParams.set('id',id);url.searchParams.set('rivals','1');
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
      try{
        const res=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);
        const data=await res.json();if(!Array.isArray(data.series))throw Error('Ogiltig matchdata');return data;
      }finally{clearTimeout(timeout);}
    })();
    cache.set(id,{until:Date.now()+10*60*1000,promise});
    try{return await promise;}catch(e){cache.delete(id);throw e;}
  }
  function mount(host,plan){
    if(!host)return;
    const id=String(plan?.id||'');
    if(host.dataset.rivalsPlan===id&&host.firstChild)return;
    host.dataset.rivalsPlan=id;host.replaceChildren();
    if(!id||(!plan.challengermode&&!plan.challengermodeUrl))return;
    host.innerHTML='<details class="rivals-history"><summary>Rivals · tidigare matcher</summary><div class="rivals-body" aria-live="polite"></div></details>';
    const details=host.querySelector('details'),body=host.querySelector('.rivals-body');let loaded=false,busy=false;
    async function show(){
      if(busy||loaded||!details.open)return;
      busy=true;body.innerHTML='<p class="rivals-note">Hämtar matcher från Challengermode…</p>';
      try{
        const data=await load(plan);if(host.dataset.rivalsPlan!==id||!host.contains(body))return;
        body.innerHTML='<p class="rivals-note">'+esc(plan.opponent)+'s faktiska tävlingspicks · senaste åtta serierna.</p>'+rows(data,plan);loaded=true;
      }catch{
        if(host.dataset.rivalsPlan!==id||!host.contains(body))return;
        body.innerHTML='<p class="rivals-note">Kunde inte hämta Rivals-matcher.</p><button type="button" class="secondary">Försök igen</button>';
        body.querySelector('button').addEventListener('click',show);
      }finally{busy=false;}
    }
    details.addEventListener('toggle',()=>{details.open?expanded.add(id):expanded.delete(id);show();});
    if(expanded.has(id)){details.open=true;show();}
  }
  window.RiftRivals={mount};
})();
