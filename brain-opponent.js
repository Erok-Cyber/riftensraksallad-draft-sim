/* Public, read-only opponent context. Never adds predicted picks to the draft. */
(()=>{
  const select=document.getElementById('brainOpponent'),hint=document.getElementById('brainOpponentHint');
  let plans=[],selected='',revision=0,offline=false,loading=true;
  const replay=new URLSearchParams(location.search).has('replay');
  try{selected=replay?'':sessionStorage.getItem('rs_brain_opponent')||'';}catch{}
  const active=()=>replay?null:plans.find(p=>String(p.id)===selected&&p.status!=='cancelled')||null;
  const canonical=name=>championRoster.find(c=>c.toLowerCase()===String(name||'').trim().toLowerCase());
  function prospects(){
    const plan=active();if(!plan)return [];
    const used=unavailable(),out=[];
    for(const entry of window.RiftScouting.lineup(plan)){
      // Known enemy roles supersede scouting. Never fill these with imaginary picks.
      if(enemyRoleShown(entry.role))continue;
      const confidence=entry.source==='challengermode'?0.85:Math.min(0.55,Math.max(0,Number(entry.roleConfidence)||0)/100);
      if(!confidence)continue;
      const pool=(entry.pool||[]).map(c=>({...c,champ:canonical(c.champ)}))
        .filter(c=>c.champ&&!used.has(c.champ.toLowerCase())&&enemyRoleCandidates(c.champ).includes(entry.role)).slice(0,3);
      const total=pool.reduce((n,c)=>n+Math.max(1,Number(c.seasonGames||c.recentGames)||1),0);
      pool.forEach(c=>out.push({champ:c.champ,role:entry.role,weight:confidence*Math.max(1,Number(c.seasonGames||c.recentGames)||1)/(total||1)}));
    }
    return out;
  }
  function pickSignal(champ,role){
    const predicted=prospects();let points=0;const threats=[];
    for(const rule of specificRules){
      if(rule.role!==role||!rule.boost[champ])continue;
      const matches=predicted.filter(p=>rule.enemy.includes(p.champ));
      const weight=Math.min(1,matches.reduce((sum,p)=>sum+p.weight,0));
      points+=rule.boost[champ]*weight*0.3;
      if(weight>0)threats.push(...matches.map(p=>p.champ));
    }
    // Broad comp answers also cover scouted champions without a handwritten matchup rule.
    const mass=set=>predicted.reduce((sum,p)=>sum+(set.has(p.champ)?p.weight:0),0);
    const answers=[];
    const add=(value,label)=>{if(value>0){points+=value;if(value>=0.5)answers.push(label);}};
    if(smartTraits.peel.has(champ)||traits.disengage.has(champ))add(mass(traits.dive)*2,'peel mot deras dive-pool');
    if(traits.engage.has(champ)||smartTraits.pick.has(champ))add(mass(traits.poke)*2,'access mot deras poke-pool');
    if(smartTraits.antiTank.has(champ))add(mass(traits.tanks)*2,'damage mot deras tank-pool');
    if(smartTraits.zone.has(champ))add(mass(traits.melee)*1.2,'zonkontroll mot deras melee-pool');
    return {points:Math.min(8,points),reason:threats.length?'Scout: svar mot '+[...new Set(threats)].slice(0,2).join('/')+' om de väljs':answers.length?'Scout: '+answers[0]:''};
  }
  function plannedBans(){
    const plan=active();if(!plan)return [];
    const rows=[];
    ['b1','b2','b3'].forEach((key,i)=>{const ch=canonical(plan.phase1Plan?.[key]);if(ch)rows.push({ch,bonus:60-i*8,reason:'Sparad banplan mot '+plan.opponent+' · B'+(i+1)});});
    (plan.banPriority||[]).slice(0,5).forEach((b,i)=>{const ch=canonical(b.champ);if(ch&&!rows.some(x=>x.ch===ch))rows.push({ch,bonus:34-i*4,reason:'Ban-prioritet mot '+plan.opponent+(b.why?' · '+b.why:'')});});
    return rows;
  }
  function banRows(base){
    const used=unavailable(),predicted=prospects(),planned=plannedBans();
    const names=[...new Set([...base,...planned.map(p=>p.ch),...predicted.map(p=>p.champ)])];
    const phaseTwo=step>=12;
    return names.filter(ch=>!used.has(ch.toLowerCase())).map(ch=>{
      const row=planned.find(p=>p.ch===ch);
      const pool=predicted.filter(p=>p.champ===ch);
      // On second ban phase, pool threats in unresolved roles matter more than the old B1-B3 order.
      const bonus=(row?.bonus||0)*(phaseTwo?0.25:1)+Math.min(24,pool.reduce((sum,p)=>sum+p.weight*24,0));
      return {ch,score:banScore(ch)+bonus,reason:row?.reason||(pool.length?'Scoutad championpool hos '+active().opponent:'Comp och visade hot')};
    }).sort((a,b)=>b.score-a.score);
  }
  window.RiftOpponent={active,key:()=>selected+':'+revision,pickSignal,
    bans:base=>banRows(base).slice(0,3).map(r=>r.ch),
    banReason:champ=>active()?banRows([champ]).find(r=>r.ch===champ)?.reason:''};
  function update(){
    if(!select)return;
    select.replaceChildren();
    const add=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o);};
    add('','Generella rekommendationer');
    plans.filter(p=>p.status!=='cancelled'&&(p.status!=='completed'||String(p.id)===selected))
      .sort((a,b)=>String(a.scheduledAt||'').localeCompare(String(b.scheduledAt||'')))
      .forEach(p=>add(String(p.id),p.opponent||'Motståndare'));
    if(!active()&&!loading)selected='';
    select.value=selected;select.disabled=replay;
    const plan=active();
    hint.textContent=replay?'Historisk övning använder ingen aktuell motståndarscouting.':plan
      ?(offline?'Cachad scouting · ':'')+'Banplan + starters pooler. Visade picks väger tyngst.'
      :(loading?'Laddar lag… ':offline?'Kunde inte uppdatera lagen. ':'')+(plans.length?'Välj ett lag för anpassade bans och picks.':'Lägg till en match i Ban Planner för att välja motståndare.');
  }
  select?.addEventListener('change',()=>{
    selected=select.value;try{sessionStorage.setItem('rs_brain_opponent',selected);}catch{}
    update();if(userSide)render();
  });
  async function load(){
    try{const cached=JSON.parse(localStorage.getItem('rs_ban_plans_cache')||'[]');if(Array.isArray(cached))plans=cached;offline=true;}catch{}
    update();
    try{
      const url=window.RIFT_DB_CONFIG?.plannerFunctionUrl;if(!url)throw Error('Ej konfigurerat');
      const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();if(!Array.isArray(data.plans))throw Error('Saknar planer');
      plans=data.plans.map(row=>{const p=row.payload||row;return {...p,id:row.id||p.id,opponent:row.opponent||p.opponent,status:row.status||p.status,scheduledAt:row.scheduled_at||p.scheduledAt};});
      offline=false;loading=false;revision++;update();if(userSide)render();
    }catch{offline=true;loading=false;update();}
  }
  // Wait for the core and scoring scripts to initialize before reading draft state.
  document.addEventListener('DOMContentLoaded',load,{once:true});
})();
