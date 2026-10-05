import { createClient } from "npm:@supabase/supabase-js@2.95.0";

import { mergeReview, preserveEvidence } from "./plan-policy.mjs";
import { seriesHistory } from "./rivals-history.mjs";

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
function cmLinkKind(value:unknown){
  const raw=String(value||"").trim().toLowerCase();
  if(!raw)return "";
  if(raw.includes("/tournaments/"))return "tournament";
  if(raw.includes("/teams/"))return "team";
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw))return "uuid";
  return "unknown";
}
function cmTournamentId(value:unknown){
  const raw=String(value||"").trim();
  const kind=cmLinkKind(raw);
  if(kind!=="tournament"&&kind!=="uuid")return "";
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
  const call=async(token?:string)=>{
    const headers:Record<string,string>={"Content-Type":"application/json"};
    if(token)headers.Authorization="Bearer "+token;
    const res=await fetch(CM_GRAPHQL_URL,{
      method:"POST",
      headers,
      body:JSON.stringify({query,variables})
    });
    const body=await res.json().catch(()=>null);
    return {res,body};
  };

  let first=await call();
  const publicDenied=first.res.status===401||first.res.status===403||
    (Array.isArray(first.body?.errors)&&first.body.errors.some((e:any)=>
      /auth|unauthor|forbidden|access/i.test(String(e?.message||""))
    ));
  if(publicDenied){
    const token=await cmAccessToken();
    first=await call(token);
  }

  if(!first.res.ok)throw new Error("Challengermode GraphQL HTTP "+first.res.status);
  if(Array.isArray(first.body?.errors)&&first.body.errors.length)throw new Error(clean(first.body.errors[0]?.message||"Challengermode GraphQL error",220));
  return first.body?.data||{};
}
const CM_SERIES_FIELDS=`
  id
  title
  bestOf
  state
  startedAt
  results {
    final
    draw
    lineupResults { lineupNumber placement score }
  }
  lineups {
    name
    seed
    members { user { id username } }
  }
  matches(includeFailed: true) {
    id
    state
    results { lineupResults { lineupNumber score } }
    lineups {
      number
      members { user { id username } }
    }
  }
`;

const CM_TOURNAMENT_QUERY=`query TournamentLive($id: UUID!) {
  tournament(tournamentId: $id) {
    id
    name
    state
    attendance {
      roster {
        lineups(limit: 100) {
          members { user { id username } }
        }
      }
    }
    stages {
      index
      format
      ... on TournamentEliminationStage {
        brackets {
          rounds {
            roundNumber
            title
            matchSeriesPage(first: 100) {
              nodes { ${CM_SERIES_FIELDS} }
            }
          }
        }
      }
      ... on TournamentGroupStage {
        groups {
          title
          matchSeriesPage(first: 100) {
            nodes { ${CM_SERIES_FIELDS} }
          }
        }
      }
      ... on TournamentSwissStage {
        rounds {
          roundNumber
          title
          matchSeriesPage(first: 100) {
            nodes { ${CM_SERIES_FIELDS} }
          }
        }
      }
    }
  }
}`;

