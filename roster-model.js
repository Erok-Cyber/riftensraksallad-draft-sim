/* Shared browser-local roster, comfort and role-specific comp options. */
(()=>{'use strict';
 const data=window.RiftTeamData,KEY='rs_own_roster_v1',clone=v=>JSON.parse(JSON.stringify(v));
 const roles=['top','jungle','mid','adc','support'],names={top:'Dahlin',jungle:'Erik',mid:'Adrian',adc:'Tacky',support:'Frippen'};
 const defaults={profiles:roles.map(role=>({id:'core-'+role,role,name:names[role],pool:[...data.pools[role]],comfort:{...data.comfort[role]}})),active:Object.fromEntries(roles.map(role=>[role,'core-'+role]))};
 defaults.profiles.push({id:'jacob-support',role:'support',name:'Jacob',pool:['Nautilus','Maokai','Shen','Braum','Leona','Galio','Poppy'],comfort:{}});
  const supportFits={
    'EARLY SKIRMISH':{Braum:'setup och skydd i skirmishes',Poppy:'stoppar dash-engage',Shen:'taunt och skydd för melee-carry'},
    'PRESS R':{Galio:'följ upp engage; ersätter inte ensam en GO-knapp'},
    'OBJECTIVE CONTROL':{Braum:'skydda backline vid chokes',Poppy:'zonkontroll och anti-dash',Galio:'counter-engage vid objectives'},
    'JUNGLE CARRY':{Shen:'skydd och follow-up för junglern',Braum:'peel och setup',Poppy:'anti-dive runt carry',Galio:'följ upp junglerns engage'}
  };
  // Conservative role-specific variants. Unknown fits stay selectable, but receive no comp bonus.
  const roleFits={
    'EARLY SKIRMISH':{top:['Pantheon','Kled','Sett','Camille'],jungle:['Lee Sin','Elise','Rek\'Sai','Poppy'],mid:['Galio','Lissandra','LeBlanc'],adc:['Kalista','Lucian','Draven'],support:['Rell','Rakan','Alistar','Thresh']},
    'PRESS R':{top:['Ornn','Kennen','Gnar','Sett'],jungle:['Amumu','Sejuani','Zac','Diana'],mid:['Lissandra','Orianna','Neeko','Galio'],adc:['Miss Fortune','Samira','Aphelios'],support:['Rell','Rakan','Alistar']},
    'OBJECTIVE CONTROL':{top:['Ornn','Rumble','Cho\'Gath'],jungle:['Amumu','Sejuani','Zac','Ivern'],mid:['Orianna','Azir','Ziggs','Cassiopeia'],adc:['Caitlyn','Sivir','Aphelios'],support:['Zyra','Rell','Braum','Poppy']},
    'JUNGLE CARRY':{top:['Ornn','Poppy','Gragas'],jungle:['Bel\'Veth','Master Yi','Karthus'],mid:['Galio','Lissandra','Orianna'],adc:['Sivir','Jhin'],support:['Lulu','Renata Glasc','Thresh','Rakan']}
  };
  const score=(p,ch)=>Number.isInteger(p.comfort?.[ch])?p.comfort[ch]:(p.id==='core-'+p.role?(data.comfort[p.role]?.[ch]??7):8);
  const validScore=n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=10;
  function validate(raw){
    const out=clone(defaults),seen=new Set();
    for(const p of raw?.profiles||[]){
      if(!p||typeof p.id!=='string'||p.id.length>80||seen.has(p.id)||!roles.includes(p.role)||typeof p.name!=='string'||!p.name.trim()||!Array.isArray(p.pool)||!p.pool.length||p.pool.length>60)continue;
      const pool=[...new Set(p.pool.filter(c=>typeof c==='string'&&c.length>0&&c.length<60))];if(!pool.length)continue;
      seen.add(p.id);const profile={id:p.id,role:p.role,name:p.name.trim().slice(0,40),pool,comfort:{}};
      pool.forEach(ch=>{if(validScore(p.comfort?.[ch]))profile.comfort[ch]=Number(p.comfort[ch]);});
      if(profile.id==='core-support'&&profile.name==='Ordinarie support')profile.name='Frippen';
      const i=out.profiles.findIndex(x=>x.id===p.id);if(i<0)out.profiles.push(profile);else if(out.profiles[i].role===p.role)out.profiles[i]=profile;
    }
    roles.forEach(r=>{if(out.profiles.some(p=>p.role===r&&p.id===raw?.active?.[r]))out.active[r]=raw.active[r];});
    return out;
  }
  const read=()=>{try{return validate(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return clone(defaults);}};
  let state=read(),catalog=[...data.champions],images={...(data.images||{})},listeners=new Set();
  const player=r=>state.profiles.find(p=>p.id===state.active[r]&&p.role===r);
  function notify(){listeners.forEach(fn=>fn());}
  function mutate(fn){const before=clone(state);try{fn();localStorage.setItem(KEY,JSON.stringify(state));}catch(e){state=before;throw Error('Kunde inte spara: '+e.message);}notify();}
  const canonical=name=>({naut:'Nautilus',mao:'Maokai',j4:'Jarvan IV'}[String(name).toLowerCase()]||catalog.find(c=>c.toLowerCase()===String(name).trim().toLowerCase()));
  function parsePool(text){const entries=String(text).split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);if(!entries.length||entries.length>60)throw Error('Välj 1–60 champions.');return [...new Set(entries.map(n=>{const c=canonical(n);if(!c)throw Error('Okänd champion: '+n);return c;}))];}
  function savePlayer(role,id,name,pool){
    if(!roles.includes(role))throw Error('Välj en roll.');name=String(name).trim();if(!name||name.length>40)throw Error('Ange ett namn, högst 40 tecken.');
    pool=parsePool(Array.isArray(pool)?pool.join(','):pool);
    let savedId;mutate(()=>{let p=state.profiles.find(x=>x.id===id&&x.role===role);if(!p){p={id:'sub-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),role,comfort:{}};state.profiles.push(p);}Object.assign(p,{name,pool});p.comfort=Object.fromEntries(pool.map(ch=>[ch,score(p,ch)]));state.active[role]=p.id;savedId=p.id;});return savedId;
  }
  function compOptions(){
    return Object.fromEntries(Object.entries(data.comps).map(([name,c])=>[name,Object.fromEntries(roles.map(role=>{
      const fit=new Set([c.core[role],...(c.alts[role]||[]),...(roleFits[name]?.[role]||[]),...(role==='support'?Object.keys(supportFits[name]||{}):[])]);
      const p=player(role),options=p.pool.filter(ch=>fit.has(ch));
      options.sort((a,b)=>score(p,b)-score(p,a)||Number(b===c.core[role])-Number(a===c.core[role])||a.localeCompare(b));
      return [role,options];
    }))]));
  }
  function compPlan(name){
    const options=compOptions()[name];if(!options)return null;
    // Choose five distinct champions; maximize comfort, then preserve the familiar baseline on ties.
    let best={value:-Infinity,picks:Object.fromEntries(roles.map(r=>[r,null]))};
    const ordered=[...roles].sort((a,b)=>options[a].length-options[b].length);
    function walk(i,used,picks,value){
      if(i===ordered.length){if(value>best.value)best={value,picks:{...picks}};return;}
      const role=ordered[i],pool=options[role].filter(ch=>!used.has(ch)).slice(0,8);
      if(!pool.length){walk(i+1,used,{...picks,[role]:null},value-1000);return;}
      pool.forEach(ch=>{used.add(ch);walk(i+1,used,{...picks,[role]:ch},value+score(player(role),ch)+(ch===data.comps[name].core[role]?0.01:0));used.delete(ch);});
    }
    walk(0,new Set(),{},0);return best.picks;
  }
  function select(role,id){if(!state.profiles.some(p=>p.role===role&&p.id===id))return false;mutate(()=>state.active[role]=id);return true;}
  function setComfort(role,ch,value){const p=player(role);if(!p?.pool.includes(ch)||!validScore(value))throw Error('Comfort ska vara 1–10 för en champion i poolen.');mutate(()=>{p.comfort={...p.comfort,[ch]:Number(value)};});}
  function addChampion(role,name){const p=player(role),ch=canonical(name);if(!p||!ch)throw Error('Välj en champion från sökningen.');if(p.pool.includes(ch))return;if(p.pool.length>=60)throw Error('Poolen kan ha högst 60 champions.');mutate(()=>{p.pool.push(ch);p.comfort={...p.comfort,[ch]:5};});}
  function removeChampion(role,ch){const p=player(role);if(!p?.pool.includes(ch))return;if(p.pool.length<=1)throw Error('Behåll minst en champion i poolen.');mutate(()=>{p.pool=p.pool.filter(x=>x!==ch);delete p.comfort?.[ch];});}
  window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){state=read();notify();}});
  window.RiftRoster={roles,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},select,savePlayer,parsePool,setComfort,addChampion,removeChampion,
    player:r=>{const p=player(r);return clone({...p,comfort:Object.fromEntries(p.pool.map(ch=>[ch,score(p,ch)]))});},snapshot:()=>clone(state),
    comfort:(r,ch)=>score(player(r),ch),compWeight:(r,ch)=>score(player(r),ch)/10,
    compOptions:()=>clone(compOptions()),compPlan,key:()=>JSON.stringify(state),
    catalog:()=>[...catalog],image:ch=>images[ch]||'',
    rolesFor:ch=>roles.filter(role=>data.pools[role].includes(ch)||Object.entries(data.comps).some(([name,c])=>c.core[role]===ch||(c.alts[role]||[]).includes(ch)||(roleFits[name]?.[role]||[]).includes(ch)||(role==='support'&&Object.hasOwn(supportFits[name]||{},ch)))),
    async loadCatalog(){try{const versions=await fetch('https://ddragon.leagueoflegends.com/api/versions.json').then(r=>r.json());const raw=await fetch('https://ddragon.leagueoflegends.com/cdn/'+versions[0]+'/data/en_US/champion.json').then(r=>r.json());if(!raw.data)throw Error('Missing catalog');catalog=Object.values(raw.data).map(c=>c.name).sort();images=Object.fromEntries(Object.values(raw.data).map(c=>[c.name,'https://ddragon.leagueoflegends.com/cdn/'+versions[0]+'/img/champion/'+c.image.full]));return true;}catch{return false;}}
  };
})();
