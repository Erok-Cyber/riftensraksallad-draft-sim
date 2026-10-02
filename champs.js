/* Editable roster workspace; all decisions use the same model as Draft Brain. */
(()=>{'use strict';
 const model=window.RiftRoster,$=id=>document.getElementById(id),roles=model.roles;
 const names={top:'TOP',jungle:'JUNGLE',mid:'MID',adc:'ADC',support:'SUPPORT'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let role='jungle';
 const message=text=>{$('champsMessage').textContent=text;};
 function act(fn){try{fn();message('Sparat. Comp-förslag och Draft Brain använder ändringen.');}catch(e){message(e.message);}}
 function render(){
  const state=model.snapshot(),p=model.player(role),options=model.compOptions();
  $('champsRoster').innerHTML=roles.map(r=>'<div class="roster-slot"><button type="button" class="champs-role '+(role===r?'active':'')+'" data-edit-role="'+r+'" aria-pressed="'+(role===r)+'">'+names[r]+'</button><select aria-label="Aktiv spelare '+names[r]+'" data-active-role="'+r+'">'+state.profiles.filter(x=>x.role===r).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===state.active[r]?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>').join('');
  $('champsTitle').textContent=p.name+' · '+names[role]+' · '+p.pool.length+' champions';
  $('champsPool').innerHTML=p.pool.map(ch=>{
   const fits=Object.keys(options).filter(name=>options[name][role].includes(ch));
   return '<div class="champs-champion">'+(model.image(ch)?'<img src="'+esc(model.image(ch))+'" alt="" width="44" height="44" loading="lazy">':'')+'<div class="champs-champion-name"><strong>'+esc(ch)+'</strong><small>'+esc(fits.length?fits.join(' · '):'Ingen bedömd comp-fit ännu; fortfarande valbar i draften.')+'</small></div><label>Comfort<select data-comfort="'+esc(ch)+'" aria-label="Comfort '+esc(ch)+'">'+Array.from({length:10},(_,i)=>'<option '+(p.comfort[ch]===i+1?'selected':'')+' value="'+(i+1)+'">'+(i+1)+'/10</option>').join('')+'</select></label><button type="button" class="secondary" data-remove="'+esc(ch)+'" aria-label="Ta bort '+esc(ch)+' ur poolen">Ta bort</button></div>';
  }).join('');
  $('champsComps').innerHTML=Object.keys(options).map(name=>{
   const picks=model.compPlan(name);
   return '<article class="champs-comp"><h3>'+esc(name)+'</h3><small>'+(name==='EARLY SKIRMISH'?'FÖRSTAVAL':name==='PRESS R'?'FALLBACK':'ALTERNATIV')+'</small>'+roles.map(r=>'<div><span>'+names[r]+'</span><strong>'+esc(picks[r]||'Saknar comp-alternativ')+'</strong><span>'+ (picks[r]?model.comfort(r,picks[r])+'/10':'—')+'</span></div>').join('')+(roles.some(r=>!picks[r]||model.comfort(r,picks[r])<5)?'<p class="champs-caution">Saknat alternativ eller låg comfort. Kontrollera compen före match.</p>':'')+'</article>';
  }).join('');
 }
 $('champsRoster').addEventListener('click',e=>{const b=e.target.closest('[data-edit-role]');if(b){role=b.dataset.editRole;$('champsSearch').value='';render();}});
 $('champsRoster').addEventListener('change',e=>{if(e.target.dataset.activeRole)act(()=>{role=e.target.dataset.activeRole;model.select(role,e.target.value);});});
 $('champsPool').addEventListener('change',e=>{if(e.target.dataset.comfort)act(()=>model.setComfort(role,e.target.dataset.comfort,e.target.value));});
 $('champsPool').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b)act(()=>model.removeChampion(role,b.dataset.remove));});
 $('champsNew').addEventListener('click',()=>{$('champsNewForm').classList.remove('hidden');$('champsName').focus();});
 $('champsCancelNew').addEventListener('click',()=>{$('champsNewForm').classList.add('hidden');$('champsName').value='';});
 $('champsNewForm').addEventListener('submit',e=>{e.preventDefault();act(()=>{model.savePlayer(role,'',$('champsName').value,model.player(role).pool);$('champsNewForm').classList.add('hidden');$('champsName').value='';});});
 model.subscribe(render);render();
 window.RiftChampionPicker.attach({inputId:'champsSearch',roster:model.catalog,used:()=>new Set(model.player(role).pool.map(c=>c.toLowerCase())),rolesFor:ch=>roles.filter(r=>Object.values(model.compOptions()).some(c=>c[r].includes(ch))||window.RiftTeamData.pools[r].includes(ch)),imageFor:model.image,
  onSelect:ch=>act(()=>model.addChampion(role,ch)),clearOnSelect:true,takenText:'redan i poolen',hintText:'Klicka för att lägga till med comfort 5. Alla roller visar hela championlistan.'});
 model.loadCatalog().then(ok=>{if(!ok)message('Sökningen använder den inbyggda championlistan.');});
})();
