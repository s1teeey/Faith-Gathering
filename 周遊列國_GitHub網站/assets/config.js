/* 部署 Google Apps Script 後，把 /exec 網址貼在這裡。 */
const API_URL = "https://script.google.com/macros/s/AKfycbzvOdZbjX4cMzI6bx0j5DE-U-BB6W1OcH5xxkEO-N1I6Lv_lqVyuRGRa_4Y5sHJzRoV/exec";

/* 遊戲開始前，動態區顯示的示範訊息（新的在上面） */
const DEMO_FEED = [
  "鵬瑞 攻佔 Australia！",
  "鵬瑞 擲出 3，前進到 Australia"
];
/* 示範照片顯示在哪一格（國家代碼）；照片在主持人控制台上傳 */
const DEMO_CODE = "au";
const DEFAULT_MINUTES = 25;

/* 順序 = 棋盤格號 1~20（順時針） */
const CELLS = [
  ["tw","Taiwan"],["jp","Japan"],["kr","South Korea"],["th","Thailand"],["sg","Singapore"],
  ["in","India"],["au","Australia"],["tr","Turkey"],["us","USA"],["ca","Canada"],
  ["mx","Mexico"],["br","Brazil"],["ar","Argentina"],["es","Spain"],["fr","France"],
  ["it","Italy"],["de","Germany"],["nl","Netherlands"],["gb","UK"],["be","Belgium"]
].map(([code,name])=>({code,name}));
/* 隊伍顏色與起點（起點需與 Code.gs 的 TEAMS 一致） */
const TEAMS = [
  { color:"#5E86C7", cls:"t0" },
  { color:"#E3B84F", cls:"t1" },
  { color:"#6BAA82", cls:"t2" }
];
