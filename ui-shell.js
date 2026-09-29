/* Shared visual shell for Riftensräksallad Draft OS. */
(function(){
  const sidebar=document.getElementById("osSidebar");
  const toggle=document.getElementById("osMobileToggle");

  function closeSidebar(){
    document.body.classList.remove("os-nav-open");
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
  document.querySelectorAll('a[href="#comps"],a[href="index.html#comps"]').forEach(link=>{
    link.addEventListener("click",e=>{
      const home=document.getElementById("startTabBtn");
      if(!home)return;
      e.preventDefault();
      home.click();
      history.replaceState(null,"",location.pathname+"#comps");
      setTimeout(()=>{
        document.getElementById("comps")?.scrollIntoView({behavior:"smooth",block:"start"});
      },40);
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

  function syncActiveNav(){
    const start=document.getElementById("startTabBtn");
    const analysis=document.getElementById("analysisTabBtn");
    const planner=document.getElementById("plannerTabBtn");
    let view="";
    if(planner?.classList.contains("active"))view="planner";
    else if(analysis?.classList.contains("active"))view="analysis";
    else if(start)view="home";
    document.querySelectorAll("[data-shell-view]").forEach(item=>{
      item.classList.toggle("active",item.dataset.shellView===view);
    });
  }

  ["startTabBtn","analysisTabBtn","plannerTabBtn"].forEach(id=>{
    document.getElementById(id)?.addEventListener("click",()=>setTimeout(syncActiveNav,0));
  });

  const topTabs=document.getElementById("homeTabs");
  if(topTabs){
    new MutationObserver(syncActiveNav).observe(topTabs,{subtree:true,attributes:true,attributeFilter:["class"]});
    syncActiveNav();
  }

  if(location.hash==="#comps"){
    setTimeout(()=>document.querySelector(".comps")?.scrollIntoView({behavior:"smooth",block:"start"}),120);
  }
})();
