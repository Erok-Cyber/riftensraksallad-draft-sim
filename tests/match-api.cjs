const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
let handler,allowed=true,query=[],write=null,deleted=false;
const db={rpc:async()=>({data:allowed}),from:()=>{
 const q={select(){return q},eq(){return q},is(k,v){query.push(['is',k,v]);return q},order(k,o){query.push(['order',k,o]);return q},limit(n){query.push(['limit',n]);return q},
 update(v){write=v;return q},upsert(v){write=v;return q},then(resolve){resolve({data:[{id:'new'},{id:'old'}],error:deleted?{message:'MATCH_DELETED'}:null})}};return q;
}};
const c={Request,Response,URL,Date,console,Deno:{env:{get:()=> 'fixture'},serve:fn=>handler=fn},createClient:()=>db};vm.createContext(c);
vm.runInContext(stripTypeScriptTypes(fs.readFileSync(__dirname+'/../supabase/functions/rift-team-matches/index.ts','utf8').replace(/^import .*;\n/gm,'')),c);
const request=(method,body,key)=>new Request('https://fixture.invalid?id=fixture',{method,headers:key?{'x-team-key':key}:{},...(body?{body:JSON.stringify(body)}:{})});
(async()=>{
 const get=await handler(request('GET'));assert.equal(get.status,200);assert.equal((await get.json()).matches[0].id,'old');
 assert(query.some(x=>x[0]==='is'&&x[1]==='deleted_at'&&x[2]===null));assert(query.some(x=>x[0]==='order'&&x[2].ascending===false));
 assert.equal((await handler(request('DELETE'))).status,401);assert.equal(write,null);
 const m={id:'fixture',result:'win',matchType:'league',side:'blue',patch:'26.19',comp:'EARLY SKIRMISH'};
 assert.equal((await handler(request('POST',{match:{...m,comp:'<img src=x>'}},'test'))).status,400);
 assert.equal((await handler(request('POST',{match:{...m,patch:'<script>'}},'test'))).status,400);
 assert.equal((await handler(request('POST',{match:m},'test'))).status,200);
 deleted=true;assert.equal((await handler(request('POST',{match:m},'test'))).status,410);deleted=false;
 await handler(request('DELETE',null,'test'));assert(write.deleted_at);
 console.log('PASS: match API read order, soft-delete filter, auth, input validation and deleted-write refusal.');
})().catch(e=>{console.error(e);process.exitCode=1});
