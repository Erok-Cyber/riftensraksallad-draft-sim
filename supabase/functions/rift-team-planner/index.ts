import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, x-team-key",
  "Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age":"86400"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
const TEAM_SLUG="riftensraksallad";
const SUMMONER_API="https://lol-api-summoner.op.gg/api";
const CHAMPION_API="https://lol-api-champion.op.gg/api";
const OPGG_HEADERS={
  "Accept":"application/json,text/plain,*/*",
  "Accept-Language":"en-US,en;q=0.9",
  "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36"
};

type AnyRow=Record<string,any>;
type ChampStat={
  championId:number;
  champ:string;
  seasonGames:number;
  seasonWins:number;
  seasonWinrate:number;
  recentGames:number;
  recentWins:number;
  recentWinrate:number;
  role:string;
  score:number;
};
type ScoutPlayer={
  riotId:string;
  found:boolean;
  tier:string;
  topChampions:ChampStat[];
  error?:string;
};

function clean(value:unknown,max=220){
  return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
}
function same(a:unknown,b:unknown){return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase()}
function splitRiotId(value:string){
  const raw=String(value||"").trim();
  const idx=raw.lastIndexOf("#");
  if(idx<=0||idx>=raw.length-1)return null;
  return {gameName:raw.slice(0,idx).trim(),tagLine:raw.slice(idx+1).trim()};
}
function regionFromOpgg(urlValue:unknown){
  try{
    const u=new URL(String(urlValue||""));
    const parts=u.pathname.split("/").filter(Boolean);
    const i=parts.findIndex(x=>x.toLowerCase()==="multisearch");
    const raw=String(i>=0?parts[i+1]:"EUW").toUpperCase();
    return ["EUW","EUNE","NA","KR","JP","BR","LAN","LAS","OCE","RU","TR"].includes(raw)?raw:"EUW";
  }catch{return "EUW"}
}
function parsePlayersFromOpgg(urlValue:unknown){
  try{
    const u=new URL(String(urlValue||""));
    const host=u.hostname.toLowerCase();
    if(host!=="op.gg"&&!host.endsWith(".op.gg"))return [];
    const raw=u.searchParams.get("summoners")||"";
    return raw.split(",").map(x=>decodeURIComponent(x).trim()).filter(Boolean).slice(0,10);
  }catch{return []}
}
function pct(wins:number,games:number){return games>0?Math.round(wins/games*100):0}

