(() => {
  let snapshot=null;
  let loadState="loading";
  const tierPts={"S+":5,"S":4,"S-":3,"A+":2.5,"A":2,"A-":1.5,"B+":1,"B":0.5,"B-":0,"C+":-0.5,"C":-1,"C-":-1.5,"D+":-2,"D":-2.5,"D-":-3};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function scoreChampion({champ,role,enemies=[]}){
    if(loadState!=="ready"||!snapshot?.roles?.[role]){
      return {available:false,points:0,reasons:[]};
    }
    const row=snapshot.roles[role][champ];
    if(!row)return {available:false,points:0,reasons:[]};

    let points=tierPts[row.tier]||0;
    const reasons=[];
    if(row.tier)reasons.push("LoLalytics "+row.tier);

    if(Number.isFinite(row.winrate)){
      const wrPts=clamp((row.winrate-50)*1.5,-4,4);
      points+=wrPts;
      reasons.push(row.winrate.toFixed(2)+"% WR");
    }

    const strong=(row.strong||[]).filter(x=>enemies.includes(x));
    const weak=(row.weak||[]).filter(x=>enemies.includes(x));
    if(strong.length){points+=Math.min(4,strong.length*2.5);reasons.push("statstarkt mot "+strong.slice(0,2).join("/"));}
    if(weak.length){points-=Math.min(4,weak.length*2.5);reasons.push("statssvagt mot "+weak.slice(0,2).join("/"));}

    return {
      available:true,
      points:clamp(points,-6,8),
      reasons,
      tier:row.tier||null,
      winrate:row.winrate,
      source:snapshot.source
    };
  }

  function getStatus(){
    return {
      state:loadState,
      hasData:loadState==="ready",
      source:snapshot?.source||"LoLalytics",
      patch:snapshot?.patch||null,
      bracket:snapshot?.bracket||null,
      region:snapshot?.region||null,
      updated:snapshot?.updated||null,
      coverage:snapshot?Object.values(snapshot.roles||{}).reduce((n,r)=>n+Object.keys(r).length,0):0,
      profileKey:"team_gold_plat",
      profileLabel:"Gold/Gold+"
    };
  }

  function setProfile(){}

  async function load(){
    try{
      const res=await fetch("external-meta.json?ts="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      snapshot=await res.json();
      loadState=snapshot?.roles?"ready":"empty";
    }catch(err){
      console.warn("Extern meta kunde inte laddas:",err);
      loadState="error";
    }
    document.dispatchEvent(new CustomEvent("riftstats:change"));
  }

  window.RiftStats={scoreChampion,getStatus,setProfile,load};
  load();
})();