/* Read-only preparation summary; never overwrites the saved ban plan. */
(()=>{
  const key=v=>String(v||'').trim().toLocaleLowerCase('sv-SE');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function summarize(data,plan){
    const lineup=window.RiftScouting?.lineup?.(plan)||[];
    const active=new Map(lineup.filter(e=>e.cmUsername).map(e=>[key(e.cmUsername),e]));
    const players=new Map(),seen=new Set();
    (data.series||[]).forEach((s,si)=>(s.games||[]).forEach((g,gi)=>{
      const id=g.id||String(s.id||si)+':'+gi;if(seen.has(id))return;seen.add(id);
      const participants=new Set();
      (g.picks||[]).forEach(p=>{
        const name=key(p.player);if(!name||!p.champ||participants.has(name)||(active.size&&!active.has(name)))return;participants.add(name);
        if(!players.has(name))players.set(name,{name:p.player,riotId:active.get(name)?.player?.riotId||'',games:0,champions:new Map(),impact:[],damage:[],kp:[]});
        const row=players.get(name);row.games++;
        if(!row.champions.has(p.champ))row.champions.set(p.champ,{champ:p.champ,games:0,wins:0,known:0});
        const ch=row.champions.get(p.champ);ch.games++;if(['win','loss'].includes(g.result)){ch.known++;if(g.result==='win')ch.wins++;}
        if(!g.partial){
          for(const [field,target] of [['impact','impact'],['damageShare','damage'],['killParticipation','kp']]){
            const value=p.performance?.[field];if(Number.isFinite(value)&&value>=0&&value<=1)row[target].push(value);
          }
        }
      });
    }));
    const mean=values=>values.length?values.reduce((n,v)=>n+v,0)/values.length:null;
    const rows=[...players.values()].map(p=>{
      const champions=[...p.champions.values()].sort((a,b)=>b.games-a.games||a.champ.localeCompare(b.champ));
      // Same bounded player-impact contribution used by Brain, not a new skill score.
      const signal=p.impact.length>=3?24*mean(p.impact)*p.impact.length/(p.impact.length+5):null;
      return {...p,champions,signal,impactGames:p.impact.length,damageMean:mean(p.damage),kpMean:mean(p.kp)};
    }).sort((a,b)=>(b.signal??-1)-(a.signal??-1)||b.champions[0].games-a.champions[0].games||b.games-a.games||a.name.localeCompare(b.name));
    return {rows,scoped:active.size>0,missing:[...active].filter(([id])=>!players.has(id)).map(([,e])=>e.player?.riotId||e.cmUsername),partial:!!data.partial};
  }
  function render(data,plan){
    const summary=summarize(data,plan),rows=summary.rows;
    const cards=rows.slice(0,3).map((p,i)=>{
      const bans=p.champions.slice(0,2),small=p.games<5||p.impactGames<3;
      const reason=p.signal!==null?'Återkommande matchpåverkan i '+p.impactGames+' games.':'Prestationsunderlaget räcker inte för styrkerankning; återkommande picks visas.';
      return '<article class="threat-card"><div class="threat-top"><span class="threat-rank">'+(i+1)+'</span><span class="threat-tag">'+(small?'LITET UNDERLAG':'RIVALS-UNDERLAG')+'</span></div><h3>'+esc(p.name)+'</h3>'+(p.riotId&&key(p.riotId)!==key(p.name)?'<p class="note">'+esc(p.riotId)+'</p>':'')+'<p>'+reason+'</p><div class="threat-metrics"><span>'+p.games+' games</span>'+(p.damageMean!==null?'<span>'+Math.round(p.damageMean*100)+'% lagskada i snitt ('+p.damage.length+')</span>':'')+(p.kpMean!==null?'<span>'+Math.round(p.kpMean*100)+'% KP ('+p.kp.length+')</span>':'')+'</div><p class="threat-label">ÖVERVÄG ATT BANNA</p><div class="threat-bans">'+bans.map(c=>'<button type="button" data-threat-champ="'+esc(c.champ)+'" data-threat-player="'+esc(p.name)+'">'+esc(c.champ)+' <span>'+c.games+' picks'+(c.known?' · '+c.wins+'V/'+(c.known-c.wins)+'F':' · resultat saknas')+'</span></button>').join('')+'</div><p class="note">'+(bans[0].games>=2?'Börja med '+esc(bans[0].champ)+' om ni vill ta bort spelarens mest återkommande pick.':'Varje visad champion har bara ett registrerat pick – svagt stöd för en riktad ban.')+'</p><button class="threat-history" type="button" data-threat-player-only="'+esc(p.name)+'">Visa spelarens matcher →</button></article>';
    }).join('');
    return '<div class="section-head"><div><p class="eyebrow">'+(plan?.isOwnTeam?'MOTSTÅNDARNAS HUVUDVÄRK':'BANFÖRBEREDELSER')+'</p><h2>'+(plan?.isOwnTeam?'Vilka av oss hade de bannat?':'Spelare att rikta bans mot')+'</h2></div></div><p class="note">'+(plan?.isOwnTeam?'Våra historiska Rivals-spelare, inklusive inhoppare. En glimt av hur motståndarna kan scouta oss.':summary.scoped?'Endast spelare som matchar den sparade aktiva femman. Kontrollera starters före matchen.':'Aktiv femma saknas. Visar historiska spelare – bekräfta vilka som ska spela.')+(summary.partial?' Matchhistoriken är delvis hämtad.':'')+'</p>'+(cards?'<div class="threat-grid">'+cards+'</div>':'<p class="empty">Inga registrerade Rivals-picks kunde kopplas till den aktiva femman.</p>')+(summary.missing.length?'<p class="note">Saknar matchunderlag för: '+esc(summary.missing.join(', '))+'.</p>':'')+'<details class="threat-method"><summary>Hur ska vi använda detta?</summary><p>Ordningen använder samma dämpade prestationssignal som Draft Brain, med minst tre games med mätvärden. Vid saknad signal sorteras återkommande picks först. Banmålen är spelarens mest spelade champions i den inlästa historiken. V/F är lagets resultat på dessa picks, inte ett mått på individuell skicklighet.</p><p>Skade- och guldandel gynnar carryroller och fångar inte supportens hela påverkan. Det här är förberedelser, inte en säker ranking av vem som är bäst. Välj bans efter er comp och låt Draft Brain omvärdera under draften. Rutan ändrar inte er sparade banplan.</p></details>';
  }
  window.RiftRivalsThreats={summarize,render};
})();
