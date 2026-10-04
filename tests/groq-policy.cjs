const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
(async()=>{
 const policy=await import('../supabase/functions/rift-draft-coach/policy.mjs');
 const raw={side:'blue',events:[],pools:{support:['Braum']},targeted:true,scouting:[{champ:'Zoe',role:'mid',season:100}],candidates:[{ch:'Zoe',score:40},{ch:'Nocturne',score:50}]};
 const large=policy.sanitizeDraft({...raw,pools:{top:Array.from({length:60},(_,i)=>'Champ'+i),support:['Braum']},comfort:[...Array.from({length:60},(_,i)=>({role:'top',ch:'Champ'+i,value:8})),{role:'support',ch:'Braum',value:3}]});assert.equal(large.comfort.find(c=>c.ch==='Braum').value,3);
 const draft=policy.sanitizeDraft(raw);assert.deepEqual(draft.candidates.map(x=>x.ch),['Zoe']);
 assert.throws(()=>policy.sanitizeDraft({...raw,scouting:[]}));
 assert.throws(()=>policy.validateAnswer({choices:[{id:'ban:Nocturne',reason:'invented'}]},draft));
 assert.throws(()=>policy.validateAnswer({choices:[{id:'ban:Zoe',reason:'yes'},{id:'ban:Zoe',reason:'twice'}]},draft));
 assert.equal(policy.validateAnswer({choices:[{id:'ban:Zoe',reason:'CM/OP.GG'}]},draft).choices.length,1);
 const reviewed=policy.sanitizeDraft({...raw,teamLessons:Array.from({length:8},()=>({source:'series-review',sameLineup:true,next:'x'.repeat(1000),secret:'must drop'}))});
 assert.equal(reviewed.teamLessons.length,5);assert.equal(reviewed.teamLessons[0].next.length,220);assert.equal(reviewed.teamLessons[0].sameLineup,false);assert.equal(reviewed.teamLessons[0].secret,undefined);
 const roleIndex={blue:0,red:0};
 const full=policy.ORDER.map(([type,side],i)=>({type,side,champ:'Champion'+i,role:type==='pick'?policy.ROLES[roleIndex[side]++]:'unknown'}));
 for(const side of ['blue','red']){
   const final=policy.sanitizeDraft({...raw,side,events:full,candidates:[]});
   assert.equal(final.type,'gameplan');assert.equal(final.candidates.length,0);
   const plan=Object.fromEntries(policy.PLAN_FIELDS.map(k=>[k,'Konkret villkorad plan']));
   assert.equal(policy.validateAnswer(plan,final).early,plan.early);
   assert.throws(()=>policy.validateAnswer({...plan,jungle:''},final));
   assert(!policy.responseSchema(final).properties.choices);
 }
 assert.throws(()=>policy.sanitizeDraft({...raw,events:[...full,full[0]]}));
 const bans=['Garen','Darius','Olaf','Leona','Maokai','Nautilus'].map((champ,i)=>({type:'ban',side:i%2?'red':'blue',champ}));
 const pick=policy.sanitizeDraft({...raw,events:bans,forcedRole:'support',candidates:[{ch:'Braum',role:'support'},{ch:'Braum',role:'top'},{ch:'Leona',role:'support'}]});
 assert.deepEqual(pick.candidates.map(c=>c.id),['support:Braum']);
 assert.throws(()=>policy.sanitizeDraft({...raw,events:[{type:'ban',side:'red',champ:'Garen'}]}));
 assert.throws(()=>policy.sanitizeDraft({...raw,events:bans.slice(0,1)}));
 assert.throws(()=>policy.sanitizeDraft({...raw,events:[bans[0],{...bans[1],champ:'Garen'}]}));
 // Reproduce B3 from the screenshot: Ahri and Braum are already locked.
 const boardNames=['Azir','Mordekaiser','Lulu','Xin Zhao','Yunara','Jarvan IV','Nautilus','Braum','Ahri','Ashe'];
 const screenshot=policy.sanitizeDraft({side:'blue',events:boardNames.map((champ,i)=>({type:policy.ORDER[i][0],side:policy.ORDER[i][1],champ,role:i===6?'support':i===9?'adc':'unknown'})),pools:{mid:['Taliyah','Vex','Hwei']},forcedRole:'mid',candidates:[{ch:'Taliyah',role:'mid',score:100},{ch:'Vex',role:'mid',score:95}],scouting:[{champ:'Ahri',role:'mid',season:100},{champ:'Sylas',role:'mid',season:30}]});
 assert.deepEqual(screenshot.board.enemyPicks.map(c=>c.champ),['Braum','Ahri']);
 assert.deepEqual(screenshot.scouting.map(c=>c.champ),['Sylas']);
 assert.equal(screenshot.baseline,'mid:Taliyah');
 const good={choices:[{id:'mid:Vex',reason:'Vex kan följa Nautilus engage.',risk:'Ahri är låst; undvik charm när ni följer upp.'}],comparison:'Vex kan följa Nautilus engage mot den låsta backlinen mer direkt än Taliyah, men offrar Taliyahs zonkontroll.'};
 assert.equal(policy.validateAnswer(good,screenshot).choices[0].id,'mid:Vex');
 assert.throws(()=>policy.validateAnswer({...good,comparison:''},screenshot),'An override must compare with the baseline');
 for(const risk of ['Om motståndaren väljer starkt poke-mid (t.ex. Ahri) kan Vex bli pressad tidigt.','De kan picka Ahri.','If they pick Ahri, play safely.','Om dom bannar Xin Zhao blir det svårt.']){
   assert.throws(()=>policy.validateAnswer({...good,choices:[{...good.choices[0],risk}]},screenshot),risk);
 }
 assert.doesNotThrow(()=>policy.validateAnswer({...good,choices:[{...good.choices[0],risk:'Om Ahri missar charm kan ni följa upp.'}]},screenshot));
 assert.doesNotThrow(()=>policy.validateAnswer({...good,choices:[{...good.choices[0],risk:'Motståndaren kan välja Sylas senare.'}]},screenshot));
 assert.doesNotThrow(()=>policy.validateAnswer({choices:[{id:'mid:Taliyah',reason:'Zonkontroll med Nautilus.',risk:''}],comparison:''},screenshot));
 // Test the deployed handler with fake environment/RPC/Groq. No real credentials or network.
 const source=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/rift-draft-coach/index.ts'),'utf8').replace(/^import .*;\n/gm,'');
 let handler,allow=true,configured=true,providerCalls=0,lastRequest,failProvider=false,providerAdvice=null;
 const context={...policy,Request,Response,TextDecoder,Uint8Array,AbortSignal,Date,Map,JSON,Error,
 Deno:{env:{get:name=>name==='GROQ_API_KEY'?(configured?'fake-groq-key':''):'fake-server-config'},serve:fn=>handler=fn},
 createClient:()=>({rpc:async()=>({data:allow,error:null})}),
 fetch:async(url,init)=>{providerCalls++;lastRequest=JSON.parse(init.body);if(failProvider)return new Response('{}',{status:429});return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(providerAdvice||{choices:[{id:'ban:Zoe',reason:'Observerad pool',risk:'Litet sample'}],plan:'Säkra engage',nextStep:'Skydda carry',uncertainty:'Säsongsdata'})}}]});}};
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
 providerAdvice={...good,choices:[{...good.choices[0],risk:'Om motståndaren väljer Ahri blir det svårt.'}]};
 const shotRaw={...screenshot,candidates:screenshot.candidates};
 assert.equal((await handler(req(shotRaw,'valid'))).status,502,'Contradictory provider output must not reach the UI');
 providerAdvice=good;
 assert.equal((await handler(req(shotRaw,'valid'))).status,200,'Invalid advice must not be cached');
 providerAdvice=null;
 failProvider=true;assert.equal((await handler(req({...raw,patch:'26.19'},'valid'))).status,429);
 assert.equal((await handler(req({x:'a'.repeat(25000)},'valid'))).status,413);
 console.log('PASS: AI input legality, target-ban evidence, schema validation, auth, missing key, cache, safe provider errors, body limit.');
})().catch(error=>{console.error(error);process.exitCode=1;});

