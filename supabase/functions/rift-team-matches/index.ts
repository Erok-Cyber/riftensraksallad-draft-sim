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
      const {data,error}=await db.from("team_matches").select("id,saved_at,result,match_type,side,comp,payload").eq("team_slug",teamSlug).is("deleted_at",null).order("saved_at",{ascending:false}).limit(250);
      if(error)return json({error:error.message},500);
      return json({matches:(data||[]).reverse()});
    }
    const teamKey=req.headers.get("x-team-key")?.trim()||"";
    if(!teamKey)return json({error:"Team access code required"},401);
    const {data:allowed,error:verifyError}=await db.rpc("verify_team_key_service",{p_team_slug:teamSlug,p_team_key:teamKey});
    if(verifyError)return json({error:"Could not verify team access"},500);
    if(!allowed)return json({error:"Invalid team access code"},401);
    if(req.method==="POST"){
      const raw=await req.text();
      if(raw.length>262144)return json({error:"Match payload too large"},413);
      const body=(()=>{try{return JSON.parse(raw)}catch{return null}})();
      if(body?.verifyOnly===true)return json({ok:true,writeAccess:true});
      const match=body?.match;
      if(!match||typeof match.id!=="string"||!match.id.length||match.id.length>160)return json({error:"Invalid match"},400);
      if(match.comp!=null&&(typeof match.comp!=="string"||match.comp.length>100||/[<>]/.test(match.comp)))return json({error:"Invalid comp"},400);
      if(match.patch!=null&&(typeof match.patch!=="string"||!/^\d{1,4}\.\d{1,3}$/.test(match.patch)))return json({error:"Invalid patch"},400);
      if(match.savedAt&&!Number.isFinite(Date.parse(match.savedAt)))return json({error:"Invalid date"},400);
      for(const field of ["ourPicks","enemyPicks"]){
        if(match[field]!=null&&(!Array.isArray(match[field])||match[field].length>5||match[field].some((p: unknown)=>!p||typeof p!=="object"||typeof (p as {champ?:unknown}).champ!=="string")))return json({error:"Invalid picks"},400);
      }
      if(!["win","loss"].includes(match.result))return json({error:"Invalid result"},400);
      if(!["league","flex"].includes(match.matchType))return json({error:"Invalid match type"},400);
      if(!["blue","red"].includes(match.side))return json({error:"Invalid side"},400);
      const row={id:match.id,team_slug:teamSlug,saved_at:match.savedAt||new Date().toISOString(),result:match.result,match_type:match.matchType,side:match.side,comp:match.comp||null,payload:match};
      const {error}=await db.from("team_matches").upsert(row,{onConflict:"id"});
      if(error?.message?.includes("MATCH_DELETED"))return json({error:"Matchen har raderats. Synka historiken."},410);
      if(error)return json({error:error.message},500);
      return json({ok:true,id:match.id});
    }
    if(req.method==="DELETE"){
      const id=new URL(req.url).searchParams.get("id");
      if(!id)return json({error:"Match id required"},400);
      const {error}=await db.from("team_matches").update({deleted_at:new Date().toISOString()}).eq("team_slug",teamSlug).eq("id",id).is("deleted_at",null);
      if(error)return json({error:error.message},500);
      return json({ok:true});
    }
    return json({error:"Method not allowed"},405);
  }catch(err){console.error(err);return json({error:"Unexpected server error"},500)}
});
