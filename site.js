/* 共用頁首與頁尾。每頁的 <body data-page="…"> 決定目前選單。 */
(function () {
  const cur = document.body.dataset.page || "";
  const PAGES = [["index.html", "home", "首頁"], ["jul.html", "jul", "7 月"], ["aug.html", "aug", "8 月"], ["sep.html", "sep", "9 月"], ["nov.html", "nov", "11 月"], ["game.html", "game", "遊戲"]];
  const top = document.createElement("header");
  top.className = "top";
  top.innerHTML = '<div class="in"><a class="brand" href="index.html"><b>Faith 區</b>　分區聚會</a><nav class="nav" aria-label="主選單">' +
    PAGES.map(([h, k, t]) => `<a href="${h}"${k === cur ? ' aria-current="page"' : ""}>${t}</a>`).join("") + "</nav></div>";
  document.body.prepend(top);
  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML = '<div class="in"><span>Faith 區｜分區聚會</span><span>2026 年 7 月至 11 月活動紀錄</span></div>';
  document.body.appendChild(foot);
})();
