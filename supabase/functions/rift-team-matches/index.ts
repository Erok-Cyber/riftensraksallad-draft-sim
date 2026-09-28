import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-team-key","Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS","Access-Control-Max-Age":"86400"};
const json=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(async(req: Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!serviceRole)return json({error:"Server configuration missing"},500);
    const teamSlug="riftensraksallad";
    const db=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
    if(req.method==="GET"){
      const {data,error}=await db.from("team_matches").select("id,saved_at,result,match_type,side,comp,payload").eq("team_slug",teamSlug).order("saved_at",{ascending:true}).limit(250);
      if(error)return json({error:error.message},500);
      return json({matches:data||[]});
    }
    const teamKey=req.headers.get("x-team-key")?.trim()||"";
    if(!teamKey)return json({error:"Team access code required"},401);
    const {data:allowed,error:verifyError}=await db.rpc("verify_team_key_service",{p_team_slug:teamSlug,p_team_key:teamKey});
    if(verifyError)return json({error:"Could not verify team access"},500);
    if(!allowed)return json({error:"Invalid team access code"},401);
    if(req.method==="POST"){
      const body=await req.json().catch(()=>null);
      if(body?.verifyOnly===true)return json({ok:true,writeAccess:true});
      const match=body?.match;
      if(!match||typeof match.id!=="string")return json({error:"Invalid match"},400);
      if(!["win","loss"].includes(match.result))return json({error:"Invalid result"},400);
      if(!["league","flex"].includes(match.matchType))return json({error:"Invalid match type"},400);
      if(!["blue","red"].includes(match.side))return json({error:"Invalid side"},400);
      const row={id:match.id,team_slug:teamSlug,saved_at:match.savedAt||new Date().toISOString(),result:match.result,match_type:match.matchType,side:match.side,comp:match.comp||null,payload:match};
      const {error}=await db.from("team_matches").upsert(row,{onConflict:"id"});
      if(error)return json({error:error.message},500);
      return json({ok:true,id:match.id});
    }
    if(req.method==="DELETE"){
      const id=new URL(req.url).searchParams.get("id");
      if(!id)return json({error:"Match id required"},400);
      const {error}=await db.from("team_matches").delete().eq("team_slug",teamSlug).eq("id",id);
      if(error)return json({error:error.message},500);
      return json({ok:true});
    }
    return json({error:"Method not allowed"},405);
  }catch(err){console.error(err);return json({error:"Unexpected server error"},500)}
});