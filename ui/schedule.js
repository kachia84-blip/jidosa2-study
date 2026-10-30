// 오늘 화면의 시험 일정: 다음 2차 시험 D-day를 크게, 다가오는 일정은 목록으로.
import { upcoming, ddayText } from "../core/schedule.js";
import { withIcon } from "./icons.js";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const WEEK = "일월화수목금토";
function dateText(s) {
  const d = new Date(`${s}T00:00:00+09:00`);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEK[d.getDay()]})`;
}

function row(e) {
  const li = el("li", null, `sched-row${e.exam ? " exam" : ""}`);
  const when = e.end ? `${dateText(e.start)}~${dateText(e.end)}` : dateText(e.start);
  li.append(el("span", ddayText(e), "sched-dday"),
    el("span", `제${e.round}회 ${e.name}`, "sched-name"),
    el("span", when, "sched-date"));
  if (e.estimate) li.append(el("span", "예상", "badge draft"));
  return li;
}

export function showSchedule(root) {
  const box = el("section", null, "panel sched");
  box.hidden = true;
  root.append(box);
  fetch("data/schedule.json").then(r => (r.ok ? r.json() : Promise.reject())).then(data => {
    const list = upcoming(data.events, Date.now());
    if (!list.length) return;
    const exam = list.find(e => e.name === "2차 시험");
    box.append(el("h2", withIcon("시험 일정")));
    if (exam) {
      const hero = el("div", null, "sched-hero");
      hero.append(el("span", `제${exam.round}회 2차 시험${exam.estimate ? "(예상)" : ""}`),
        el("strong", ddayText(exam), "sched-big"), el("span", dateText(exam.start), "muted"));
      box.append(hero);
    }
    const ul = el("ul", null, "sched-list");
    list.slice(0, 4).forEach(e => ul.append(row(e)));
    box.append(ul);
    if (list.length > 4) {
      const more = el("details");
      const rest = el("ul", null, "sched-list");
      list.slice(4).forEach(e => rest.append(row(e)));
      more.append(el("summary", "전체 일정 보기"), rest);
      box.append(more);
    }
    const note = el("p", null, "muted sched-note");
    const link = el("a", "Q-Net 공고 확인");
    link.href = data.link; link.target = "_blank"; link.rel = "noopener";
    note.append(document.createTextNode(`${data.source}. `), link);
    box.append(note);
    box.hidden = false;
  }).catch(() => {});
}
