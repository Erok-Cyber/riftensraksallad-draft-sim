const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
(async()=>{
 const policy=await import('../supabase/functions/rift-draft-coach/policy.mjs');
 const raw={side:'blue',events:[],pools:{support:['Braum']},targeted:true,scouting:[{champ:'Zoe',role:'mid',season:100}],candidates:[{ch:'Zoe',score:40},{ch:'Nocturne',score:50}]};
 const draft=policy.sanitizeDraft(raw);assert.deepEqual(draft.candidates.map(x=>x.ch),['Zoe']);
 assert.throws(()=>policy.sanitizeDraft({...raw,scouting:[]}));
 assert.throws(()=>policy.validateAnswer({choices:[{id:'ban:Nocturne',reason:'invented'}]},draft));
 assert.throws(()=>policy.validateAnswer({choices:[{id:'ban:Zoe',reason:'yes'},{id:'ban:Zoe',reason:'twice'}]},draft));
 assert.equal(policy.validateAnswer({choices:[{id:'ban:Zoe',reason:'CM/OP.GG'}]},draft).choices.length,1);
 const bans=['Garen','Darius','Olaf','Leona','Maokai','Nautilus'].map((champ,i)=>({type:'ban',side:i%2?'red':'blue',champ}));
 const pick=policy.sanitizeDraft({...raw,events:bans,forcedRole:'support',candidates:[{ch:'Braum',role:'support'},{ch:'Braum',role:'top'},{ch:'Leona',role:'support'}]});
 assert.deepEqual(pick.candidates.map(c=>c.id),['support:Braum']);
 assert.throws(()=>policy.sanitizeDraft({...raw,events:[{type:'ban',side:'red',champ:'Garen'}]}));
 assert.throws(()=>policy.sanitizeDraft({...raw,events:bans.slice(0,1)}));
 assert.throws(()=>policy.sanitizeDraft({...raw,events:[bans[0],{...bans[1],champ:'Garen'}]}));
 // Test the deployed handler with fake environment/RPC/Groq. No real credentials or network.
 const source=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/rift-draft-coach/index.ts'),'utf8').replace(/^import .*;\n/gm,'');
 let handler,allow=true,configured=true,providerCalls=0,lastRequest,failProvider=false;
 const context={...policy,Request,Response,TextDecoder,Uint8Array,AbortSignal,Date,Map,JSON,Error,
 Deno:{env:{get:name=>name==='GROQ_API_KEY'?(configured?'fake-groq-key':''):'fake-server-config'},serve:fn=>handler=fn},
 createClient:()=>({rpc:async()=>({data:allow,error:null})}),
 fetch:async(url,init)=>{providerCalls++;lastRequest=JSON.parse(init.body);if(failProvider)return new Response('{}',{status:429});return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({choices:[{id:'ban:Zoe',reason:'Observerad pool',risk:'Litet sample'}],plan:'Säkra engage',nextStep:'Skydda carry',uncertainty:'Säsongsdata'})}}]});}};
 vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source),context);
 const req=(body,key)=>new Request('https://test.example',{method:'POST',headers:key?{'x-team-key':key}:undefined,body:JSON.stringify(body)});
 assert.equal((await handler(req(raw))).status,401);assert.equal(providerCalls,0);
 allow=false;assert.equal((await handler(req(raw,'wrong'))).status,401);assert.equal(providerCalls,0);
 allow=true;configured=false;assert.equal((await handler(req(raw,'valid'))).status,503);
 configured=true;assert.equal((await handler(req({verifyOnly:true},'valid'))).status,200);assert.equal(providerCalls,0);
 const result=await handler(req(raw,'valid'));assert.equal(result.status,200);assert.equal((await result.json()).advice.choices[0].id,'ban:Zoe');
 assert.equal(providerCalls,1);assert(!JSON.stringify(lastRequest).includes('fake-groq-key'));assert(!JSON.stringify(lastRequest).includes('x-team-key'));
 assert.equal(lastRequest.response_format.json_schema.strict,true);
 assert.equal((await handler(req(raw,'valid'))).status,200);assert.equal(providerCalls,1,'same state uses server cache');
 failProvider=true;assert.equal((await handler(req({...raw,patch:'26.19'},'valid'))).status,429);
 assert.equal((await handler(req({x:'a'.repeat(25000)},'valid'))).status,413);
 console.log('PASS: AI input legality, target-ban evidence, schema validation, auth, missing key, cache, safe provider errors, body limit.');
})().catch(error=>{console.error(error);process.exitCode=1;});
