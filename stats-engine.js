(() => {
  let rawBundle=null;
  let loadState="loading";
  let liveInfo={patch:null,sourcePatch:null,previousPatch:null,previousSourcePatch:null};
  let currentSnapshot=null;
  let previousSnapshot=null;
  let currentWeight=0;

  const EXPECTED_POOL_SIZE=38;
  const tierPts={"S+":5,"S":4,"S-":3,"A+":2.5,"A":2,"A-":1.5,"B+":1,"B":0.5,"B-":0,"C+":-0.5,"C":-1,"C-":-1.5,"D+":-2,"D":-2.5,"D-":-3};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function sourcePatch(version){
    const parts=String(version||"").split(".");
    return parts.length>=2?parts.slice(0,2).join("."):String(version||"");
  }

  function displayPatch(source){
    const parts=String(source||"").split(".");
    let major=Number(parts[0]),minor=Number(parts[1]);
    if(!Number.isFinite(major)||!Number.isFinite(minor))return source||null;
    if(major>=15)major+=10;
    return major+"."+minor;
  }

  function coverageOf(snap){
    if(!snap)return 0;
    if(Number.isFinite(snap.coverage))return snap.coverage;
    return Object.values(snap.roles||{}).reduce((n,r)=>n+Object.keys(r||{}).length,0);
  }

  function ratioOf(snap){
    if(!snap)return 0;
    if(Number.isFinite(snap.coverageRatio))return snap.coverageRatio;
    return clamp(coverageOf(snap)/EXPECTED_POOL_SIZE,0,1);
  }

  function normalizeLegacy(raw){
    if(!raw)return [];
    if(raw.schema===2&&Array.isArray(raw.patches))return raw.patches;
    if(raw.roles){
      return [{
        patch:displayPatch(raw.patch),
        sourcePatch:raw.patch||null,
        source:raw.source||"LoLalytics",
        sourceUrl:raw.sourceUrl||"https://lolalytics.com/",
        bracket:raw.bracket||"Gold+",
        region:raw.region||"GLOBAL",
        updated:raw.updated||null,
        confidence:"medium",
        coverage:coverageOf(raw),
        coverageRatio:clamp(coverageOf(raw)/EXPECTED_POOL_SIZE,0,1),
        roles:raw.roles
      }];
    }
    return [];
  }

  function confidenceBase(label){
    if(label==="high")return 0.90;
    if(label==="medium")return 0.68;
    if(label==="low")return 0.38;
    return 0.60;
  }

  function resolveSnapshots(){
    const snaps=normalizeLegacy(rawBundle);
    currentSnapshot=snaps.find(s=>s.sourcePatch===liveInfo.sourcePatch)||null;
    previousSnapshot=snaps.find(s=>s.sourcePatch===liveInfo.previousSourcePatch)||null;

    if(!currentSnapshot&&rawBundle?.schema===2){
      currentSnapshot=snaps.find(s=>s.patch===liveInfo.patch)||null;
    }
    if(!previousSnapshot&&rawBundle?.schema===2){
      previousSnapshot=snaps.find(s=>s.patch===liveInfo.previousPatch)||null;
    }

    if(!currentSnapshot&&!previousSnapshot&&snaps.length){
      previousSnapshot=snaps[0];
    }

    if(currentSnapshot){
      const base=confidenceBase(currentSnapshot.confidence);
      const coverage=ratioOf(currentSnapshot);
      currentWeight=clamp(base*(0.65+0.35*coverage),0.30,0.92);
      if(!previousSnapshot)currentWeight=1;
    }else{
      currentWeight=0;
    }
  }

  function rowFor(snap,role,champ){
    return snap?.roles?.[role]?.[champ]||null;
  }

  function blendedValue(a,b,weight){
    const av=Number.isFinite(a)?a:null;
    const bv=Number.isFinite(b)?b:null;
    if(av!=null&&bv!=null)return av*weight+bv*(1-weight);
    if(av!=null)return av;
    if(bv!=null)return bv;
    return null;
  }

  function blendedTierPoints(cur,prev,weight){
    const a=cur?.tier in tierPts?tierPts[cur.tier]:null;
    const b=prev?.tier in tierPts?tierPts[prev.tier]:null;
    return blendedValue(a,b,weight)??0;
  }

  function effectiveWeight(cur,prev){
    if(cur&&!prev)return 1;
    if(!cur&&prev)return 0;
    return currentWeight;
  }

  function preferredList(cur,prev,key){
    const a=Array.isArray(cur?.[key])?cur[key]:[];
    const b=Array.isArray(prev?.[key])?prev[key]:[];
    return a.length?a:b;
  }

  function scoreChampion({champ,role,enemies=[]}){
    if(loadState!=="ready"){
      return {available:false,points:0,reasons:[]};
    }

    const cur=rowFor(currentSnapshot,role,champ);
    const prev=rowFor(previousSnapshot,role,champ);
    if(!cur&&!prev)return {available:false,points:0,reasons:[]};

    const w=effectiveWeight(cur,prev);
    let points=blendedTierPoints(cur,prev,w);
    const wr=blendedValue(cur?.winrate,prev?.winrate,w);
    const reasons=[];

    const tier=cur?.tier||prev?.tier||null;
    if(tier){
      const patchLabel=cur?(currentSnapshot?.patch||liveInfo.patch):(previousSnapshot?.patch||liveInfo.previousPatch);
      reasons.push("LoLalytics "+tier+(patchLabel?" · "+patchLabel:""));
    }

    if(Number.isFinite(wr)){
      const wrPts=clamp((wr-50)*1.5,-4,4);
      points+=wrPts;
      reasons.push(wr.toFixed(2)+"% WR");
    }

    const strong=preferredList(cur,prev,"strong").filter(x=>enemies.includes(x));
    const weak=preferredList(cur,prev,"weak").filter(x=>enemies.includes(x));
    if(strong.length){points+=Math.min(4,strong.length*2.5);reasons.push("statstarkt mot "+strong.slice(0,2).join("/"));}
    if(weak.length){points-=Math.min(4,weak.length*2.5);reasons.push("statssvagt mot "+weak.slice(0,2).join("/"));}

    if(cur&&prev&&w<0.95){
      reasons.push(Math.round(w*100)+"% "+(currentSnapshot.patch||liveInfo.patch)+" + "+Math.round((1-w)*100)+"% "+(previousSnapshot.patch||liveInfo.previousPatch));
    }else if(!cur&&prev&&liveInfo.patch){
      reasons.push("fallback "+(previousSnapshot.patch||"?"));
    }

    const snapshot=cur?currentSnapshot:previousSnapshot;
    const updated=Date.parse(snapshot?.updated||rawBundle?.generatedAt||'');
    const age=Number.isFinite(updated)?Math.max(0,(Date.now()-updated)/86400000):Infinity;
    const ageWeight=age<=7?1:age<=21?.65:age<=42?.3:0;
    if(ageWeight<1)reasons.push(ageWeight===0?'För gammal/okänd metadatadatering – ingen poängpåverkan':'Äldre metadata – reducerad vikt');
    return {
      available:true,
      points:clamp(points,-6,8)*ageWeight,
      reasons,
      tier,
      winrate:wr,
      source:currentSnapshot?.source||previousSnapshot?.source||rawBundle?.source||"LoLalytics",
      patch:cur?(currentSnapshot?.patch||null):(previousSnapshot?.patch||null),
      currentWeight:w
    };
  }

  function getStatus(){
    const active=currentSnapshot||previousSnapshot;
    const hasData=!!active&&loadState==="ready";
    const fallback=!currentSnapshot&&!!previousSnapshot;
    const confidence=fallback?"fallback":(currentSnapshot?.confidence||previousSnapshot?.confidence||"unknown");
    const coverage=coverageOf(currentSnapshot||previousSnapshot);
    const blendText=currentSnapshot&&previousSnapshot
      ?Math.round(currentWeight*100)+"% "+(currentSnapshot.patch||liveInfo.patch)+" / "+Math.round((1-currentWeight)*100)+"% "+(previousSnapshot.patch||liveInfo.previousPatch)
      :(fallback?"100% "+(previousSnapshot?.patch||"?")+" fallback":"100% "+(currentSnapshot?.patch||liveInfo.patch||"?"));

    return {
      state:loadState,
      hasData,
      source:active?.source||rawBundle?.source||"LoLalytics",
      patch:liveInfo.patch||rawBundle?.livePatch||active?.patch||null,
      sourcePatch:liveInfo.sourcePatch||rawBundle?.liveSourcePatch||active?.sourcePatch||null,
      metaPatch:currentSnapshot?.patch||previousSnapshot?.patch||null,
      previousPatch:liveInfo.previousPatch||rawBundle?.previousPatch||previousSnapshot?.patch||null,
      confidence,
      fallback,
      currentWeight,
      blendText,
      bracket:active?.bracket||"Gold+",
      region:active?.region||"GLOBAL",
      updated:active?.updated||rawBundle?.generatedAt||null,
      coverage,
      coverageRatio:ratioOf(active),
      sampleCount:active?.sampleCount||null,
      profileKey:"team_gold_plat",
      profileLabel:"Gold+"
    };
  }

  function setProfile(){}

  async function detectLivePatches(){
    try{
      const res=await fetch("https://ddragon.leagueoflegends.com/api/versions.json",{cache:"no-store"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const versions=await res.json();
      const unique=[];
      for(const v of versions){
        const p=sourcePatch(v);
        if(p&&!unique.includes(p))unique.push(p);
        if(unique.length===2)break;
      }
      if(unique.length){
        liveInfo.sourcePatch=unique[0];
        liveInfo.patch=displayPatch(unique[0]);
      }
      if(unique.length>1){
        liveInfo.previousSourcePatch=unique[1];
        liveInfo.previousPatch=displayPatch(unique[1]);
      }
    }catch(err){
      console.warn("Kunde inte läsa live patch från Data Dragon:",err);
      liveInfo.patch=rawBundle?.livePatch||null;
      liveInfo.sourcePatch=rawBundle?.liveSourcePatch||null;
      liveInfo.previousPatch=rawBundle?.previousPatch||null;
      liveInfo.previousSourcePatch=rawBundle?.previousSourcePatch||null;
    }
  }

  async function load(){
    loadState="loading";
    document.dispatchEvent(new CustomEvent("riftstats:change"));
    try{
      const res=await fetch("external-meta.json?ts="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      rawBundle=await res.json();
      await detectLivePatches();
      resolveSnapshots();
      loadState=(currentSnapshot||previousSnapshot)?"ready":"empty";
    }catch(err){
      console.warn("Extern meta kunde inte laddas:",err);
      loadState="error";
    }
    document.dispatchEvent(new CustomEvent("riftstats:change"));
  }

  window.RiftStats={scoreChampion,getStatus,setProfile,load};
  load();
})();
