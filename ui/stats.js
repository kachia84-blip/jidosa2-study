import { withIcon } from "./icons.js";
import { isMemorized } from "../core/store.js";
import { CONF, calibration, illusions, weakItems } from "../core/confidence.js";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function counts(items, state) {
  const result = { done: 0, learning: 0, fresh: 0, total: items.length };
  items.forEach(item => {
    const card = state.cards[item.id];
    if (card && isMemorized(card)) result.done++;
    else if (card && (card.fsrs || card.stage > 1)) result.learning++;
    else result.fresh++;
  });
  return result;
}

function ratio(count, total) {
  return total ? Math.round(count / total * 100) : 0;
}

function bar(values, label, all = true) {
  const node = el("div", null, "bar");
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", label);
  const keys = all ? ["done", "learning", "fresh"] : ["done"];
  keys.forEach(key => {
    const fill = el("div", null, `fill ${key}`);
    fill.style.width = `${values.total ? values[key] / values.total * 100 : 0}%`;
    node.append(fill);
  });
  return node;
}

function showProgress(root, ctx) {
  const totals = counts(ctx.data.items, ctx.state);
  const label = `외운 문항 ${totals.done}/${totals.total} · ${ratio(totals.done, totals.total)}%`;
  root.append(el("h1", withIcon("학습 통계")), el("p", label), bar(totals, label, false));
  const section = el("section", null, "panel");
  section.append(el("h2", "주제별 학습"), el("p", "외움 · 학습중 · 새 문항", "muted"));
  ctx.data.topics.forEach((topic, index) => {
    const values = counts(ctx.data.items.filter(item => item.topic === topic), ctx.state);
    const description = `외움 ${values.done} · 학습중 ${values.learning} · 새 ${values.fresh}`;
    const block = el("div", null, "topic-progress");
    block.style.setProperty("--progress-color", `var(--topic-${index % 11})`);
    block.append(el("h3", topic), el("p", description, "muted"),
      bar(values, `${topic}: ${description}`));
    section.append(block);
  });
  root.append(section);
}

function showCalibration(root, state) {
  const values = calibration(state);
  const section = el("section", null, "panel");
  section.append(el("h2", "확신도 보정표"),
    el("p", "정답률은 80% 이상 떠올려 통과한 기록의 비율입니다.", "muted"));
  const table = el("table");
  const head = el("thead");
  const row = el("tr");
  ["확신도", "기록", "정답률"].forEach(text => {
    const th = el("th", text);
    th.scope = "col";
    row.append(th);
  });
  head.append(row);
  const body = el("tbody");
  const labels = { sure: "확신", unsure: "애매", none: "모름" };
  CONF.forEach(conf => {
    const value = values[conf];
    const tr = el("tr");
    tr.append(el("td", labels[conf]), el("td", `${value.n}회`),
      el("td", value.n ? `${ratio(value.ok, value.n)}%` : "기록 없음"));
    body.append(tr);
  });
  table.append(head, body);
  section.append(table);
  root.append(section);
}

function cardLink(ctx, id, title, detail) {
  const li = el("li");
  const button = el("button", null, "btn question-link");
  button.type = "button";
  button.append(el("span", title, "question-title"), el("span", detail, "question-preview"));
  button.addEventListener("click", () => ctx.go("card", { queue: id, i: 0, mode: "one" }));
  li.append(button);
  return li;
}

function showIllusions(root, ctx) {
  const section = el("section", null, "panel");
  section.append(el("h2", "확신했지만 틀린 문항"));
  const list = el("ul", null, "question-list");
  illusions(ctx.state).forEach(id => {
    const item = ctx.data.byId.get(id);
    if (item) list.append(cardLink(ctx, id, `${id} · ${item.topic}`, item.question));
  });
  section.append(list.children.length ? list : el("p", "착각 문항이 없습니다.", "muted"));
  root.append(section);
}

function showWeakItems(root, ctx) {
  const section = el("section", null, "panel");
  section.append(el("h2", "자주 빠뜨리는 항목 상위 10개"));
  const list = el("ol", null, "question-list");
  weakItems(ctx.state, ctx.data.byId, 10).forEach(weak => {
    const item = ctx.data.byId.get(weak.id);
    if (!item) return;
    const label = item.parts[weak.part]?.label || "답안";
    list.append(cardLink(ctx, weak.id, `${weak.id} · ${label} · ${weak.miss}회 빠뜨림`, weak.text));
  });
  section.append(list.children.length ? list : el("p", "빠뜨린 항목 기록이 없습니다.", "muted"));
  root.append(section);
}

export function render(root, ctx) {
  root.replaceChildren();
  showProgress(root, ctx);
  showCalibration(root, ctx.state);
  showIllusions(root, ctx);
  showWeakItems(root, ctx);
}
