import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { validateRoster } from './policy.mjs';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-team-key","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed'},405);
 try{
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const slug='riftensraksallad';
  if(req.method==='GET'){
   const {data,error}=await db.from('team_rosters').select('payload,revision,updated_at').eq('team_slug',slug).single();
   if(error)throw error;return json(data);
  }
  const key=req.headers.get('x-team-key')?.trim();
  if(!key||key.length>256)return json({error:'Lagkod krävs.'},401);
  const {data:allowed,error:authError}=await db.rpc('verify_team_key_service',{p_team_slug:slug,p_team_key:key});
  if(authError)throw authError;
  if(!allowed)return json({error:'Fel lagkod.'},401);
  const text=await req.text();if(text.length>150000)return json({error:'För stor roster.'},413);
  let body,payload;
  try{body=JSON.parse(text);if(body.verifyOnly===true)return json({ok:true});payload=validateRoster(body.payload);if(!Number.isSafeInteger(body.revision)||body.revision<0)throw Error('Ogiltig version.');}catch(e){return json({error:e.message},400);}
  // Compare-and-swap is atomic: a stale browser cannot overwrite newer edits.
  const {data,error}=await db.from('team_rosters').update({payload,revision:body.revision+1,updated_at:new Date().toISOString()}).eq('team_slug',slug).eq('revision',body.revision).select('payload,revision,updated_at').maybeSingle();
  if(error)throw error;
  if(!data)return json({error:'Laget har en nyare version. Hämta lagets version innan du sparar igen.'},409);
  return json(data);
 }catch{ return json({error:'Kunde inte nå lagets roster. Försök igen.'},500); }
});
