/* Editable roster workspace; all decisions use the same model as Draft Brain. */
(()=>{'use strict';
 const model=window.RiftRoster,$=id=>document.getElementById(id),roles=model.roles;
 const names={top:'TOP',jungle:'JUNGLE',mid:'MID',adc:'ADC',support:'SUPPORT'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let role='jungle',editId=model.player(role).id;
 const edited=()=>model.profile(role,editId)||model.player(role);
 const sync=()=>window.RiftRosterSync;
 const message=text=>{$('champsMessage').textContent=text;};
 function act(fn){try{const s=sync()?.status();if(s&&(!s.unlocked||!s.ready||s.busy))throw Error('Lås upp med lagkoden och invänta synkningen.');if(fn()===false)return;message('Ändrat lokalt. Klicka Spara för laget för att dela ändringen.');render();}catch(e){message(e.message);}}
 function render(){
  const state=model.snapshot(),p=edited(),options=model.compOptions();editId=p.id;
  $('champsEditor').innerHTML=state.profiles.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===editId?'selected':'')+'>'+esc(x.name)+' · '+names[x.role]+'</option>').join('');
  $('champsRoster').innerHTML=roles.map(r=>'<div class="roster-slot"><button type="button" class="champs-role '+(role===r?'active':'')+'" data-edit-role="'+r+'" aria-pressed="'+(role===r)+'">'+names[r]+'</button><select aria-label="Aktiv spelare '+names[r]+'" data-active-role="'+r+'">'+state.profiles.filter(x=>x.role===r).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===state.active[r]?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>').join('');
  $('champsTitle').textContent=p.name+' · '+names[role]+' · '+p.pool.length+' champions';
  $('champsPool').innerHTML=p.pool.map(ch=>{
   const fits=Object.keys(options).filter(name=>model.affinity(name,role,ch));
   const paused=p.paused?.includes(ch);
   return '<div class="champs-champion '+(paused?'is-paused':'')+'">'+(model.image(ch)?'<img src="'+esc(model.image(ch))+'" alt="" width="44" height="44" loading="lazy">':'')+'<div class="champs-champion-name"><strong>'+esc(ch)+'</strong><small>'+esc(paused?'Pausad · föreslås inte i draften':fits.length?fits.map(name=>name+(model.affinity(name,role,ch)?.source==='kit'?' (kit)':'')).join(' · '):'Ingen bedömd comp-fit ännu; fortfarande valbar i draften.')+'</small></div><label>Comfort<select data-comfort="'+esc(ch)+'" aria-label="Comfort '+esc(ch)+'">'+Array.from({length:10},(_,i)=>'<option '+(p.comfort[ch]===i+1?'selected':'')+' value="'+(i+1)+'">'+(i+1)+'/10</option>').join('')+'</select></label><button type="button" class="secondary" data-pause="'+esc(ch)+'" aria-pressed="'+!!paused+'">'+(paused?'Återaktivera':'Pausa')+'</button><button type="button" class="secondary" data-remove="'+esc(ch)+'" aria-label="Ta bort '+esc(ch)+' ur poolen">Ta bort</button></div>';
  }).join('');
  $('champsComps').innerHTML=Object.keys(options).map(name=>{
   const picks=model.compPlan(name);
   return '<article class="champs-comp"><h3>'+esc(name)+'</h3><small>'+(name==='EARLY SKIRMISH'?'FÖRSTAVAL':name==='PRESS R'?'FALLBACK':'ALTERNATIV')+'</small>'+roles.map(r=>'<div><span>'+names[r]+'</span><strong>'+esc(picks[r]||'Saknar comp-alternativ')+'</strong><span>'+ (picks[r]?model.comfort(r,picks[r])+'/10':'—')+'</span></div>').join('')+(roles.some(r=>!picks[r]||model.comfort(r,picks[r])<5)?'<p class="champs-caution">Saknat alternativ eller låg comfort. Kontrollera compen före match.</p>':'')+'</article>';
  }).join('');
  const canDelete=state.profiles.some(x=>x.role===role&&x.id!==p.id);
  $('champsDeletePlayer').disabled=!canDelete;
  $('champsDeleteHint').textContent=canDelete?'Borttagning gäller spelarprofilen. Tidigare matcher behålls.':'Minst en spelare måste finnas kvar i rollen. Lägg till en ersättare för att kunna ta bort denna spelare.';
  renderSync();
 }
 function renderSync(){const s=sync()?.status();if(!s)return;const locked=!s.unlocked||!s.ready||s.busy;
  $('champsSyncStatus').textContent=s.error|| (s.busy?'Synkar…':s.dirty?'Lokala ändringar · inte delade ännu':s.hasRemote?'Lagets sparade roster':'Ingen delad roster ännu · spara din befintliga pool för laget');
  $('champsDeletePlayer').disabled=locked||!model.snapshot().profiles.some(x=>x.role===role&&x.id!==edited().id);
  $('champsSave').disabled=locked; $('champsRefresh').disabled=s.busy;
  document.querySelectorAll('[data-active-role], [data-comfort], [data-remove], [data-pause], #champsSearch, #champsNew, #champsRename, #champsRenameForm button[type="submit"], #champsNewForm button[type="submit"]').forEach(e=>e.disabled=locked);
 }
 $('champsEditor').addEventListener('change',e=>{const p=model.snapshot().profiles.find(p=>p.id===e.target.value);role=p.role;editId=p.id;$('champsSearch').value='';$('champsRenameForm').classList.add('hidden');render();});
 $('champsRoster').addEventListener('click',e=>{const b=e.target.closest('[data-edit-role]');if(b){role=b.dataset.editRole;editId=model.player(role).id;$('champsSearch').value='';$('champsRenameForm').classList.add('hidden');render();}});
 $('champsRoster').addEventListener('change',e=>{if(e.target.dataset.activeRole)act(()=>model.select(e.target.dataset.activeRole,e.target.value));});
 $('champsPool').addEventListener('change',e=>{if(e.target.dataset.comfort)act(()=>model.setComfort(role,e.target.dataset.comfort,e.target.value,editId));});
 $('champsPool').addEventListener('click',e=>{const b=e.target.closest('[data-remove]'),p=e.target.closest('[data-pause]');if(b)act(()=>model.removeChampion(role,b.dataset.remove,editId));if(p)act(()=>model.pauseChampion(role,p.dataset.pause,!edited().paused?.includes(p.dataset.pause),editId));});
 $('champsDeletePlayer').addEventListener('click',()=>act(()=>{
  const p=edited(),state=model.snapshot(),replacement=state.profiles.find(x=>x.role===role&&x.id!==p.id);
  if(!replacement)throw Error('Lägg till en ersättare i rollen först.');
  const active=state.active[role]===p.id;
  if(!confirm('Ta bort '+p.name+' och spelarens championpool?'+(active?' '+replacement.name+' tar över '+names[role]+' i matchuppställningen.':'')+' Tidigare matcher behålls. Ändringen delas när du klickar Spara för laget.'))return false;
  model.removePlayer(role,p.id,active?replacement.id:undefined);editId=model.player(role).id;$('champsSearch').value='';
 }));
 $('champsRename').addEventListener('click',()=>{$('champsRenameForm').classList.remove('hidden');$('champsRenameName').value=edited().name;$('champsRenameName').focus();});
 $('champsCancelRename').addEventListener('click',()=>$('champsRenameForm').classList.add('hidden'));
 $('champsRenameForm').addEventListener('submit',e=>{e.preventDefault();act(()=>{model.renamePlayer(role,editId,$('champsRenameName').value);$('champsRenameForm').classList.add('hidden');});});
 $('champsNew').addEventListener('click',()=>{$('champsNewForm').classList.remove('hidden');$('champsName').focus();});
 $('champsCancelNew').addEventListener('click',()=>{$('champsNewForm').classList.add('hidden');$('champsName').value='';});
 $('champsNewForm').addEventListener('submit',e=>{e.preventDefault();act(()=>{editId=model.savePlayer(role,'',$('champsName').value,edited().pool,false);$('champsNewForm').classList.add('hidden');$('champsName').value='';});});
 $('champsUnlock').addEventListener('submit',async e=>{e.preventDefault();try{await sync().unlock($('champsKey').value);message('Redigering upplåst.');}catch(e){message(e.message);}finally{$('champsKey').value='';}});
 $('champsSave').addEventListener('click',async()=>{try{await sync().save();message('Sparat för hela laget.');}catch(e){message(e.message);}});
 $('champsRefresh').addEventListener('click',()=>{if(!sync().status().dirty||confirm('Ersätt dina lokala ändringar med lagets sparade version?'))sync().refresh(true);});
 sync()?.subscribe(renderSync);
 model.subscribe(render);render();
 window.RiftChampionPicker.attach({inputId:'champsSearch',roster:model.catalog,used:()=>new Set(edited().pool.map(c=>c.toLowerCase())),rolesFor:model.rolesFor,imageFor:model.image,
  onSelect:ch=>act(()=>model.addChampion(role,ch,editId)),clearOnSelect:true,takenText:'redan i poolen',hintText:'Klicka för att lägga till med comfort 5. Alla roller visar hela championlistan.'});
 model.loadCatalog().then(ok=>{if(!ok)message('Sökningen använder den inbyggda championlistan.');});
})();
