// 복습 탭: 오늘의 공부 상한과 상관없이, 채점한 문항을 모름·애매가 잦고 오래된 순서로 계속 복습한다.
import { withIcon } from "./icons.js";
import { pickDrill } from "../core/drill.js";
import { weakRatio } from "../core/srs.js";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function render(root, ctx) {
  root.replaceChildren();
  const now = ctx.now();
  const ids = pickDrill(ctx.data.items, ctx.state, now);
  root.append(el("h1", withIcon("복습")),
    el("p", "채점한 문항을 모름·애매가 잦은 것, 오래전에 본 것부터 원하는 만큼 계속 복습해요. 오늘의 공부 복습 개수와는 따로 세요.", "muted"));
  if (!ids.length) {
    root.append(el("p", "아직 채점한 문항이 없어요. 오늘의 공부부터 해 주세요.", "notice"));
    return;
  }
  const go = button => button.addEventListener("click", () => ctx.go("card", { queue: ids.join(","), i: 0, mode: "drill" }));
  const startBtn = el("button", `복습 시작 (${ids.length}문항)`, "btn primary wide");
  startBtn.type = "button";
  go(startBtn);
  root.append(startBtn);
  const list = el("ol", null, "drill-list");
  for (const id of ids.slice(0, 10)) {
    const item = ctx.data.byId.get(id);
    const days = Math.floor((now - ctx.state.cards[id].fsrs.last) / 86_400_000);
    const weak = Math.round(weakRatio(ctx.state.log, id) * 100);
    const li = el("li");
    li.append(el("span", `${id} ${item.question.length > 34 ? item.question.slice(0, 34) + "…" : item.question}`), el("br"),
      el("span", `모름·애매 ${weak}% · ${days}일 전에 봄`, "muted"));
    list.append(li);
  }
  root.append(el("h2", "먼저 나올 문항"), list);
}
