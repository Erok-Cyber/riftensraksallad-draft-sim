/* Local lineup profiles. Never writes shared team data or changes locked picks. */
(() => {
  'use strict';
  const KEY='rs_own_roster_v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const basePools=clone(teamPool),baseComfort=clone(comfort),baseComps=clone(comps);
  const names={top:'Dahlin',jungle:'Erik',mid:'Adrian',adc:'Tacky',support:'Ordinarie support'};
  const defaults={profiles:roles.map(role=>({id:'core-'+role,role,name:names[role],pool:basePools[role]})),active:Object.fromEntries(roles.map(role=>[role,'core-'+role]))};
  defaults.profiles.push({id:'jacob-support',role:'support',name:'Jacob',pool:['Nautilus','Maokai','Shen','Braum','Leona','Galio','Poppy']});
  // Alternatives, not replacements for the core or unconditional pick priorities.
  const supportFits={
    'EARLY SKIRMISH':{Braum:'setup och skydd i skirmishes',Poppy:'stoppar dash-engage',Shen:'taunt och skydd för melee-carry'},
    'PRESS R':{Galio:'följ upp engage; ersätter inte ensam en GO-knapp'},
    'OBJECTIVE CONTROL':{Braum:'skydda backline vid chokes',Poppy:'zonkontroll och anti-dash',Galio:'counter-engage vid objectives'},
    'JUNGLE CARRY':{Shen:'skydd och follow-up för junglern',Braum:'peel och setup',Poppy:'anti-dive runt carry',Galio:'följ upp junglerns engage'}
  };
  const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function validate(raw){
    const out=clone(defaults);
    if(!raw||!Array.isArray(raw.profiles))return out;
    const seen=new Set();
    const valid=raw.profiles.filter(p=>p&&typeof p.id==='string'&&p.id.length<80&&roles.includes(p.role)&&typeof p.name==='string'&&p.name.trim()&&Array.isArray(p.pool)&&p.pool.length&&p.pool.length<=60&&p.pool.every(c=>typeof c==='string'&&c.length>0&&c.length<60)&&!seen.has(p.id)&&seen.add(p.id));
    valid.forEach(p=>{const v={id:p.id,role:p.role,name:p.name.trim().slice(0,40),pool:[...new Set(p.pool)]};const i=out.profiles.findIndex(x=>x.id===v.id);if(i<0)out.profiles.push(v);else if(out.profiles[i].role===v.role)out.profiles[i]=v;});
    roles.forEach(role=>{if(out.profiles.some(p=>p.id===raw.active?.[role]&&p.role===role))out.active[role]=raw.active[role];});
    return out;
  }
  let state;
  try{state=validate(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{state=clone(defaults);}
  function player(role){return state.profiles.find(p=>p.id===state.active[role]&&p.role===role);}
  function apply(){
    roles.forEach(role=>{
      const p=player(role);teamPool[role]=[...p.pool];
      comfort[role]=Object.fromEntries(p.pool.map(ch=>[ch,p.id==='core-'+role?(baseComfort[role][ch]||7):8]));
    });
    Object.entries(baseComps).forEach(([name,comp])=>{
      comps[name].alts=clone(comp.alts);
      roles.forEach(role=>{comps[name].alts[role]=(comp.alts[role]||[]).filter(ch=>teamPool[role].includes(ch));});
      comps[name].alts.support=[...new Set([...comps[name].alts.support,...Object.keys(supportFits[name]||{}).filter(ch=>teamPool.support.includes(ch))])].filter(ch=>ch!==comp.core.support);
    });
  }
  function key(){return JSON.stringify(roles.map(r=>[state.active[r],teamPool[r],comfort[r]]));}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
  function refresh(message){
    apply();renderUI();if(userSide)render();
    const saved=persist();
    $('rosterMessage').textContent=message+(saved?' Sparat i denna webbläsare.':' Kunde inte sparas; gäller bara tills sidan laddas om.');
  }
  function select(role,id){
    if(!state.profiles.some(p=>p.id===id&&p.role===role))return false;
    state.active[role]=id;refresh('Aktiv spelare uppdaterad. Låsta picks är oförändrade.');return true;
  }
  function parsePool(text){
    const known=[...new Set([...championRoster,...Object.values(basePools).flat()])];
    const aliases={naut:'Nautilus',mao:'Maokai',j4:'Jarvan IV'};
    const entries=text.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
    if(!entries.length||entries.length>60)throw Error('Ange 1–60 champions, separerade med kommatecken.');
    return [...new Set(entries.map(name=>{const canonical=aliases[name.toLowerCase()]||known.find(c=>c.toLowerCase()===name.toLowerCase());if(!canonical)throw Error('Okänd champion: '+name+'. Använd det fullständiga namnet.');return canonical;}))];
  }
  function savePlayer(role,id,name,text){
    if(!roles.includes(role))throw Error('Välj en roll.');
    name=name.trim();if(!name||name.length>40)throw Error('Spelarnamnet ska vara 1–40 tecken.');
    const pool=parsePool(text);
    let p=state.profiles.find(x=>x.id===id&&x.role===role);
    if(!p){p={id:'sub-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),role};state.profiles.push(p);}
    Object.assign(p,{name,pool});state.active[role]=p.id;refresh('Spelaren är sparad och vald.');return p.id;
  }
  function fillEditor(){
    const role=$('rosterEditRole').value||'support';
    const p=player(role);
    $('rosterEditName').value=p.name;$('rosterEditPool').value=p.pool.join(', ');$('rosterEditor').dataset.player=p.id;
  }
  function renderUI(){
    const holder=$('rosterPlayers');if(!holder)return;
    $('rosterSummary').textContent=roles.map(r=>player(r).name).join(' · ');
    holder.innerHTML=roles.map(role=>'<label class="roster-slot">'+roleNames[role]+'<select data-roster-role="'+role+'" aria-label="Spelare '+roleNames[role]+'">'+state.profiles.filter(p=>p.role===role).map(p=>'<option value="'+esc(p.id)+'"'+(state.active[role]===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select><small>'+teamPool[role].length+' champions</small></label>').join('');
    holder.querySelectorAll('[data-roster-role]').forEach(el=>el.addEventListener('change',()=>select(el.dataset.rosterRole,el.value)));
    $('rosterCompFits').innerHTML=Object.entries(comps).map(([name,c])=>{
      const core=teamPool.support.includes(c.core.support)?c.core.support+' (core)':c.core.support+' (core saknas i aktiv pool)';
      const alternatives=c.alts.support.map(ch=>esc(ch)+(supportFits[name]?.[ch]?' — '+esc(supportFits[name][ch]):''));
      return '<div><strong>'+esc(name)+'</strong><p>'+esc(core)+(alternatives.length?' · '+alternatives.join(' · '):'')+'</p></div>';
    }).join('');
    const unavailablePicks=ours().filter(e=>e.role&&teamPool[e.role]&&!teamPool[e.role].includes(e.champ));
    $('rosterWarning').textContent=unavailablePicks.length?'Redan låst utanför aktiv pool: '+unavailablePicks.map(e=>e.champ).join(', ')+'. Använd Undo om du vill ändra draften.':'';
    fillEditor();
  }
  window.RiftRoster={key,player:role=>clone(player(role)),select,savePlayer,parsePool,snapshot:()=>clone(state)};
  // Complete the support profiles in the existing explainable engine.
  ['frontline','tanks','melee'].forEach(trait=>traits[trait].add('Braum'));
  damageType.Braum='UTIL';damageType.Poppy='AD';
  ['Braum','Poppy','Galio'].forEach(ch=>ADV_COUNTER_ENGAGE.add(ch));
  Object.assign(ADV_FRONT_Q,{Braum:2.5,Poppy:2.5});
  Object.assign(ADV_PEEL_Q,{Braum:3,Poppy:2.9,Galio:2.4});
  Object.assign(ADV_ENGAGE_Q,{Braum:1,Poppy:1.2,Galio:1.5});
  specificRules.push(
    {enemy:['Samira','Kalista','Tristana','Rakan','Lee Sin','Zac'],role:'support',boost:{Poppy:18}},
    {enemy:['Nautilus','Leona','Lucian','Miss Fortune'],role:'support',boost:{Braum:12}},
    {enemy:['Akali','Diana','Katarina'],role:'support',boost:{Galio:12}}
  );
  synergyRules.push({own:['Ashe','Lucian'],role:'support',boost:{Braum:12}},
    {own:['Jarvan IV','Vi','Wukong'],role:'support',boost:{Galio:12,Shen:8}},
    {own:['Kindred','Graves','Viego'],role:'support',boost:{Braum:8,Shen:10}});
  apply();renderUI();
  $('rosterEditRole').addEventListener('change',fillEditor);
  $('rosterNew').addEventListener('click',()=>{$('rosterEditor').dataset.player='';$('rosterEditName').value='';$('rosterEditPool').value='';$('rosterMessage').textContent='Fyll i namn och championpool för en ny sub i vald roll.';});
  $('rosterSave').addEventListener('click',()=>{try{savePlayer($('rosterEditRole').value,$('rosterEditor').dataset.player,$('rosterEditName').value,$('rosterEditPool').value);}catch(e){$('rosterMessage').textContent=e.message;}});
  if(userSide)render();
})();
