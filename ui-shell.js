/* Shared navigation shell for Riftensräksallad Draft OS.
   Active state is driven only by body[data-workspace]. */
(function(){
  const sidebar=document.getElementById("osSidebar");
  const toggle=document.getElementById("osMobileToggle");

  function closeSidebar(){
    document.body.classList.remove("os-nav-open");
  }

  function syncWorkspace(){
    const current=document.body.dataset.workspace
      ||(document.body.classList.contains("live-os")?"brain":"home");

    document.querySelectorAll(".os-sidebar .os-nav-item").forEach(item=>{
      item.classList.toggle("active",item.dataset.workspaceTarget===current);
    });
  }

  function revealPage(){
    syncWorkspace();
    document.documentElement.classList.remove("route-pending");
  }

  document.querySelectorAll("[data-shell-click]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.getElementById(btn.dataset.shellClick||"")?.click();
      closeSidebar();
    });
  });

  document.querySelectorAll("[data-shell-focus]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.getElementById(btn.dataset.shellFocus||"")?.click();
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

  new MutationObserver(syncWorkspace).observe(document.body,{
    attributes:true,
    attributeFilter:["data-workspace"]
  });

  syncWorkspace();
  queueMicrotask(revealPage);
})();
