import { dayKey } from "./store.js";

// https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm#fsrs-5
const W = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604,
  0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]);
const DAY = 86_400_000;
const DECAY = -0.5;
const FACTOR = 19 / 81;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const initialDifficulty = grade => clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, 1, 10);

export function retrievability(fsrs, now) {
  if (!fsrs) return 0;
  const elapsed = Math.max(0, (now - fsrs.last) / DAY);
  return clamp((1 + FACTOR * elapsed / fsrs.s) ** DECAY, 0, 1);
}

function nextDifficulty(d, grade) {
  const delta = -W[6] * (grade - 3);
  const damped = d + delta * (10 - d) / 9;
  return clamp(W[7] * initialDifficulty(4) + (1 - W[7]) * damped, 1, 10);
}

function nextStability(fsrs, grade, now) {
  const { s, d } = fsrs;
  if (now - fsrs.last < DAY) return s * Math.exp(W[17] * (grade - 3 + W[18]));
  const r = retrievability(fsrs, now);
  if (grade === 1) {
    return W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r));
  }
  const hard = grade === 2 ? W[15] : 1;
  const easy = grade === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * s ** -W[9]
    * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
}

export function review(fsrs, grade, now, retention = 0.9) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 4) throw new RangeError("등급은 1~4여야 합니다.");
  if (!Number.isFinite(now)) throw new RangeError("올바른 시간이 아닙니다.");
  if (!Number.isFinite(retention) || retention <= 0 || retention >= 1) {
    throw new RangeError("목표 기억률은 0과 1 사이여야 합니다.");
  }
  if (fsrs && (now < fsrs.last || !Number.isFinite(fsrs.s) || fsrs.s <= 0
    || !Number.isFinite(fsrs.d) || fsrs.d < 1 || fsrs.d > 10 || !Number.isFinite(fsrs.last))) {
    throw new RangeError("복습 상태 또는 시간이 올바르지 않습니다.");
  }
  const s = fsrs ? nextStability(fsrs, grade, now) : W[grade - 1];
  const d = fsrs ? nextDifficulty(fsrs.d, grade) : initialDifficulty(grade);
  const interval = clamp(Math.round(s / FACTOR * (retention ** (1 / DECAY) - 1)), 1, 365);
  return {
    s, d, due: now + interval * DAY, last: now,
    reps: (fsrs?.reps ?? 0) + 1,
    lapses: (fsrs?.lapses ?? 0) + (grade === 1 ? 1 : 0),
  };
}

export function gradeOf(recalled, total, conf) {
  if (total <= 0 || recalled / total < 0.8) return 1;
  if (recalled < total) return 2;
  return conf === "sure" ? 4 : 3;
}

export function nextStage(stage, passed) {
  return passed ? Math.min(4, stage + 1) : Math.max(2, stage - 1);
}

function minimumRepeats(groups, previous, remaining) {
  let repeats = 0;
  for (const [topic, group] of groups) {
    const size = group.ids.length - group.cursor;
    repeats = Math.max(repeats, 2 * size - remaining - (topic === previous ? 0 : 1));
  }
  return repeats;
}

function arrange(ids, topicOf, previous) {
  const groups = new Map();
  ids.forEach((id, index) => {
    const topic = topicOf(id);
    if (!groups.has(topic)) groups.set(topic, { ids: [], cursor: 0 });
    groups.get(topic).ids.push({ id, index });
  });
  const result = [];
  for (let remaining = ids.length; remaining > 0; remaining -= 1) {
    let best;
    for (const [topic, group] of groups) {
      if (group.cursor === group.ids.length) continue;
      const head = group.ids[group.cursor];
      group.cursor += 1;
      const cost = Number(topic === previous) + minimumRepeats(groups, topic, remaining - 1);
      group.cursor -= 1;
      if (!best || cost < best.cost || (cost === best.cost && head.index < best.index)) {
        best = { topic, group, cost, index: head.index, id: head.id };
      }
    }
    result.push(best.id);
    best.group.cursor += 1;
    previous = best.topic;
  }
  return result;
}

export function interleave(ids, topicOf) {
  return arrange(ids, topicOf, Symbol("시작"));
}

export function pickToday(items, state, now) {
  const byId = new Map(items.map(item => [item.id, item]));
  const topicOf = id => byId.get(id).topic;
  const cardOf = id => Object.hasOwn(state.cards, id) ? state.cards[id] : undefined;
  const due = items.filter(item => cardOf(item.id)?.fsrs?.due <= now)
    .sort((a, b) => cardOf(a.id).fsrs.due - cardOf(b.id).fsrs.due
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const illusion = item => cardOf(item.id).lastConf === "sure" && cardOf(item.id).lastPassed === false;
  const urgent = interleave(due.filter(illusion).map(item => item.id), topicOf);
  const regular = arrange(due.filter(item => !illusion(item)).map(item => item.id), topicOf,
    urgent.length ? topicOf(urgent[urgent.length - 1]) : Symbol("시작"));
  const done = state.daily.date === dayKey(now) ? state.daily.newDone : 0;
  const limit = Math.max(0, state.settings.newPerDay - done);
  const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const fresh = items.filter(item => !cardOf(item.id)?.fsrs)
    .sort((a, b) => Number(b.status === "확정") - Number(a.status === "확정")
      || compare(a.topic, b.topic) || compare(a.id, b.id))
    .slice(0, limit).map(item => item.id);
  return { due: [...urgent, ...regular], fresh };
}
