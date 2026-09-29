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
const CM_AUTH_URL="https://publicapi.challengermode.com/mk1/v1/auth/access_keys";
const CM_GRAPHQL_URL="https://publicapi.challengermode.com/graphql";
let cmTokenCache:{value:string;expiresAt:number}|null=null;
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
function cmTournamentId(value:unknown){
  const raw=String(value||"").trim();
  const match=raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0]||"";
}
function nameKey(value:unknown){
  return String(value||"").toLowerCase()
    .replace(/#.*$/,"")
    .replace(/0/g,"o").replace(/1/g,"i")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]/g,"");
}
function nameLooksSame(a:unknown,b:unknown){
  const x=nameKey(a),y=nameKey(b);
  if(!x||!y)return false;
  return x===y||x.includes(y)||y.includes(x);
}
async function cmAccessToken(){
  if(cmTokenCache&&Date.now()<cmTokenCache.expiresAt-120000)return cmTokenCache.value;
  const refreshKey=Deno.env.get("CHALLENGERMODE_REFRESH_KEY")||"";
  if(!refreshKey)throw new Error("CHALLENGERMODE_NOT_CONFIGURED");
  const res=await fetch(CM_AUTH_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({refreshKey})
  });
  if(!res.ok)throw new Error("Challengermode auth HTTP "+res.status);
  const data=await res.json();
  const value=String(data?.value||"");
  const expiresAt=Date.parse(String(data?.expiresAt||""));
  if(!value)throw new Error("Challengermode auth saknar access token");
  cmTokenCache={value,expiresAt:Number.isFinite(expiresAt)?expiresAt:Date.now()+15*60*1000};
  return value;
}
async function cmGraphql(query:string,variables:Record<string,unknown>){
  const token=await cmAccessToken();
  const res=await fetch(CM_GRAPHQL_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({query,variables})
  });
  const body=await res.json().catch(()=>null);
  if(!res.ok)throw new Error("Challengermode GraphQL HTTP "+res.status);
  if(Array.isArray(body?.errors)&&body.errors.length)throw new Error(clean(body.errors[0]?.message||"Challengermode GraphQL error",220));
  return body?.data||{};
}
const CM_TOURNAMENT_QUERY=`query TournamentLive($id: UUID!) {
  tournament(tournamentId: $id) {
    id
    name
    state
    attendance {
      roster {
        lineups(limit: 100) {
          name
          team { id name }
          members {
            captain
            user { userId username }
          }
        }
      }
    }
    matchSeries {
      id
      state
      ordinal
      matches(includeFailed: false) {
        id
        state
        lineups {
          number
          name
          team { id name }
          members {
            user { userId username }
          }
        }
      }
    }
  }
}`;
function cmUsers(lineup:any){
  return (lineup?.members||[]).map((m:any)=>clean(m?.user?.username,80)).filter(Boolean);
}
function cmTargetLineup(tournament:any,teamName:string){
  const lineups=tournament?.attendance?.roster?.lineups||[];
  const wanted=nameKey(teamName);
  return lineups.find((l:any)=>nameKey(l?.team?.name)===wanted||nameKey(l?.name)===wanted)
    ||lineups.find((l:any)=>nameKey(l?.team?.name).includes(wanted)||wanted.includes(nameKey(l?.team?.name)))
    ||lineups.find((l:any)=>nameKey(l?.name).includes(wanted)||wanted.includes(nameKey(l?.name)))
    ||null;
}
function cmMatchTargetLineup(match:any,teamId:string,registered:string[]){
  const lineups=match?.lineups||[];
  if(teamId){
    const byTeam=lineups.find((l:any)=>String(l?.team?.id||"")===teamId);
    if(byTeam)return byTeam;
  }
  let best:any=null,bestScore=-1;
  for(const lineup of lineups){
    const users=cmUsers(lineup);
    const score=users.filter((u:string)=>registered.some(r=>nameLooksSame(r,u))).length;
    if(score>bestScore){bestScore=score;best=lineup}
  }
  return bestScore>0?best:null;
}
async function syncChallengermodePlan(plan:any){
  const tournamentId=cmTournamentId(plan?.challengermodeTournamentId||plan?.challengermodeUrl);
  if(!tournamentId)throw new Error("Saknar giltig Challengermode-turneringslänk eller tournament ID.");
  const data=await cmGraphql(CM_TOURNAMENT_QUERY,{id:tournamentId});
  const tournament=data?.tournament;
  if(!tournament)throw new Error("Challengermode-turneringen hittades inte.");

  const teamName=clean(plan?.challengermodeTeamName||plan?.opponent,100);
  const rosterLineup=cmTargetLineup(tournament,teamName);
  if(!rosterLineup)throw new Error("Kunde inte hitta laget '"+teamName+"' i turneringens roster.");

  const registered=cmUsers(rosterLineup);
  const teamId=String(rosterLineup?.team?.id||"");
  const series=(tournament?.matchSeries||[]).map((ms:any)=>{
    const matches=(ms?.matches||[]).map((m:any)=>{
      const lineup=cmMatchTargetLineup(m,teamId,registered);
      return {
        id:String(m?.id||""),
        state:clean(m?.state,40),
        lineup:lineup?cmUsers(lineup):[]
      };
    });
    return {
      id:String(ms?.id||""),
      ordinal:Number(ms?.ordinal)||0,
      state:clean(ms?.state,40),
      matches
    };
  });

  const allMatches=series.flatMap((x:any)=>x.matches.map((m:any)=>({...m,seriesId:x.id,seriesOrdinal:x.ordinal,seriesState:x.state})));
  const withLineup=allMatches.filter((m:any)=>Array.isArray(m.lineup)&&m.lineup.length);
  const latest=withLineup[withLineup.length-1]||null;
  const active=latest?.lineup?.slice(0,10)||[];
  const substitutes=registered.filter((u:string)=>!active.some((a:string)=>nameLooksSame(a,u)));
  const previousActive=plan?.challengermode?.activeRoster||plan?.competitiveEvidence?.currentRoster?.map((x:any)=>x?.player||x)||[];
  const rosterChanged=!!active.length&&!!previousActive.length&&(
    active.length!==previousActive.length||
    active.some((u:string)=>!previousActive.some((p:string)=>nameLooksSame(p,u)))
  );

  const evidenceGames=Array.isArray(plan?.competitiveEvidence?.games)?plan.competitiveEvidence.games:[];
  const competitiveEvidence={
    ...(plan?.competitiveEvidence||{}),
    source:"Challengermode / Rivals League",
    tournamentId,
    rosterChanged:rosterChanged||!!plan?.competitiveEvidence?.rosterChanged,
    observedAt:new Date().toISOString(),
    currentRoster:(active.length?active:registered).map((player:string)=>({player})),
    substitutes,
    games:evidenceGames
  };

  return {
    ...plan,
    challengermodeUrl:plan?.challengermodeUrl||"",
    challengermodeTournamentId:tournamentId,
    challengermodeTeamName:teamName,
    challengermode:{
      configured:true,
      tournamentId,
      tournamentName:clean(tournament?.name,120),
      tournamentState:clean(tournament?.state,40),
      teamId,
      teamName:clean(rosterLineup?.team?.name||rosterLineup?.name||teamName,100),
      registeredRoster:registered,
      activeRoster:active,
      substitutes,
      rosterChanged,
      latestMatchId:latest?.id||"",
      latestMatchState:latest?.state||"",
      series:series.slice(-12),
      lastSyncedAt:new Date().toISOString()
    },
    competitiveEvidence
  };
}

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
  if(candidate.competitivePicks)bits.push(candidate.competitivePicks+" tävlingspick"+(candidate.competitivePicks===1?"":"s"));
  if(candidate.competitiveBans)bits.push(candidate.competitiveBans+" respect-ban"+(candidate.competitiveBans===1?"":"s"));
  if(candidate.competitiveRole)bits.push(candidate.competitiveRole.toLowerCase());
  if(candidate.competitivePlayer)bits.push(candidate.competitivePlayer);
  if(candidate.seasonGames)bits.push(candidate.seasonGames+" ranked / "+candidate.seasonWinrate+"% WR");
  if(candidate.recentGames)bits.push(candidate.recentGames+"/20 senaste / "+candidate.recentWinrate+"% WR");
  if(candidate.role&&!candidate.competitiveRole)bits.push(candidate.role.toLowerCase());
  const prefix=candidate.competitivePicks||candidate.competitiveBans?"RIVALS väger högst":"OP.GG";
  return prefix+": "+candidate.champ+" · "+(bits.length?bits.join(" · "):"observerad comfort");
}
function competitiveSignals(evidence:any){
  const map=new Map<string,any>();
  const games=Array.isArray(evidence?.games)?evidence.games:[];
  const now=Date.now();
  const rowFor=(champ:string)=>{
    const key=clean(champ,60);
    if(!key)return null;
    const row=map.get(key)||{champ:key,score:0,competitivePicks:0,competitiveBans:0,competitiveRole:"",competitivePlayer:""};
    map.set(key,row);
    return row;
  };
  for(const game of games){
    const stamp=Date.parse(String(game?.playedAt||game?.observedAt||""));
    const ageDays=Number.isFinite(stamp)?Math.max(0,(now-stamp)/86400000):30;
    const recency=ageDays<=21?1.25:ageDays<=60?1:0.75;
    for(const pick of (Array.isArray(game?.picks)?game.picks:[])){
      const champ=typeof pick==="string"?pick:pick?.champ;
      const row=rowFor(champ);
      if(!row)continue;
      row.competitivePicks++;
      row.score+=58*recency;
      if(typeof pick==="object"){
        row.competitiveRole=row.competitiveRole||clean(pick?.role,24).toUpperCase();
        row.competitivePlayer=row.competitivePlayer||clean(pick?.player,80);
      }
    }
    for(const ban of (Array.isArray(game?.bansAgainst)?game.bansAgainst:[])){
      const champ=typeof ban==="string"?ban:ban?.champ;
      const row=rowFor(champ);
      if(!row)continue;
      row.competitiveBans++;
      row.score+=82*recency;
    }
  }
  return map;
}
function buildBanList(players:ScoutPlayer[],evidence:any){
  const byChamp=new Map<string,any>();
  const comp=competitiveSignals(evidence);
  const rosterChanged=!!evidence?.rosterChanged||Array.isArray(evidence?.currentRoster)&&evidence.currentRoster.length>=5;
  const soloScale=rosterChanged?0.32:1;

  for(const player of players){
    for(let i=0;i<player.topChampions.length;i++){
      const c=player.topChampions[i];
      const score=(c.score+(8-i)*3)*soloScale;
      const entry={...c,riotId:player.riotId,rank:i+1,score};
      const prev=byChamp.get(c.champ);
      if(!prev||entry.score>prev.score)byChamp.set(c.champ,entry);
    }
  }

  for(const [champ,signal] of comp){
    const prev=byChamp.get(champ)||{champ,score:0};
    byChamp.set(champ,{
      ...prev,
      ...signal,
      score:(prev.score||0)+signal.score
    });
  }

  return [...byChamp.values()].sort((a,b)=>b.score-a.score).slice(0,5).map((c,i)=>({
    champ:c.champ,
    type:i<3?"target":"watch",
    priority:i+1,
    source:c.competitivePicks||c.competitiveBans?"competitive":"opgg",
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
  const activeRoster=(plan?.competitiveEvidence?.currentRoster||[]).map((x:any)=>clean(x?.player||x,80)).filter(Boolean);
  const evidenceGames=Array.isArray(plan?.competitiveEvidence?.games)?plan.competitiveEvidence.games:[];
  const hasCompetitive=activeRoster.length>0||evidenceGames.length>0;
  if(!inputPlayers.length&&!hasCompetitive)throw new Error("Ingen OP.GG- eller Challengermode-data att scouta.");

  const region=regionFromOpgg(plan?.opggUrl);
  const names=inputPlayers.length?await championMap():new Map<number,string>();
  const scouted=inputPlayers.length?await Promise.all(inputPlayers.map((riotId:string)=>scoutPlayer(riotId,region,names))):[];
  const allSuccessful=scouted.filter(x=>x.found&&x.topChampions.length);
  const rosterChanged=!!plan?.competitiveEvidence?.rosterChanged;
  const matchedActive=activeRoster.length
    ?allSuccessful.filter(p=>activeRoster.some((name:string)=>nameLooksSame(name,p.riotId)))
    :allSuccessful;
  const successful=rosterChanged&&activeRoster.length?matchedActive:allSuccessful;
  const generated=buildBanList(successful,plan?.competitiveEvidence);
  const updatedDate=new Date().toISOString().slice(0,10);
  const totalEvidence=successful.reduce((n,p)=>n+p.topChampions.reduce((sum,c)=>sum+c.seasonGames+c.recentGames,0),0);
  const confidence=successful.length>=4&&generated.length>=5&&totalEvidence>=60?"high":successful.length>=3&&generated.length>=3?"medium":"preliminary";

  const next={
    ...plan,
    players:inputPlayers,
    scoutingSource:hasCompetitive?"RIVALS + OP.GG":"OP.GG",
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
    scoutingError:generated.length?"":(
      rosterChanged&&activeRoster.length
        ?"Challengermode visar en ny lineup. Gamla OP.GG-profiler används inte som primär ban-data förrän den nya rostern är mappad/scoutad."
        :"OP.GG svarade, men ingen användbar championdata hittades. Tryck Scouta om senare."
    )
  };

  if(generated.length){
    next.banPriority=generated;
    next.phase1Plan={
      ...(plan.phase1Plan||{}),
      b1:generated[0]?.champ||"",
      b2:generated[1]?.champ||"",
      b3:generated[2]?.champ||"",
      note:hasCompetitive
        ?"Game 1-plan väger Challengermode/RIVALS tydligt högre än soloqueue. Ny tävlingsroster prioriteras framför äldre OP.GG-profiler."
        :"Automatisk Game 1-plan från OP.GG: ranked-volym, winrate och de senaste ranked-matcherna. Verifiera roller i lobby och justera vid behov."
    };
    if(!Array.isArray(plan?.conditionalBans)||!plan.conditionalBans.length)next.conditionalBans=defaultConditionals();
  }else if(rosterChanged&&activeRoster.length){
    next.banPriority=[];
    next.phase1Plan={
      ...(plan.phase1Plan||{}),
      b1:"",
      b2:"",
      b3:"",
      note:"Challengermode har upptäckt en ny aktiv lineup. Tidigare OP.GG-bans är pausade tills den nya rostern har tillräcklig data."
    };
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

      let cmSyncError="";
      if(body?.syncChallengermode===true){
        try{plan=await syncChallengermodePlan(plan)}
        catch(err){cmSyncError=clean(err instanceof Error?err.message:err,220)}
      }

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
      return json({
        ok:true,
        id:row.id,
        plan,
        scouted:body?.scout===true,
        challengermodeSynced:body?.syncChallengermode===true&&!cmSyncError,
        challengermodeError:cmSyncError||undefined,
        challengermodeConfigured:!!Deno.env.get("CHALLENGERMODE_REFRESH_KEY")
      });
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