async function fetchJson(url:string){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try{
    const res=await fetch(url,{headers:OPGG_HEADERS,signal:controller.signal});
    const text=await res.text();
    if(!res.ok)throw new Error("OP.GG HTTP "+res.status);
    try{return JSON.parse(text)}catch{throw new Error("OP.GG returned invalid JSON")}
  }finally{clearTimeout(timer)}
}
async function championMap(){
  try{
    const payload=await fetchJson(CHAMPION_API+"/meta/champions?hl=en_US");
    const rows=Array.isArray(payload?.data)?payload.data:[];
    const map=new Map<number,string>();
    for(const row of rows){
      const id=Number(row?.id);
      const name=clean(row?.name,60);
      if(Number.isFinite(id)&&name)map.set(id,name);
    }
    if(map.size)return map;
  }catch{}

  try{
    const versions=await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
    const version=Array.isArray(versions)?versions[0]:null;
    if(!version)return new Map<number,string>();
    const dd=await (await fetch("https://ddragon.leagueoflegends.com/cdn/"+version+"/data/en_US/champion.json")).json();
    return new Map<number,string>(Object.values(dd?.data||{}).map((x:any)=>[Number(x.key),String(x.name)]));
  }catch{return new Map<number,string>()}
}
async function findSummoner(riotId:string,region:string){
  const parsed=splitRiotId(riotId);
  if(!parsed)throw new Error("Ogiltigt Riot ID: "+riotId);
  const url=SUMMONER_API+"/v3/"+region+"/summoners?riot_id="+encodeURIComponent(riotId)+"&hl=en_US";
  const payload=await fetchJson(url);
  const rows=Array.isArray(payload?.data)?payload.data:[];
  const exact=rows.find((x:AnyRow)=>same(x?.game_name,parsed.gameName)&&same(x?.tagline,parsed.tagLine))||rows[0];
  if(!exact?.summoner_id)throw new Error("Spelaren hittades inte: "+riotId);
  return exact;
}
async function scoutPlayer(riotId:string,region:string,names:Map<number,string>):Promise<ScoutPlayer>{
  try{
    const found=await findSummoner(riotId,region);
    const sid=encodeURIComponent(String(found.summoner_id));
    const [summaryResult,gamesResult]=await Promise.allSettled([
      fetchJson(SUMMONER_API+"/"+region+"/summoners/"+sid+"/summary?hl=en_US"),
      fetchJson(SUMMONER_API+"/"+region+"/summoners/"+sid+"/games?limit=20&game_type=ranked&hl=en_US&ended_at=")
    ]);

    const summaryRaw=summaryResult.status==="fulfilled"?summaryResult.value:null;
    const gamesRaw=gamesResult.status==="fulfilled"?gamesResult.value:null;
    const summoner=summaryRaw?.data?.summoner||summaryRaw?.data||{};
    const seasonRows=Array.isArray(summoner?.most_champions?.champion_stats)?summoner.most_champions.champion_stats:[];
    const games=Array.isArray(gamesRaw?.data)?gamesRaw.data:[];

    const recent=new Map<number,{games:number,wins:number,positions:Map<string,number>}>();
    for(const game of games){
      const mine=game?.my_data||game?.myData||{};
      const id=Number(mine?.champion_id);
      if(!Number.isFinite(id))continue;
      const row=recent.get(id)||{games:0,wins:0,positions:new Map<string,number>()};
      row.games++;
      const result=String(mine?.stats?.result||"").toUpperCase();
      if(result==="WIN"||mine?.stats?.result===true)row.wins++;
      const pos=clean(mine?.position||mine?.role||"",20).toUpperCase();
      if(pos)row.positions.set(pos,(row.positions.get(pos)||0)+1);
      recent.set(id,row);
    }

    const ids=new Set<number>();
    for(const row of seasonRows){
      const id=Number(row?.id??row?.champion_id);
      if(Number.isFinite(id))ids.add(id);
    }
    for(const id of recent.keys())ids.add(id);

    const topChampions=[...ids].map(id=>{
      const season=seasonRows.find((x:AnyRow)=>Number(x?.id??x?.champion_id)===id)||{};
      const recentRow=recent.get(id)||{games:0,wins:0,positions:new Map<string,number>()};
      const seasonGames=Number(season?.play)||0;
      const seasonWins=Number(season?.win)||0;
      const seasonWinrate=pct(seasonWins,seasonGames);
      const recentWinrate=pct(recentRow.wins,recentRow.games);
      const role=[...recentRow.positions.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
      const score=
        Math.min(seasonGames,100)*0.72+
        Math.max(0,seasonWinrate-50)*1.25+
        Math.min(recentRow.games,10)*4.5+
        Math.max(0,recentWinrate-50)*0.7;
      return {
        championId:id,
        champ:names.get(id)||("Champion "+id),
        seasonGames,
        seasonWins,
        seasonWinrate,
        recentGames:recentRow.games,
        recentWins:recentRow.wins,
        recentWinrate,
        role,
        score:Math.round(score*10)/10
      };
    }).filter(x=>!x.champ.startsWith("Champion ")).sort((a,b)=>b.score-a.score).slice(0,8);

    const tier=clean(found?.solo_tier_info?.tier||summoner?.league_stats?.[0]?.tier_info?.tier||"",30);
    return {riotId,found:true,tier,topChampions};
  }catch(err){
    return {riotId,found:false,tier:"",topChampions:[],error:err instanceof Error?err.message:"Scouting misslyckades"};
  }
}
function explain(candidate:any){
  const bits=[];
  if(candidate.seasonGames)bits.push(candidate.seasonGames+" ranked / "+candidate.seasonWinrate+"% WR");
  if(candidate.recentGames)bits.push(candidate.recentGames+"/20 senaste / "+candidate.recentWinrate+"% WR");
  if(candidate.role)bits.push(candidate.role.toLowerCase());
  return candidate.riotId+": "+candidate.champ+" · "+(bits.length?bits.join(" · "):"comfort pick i OP.GG-data");
}
function buildBanList(players:ScoutPlayer[]){
  const byChamp=new Map<string,any>();
  for(const player of players){
    for(let i=0;i<player.topChampions.length;i++){
      const c=player.topChampions[i];
      const entry={...c,riotId:player.riotId,rank:i+1,score:c.score+(8-i)*3};
      const prev=byChamp.get(c.champ);
      if(!prev||entry.score>prev.score)byChamp.set(c.champ,entry);
    }
  }
  return [...byChamp.values()].sort((a,b)=>b.score-a.score).slice(0,5).map((c,i)=>({
    champ:c.champ,
    type:i<3?"target":"watch",
    priority:i+1,
    why:explain(c)
  }));
}
function defaultConditionals(){
  return [
    {condition:"Vi går JUNGLE CARRY med Kindred/Graves",bans:["Poppy","Vi"],why:"Skydda jungle carry från point-and-click/anti-dash och invaderisk."},
    {condition:"Vi går PRESS R med Jinx",bans:["Janna","Milio"],why:"Minska disengage som kan neutralisera första engage."},
    {condition:"Vi går OBJECTIVE CONTROL mot lång range",bans:["Janna","Xerath"],why:"Skydda choke/setup-identiteten från reset/disengage och extrem range."}
  ];
}
async function scoutPlan(plan:any){
  const inputPlayers=Array.isArray(plan?.players)&&plan.players.length
    ?plan.players.map((x:unknown)=>clean(x,120)).filter(Boolean).slice(0,10)
    :parsePlayersFromOpgg(plan?.opggUrl);
  if(!inputPlayers.length)throw new Error("Inga Riot IDs hittades i OP.GG-länken.");

  const region=regionFromOpgg(plan?.opggUrl);
  const names=await championMap();
  const scouted=await Promise.all(inputPlayers.map((riotId:string)=>scoutPlayer(riotId,region,names)));
  const successful=scouted.filter(x=>x.found&&x.topChampions.length);
  const generated=buildBanList(successful);
  const updatedDate=new Date().toISOString().slice(0,10);
  const totalEvidence=successful.reduce((n,p)=>n+p.topChampions.reduce((sum,c)=>sum+c.seasonGames+c.recentGames,0),0);
  const confidence=successful.length>=4&&generated.length>=5&&totalEvidence>=60?"high":successful.length>=3&&generated.length>=3?"medium":"preliminary";

  const next={
    ...plan,
    players:inputPlayers,
    scoutingSource:"OP.GG",
    scoutingStatus:generated.length?"ok":"unavailable",
    scoutingConfidence:confidence,
    scoutingUpdatedAt:updatedDate,
    scoutingPlayers:scouted,
    scoutingSummary:{
      region,
      playersFound:successful.length,
      playersTotal:inputPlayers.length,
      generatedBans:generated.length
    },
    scoutingError:generated.length?"":"OP.GG svarade, men ingen användbar championdata hittades. Tryck Scouta om senare."
  };

  if(generated.length){
    next.banPriority=generated;
    next.phase1Plan={
      ...(plan.phase1Plan||{}),
      b1:generated[0]?.champ||"",
      b2:generated[1]?.champ||"",
      b3:generated[2]?.champ||"",
      note:"Automatisk Game 1-plan från OP.GG: ranked-volym, winrate och de senaste ranked-matcherna. Verifiera roller i lobby och justera vid behov."
    };
    if(!Array.isArray(plan?.conditionalBans)||!plan.conditionalBans.length)next.conditionalBans=defaultConditionals();
  }
  return next;
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
      let plan=body?.plan;
      if(!plan||typeof plan.id!=="string"||typeof plan.opponent!=="string"||!plan.scheduledAt)return json({error:"Invalid plan"},400);

      if(body?.scout===true){
        try{plan=await scoutPlan(plan)}
        catch(err){
          plan={
            ...plan,
            scoutingSource:"OP.GG",
            scoutingStatus:"unavailable",
            scoutingConfidence:"preliminary",
            scoutingUpdatedAt:new Date().toISOString().slice(0,10),
            scoutingError:clean(err instanceof Error?err.message:err,220)
          };
        }
      }

      const status=["upcoming","completed","cancelled"].includes(plan.status)?plan.status:"upcoming";
      const row={
        id:clean(plan.id,160),
        team_slug:TEAM_SLUG,
        opponent:clean(plan.opponent,80),
        scheduled_at:plan.scheduledAt,
        status,
        payload:plan,
        updated_at:new Date().toISOString()
      };
      if(!row.id||!row.opponent)return json({error:"Invalid plan"},400);
      const {error}=await db.from("team_plans").upsert(row,{onConflict:"id"});
      if(error)return json({error:error.message},500);
      return json({ok:true,id:row.id,plan,scouted:body?.scout===true});
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
