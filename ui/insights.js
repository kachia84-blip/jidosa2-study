// 통계 화면의 새 칸: 내 성적, 약한 분야 우선순위, 기출 출제 경향.
import { examTrends, myScore, weakTopics } from "../core/insights.js";
import { withIcon } from "./icons.js";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const pct = r => (r == null ? "기록 없음" : `${Math.round(r * 100)}%`);

function meter(r, label) {
  const box = el("div", null, "meter");
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", label);
  const fill = el("div", null, "meter-fill");
  fill.style.width = `${Math.round((r ?? 0) * 100)}%`;
  box.append(fill);
  return box;
}

function stat(label, value) {
  const box = el("div", null, "stat");
  box.append(el("span", value, "stat-value"), el("span", label, "stat-label"));
  return box;
}

export function showMyScore(root, ctx) {
  const s = myScore(ctx.state.log, ctx.now());
  const section = el("section", null, "panel");
  section.append(el("h2", withIcon("내 성적")));
  if (!s.n) {
    section.append(el("p", "아직 채점 기록이 없어요. 2단계부터 채점하면 여기에 쌓여요.", "muted"));
    root.append(section);
    return;
  }
  const row = el("div", null, "stats-row");
  row.append(stat("떠올린 항목", pct(s.recall)), stat("통과율", pct(s.pass)),
    stat("채점 횟수", `${s.n}회`), stat("푼 문항", `${s.questions}개`));
  section.append(row, el("h3", "최근 14일 정답률"));
  const chart = el("div", null, "spark");
  s.daily.forEach(d => {
    const col = el("div", null, "spark-col");
    col.title = `${d.day} · ${d.n}회 · ${pct(d.rate)}`;
    const bar = el("div", null, d.n ? "spark-bar" : "spark-bar empty");
    bar.style.height = `${d.n ? Math.max(6, Math.round(d.rate * 100)) : 4}%`;
    col.append(bar, el("span", d.day.slice(8), "spark-day"));
    chart.append(col);
  });
  section.append(chart, el("h3", "단계별 통과율"));
  s.stages.forEach(st => {
    const line = el("div", null, "meter-row");
    line.append(el("span", `${st.stage}단계`, "meter-name"), meter(st.pass, `${st.stage}단계 통과율 ${pct(st.pass)}`),
      el("span", st.n ? `${pct(st.pass)} · ${st.n}회` : "기록 없음", "meter-value"));
    section.append(line);
  });
  root.append(section);
}

export function showWeakTopics(root, ctx) {
  const list = weakTopics(ctx.data.items, ctx.state.log);
  const section = el("section", null, "panel");
  section.append(el("h2", withIcon("약한 분야 우선순위")),
    el("p", "기출 출제 비중이 크고 내 정답률이 낮을수록 위에 와요. 안 해 본 분야는 정답률 0으로 쳐요.", "muted"));
  const ol = el("ol", null, "weak-list");
  list.forEach(w => {
    const li = el("li", null, "weak-row");
    const head = el("div", null, "weak-head");
    head.append(el("span", w.topic, "weak-name"),
      el("span", w.rate == null ? "아직 안 함" : `정답률 ${pct(w.rate)}`, w.rate == null ? "badge draft" : "badge"));
    const go = el("button", "이 분야 공부", "btn small");
    go.type = "button";
    go.addEventListener("click", () => {
      const ids = ctx.data.items.filter(i => i.topic === w.topic).map(i => i.id);
      ctx.go("card", { queue: ids.join(","), i: 0, mode: "review" });
    });
    li.append(head, meter(w.rate, `${w.topic} 정답률 ${pct(w.rate)}`),
      el("p", `기출 ${w.count}문항(${pct(w.share)}) · 공부한 문항 ${w.studied}/${w.count}`, "muted"), go);
    ol.append(li);
  });
  section.append(ol);
  root.append(section);
}

export function showExamTrends(root, ctx) {
  const t = examTrends(ctx.data.items);
  const years = Array.from({ length: t.last - t.first + 1 }, (_, k) => t.first + k);
  const section = el("section", null, "panel");
  section.append(el("h2", withIcon("기출 출제 경향")),
    el("p", `${t.first}~${t.last}년 ${t.total}문항 기준. 칸 하나가 한 해, 색이 있으면 그해 출제(숫자는 2문항 이상).`, "muted"));
  t.topics.forEach(x => {
    const block = el("div", null, "trend-row");
    const head = el("div", null, "weak-head");
    head.append(el("span", x.topic, "weak-name"), el("span", `${x.count}문항 · ${pct(x.share)}`, "meter-value"));
    const strip = el("div", null, "year-strip");
    years.forEach(y => {
      const n = ctx.data.items.filter(i => i.topic === x.topic && i.year === y).length;
      const cell = el("span", n > 1 ? String(n) : "", n ? "year-cell on" : "year-cell");
      cell.title = `${y}년 ${n}문항`;
      strip.append(cell);
    });
    block.append(head, strip,
      el("p", `점수 합 ${x.points}점 · 최근 3년 ${x.recent}문항${x.trend === "up" ? " · 요즘 늘었어요" : x.trend === "down" ? " · 요즘 줄었어요" : ""}`, "muted"));
    section.append(block);
  });
  const axis = el("div", null, "year-strip axis");
  years.forEach(y => axis.append(el("span", String(y).slice(2), "year-cell label")));
  section.append(axis);
  root.append(section);
}
