/* Shared starter/role resolution for Ban Planner and Draft Brain. */
(()=>{
  const SCOUT_ROLES=["top","jungle","mid","adc","support"];
  const SCOUT_ROLE_NAMES={top:"TOP",jungle:"JUNGLE",mid:"MID",adc:"ADC",support:"SUPPORT"};
  const SCOUT_ROLE_POOLS={
    top:new Set(["Aatrox","Ambessa","Camille","Darius","Fiora","Galio","Garen","Gnar","Gragas","Gwen","Heimerdinger","Jax","Jayce","Kayle","Kennen","K'Sante","Malphite","Mordekaiser","Olaf","Ornn","Poppy","Renekton","Rumble","Shen","Sion","Tahm Kench","Trundle","Tryndamere","Yone","Yorick","Dr. Mundo"]),
    jungle:new Set(["Amumu","Diana","Ekko","Gragas","Graves","Ivern","Jarvan IV","Kayn","Kindred","Lee Sin","Lillia","Nocturne","Nunu & Willump","Poppy","Sejuani","Skarner","Trundle","Udyr","Vi","Viego","Volibear","Wukong","Xin Zhao","Zac"]),
    mid:new Set(["Ahri","Akali","Anivia","Annie","Aurora","Azir","Cassiopeia","Diana","Ekko","Galio","Hwei","LeBlanc","Malzahar","Orianna","Ryze","Sylas","Syndra","Taliyah","Tristana","Twisted Fate","Vex","Viktor","Yone","Zed","Zoe"]),
    adc:new Set(["Aphelios","Ashe","Caitlyn","Corki","Ezreal","Jinx","Kai'Sa","Kalista","Lucian","Miss Fortune","Samira","Senna","Sivir","Smolder","Tristana","Varus","Xayah","Yunara","Zeri"]),
    support:new Set(["Alistar","Bard","Blitzcrank","Braum","Janna","Leona","Lulu","Maokai","Milio","Nami","Nautilus","Pantheon","Poppy","Pyke","Rakan","Rell","Senna","Seraphine","Tahm Kench","Thresh","Zilean"])
  };
  function scoutRoleScore(player,role){
    return (player?.topChampions||[]).slice(0,8).reduce((sum,c,i)=>{
      if(!SCOUT_ROLE_POOLS[role]?.has(c.champ))return sum;
      const games=Number(c.seasonGames||c.recentGames||0);
      return sum+(9-i)*(1+Math.log2(games+2));
    },0);
  }
  function scoutLineup(plan){
    const players=(plan?.scoutingPlayers||[])
      .filter(p=>p?.found!==false&&Array.isArray(p?.topChampions))
      .slice(0,12);
    const cmRoster=Array.isArray(plan?.competitiveEvidence?.currentRoster)
      ?plan.competitiveEvidence.currentRoster.filter(Boolean).slice(0,5)
      :[];

    const playerForRow=row=>{
      const riot=String(row?.riotId||"").trim().toLowerCase();
      if(riot){
        const exact=players.find(p=>String(p?.riotId||"").trim().toLowerCase()===riot);
        if(exact)return exact;
      }
      return {
        riotId:row?.riotId||row?.player||"Okänd spelare",
        found:false,
        tier:"",
        topChampions:[]
      };
    };
    const makeEntry=(row,player,role,source,confidence)=>{
      let pool=(player?.topChampions||[]).filter(c=>SCOUT_ROLE_POOLS[role]?.has(c.champ));
      if(pool.length<2)pool=[...(player?.topChampions||[])];
      pool=pool
        .filter((c,idx,arr)=>c?.champ&&arr.findIndex(x=>x.champ===c.champ)===idx)
        .slice(0,6);
      return {
        role,
        roleName:SCOUT_ROLE_NAMES[role]||String(role||"").toUpperCase(),
        roleConfidence:confidence,
        source,
        cmUsername:row?.player||"",
        player,
        pool
      };
    };

    // Challengermode owns the five starters. Never let a sub enter the
    // displayed starting five just because OP.GG makes its pool look plausible.
    if(cmRoster.length){
      const starterRows=cmRoster.map(row=>({
        row,
        player:playerForRow(row),
        lockedRole:SCOUT_ROLES.includes(String(row?.role||"").toLowerCase())
          ?String(row.role).toLowerCase()
          :""
      }));

      const lockedRoles=new Set(starterRows.map(x=>x.lockedRole).filter(Boolean));
      const remainingRoles=SCOUT_ROLES.filter(role=>!lockedRoles.has(role));
      const unresolved=starterRows.filter(x=>!x.lockedRole);

      let best={score:-Infinity,assign:[]};
      const walk=(i,left,assign,score)=>{
        if(i>=unresolved.length){
          if(score>best.score)best={score,assign:[...assign]};
          return;
        }
        if(!left.length){
          if(score>best.score)best={score,assign:[...assign]};
          return;
        }
        left.forEach((role,idx)=>{
          const next=left.slice();
          next.splice(idx,1);
          walk(i+1,next,[...assign,role],score+scoutRoleScore(unresolved[i].player,role));
        });
      };
      walk(0,remainingRoles,[],0);

      let unresolvedIndex=0;
      const entries=starterRows.map(item=>{
        if(item.lockedRole){
          return makeEntry(item.row,item.player,item.lockedRole,"challengermode",100);
        }
        const role=best.assign[unresolvedIndex++]||remainingRoles[unresolvedIndex-1]||"";
        const candidateScores=remainingRoles.map(r=>scoutRoleScore(item.player,r));
        const total=candidateScores.reduce((a,b)=>a+b,0);
        const score=scoutRoleScore(item.player,role);
        const confidence=total?Math.max(1,Math.round(score/total*100)):0;
        return makeEntry(item.row,item.player,role,"challengermode-inferred",confidence);
      });

      return entries.sort((a,b)=>SCOUT_ROLES.indexOf(a.role)-SCOUT_ROLES.indexOf(b.role));
    }

    // No competitive lineup yet: fall back to the old OP.GG-only inference.
    const usable=players.filter(p=>Array.isArray(p?.topChampions)&&p.topChampions.length).slice(0,5);
    if(!usable.length)return [];

    const roles=SCOUT_ROLES.slice();
    let best={score:-1,assign:[]};
    const walk=(i,left,assign,score)=>{
      if(i>=usable.length||!left.length){
        if(score>best.score)best={score,assign:[...assign]};
        return;
      }
      left.forEach((role,idx)=>{
        const next=left.slice();
        next.splice(idx,1);
        walk(i+1,next,[...assign,role],score+scoutRoleScore(usable[i],role));
      });
    };
    walk(0,roles,[],0);

    return usable.map((player,i)=>{
      const role=best.assign[i]||roles[i]||"";
      const scores=SCOUT_ROLES.map(r=>scoutRoleScore(player,r));
      const total=scores.reduce((a,b)=>a+b,0);
      const roleScore=scoutRoleScore(player,role);
      return makeEntry(
        {player:player.riotId,riotId:player.riotId},
        player,
        role,
        "opgg-inferred",
        total?Math.round(roleScore/total*100):0
      );
    }).sort((a,b)=>SCOUT_ROLES.indexOf(a.role)-SCOUT_ROLES.indexOf(b.role));
  }
  window.RiftScouting={lineup:scoutLineup};
})();
