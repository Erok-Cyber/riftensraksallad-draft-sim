/* Public, read-only opponent context. Never adds predicted picks to the draft. */
(()=>{
  const select=document.getElementById('brainOpponent'),hint=document.getElementById('brainOpponentHint');
  let plans=[],selected='',revision=0,offline=false,loading=true;
  const replay=new URLSearchParams(location.search).has('replay');
  try{selected=replay?'':sessionStorage.getItem('rs_brain_opponent')||'';}catch{}
  const active=()=>replay?null:plans.find(p=>String(p.id)===selected&&p.status!=='cancelled')||null;
  const canonical=name=>championRoster.find(c=>c.toLowerCase()===String(name||'').trim().toLowerCase());
  const identity=value=>String(value||'').trim().toLowerCase();
  function evidence(){
    const plan=active();if(!plan)return [];
    const lineup=window.RiftScouting.lineup(plan),out=[];
    const games=(plan.competitiveEvidence?.games||[]).slice(-10);
    const keys=entry=>[entry.cmUsername,entry.player?.riotId].map(identity).filter(Boolean);
    const matches=(pick,entry)=>[pick.player,pick.riotId].map(identity).filter(Boolean).some(k=>keys(entry).includes(k));
    lineup.forEach(entry=>{
      const played=[];
      games.forEach(game=>(game.picks||[]).forEach(pick=>{
        // Exact identity only. Old roster members and ambiguous names cannot become current starters.
        if(matches(pick,entry)&&lineup.filter(e=>matches(pick,e)).length===1)played.push(pick);
      }));
      const recentRole=[...played].reverse().find(p=>roles.includes(p.role))?.role;
      const lockedRoles=lineup.filter(e=>e.source==='challengermode').map(e=>e.role);
      const role=entry.source==='challengermode'?entry.role:
        recentRole&&!lockedRoles.includes(recentRole)?recentRole:entry.role;
      const roleCertain=entry.source==='challengermode'||role===recentRole;
      const add=(champ)=>{
        const ch=canonical(champ);if(!ch)return null;
        let row=out.find(x=>x.champ===ch&&x.player===entry.player.riotId);
        if(!row){row={champ:ch,role,player:entry.player.riotId,cm:0,season:0,recent:0,winrate:0,roleCertain};out.push(row);}
        return row;
      };
      played.forEach(pick=>{const row=add(pick.champ);if(row)row.cm++;});
      (entry.player?.topChampions||[]).forEach(c=>{
        const ch=canonical(c.champ);if(!ch)return;
        // Only the starter's relevant role pool, unless tournament evidence confirms the pick.
        if(!played.some(p=>canonical(p.champ)===ch)&&!enemyRoleCandidates(ch).includes(role))return;
        const season=Math.max(0,Number(c.seasonGames)||0),recent=Math.max(0,Number(c.recentGames)||0);
        if(!season&&!recent)return;
        const row=add(ch);row.season=season;row.recent=recent;
        row.winrate=Math.max(0,Math.min(100,Number(c.seasonWinrate)||50));
      });
    });
    return out;
  }
  function availableEvidence(){
    const used=unavailable();
    return evidence().filter(row=>!used.has(row.champ.toLowerCase())&&!enemyRoleShown(row.role));
  }
  function evidenceScore(row){
    const sample=row.season||row.recent;
    const winBonus=sample?Math.max(0,(row.winrate-50)*sample/(sample+20))*0.2:0;
    return (row.cm?50+Math.min(20,(row.cm-1)*7):0)+Math.log2(row.season+1)*4+Math.log2(row.recent+1)*7+winBonus;
  }
  function prospects(){
    const rows=availableEvidence(),out=[];
    for(const role of roles){
      const pool=rows.filter(r=>r.role===role).sort((a,b)=>evidenceScore(b)-evidenceScore(a)).slice(0,4);
      const total=pool.reduce((n,r)=>n+evidenceScore(r),0);
      pool.forEach(r=>out.push({...r,weight:(r.roleCertain?1:0.7)*evidenceScore(r)/(total||1)}));
    }
    return out;
  }
  function pickSignal(champ,role){
    const predicted=prospects();let points=0;const threats=[];
    for(const rule of specificRules){
      if(rule.role!==role||!rule.boost[champ])continue;
      const matches=predicted.filter(p=>rule.enemy.includes(p.champ));
      const weight=Math.min(1,matches.reduce((sum,p)=>sum+p.weight,0));
      points+=rule.boost[champ]*weight*0.85;
      if(weight>0)threats.push(...matches.map(p=>p.champ));
    }
    // Broad comp answers also cover scouted champions without a handwritten matchup rule.
    const mass=set=>predicted.reduce((sum,p)=>sum+(set.has(p.champ)?p.weight:0),0);
    const answers=[];
    const add=(value,label)=>{if(value>0){points+=value;if(value>=0.5)answers.push(label);}};
    if(smartTraits.peel.has(champ)||traits.disengage.has(champ))add(mass(traits.dive)*5,'peel mot deras dive-pool');
    if(traits.engage.has(champ)||smartTraits.pick.has(champ))add(mass(traits.poke)*5,'access mot deras poke-pool');
    if(smartTraits.antiTank.has(champ))add(mass(traits.tanks)*5,'damage mot deras tank-pool');
    if(smartTraits.zone.has(champ))add(mass(traits.melee)*3,'zonkontroll mot deras melee-pool');
    return {points:Math.min(24,points),reason:threats.length?'Scout: svar mot '+[...new Set(threats)].slice(0,2).join('/')+' om de väljs':answers.length?'Scout: '+answers[0]:''};
  }
  function sourceText(row){
    const parts=[];
    if(row.cm)parts.push('CM: '+row.cm+' tävlingspick'+(row.cm===1?'':'s'));
    if(row.recent)parts.push('OP.GG: '+row.recent+' senaste matcher');
    else if(row.season)parts.push('OP.GG: '+row.season+' säsongsmatcher');
    return parts.join(' · ')+' · '+row.player;
  }
  function banRows(){
    const merged=new Map();
    availableEvidence().forEach(row=>{
      const score=evidenceScore(row),existing=merged.get(row.champ);
      if(!existing||score>existing.score)merged.set(row.champ,{ch:row.champ,score,reason:sourceText(row)});
    });
    return [...merged.values()].sort((a,b)=>b.score-a.score||a.ch.localeCompare(b.ch));
  }
  function summary(){
    const rows=evidence();
    if(!rows.length)return 'Scouting saknas för aktuella starters. Inga generiska target bans fylls på.';
    return 'CM + OP.GG · '+new Set(rows.map(r=>r.player)).size+' starters med data'+
      (rows.some(r=>r.recent)?' · senaste matcher vägs in':' · OP.GG bygger på säsongsdata');
  }
  window.RiftOpponent={active,key:()=>selected+':'+revision,pickSignal,summary,
    scouting:()=>availableEvidence().map(({champ,role,cm,season,recent,roleCertain})=>({champ,role,cm,season,recent,roleCertain})),
    bans:()=>banRows().slice(0,3).map(r=>r.ch),
    banReason:champ=>active()?banRows().find(r=>r.ch===champ)?.reason:''};
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
      ?(offline?'Cachad scouting · ':'')+summary()
      :(loading?'Laddar lag… ':offline?'Kunde inte uppdatera lagen. ':'')+(plans.length?'Välj ett lag för anpassade bans och picks.':'Lägg till en match i Ban Planner för att välja motståndare.');
  }
  select?.addEventListener('change',()=>{
    selected=select.value;try{sessionStorage.setItem('rs_brain_opponent',selected);}catch{}
    update();if(userSide)render();
  });
  async function load(){
    try{const cached=JSON.parse(localStorage.getItem('rs_ban_plans_cache')||'[]');if(Array.isArray(cached))plans=cached;offline=true;}catch{}
    revision++;update();if(userSide)render();
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
