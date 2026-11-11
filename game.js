/* 周遊列國 — 遊戲畫面。資料與計時在 Google Apps Script，這裡只負責顯示與送出指令。 */
const P = new URLSearchParams(location.search);
const ADMIN = P.get("admin") || "";
const SCREEN = P.get("view") === "screen";
const FLAG = c => "assets/flags/" + c + ".png";
const ORD = ["1st", "2nd", "3rd"];
const DEMO_CELL = CELLS.findIndex(c => c.code === DEMO_CODE);

let S = null, busy = false, timeOff = 0;
const PH = {};              // 檔案 id → dataURL
const loading = new Set();
const photoData = {};       // 隊伍 → 待上傳照片
let boardSig = "", adminSig = "", feedSig = "", revealSig = "", ledeSig = "";
const teamSig = ["", "", ""];

if (SCREEN) document.body.classList.add("screen");
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EMOJI = /[\p{Extended_Pictographic}‍️]/gu;
const clean = s => String(s).replace(EMOJI, "").replace(/\s+/g, " ").trim();   // 後端訊息含 emoji，畫面一律去掉

// ===== 後端呼叫（Apps Script Web App）=====
async function call(name, ...args) {
  if (!API_URL) throw new Error("API_URL 尚未設定");
  let r;
  if (name === "getState") r = await fetch(API_URL + "?fn=getState", { redirect: "follow" });
  else if (name === "getPhotos") r = await fetch(API_URL + "?fn=getPhotos&ids=" + encodeURIComponent(args[0].join(",")), { redirect: "follow" });
  else r = await fetch(API_URL, { method: "POST", body: JSON.stringify({ fn: name, args }), redirect: "follow" });
  return r.json();
}
let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.style.display = "block";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.display = "none", 2800);
}
function setState(s) { S = s; timeOff = s.now - Date.now(); }
function apply(r) {
  if (!r) return;
  if (r.state) setState(r.state);
  if (r.msg) toast(r.msg);
  render();
}
async function run(fn, ...args) {
  if (busy) return;
  busy = true;
  try { apply(await call(fn, ...args)); }
  catch (e) { toast("連線失敗，請再試一次"); }
  finally { busy = false; }
}
const host = (fn, ...args) => run(fn, ADMIN, ...args);

