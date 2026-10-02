/* Public read, explicit team-code protected publishing, revision conflict protection. */
(()=>{'use strict';
 const model=window.RiftRoster,cfg=window.RIFT_DB_CONFIG||{},KEY='rs_roster_sync_v1',listeners=new Set();
 const url=cfg.rosterFunctionUrl;
 if(!url)return;
 let applying=false,busy=false,ready=false,error='',meta;
 try{meta=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{meta={};}
 let revision=Number.isSafeInteger(meta.revision)?meta.revision:0,dirty=!!meta.dirty,hasRemote=false;
 const teamKey=()=>localStorage.getItem('rs_team_access_key')||'';
 function status(){return {busy,ready,dirty,revision,error,hasRemote,unlocked:!!teamKey()};}
 function emit(){listeners.forEach(fn=>fn(status()));}
 function persist(){localStorage.setItem(KEY,JSON.stringify({revision,dirty}));}
 function apply(row){applying=true;try{if(row.payload)model.replace(row.payload);revision=row.revision;hasRemote=!!row.payload;dirty=false;persist();}finally{applying=false;}}
 async function request(body,key){
  const res=await fetch(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(body?{'x-team-key':key??teamKey()}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Kunde inte synka.');return data;
 }
 async function refresh(discard=false){
  if(busy||dirty&&!discard&&ready)return;busy=true;error='';emit();
  try{const row=await request();
   if(row.payload&&!localStorage.getItem('rs_roster_before_shared'))localStorage.setItem('rs_roster_before_shared',JSON.stringify(model.snapshot()));
   // Edits made while the GET was in flight must never be discarded.
   if(!dirty||discard)apply(row);ready=true;hasRemote=!!row.payload;
  }catch(e){error=e.message;}finally{busy=false;emit();}
 }
 async function save(){
  if(busy||!ready)throw Error('Hämta lagets roster först.');if(!teamKey())throw Error('Lås upp med lagkoden först.');
  busy=true;error='';emit();
  try{const before=model.key(),payload=model.snapshot();payload.profiles=payload.profiles.map(p=>model.profile(p.role,p.id));const row=await request({payload,revision});if(model.key()===before)apply(row);else{revision=row.revision;hasRemote=true;dirty=true;persist();}return true;
  }catch(e){error=e.message;throw e;}finally{busy=false;emit();}
 }
 async function unlock(key){if(!key.trim())throw Error('Ange lagkoden.');await request({verifyOnly:true},key.trim());localStorage.setItem('rs_team_access_key',key.trim());emit();}
 model.subscribe(source=>{if(!applying&&source!=='external'){dirty=true;persist();emit();}});
 window.RiftRosterSync={status,subscribe:fn=>{listeners.add(fn);fn(status());},refresh,save,unlock};
 window.addEventListener('focus',()=>refresh());
 window.addEventListener('storage',e=>{if(e.key===KEY){try{meta=JSON.parse(e.newValue||'{}');revision=meta.revision??revision;dirty=!!meta.dirty;}catch{}emit();}if(e.key==='rs_team_access_key')emit();});
 refresh();
})();
