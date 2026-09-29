/* Shared visual shell for Riftensräksallad Draft OS. */
(function(){
  const sidebar=document.getElementById("osSidebar");
  const toggle=document.getElementById("osMobileToggle");

  function closeSidebar(){
    document.body.classList.remove("os-nav-open");
  }

  function revealRoutedPage(){
    document.documentElement.classList.remove("route-pending");
    document.documentElement.style.visibility="";
  }

  document.querySelectorAll("[data-shell-click]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const target=document.getElementById(btn.dataset.shellClick||"");
      if(target)target.click();
      closeSidebar();
    });
  });

  document.querySelectorAll("[data-shell-focus]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const target=document.getElementById(btn.dataset.shellFocus||"");
      if(target){
        target.click();
        setTimeout(()=>target.scrollIntoView({behavior:"smooth",block:"center"}),40);
      }
      closeSidebar();
    });
  });

  document.querySelectorAll("[data-shell-scroll]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const target=document.querySelector(btn.dataset.shellScroll||"");
      if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
      closeSidebar();
    });
  });
  toggle?.addEventListener("click",()=>{
    document.body.classList.toggle("os-nav-open");
  });

  document.addEventListener("click",e=>{
    if(!document.body.classList.contains("os-nav-open"))return;
    if(sidebar?.contains(e.target)||toggle?.contains(e.target))return;
    closeSidebar();
  });

  function setShellActive(kind,value){
    document.querySelectorAll(".os-sidebar .os-nav-item").forEach(item=>item.classList.remove("active"));
    const selector=kind==="mode"
      ?'[data-shell-mode="'+value+'"]'
      :'[data-shell-view="'+value+'"]';
    document.querySelector(selector)?.classList.add("active");
  }

  function syncActiveNav(){
    const analysis=document.getElementById("analysisTabBtn");
    const planner=document.getElementById("plannerTabBtn");
    const comps=document.getElementById("compLibraryTabBtn");
    if(comps?.classList.contains("active"))setShellActive("view","comps");
    else if(planner?.classList.contains("active"))setShellActive("view","planner");
    else if(analysis?.classList.contains("active"))setShellActive("view","analysis");
    else setShellActive("view","home");
  }

  ["startTabBtn","analysisTabBtn","plannerTabBtn","compLibraryTabBtn"].forEach(id=>{
    document.getElementById(id)?.addEventListener("click",()=>setTimeout(syncActiveNav,0));
  });

  document.getElementById("simModeBtn")?.addEventListener("click",()=>{
    setTimeout(()=>setShellActive("mode","sim"),0);
  });
  document.getElementById("testModeBtn")?.addEventListener("click",()=>{
    setTimeout(()=>setShellActive("mode","test"),0);
  });
  document.getElementById("homeBtn")?.addEventListener("click",()=>{
    setTimeout(()=>setShellActive("view","home"),0);
  });

  const topTabs=document.getElementById("homeTabs");
  if(topTabs){
    new MutationObserver(syncActiveNav).observe(topTabs,{subtree:true,attributes:true,attributeFilter:["class"]});
    syncActiveNav();
  }

  const params=new URLSearchParams(location.search);
  const requestedOpen=params.get("open");
  const requestedView=params.get("view");
  let routed=false;

  if(requestedOpen==="sim"){
    document.getElementById("simModeBtn")?.click();
    history.replaceState(null,"",location.pathname);
    routed=true;
  }else if(requestedOpen==="test"){
    document.getElementById("testModeBtn")?.click();
    history.replaceState(null,"",location.pathname);
    routed=true;
  }else if(requestedView==="planner"){
    document.getElementById("plannerTabBtn")?.click();
    routed=true;
  }else if(requestedView==="analysis"){
    document.getElementById("analysisTabBtn")?.click();
    routed=true;
  }else if(requestedView==="comps"||location.hash==="#comps"){
    document.getElementById("compLibraryTabBtn")?.click();
    if(location.hash==="#comps")history.replaceState(null,"",location.pathname+"?view=comps");
    routed=true;
  }

  if(document.documentElement.classList.contains("route-pending")||routed){
    revealRoutedPage();
  }
})();
