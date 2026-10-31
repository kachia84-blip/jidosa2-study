// 암기 탭: 풀어 본 문항마다 두문자를 맨 앞 칸에, 암기법을 펼친 채로 보여 준다.
import { memoOf, studiedItems } from "../core/memo.js";
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
function mnemonicBox(mnemonics) {
  const box = el("div", null, "memo-mn");
  mnemonics.forEach(m => {
    const line = el("p", null, "memo-mn-line");
    if (m.label) line.append(el("span", m.label, "memo-part"));
    line.append(el("span", `<${m.mnemonic}>`, "memo-word"));
    if (m.phrase) line.append(el("span", ` ${m.phrase}`, "memo-phrase"));
    box.append(line);
  });
  return box;
}

// 문제 가리개: + 누르면 문제가 열리고, − 누르면 다시 가려진다.
function questionCover(item, open) {
  const wrap = el("div", null, "memo-cover");
  const question = el("p", item.question, "memo-q preserve");
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
  if (mnemonics.length) card.append(mnemonicBox(mnemonics));
  card.append(questionCover(item, !mnemonics.length));
  if (method) card.append(el("p", withIcon("암기법"), "memo-label"), richText(method));
  card.append(button("이 문제 다시 공부", () =>
    ctx.go("card", { queue: item.id, i: 0, mode: "one" }), "btn small"));
  return card;
}

export function render(root, ctx) {
  root.replaceChildren(el("h1", withIcon("암기 노트")));
  const items = studiedItems(ctx.data.items, ctx.state);
  if (!items.length) {
    root.append(el("p", "아직 풀어 본 문제가 없어요. 오늘 탭에서 공부를 시작하면 여기에 모여요.", "notice"));
    return;
  }
  root.append(el("p", `풀어 본 문제 ${items.length}개 · 최근에 푼 순서`, "muted"));
  items.forEach(item => root.append(memoCard(item, ctx)));
}
