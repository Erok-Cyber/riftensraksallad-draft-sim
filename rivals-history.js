/* Shared, lazy read-only Rivals history for Ban Planner and Draft Brain. */
(()=>{
  const cache=new Map(),expanded=new Set();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('sv-SE',{day:'numeric',month:'short'}):'Datum saknas';
  const roleOrder=['top','jungle','mid','adc','support'];
  function orderedPicks(picks,plan){
    // A current starter's role is not evidence of their role in an older game.
    // Keep only roles attached to the historical pick; never use lineup order,
    // current scouting, champion stereotypes or remaining slots as proof.
    const rows=picks.map((p,index)=>({
      ...p,index,role:roleOrder.includes(p.role)&&!p.inferred?p.role:'',inferred:false
    }));
    return rows.sort((a,b)=>(roleOrder.includes(a.role)?roleOrder.indexOf(a.role):5)-(roleOrder.includes(b.role)?roleOrder.indexOf(b.role):5)||a.index-b.index);
  }
  function archiveUrl(plan,series){
    return "rivals.html?plan="+encodeURIComponent(plan?.id||"")+(series?"#series-"+encodeURIComponent(series.id):"");
  }
  function rows(data,plan){
    const series=Array.isArray(data.series)?data.series:[];
    return (data.partial?'<p class="rivals-note">Vissa matcher kunde inte hämtas. Försök igen senare.</p>':'')+
      '<p class="rivals-note">'+series.length+' av '+(Number(data.totalSeries)||series.length)+' serier inlästa · prestationsmått är indikatorer, inte bevis på spelarstyrka.</p>'+
      (series.length?series.map(s=>'<details class="rivals-series"><summary><span><strong>'+esc(s.team)+' <span class="rivals-vs">vs</span> '+esc(s.opponent||'Motståndare saknas')+'</strong><small>'+esc(date(s.playedAt))+' · '+(s.games||[]).length+' registrerade games</small></span></summary>'+
        '<div class="rivals-games"><a class="rivals-archive-link" target="_blank" rel="noopener" href="'+esc(archiveUrl(plan,s))+'">Öppna serien i matcharkivet ↗</a>'+((s.games||[]).length?(s.games||[]).map(g=>'<section class="rivals-game"><h4>Game '+esc(g.number)+'<span class="rivals-result '+(g.result==='win'?'win':g.result==='loss'?'loss':'')+'">'+(g.result==='win'?'W · Vinst':g.result==='loss'?'L · Förlust':g.result==='draw'?'Oavgjort':'Resultat saknas')+'</span></h4>'+
          ((g.picks||[]).length?'<ul class="rivals-picks">'+orderedPicks(g.picks,plan).map(p=>'<li><span>'+esc(p.role?p.role.toUpperCase()+(p.inferred?' ≈':''):'ROLL OKÄND')+'</span><strong>'+esc(p.champ)+'</strong><span>'+esc(p.player)+(p.performance?' · '+esc(p.performance.kills!=null&&p.performance.deaths!=null&&p.performance.assists!=null?[p.performance.kills,p.performance.deaths,p.performance.assists].join('/'):'')+(p.performance.damageShare!=null?' · '+Math.round(p.performance.damageShare*100)+'% lagskada':''):'')+'</span></li>').join('')+'</ul>'+
            (orderedPicks(g.picks,plan).some(p=>!p.role)?'<p class="rivals-note">Historiska roller saknas i underlaget. Spelarna visas utan uppskattad roll.</p>':''):'')+
          ((g.picks||[]).length<5?'<p class="rivals-note">'+((g.picks||[]).length?'Vissa championval saknas.':'Championdata saknas för detta game.')+'</p>':'')+'</section>').join(''):'<p class="rivals-note">Inga spelade games registrerade. Serien kan vara administrativt avgjord.</p>')+'</div></details>').join(''):'<p class="rivals-note">Inga spelade Rivals-serier tillgängliga ännu.</p>');
  }
  async function load(plan){
    const id=String(plan.id),existing=cache.get(id);
    if(existing&&existing.until>Date.now())return existing.promise;
    const promise=(async()=>{
      const endpoint=window.RIFT_DB_CONFIG?.plannerFunctionUrl;if(!endpoint)throw Error('Saknar anslutning');
      const series=new Map();let offset=0,partial=false,totalSeries=0;
      for(let page=0;page<126;page++){
        const url=new URL(endpoint);url.searchParams.set('id',id);url.searchParams.set('rivals','1');url.searchParams.set('offset',String(offset));
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
        try{
          const res=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);
          const data=await res.json();if(!Array.isArray(data.series))throw Error('Ogiltig matchdata');
          data.series.forEach(s=>series.set(s.id,s));partial=partial||!!data.partial;totalSeries=data.totalSeries||series.size;
          if(data.nextOffset==null)return {series:[...series.values()],partial,totalSeries};
          if(!Number.isInteger(data.nextOffset)||data.nextOffset<=offset||data.nextOffset>500)break;
          offset=data.nextOffset;
        }catch(e){if(!series.size)throw e;return {series:[...series.values()],partial:true,totalSeries};}
        finally{clearTimeout(timeout);}
      }
      return {series:[...series.values()],partial:true,totalSeries};
    })();
    cache.set(id,{until:Date.now()+10*60*1000,promise});
    try{const data=await promise;window.RiftDraftContext?.observe(plan,data);return data;}catch(e){cache.delete(id);throw e;}
  }
  function mount(host,plan){
    if(!host)return;
    const id=String(plan?.id||'');
    if(host.dataset.rivalsPlan===id&&host.firstChild)return;
    host.dataset.rivalsPlan=id;host.replaceChildren();
    if(!id||(!plan.challengermode&&!plan.challengermodeUrl))return;
    host.innerHTML='<a class="rivals-archive-link rivals-archive-main" target="_blank" rel="noopener" href="'+esc(archiveUrl(plan))+'">Rivals · '+esc(plan.opponent)+' · Öppna matcharkivet ↗</a><details class="rivals-history"><summary>Rivals · tidigare matcher</summary><div class="rivals-body" aria-live="polite"></div></details>';
    const details=host.querySelector('details'),body=host.querySelector('.rivals-body');let loaded=false,busy=false;
    async function show(){
      if(busy||loaded||!details.open)return;
      busy=true;body.innerHTML='<p class="rivals-note">Hämtar matcher från Challengermode…</p>';
      try{
        const data=await load(plan);if(host.dataset.rivalsPlan!==id||!host.contains(body))return;
        body.innerHTML='<p class="rivals-note">'+esc(plan.opponent)+'s faktiska tävlingspicks · hämtade ligaserier.</p>'+rows(data,plan)+(window.RiftDraftContext?.preparationHTML(plan)||'');loaded=true;
      }catch{
        if(host.dataset.rivalsPlan!==id||!host.contains(body))return;
        body.innerHTML='<p class="rivals-note">Kunde inte hämta Rivals-matcher.</p><button type="button" class="secondary">Försök igen</button>';
        body.querySelector('button').addEventListener('click',show);
      }finally{busy=false;}
    }
    details.addEventListener('toggle',()=>{details.open?expanded.add(id):expanded.delete(id);show();});
    if(expanded.has(id)){details.open=true;show();}
  }
  window.RiftRivals={mount,load};
  Object.assign(window.RiftRivals,{orderedPicks,archiveUrl,clear:id=>cache.delete(String(id))});
})();




