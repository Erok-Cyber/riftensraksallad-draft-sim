import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, x-team-key",
  "Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age":"86400"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
const OPGG="https://lol-web-api.op.gg/api/v1.0/internal/bypass";
const OPGG_HEADERS={
  "Accept":"application/json,text/plain,*/*",
  "Accept-Language":"en-US,en;q=0.9",
  "User-Agent":"Mozilla/5.0 (compatible; RiftensraksalladDraftBrain/1.0)"
};

type ChampRow={id:number,name:string};
type PlayerChamp={championId:number,champ:string,play:number,win:number,lose:number,winrate:number,rank:number};
type ScoutPlayer={riotId:string,found:boolean,totalGames:number,topChampions:PlayerChamp[],error?:string};

function splitRiotId(value:string){
  const raw=String(value||"").trim();
  const idx=raw.lastIndexOf("#");
  if(idx<=0||idx>=raw.length-1)return null;
  return {gameName:raw.slice(0,idx).trim(),tagLine:raw.slice(idx+1).trim()};
}
function parsePlayersFromOpgg(urlValue:string){
  try{
    const u=new URL(String(urlValue||""));
    if(!u.hostname.toLowerCase().endsWith("op.gg"))return [];
    const raw=u.searchParams.get("summoners")||"";
    return raw.split(",").map(x=>decodeURIComponent(x).trim()).filter(Boolean).slice(0,10);
  }catch{return []}
}
async function opggJson(url:string){
  const res=await fetch(url,{headers:OPGG_HEADERS});
  const text=await res.text();
  if(!res.ok)throw new Error("OP.GG HTTP "+res.status);
  try{return JSON.parse(text)}catch{throw new Error("OP.GG returned invalid JSON")}
}
async function championMap(){
  try{
    const payload=await opggJson(OPGG+"/meta/champions?hl=en_US");
    const list=Array.isArray(payload?.data)?payload.data:[];
    return new Map<number,string>(list.map((x:ChampRow)=>[Number(x.id),String(x.name||x.key||x.id)]));
  }catch{
    try{
      const versions=await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
      const v=Array.isArray(versions)?versions[0]:null;
      if(!v)return new Map<number,string>();
      const dd=await (await fetch("https://ddragon.leagueoflegends.com/cdn/"+v+"/data/en_US/champion.json")).json();
      return new Map<number,string>(Object.values(dd?.data||{}).map((x:any)=>[Number(x.key),String(x.name)]));
    }catch{return new Map<number,string>()}
  }
}
async function findSummoner(riotId:string){
  const parsed=splitRiotId(riotId);
  if(!parsed)throw new Error("Invalid Riot ID");
  const url=new URL(OPGG+"/summoners/v2/euw/autocomplete");
  url.searchParams.set("gameName",parsed.gameName);
  url.searchParams.set("tagline",parsed.tagLine);
  const payload=await opggJson(url.toString());
  const rows=Array.isArray(payload?.data)?payload.data:[];
  const exact=rows.find((x:any)=>
    String(x.game_name||"").toLowerCase()===parsed.gameName.toLowerCase()&&
    String(x.tagline||"").toLowerCase()===parsed.tagLine.toLowerCase()
  )||rows[0];
  if(!exact?.summoner_id)throw new Error("Summoner not found");
  return exact;
}
function normalizeChampionStats(rows:any[],names:Map<number,string>){
  return rows.map((x:any)=>({
    championId:Number(x.id??x.champion_id),
    champ:names.get(Number(x.id??x.champion_id))||String(x.name||("Champion "+(x.id??x.champion_id))),
    play:Number(x.play)||0,
    win:Number(x.win)||0,
    lose:Number(x.lose)||0
  }))
  .filter((x:any)=>Number.isFinite(x.championId)&&x.play>0)
  .sort((a:any,b:any)=>b.play-a.play)
  .slice(0,7)
  .map((x:any,i:number)=>({...x,winrate:x.play?Math.round(x.win/x.play*100):0,rank:i+1}));
}
async function recentGameStats(summonerId:string,names:Map<number,string>){
  const url=new URL(OPGG+"/games/euw/summoners/"+encodeURIComponent(summonerId));
  url.searchParams.set("limit","20");
  url.searchParams.set("game_type","ranked");
  url.searchParams.set("hl","en_US");
  const payload=await opggJson(url.toString());
  const games=Array.isArray(payload?.data)?payload.data:[];
  const by=new Map<number,{play:number,win:number,lose:number}>();
  for(const g of games){
    const me=g?.myData||g?.my_data;
    const id=Number(me?.champion_id);
    if(!Number.isFinite(id))continue;
    const row=by.get(id)||{play:0,win:0,lose:0};
    row.play++;
    const result=String(me?.stats?.result||"").toUpperCase();
    if(result==="WIN")row.win++;else if(result==="LOSE"||result==="LOSS")row.lose++;
    by.set(id,row);
  }
  return [...by.entries()].map(([id,x])=>({id,...x})).sort((a,b)=>b.play-a.play).slice(0,7);
}
async function scoutPlayer(riotId:string,names:Map<number,string>):Promise<ScoutPlayer>{
  try{
    const summoner=await findSummoner(riotId);
    const sid=String(summoner.summoner_id);
    let rows:any[]=[];
    try{
      const summary=await opggJson(OPGG+"/summoners/euw/"+encodeURIComponent(sid)+"/summary");
      const s=summary?.data?.summoner||summary?.data||{};
      rows=s?.most_champions?.champion_stats||s?.mostChampions?.champion_stats||[];
    }catch{}
    if(!Array.isArray(rows)||!rows.length){
      try{rows=await recentGameStats(sid,names)}catch{}
    }
    const topChampions=normalizeChampionStats(rows||[],names);
    const totalGames=topChampions.reduce((n,x)=>n+x.play,0);
    return {riotId,found:true,totalGames,topChampions};
  }catch(err){
    return {riotId,found:false,totalGames:0,topChampions:[],error:err instanceof Error?err.message:"Scout failed"};
  }
}
function buildBanList(players:ScoutPlayer[]){
  const aggregate=new Map<string,{champ:string,score:number,sources:{riotId:string,play:number,winrate:number,rank:number}[]}>();
  const rankBase=[0,54,36,25,16,10,6,4];
  for(const p of players){
    for(const c of p.topChampions.slice(0,5)){
      const sourceScore=(rankBase[c.rank]||4)+Math.min(c.play,35)*1.8+Math.max(0,c.winrate-50)*.7+(c.play>=20?16:c.play>=10?9:c.play>=5?4:0);
      const row=aggregate.get(c.champ)||{champ:c.champ,score:0,sources:[]};
      row.score+=sourceScore;
      row.sources.push({riotId:p.riotId,play:c.play,winrate:c.winrate,rank:c.rank});
      aggregate.set(c.champ,row);
    }
  }
  return [...aggregate.values()]
    .map(row=>{
      if(row.sources.length>1)row.score+=(row.sources.length-1)*16;
      row.sources.sort((a,b)=>a.rank-b.rank||b.play-a.play);
      return row;
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,5)
    .map((row,i)=>{
      const main=row.sources[0];
      const extra=row.sources.length>1?" · även spelad av "+(row.sources.length-1)+" annan"+(row.sources.length>2?"a":"")+" spelare":"";
      const comfort=main.rank===1?"#1 comfort":main.rank===2?"#2 comfort":"top "+main.rank;
      return {
        champ:row.champ,
        type:(i<3&&(main.rank<=2||main.play>=8))?"target":"watch",
        priority:i+1,
        why:main.riotId+": "+main.play+" matcher · "+main.winrate+"% WR · "+comfort+extra,
        score:Math.round(row.score)
      };
    });
}
async function scoutPlan(plan:any){
  const inputPlayers=Array.isArray(plan?.players)&&plan.players.length?plan.players:parsePlayersFromOpgg(plan?.opggUrl||"");
  if(!inputPlayers.length)throw new Error("No Riot IDs found in OP.GG multisearch");
  const names=await championMap();
  const scouted=await Promise.all(inputPlayers.slice(0,10).map((p:string)=>scoutPlayer(String(p),names)));
  const successful=scouted.filter(x=>x.found&&x.topChampions.length);
  const generated=buildBanList(successful);
  const totalGames=successful.reduce((n,p)=>n+p.totalGames,0);
  const confidence=successful.length>=4&&totalGames>=60?"high":successful.length>=3&&totalGames>=25?"medium":"preliminary";
  const updatedAt=new Date().toISOString();
  const next={...plan,
    players:inputPlayers,
    scoutingSource:"OP.GG",
    scoutingStatus:generated.length?"ok":"unavailable",
    scoutingConfidence:confidence,
    scoutingUpdatedAt:updatedAt,
    scoutingPlayers:scouted,
    scoutingSummary:{
      playersFound:successful.length,
      playersTotal:inputPlayers.length,
      sampledChampionGames:totalGames,
      generatedBans:generated.length
    }
  };
  if(generated.length){
    next.banPriority=generated;
    next.phase1Plan={
      ...(plan.phase1Plan||{}),
      b1:generated[0]?.champ||"",
      b2:generated[1]?.champ||"",
      b3:generated[2]?.champ||"",
      note:"Auto-scout OP.GG · target bans baserat på deras nuvarande ranked comfort. Anpassa efter Game 1."
    };
  }else{
    next.scoutingError="OP.GG svarade, men ingen användbar championdata hittades. Befintlig banplan behölls.";
  }
  return next;
}

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
      let plan=body?.plan;
      if(!plan||typeof plan.id!=="string"||typeof plan.opponent!=="string"||!plan.scheduledAt)return json({error:"Invalid plan"},400);

      if(body?.scout===true){
        try{plan=await scoutPlan(plan)}
        catch(err){
          plan={...plan,
            scoutingSource:"OP.GG",
            scoutingStatus:"unavailable",
            scoutingConfidence:"preliminary",
            scoutingUpdatedAt:new Date().toISOString(),
            scoutingError:err instanceof Error?err.message:"OP.GG scouting failed"
          };
        }
      }

      const status=["upcoming","completed","cancelled"].includes(plan.status)?plan.status:"upcoming";
      const row={id:plan.id,team_slug:teamSlug,opponent:plan.opponent.trim(),scheduled_at:plan.scheduledAt,status,payload:plan,updated_at:new Date().toISOString()};
      const {error}=await db.from("team_plans").upsert(row,{onConflict:"id"});
      if(error)return json({error:error.message},500);
      return json({ok:true,id:plan.id,plan,scouted:body?.scout===true});
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
