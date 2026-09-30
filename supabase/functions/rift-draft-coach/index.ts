import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { sanitizeDraft, responseSchema, validateAnswer, SYSTEM_PROMPT } from './policy.mjs';

const headers={'Access-Control-Allow-Origin':'https://erok-cyber.github.io','Access-Control-Allow-Headers':'content-type, x-team-key','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const MODEL='openai/gpt-oss-120b';
// Per-worker burst protection; team-code authentication is the spending boundary.
// Also configure the provider's project spending limits for a hard global budget.
let minuteAt=0,minuteCalls=0,inFlight=0;
const cache=new Map<string,{at:number,result:unknown}>();
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  const key=Deno.env.get('GROQ_API_KEY')||'';
  if(req.method==='GET')return json({configured:!!key,model:MODEL,auth:'team-code',version:2});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const teamKey=req.headers.get('x-team-key')?.trim()||'';
  if(!teamKey||teamKey.length>200)return json({error:'TEAM_KEY_REQUIRED'},401);
  try{
    const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!service)return json({error:'SERVER_NOT_CONFIGURED'},503);
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(5000)})}});
    const {data:allowed,error}=await db.rpc('verify_team_key_service',{p_team_slug:'riftensraksallad',p_team_key:teamKey});
    if(error)return json({error:'AUTH_UNAVAILABLE'},503);
    if(allowed!==true)return json({error:'INVALID_TEAM_KEY'},401);
    if(!key)return json({error:'GROQ_NOT_CONFIGURED'},503);
    if(Number(req.headers.get('content-length')||0)>24000)return json({error:'REQUEST_TOO_LARGE'},413);
    const reader=req.body?.getReader();if(!reader)return json({error:'INVALID_DRAFT'},400);
    const chunks:Uint8Array[]=[];let bytes=0;
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>24000){await reader.cancel();return json({error:'REQUEST_TOO_LARGE'},413);}chunks.push(value);}
    const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
    let raw;try{raw=JSON.parse(new TextDecoder().decode(buffer));}catch{return json({error:'INVALID_DRAFT'},400);}
    if(raw?.verifyOnly===true)return json({ok:true,configured:true,model:MODEL});
    let draft;try{draft=sanitizeDraft(raw);}catch(e){return json({error:e instanceof Error?e.message:'INVALID_DRAFT'},400);}
    const cacheKey=JSON.stringify(draft),now=Date.now(),hit=cache.get(cacheKey);
    if(hit&&now-hit.at<180000)return json({...hit.result as object,cached:true});
    if(now-minuteAt>60000){minuteAt=now;minuteCalls=0;}
    if(minuteCalls>=12||inFlight>=2)return json({error:'RATE_LIMITED'},429);
    minuteCalls++;inFlight++;
    try{
      const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
        body:JSON.stringify({model:MODEL,temperature:0.2,reasoning_effort:'low',max_completion_tokens:draft.type==='gameplan'?3000:1800,
          messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:JSON.stringify(draft)}],
          response_format:{type:'json_schema',json_schema:{name:'draft_advice',strict:true,schema:responseSchema(draft)}}})
      });
      if(!response.ok)return json({error:response.status===429?'PROVIDER_RATE_LIMIT':'PROVIDER_UNAVAILABLE'},response.status===429?429:502);
      const completion=await response.json();
      if(completion.choices?.[0]?.finish_reason!=='stop')return json({error:'INCOMPLETE_AI_RESPONSE'},502);
      let advice;try{advice=validateAnswer(JSON.parse(completion.choices[0].message.content),draft);}catch{return json({error:'INVALID_AI_RESPONSE'},502);}
      const result={advice,model:MODEL,generatedAt:new Date().toISOString()};
      if(cache.size>=40)cache.delete(cache.keys().next().value!);cache.set(cacheKey,{at:now,result});
      return json(result);
    }finally{inFlight--;}
  }catch(e){return json({error:e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'AI_TIMEOUT':'AI_UNAVAILABLE'},503);}
});
