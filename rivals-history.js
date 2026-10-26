/* Shared, lazy read-only Rivals history for Ban Planner and Draft Brain. */
(()=>{
  const cache=new Map(),expanded=new Set();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('sv-SE',{day:'numeric',month:'short'}):'Datum saknas';
  const roleOrder=['top','jungle','mid','adc','support'];
  // Display-only role priors, not patch statistics. A whole-game assignment
  // prevents independent flex guesses from producing duplicate roles.
  const rolePriors={};
  const prior=(role,names,score)=>names.split('|').forEach(ch=>{(rolePriors[ch]??={})[role]=score;});
  prior('top',"Aatrox|Ambessa|Camille|Cho'Gath|Darius|Dr. Mundo|Fiora|Gangplank|Garen|Gnar|Gwen|Illaoi|Irelia|Jax|Jayce|Kayle|Kennen|Kled|K'Sante|Malphite|Mordekaiser|Nasus|Olaf|Ornn|Quinn|Renekton|Riven|Rumble|Sett|Shen|Singed|Sion|Tahm Kench|Teemo|Tryndamere|Urgot|Yorick|Zaahen",10);
  prior('jungle',"Amumu|Bel'Veth|Briar|Diana|Elise|Evelynn|Fiddlesticks|Graves|Hecarim|Ivern|Jarvan IV|Karthus|Kayn|Kha'Zix|Kindred|Lee Sin|Lillia|Master Yi|Nidalee|Nocturne|Nunu & Willump|Rammus|Rek'Sai|Sejuani|Shaco|Shyvana|Skarner|Udyr|Vi|Viego|Warwick|Wukong|Xin Zhao|Zac",10);
  prior('mid',"Ahri|Akali|Akshan|Anivia|Annie|Aurelion Sol|Aurora|Azir|Cassiopeia|Ekko|Fizz|Galio|Heimerdinger|Hwei|Kassadin|Katarina|LeBlanc|Lissandra|Lux|Malzahar|Mel|Naafiri|Neeko|Orianna|Qiyana|Ryze|Smolder|Swain|Sylas|Syndra|Taliyah|Talon|Twisted Fate|Veigar|Vel'Koz|Vex|Viktor|Vladimir|Xerath|Yasuo|Yone|Zed|Ziggs|Zoe",10);
  prior('adc',"Aphelios|Ashe|Caitlyn|Corki|Draven|Ezreal|Jhin|Jinx|Kai'Sa|Kalista|Kog'Maw|Lucian|Miss Fortune|Nilah|Samira|Sivir|Smolder|Tristana|Twitch|Varus|Vayne|Xayah|Yunara|Zeri",10);
  prior('support',"Alistar|Bard|Blitzcrank|Braum|Janna|Karma|Leona|Lulu|Milio|Nami|Nautilus|Pyke|Rakan|Rell|Renata Glasc|Senna|Seraphine|Sona|Soraka|Taric|Thresh|Yuumi|Zilean|Zyra",10);
  prior('top','Gragas|Pantheon|Poppy|Trundle|Volibear',10);
  prior('jungle','Gragas|Poppy|Trundle|Volibear',9);
  prior('mid','Pantheon|Gragas|Tristana|Corki',7);
  prior('support',"Lux|Xerath|Vel'Koz|Swain|Neeko|Brand|Maokai",8);
  prior('jungle','Brand|Maokai|Ekko|Taliyah|Pantheon|Talon|Qiyana|Naafiri',6);
  prior('mid','Brand|Karma|Seraphine',7);
  prior('top',"Akali|Yone|Yasuo|Vladimir|Vayne|Heimerdinger|Cassiopeia|Ryze|Maokai|Warwick|Sylas|Aurora|Galio",6);
  prior('support','Pantheon|Poppy|Shen|Tahm Kench|Galio|Ashe|Amumu|Shaco|Fiddlesticks',5);
  prior('adc','Ziggs|Seraphine|Swain|Senna|Yasuo|Veigar|Hwei|Karthus',7);
  function orderedPicks(picks,plan){
    const rows=picks.map((p,index)=>({...p,index,role:'',inferred:false,roleUncertain:false}));
    const counts={};picks.forEach(p=>{if(roleOrder.includes(p.role)&&!p.inferred)counts[p.role]=(counts[p.role]||0)+1;});
    const locked=new Set();
    rows.forEach((p,i)=>{const src=picks[i];if(roleOrder.includes(src.role)&&!src.inferred&&counts[src.role]===1){p.role=src.role;locked.add(src.role);}});
    const missing=rows.filter(p=>!p.role),available=roleOrder.filter(r=>!locked.has(r));
    // Malformed >5-player games are kept visible without inventing extra roles.
    if(missing.length<=available.length){
      const solutions=[];
      function walk(i,left,assignment,score){
        if(i===missing.length){solutions.push({assignment:[...assignment],score});return;}
        left.forEach((role,j)=>walk(i+1,left.filter((_,k)=>j!==k),[...assignment,role],score+(rolePriors[missing[i].champ]?.[role]||0)));
      }
      walk(0,available,[],0);solutions.sort((a,b)=>b.score-a.score);
      const best=solutions[0];
      if(best)missing.forEach((p,i)=>{
        p.role=best.assignment[i];p.inferred=true;
        // Tied/near-tied flex options and unprofiled forced slots stay explicit.
        p.roleUncertain=!(rolePriors[p.champ]?.[p.role])||solutions.some(s=>s.score>=best.score-2&&s.assignment[i]!==p.role);
      });
    }
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
          ((g.picks||[]).length?'<ul class="rivals-picks">'+orderedPicks(g.picks,plan).map(p=>'<li><span>'+esc(p.role?p.role.toUpperCase()+(p.roleUncertain?' ≈ ?':p.inferred?' ≈':''):'ROLL OKÄND')+'</span><strong>'+esc(p.champ)+'</strong><span>'+esc(p.player)+(p.performance?' · '+esc(p.performance.kills!=null&&p.performance.deaths!=null&&p.performance.assists!=null?[p.performance.kills,p.performance.deaths,p.performance.assists].join('/'):'')+(p.performance.damageShare!=null?' · '+Math.round(p.performance.damageShare*100)+'% lagskada':''):'')+'</span></li>').join('')+'</ul>'+
            (orderedPicks(g.picks,plan).some(p=>p.inferred)?'<p class="rivals-note">≈ Sannolik roll utifrån hela femmans champions. ? = osäker fördelning. Inte verifierad matchroll.</p>':''):'')+
          ((g.picks||[]).length<5?'<p class="rivals-note">'+((g.picks||[]).length?'Vissa championval saknas.':'Championdata saknas för detta game.')+'</p>':'')+'</section>').join(''):'<p class="rivals-note">Inga spelade games registrerade. Serien kan vara administrativt avgjord.</p>')+'</div></details>').join(''):'<p class="rivals-note">Inga spelade Rivals-serier tillgängliga ännu.</p>');
  }
  async function load(plan){
    const id=String(plan.id),existing=cache.get(id);
    if(existing&&existing.until>Date.now())return existing.promise;
    const promise=(async()=>{
      const endpoint=window.RIFT_DB_CONFIG?.plannerFunctionUrl;if(!endpoint)throw Error('Saknar anslutning');
      const series=new Map();let offset=0,partial=false,totalSeries=0;
      for(let page=0;page<126;page++){
        const url=new URL(endpoint);url.searchParams.set('id',String(plan.sourcePlanId||id));url.searchParams.set('rivals','1');if(plan.isOwnTeam)url.searchParams.set('own','1');url.searchParams.set('offset',String(offset));
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




