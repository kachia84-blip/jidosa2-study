import { dayKey, getCard } from "../core/store.js";
import { gradeOf, nextStage, review } from "../core/srs.js";
import { countHint, maskPart } from "../core/mask.js";
import { CONF, recordResult } from "../core/confidence.js";

const STAGES = ["", "보기", "빈칸", "앞글자", "백지"];
const CONF_LABELS = { sure: "확신", unsure: "애매", none: "모름" };

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

function disclosure(label, text) {
  const details = el("details");
  details.append(el("summary", label), el("p", text, "preserve"));
  return details;
}

function createSession(ctx) {
  const queue = String(ctx.params?.queue || "").split(",").filter(id => ctx.data.byId.has(id));
  const index = Math.max(0, Number.parseInt(ctx.params?.i, 10) || 0);
  const one = ctx.params?.mode === "one";
  return {
    queue: one ? queue.slice(index, index + 1) : queue,
    index: one ? 0 : index,
    one, passed: 0, total: 0, started: ctx.now(),
  };
}

function showHeader(view, session, item, card) {
  view.append(el("p", `${session.index + 1} / ${session.queue.length}`, "muted"),
    el("p", `${item.year}년 · ${item.round}회 · ${item.no}번 · ${item.points}점`, "muted"));
  const row = el("div", null, "row");
  row.append(el("span", item.type, "badge"), el("span", item.topic, "badge"),
    el("span", `단계 ${card.stage} ${STAGES[card.stage]}`, `badge stage${card.stage}`));
  if (item.status === "초안") row.append(el("span", "초안·확인 필요", "badge draft"));
  view.append(row, el("h1", item.question, "question preserve"));
  if (item.subs?.length) {
    const subs = el("ul", null, "subquestions");
    item.subs.forEach(sub => subs.append(el("li", sub, "preserve")));
    view.append(subs);
  }
  if (item.note) view.append(disclosure("메모", item.note));
}

function appendBasis(parent, part) {
  if (!part.basis && !part.verified) return;
  const details = el("details", null, "basis");
  details.append(el("summary", "근거"));
  if (part.basis) details.append(el("p", part.basis, "preserve"));
  if (part.verified) details.append(el("span", "원문 확인", "badge"));
  parent.append(details);
}

// 두문자·외우기 문장·이야기. open=false면 힌트처럼 눌러야 보인다.
function appendAids(parent, part, open, hideMnemonic = false) {
  if (part.mnemonic && hideMnemonic) {
    parent.append(disclosure("두문자 힌트", [part.mnemonic, part.phrase].filter(Boolean).join(" / ")));
  } else if (part.mnemonic) {
    const box = el("div", null, "mnemonic");
    box.append(el("p", `두문자: ${part.mnemonic}`));
    if (part.phrase) box.append(open ? el("p", part.phrase, "phrase") : disclosure("외우기 문장", part.phrase));
    parent.append(box);
  }
  if (part.story) {
    const details = disclosure("현장 이야기", part.story);
    details.className = "story";
    details.open = open;
    parent.append(details);
  }
}

function appendOutline(container, item, key, open) {
  const text = item.outline?.[key];
  if (!text) return;
  const details = disclosure(key === "intro" ? "서론 한 줄" : "결론 한 줄", text);
  details.className = "outline";
  details.open = open;
  container.append(details);
}

// 쉬운 풀이(초보용 설명)와 모범 답안(답안지에 옮겨 쓸 글).
function appendWritten(container, item, easyOpen) {
  if (item.easy) {
    const easy = disclosure("쉬운 풀이", item.easy);
    easy.className = "written";
    easy.open = easyOpen;
    container.append(easy);
  }
  if (item.model) {
    const model = disclosure("모범 답안", item.model);
    model.className = "written";
    container.append(model);
  }
}

function recallToggle(key, missed) {
  const toggle = button("떠올림", () => {
    if (missed.has(key)) missed.delete(key);
    else missed.add(key);
    const forgotten = missed.has(key);
    toggle.textContent = forgotten ? "못 떠올림" : "떠올림";
    toggle.classList.toggle("danger", forgotten);
    toggle.setAttribute("aria-pressed", String(!forgotten));
  }, "btn recall-toggle");
  toggle.setAttribute("aria-label", "이 항목을 떠올렸는지 선택");
  toggle.setAttribute("aria-pressed", "true");
  return toggle;
}

