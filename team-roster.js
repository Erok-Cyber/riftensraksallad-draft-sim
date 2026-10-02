/* Bind the shared roster model to Draft Brain without changing locked picks. */
(()=>{'use strict';
 const roster=window.RiftRoster,base=window.RiftTeamData.comps;
 function apply(){
  roles.forEach(role=>{const p=roster.player(role);teamPool[role]=roster.available(role);comfort[role]={...p.comfort};});
  const options=roster.compOptions();
  Object.keys(base).forEach(name=>roles.forEach(role=>{comps[name].alts[role]=options[name][role].filter(ch=>ch!==base[name].core[role]);}));
  const summary=document.getElementById('rosterSummary');if(summary)summary.textContent=roles.map(r=>roster.player(r).name).join(' · ');
  const warning=document.getElementById('rosterWarning');if(warning){const locked=ours().filter(e=>e.role&&!teamPool[e.role]?.includes(e.champ));warning.textContent=locked.length?'Låsta picks utanför aktiv pool: '+locked.map(e=>e.champ).join(', ')+'. Draften är oförändrad.':'';}
 }
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

 apply();
 roster.subscribe(()=>{apply();if(userSide)render();});
 if(userSide)render();
})();
