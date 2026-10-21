/* Shared static ban conditions. Scores are heuristics, not win probabilities. */
((root)=>{
  root.RiftBanPolicy={
    reviewedAt:"2026-10-22",
    rules:[
      {id:"jungle-carry",role:"jungle",own:["Kindred","Graves","Viego"],bans:["Poppy","Vi","Nocturne"],points:17,planner:true,condition:"Vi har en jungle carry med Kindred/Graves/Viego",why:"Skydda vår jungle carry mot låsning och anti-dash."},
      {id:"tank-top",role:"top",own:["Malphite","Sion","Shen"],bans:["Gwen","Fiora","Trundle"],points:12,why:"Hot mot vår valda tanktop."},
      {id:"press-r",comp:"PRESS R",bans:["Janna","Milio"],points:12,planner:true,condition:"Vi har låst en PRESS R-riktning",why:"Disengage kan bryta vår gemensamma engage."},
      {id:"objective-control",comp:"OBJECTIVE CONTROL",bans:["Janna","Xerath"],points:10,planner:true,condition:"Vi har låst en OBJECTIVE CONTROL-riktning",why:"Range och reset kan störa vår objective-setup."}
    ]
  };
})(typeof window!=="undefined"?window:globalThis);
