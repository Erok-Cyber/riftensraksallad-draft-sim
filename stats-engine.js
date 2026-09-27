(() => {
  const PROFILES = {
    team_gold_plat: {
      label: "Gold/Plat team",
      roleWeights: {
        default: {GOLD: 0.70, PLATINUM: 0.25, EMERALD: 0.05},
        jungle:  {GOLD: 0.45, PLATINUM: 0.35, EMERALD: 0.20}
      }
    },
    gold: {
      label: "Gold",
      roleWeights: {default: {GOLD: 1.00}}
    },
    platinum: {
      label: "Platinum",
      roleWeights: {default: {PLATINUM: 1.00}}
    },
    emerald_plus: {
      label: "Emerald+",
      roleWeights: {default: {EMERALD: 1.00}}
    }
  };

  let profileKey = localStorage.getItem("rs_stats_profile") || "team_gold_plat";
  if (!PROFILES[profileKey]) profileKey = "team_gold_plat";
  let snapshot = null;
  let loadState = "loading";

  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const roleKey = role => ({top:"top",jungle:"jungle",mid:"mid",adc:"adc",support:"support"}[role] || role);

  function weightedRate(nodes, weights, priorGames=120){
    let weighted = 0, used = 0, totalGames = 0;
    for (const [tier,w] of Object.entries(weights)){
      const n = nodes[tier];
      if (!n || !n.games) continue;
      const adjusted = (n.wins + priorGames * 0.5) / (n.games + priorGames);
      weighted += adjusted * w;
      used += w;
      totalGames += n.games;
    }
    return used ? {rate: weighted / used, games: totalGames} : null;
  }

  function profileWeights(role){
    const p = PROFILES[profileKey] || PROFILES.team_gold_plat;
    return p.roleWeights[role] || p.roleWeights.default;
  }

  function championNodes(champ, role){
    const out = {};
    if (!snapshot?.segments) return out;
    for (const tier of Object.keys(snapshot.segments)){
      out[tier] = snapshot.segments[tier]?.champions?.[roleKey(role)]?.[champ] || null;
    }
    return out;
  }

  function matchupNodes(champ, role, enemy){
    const out = {};
    if (!snapshot?.segments) return out;
    for (const tier of Object.keys(snapshot.segments)){
      out[tier] = snapshot.segments[tier]?.matchups?.[roleKey(role)]?.[champ]?.[enemy] || null;
    }
    return out;
  }

  function synergyNodes(champ, ally){
    const out = {};
    if (!snapshot?.segments) return out;
    for (const tier of Object.keys(snapshot.segments)){
      out[tier] = snapshot.segments[tier]?.synergies?.[champ]?.[ally] || null;
    }
    return out;
  }

  function scoreChampion({champ, role, enemies=[], allies=[]}){
    if (!snapshot || loadState !== "ready"){
      return {available:false, points:0, meta:0, matchup:0, synergy:0, confidence:0, reasons:[]};
    }

    const weights = profileWeights(role);
    const overall = weightedRate(championNodes(champ, role), weights, 180);
    let meta = 0, matchup = 0, synergy = 0, evidence = 0;
    const reasons = [];

    if (overall){
      meta = clamp((overall.rate - 0.50) * 150, -8, 8);
      evidence += Math.min(1, overall.games / 600);
      if (Math.abs(meta) >= 2) reasons.push((meta > 0 ? "+" : "") + meta.toFixed(1) + " meta");
    }

    const matchupBits = [];
    for (const enemy of enemies){
      const r = weightedRate(matchupNodes(champ, role, enemy), weights, 90);
      if (!r || r.games < 5) continue;
      const pts = clamp((r.rate - 0.50) * 90, -4.5, 4.5);
      matchup += pts;
      evidence += Math.min(0.35, r.games / 250);
      if (Math.abs(pts) >= 1.5) matchupBits.push(enemy);
    }
    matchup = clamp(matchup, -9, 9);
    if (matchupBits.length) reasons.push((matchup > 0 ? "bra mot " : "svagare mot ") + matchupBits.slice(0,2).join("/"));

    const synergyBits = [];
    for (const ally of allies){
      const r = weightedRate(synergyNodes(champ, ally), weights, 110);
      if (!r || r.games < 5) continue;
      const pts = clamp((r.rate - 0.50) * 70, -3.5, 3.5);
      synergy += pts;
      evidence += Math.min(0.25, r.games / 250);
      if (pts >= 1.2) synergyBits.push(ally);
    }
    synergy = clamp(synergy, -6, 6);
    if (synergyBits.length) reasons.push("synergy med " + synergyBits.slice(0,2).join("/"));

    const confidence = clamp(evidence / 2.2, 0, 1);
    const raw = meta + matchup + synergy;
    const points = clamp(raw * (0.45 + 0.55 * confidence), -14, 18);

    return {available:true, points, meta, matchup, synergy, confidence, reasons};
  }

  function getStatus(){
    return {
      state: loadState,
      hasData: loadState === "ready",
      profileKey,
      profileLabel: PROFILES[profileKey]?.label || "Gold/Plat team",
      patch: snapshot?.patch || null,
      generatedAt: snapshot?.generatedAt || null,
      matches: snapshot?.summary?.matches || 0,
      source: snapshot?.source || "Riot Games API"
    };
  }

  function setProfile(key){
    if (!PROFILES[key]) return;
    profileKey = key;
    localStorage.setItem("rs_stats_profile", key);
    document.dispatchEvent(new CustomEvent("riftstats:change"));
  }

  async function load(){
    try{
      const res = await fetch("riot-stats.json?ts=" + Date.now(), {cache:"no-store"});
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data?.segments || !Object.keys(data.segments).length || !data?.summary?.matches){
        snapshot = data;
        loadState = "empty";
      }else{
        snapshot = data;
        loadState = "ready";
      }
    }catch(err){
      console.warn("Riot stats kunde inte laddas:", err);
      loadState = "error";
    }
    document.dispatchEvent(new CustomEvent("riftstats:change"));
  }

  window.RiftStats = {scoreChampion,getStatus,setProfile,profiles:PROFILES,load};
  load();
})();