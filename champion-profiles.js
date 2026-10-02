/* Shared, conservative kit profiles. Not patch win rates or matchup probabilities.
   Missing profiles remain explicitly unknown, never inferred as zero strength. */
(()=>{'use strict';
 const profiles={};
 const add=(names,damage,front,engage,peel,tags='')=>names.split('|').forEach(ch=>profiles[ch]={damage,front,engage,peel,tags:tags.split(' ').filter(Boolean)});
 add('Sion|Ornn','UTIL',3,2.5,1.8,'tank melee');
 add('Maokai','UTIL',3,2.5,2.8,'tank melee');
 add('Malphite','UTIL',2.8,3,1.4,'tank melee');
 add('Shen','UTIL',2.7,1.2,2.5,'tank melee');
 add('Nautilus','UTIL',2.5,2.6,2.6,'tank melee');
 add('Leona','UTIL',2.4,2.7,2.3,'tank melee');
 add('Braum','UTIL',2.5,1,3,'tank melee');
 add('Poppy','AD',2.5,1.2,2.9,'tank melee');
 add('Galio','AP',2.6,1.5,2.4,'melee wave');
 add('Rell|Alistar','UTIL',2.7,2.8,2.3,'tank melee');
 add('Sejuani|Zac|Amumu','UTIL',2.8,2.8,1.8,'tank melee');
 add('Rakan','UTIL',1.1,2.7,2.4,'melee');
 add('Thresh','UTIL',1.5,2,2.7,'ranged');
 add("Cho'Gath",'AP',3,1.2,2,'tank melee wave');
 add('Gragas','AP',2,2,2.5,'melee wave');
 add('Udyr','MIX',2.7,1,1,'melee sustained');
 add('Volibear','MIX',2.2,1.7,1.2,'melee sustained');
 add('Mordekaiser','AP',2.2,0,1,'melee sustained');
 add('Trundle','AD',2,0.5,1,'melee sustained antiTank');
 add('Renekton','AD',1.9,1,0.8,'melee burst');
 add('Garen|Darius|Olaf|Sett','AD',1.8,0.7,0.5,'melee sustained');
 add('Jarvan IV','AD',1.7,2.8,1.5,'melee burst');
 add('Wukong','AD',1.6,2.4,1.5,'melee burst');
 add('Xin Zhao','AD',1.5,1.4,1.5,'melee sustained');
 add('Vi','AD',1.4,2.5,1,'melee burst');
 add('Kled|Camille','AD',1.5,2,0.7,'melee sustained');
 add("Rek'Sai|Lee Sin|Pantheon",'AD',1.2,1.5,1,'melee burst');
 add('Gnar','AD',1.8,1.8,1.5,'ranged sustained');
 add('Viego|Graves|Kindred|Yorick|Master Yi|Bel\'Veth','AD',0.5,0,0.5,'sustained');
 add('Lillia','AP',0.7,1.6,1,'melee sustained antiTank');
 add('Diana','AP',1,2.4,0.3,'melee burst');
 add('Elise|LeBlanc','AP',0,1.2,0.8,'ranged burst');
 add('Ahri','AP',0,1.2,0.8,'ranged burst wave');
 add('Annie','AP',0,2.7,1.2,'ranged burst wave');
 add('Vex','AP',0,1.8,1.9,'ranged burst wave');
 add('Lissandra|Neeko','AP',0,2.5,1.8,'ranged burst wave');
 add('Orianna','AP',0,1.5,1.7,'ranged wave');
 add('Kennen','AP',0,2.5,0.7,'ranged burst');
 add('Taliyah|Anivia','AP',0,0.6,2.2,'ranged wave');
 add('Hwei|Viktor|Azir|Ziggs|Cassiopeia|Heimerdinger','AP',0,0.5,1.3,'ranged wave sustained');
 add('Rumble|Karthus','AP',0.3,0,0,'wave sustained');
 add('Sylas','AP',0.7,0.8,0.5,'melee burst');
 add('Ashe','AD',0,2,1.4,'ranged sustained');
 add('Varus','MIX',0,1.5,1.2,'ranged sustained antiTank');
 add('Xayah','AD',0,0,1.8,'ranged sustained wave');
 add('Jinx|Aphelios|Caitlyn|Sivir|Lucian|Draven|Kalista|Samira|Miss Fortune|Jhin','AD',0,0,0.5,'ranged sustained');
 add('Senna','AD',0,0.5,1.7,'ranged sustained');
 add('Lulu|Renata Glasc|Ivern','UTIL',0,0.7,3,'ranged');
 add('Zyra','AP',0,1.3,2,'ranged wave');
 // Active-pool coverage: Riot champion page describes magic area damage/slow.
 // Heuristic values describe structure, not measured strength or patch statistics.
 // https://www.leagueoflegends.com/en-us/champions/xerath/ (reviewed 2026-10-02)
 add('Xerath','AP',0,.2,.5,'ranged wave zone');
 profiles.Xerath.roles=['mid','support'];
 // Existing enemy-role priors and the team's pool both support jungle Maokai.
 profiles.Maokai.roles=['top','jungle'];
 // Roles and tactical tags shared by practice and Brain (migrated from existing engine data).
 const kitRoles={
  top:["Sion", "Ornn", "Malphite", "Shen", "Poppy", "Galio", "Gragas", "Mordekaiser", "Trundle", "Renekton", "Garen", "Darius", "Olaf", "Camille", "Gnar", "Yorick", "Kennen", "Heimerdinger", "Rumble"],
  jungle:["Poppy", "Sejuani", "Zac", "Amumu", "Gragas", "Udyr", "Volibear", "Trundle", "Jarvan IV", "Wukong", "Xin Zhao", "Vi", "Rek'Sai", "Lee Sin", "Viego", "Graves", "Kindred", "Master Yi", "Bel'Veth", "Lillia", "Diana", "Elise", "Karthus", "Ivern"],
  mid:["Galio", "Ahri", "Annie", "Vex", "Orianna", "Taliyah", "Anivia", "Hwei", "Viktor", "Azir", "Ziggs", "Cassiopeia", "Sylas"],
  adc:["Ashe", "Varus", "Xayah", "Jinx", "Aphelios", "Caitlyn", "Sivir", "Lucian", "Draven", "Kalista", "Samira", "Miss Fortune", "Jhin", "Senna"],
  support:["Maokai", "Nautilus", "Leona", "Braum", "Poppy", "Rell", "Alistar", "Rakan", "Thresh", "Senna", "Lulu", "Renata Glasc", "Zyra"],
 };
 Object.entries(kitRoles).forEach(([role,list])=>list.forEach(ch=>{if(profiles[ch])(profiles[ch].roles??=[]).push(role);}));
 const tacticalTags={
  early:["Nautilus", "Leona", "Poppy", "Volibear", "Renekton", "Darius", "Olaf", "Jarvan IV", "Wukong", "Xin Zhao", "Vi", "Ahri", "Taliyah", "Ashe", "Varus"],
  zone:["Maokai", "Lillia", "Taliyah", "Anivia", "Hwei", "Viktor", "Heimerdinger", "Varus"],
  follow:["Viego", "Lillia", "Ahri", "Annie", "Vex", "Taliyah", "Hwei", "Viktor", "Ashe", "Varus", "Xayah", "Jinx"],
  pick:["Maokai", "Shen", "Nautilus", "Leona", "Jarvan IV", "Vi", "Ahri", "Annie", "Vex", "Taliyah", "Ashe", "Varus"],
 };
 Object.entries(tacticalTags).forEach(([tag,list])=>list.forEach(ch=>{if(profiles[ch]&&!profiles[ch].tags.includes(tag))profiles[ch].tags.push(tag);}));
 const get=ch=>profiles[ch]||null;
 function assess(picks){
  const known=picks.map(p=>typeof p==='string'?p:p.champ),unknown=known.filter(ch=>!get(ch));
  const sum=key=>known.reduce((n,ch)=>n+(get(ch)?.[key]||0),0);
  const count=tag=>known.filter(ch=>get(ch)?.tags.includes(tag)).length;
  return {front:sum('front'),engage:sum('engage'),peel:sum('peel'),damage:picks.filter(p=>(typeof p==='string'||p.role!=='support')&&get(typeof p==='string'?p:p.champ)&&get(typeof p==='string'?p:p.champ).damage!=='UTIL').length,
   wave:count('wave'),unknown,complete:unknown.length===0};
 }
 // Structural affinity is a conservative alternative, not a replacement for
 // practiced core picks. Never infer a kit or role from a champion's name.
 function affinity(ch,role,identity){
  const p=get(ch);if(!p?.roles?.includes(role))return '';
  const tag=t=>p.tags.includes(t),carry=p.damage!=='UTIL',dps=tag('sustained');
  if(identity==='EARLY SKIRMISH'&&tag('early')&&
    (role==='support'?p.engage>=2||p.peel>=2:role==='adc'?dps:carry))return 'tidig styrka och skirmish';
  if(identity==='PRESS R'&&
    (role==='adc'?dps&&tag('follow'):role==='mid'?p.engage>=1.5&&(tag('burst')||tag('wave')):p.engage>=2))return role==='adc'?'damage efter engage':'engage och uppföljning';
  if(identity==='OBJECTIVE CONTROL'&&
    (role==='support'?p.peel>=2&&(p.front>=2||tag('zone')):role==='adc'?dps&&tag('wave'):role==='mid'?tag('wave')&&(tag('zone')||p.peel>=1.3):p.front>=2&&(p.engage>=2||dps)||tag('zone')&&carry))return 'kontroll runt objectives';
  if(identity==='JUNGLE CARRY'&&
    (role==='jungle'?carry&&dps&&p.front<1:role==='support'?p.peel>=2:role==='top'?p.front>=2&&p.peel>=1.8:role==='mid'?tag('wave')&&(p.engage>=1.2||p.peel>=1.7):p.engage>=1||p.peel>=1.5))return role==='jungle'?'ihållande jungledamage':'setup eller skydd för junglern';
  return '';
 }
 window.RiftProfiles={get,all:()=>profiles,assess,affinity};
})();
