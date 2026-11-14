/* 共用：頁首、頁尾、左側目錄、右側短線導覽，以及從試算表讀取文案。 */
(function () {
  const cur = document.body.dataset.page || "";
  const PAGES = [["index.html", "home", "首頁"], ["nov.html", "nov", "11 月"], ["sep.html", "sep", "9 月"], ["aug.html", "aug", "8 月"], ["jul.html", "jul", "7 月"]];
  const top = document.createElement("header");
  top.className = "top";
  top.innerHTML = '<div class="in"><a class="brand" href="index.html"><b>Faith 區</b>　分區聚會</a><nav class="nav" aria-label="主選單">' +
    PAGES.map(([h, k, t]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ""}>${t}</a>`).join("") + "</nav></div>";
  document.body.prepend(top);
  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML = '<div class="in"><span data-k="site.foot">Faith 區｜2026 下半年 分區聚會</span></div>';
  document.body.appendChild(foot);
  buildIndex(); buildRail(); loadContent();
})();

/* ===== 文案：試算表「修改後」欄有填的才覆蓋 ===== */
function fmtText(t) {
  const esc = String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return esc.replace(/【([^】]*)】/g, '<span class="em">$1</span>').replace(/\r?\n/g, "<br>");
}
function applyContent(map) {
  if (!map) return;
  document.querySelectorAll("[data-k]").forEach(el => {
    const v = map[el.dataset.k];
    if (typeof v === "string" && v.trim() !== "") el.innerHTML = fmtText(v);
  });
  const pin = map._pin;
  document.querySelectorAll("[data-pin]").forEach(el => { el.hidden = /^(否|no|n|關|0|false)$/i.test(String(pin || "").trim()); });
  document.querySelectorAll("[data-plan]").forEach(el => {
    const u = String(map["_plan." + el.dataset.plan] || "").trim();
    if (/^https?:\/\//.test(u)) { el.href = u; el.hidden = false; }
  });
  window.dispatchEvent(new Event("content"));
}
function loadContent() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem("content") || "null"); } catch (e) {}
  if (cached) applyContent(cached);
  if (typeof API_URL === "undefined" || !API_URL) return;
  fetch(API_URL + "?fn=getContent", { redirect: "follow" }).then(r => r.json()).then(res => {
    if (!res || !res.ok || !res.content) return;
    try { localStorage.setItem("content", JSON.stringify(res.content)); } catch (e) {}
    if (JSON.stringify(res.content) !== JSON.stringify(cached)) applyContent(res.content);
  }).catch(() => {});
}

/* ===== 左側目錄：本頁各段（寬螢幕） ===== */
function buildIndex() {
  const secs = [...document.querySelectorAll(".main .sec")].filter(s => s.querySelector(":scope > h2") && !s.hidden);
  const page = document.querySelector(".page");
  if (secs.length < 3 || !page) return;
  const nav = document.createElement("nav");
  nav.className = "lidx"; nav.setAttribute("aria-label", "本頁目錄");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const links = secs.map((s, i) => {
    const a = document.createElement("a"); a.href = "#";
    a.innerHTML = `<span class="n">${String(i + 1).padStart(2, "0")}</span><span class="t"></span>`;
    a.onclick = e => { e.preventDefault(); s.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); };
    nav.appendChild(a); return [s, a];
  });
  const label = () => links.forEach(([s, a]) => { a.querySelector(".t").textContent = s.querySelector(":scope > h2").textContent.replace(/\s+/g, " ").trim(); });
  label(); addEventListener("content", label);
  page.prepend(nav);
  const mark = () => {
    let k = 0; links.forEach(([s], i) => { if (s.getBoundingClientRect().top < 160) k = i; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) k = links.length - 1;
    links.forEach(([, a], i) => a.classList.toggle("on", i === k));
  };
  addEventListener("scroll", mark, { passive: true }); addEventListener("resize", mark); mark();
}

/* ===== 右側短線導覽：一段一條，滑過顯示標題 ===== */
function buildRail() {
  const secs = [...document.querySelectorAll(".main .sec")].filter(s => s.querySelector(":scope > h2") && !s.hidden);
  if (secs.length < 3) return;
  const rail = document.createElement("nav");
  rail.className = "rail"; rail.setAttribute("aria-label", "本頁段落");
  const pop = document.createElement("div"); pop.className = "rail-pop";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = secs.map(s => {
    const go = e => { e.preventDefault(); s.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); };
    const b = document.createElement("button"); b.type = "button"; b.onclick = go; rail.appendChild(b);
    const a = document.createElement("a"); a.href = "#"; a.onclick = go; pop.appendChild(a);
    return [s, b, a];
  });
  const label = () => items.forEach(([s, b, a]) => { const t = s.querySelector(":scope > h2").textContent.replace(/\s+/g, " ").trim(); b.setAttribute("aria-label", t); a.textContent = t; });
  label(); addEventListener("content", label);
  rail.appendChild(pop); document.body.appendChild(rail);
  const mark = () => {
    let k = 0; items.forEach(([s], i) => { if (s.getBoundingClientRect().top < 160) k = i; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) k = items.length - 1;
    items.forEach(([, b, a], i) => { b.classList.toggle("on", i === k); a.classList.toggle("on", i === k); });
  };
  addEventListener("scroll", mark, { passive: true }); addEventListener("resize", mark); mark();
}
