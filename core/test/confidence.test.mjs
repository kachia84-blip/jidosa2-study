import test from "node:test";
import assert from "node:assert/strict";
import { CONF, CONF_LABELS, recordResult, illusions, calibration, weakItems } from "../confidence.js";
import { loadState, getCard, dayKey } from "../store.js";

const now = new Date(2026, 9, 29, 12).getTime();
const makeState = () => loadState({ getItem: () => null });
const result = overrides => ({ stage: 2, recalled: 4, total: 5, conf: "unsure", passed: true, missed: ["0:2"], ...overrides });

test("확신도 코드와 표시 문구", () => {
  assert.deepEqual(CONF, ["sure", "unsure", "none"]);
  assert.deepEqual(CONF_LABELS, { sure: "확신", unsure: "애매", none: "모름" });
});

test("recordResult: 누적 횟수와 로그를 갱신하고 FSRS와 단계를 보존한다", () => {
  const state = makeState();
  const card = getCard(state, "q1");
  card.stage = 3;
  card.fsrs = { s: 10, d: 5, due: now, last: now, reps: 2, lapses: 0 };
  const fsrs = card.fsrs;
  recordResult(state, "q1", result({ missed: ["0:2", "0:2", "1:0"] }), now);
  recordResult(state, "q1", result({ conf: "sure", passed: false, recalled: 2 }), now + 1);
  assert.equal(card.stage, 3);
  assert.equal(card.fsrs, fsrs);
  assert.equal(card.lastConf, "sure");
  assert.equal(card.lastPassed, false);
  assert.equal(card.lapses, 1);
  assert.deepEqual(card.itemMiss, { "0:2": 2, "1:0": 1 });
  assert.deepEqual(state.log[1], { t: now + 1, id: "q1", stage: 2, recalled: 2, total: 5, conf: "sure", passed: false });
});

test("통과일은 현지 날짜로 하루 한 번 기록하며 실패 시 삭제하지 않는다", () => {
  const state = makeState();
  recordResult(state, "q", result({}), now);
  recordResult(state, "q", result({}), now + 1);
  recordResult(state, "q", result({}), new Date(2026, 9, 30, 12).getTime());
  recordResult(state, "q", result({ passed: false }), now + 2);
  assert.deepEqual(state.cards.q.passDays, [dayKey(now), "2026-10-30"]);
});

test("로그는 가장 최근 2000개만 유지한다", () => {
  const state = makeState();
  for (let i = 0; i < 2005; i += 1) recordResult(state, "q", result({ missed: [] }), now + i);
  assert.equal(state.log.length, 2000);
  assert.equal(state.log[0].t, now + 5);
  assert.equal(state.log.at(-1).t, now + 2004);
});

test("illusions는 마지막 확신 실패만 찾고 calibration은 전체 로그를 집계한다", () => {
  const state = makeState();
  assert.deepEqual(calibration(state), { sure: { n: 0, ok: 0 }, unsure: { n: 0, ok: 0 }, none: { n: 0, ok: 0 } });
  recordResult(state, "a", result({ conf: "sure", passed: false }), now);
  recordResult(state, "b", result({ conf: "sure" }), now);
  recordResult(state, "c", result({ conf: "none", passed: false }), now);
  recordResult(state, "b", result({ conf: "unsure" }), now + 1);
  assert.deepEqual(illusions(state), ["a"]);
  assert.deepEqual(calibration(state), { sure: { n: 2, ok: 1 }, unsure: { n: 1, ok: 1 }, none: { n: 1, ok: 0 } });
  recordResult(state, "a", result({ conf: "sure" }), now + 2);
  assert.deepEqual(illusions(state), []);
});

test("weakItems는 유효한 항목을 누락 횟수순으로 제한하여 반환한다", () => {
  const state = makeState();
  getCard(state, "a").itemMiss = { "0:0": 2, "0:1": 5, "8:8": 100, bad: 99, "0:2": 0 };
  getCard(state, "b").itemMiss = { "0:0": 5 };
  getCard(state, "deleted").itemMiss = { "0:0": 100 };
  const byId = new Map([
    ["a", { parts: [{ items: [{ text: "가" }, { text: "나" }, { text: "다" }] }] }],
    ["b", { parts: [{ items: [{ text: "라" }] }] }],
  ]);
  const snapshot = structuredClone(state);
  assert.deepEqual(weakItems(state, byId), [
    { id: "a", part: 0, item: 1, text: "나", miss: 5 },
    { id: "b", part: 0, item: 0, text: "라", miss: 5 },
    { id: "a", part: 0, item: 0, text: "가", miss: 2 },
  ]);
  assert.equal(weakItems(state, byId, 1).length, 1);
  assert.deepEqual(weakItems(state, byId, 0), []);
  assert.deepEqual(state, snapshot);
});