// ===== 棋盤 =====
function cellXY() {
  const p = [];
  for (let c = 0; c < 6; c++) p.push([c, 0]);
  for (let r = 1; r < 6; r++) p.push([5, r]);
  for (let c = 4; c >= 0; c--) p.push([c, 5]);
  for (let r = 4; r >= 1; r--) p.push([0, r]);
  return p;
}
const XY = cellXY();
const remainingMs = () => S.status === "running" ? Math.max(0, S.endsAt - (Date.now() + timeOff)) : 0;
const fmt = ms => { const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
const tname = (i, t) => `<span class="hl-${TEAMS[i].cls}">${esc(clean(t.name))}</span>`;

function ranking() {
  const order = S.teams.map((t, i) => ({ t, i })).sort((a, b) => b.t.score - a.t.score || a.i - b.i);
  const allSame = order.every(x => x.t.score === order[0].t.score);
  let rank = 0;
  return order.map((x, k) => {
    if (k === 0 || x.t.score !== order[k - 1].t.score) rank = k;
    return { ...x, label: allSame ? "–" : ORD[rank] };
  });
}

function renderBoard() {
  const rk = ranking();
  const sig = JSON.stringify([S.status, S.cells, S.teams.map(t => [t.pos, t.score]), Object.keys(PH).length, S.demoPhoto]);
  const demoOn = S.status === "lobby" && S.demoPhoto && PH[S.demoPhoto];
  if (sig === boardSig) return;
  boardSig = sig;
  let h = "";
  CELLS.forEach((c, i) => {
    const own = S.cells[i];
    const demo = demoOn && i === DEMO_CELL;
    const at = S.teams.map((t, k) => t.pos === i ? k : -1).filter(k => k >= 0);
    const img = own && PH[own.id] ? `url('${PH[own.id]}')` : demo ? `url('${PH[S.demoPhoto]}')` : `url(${FLAG(c.code)})`;
    const tc = own ? TEAMS[own.team].color : "var(--accent)";
    h += `<div class="cell ${own || demo ? "owned" : ""}" ${own ? `data-cell="${i}"` : ""} style="--tc:${tc};grid-column:${XY[i][0] + 1};grid-row:${XY[i][1] + 1};background-image:${img}">
      ${demo ? '<div class="demo-tag">示範</div>' : ""}
      <div class="num">${i + 1}</div>
      <div class="tokens">${at.map(k => `<div class="token" style="--tc:${TEAMS[k].color}"></div>`).join("")}</div>
      <div class="cap">${esc(c.name)}</div></div>`;
  });
  let mid;
  if (S.status === "lobby") mid = '<div class="tlabel">尚未開始</div><div class="timer" style="font-size:max(7cqw,24px)">等待主持人</div>';
  else if (S.status === "ended") mid = '<div class="tlabel">最終結果</div><div class="timer" style="font-size:max(8cqw,28px)">時間到</div>';
  else mid = `<div class="tlabel">剩餘時間</div><div class="timer" id="timer">${fmt(remainingMs())}</div>`;
  mid += '<div class="rank">' + rk.map(x => `<div class="rk"><span class="pos">${x.label}</span><span class="who">${tname(x.i, x.t)}</span><span class="pt">${x.t.score}</span></div>`).join("") + "</div>";
  h += `<div class="center"><div class="in">${mid}</div></div>`;
  $("board").innerHTML = h;
}

// ===== 動態 =====
function renderFeed() {
  const sig = JSON.stringify(S.log.slice(0, 5));
  if (sig === feedSig) return;
  feedSig = sig;
  const col = k => k >= 0 ? TEAMS[k].color : "var(--faint)";
  const hm = t => { const d = new Date(t + timeOff); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const list = S.log.slice(0, 5);
  $("feed").innerHTML = list.map((l, i) =>
    `<div class="ev ${i === 0 ? "first" : ""}"><span class="dot" style="background:${col(l.team)}"></span><span class="msg">${esc(clean(l.msg))}</span><time>${hm(l.t)}</time></div>`).join("")
    || (S.status === "lobby"
      ? DEMO_FEED.map((m, i) => `<div class="ev ${i === 0 ? "first" : ""}"><span class="dot" style="background:var(--accent)"></span><span class="msg">${esc(m)}</span><span class="demo">示範</span></div>`).join("")
        + '<div class="ev"><span class="dot"></span><span class="msg">等待主持人開始遊戲</span></div>'
      : '<div class="ev first"><span class="dot"></span><span class="msg">等待第一步</span></div>');
}

function renderLede() {
  const txt = S.status === "running" ? "進行中" : S.status === "ended" ? "已結束" : "尚未開始";
  if (txt === ledeSig) return;
  ledeSig = txt;
  $("lede").innerHTML = `<span class="state hl-all">${txt}</span>｜20 國 3 隊｜限時 ${S.durationMin || DEFAULT_MINUTES} 分鐘`;
}

// ===== 隊伍 =====
function diceHTML(i) {
  const off = S.status !== "running" ? "disabled" : "";
  return `<div class="dice">
    <button class="btn pri sm" ${off} data-move="${i},0">隨機</button>
    ${[1, 2, 3, 4, 5, 6].map(n => `<button class="btn n sm" ${off} data-move="${i},${n}">${n}</button>`).join("")}
</div>`;
}

function renderTeams() {
  S.teams.forEach((t, i) => {
    const sig = JSON.stringify([S.status, t.phase, t.pos, t.score, t.owned, t.name]);
    if (sig === teamSig[i]) return;
    teamSig[i] = sig; delete photoData[i];
    const c = CELLS[t.pos];
    let st;
    if (S.status === "lobby") st = '<div class="status idle">等待遊戲開始</div>';
    else if (S.status === "ended") st = '<div class="status idle">遊戲結束</div>';
    else if (t.phase === "photo") {
      st = `<div class="status go"><div class="row" style="flex-wrap:nowrap"><img class="tflag" src="${FLAG(c.code)}" alt="">
        <div>到達 <b>${esc(c.name)}</b>。找到這面國旗，<u>全隊入鏡</u>拍一張，上傳即佔領。</div></div>
        <div class="upl"><input type="file" accept="image/*" id="pin${i}" data-team="${i}">
          <img class="preview" id="pv${i}" alt="">
          <button class="btn pri" id="sb${i}" disabled data-send="${i}">上傳並佔領</button></div>
        ${ADMIN ? `<div style="margin-top:8px"><button class="btn sm" data-skip="${i}">放棄這格</button></div>` : ""}</div>`;
    } else st = '<div class="status idle">回本部找主持人擲骰</div>' + (ADMIN ? diceHTML(i) : "");
    $("tc" + i).innerHTML = `<div class="team">
      <div class="th"><h3>${tname(i, t)}</h3><span class="sc">${t.score}<small>分</small></span></div>
      <div class="meta">目前位置｜${esc(c.name)}　佔領｜${t.owned} 格</div>${st}</div>`;
  });
}

// ===== 結束後揭曉 =====
function renderReveal() {
  const sig = S.status + JSON.stringify(S.cells);
  if (sig === revealSig) return;
  revealSig = sig;
  const sec = $("reveal-sec");
  if (S.status !== "ended" || !S.reveal) { sec.hidden = true; $("reveal").innerHTML = ""; return; }
  sec.hidden = false;
  const per = S.teams.map((t, i) => {
    const mine = S.cells.map((c, k) => c && c.team === i ? k : -1).filter(k => k >= 0);
    return `<h3>${tname(i, t)}（${t.score} 分）</h3><div class="items">${mine.map(k => `<span>${esc(S.reveal[k])} <small>← ${esc(CELLS[k].name)}</small></span>`).join("") || '<span class="muted">空手</span>'}</div>`;
  }).join("");
  const all = CELLS.map((c, i) => `<div><img src="${FLAG(c.code)}" alt=""><span>${esc(c.name)} → <b>${esc(S.reveal[i])}</b></span></div>`).join("");
  $("reveal").innerHTML = `<div class="reveal"><p class="muted">每個國家背後都對應一種食材；未被佔領的留在公共食材區。</p>${per}
    <details><summary><b>20 國完整對照</b></summary><div class="all">${all}</div></details></div>`;
}

// ===== 主持人控制台 =====
function renderAdmin() {
  if (!ADMIN || SCREEN) return;
  $("admin-sec").hidden = false;
  if (!$("adminBox").firstChild) {
    $("adminBox").innerHTML = `<div class="adm"><h3>主持人</h3>
      <div class="row"><input type="number" id="admMin" value="${DEFAULT_MINUTES}" min="1"> 分鐘
        <button class="btn pri" data-adm="start">開始遊戲</button></div>
      <div class="row">
        <button class="btn sm" data-adm="minus1">−1 分鐘</button>
        <button class="btn sm" data-adm="plus1">+1 分鐘</button>
        <button class="btn sm" data-adm="plus5">+5 分鐘</button></div>
      <div class="row">剩餘 <input type="number" id="admRemain" min="1" placeholder="分鐘"> 分鐘
        <button class="btn sm" data-adm="setRemain">設定</button></div>
      <div class="row">示範照片 <input type="file" accept="image/*" id="admDemo" style="font-size:13px;max-width:200px">
        <button class="btn sm" data-adm="demo">上傳</button></div>
      <div class="row">
        <button class="btn sm" data-adm="end">結束</button>
        <button class="btn sm" data-adm="reset">重置</button></div>
      <div id="admTeams"></div></div>`;
  }
  const sig = JSON.stringify([S.teams.map(t => t.bonus), S.cells]);
  if (sig === adminSig) return;
  adminSig = sig;
  $("admTeams").innerHTML = S.teams.map((t, i) => {
    const mine = S.cells.map((c, k) => c && c.team === i ? k : -1).filter(k => k >= 0);
    return `<div class="tm"><div class="row"><b>${tname(i, t)}</b>
      <span class="hint">加減分 ${t.bonus >= 0 ? "+" : ""}${t.bonus}</span>
      <button class="btn sm" data-bonus="${i},-1">−1</button><button class="btn sm" data-bonus="${i},1">+1</button></div>
      <div>${mine.map(k => `<span class="chip">${esc(CELLS[k].name)}<button title="撤銷" data-revoke="${k}">×</button></span>`).join("") || '<span class="hint">還沒有佔領</span>'}</div></div>`;
  }).join("");
}

function render() {
  if (!S) return;
  renderLede(); renderFeed(); renderBoard(); renderTeams(); renderReveal(); renderAdmin();
  loadPhotos();
}

// ===== 打卡照（格子底圖換成佔領者的照片）=====
async function loadPhotos() {
  const need = S.cells.filter(c => c && !PH[c.id] && !loading.has(c.id)).map(c => c.id);
  if (S.status === "lobby" && S.demoPhoto && !PH[S.demoPhoto] && !loading.has(S.demoPhoto)) need.unshift(S.demoPhoto);
  if (!need.length) return;
  const batch = need.slice(0, 4);
  batch.forEach(id => loading.add(id));
  try {
    const got = await call("getPhotos", batch);
    Object.assign(PH, got);
    render();
  } catch (e) { /* 下一輪再試 */ }
  batch.forEach(id => loading.delete(id));
}

// ===== 事件 =====
document.addEventListener("click", ev => {
  const cell = ev.target.closest("[data-cell]");
  const el = ev.target.closest("button");
  if (!el && cell) {
    const own = S.cells[cell.dataset.cell];
    if (own && PH[own.id]) {
      $("modalImg").src = PH[own.id];
      $("modalCap").textContent = CELLS[cell.dataset.cell].name + "｜" + clean(S.teams[own.team].name);
      $("modal").style.display = "flex";
    }
    return;
  }
  if (!el) return;
  const d = el.dataset;
  if (d.move) { const [t, n] = d.move.split(",").map(Number); return host("moveTeam", t, n); }
  if (d.skip !== undefined) { if (confirm("確定放棄這格？（不得分）")) host("skipPhoto", Number(d.skip)); return; }
  if (d.send !== undefined) return sendPhoto(Number(d.send));
  if (d.adm) return adminDo(d.adm);
  if (d.bonus) { const [t, n] = d.bonus.split(",").map(Number); return host("adminAct", "bonus", t, n); }
  if (d.revoke !== undefined) { if (confirm("撤銷這格的佔領（-1 分）？")) host("adminAct", "revoke", Number(d.revoke)); }
});
$("modal").addEventListener("click", () => $("modal").style.display = "none");

document.addEventListener("change", async ev => {
  const inp = ev.target;
  if (!inp.id || !inp.id.startsWith("pin") || !inp.files[0]) return;
  const i = Number(inp.dataset.team);
  try {
    photoData[i] = await compress(inp.files[0]);
    const pv = $("pv" + i); pv.src = photoData[i]; pv.style.display = "block";
    $("sb" + i).disabled = false;
  } catch (e) { toast("讀取照片失敗，請換一張"); }
});

function compress(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 640 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL("image/jpeg", 0.62));
    };
    img.onerror = rej; img.src = url;
  });
}

