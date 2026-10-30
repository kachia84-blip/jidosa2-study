import test from "node:test";
import assert from "node:assert/strict";
import { examTrends, myScore, weakTopics } from "../insights.js";

const items = [
  { id: "a1", topic: "A", year: 2024, points: 25 }, { id: "a2", topic: "A", year: 2020, points: 5 },
  { id: "a3", topic: "A", year: 2013, points: 5 }, { id: "b1", topic: "B", year: 2026, points: 5 },
];
const now = Date.parse("2026-10-31T12:00:00+09:00");
const log = [
  { t: now - 86400000, id: "a1", stage: 2, recalled: 2, total: 4, passed: false },
  { t: now, id: "a1", stage: 2, recalled: 4, total: 4, passed: true },
  { t: now, id: "b1", stage: 3, recalled: 1, total: 4, passed: false },
];

test("examTrends: 주제별 출제 수·비중·최근 3년", () => {
  const t = examTrends(items);
  assert.equal(t.topics[0].topic, "A");
  assert.equal(t.topics[0].count, 3);
  assert.equal(t.topics[0].points, 35);
  assert.equal(t.topics[0].recent, 1);
  assert.equal(t.topics[0].share, 0.75);
  assert.equal(t.topics[0].trend, "down");
  assert.equal(t.topics[1].trend, "up");
  assert.deepEqual([t.first, t.last], [2013, 2026]);
});

test("myScore: 전체·날짜별·단계별", () => {
  const s = myScore(log, now, 3);
  assert.equal(s.n, 3);
  assert.equal(s.questions, 2);
  assert.equal(s.recall, 7 / 12);
  assert.equal(s.pass, 1 / 3);
  assert.deepEqual(s.daily.map(d => d.n), [0, 1, 2]);
  assert.equal(s.daily[2].rate, 5 / 8);
  assert.equal(s.stages[0].pass, 0.5);
});

test("weakTopics: 출제 비중 × 못 맞힌 비율 순, 안 한 분야는 정답률 없음", () => {
  const w = weakTopics(items, log);
  assert.equal(w[0].topic, "A");
  assert.equal(w[0].rate, 6 / 8);
  assert.equal(w[1].rate, 0.25);
  assert.equal(weakTopics(items, [])[0].rate, null);
});
