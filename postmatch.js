/* Match-linked review. Historical snapshots are read-only; only review and series metadata are edited. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const questions={worked:'Vad fungerade?',difficult:'Vad blev svårt?',next:'Vad ändrar vi nästa gång?'};
  const draftIssues={'':'Inte bedömt / inget tydligt draftproblem',engage:'Svårt att starta fights',peel:'Svårt att skydda carryn',wave:'Svårt att försvara waves'};
  const planLabels={call:'Snabb call',early:'Early',midgame:'Midgame',late:'Late',jungle:'Jungle',objectives:'Objectives',teamfight:'Teamfight',behind:'I underläge',top:'Top',mid:'Mid',adc:'ADC',support:'Support',uncertainty:'Osäkerhet'};
  let selected=null,dirty=false,saving=false;
  function plans(){
    const loaded=window.RiftBanPlanner?.getPlans?.();if(loaded?.length)return loaded;
    try{return JSON.parse(localStorage.getItem('rs_ban_plans_cache')||'[]');}catch{return [];}
  }
  function matches(){return window.RiftSharedData?.localMatches?.()||[];}
  function seriesGames(id){return matches().filter(m=>String(m.series?.id||'')===String(id)&&['win','loss'].includes(m.result)).sort((a,b)=>new Date(a.savedAt)-new Date(b.savedAt)||String(a.id).localeCompare(String(b.id)));}
  function cleanReview(raw){return Object.fromEntries(Object.keys(questions).map(k=>[k,String(raw?.[k]||'').trim().slice(0,600)]));}
  function mayClose(){return !saving&&(!dirty||confirm('Du har osparade eftermatchnoteringar. Lämna ändå?'));}
  function render(match,preferredSeries=null){
    const host=$('postmatchReview');if(!host)return;
    selected=String(match.id);dirty=!!preferredSeries;saving=false;
    const context=match.draftContext,review=cleanReview(match.postReview),linked=preferredSeries||match.series;
    const options=plans().filter(p=>p.status!=='cancelled'||String(p.id)===String(linked?.id));
    if(linked&&!options.some(p=>String(p.id)===String(linked.id)))options.push(linked);
    const writable=!window.RiftSharedData?.configured?.()||window.RiftSharedData?.hasTeamKey?.();
    host.innerHTML='<h3>Efter matchen</h3><p class="analysis-note">Fritext kan användas som observationsunderlag av AI-coachen; den ändrar inte regelmotorns poäng direkt. Samma markerade draftproblem i minst tre matcher med samma femma kan ge en liten justering.</p>'+
      '<label class="postmatch-field">Serie<select id="postmatchSeries" '+(!writable?'disabled':'')+'><option value="">Fristående / inte kopplad</option>'+options.map(p=>'<option value="'+esc(p.id)+'" '+(String(p.id)===String(linked?.id)?'selected':'')+'>'+esc(p.opponent)+(p.scheduledAt?' · '+esc(new Date(p.scheduledAt).toLocaleDateString('sv-SE')):'')+'</option>').join('')+'</select></label>'+
      '<div class="postmatch-grid">'+Object.entries(questions).map(([k,label])=>'<label class="postmatch-field">'+label+'<textarea id="postmatch-'+k+'" maxlength="600" rows="3" '+(!writable?'readonly':'')+' placeholder="En konkret observation räcker">'+esc(review[k])+'</textarea></label>').join('')+'</div>'+
      '<label class="postmatch-field">Hade draften ett tydligt problem? (frivilligt)<select id="postmatchDraftIssue" '+(!writable?'disabled':'')+'>'+Object.entries(draftIssues).map(([key,label])=>'<option value="'+key+'" '+(key===(match.postReview?.draftIssue||'')?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
      (writable?'<button type="button" class="secondary" id="postmatchSave">Spara review & seriekoppling</button>':'<p class="analysis-note">Lås upp lagdatabasen i Analys för att redigera. Alla kan läsa.</p>')+
      '<p id="postmatchStatus" class="analysis-note" role="status">'+(preferredSeries?'Koppling förvald. Spara för att bekräfta.':'')+'</p>'+
      '<details class="postmatch-snapshot"><summary>Roster och AI-plan från denna draft</summary>'+
      (context?.roster?.players?.length?'<div class="postmatch-grid">'+context.roster.players.map(p=>'<div><strong>'+esc(p.role?.toUpperCase())+' · '+esc(p.name)+'</strong><p>'+esc((p.pool||[]).join(', '))+'</p></div>').join('')+'</div>'+(context.roster.partial?'<p>Delvis sparad roster; saknade spelare återskapas inte.</p>':''):'<p>Roster saknas för denna äldre match. Dagens roster används inte som ersättning.</p>')+
      (context?.aiPlan?.advice?'<h4>Sparad AI-gameplan</h4>'+Object.entries(planLabels).filter(([k])=>context.aiPlan.advice[k]).map(([k,label])=>'<p><b>'+label+':</b> '+esc(context.aiPlan.advice[k])+'</p>').join(''):'<p>Ingen AI-gameplan sparades för denna match.</p>')+'</details>';
    host.oninput=()=>{dirty=true;$('postmatchStatus').textContent='Osparade ändringar';};
    host.onchange=host.oninput;
    $('postmatchSave')?.addEventListener('click',save);
  }
  async function save(){
    if(saving||!selected)return;
    const match=matches().find(m=>String(m.id)===selected);if(!match)return;
    const id=$('postmatchSeries').value;
    const p=plans().find(p=>String(p.id)===id)||(String(match.series?.id)===id?match.series:null);
    if(id&&!p){$('postmatchStatus').textContent='Serien saknas. Stäng och öppna review igen.';return;}
    const series=p?{id:String(p.id),opponent:p.opponent||'',scheduledAt:p.scheduledAt||'',bestOf:p.bestOf||3}:null;
    const postReview={...cleanReview(Object.fromEntries(Object.keys(questions).map(k=>[k,$('postmatch-'+k).value]))),draftIssue:Object.hasOwn(draftIssues,$('postmatchDraftIssue')?.value)?$('postmatchDraftIssue').value:'',updatedAt:new Date().toISOString()};
    saving=true;$('postmatchSave').disabled=true;$('postmatchStatus').textContent='Sparar…';
    const fields=[$('postmatchSeries'),$('postmatchDraftIssue'),...Object.keys(questions).map(k=>$('postmatch-'+k))];fields.forEach(el=>el.disabled=true);
    try{
      await window.RiftSharedData.updateMatchDetails(selected,{series,postReview});
      dirty=false;$('postmatchStatus').textContent='Sparad ✓';
      window.RiftBanPlanner?.render?.();
      if(typeof renderAnalysis==='function')renderAnalysis();
    }catch(e){$('postmatchStatus').textContent='Kunde inte spara. '+e.message+' Dina anteckningar finns kvar i formuläret.';}
    finally{saving=false;$('postmatchSave').disabled=false;fields.forEach(el=>el.disabled=false);}
  }
  function seriesHTML(plan){
    const played=seriesGames(plan.id);
    const administrative=(Array.isArray(plan.administrativeGames)?plan.administrativeGames:[]).filter(g=>g?.type==='walkover'&&['win','loss'].includes(g.result)&&Number.isInteger(g.gameNumber)&&g.gameNumber>0);
    const games=[...played,...administrative.map(g=>({...g,walkover:true}))].sort((a,b)=>(a.gameNumber||Infinity)-(b.gameNumber||Infinity)||new Date(a.savedAt)-new Date(b.savedAt));
    const wins=games.filter(m=>m.result==='win').length,losses=games.length-wins;
    const unlinked=matches().filter(m=>!m.series?.id&&m.matchType==='league').sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
    const title=games.length?`${wins}–${losses} i registrerade games`:'Inga games kopplade ännu';
    return '<section class="planner-section"><h3>'+title+'</h3><p class="analysis-note">Räknar kopplade games och registrerade W/O. W/O påverkar inte draftstatistik. Serien avslutas separat.</p>'+
      games.map((m,i)=>m.walkover?'<div class="postmatch-game"><span><b>Game '+m.gameNumber+' · W/O · '+(m.result==='win'?'WIN':'LOSS')+'</b><small>'+esc(m.reason||'Walkover – ej spelat')+'</small></span><span class="analysis-note">Ej spelat</span></div>':'<div class="postmatch-game"><span><b>Game '+(i+1)+' · '+(m.result==='win'?'WIN':'LOSS')+'</b> · '+esc(m.comp||'Draft')+'<small>'+esc(new Date(m.savedAt).toLocaleString('sv-SE'))+'</small></span><button type="button" class="secondary" data-series-review="'+esc(m.id)+'">Draft & review</button></div>').join('')+
      (unlinked.length?'<details><summary>Koppla ett tidigare ligagame</summary><p class="analysis-note">Välj bara ett game som hör till denna serie. Ingen datumgissning görs.</p><select id="plannerUnlinkedGame" aria-label="Tidigare ligagame">'+unlinked.map(m=>'<option value="'+esc(m.id)+'">'+esc(new Date(m.savedAt).toLocaleString('sv-SE'))+' · '+(m.result==='win'?'WIN':'LOSS')+' · '+esc(m.comp||'')+' · '+esc((m.ourPicks||[]).map(p=>p.champ).join('/'))+'</option>').join('')+'</select><button type="button" class="secondary" data-planner-action="link-game">Öppna för koppling</button></details>':'')+'</section>';
  }
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  window.RiftPostmatch={render,mayClose,reset:()=>{dirty=false;selected=null;},seriesHTML,seriesGames,cleanReview};
})();

