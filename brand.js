(() => {
  fetch("assets/logo.b64", {cache:"force-cache"})
    .then(r=>r.text())
    .then(b64=>{
      document.querySelectorAll(".team-logo").forEach(img=>{
        img.src="data:image/png;base64,"+b64.trim();
        img.hidden=false;
      });
    })
    .catch(()=>{});
})();