function fullAnswers(container, item, missed = null, easyOpen = false) {
  appendOutline(container, item, "intro", true);
  item.parts.forEach((part, partIndex) => {
    const section = el("section", null, "answer-part");
    if (part.label) section.append(el("h2", part.label));
    const list = el("ol", null, "answer-list");
    part.items.forEach((answer, itemIndex) => {
      const li = el("li");
      li.append(el("p", answer.text, "preserve"));
      if (missed) li.append(recallToggle(`${partIndex}:${itemIndex}`, missed));
      list.append(li);
    });
    section.append(list);
    appendAids(section, part, true);
    appendBasis(section, part);
    container.append(section);
  });
  appendOutline(container, item, "outro", true);
  appendWritten(container, item, easyOpen);
}

function hole(segment) {
  const node = button("\u00a0", () => {
    const open = node.classList.toggle("open");
    node.textContent = open ? segment.s : "\u00a0";
    node.setAttribute("aria-expanded", String(open));
    node.setAttribute("aria-label", open ? "공개한 빈칸 닫기" : "빈칸 공개");
  }, "hole");
  node.style.setProperty("--hole-size", `${Math.max(2, Math.min(22, Array.from(segment.s).length))}ch`);
  node.setAttribute("aria-expanded", "false");
  node.setAttribute("aria-label", "빈칸 공개");
  return node;
}

function maskedAnswers(container, item, stage) {
  if (stage === 4) container.append(el("p", `${item.total}가지를 모두 떠올려 보세요.`, "notice"));
  appendOutline(container, item, "intro", false);
  item.parts.forEach(part => {
    const masked = maskPart(part, stage);
    const section = el("section", null, "answer-part");
    if (masked.label) section.append(el("h2", masked.label));
    if (stage !== 4) {
      const list = el("ol", null, "answer-list");
      masked.lines.forEach(segments => {
        const line = el("li", null, "preserve");
        segments.forEach(segment => line.append(segment.t === "hole" ? hole(segment) :
          el("span", segment.s, segment.t === "hint" ? "hint" : "")));
        list.append(line);
      });
      section.append(list);
    }
    appendAids(section, part, false, !masked.mnemonic);
    container.append(section);
  });
  appendOutline(container, item, "outro", false);
}

function showSummary(root, ctx, session) {
  const elapsed = Math.max(0, Math.floor((ctx.now() - session.started) / 1000));
  root.replaceChildren(el("h1", "공부를 마쳤어요"),
    el("p", `통과 ${session.passed} / 전체 ${session.total}`),
    el("p", `걸린 시간 ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`, "muted"),
    el("p", "10~15분 했으면 5분 쉬세요.", "notice"),
    button("오늘로", () => ctx.go("today", {}), "btn primary"));
}

function advance(root, ctx, session) {
  session.index++;
  if (session.index < session.queue.length) showCard(root, ctx, session);
  else if (session.one) ctx.go("browse", {});
  else showSummary(root, ctx, session);
}

function finishReading(root, ctx, session, item, card, action, status) {
  action.disabled = true;
  const previousDaily = ctx.state.daily;
  const previousStage = card.stage;
  const today = dayKey(ctx.now());
  card.stage = 2;
  ctx.state.daily = {
    date: today,
    newDone: (previousDaily.date === today ? previousDaily.newDone : 0) + 1,
  };
  try {
    ctx.save();
    session.queue.push(item.id);
    advance(root, ctx, session);
  } catch {
    card.stage = previousStage;
    ctx.state.daily = previousDaily;
    action.disabled = false;
    status.textContent = "저장하지 못했습니다. 다시 눌러 주세요.";
  }
}

function showReading(container, root, ctx, session, item, card) {
  container.replaceChildren(el("h2", "단계 1 보기"));
  fullAnswers(container, item, null, true);
  const status = el("p", "", "muted");
  status.setAttribute("role", "status");
  const action = button("다 읽었어요", () =>
    finishReading(root, ctx, session, item, card, action, status), "btn primary wide");
  container.append(action, status);
}