function cmTournamentSeries(tournament:any){
  const out:any[]=[];
  const pushNodes=(nodes:any[],context:any={})=>{
    for(const node of nodes||[])out.push({...node,...context});
  };
  for(const stage of tournament?.stages||[]){
    for(const [bracketIndex,bracket] of (stage?.brackets||[]).entries()){
      for(const round of bracket?.rounds||[]){
        pushNodes(round?.matchSeriesPage?.nodes||[],{
          stageIndex:stage?.index??null,
          stageFormat:stage?.format||"",
          bracketIndex,
          roundNumber:round?.roundNumber??null,
          roundTitle:round?.title||""
        });
      }
    }
    for(const group of stage?.groups||[]){
      pushNodes(group?.matchSeriesPage?.nodes||[],{
        stageIndex:stage?.index??null,
        stageFormat:stage?.format||"",
        groupTitle:group?.title||""
      });
    }
    if(!stage?.brackets&&!stage?.groups){
      for(const round of stage?.rounds||[]){
        pushNodes(round?.matchSeriesPage?.nodes||[],{
          stageIndex:stage?.index??null,
          stageFormat:stage?.format||"",
          roundNumber:round?.roundNumber??null,
          roundTitle:round?.title||""
        });
      }
    }
  }
  return out;
}
function cmMembers(lineup:any){
  return (lineup?.members||[]).map((m:any)=>({
    userId:clean(m?.user?.id||m?.user?.userId,80),
    username:clean(m?.user?.username,80)
  })).filter((m:any)=>m.userId||m.username);
}
function cmUsers(lineup:any){
  return cmMembers(lineup).map((m:any)=>m.username).filter(Boolean);
}
async function cmLolAccount(userId:string){
  if(!userId)return null;
  const data=await cmGraphql(`query CmLolAccount($id: UUID!) {
    user(userId: $id) {
      username
      gameAccounts(first: 10) {
        nodes {
          displayName
          gameTitle { slug }
        }
      }
    }
  }`,{id:userId});
  const user=data?.user;
  const nodes=Array.isArray(user?.gameAccounts?.nodes)?user.gameAccounts.nodes:[];
  const scored=nodes.map((n:any)=>{
    const displayName=clean(n?.displayName,120);
    const title=clean(n?.gameTitle?.slug,80).toLowerCase();
    let score=0;
    if(displayName.includes("#"))score+=10;
    if(title.includes("league"))score+=8;
    if(title.includes("legend"))score+=4;
    if(title.includes("lol"))score+=4;
    return {displayName,title,score};
  }).filter((x:any)=>x.displayName);
  const best=scored.sort((a:any,b:any)=>b.score-a.score)[0]||null;
  return {
    userId,
    username:clean(user?.username,80),
    riotId:best&&best.score>=10?best.displayName:"",
    gameTitle:best?.title||""
  };
}
function cmOpggUrl(region:string,riotIds:string[]){
  if(!riotIds.length)return "";
  return "https://op.gg/lol/multisearch/"+encodeURIComponent(region.toLowerCase())+
    "?summoners="+encodeURIComponent(riotIds.join(","));
}
function cmSeriesTargetLineup(series:any,teamName:string){
  const wanted=nameKey(teamName);
  const lineups=series?.lineups||[];
  return lineups.find((l:any)=>nameKey(l?.name)===wanted)
    ||lineups.find((l:any)=>{
      const got=nameKey(l?.name);
      return got&&wanted&&(got.includes(wanted)||wanted.includes(got));
    })
    ||null;
}
function cmBestRosterLineup(tournament:any,targetMembers:any[]){
  const targetIds=new Set((targetMembers||[]).map((m:any)=>m.userId).filter(Boolean));
  const targetNames=(targetMembers||[]).map((m:any)=>m.username).filter(Boolean);
  let best:any=null,bestScore=-1;
  for(const lineup of tournament?.attendance?.roster?.lineups||[]){
    const members=cmMembers(lineup);
    let score=members.filter((m:any)=>targetIds.has(m.userId)).length*10;
    score+=members.filter((m:any)=>targetNames.some((n:string)=>nameLooksSame(n,m.username))).length;
    if(score>bestScore){bestScore=score;best=lineup}
  }
  return bestScore>0?best:null;
}
function cmMatchTargetLineup(match:any,targetMembers:any[]){
  const targetIds=new Set((targetMembers||[]).map((m:any)=>m.userId).filter(Boolean));
  const targetNames=(targetMembers||[]).map((m:any)=>m.username).filter(Boolean);
  let best:any=null,bestScore=-1;
  for(const lineup of match?.lineups||[]){
    const members=cmMembers(lineup);
    let score=members.filter((m:any)=>targetIds.has(m.userId)).length*10;
    score+=members.filter((m:any)=>targetNames.some((n:string)=>nameLooksSame(n,m.username))).length;
    if(score>bestScore){bestScore=score;best=lineup}
  }
  return bestScore>0?best:null;
}
async function syncChallengermodePlan(plan:any){
  const rawLink=plan?.challengermodeTournamentId||plan?.challengermodeUrl;
  const kind=cmLinkKind(rawLink);
  if(kind==="team")throw new Error("CM_TEAM_LINK: Du har lagt in en lagprofil (/teams/...). Live-sync behöver Rivals-turneringens /tournaments/...-länk.");
  const tournamentId=cmTournamentId(rawLink);
  if(!tournamentId)throw new Error("CM_TOURNAMENT_LINK: Lägg in Challengermode-länken som innehåller /tournaments/ och turneringens UUID.");

  const data=await cmGraphql(CM_TOURNAMENT_QUERY,{id:tournamentId});
  const tournament=data?.tournament;
  if(!tournament)throw new Error("Challengermode-turneringen hittades inte.");

  const teamName=clean(plan?.challengermodeTeamName||plan?.opponent,100);
  const allSeries=cmTournamentSeries(tournament);
  const targetSeries=allSeries.filter((series:any)=>!!cmSeriesTargetLineup(series,teamName));
  if(!targetSeries.length)throw new Error("Kunde inte hitta laget '"+teamName+"' bland turneringens matchserier.");

  const playedSeries=targetSeries
    .filter((x:any)=>String(x?.state||"").toUpperCase()==="COMPLETED"&&Number.isFinite(Date.parse(String(x?.startedAt||""))))
    .sort((a:any,b:any)=>Date.parse(String(b.startedAt))-Date.parse(String(a.startedAt)));
  const latestSeries=playedSeries[0]||targetSeries.find((x:any)=>String(x?.state||"").toUpperCase()==="COMPLETED")||targetSeries[0];
  const seriesTarget=cmSeriesTargetLineup(latestSeries,teamName);
  const seriesMembers=cmMembers(seriesTarget);

  const rosterLineup=cmBestRosterLineup(tournament,seriesMembers);
  const registeredMembers=rosterLineup?cmMembers(rosterLineup):seriesMembers;

  const series=targetSeries.map((ms:any)=>{
    const target=cmSeriesTargetLineup(ms,teamName);
    const targetMembers=cmMembers(target);
    let targetLineupNumber:any=null;
    const matches=(ms?.matches||[]).map((m:any)=>{
      const lineup=cmMatchTargetLineup(m,targetMembers);
      if(lineup?.number!=null&&targetLineupNumber==null)targetLineupNumber=lineup.number;
      return {
        id:String(m?.id||""),
        state:clean(m?.state,40),
        lineupNumber:lineup?.number??null,
        lineup:lineup?cmUsers(lineup):[],
        lineupMembers:lineup?cmMembers(lineup):[]
      };
    });
    const lineupResults=Array.isArray(ms?.results?.lineupResults)?ms.results.lineupResults:[];
    const targetResult=targetLineupNumber==null?null:lineupResults.find((r:any)=>Number(r?.lineupNumber)===Number(targetLineupNumber))||null;
    return {
      id:String(ms?.id||""),
      title:clean(ms?.title,140),
      ordinal:Number(ms?.ordinal)||0,
      state:clean(ms?.state,40),
      startedAt:ms?.startedAt||"",
      final:!!ms?.results?.final,
      draw:!!ms?.results?.draw,
      score:targetResult?.score??null,
      position:targetResult?.placement??targetResult?.position??null,
      matches
    };
  });

  const allMatches=series.flatMap((x:any)=>x.matches.map((m:any)=>({
    ...m,
    seriesId:x.id,
    seriesTitle:x.title,
    seriesState:x.state,
    seriesStartedAt:x.startedAt||""
  })));
  const playedMatches=allMatches
    .filter((m:any)=>String(m?.state||"").toUpperCase()==="COMPLETED"&&Array.isArray(m.lineupMembers)&&m.lineupMembers.length)
    .sort((a:any,b:any)=>{
      const ad=Date.parse(String(a.seriesStartedAt||""));
      const bd=Date.parse(String(b.seriesStartedAt||""));
      if(Number.isFinite(ad)&&Number.isFinite(bd)&&ad!==bd)return bd-ad;
      if(Number.isFinite(bd)&&!Number.isFinite(ad))return 1;
      if(Number.isFinite(ad)&&!Number.isFinite(bd))return -1;
      return 0;
    });
  const latest=playedMatches[0]||allMatches.find((m:any)=>Array.isArray(m.lineupMembers)&&m.lineupMembers.length)||null;
  const activeMembers=(latest?.lineupMembers?.length?latest.lineupMembers:seriesMembers).slice(0,10);
  const active=activeMembers.map((m:any)=>m.username).filter(Boolean);
  const registered=registeredMembers.map((m:any)=>m.username).filter(Boolean);
  const substitutes=registered.filter((u:string)=>!active.some((a:string)=>nameLooksSame(a,u)));

  const previousActive=plan?.challengermode?.activeRoster||plan?.competitiveEvidence?.currentRoster?.map((x:any)=>x?.player||x)||[];
  const rosterChanged=!!active.length&&!!previousActive.length&&(
    active.length!==previousActive.length||
    active.some((u:string)=>!previousActive.some((p:string)=>nameLooksSame(p,u)))
  );

  const knownMappings=[
    ...(Array.isArray(plan?.challengermode?.activePlayers)?plan.challengermode.activePlayers:[]),
    ...(Array.isArray(plan?.challengermode?.substitutePlayers)?plan.challengermode.substitutePlayers:[]),
    ...(Array.isArray(plan?.competitiveEvidence?.currentRoster)?plan.competitiveEvidence.currentRoster:[]),
    ...(Array.isArray(plan?.competitiveEvidence?.substitutes)?plan.competitiveEvidence.substitutes:[])
  ];
  const knownRiotId=(member:any)=>{
    const hit=knownMappings.find((x:any)=>
      (x?.userId&&member?.userId&&String(x.userId)===String(member.userId))||
      nameLooksSame(x?.username||x?.player,member?.username)
    );
    return clean(hit?.riotId,120);
  };
  const uniqueMembers=new Map<string,any>();
  for(const member of [...registeredMembers,...activeMembers]){
    const key=member.userId||nameKey(member.username);
    if(key&&!uniqueMembers.has(key))uniqueMembers.set(key,member);
  }
  const accountRows=await Promise.all([...uniqueMembers.values()].map(async(member:any)=>{
    try{
      const account=member.userId?await cmLolAccount(member.userId):null;
      return {...member,riotId:clean(account?.riotId,120)||knownRiotId(member),gameTitle:clean(account?.gameTitle,80)};
    }catch{
      return {...member,riotId:knownRiotId(member),gameTitle:""};
    }
  }));
  const byUserId=new Map(accountRows.filter((x:any)=>x.userId).map((x:any)=>[x.userId,x]));
  const byName=new Map(accountRows.filter((x:any)=>x.username).map((x:any)=>[nameKey(x.username),x]));
  const decorate=(member:any)=>{
    const hit=(member?.userId&&byUserId.get(member.userId))||byName.get(nameKey(member?.username))||member;
    return {
      userId:clean(member?.userId||hit?.userId,80),
      username:clean(member?.username||hit?.username,80),
      riotId:clean(hit?.riotId,120)
    };
  };
  const activePlayers=activeMembers.map(decorate);
  const registeredPlayers=registeredMembers.map(decorate);
  const substitutePlayers=registeredPlayers.filter((p:any)=>!activePlayers.some((a:any)=>
    (p.userId&&a.userId&&p.userId===a.userId)||nameLooksSame(p.username,a.username)
  ));
  const activeRiotIds=activePlayers.map((p:any)=>p.riotId).filter(Boolean);
  const registeredRiotIds=registeredPlayers.map((p:any)=>p.riotId).filter(Boolean);
  const cmRegion=clean(plan?.challengermodeRegion||"euw",12).toLowerCase()||"euw";
  const generatedOpgg=cmOpggUrl(cmRegion,registeredRiotIds);

  const evidenceGames=Array.isArray(plan?.competitiveEvidence?.games)?plan.competitiveEvidence.games:[];
  const roleFor=(player:any)=>{
    for(let i=evidenceGames.length-1;i>=0;i--){
      const pick=(evidenceGames[i]?.picks||[]).find((x:any)=>
        nameLooksSame(x?.player,player?.username)||nameLooksSame(x?.riotId,player?.riotId)
      );
      if(pick?.role)return clean(pick.role,24).toLowerCase();
    }
    const known=knownMappings.find((x:any)=>
      nameLooksSame(x?.username||x?.player,player?.username)||
      (x?.riotId&&player?.riotId&&same(x.riotId,player.riotId))
    );
    return clean(known?.role,24).toLowerCase();
  };
  const competitiveEvidence={
    ...(plan?.competitiveEvidence||{}),
    source:"Challengermode / Rivals League",
    tournamentId,
    rosterChanged:rosterChanged||!!plan?.competitiveEvidence?.rosterChanged,
    observedAt:new Date().toISOString(),
    currentRoster:activePlayers.map((p:any)=>({player:p.username,riotId:p.riotId,role:roleFor(p)})),
    substitutes:substitutePlayers.map((p:any)=>({player:p.username,riotId:p.riotId,role:roleFor(p)})),
    games:evidenceGames
  };

  return {
    ...plan,
    players:registeredRiotIds.length?registeredRiotIds:(plan?.players||[]),
    opggUrl:generatedOpgg||plan?.opggUrl||"",
    challengermodeUrl:plan?.challengermodeUrl||"",
    challengermodeTournamentId:tournamentId,
    challengermodeTeamName:teamName,
    challengermodeRegion:cmRegion,
    challengermode:{
      configured:true,
      tournamentId,
      tournamentName:clean(tournament?.name,120),
      tournamentState:clean(tournament?.state,40),
      teamName:clean(seriesTarget?.name||teamName,100),
      registeredRoster:registered,
      activeRoster:active,
      substitutes,
      registeredPlayers,
      activePlayers,
      substitutePlayers,
      generatedOpggUrl:generatedOpgg,
      riotIdsResolved:registeredRiotIds.length,
      activeRiotIdsResolved:activeRiotIds.length,
      rosterSize:registeredPlayers.length,
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
  const activeRoster=(plan?.competitiveEvidence?.currentRoster||[]).map((x:any)=>clean(x?.riotId||x?.player||x,120)).filter(Boolean);
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
  const successful=activeRoster.length?matchedActive:allSuccessful;
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

// Public history reads use only series already associated with a saved team plan.
// Coalesce requests and cache projections; this route never writes shared data.
const rivalsCache=new Map<string,{until:number;promise:Promise<any>}>();
async function rivalsHistory(plan:any){
  const team=clean(plan.challengermode?.teamName||plan.challengermodeTeamName||plan.opponent,100);
  const series=(plan.challengermode?.series||[]).filter((s:any)=>s.state==="COMPLETED")
    .sort((a:any,b:any)=>Date.parse(b.startedAt||0)-Date.parse(a.startedAt||0)).slice(0,8);
  const cacheKey=team+":"+series.map((s:any)=>s.id).join(":");
  const cached=rivalsCache.get(cacheKey);if(cached&&cached.until>Date.now())return cached.promise;
  const promise=(async()=>{
    const champions=await championMap(),rows:any[]=[];let failed=0;
    // Small sequential batches bound external API concurrency and response size.
    for(let i=0;i<series.length;i+=2){
      await Promise.all(series.slice(i,i+2).map(async(s:any)=>{
        try{
          const data=await cmGraphql(`query RivalsHistory($id: UUID!) {
            matchSeries(matchSeriesId: $id) {
              id title startedAt lineups { name members { user { id username } } }
              matches(includeFailed: false) {
                id state results { final draw lineupResults { lineupNumber score placement formattedScore } }
                lineups { number members { user {id username} } }
              }
            }
          }`,{id:s.id});
          await Promise.all((data.matchSeries?.matches||[]).filter((m:any)=>m.state==="COMPLETED").slice(0,5).map(async(match:any)=>{
            let after:string|null=null,nodes:any[]=[],lineupStats:any[]=[],partial=false;
            try{
              for(let n=0;n<10;n++){
                const next=await cmGraphql(`query RivalsStats($id: UUID!, $after: String) {
                  match(matchId: $id) { statistics { gameSessionStatistics {
                    lineupStatistics(first: 100) { nodes {name formattedValue serializedValue lineup {number members {user {id}}}} }
                    competitorStatistics(first: 100, after: $after) {
                      pageInfo {hasNextPage endCursor}
                      nodes {name formattedValue serializedValue competitor {user {id}}}
                    }
                  } } }
                }`,{id:match.id,after});
                const info=next.match?.statistics?.gameSessionStatistics;
                if(info?.lineupStatistics?.nodes)lineupStats=info.lineupStatistics.nodes;
                const page=info?.competitorStatistics;
                nodes.push(...(page?.nodes||[]));partial=!!page?.pageInfo?.hasNextPage;
                if(!partial||!page?.pageInfo?.endCursor)break;
                after=page.pageInfo.endCursor;
              }
            }catch{partial=true;}
            match.statistics={gameSessionStatistics:{lineupStatistics:{nodes:lineupStats},competitorStatistics:{nodes,pageInfo:{hasNextPage:partial}}}};
          }));
          const row=seriesHistory(data.matchSeries,team,champions);if(row)rows.push(row);else failed++;
        }catch(err){failed++;console.warn("Rivals history read failed",clean((err as Error)?.message,220));}
      }));
    }
    rows.sort((a,b)=>Date.parse(b.playedAt||0)-Date.parse(a.playedAt||0));
    return {series:rows,partial:failed>0,fetchedAt:new Date().toISOString()};
  })();
  if(rivalsCache.size>=50)rivalsCache.delete(rivalsCache.keys().next().value!);
  rivalsCache.set(cacheKey,{until:Date.now()+10*60*1000,promise});
  return promise;
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
      const history=url.searchParams.get("rivals")==="1";
      if(history&&!id)return json({error:"Plan ID required"},400);
      let query=db.from("team_plans").select("id,opponent,scheduled_at,status,payload,updated_at").eq("team_slug",TEAM_SLUG);
      if(id)query=query.eq("id",id);
      const {data,error}=await query.order("scheduled_at",{ascending:true}).limit(50);
      if(error)return json({error:error.message},500);
      if(history){
        const row=data?.[0];if(!row)return json({error:"Plan not found"},404);
        return json(await rivalsHistory({...row.payload,opponent:row.opponent}));
      }
      return json({
        plans:data||[],
        capabilities:{
          challengermode:true,
          challengermodeSecret:!!Deno.env.get("CHALLENGERMODE_REFRESH_KEY")
        }
      });
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
      const planId=body?.reviewOnly===true?body.id:plan?.id;
      if(typeof planId!=='string'||!planId.trim())return json({error:"Invalid plan"},400);
      const {data:existing,error:readError}=await db.from("team_plans").select("id,opponent,scheduled_at,status,payload").eq("team_slug",TEAM_SLUG).eq("id",planId).maybeSingle();
      if(readError)return json({error:"Could not read current plan"},500);
      const stored=existing?{...existing.payload,id:existing.id,opponent:existing.opponent,scheduledAt:existing.scheduled_at,status:existing.status}:null;
      if(body?.reviewOnly===true){
        if(!stored)return json({error:"Matchen finns inte kvar."},404);
        try{plan=mergeReview(stored,body.review)}catch{return json({error:"Svara på minst en fråga."},400)}
      }else if(stored){
        // Polling/scouting is not an edit: start from current server data, never a stale browser copy.
        plan=body?.syncChallengermode===true||body?.scout===true?stored:preserveEvidence(plan,stored);
      }
      if(!plan||typeof plan.id!=="string"||typeof plan.opponent!=="string"||!plan.scheduledAt)return json({error:"Invalid plan"},400);

      let cmSyncError="";
      if(body?.syncChallengermode===true&&body?.reviewOnly!==true){
        try{plan=await syncChallengermodePlan(plan)}
        catch(err){cmSyncError=clean(err instanceof Error?err.message:err,220)}
      }

      if(body?.scout===true&&body?.reviewOnly!==true){
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
        challengermodeConfigured:true,
        challengermodeSecretConfigured:!!Deno.env.get("CHALLENGERMODE_REFRESH_KEY")
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


