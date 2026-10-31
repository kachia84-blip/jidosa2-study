import { loadData } from "./core/data.js";
import { loadState, saveState } from "./core/store.js";
import { parseHash, toHash, startRouter } from "./router.js";
import * as today from "./ui/today.js";
import * as card from "./ui/card.js";
import * as browse from "./ui/browse.js";
import * as stats from "./ui/stats.js";
import * as memo from "./ui/memo.js";

const VIEWS = { today, memo, card, browse, stats };
const root = document.getElementById("view");

function go(route, params = {}) {
  const hash = toHash(route, params);
  if (location.hash === hash) show(parseHash(hash));
  else location.hash = hash;
}

function markTab(route) {
  for (const a of document.querySelectorAll("nav.tabs a")) a.classList.toggle("on", a.dataset.r === route);
}

let ctxBase;
function show({ route, params }) {
  const view = VIEWS[route] || today;
  root.replaceChildren();
  markTab(route);
  window.scrollTo(0, 0);
  try {
    view.render(root, { ...ctxBase, params });
  } catch (e) {
    root.textContent = "화면 오류: " + e.message;
    console.error(e);
  }
}

async function main() {
  try {
    const data = await loadData("data/");
    const state = loadState();
    ctxBase = { data, state, save: () => saveState(state), go, now: () => Date.now() };
    startRouter(show);
  } catch (e) {
    root.textContent = "데이터를 불러오지 못했습니다: " + e.message;
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

main();
