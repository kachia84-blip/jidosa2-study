// textBlocks 블록을 읽기 쉬운 화면 요소로 그린다.
import { textBlocks, studyChunks } from "../core/richtext.js";
import { withIcon } from "./icons.js";

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function keyed(tag, className, block) {
  const n = node(tag, className);
  if (block.mark && block.t !== "bullet") n.append(node("span", "rt-mark", block.mark));
  if (block.key) n.append(node("span", "rt-key", block.key));
  n.append(document.createTextNode(block.s));
  return n;
}

const tint = g => (g >= 0 ? ` g${g % 5}` : "");

function appendBlocks(box, blocks) {
  let question = null;
  blocks.forEach(b => {
    if (b.t === "head") box.append(node("h3", "rt-head", withIcon(b.s)));
    else if (b.t === "chapter") box.append(node("h3", "rt-chapter", `${b.mark} ${b.s}`));
    else if (b.t === "section") box.append(node("h4", "rt-section", `${b.mark} ${b.s}`));
    else if (b.t === "group") box.append(node("h4", "rt-group" + tint(b.g ?? -1), `${b.mark} ${b.s}`));
    else if (b.t === "chips") {
      const row = node("div", "rt-chips");
      b.items.forEach((s, i) => row.append(node("span", "rt-chip" + tint(b.g?.[i] ?? -1), s)));
      box.append(row);
    } else if (b.t === "flow") {
      const row = node("div", "rt-flow");
      b.items.forEach((s, i) => {
        if (i) row.append(node("span", "rt-arrow", "→"));
        row.append(node("span", "rt-step" + tint(b.g?.[i] ?? -1), s));
      });
      box.append(row);
    } else if (b.t === "mnemonic") box.append(node("p", "rt-mnemonic", `두문자 ${b.s}`));
    else if (b.t === "term") box.append(keyed("p", "rt-term", b));
    else if (b.t === "item") box.append(keyed("p", "rt-item", b));
    else if (b.t === "sub") box.append(keyed("p", "rt-sub", b));
    else if (b.t === "bullet") box.append(keyed("p", "rt-bullet" + tint(b.g ?? -1), b));
    else if (b.t === "note") box.append(node("p", "rt-note", `※ ${b.s}`));
    else if (b.t === "q") { question = node("div", "rt-qa"); question.append(node("p", "rt-q", `Q. ${b.s}`)); box.append(question); }
    else if (b.t === "a") {
      const ans = node("details", "rt-a");
      ans.append(node("summary", null, "답 보기"), node("p", null, b.s));
      (question || box).append(ans);
    } else box.append(keyed("p", "rt-p", b));
  });
}

export function richText(text) {
  const box = node("div", "rt");
  appendBlocks(box, textBlocks(text));
  return box;
}

// 펼침 사다리: 한 칸씩 떠올려 본 뒤 눌러서 확인한다.
export function studyLadder(text) {
  const box = node("div", "rt ladder");
  const chunks = studyChunks(textBlocks(text));
  const steps = chunks.map((c, i) => {
    const part = node("div", "rt-chunk");
    appendBlocks(part, c.blocks);
    part.hidden = i > 0;
    box.append(part);
    return part;
  });
  const bar = node("div", "ladder-bar");
  const next = node("button", "btn primary ladder-next");
  const all = node("button", "btn ladder-all", "모두 펼치기");
  next.type = all.type = "button";
  let shown = 1;
  const update = () => {
    const c = chunks[shown];
    bar.hidden = !c;
    if (c) {
      next.textContent = c.rest ? "근거·암기법·셀프 테스트 보기" : `${c.label} 떠올려 보고 누르기`;
      box.append(bar);
    }
  };
  next.addEventListener("click", () => {
    steps[shown].hidden = false;
    shown++;
    update();
  });
  all.addEventListener("click", () => {
    steps.forEach(s => { s.hidden = false; });
    shown = steps.length;
    update();
  });
  bar.append(next, all);
  update();
  return box;
}