function showPretest(container, root, ctx, session, item, card) {
  const count = countHint(item.question) ?? item.total;
  container.append(el("p", `몇 가지 떠오르나요? ${count}가지를 떠올려 보세요.`, "notice"));
  const timer = el("p", "10초", "countdown");
  let active = true;
  let timeout;
  const reveal = () => {
    if (!active || !root.contains(timer)) return;
    active = false;
    clearTimeout(timeout);
    showReading(container, root, ctx, session, item, card);
  };
  container.append(timer, button("답 보기", reveal, "btn primary wide"));
  const deadline = Date.now() + 10000;
  function tick() {
    if (!active || !root.contains(timer)) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    timer.textContent = `${remaining}초`;
    if (!remaining) reveal();
    else timeout = setTimeout(tick, 250);
  }
  tick();
}

function resultText(card, passed, now, recalled, total) {
  const days = Math.max(1, Math.round((card.fsrs.due - now) / 86400000));
  return `${passed ? "통과!" : "다시 연습해요."} ${recalled}/${total} · 다음 복습 ${days}일 뒤 · 단계 ${card.stage} ${STAGES[card.stage]}`;
}

function score(root, ctx, session, item, card, conf, missed, container, action, status) {
  action.disabled = true;
  const recalled = item.total - missed.size;
  const grade = gradeOf(recalled, item.total, conf);
  const passed = recalled / item.total >= 0.8;
  const now = ctx.now();
  const stage = card.stage;
  const previous = JSON.parse(JSON.stringify(ctx.state));
  try {
    card.fsrs = review(card.fsrs, grade, now, ctx.state.settings.retention);
    card.stage = nextStage(stage, passed);
    recordResult(ctx.state, item.id, { stage, recalled, total: item.total,
      conf, passed, missed: [...missed] }, now);
    ctx.save();
  } catch {
    Object.assign(ctx.state, previous);
    status.textContent = "학습 결과를 저장하지 못했습니다. 다시 채점해 주세요.";
    action.disabled = false;
    return;
  }
  session.total++;
  if (passed) session.passed++;
  container.replaceChildren(el("p", resultText(card, passed, now, recalled, item.total), "notice"),
    button("다음", () => advance(root, ctx, session), "btn primary wide"));
}

function showGrading(container, root, ctx, session, item, card, conf) {
  container.replaceChildren(el("h2", "떠올린 항목을 확인해 주세요"),
    el("p", "떠올리지 못한 항목은 눌러서 ‘못 떠올림’으로 바꾸세요.", "muted"));
  const missed = new Set();
  fullAnswers(container, item, missed);
  const status = el("p", "", "muted");
  status.setAttribute("role", "status");
  const action = button("채점", () => score(root, ctx, session, item,
    getCard(ctx.state, item.id), conf, missed, container, action, status), "btn primary wide");
  container.append(action, status);
}

function showRecall(container, root, ctx, session, item, card, conf) {
  container.replaceChildren(el("p", `확신도: ${CONF_LABELS[conf]}`, "muted"));
  maskedAnswers(container, item, Math.max(2, card.stage));
  container.append(button("답 확인", () =>
    showGrading(container, root, ctx, session, item, card, conf), "btn primary wide"));
}

function showConfidence(container, root, ctx, session, item, card) {
  container.append(el("h2", "얼마나 확신하나요?"),
    el("p", "답안을 보기 전에 지금의 확신도를 선택해 주세요.", "muted"));
  const row = el("div", null, "row confidence");
  CONF.forEach(conf => row.append(button(CONF_LABELS[conf], () =>
    showRecall(container, root, ctx, session, item, card, conf))));
  container.append(row);
}

function showCard(root, ctx, session) {
  if (session.index >= session.queue.length) {
    showSummary(root, ctx, session);
    return;
  }
  const item = ctx.data.byId.get(session.queue[session.index]);
  const card = getCard(ctx.state, item.id);
  const view = el("article", null, "study-card");
  root.replaceChildren(view);
  showHeader(view, session, item, card);
  const container = el("section", null, "study-content");
  view.append(container);
  if (!item.total) {
    container.append(el("p", "아직 답안이 없습니다. 이 문항은 채점하지 않습니다.", "notice"),
      button("다음", () => advance(root, ctx, session), "btn primary"));
  } else if (!card.fsrs && card.stage === 1) {
    showPretest(container, root, ctx, session, item, card);
  } else {
    showConfidence(container, root, ctx, session, item, card);
  }
}

export function render(root, ctx) {
  root.replaceChildren();
  showCard(root, ctx, createSession(ctx));
}