async function sendPhoto(i) {
  if (!photoData[i] || busy) return;
  const b = $("sb" + i); b.disabled = true; b.textContent = "上傳中…";
  await run("submitPhoto", i, photoData[i]);
  const b2 = $("sb" + i);
  if (b2) { b2.disabled = false; b2.textContent = "上傳並佔領"; }
}

function adminDo(a) {
  if (a === "start") { if (confirm("開始新遊戲？（會清掉目前進度）")) host("adminAct", "start", Number($("admMin").value) || DEFAULT_MINUTES); }
  else if (a === "demo") {
    const f = $("admDemo").files[0];
    if (!f) return toast("請先選擇照片");
    toast("上傳中…");
    compress(f).then(d => host("setDemoPhoto", d)).catch(() => toast("讀取照片失敗，請換一張"));
  }
  else if (a === "minus1") host("adminAct", "extend", -1);
  else if (a === "plus1") host("adminAct", "extend", 1);
  else if (a === "plus5") host("adminAct", "extend", 5);
  else if (a === "setRemain") {
    const n = Number($("admRemain").value);
    if (!n) return toast("請輸入剩餘分鐘數");
    host("adminAct", "setRemaining", n);
  }
  else if (a === "end") { if (confirm("確定結束遊戲？")) host("adminAct", "end"); }
  else if (a === "reset") { if (confirm("重置全部進度？")) host("adminAct", "reset"); }
}

// ===== 輪詢、計時 =====
async function poll() {
  if (busy) return;
  try { setState(await call("getState")); render(); } catch (e) {}
}
if (!API_URL) {
  $("lede").innerHTML = '<span class="setup">尚未設定後端：請把 Apps Script 的 /exec 網址貼到 assets/config.js 的 API_URL。</span>';
} else {
  setInterval(poll, 3000);
  setInterval(() => {
    if (!S || S.status !== "running") return;
    const t = $("timer"); if (t) t.textContent = fmt(remainingMs());
  }, 500);
  poll();
}
