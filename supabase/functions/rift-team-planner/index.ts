import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, x-team-key",
  "Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age":"86400"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!serviceRole)return json({error:"Server configuration missing"},500);
    const teamSlug="riftensraksallad";
    const db=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
    const url=new URL(req.url);

    if(req.method==="GET"){
      const id=url.searchParams.get("id");
      let query=db.from("team_plans").select("id,opponent,scheduled_at,status,payload,updated_at").eq("team_slug",teamSlug);
      if(id)query=query.eq("id",id);
      const {data,error}=await query.order("scheduled_at",{ascending:true}).limit(50);
      if(error)return json({error:error.message},500);
      return json({plans:data||[]});
    }

    const teamKey=req.headers.get("x-team-key")?.trim()||"";
    if(!teamKey)return json({error:"Team access code required"},401);
    const {data:allowed,error:verifyError}=await db.rpc("verify_team_key_service",{p_team_slug:teamSlug,p_team_key:teamKey});
    if(verifyError)return json({error:"Could not verify team access"},500);
    if(!allowed)return json({error:"Invalid team access code"},401);

    if(req.method==="POST"){
      const body=await req.json().catch(()=>null);
      if(body?.verifyOnly===true)return json({ok:true,writeAccess:true});
      const plan=body?.plan;
      if(!plan||typeof plan.id!=="string"||typeof plan.opponent!=="string"||!plan.scheduledAt)return json({error:"Invalid plan"},400);
      const status=["upcoming","completed","cancelled"].includes(plan.status)?plan.status:"upcoming";
      const row={id:plan.id,team_slug:teamSlug,opponent:plan.opponent.trim(),scheduled_at:plan.scheduledAt,status,payload:plan,updated_at:new Date().toISOString()};
      const {error}=await db.from("team_plans").upsert(row,{onConflict:"id"});
      if(error)return json({error:error.message},500);
      return json({ok:true,id:plan.id});
    }
    if(req.method==="DELETE"){
      const id=url.searchParams.get("id");
      if(!id)return json({error:"Plan id required"},400);
      const {error}=await db.from("team_plans").delete().eq("team_slug",teamSlug).eq("id",id);
      if(error)return json({error:error.message},500);
      return json({ok:true});
    }
    return json({error:"Method not allowed"},405);
  }catch(err){console.error(err);return json({error:"Unexpected server error"},500)}
});