/* Optional remote coach: never blocks input, never locks, never uses stale advice. */
(()=>{
  'use strict';
  const endpoint='https://enzrxndugnfseekdgauh.supabase.co/functions/v1/rift-draft-coach';
  const byId=id=>document.getElementById(id);
  const cache=new Map();let enabled=false,busy=false,controller=null,timer=null,lastKey='',answer=null,failedKey='',generation=0;
  const id=c=>(c.role||'ban')+':'+c.ch;
  const read=key=>{try{return sessionStorage.getItem(key)||localStorage.getItem(key)||'';}catch{return '';}};
  const teamKey=()=>byId('groqTeamCode').value.trim()||read('rs_groq_team_key')||read('rs_team_access_key');
  const errors={TEAM_KEY_REQUIRED:'Ange lagkoden under AI-inställningar.',INVALID_TEAM_KEY:'Fel lagkod. Kontrollera koden under AI-inställningar.',GROQ_NOT_CONFIGURED:'GROQ_API_KEY saknas på servern.',RATE_LIMITED:'AI pausad kort för att begränsa anrop. Försök igen om en minut.',PROVIDER_RATE_LIMIT:'Groqs anropsgräns är nådd. Försök igen om en minut.',PROVIDER_UNAVAILABLE:'Groq svarar inte eller modellen är inte tillgänglig.',AI_TIMEOUT:'AI tog för lång tid.',INVALID_AI_RESPONSE:'AI-svaret klarade inte kontrollen.',AUTH_UNAVAILABLE:'Lagkoden kunde inte verifieras just nu.'};
  function candidates(){const t=current();if(!t||t.side!==userSide)return [];return t.type==='ban'?(window.RiftOpponent?.active()?window.RiftOpponent.banCandidates():banRecommendations()).map(ch=>({ch})):aiDecision(selectedRole||null).slice(0,20);}
  // Reviews are context, never verified matchup facts or direct score changes.
  function lessons(){
    if(new URLSearchParams(location.search).has('replay'))return [];
    const parse=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch{return [];}};
    const recent=date=>{const age=Date.now()-Date.parse(date);return Number.isFinite(age)&&age>=0&&age<=90*86400000;};
    const fields=raw=>Object.fromEntries(['worked','difficult','next'].map(k=>[k,String(raw?.[k]||'').trim().slice(0,220)]));
    const active=window.RiftRoster?.snapshot?.()?.active||{},seen=new Set();
    const games=parse('rs_match_history').filter(m=>m&&m.id&&!m.deletedAt&&!m.testMode&&!m.walkover&&m.type!=='walkover'&&['win','loss'].includes(m.result)&&recent(m.savedAt)).sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt)).filter(m=>{if(seen.has(m.id))return false;seen.add(m.id);return true;}).map(m=>({source:'match-review',date:m.savedAt,opponent:String(m.series?.opponent||'').slice(0,80),sameLineup:roles.every(r=>m.draftContext?.roster?.players?.some(p=>p.role===r&&p.id===active[r])),...fields(m.postReview)})).filter(m=>m.worked||m.difficult||m.next).slice(0,3);
    const series=parse('rs_ban_plans_cache').filter(p=>p?.status==='completed'&&recent(p.scheduledAt)&&p.seriesReview).sort((a,b)=>Date.parse(b.scheduledAt)-Date.parse(a.scheduledAt)).map(p=>({source:'series-review',date:p.scheduledAt,opponent:String(p.opponent||'').slice(0,80),sameLineup:false,...fields(p.seriesReview)})).filter(p=>p.worked||p.difficult||p.next).slice(0,2);
    return [...games,...series];
  }
  function snapshot(){
    const t=current(),final=events.length===20;if(!userSide||(!final&&(!t||t.side!==userSide)))return null;
    const list=final?[]:candidates();if(!final&&!list.length)return null;
    const payload={teamLessons:lessons(),side:userSide,events:events.map(({side,type,champ,role})=>({side,type,champ,role})),pools:JSON.parse(JSON.stringify(teamPool)),forcedRole:selectedRole||null,
      candidates:list.map(c=>({ch:c.ch,role:c.role,score:t.type==='ban'?window.RiftOpponent?.banScore?.(c.ch)||0:c.total||c.score||0,reasons:c.reasons||[],evidence:t.type==='ban'?window.RiftOpponent?.banReason(c.ch)||'':''})),
      comfort:roles.flatMap(role=>teamPool[role].map(ch=>({role,ch,value:comfort[role]?.[ch]||5}))),
      compOptions:window.RiftRoster?.compOptions?.()||{},
      decisionContext:list.map(c=>({id:id(c),urgency:c.urgency?.reason||'',alternatives:c.urgency?.alternatives||[],risk:[c.completion?.label,c.risk?.reasons?.join(' · '),c.execution?.label,c.learning?.label,c.responses?.length?'Möjliga svar, inte låsta picks: '+c.responses.map(x=>x.champ+' ('+x.source+')').join(', '):''].filter(Boolean).join(' · ')})),
      targeted:!!window.RiftOpponent?.active(),scouting:window.RiftOpponent?.scouting?.(final)||[],scoutingNote:window.RiftOpponent?.active()?window.RiftOpponent.summary():'Ingen motståndarscouting vald.',patch:window.RiftStats?.getStatus?.()?.patch||''};
    payload.mode=final?'gameplan':'draft';
    return {payload,key:JSON.stringify([payload,window.RiftRoster?.key(),window.RiftOpponent?.key()])};
  }
  function status(message,badge){byId('groqStatus').textContent=message;byId('groqBadge').textContent=badge;}
  function adviceUI(){
    byId('groqAdvice').hidden=!answer||answer.final;
    byId('groqFinalAdvice').hidden=!answer?.final;
    for(const field of ['call','early','midgame','late','jungle','objectives','teamfight','behind','top','mid','adc','support','uncertainty'])byId('groqFinal-'+field).textContent=answer?.final?answer.advice[field]||'':'';
    byId('groqPlan').textContent=answer?.advice.plan||'';
    byId('groqNext').textContent=answer?.advice.nextStep?'Nästa steg: '+answer.advice.nextStep:'';
    byId('groqUncertainty').textContent=answer?.advice.uncertainty?'Osäkerhet: '+answer.advice.uncertainty:'';
    if(typeof renderMatchBrief==='function'&&events.length===20)renderMatchBrief(getFinalAnalysis());
    if(answer?.final&&typeof captureFinalAI==='function')captureFinalAI();
  }
  function controls(){byId('groqPause').hidden=!enabled;byId('groqAnalyze').disabled=busy;byId('groqAnalyze').textContent=busy?'Analyserar…':enabled?(events.length===20?'Uppdatera gameplan':'Analysera igen'):'Aktivera AI';}
  function recommendations(list){
    if(answer?.final)return list;
    const s=snapshot();if(!enabled||!answer||!s||answer.key!==s.key)return list;
    const order=answer.advice.choices;const legal=candidates();const chosen=order.map(choice=>{const c=legal.find(x=>id(x)===choice.id);return c?{...c,groqReason:choice.reason,groqRisk:choice.risk,groqComparison:choice.id===order[0].id?answer.advice.comparison:''}:null;}).filter(Boolean);
    return [...chosen,...list.filter(c=>!chosen.some(x=>id(x)===id(c)))];
  }
  async function post(payload,key,signal){
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-team-key':key},body:JSON.stringify(payload),signal});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'AI_UNAVAILABLE');return data;
  }
  function accept(data,s){
    if(s.payload.mode==='gameplan'){
      const fields=['call','early','midgame','late','jungle','objectives','teamfight','behind','top','mid','adc','support','uncertainty'];
      if(fields.some(k=>typeof data?.advice?.[k]!=='string'||!data.advice[k].trim()))throw Error('INVALID_AI_RESPONSE');
      return {key:s.key,final:true,advice:Object.fromEntries(fields.map(k=>[k,data.advice[k].slice(0,k==='call'?220:360)]))};
    }
    const choices=data?.advice?.choices,allowed=new Set(s.payload.candidates.map(c=>id(c))),seen=new Set();
    if(!Array.isArray(choices)||!choices.length||choices.length>3||choices.some(c=>!c||!allowed.has(c.id)||seen.has(c.id)||!seen.add(c.id)||typeof c.reason!=='string'||!c.reason.trim()))throw Error('INVALID_AI_RESPONSE');
    return {key:s.key,advice:{comparison:String(data.advice.comparison||'').slice(0,320),choices:choices.map(c=>({id:c.id,reason:c.reason.slice(0,240),risk:typeof c.risk==='string'?c.risk.slice(0,180):''})),plan:String(data.advice.plan||'').slice(0,260),nextStep:String(data.advice.nextStep||'').slice(0,220),uncertainty:String(data.advice.uncertainty||'').slice(0,200)}};
  }
  async function analyze(force=false){
    const s=snapshot();if(!enabled||!s||busy)return;
    if(!force&&cache.has(s.key)){answer=cache.get(s.key);adviceUI();status('AI har granskat detta draftläge. Du väljer och låser själv.','AKTIV');renderRecommendation();return;}
    const key=teamKey();if(!key){enabled=false;byId('groqSettings').open=true;status(errors.TEAM_KEY_REQUIRED,'LÅST');controls();return;}
    clearTimeout(timer);const seq=++generation;controller=new AbortController();const abort=controller;busy=true;answer=null;adviceUI();controls();status('AI granskar draften. Regelmotorns förslag fungerar under tiden.','ANALYS');
    const timeout=setTimeout(()=>abort.abort(),14000);
    try{
      const data=await post(s.payload,key,abort.signal);
      if(seq!==generation||snapshot()?.key!==s.key||!enabled)return;
      answer=accept(data,s);failedKey='';if(cache.size>=30)cache.delete(cache.keys().next().value);cache.set(s.key,answer);
      status(answer.final?'AI-gameplanen finns nedan under Draft klar. Kontrollera antaganden före matchstart.':'AI har granskat detta draftläge. Du väljer och låser själv.','AKTIV');adviceUI();renderRecommendation();
    }catch(e){
      if(seq!==generation)return;answer=null;failedKey=s.key;
      status((errors[e.message]||'AI kunde inte svara just nu.')+' Regelmotorn fortsätter.','FALLBACK');adviceUI();renderRecommendation();
    }finally{clearTimeout(timeout);if(seq===generation){busy=false;controller=null;controls();}}
  }
  function refresh(){
    const s=snapshot(),key=s?.key||'';
    if(key!==lastKey){
      lastKey=key;generation++;controller?.abort();controller=null;busy=false;clearTimeout(timer);answer=null;failedKey='';adviceUI();controls();
      status(enabled?(s?'Nytt draftläge · regelmotorn är aktiv.':'Väntar på er tur eller tillgängliga kandidater.'):'Regelmotorn är aktiv. Aktivera AI för en extra draftanalys.',enabled?'REDO':'AV');
      if(enabled&&s&&byId('groqAuto').checked)timer=setTimeout(()=>analyze(),650);
    }
  }
  async function activate(){
    if(enabled){await analyze(true);return;}
    const key=teamKey();if(!key){byId('groqSettings').open=true;status(errors.TEAM_KEY_REQUIRED,'LÅST');return;}
    busy=true;controls();status('Verifierar lagkod…','ANSLUTER');
    try{
      await post({verifyOnly:true},key,AbortSignal.timeout(8000));
      try{sessionStorage.setItem('rs_groq_team_key',key);}catch{}
      byId('groqTeamCode').value='';enabled=true;failedKey='';status('AI ansluten.','REDO');
    }catch(e){status((errors[e.message]||'Kunde inte ansluta AI.')+' Regelmotorn fortsätter.','FALLBACK');}
    finally{busy=false;controls();}
    if(enabled)await analyze();
  }
  byId('groqAnalyze').addEventListener('click',activate);
  byId('groqPause').addEventListener('click',()=>{enabled=false;generation++;controller?.abort();clearTimeout(timer);busy=false;answer=null;adviceUI();controls();status('AI pausad. Regelmotorn är aktiv.','AV');renderRecommendation();});
  byId('groqAuto').addEventListener('change',()=>{if(!byId('groqAuto').checked)clearTimeout(timer);else if(enabled&&!answer&&!busy&&snapshot()?.key!==failedKey)analyze();});
  function savedAdvice(){
    if(!enabled||!answer||snapshot()?.key!==answer.key)return null;
    return JSON.parse(JSON.stringify({final:!!answer.final,advice:answer.advice,model:'openai/gpt-oss-120b',capturedAt:new Date().toISOString()}));
  }
  window.RiftGroq={recommendations,refresh,snapshot:savedAdvice,lessons};
  refresh();controls();
})();


