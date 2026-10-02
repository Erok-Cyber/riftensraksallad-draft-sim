/* Riftensräksallad shared match storage.
   Supabase Edge Function + local cache/offline fallback. */
(function(){
  const LOCAL_MATCHES="rs_match_history";
  const OUTBOX="rs_match_outbox_v2";
  function pending(){try{const rows=JSON.parse(localStorage.getItem(OUTBOX)||"[]");return Array.isArray(rows)?rows.filter(m=>m&&typeof m.id==='string'):[]}catch{return[]}}
  function queue(match){localStorage.setItem(OUTBOX,JSON.stringify(uniqueById([...pending().filter(m=>m.id!==match.id),match])))}
  function dequeue(id){localStorage.setItem(OUTBOX,JSON.stringify(pending().filter(m=>m.id!==id)))}
  const TEAM_KEY_STORAGE="rs_team_access_key";
  const cfg=()=>window.RIFT_DB_CONFIG||{};
  let state={mode:"local",status:"Lokal",lastSync:null,error:null,syncing:false};
  const listeners=new Set();

  function emit(){
    listeners.forEach(fn=>{try{fn({...state})}catch{}});
    window.dispatchEvent(new CustomEvent("rift-db-status",{detail:{...state}}));
  }
  function setState(next){state={...state,...next};emit()}
  function configured(){
    const c=cfg();
    return !!(c.enabled&&c.functionUrl&&c.teamSlug);
  }
  function teamKey(){return localStorage.getItem(TEAM_KEY_STORAGE)||""}
  function hasTeamKey(){return !!teamKey()}
  function localMatches(){
    try{return JSON.parse(localStorage.getItem(LOCAL_MATCHES)||"[]")}catch{return[]}
  }
  function writeLocal(list){
    localStorage.setItem(LOCAL_MATCHES,JSON.stringify(list.slice(-250)));
  }
  function uniqueById(list){
    const map=new Map();
    list.forEach(m=>{if(m&&m.id)map.set(m.id,m)});
    return [...map.values()].sort((a,b)=>new Date(a.savedAt)-new Date(b.savedAt));
  }
  function edgeUrl(query=""){
    return String(cfg().functionUrl||"").replace(/\/$/,"")+query;
  }
  function edgeHeaders(){
    const h={"Content-Type":"application/json"};
    const key=teamKey();
    if(key)h["x-team-key"]=key;
    return h;
  }
  async function request(method,query="",body=null){
    const res=await fetch(edgeUrl(query),{
      method,
      headers:edgeHeaders(),
      body:body==null?undefined:JSON.stringify(body)
    });
    const text=await res.text().catch(()=>"");
    let data=null;
    try{data=text?JSON.parse(text):null}catch{data={error:text}}
    if(!res.ok){
      const message=data?.error||("Shared DB "+res.status);
      const err=new Error(message);err.status=res.status;throw err;
    }
    return data;
  }
  function rowToMatch(row){
    const p=row.payload||{};
    return {
      ...p,
      id:row.id||p.id,
      savedAt:row.saved_at||p.savedAt,
      result:row.result||p.result,
      matchType:row.match_type||p.matchType,
      side:row.side||p.side,
      comp:row.comp??p.comp
    };
  }
  async function fetchRemote(){
    if(!configured())return localMatches();
    const data=await request("GET");
    return (data?.matches||[]).map(rowToMatch);
  }
  async function uploadOne(match){
    if(!hasTeamKey())throw new Error("TEAM_KEY_MISSING");
    return request("POST","",{match});
  }
  async function saveMatch(match){
    if(!configured()){
      const local=uniqueById([...localMatches(),match]);
      writeLocal(local);
      setState({mode:"local",status:"Lokal · databas ej aktiverad",error:null});
      return {cloud:false,match};
    }
    if(!hasTeamKey()){
      setState({mode:"readonly",status:"Delad · läsning",error:null});
      throw new Error("WRITE_KEY_REQUIRED");
    }

    const local=uniqueById([...localMatches(),match]);
    queue(match);
    writeLocal(local);

    try{
      await uploadOne(match);
      dequeue(match.id);
      setState({mode:"shared",status:"Delad · skrivning",lastSync:new Date().toISOString(),error:null});
      return {cloud:true,match};
    }catch(err){
      if(err.status===410){dequeue(match.id);writeLocal(localMatches().filter(m=>m.id!==match.id));throw err;}
      console.warn("Shared save failed; local copy kept.",err);
      setState({mode:"offline",status:"Offline · lokalt sparad",error:String(err)});
      return {cloud:false,match,error:err};
    }
  }
  // Metadata edits are confirmed online before replacing the cached match.
  // Fetch the latest payload so review/link edits never discard a newer draft snapshot.
  async function updateMatchDetails(id,patch){
    if(configured()&&!hasTeamKey())throw new Error('Lås upp lagdatabasen innan du sparar.');
    const list=configured()?await fetchRemote():localMatches();
    const before=list.find(m=>String(m.id)===String(id));
    if(!before)throw new Error('Matchen finns inte längre. Synka historiken.');
    const match={...before};
    if(Object.prototype.hasOwnProperty.call(patch,'series'))match.series=patch.series;
    if(Object.prototype.hasOwnProperty.call(patch,'postReview'))match.postReview=patch.postReview;
    match.detailsUpdatedAt=new Date().toISOString();
    if(configured())await uploadOne(match);
    writeLocal(uniqueById([...localMatches().filter(m=>String(m.id)!==String(id)),match]));
    setState({mode:configured()?'shared':'local',status:configured()?'Delad · skrivning':'Lokal',error:null});
    return match;
  }
  async function deleteMatch(id){
    if(configured()&&!hasTeamKey()){
      setState({mode:"readonly",status:"Delad · läsning",error:null});
      throw new Error("WRITE_KEY_REQUIRED");
    }
    const before=localMatches();
    writeLocal(before.filter(m=>m.id!==id));
    if(!configured())return {cloud:false};

    try{
      await request("DELETE","?id="+encodeURIComponent(id));
      dequeue(id);
      setState({mode:"shared",status:"Delad",lastSync:new Date().toISOString(),error:null});
      return {cloud:true};
    }catch(err){
      // Restore local copy when a shared delete fails so clients do not diverge.
      writeLocal(before);
      setState({mode:"offline",status:"Offline · radering misslyckades",error:String(err)});
      throw err;
    }
  }
  async function sync(){
    if(state.syncing)return localMatches();
    if(!configured()){
      setState({mode:"local",status:"Lokal · databas ej aktiverad",error:null});
      return localMatches();
    }
    state.syncing=true;
    setState({status:"Synkar…"});
    try{
      // Keep legacy offline data recoverable without treating every cached row as a new write.
      if(!localStorage.getItem('rs_match_cache_before_outbox_v2'))localStorage.setItem('rs_match_cache_before_outbox_v2',JSON.stringify(localMatches()));
      const remote=await fetchRemote();

      if(hasTeamKey()){
        for(const m of pending()){
          try{await uploadOne(m);dequeue(m.id);}catch(err){
            if(err.status===410){dequeue(m.id);continue;}
            throw err;
          }
        }
        const fresh=await fetchRemote();
        const merged=uniqueById([...fresh,...pending()]);
        writeLocal(merged);
        setState({mode:"shared",status:"Delad · skrivning",lastSync:new Date().toISOString(),error:null});
        return merged;
      }

      writeLocal(uniqueById([...remote,...pending()]));
      setState({mode:"readonly",status:"Delad · läsning",lastSync:new Date().toISOString(),error:null});
      return remote;
    }catch(err){
      console.warn("Shared sync failed; using local cache.",err);
      setState({mode:"offline",status:"Offline · lokal cache",error:String(err)});
      return localMatches();
    }finally{
      state.syncing=false;emit();
    }
  }
  async function connect(key){
    const value=(key||"").trim();
    if(!value)throw new Error("Tom lagkod.");
    localStorage.setItem(TEAM_KEY_STORAGE,value);
    try{
      await request("POST","",{verifyOnly:true});
      await sync();
      return true;
    }catch(err){
      localStorage.removeItem(TEAM_KEY_STORAGE);
      setState({mode:"locked",status:"Fel lagkod",error:String(err)});
      throw err;
    }
  }
  function disconnect(){
    localStorage.removeItem(TEAM_KEY_STORAGE);
    setState({mode:configured()?"readonly":"local",status:configured()?"Delad · läsning":"Lokal",error:null});
  }
  function subscribe(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn)}
  function getState(){return {...state}}

  window.RiftSharedData={configured,hasTeamKey,localMatches,saveMatch,updateMatchDetails,deleteMatch,sync,connect,disconnect,subscribe,getState};
  setState({
    mode:configured()?(hasTeamKey()?"shared":"readonly"):"local",
    status:configured()?(hasTeamKey()?"Delad · synkar…":"Delad · läsning"):"Lokal · databas ej aktiverad"
  });

  if(configured()){
    queueMicrotask(()=>sync().catch(()=>{}));
  }
})();
