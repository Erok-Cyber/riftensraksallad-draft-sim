import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, x-team-key",
  "Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age":"86400"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
const TEAM_SLUG="riftensraksallad";
const OPGG_SUMMONER_API="https://lol-api-summoner.op.gg/api";
const OPGG_CHAMPION_API="https://lol-api-champion.op.gg/api";
const OPGG_HEADERS={
  "Accept":"application/json, text/plain, */*",
  "Accept-Language":"en-US,en;q=0.9",
  "Origin":"https://op.gg",
  "Referer":"https://op.gg/",
  "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36"
};

type AnyRecord=Record<string,any>;

function cleanText(v:unknown,max=240){
  return String(v??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
}
function validRegion(raw:unknown){
  const region=String(raw||"EUW").toUpperCase();
  return ["EUW","EUNE","NA","KR","JP","BR","LAN","LAS","OCE","RU","TR"].includes(region)?region:"EUW";
}
function regionFromOpgg(url:unknown){
  try{
    const u=new URL(String(url||""));
    const parts=u.pathname.split("/").filter(Boolean);
    const multi=parts.findIndex(x=>x.toLowerCase()==="multisearch");
    return validRegion(multi>=0?parts[multi+1]:"EUW");
  }catch{return "EUW"}
}
function splitRiotId(riotId:string){
  const pos=riotId.lastIndexOf("#");
  return pos>0?[riotId.slice(0,pos),riotId.slice(pos+1)]:[riotId,""];
}
function same(a:unknown,b:unknown){return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase()}
function pct(wins:number,games:number){return games>0?Math.round((wins/games)*100):0}

async function opggGet(url:string){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const res=await fetch(url,{headers:OPGG_HEADERS,signal:controller.signal});
    if(!res.ok)throw new Error("OP.GG "+res.status);
    return await res.json();
  }finally{clearTimeout(timer)}
}
async function championMap(){
  const raw=await opggGet(OPGG_CHAMPION_API+"/meta/champions?hl=en_US");
  const rows=Array.isArray(raw?.data)?raw.data:[];
  const map=new Map<number,string>();
  for(const row of rows){
    const id=Number(row?.id);
    const name=cleanText(row?.name,60);
    if(Number.isFinite(id)&&name)map.set(id,name);
  }
  return map;
}
async function scoutPlayer(riotId:string,region:string,champs:Map<number,string>){
  const [gameName,tagLine]=splitRiotId(riotId);
  const searchUrl=OPGG_SUMMONER_API+"/v3/"+region+"/summoners?riot_id="+encodeURIComponent(riotId)+"&hl=en_US";
  const search=await opggGet(searchUrl);
  const foundRows=Array.isArray(search?.data)?search.data:[];
  const found=foundRows.find((x:AnyRecord)=>same(x?.game_name,gameName)&&same(x?.tagline,tagLine))||foundRows[0];
  if(!found?.summoner_id)throw new Error("Spelaren hittades inte: "+riotId);

  const sid=encodeURIComponent(String(found.summoner_id));
  const [summaryRaw,gamesRaw]=await Promise.all([
    opggGet(OPGG_SUMMONER_API+"/"+region+"/summoners/"+sid+"/summary?hl=en_US"),
    opggGet(OPGG_SUMMONER_API+"/"+region+"/summoners/"+sid+"/games?limit=20&game_type=ranked&hl=en_US&ended_at=")
  ]);
  const summoner=summaryRaw?.data?.summoner||summaryRaw?.data||{};
  const seasonRows=Array.isArray(summoner?.most_champions?.champion_stats)?summoner.most_champions.champion_stats:[];
  const games=Array.isArray(gamesRaw?.data)?gamesRaw.data:[];
  const recent=new Map<number,{games:number,wins:number,positions:Map<string,number>}>();
  for(const game of games){
    const mine=game?.my_data||{};
    const id=Number(mine?.champion_id);
    if(!Number.isFinite(id))continue;
    const item=recent.get(id)||{games:0,wins:0,positions:new Map<string,number>()};
    item.games++;
    const won=String(mine?.stats?.result||"").toUpperCase()==="WIN"||mine?.stats?.result===true;
    if(won)item.wins++;
    const position=cleanText(mine?.position||mine?.role||"",20).toUpperCase();
    if(position)item.positions.set(position,(item.positions.get(position)||0)+1);
    recent.set(id,item);
  }

  const ids=new Set<number>();
  for(const row of seasonRows){const id=Number(row?.id);if(Number.isFinite(id))ids.add(id)}
  for(const id of recent.keys())ids.add(id);
  const championStats=[...ids].map(id=>{
    const season=seasonRows.find((x:AnyRecord)=>Number(x?.id)===id)||{};
    const r=recent.get(id)||{games:0,wins:0,positions:new Map<string,number>()};
    const gamesSeason=Number(season?.play)||0;
    const winsSeason=Number(season?.win)||0;
    const wrSeason=pct(winsSeason,gamesSeason);
    const wrRecent=pct(r.wins,r.games);
    const role=[...r.positions.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
    const score=
      Math.min(gamesSeason,100)*0.72+
      Math.max(0,wrSeason-50)*1.25+
      Math.min(r.games,10)*4.5+
      Math.max(0,wrRecent-50)*0.7;
    return {
      championId:id,
      champion:champs.get(id)||("Champion "+id),
      seasonGames:gamesSeason,
      seasonWins:winsSeason,
      seasonWinrate:wrSeason,
      recentGames:r.games,
      recentWins:r.wins,
      recentWinrate:wrRecent,
      role,
      score:Math.round(score*10)/10
    };
  }).filter(x=>x.champion&&!x.champion.startsWith("Champion ")).sort((a,b)=>b.score-a.score);

  return {
    riotId,
    gameName:cleanText(summoner?.game_name||found?.game_name||gameName,80),
    tagLine:cleanText(summoner?.tagline||found?.tagline||tagLine,30),
    tier:cleanText(found?.solo_tier_info?.tier||summoner?.league_stats?.[0]?.tier_info?.tier||"",30),
    topChampions:championStats.slice(0,8)
  };
}
function candidateWhy(c:AnyRecord){
  const bits=[];
  if(c.seasonGames)bits.push(c.seasonGames+" ranked games / "+c.seasonWinrate+"% WR");
  if(c.recentGames)bits.push(c.recentGames+"/20 senaste ranked / "+c.recentWinrate+"% WR");
  if(c.role)bits.push(c.role.toLowerCase());
  const stats=bits.length?bits.join(" · "):"tydlig comfort i tillgänglig OP.GG-data";
  return c.riotId+" visar "+c.champion+": "+stats+".";
}
function buildBanPlan(players:AnyRecord[]){
  const byChampion=new Map<string,AnyRecord>();
  for(const player of players){
    for(const c of player.topChampions||[]){
      const entry={...c,riotId:player.riotId};
      const prev=byChampion.get(c.champion);
      if(!prev||entry.score>prev.score)byChampion.set(c.champion,entry);
    }
  }
  const ranked=[...byChampion.values()].sort((a,b)=>b.score-a.score);
  const top=ranked.slice(0,5);
  const banPriority=top.map((c,i)=>({
    champ:c.champion,
    type:i<3?"target":"watch",
    priority:i+1,
    why:candidateWhy(c)
  }));
  return {
    banPriority,
    phase1Plan:{
      b1:top[0]?.champion||"",
      b2:top[1]?.champion||"",
      b3:top[2]?.champion||"",
      note:top.length>=3
        ?"Automatisk Game 1-plan från OP.GG: season-volym, winrate och de senaste ranked-matcherna. Verifiera roller/comfort i lobby och justera vid behov."
        :"Autoscout hittade begränsad ranked-data. Använd planen som watch-lista och verifiera i lobby."
    }
  };
}
function defaultConditionals(){
  return [
    {condition:"Vi går JUNGLE CARRY med Kindred/Graves",bans:["Poppy","Vi"],why:"Skydda jungle carry från point-and-click/anti-dash och invaderisk."},
    {condition:"Vi går PRESS R med Jinx",bans:["Janna","Milio"],why:"Minska disengage som kan neutralisera första engage."},
    {condition:"Vi går OBJECTIVE CONTROL mot lång range",bans:["Janna","Xerath"],why:"Skydda choke/setup-identiteten från reset/disengage och extrem range."}
  ];
}
async function scoutPlan(plan:AnyRecord){
  const riotIds=Array.isArray(plan?.players)?plan.players.map((x:unknown)=>cleanText(x,120)).filter(Boolean).slice(0,10):[];
  if(!riotIds.length)throw new Error("Inga Riot IDs att scouta.");
  const region=regionFromOpgg(plan?.opggUrl);
  const champs=await championMap();
  const settled=await Promise.allSettled(riotIds.map((id:string)=>scoutPlayer(id,region,champs)));
  const players=settled.filter(x=>x.status==="fulfilled").map((x:any)=>x.value);
  const failed=settled.filter(x=>x.status==="rejected").map((x:any)=>cleanText(x.reason?.message||x.reason,160));
  if(!players.length)throw new Error("OP.GG-scouting misslyckades för samtliga spelare.");
  const built=buildBanPlan(players);
  const now=new Date().toISOString();
  return {
    ...plan,
    ...built,
    conditionalBans:Array.isArray(plan?.conditionalBans)&&plan.conditionalBans.length?plan.conditionalBans:defaultConditionals(),
    scoutingConfidence:players.length>=riotIds.length&&built.banPriority.length>=5?"medium":"preliminary",
    scoutingUpdatedAt:now.slice(0,10),
    scoutingSource:"OP.GG",
    scoutingDetails:{region,players,failed,updatedAt:now}
  };
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!serviceRole)return json({error:"Server configuration missing"},500);
    const db=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
    const url=new URL(req.url);

    if(req.method==="GET"){
      const id=url.searchParams.get("id");
      let query=db.from("team_plans").select("id,opponent,scheduled_at,status,payload,updated_at").eq("team_slug",TEAM_SLUG);
      if(id)query=query.eq("id",id);
      const {data,error}=await query.order("scheduled_at",{ascending:true}).limit(50);
      if(error)return json({error:error.message},500);
      return json({plans:data||[]});
    }

    const teamKey=req.headers.get("x-team-key")?.trim()||"";
    if(!teamKey)return json({error:"Team access code required"},401);
    const {data:allowed,error:verifyError}=await db.rpc("verify_team_key_service",{p_team_slug:TEAM_SLUG,p_team_key:teamKey});
    if(verifyError)return json({error:"Could not verify team access"},500);
    if(!allowed)return json({error:"Invalid team access code"},401);

    if(req.method==="POST"){
      const body=await req.json().catch(()=>null);
      if(body?.verifyOnly===true)return json({ok:true,writeAccess:true});

      if(body?.action==="scout"){
        const id=cleanText(body?.id,160);
        if(!id)return json({error:"Plan id required"},400);
        const {data:row,error:readError}=await db.from("team_plans").select("payload").eq("team_slug",TEAM_SLUG).eq("id",id).maybeSingle();
        if(readError)return json({error:readError.message},500);
        if(!row?.payload)return json({error:"Plan not found"},404);
        try{
          const plan=await scoutPlan(row.payload);
          const {error}=await db.from("team_plans").update({payload:plan,opponent:plan.opponent,scheduled_at:plan.scheduledAt,status:plan.status||"upcoming",updated_at:new Date().toISOString()}).eq("team_slug",TEAM_SLUG).eq("id",id);
          if(error)return json({error:error.message},500);
          return json({ok:true,id,plan,scouted:true});
        }catch(err){return json({error:"Autoscout: "+cleanText((err as Error)?.message||err,220)},502)}
      }

      const incoming=body?.plan;
      if(!incoming||typeof incoming.id!=="string"||typeof incoming.opponent!=="string"||!incoming.scheduledAt)return json({error:"Invalid plan"},400);
      const plan={...incoming,id:cleanText(incoming.id,160),opponent:cleanText(incoming.opponent,80)};
      const status=["upcoming","completed","cancelled"].includes(plan.status)?plan.status:"upcoming";
      if(!plan.id||!plan.opponent)return json({error:"Invalid plan"},400);

      let savedPlan=plan;
      let scoutError="";
      const shouldScout=Array.isArray(plan.players)&&plan.players.length>0&&plan.opggUrl&&(!Array.isArray(plan.banPriority)||plan.banPriority.length===0);
      if(shouldScout){
        try{savedPlan=await scoutPlan(plan)}
        catch(err){scoutError=cleanText((err as Error)?.message||err,220)}
      }
      const row={id:savedPlan.id,team_slug:TEAM_SLUG,opponent:savedPlan.opponent,scheduled_at:savedPlan.scheduledAt,status,payload:savedPlan,updated_at:new Date().toISOString()};
      const {error}=await db.from("team_plans").upsert(row,{onConflict:"id"});
      if(error)return json({error:error.message},500);
      return json({ok:true,id:savedPlan.id,plan:savedPlan,scouted:!scoutError&&shouldScout,scoutError:scoutError||undefined});
    }

    if(req.method==="DELETE"){
      const id=url.searchParams.get("id");
      if(!id)return json({error:"Plan id required"},400);
      const {error}=await db.from("team_plans").delete().eq("team_slug",TEAM_SLUG).eq("id",id);
      if(error)return json({error:error.message},500);
      return json({ok:true});
    }
    return json({error:"Method not allowed"},405);
  }catch(err){console.error(err);return json({error:"Unexpected server error"},500)}
});
