export function validateRoster(raw){
 const roles=['top','jungle','mid','adc','support'];
 if(!raw||!Array.isArray(raw.profiles)||raw.profiles.length<5||raw.profiles.length>40)throw Error('Roster ska ha 5–40 spelare.');
 const ids=new Set();
 const profiles=raw.profiles.map(p=>{
  if(!p||typeof p.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(p.id)||ids.has(p.id)||!roles.includes(p.role)||typeof p.name!=='string'||!p.name.trim()||p.name.length>40)throw Error('Ogiltig spelare.');
  ids.add(p.id);
  if(!Array.isArray(p.pool)||!p.pool.length||p.pool.length>60||new Set(p.pool).size!==p.pool.length||p.pool.some(c=>typeof c!=='string'||!c.length||c.length>59||['__proto__','constructor','prototype'].includes(c)))throw Error('Ogiltig championpool.');
  const comfort=Object.fromEntries(p.pool.map(c=>{const n=p.comfort?.[c];if(!Number.isInteger(n)||n<1||n>10)throw Error('Comfort ska vara 1–10.');return[c,n];}));
  const paused=p.paused??[];if(!Array.isArray(paused)||paused.some(c=>!p.pool.includes(c)))throw Error('Ogiltiga pausade champions.');
  return {id:p.id,role:p.role,name:p.name.trim(),pool:p.pool,comfort,paused:[...new Set(paused)]};
 });
 const active=Object.fromEntries(roles.map(r=>{if(!profiles.some(p=>p.role===r&&p.id===raw.active?.[r]))throw Error('Välj en aktiv spelare per roll.');return [r,raw.active[r]];}));
 // Active-player validation above guarantees all five roles, even when a former core was removed.
 return {profiles,active};
}
