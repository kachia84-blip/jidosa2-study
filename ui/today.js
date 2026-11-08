import { withIcon } from "./icons.js";
import { dayKey, exportState, importState, isMemorized } from "../core/store.js";
import { pickToday, reviewCap } from "../core/srs.js";
import { illusions } from "../core/confidence.js";
import { showSchedule } from "./schedule.js";

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

function start(ctx, ids) {
  ctx.go("card", { queue: ids.join(","), i: 0, mode: "review" });
}

function extraFresh(ctx, now) {
  const state = {
    ...ctx.state,
    settings: { ...ctx.state.settings, newPerDay: 5 },
    daily: { date: dayKey(now), newDone: 0 },
  };
  return pickToday(ctx.data.items, state, now).fresh;
}

// 오늘 푸는 순서: 복습 → 읽은 문제 확인 → 새 문제 읽기(새 문제는 읽고 나면 이번 공부 끝에 한 번 더 확인).
function steps(today) {
  const list = el("ol", null, "steps");
  [["1", "복습", today.due.length, today.dueTotal > today.due.length
    ? `밀린 ${today.dueTotal}개 중 모름·애매가 잦은 문제부터`
    : "기억이 흐려질 때가 된 문제"],
    ["2", "읽은 문제 확인", today.started.length, "읽기만 하고 아직 채점 안 한 문제"],
    ["3", "새 문제 읽기", today.fresh.length, "처음 보는 문제, 읽고 나면 끝에서 다시 확인"]]
    .forEach(([n, name, k, why]) => {
      const li = el("li", null, k ? "" : "zero");
      const text = el("span");
      text.append(el("span", `${name} ${k}개`, "step-name"), el("br"), el("span", why, "muted"));
      li.append(el("span", n, "step-n"), text);
      list.append(li);
    });
  return list;
}

// 오늘 할 일을 다 끝낸 날을 1번으로 센다(하루 한 번만). 10번마다 하루 복습 상한이 1개씩 늘어난다.
function countRound(ctx, now) {
  const day = dayKey(now);
  const rounds = ctx.state.rounds ?? { n: 0, last: "" };
  const daily = ctx.state.daily;
  const studied = ctx.state.log.some(entry => dayKey(entry.t) === day)
    || (daily.date === day && (daily.newDone > 0 || daily.reviewDone > 0));
  if (!studied || rounds.last === day) return;
  ctx.state.rounds = { n: rounds.n + 1, last: day };
  try { ctx.save(); } catch { ctx.state.rounds = rounds; }
}

function roundNote(ctx) {
  const n = ctx.state.rounds?.n ?? 0;
  const cap = reviewCap(n);
  const next = Math.max(20, (Math.floor(n / 10) + 1) * 10);
  return `오늘의 학습 ${n}번 끝냄 · 하루 복습 최대 ${cap}개`
    + (cap < 10 ? ` (${next}번이면 ${cap + 1}개)` : "");
}

function showOverview(root, ctx, today, now) {
  const date = new Date(now).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  root.append(el("p", date, "muted"), el("h1", withIcon("오늘의 공부")));
  const count = ctx.data.items.filter(item => {
    const card = ctx.state.cards[item.id];
    return card && isMemorized(card);
  }).length;
  root.append(steps(today), el("p", `외운 문항 ${count}/126`, "muted"), el("p", roundNote(ctx), "muted"));
  const queue = [...today.due, ...today.started, ...today.fresh];
  if (queue.length) {
    const label = today.started.length || ctx.state.daily.newDone ? "이어서 공부하기" : "오늘 공부 시작";
    root.append(button(label, () => start(ctx, queue), "btn primary wide"));
    return;
  }
  countRound(ctx, now);
  root.append(el("p", "오늘 할 일 끝", "notice"));
  const more = extraFresh(ctx, now);
  const add = button("새 문항 더 하기", () => start(ctx, more), "btn primary wide");
  add.disabled = more.length === 0;
  root.append(add);
  if (!more.length) root.append(el("p", "추가할 새 문항이 없습니다.", "muted"));
}

function showIllusions(root, ctx) {
  const ids = illusions(ctx.state).filter(id => ctx.data.byId.has(id));
  if (!ids.length) return;
  const box = el("section", null, "alert");
  box.append(el("h2", `확신했지만 틀린 문항 ${ids.length}개`),
    el("p", "착각 문항을 다시 떠올려 보세요."),
    button("먼저 복습", () => start(ctx, ids), "btn danger"));
  root.append(box);
}

function download(ctx, status) {
  let url;
  try {
    const blob = new Blob([exportState(ctx.state)], { type: "text/plain;charset=utf-8" });
    url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = `지도사2차-학습기록-${dayKey(ctx.now())}.json`;
    link.hidden = true;
    status.parentElement.append(link);
    link.click();
    link.remove();
    status.textContent = "학습 기록을 내보냈습니다.";
  } catch {
    status.textContent = "내보내지 못했습니다. 다시 시도해 주세요.";
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function restore(file, root, ctx, status) {
  if (!file) return;
  try {
    const state = importState(await file.text());
    if (!root.contains(status)) return;
    // save가 참조하는 기존 state 객체를 유지한다.
    const previous = { ...ctx.state };
    Object.assign(ctx.state, state);
    try {
      ctx.save();
    } catch (error) {
      Object.assign(ctx.state, previous);
      throw error;
    }
    render(root, ctx);
    root.append(el("p", "학습 기록을 가져왔습니다.", "notice"));
  } catch {
    status.textContent = "가져오지 못했습니다. 학습 기록 파일과 저장 공간을 확인해 주세요.";
  }
}

function showSettings(root, ctx) {
  const section = el("section", null, "panel");
  const label = el("label", "하루 새 문항 수");
  const input = el("input");
  Object.assign(input, { type: "number", min: "1", max: "20", step: "1",
    value: String(ctx.state.settings.newPerDay) });
  label.append(input);
  const status = el("p", "", "muted");
  status.setAttribute("role", "status");
  input.addEventListener("change", () => {
    const count = input.valueAsNumber;
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      input.setCustomValidity("1부터 20까지의 정수를 입력해 주세요.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    const previous = ctx.state.settings.newPerDay;
    ctx.state.settings.newPerDay = count;
    try { ctx.save(); render(root, ctx); }
    catch {
      ctx.state.settings.newPerDay = previous;
      status.textContent = "설정을 저장하지 못했습니다.";
    }
  });
  input.addEventListener("input", () => input.setCustomValidity(""));
  const file = el("input");
  Object.assign(file, { type: "file", accept: ".json,.txt,application/json,text/plain", hidden: true });
  file.addEventListener("change", () => {
    restore(file.files[0], root, ctx, status);
    file.value = "";
  });
  const row = el("div", null, "row");
  row.append(button("내보내기", () => download(ctx, status)),
    button("가져오기", () => file.click()));
  section.append(el("h2", "설정과 학습 기록"), label,
    el("p", "가져오기를 하면 현재 학습 기록을 선택한 파일의 기록으로 바꿉니다.", "muted"),
    row, file, status);
  root.append(section);
}

export function render(root, ctx) {
  root.replaceChildren();
  const now = ctx.now();
  const today = pickToday(ctx.data.items, ctx.state, now);
  showOverview(root, ctx, today, now);
  showIllusions(root, ctx);
  showSchedule(root);
  showSettings(root, ctx);
}
