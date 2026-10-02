/* Shared progressive champion search. Native input/Enter remains the lock action. */
window.RiftChampionPicker={attach({inputId,roster,used,rolesFor,imageFor,onSelect,hintText,takenText="upptagen",clearOnSelect=false}){
  const input=document.getElementById(inputId);if(!input)return;
  input.removeAttribute("list");
  const panel=document.createElement("div");panel.className="champion-picker hidden";
  const filter=document.createElement("select");filter.setAttribute("aria-label","Filtrera championpool på roll");
  for(const [value,label] of [["","Alla roller"],["top","Top"],["jungle","Jungle"],["mid","Mid"],["adc","ADC"],["support","Support"]]){
    const option=document.createElement("option");option.value=value;option.textContent=label;filter.appendChild(option);
  }
  const list=document.createElement("div");list.className="champion-results";
  const hint=document.createElement("small");hint.textContent=hintText||"Välj champion, tryck sedan Enter för att låsa. Rollfiltret visar kända rollpooler.";
  panel.append(filter,list,hint);input.after(panel);
  let selected=null;
  const normalize=s=>s.toLowerCase().replace(/[\s'’.-]/g,"");
  function update(){
    list.replaceChildren();
    const query=normalize(input.value),taken=used();
    const matches=roster().filter(ch=>(!filter.value||rolesFor(ch).includes(filter.value))&&normalize(ch).includes(query));
    matches.sort((a,b)=>Number(taken.has(a.toLowerCase()))-Number(taken.has(b.toLowerCase()))||a.localeCompare(b));
    for(const ch of matches.slice(0,12)){
      const button=document.createElement("button");button.type="button";
      button.disabled=taken.has(ch.toLowerCase());button.className="champion-result";
      const url=imageFor(ch);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.width=28;img.height=28;img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});button.appendChild(img);}
      const label=document.createElement("span");label.textContent=ch+(button.disabled?" · "+takenText:"");button.appendChild(label);
      button.addEventListener("click",()=>{selected=ch;input.value=ch;onSelect(ch,filter.value||null);if(clearOnSelect){input.value="";selected=null;}input.focus();panel.classList.add("hidden");});
      list.appendChild(button);
    }
    if(!matches.length)list.textContent="Ingen champion matchar sökningen.";
  }
  input.addEventListener("focus",()=>{if(selected===input.value)return;update();panel.classList.remove("hidden");});
  input.addEventListener("input",()=>{selected=null;update();panel.classList.remove("hidden");});
  filter.addEventListener("change",update);
  input.addEventListener("keydown",e=>{
    if(e.key==="Escape"){panel.classList.add("hidden");e.preventDefault();e.stopImmediatePropagation();}
    if(e.key==="ArrowDown"){list.querySelector("button:not(:disabled)")?.focus();e.preventDefault();}
    if(e.key==="Enter")panel.classList.add("hidden");
  },true);
  document.addEventListener("focusin",e=>{if(e.target!==input&&!panel.contains(e.target))panel.classList.add("hidden");});
  document.addEventListener("click",e=>{if(e.target!==input&&!panel.contains(e.target))panel.classList.add("hidden");});
}};
