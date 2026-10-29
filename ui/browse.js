import { isMemorized } from "../core/store.js";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(text, action, className = "btn") {
  const node = el("button", text, className);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}

function badge(card) {
  if (card && isMemorized(card)) return el("span", "외움", "badge done");
  const stage = card?.stage || 1;
  const names = ["", "새", "빈칸", "앞글자", "백지"];
  return el("span", names[stage], `badge stage${stage}`);
}

function topicFilters(section, ctx, topic, year) {
  const chips = el("div", null, "row chips");
  ["", ...ctx.data.topics].forEach((value, index) => {
    const chip = button(value || "전체", () => ctx.go("browse", { topic: value, year }),
      `btn chip${value === topic ? " selected" : ""}`);
    chip.setAttribute("aria-pressed", String(value === topic));
    if (index) chip.style.setProperty("--chip-color", `var(--topic-${(index - 1) % 11})`);
    chips.append(chip);
  });
  section.append(chips);
}

function yearFilter(section, ctx, topic, year) {
  const label = el("label", "연도");
  const select = el("select");
  const years = [...new Set(ctx.data.items.map(item => item.year))].sort((a, b) => b - a);
  ["", ...years].forEach(value => {
    const option = el("option", value ? `${value}년` : "전체 연도");
    option.value = String(value);
    select.append(option);
  });
  select.value = year;
  select.addEventListener("change", () => ctx.go("browse", { topic, year: select.value }));
  label.append(select);
  section.append(label);
}

function questionRow(item, ctx) {
  const li = el("li");
  const link = button("", () => ctx.go("card", { queue: item.id, i: 0, mode: "one" }),
    "btn question-link");
  link.append(el("span", `${item.id} · ${item.type} · ${item.topic}`, "question-title"),
    el("span", Array.from(item.question).slice(0, 60).join("") +
      (Array.from(item.question).length > 60 ? "…" : ""), "question-preview"));
  const badges = el("span", null, "row");
  badges.append(badge(ctx.state.cards[item.id]));
  if (item.status === "초안") badges.append(el("span", "초안", "badge draft"));
  if (!item.total) badges.append(el("span", "답안 없음", "badge"));
  link.append(badges);
  li.append(link);
  return li;
}

export function render(root, ctx) {
  root.replaceChildren();
  const topic = ctx.params?.topic || "";
  const year = String(ctx.params?.year || "");
  root.append(el("h1", "문항 목록"));
  const filters = el("section", null, "panel");
  topicFilters(filters, ctx, topic, year);
  yearFilter(filters, ctx, topic, year);
  root.append(filters);
  const items = ctx.data.items.filter(item => (!topic || item.topic === topic) &&
    (!year || String(item.year) === year));
  const row = el("div", null, "row spread");
  row.append(el("p", `${items.length}개 문항`, "muted"));
  const list = el("ul", null, "question-list");
  items.forEach(item => list.append(questionRow(item, ctx)));
  root.append(row, list);
  if (!items.length) root.append(el("p", "선택한 조건에 맞는 문항이 없습니다.", "notice"));
}
