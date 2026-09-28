/* Riftensräksallad shared match storage.
   Supabase RPC backend + local cache/offline fallback. */
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
    return !!(c.enabled&&c.url&&c.anonKey&&c.teamSlug);
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
  function headers(){
    const c=cfg();
    return {
      "apikey":c.anonKey,
      "Authorization":"Bearer "+c.anonKey,
      "Content-Type":"application/json"
    };
  }
  function rpc(name){
    const c=cfg();
    return c.url.replace(/\/$/,"")+"/rest/v1/rpc/"+name;
  }
  async function call(name,body){
    const res=await fetch(rpc(name),{method:"POST",headers:headers(),body:JSON.stringify(body)});
    if(!res.ok){
      const detail=await res.text().catch(()=>"");
      throw new Error("Shared DB "+res.status+(detail?": "+detail.slice(0,180):""));
    }
    if(res.status===204)return null;
    const text=await res.text();
    return text?JSON.parse(text):null;
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
    const c=cfg();
    const rows=await call("rift_list_matches",{p_team_slug:c.teamSlug,p_team_key:teamKey()});
    return (rows||[]).map(rowToMatch);
  }
  async function uploadOne(match){
    const c=cfg();
    return call("rift_upsert_match",{p_team_slug:c.teamSlug,p_team_key:teamKey(),p_match:match});
  }
  async function saveMatch(match){
    const local=uniqueById([...localMatches(),match]);
    writeLocal(local);
    if(!configured()||!hasTeamKey()){
      setState({mode:"local",status:configured()?"Ej ansluten":"Lokal",error:null});
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
    writeLocal(localMatches().filter(m=>m.id!==id));
    if(!configured()||!hasTeamKey())return {cloud:false};
    const c=cfg();
    try{
      await call("rift_delete_match",{p_team_slug:c.teamSlug,p_team_key:teamKey(),p_match_id:id});
      setState({mode:"shared",status:"Delad",lastSync:new Date().toISOString(),error:null});
      return {cloud:true};
    }catch(err){
      setState({mode:"offline",status:"Offline",error:String(err)});
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
    state.syncing=true;emit();
    try{
      const local=localMatches();
      const remote=await fetchRemote();
      const remoteIds=new Set(remote.map(m=>m.id));
      for(const m of local){
        if(m?.id&&m?.result&&m?.matchType&&!remoteIds.has(m.id))await uploadOne(m);
      }
      const fresh=await fetchRemote();
      const merged=uniqueById([...local,...fresh]);
      writeLocal(merged);
      setState({mode:"shared",status:"Delad",lastSync:new Date().toISOString(),error:null});
      return merged;
    }catch(err){
      console.warn("Shared sync failed; using local cache.",err);
      const msg=String(err);
      setState({
        mode:msg.includes("TEAM_KEY_MISSING")?"locked":"offline",
        status:msg.includes("TEAM_KEY_MISSING")?"Delad DB · anslut lagkod":"Offline · lokal cache",
        error:msg
      });
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
      await fetchRemote();
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
  setState({mode:configured()?(hasTeamKey()?"shared":"locked"):"local",status:configured()?(hasTeamKey()?"Delad · synkar…":"Delad DB · anslut lagkod"):"Lokal · databas ej aktiverad"});
})();
