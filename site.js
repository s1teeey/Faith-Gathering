/* 共用：頁首、外觀切換、頁尾。 */
(function(){
  const here=(location.pathname.split("/").pop()||"index.html");
  const root=document.documentElement;
  try{const t=localStorage.getItem("theme");if(t==="light"||t==="dark")root.dataset.theme=t}catch(e){}
  const PAGES=[["index.html","遊戲"],["rules.html","規則"]];
  let theme="";try{theme=localStorage.getItem("theme")||""}catch(e){}
  const ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>';
  const opts=(k,cur,list)=>'<div class="opts" data-k="'+k+'">'+list.map(([v,t])=>'<button type="button" data-v="'+v+'" aria-pressed="'+(cur===v)+'"><span class="hl-all">'+t+'</span></button>').join("")+'</div>';
  const bar=document.createElement("header");bar.className="topbar";
  bar.innerHTML='<div class="wrap'+(document.body.dataset.wide?' wide':'')+'"><a class="brand" href="index.html"><span>周遊列國</span>｜Nov_Faith</a>'+
    '<nav class="menu" aria-label="主選單">'+PAGES.map(([h,t])=>'<a href="'+h+'"'+(h===here||(here==="index.html"&&h==="index.html")?' aria-current="page"':"")+'>'+t+'</a>').join("")+'</nav>'+
    '<div class="prefs"><button class="prefs-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="顯示設定" title="顯示設定">'+ICON+'</button>'+
    '<div class="prefs-pop"><p class="grp">外觀</p>'+opts("theme",theme,[["","跟隨系統"],["light","淺色"],["dark","深色"]])+'</div></div></div>';
  document.body.prepend(bar);
  const prefs=bar.querySelector(".prefs"),pbtn=bar.querySelector(".prefs-btn");
  pbtn.onclick=()=>{const o=!prefs.classList.contains("open");prefs.classList.toggle("open",o);pbtn.setAttribute("aria-expanded",String(o))};
  document.addEventListener("click",e=>{if(!prefs.contains(e.target)){prefs.classList.remove("open");pbtn.setAttribute("aria-expanded","false")}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){prefs.classList.remove("open");pbtn.setAttribute("aria-expanded","false")}});
  bar.querySelectorAll('.opts[data-k="theme"] button').forEach(b=>b.onclick=()=>{
    const v=b.dataset.v;try{v?localStorage.setItem("theme",v):localStorage.removeItem("theme")}catch(e){}
    if(v)root.dataset.theme=v;else delete root.dataset.theme;
    bar.querySelectorAll('.opts[data-k="theme"] button').forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  });
  const foot=document.createElement("footer");foot.className="foot";
  foot.innerHTML='<div class="wrap'+(document.body.dataset.wide?' wide':'')+'"><span>分區聚會｜上半場</span><span>周遊列國 Nov_Faith</span></div>';
  document.body.appendChild(foot);
  buildRail();buildIndex();
})();

/* Side outline: one dash per heading on the page; hover lists them, click jumps. */
function buildRail(){
  const SEL="main h2, main .card h3.name, main .own h3, main .src-year > .yr, main .src-past h3";
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rail=document.querySelector(".rail");
  if(!rail){rail=document.createElement("nav");rail.className="rail";rail.setAttribute("aria-label","本頁段落");document.body.appendChild(rail)}
  let items=[];
  const label=e=>{
    const c=e.cloneNode(true);c.querySelectorAll(".today").forEach(x=>x.remove());
    const no=c.querySelector(".no");if(no)no.textContent=no.textContent+" ";
    let t=c.textContent.replace(/\s+/g," ").trim();
    if(e.matches(".src-year > .yr"))t+=" 學年度心得";
    return t;
  };
  function draw(){
    items=[...document.querySelectorAll(SEL)].filter(e=>e.offsetParent!==null&&!e.closest("aside"));
    rail.innerHTML="";
    if(items.length<3){rail.hidden=true;return}
    rail.hidden=false;
    const pop=document.createElement("div");pop.className="rail-pop";
    items.forEach((e,i)=>{
      const target=e.closest(".card,.src-year,.own")||e;
      const go=ev=>{ev.preventDefault();target.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"})};
      const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",label(e));b.onclick=go;rail.appendChild(b);
      const a=document.createElement("a");a.href="#";a.textContent=label(e);a.onclick=go;
      if(e.matches(".card h3.name, .src-year > .yr"))a.className="sub";
      pop.appendChild(a);
    });
    rail.appendChild(pop);
    mark();
  }
  function mark(){
    if(!items.length)return;
    let k=0;items.forEach((e,i)=>{if(e.getBoundingClientRect().top<140)k=i});
    rail.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("on",i===k));
    rail.querySelectorAll(".rail-pop a").forEach((a,i)=>a.classList.toggle("on",i===k));
  }
  let tm;const later=()=>{clearTimeout(tm);tm=setTimeout(draw,120)};
  const main=document.querySelector("main");
  if(main)new MutationObserver(later).observe(main,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
  addEventListener("scroll",mark,{passive:true});addEventListener("resize",later);
  draw();
}


/* Left index: the numbered sections (01 02 03…) of the page, current one marked. */
function buildIndex(){
  const heads=[...document.querySelectorAll("main h2")].filter(h=>h.querySelector(".no")&&!h.closest("aside"));
  if(heads.length<2)return;
  const nav=document.createElement("nav");nav.className="lidx";nav.setAttribute("aria-label","本頁目錄");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const links=heads.map(h=>{
    const sec=h.closest("section")||h;
    const a=document.createElement("a");a.href=sec.id?"#"+sec.id:"#";
    const no=h.querySelector(".no").textContent.trim();
    const t=h.textContent.replace(no,"").replace(/\s+/g," ").trim();
    a.innerHTML='<span class="n">'+no+'</span><span class="t"></span>';a.querySelector(".t").textContent=t;
    a.onclick=e=>{e.preventDefault();sec.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"})};
    nav.appendChild(a);return [sec,a];
  });
  document.body.appendChild(nav);
  const mark=()=>{
    let k=0;links.forEach(([sec],i)=>{if(sec.getBoundingClientRect().top<160)k=i});
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)k=links.length-1;
    links.forEach(([,a],i)=>a.classList.toggle("on",i===k));
    links.forEach(([sec,a])=>{a.hidden=sec.offsetParent===null});
  };
  addEventListener("scroll",mark,{passive:true});addEventListener("resize",mark);mark();
}
