/* Riftensräksallad shared match storage.
   Supabase Edge Function + local cache/offline fallback. */
(function(){
  const LOCAL_MATCHES="rs_match_history";
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
    return {"Content-Type":"application/json","x-team-key":teamKey()};
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
      throw new Error(message);
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
    if(!hasTeamKey())throw new Error("TEAM_KEY_MISSING");
    const data=await request("GET");
    return (data?.matches||[]).map(rowToMatch);
  }
  async function uploadOne(match){
    if(!hasTeamKey())throw new Error("TEAM_KEY_MISSING");
    return request("POST","",{match});
  }
  async function saveMatch(match){
    const local=uniqueById([...localMatches(),match]);
    writeLocal(local);

    if(!configured()){
      setState({mode:"local",status:"Lokal · databas ej aktiverad",error:null});
      return {cloud:false,match};
    }
    if(!hasTeamKey()){
      setState({mode:"locked",status:"Delad DB · anslut lagkod",error:null});
      return {cloud:false,match};
    }

    try{
      await uploadOne(match);
      setState({mode:"shared",status:"Delad",lastSync:new Date().toISOString(),error:null});
      return {cloud:true,match};
    }catch(err){
      console.warn("Shared save failed; local copy kept.",err);
      setState({mode:"offline",status:"Offline · lokalt sparad",error:String(err)});
      return {cloud:false,match,error:err};
    }
  }
  async function deleteMatch(id){
    const before=localMatches();
    writeLocal(before.filter(m=>m.id!==id));
    if(!configured()||!hasTeamKey())return {cloud:false};

    try{
      await request("DELETE","?id="+encodeURIComponent(id));
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
    if(!hasTeamKey()){
      setState({mode:"locked",status:"Delad DB · anslut lagkod",error:null});
      return localMatches();
    }

    state.syncing=true;
    setState({status:"Synkar…"});
    try{
      const local=localMatches();
      const remote=await fetchRemote();
      const remoteIds=new Set(remote.map(m=>m.id));

      // Migrate/offline-sync local real matches that the cloud does not have.
      for(const m of local){
        if(m?.id&&m?.result&&m?.matchType&&!remoteIds.has(m.id)){
          await uploadOne(m);
        }
      }

      const fresh=await fetchRemote();
      const merged=uniqueById([...local,...fresh]);
      writeLocal(merged);
      setState({mode:"shared",status:"Delad",lastSync:new Date().toISOString(),error:null});
      return merged;
    }catch(err){
      console.warn("Shared sync failed; using local cache.",err);
      const msg=String(err);
      const locked=msg.includes("TEAM_KEY_MISSING")||msg.toLowerCase().includes("access code")||msg.toLowerCase().includes("invalid team");
      setState({
        mode:locked?"locked":"offline",
        status:locked?"Delad DB · anslut lagkod":"Offline · lokal cache",
        error:msg
      });
      return localMatches();
    }finally{
      state.syncing=false;
      emit();
    }
  }
  async function connect(key){
    const value=(key||"").trim();
    if(!value)throw new Error("Tom lagkod.");
    localStorage.setItem(TEAM_KEY_STORAGE,value);
    try{
      await fetchRemote(); // Validate before uploading local history.
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
    setState({mode:configured()?"locked":"local",status:configured()?"Delad DB · anslut lagkod":"Lokal",error:null});
  }
  function subscribe(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn)}
  function getState(){return {...state}}

  window.RiftSharedData={configured,hasTeamKey,localMatches,saveMatch,deleteMatch,sync,connect,disconnect,subscribe,getState};
  setState({
    mode:configured()?(hasTeamKey()?"shared":"locked"):"local",
    status:configured()?(hasTeamKey()?"Delad · synkar…":"Delad DB · anslut lagkod"):"Lokal · databas ej aktiverad"
  });

  if(configured()&&hasTeamKey()){
    queueMicrotask(()=>sync().catch(()=>{}));
  }
})();
