import { dayKey, getCard } from "./store.js";

export const CONF = Object.freeze(["sure", "unsure", "none"]);
export const CONF_LABELS = Object.freeze({ sure: "확신", unsure: "애매", none: "모름" });

export function recordResult(state, id, { stage, recalled, total, conf, passed, missed = [] }, now) {
  const card = getCard(state, id);
  card.lastConf = conf;
  card.lastPassed = passed;
  for (const key of new Set(missed)) {
    card.itemMiss[key] = (card.itemMiss[key] ?? 0) + 1;
  }
  if (passed) {
    const today = dayKey(now);
    if (!card.passDays.includes(today)) card.passDays.push(today);
  } else {
    card.lapses += 1;
  }
  state.log.push({ t: now, id, stage, recalled, total, conf, passed });
  if (state.log.length > 2000) state.log.splice(0, state.log.length - 2000);
  return card;
}

export function illusions(state) {
  return Object.entries(state.cards)
    .filter(([, card]) => card.lastConf === "sure" && card.lastPassed === false)
    .map(([id]) => id);
}

export function calibration(state) {
  const result = Object.fromEntries(CONF.map(conf => [conf, { n: 0, ok: 0 }]));
  for (const { conf, passed } of state.log) {
    if (!CONF.includes(conf)) continue;
    result[conf].n += 1;
    if (passed) result[conf].ok += 1;
  }
  return result;
}

export function weakItems(state, byId, limit = 30) {
  const result = [];
  for (const [id, card] of Object.entries(state.cards)) {
    const question = byId.get(id);
    if (!question) continue;
    for (const [key, miss] of Object.entries(card.itemMiss)) {
      if (!/^\d+:\d+$/.test(key) || miss <= 0) continue;
      const [part, item] = key.split(":").map(Number);
      const line = question.parts[part]?.items[item];
      if (line) result.push({ id, part, item, text: line.text, miss });
    }
  }
  result.sort((a, b) => b.miss - a.miss
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    || a.part - b.part || a.item - b.item);
  return result.slice(0, Math.max(0, Math.trunc(limit)));
}
