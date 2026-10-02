const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
function harness(seed={}){
 const store=new Map(Object.entries(seed)),events={};
 const context={console,AbortSignal,URLSearchParams,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},window:{addEventListener:(n,f)=>events[n]=f}};
 vm.createContext(context);
 for(const f of ['team-data.js','roster-model.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);
 return {context,store,model:context.window.RiftRoster,run:s=>vm.runInContext(s,context)};
}
(async()=>{
 const {validateRoster}=await import('../supabase/functions/rift-team-roster/policy.mjs');
 const h=harness(),m=h.model;
 m.setComfort('support','Braum',3,'jacob-support');
 assert.equal(m.player('support').name,'Frippen');
 assert.equal(m.profile('support','jacob-support').comfort.Braum,3);
 const newId=m.savePlayer('top','','Test sub',['Ornn'],false);
 assert.equal(m.player('top').name,'Dahlin');assert.equal(m.profile('top',newId).name,'Test sub');
 m.pauseChampion('jungle','Xin Zhao',true);
 assert(!m.available('jungle').includes('Xin Zhao'));assert(m.player('jungle').pool.includes('Xin Zhao'));
 assert(!m.compOptions()['EARLY SKIRMISH'].jungle.includes('Xin Zhao'));
 m.pauseChampion('jungle','Xin Zhao',false);assert(m.available('jungle').includes('Xin Zhao'));
 m.setComfort('adc','Jinx',9);assert.equal(m.compPlan('PRESS R').adc,'Jinx','preserve core over a one-point comfort difference');
 m.setComfort('adc','Jinx',2);assert.notEqual(m.compPlan('PRESS R').adc,'Jinx');
 let payload=m.snapshot();payload.profiles=payload.profiles.map(p=>m.profile(p.role,p.id));
 const clean=validateRoster(payload);assert.equal(clean.profiles.length,7);
 // Exercise the real Edge handler with a fake database; no real team writes.
 let handler,allowed=true,dbRow={payload:null,revision:0},writes=0;
 const edge={validateRoster,Request,Response,Date,JSON,Error,Deno:{env:{get:()=> 'test-only'},serve:fn=>handler=fn},createClient:()=>({rpc:async()=>({data:allowed}),from:()=>{
  let update,expected;const q={select:()=>q,eq:(k,v)=>{if(k==='revision')expected=v;return q;},single:async()=>({data:dbRow}),update:v=>{update=v;return q;},maybeSingle:async()=>{if(expected!==dbRow.revision)return {data:null};writes++;dbRow=update;return {data:dbRow};}};return q;
 }})};
 const source=fs.readFileSync(path.join(root,'supabase/functions/rift-team-roster/index.ts'),'utf8').replace(/^import .*;\n/gm,'');
 vm.createContext(edge);vm.runInContext(require('node:module').stripTypeScriptTypes(source),edge);
 const req=(body,key)=>new Request('https://test.invalid',{method:'POST',headers:key?{'x-team-key':key}:undefined,body:JSON.stringify(body)});
 assert.equal((await handler(new Request('https://test.invalid'))).status,200);
 assert.equal((await handler(req({payload:clean,revision:0}))).status,401);
 allowed=false;assert.equal((await handler(req({payload:clean,revision:0},'bad'))).status,401);assert.equal(writes,0);
 allowed=true;assert.equal((await handler(req({payload:clean,revision:0},'test'))).status,200);
 assert.equal((await handler(req({payload:clean,revision:0},'test'))).status,409);assert.equal(writes,1);
 assert.equal((await handler(req({payload:{},revision:1},'test'))).status,400);
 assert.throws(()=>validateRoster({...payload,active:{}}));
 const bad=JSON.parse(JSON.stringify(payload));bad.profiles[0].comfort[bad.profiles[0].pool[0]]=11;assert.throws(()=>validateRoster(bad));
 const poison=JSON.parse(JSON.stringify(payload));poison.profiles[0].pool=['__proto__'];assert.throws(()=>validateRoster(poison));
 let remote={payload:clean,revision:1},posts=0;
 h.context.window.RIFT_DB_CONFIG={rosterFunctionUrl:'https://test.invalid/roster'};
 h.context.fetch=async(url,o)=>{
  if(o.method==='GET')return {ok:true,json:async()=>JSON.parse(JSON.stringify(remote))};
  const b=JSON.parse(o.body);posts++;
  if(o.headers['x-team-key']!=='test-only')return {ok:false,json:async()=>({error:'Fel lagkod.'})};
  if(b.verifyOnly)return {ok:true,json:async()=>({ok:true})};
  if(b.revision!==remote.revision)return {ok:false,json:async()=>({error:'Version conflict'})};
  remote={payload:validateRoster(b.payload),revision:remote.revision+1};return {ok:true,json:async()=>remote};
 };
 vm.runInContext(fs.readFileSync(path.join(root,'roster-sync.js'),'utf8'),h.context);
 await new Promise(r=>setImmediate(r));const s=h.context.window.RiftRosterSync;
 assert(s.status().ready);assert.equal(s.status().revision,1);assert.equal(posts,0,'loading never publishes');
 await assert.rejects(s.save(),/lagkoden/);await assert.rejects(s.unlock('wrong'),/Fel/);
 await s.unlock('test-only');m.setComfort('jungle','Xin Zhao',6);assert(s.status().dirty);
 remote.revision=2;await assert.rejects(s.save(),/conflict/);assert(s.status().dirty);
 await s.refresh(true);assert.equal(s.status().revision,2);assert(!s.status().dirty);
 m.pauseChampion('jungle','Xin Zhao',true);await s.save();assert.equal(remote.revision,3);assert(remote.payload.profiles.find(p=>p.role==='jungle').paused.includes('Xin Zhao'));
 assert(!s.status().dirty);
 // Local edits survive a reload and can still be published against their original revision.
 m.setComfort('jungle','Viego',4);
 const h2=harness(Object.fromEntries(h.store));h2.context.window.RIFT_DB_CONFIG=h.context.window.RIFT_DB_CONFIG;h2.context.fetch=h.context.fetch;
 vm.runInContext(fs.readFileSync(path.join(root,'roster-sync.js'),'utf8'),h2.context);await new Promise(r=>setImmediate(r));
 const s2=h2.context.window.RiftRosterSync;assert(s2.status().ready&&s2.status().dirty);assert.equal(h2.model.comfort('jungle','Viego'),4);await s2.save();assert.equal(remote.revision,4);
 console.log('PASS: separate editor/lineup, pause/restore, stable cores, validation, read-only load, auth, conflict, shared save and reload-safe drafts.');
})().catch(e=>{console.error(e);process.exitCode=1;});
