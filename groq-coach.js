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
  function candidates(){const t=current();if(!t||t.side!==userSide)return [];return t.type==='ban'?banRecommendations().slice(0,3).map(ch=>({ch})):aiDecision(selectedRole||null).slice(0,20);}
  function snapshot(){
    const t=current();if(!userSide||!t||t.side!==userSide)return null;
    const list=candidates();if(!list.length)return null;
    const payload={side:userSide,events:events.map(({side,type,champ,role})=>({side,type,champ,role})),pools:JSON.parse(JSON.stringify(teamPool)),forcedRole:selectedRole||null,
      candidates:list.map(c=>({ch:c.ch,role:c.role,score:c.total||c.score||0,reasons:c.reasons||[],evidence:t.type==='ban'?window.RiftOpponent?.banReason(c.ch)||'':''})),
      targeted:!!window.RiftOpponent?.active(),scouting:window.RiftOpponent?.scouting?.()||[],scoutingNote:window.RiftOpponent?.active()?window.RiftOpponent.summary():'Ingen motståndarscouting vald.',patch:window.RiftStats?.getStatus?.()?.patch||''};
    return {payload,key:JSON.stringify([payload,window.RiftRoster?.key(),window.RiftOpponent?.key()])};
  }
  function status(message,badge){byId('groqStatus').textContent=message;byId('groqBadge').textContent=badge;}
  function adviceUI(){
    byId('groqAdvice').hidden=!answer;
    byId('groqPlan').textContent=answer?.advice.plan||'';
    byId('groqNext').textContent=answer?.advice.nextStep?'Nästa steg: '+answer.advice.nextStep:'';
    byId('groqUncertainty').textContent=answer?.advice.uncertainty?'Osäkerhet: '+answer.advice.uncertainty:'';
  }
  function controls(){byId('groqPause').hidden=!enabled;byId('groqAnalyze').disabled=busy;byId('groqAnalyze').textContent=busy?'Analyserar…':enabled?'Analysera igen':'Aktivera AI';}
  function recommendations(list){
    const s=snapshot();if(!enabled||!answer||!s||answer.key!==s.key)return list;
    const order=answer.advice.choices;const chosen=order.map(choice=>{const c=list.find(x=>id(x)===choice.id);return c?{...c,groqReason:choice.reason,groqRisk:choice.risk}:null;}).filter(Boolean);
    return [...chosen,...list.filter(c=>!chosen.some(x=>id(x)===id(c)))];
  }
  async function post(payload,key,signal){
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-team-key':key},body:JSON.stringify(payload),signal});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'AI_UNAVAILABLE');return data;
  }
  function accept(data,s){
    const choices=data?.advice?.choices,allowed=new Set(s.payload.candidates.map(c=>id(c))),seen=new Set();
    if(!Array.isArray(choices)||!choices.length||choices.length>3||choices.some(c=>!c||!allowed.has(c.id)||seen.has(c.id)||!seen.add(c.id)||typeof c.reason!=='string'||!c.reason.trim()))throw Error('INVALID_AI_RESPONSE');
    return {key:s.key,advice:{choices:choices.map(c=>({id:c.id,reason:c.reason.slice(0,240),risk:typeof c.risk==='string'?c.risk.slice(0,180):''})),plan:String(data.advice.plan||'').slice(0,260),nextStep:String(data.advice.nextStep||'').slice(0,220),uncertainty:String(data.advice.uncertainty||'').slice(0,200)}};
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
      status('AI har granskat detta draftläge. Du väljer och låser själv.','AKTIV');adviceUI();renderRecommendation();
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
  window.RiftGroq={recommendations,refresh};
  refresh();controls();
})();
