// 암기 탭: 풀어 본 문항마다 두문자를 맨 앞 칸에, 암기법을 펼친 채로 보여 준다.
import { memoOf, studiedItems, weakFirst } from "../core/memo.js";
import { richText } from "./rich.js";
import { withIcon } from "./icons.js";

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

// <두문자> 외우기 문장. 묶음이 여럿이면 묶음 이름을 작게 앞에 단다.
function mnemonicBox(mnemonics, subs = []) {
  const box = el("div", null, "memo-mn");
  mnemonics.forEach(m => {
    const line = el("p", null, "memo-mn-line");
    const label = subs.find(sub => m.label && sub.startsWith(m.label)) || m.label;
    if (label) line.append(el("span", label, "memo-part"));
    line.append(el("span", `<${m.mnemonic}>`, "memo-word"));
    if (m.phrase) line.append(el("span", ` ${m.phrase}`, "memo-phrase"));
    box.append(line);
  });
  return box;
}

// 문제 가리개: + 누르면 문제가 열리고, − 누르면 다시 가려진다.
function questionCover(item, open) {
  const wrap = el("div", null, "memo-cover");
  const question = el("div", null, "memo-q");
  question.append(el("p", item.question, "preserve"));
  if (item.subs?.length) {
    const subs = el("ul", null, "subquestions");
    item.subs.forEach(sub => subs.append(el("li", sub, "preserve")));
    question.append(subs);
  }
  const toggle = button("", () => set(question.hidden), "memo-toggle");
  function set(show) {
    question.hidden = !show;
    toggle.textContent = show ? "− 문제 가리기" : "+ 문제 보기";
    toggle.setAttribute("aria-expanded", String(show));
  }
  set(open);
  wrap.append(toggle, question);
  return wrap;
}

function memoCard(item, ctx) {
  const card = el("article", null, "panel memo-card");
  card.append(el("p", `${item.year}년 ${item.no}번 · ${item.topic}`, "muted"));
  const { mnemonics, method } = memoOf(item);
  if (mnemonics.length) card.append(mnemonicBox(mnemonics, item.subs));
  card.append(questionCover(item, !mnemonics.length));
  if (method) card.append(el("p", withIcon("암기법"), "memo-label"), richText(method));
  card.append(button("이 문제 다시 공부", () =>
    ctx.go("card", { queue: item.id, i: 0, mode: "one" }), "btn small"));
  return card;
}

const PAGE = 10;

// 검색어가 문제·하위 물음·분야·연도·두문자 중 하나에 들어 있으면 남긴다.
function matches(item, words) {
  const { mnemonics } = memoOf(item);
  const hay = [item.id, item.year, item.topic, item.question, ...(item.subs || []),
    ...mnemonics.flatMap(m => [m.mnemonic, m.phrase])].join(" ").toLowerCase();
  return words.every(word => hay.includes(word));
}

export function render(root, ctx) {
  root.replaceChildren(el("h1", withIcon("암기 노트")));
  const studied = studiedItems(ctx.data.items, ctx.state);
  if (!studied.length) {
    root.append(el("p", "아직 풀어 본 문제가 없어요. 오늘 탭에서 공부를 시작하면 여기에 모여요.", "notice"));
    return;
  }
  const weak = weakFirst(studied, ctx.state);
  const search = el("input", null, "memo-search");
  Object.assign(search, { type: "search", placeholder: "검색: 문제·분야·연도·두문자" });
  search.setAttribute("aria-label", "암기 노트 검색");
  const order = el("div", null, "row");
  const status = el("p", "", "muted");
  const list = el("div");
  const more = button("", () => { shown += PAGE; draw(); }, "btn wide");
  let mode = "weak", shown = PAGE;
  const modes = [["weak", "잘 모르는 순"], ["recent", "최근에 푼 순"]].map(([key, label]) => {
    const b = button(label, () => { mode = key; shown = PAGE; draw(); }, "btn small");
    b.dataset.mode = key;
    return b;
  });
  order.append(...modes);
  search.addEventListener("input", () => { shown = PAGE; draw(); });
  function draw() {
    modes.forEach(b => b.classList.toggle("primary", b.dataset.mode === mode));
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const items = (mode === "weak" ? weak : studied).filter(item => !words.length || matches(item, words));
    status.textContent = words.length
      ? `검색 결과 ${items.length}개 / 풀어 본 문제 ${studied.length}개`
      : `풀어 본 문제 ${studied.length}개 · ${mode === "weak" ? "모름·애매를 많이 누른 문제부터" : "최근에 푼 문제부터"}`;
    list.replaceChildren(...items.slice(0, shown).map(item => memoCard(item, ctx)));
    more.hidden = items.length <= shown;
    more.textContent = `더 보기 (${items.length - shown}개 남음)`;
  }
  root.append(search, order, status, list, more);
  draw();
}
