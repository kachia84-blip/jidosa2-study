import test from "node:test";
import assert from "node:assert/strict";
import { review, retrievability, gradeOf, nextStage, interleave, pickToday } from "../srs.js";
import { loadState, getCard, dayKey } from "../store.js";

const DAY = 86_400_000;
const now = new Date(2026, 9, 29, 12).getTime();
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const old = Object.freeze({ s: 10, d: 5, due: now, last: now, reps: 7, lapses: 2 });

test("FSRS-5: 첫 평가의 공식 기본 안정도와 지수식 난이도", () => {
  const stabilities = [0.40255, 1.18385, 3.173, 15.69105];
  const difficulties = [7.1949, 6.488305268471453, 5.282434422319005, 3.2245015893713678];
  const intervals = [1, 1, 3, 16];
  for (let grade = 1; grade <= 4; grade += 1) {
    const state = review(null, grade, now);
    close(state.s, stabilities[grade - 1]);
    close(state.d, difficulties[grade - 1]);
    assert.equal(state.due, now + intervals[grade - 1] * DAY);
    assert.equal(state.last, now);
    assert.equal(state.reps, 1);
    assert.equal(state.lapses, grade === 1 ? 1 : 0);
  }
});

test("FSRS-5: 성공, 실패, hard/easy 보정과 난이도 감쇠·평균 회귀 수치", () => {
  const expectedS = [2.208800873779646, 16.479908621139778, 37.99096596604656, 93.687390045286];
  const expectedD = [6.607035107311108, 5.7994339073111085, 4.991832707311108, 4.184231507311108];
  const intervals = [2, 16, 38, 94];
  const at = now + 12.5 * DAY;
  for (let grade = 1; grade <= 4; grade += 1) {
    const result = review(old, grade, at);
    close(result.s, expectedS[grade - 1]);
    close(result.d, expectedD[grade - 1]);
    assert.equal(result.due, at + intervals[grade - 1] * DAY);
    assert.equal(result.reps, 8);
    assert.equal(result.lapses, grade === 1 ? 3 : 2);
    assert.notEqual(result, old);
  }
  assert.deepEqual(old, { s: 10, d: 5, due: now, last: now, reps: 7, lapses: 2 });
});

test("FSRS-5: 24시간 미만 재복습은 네 등급 모두 공식 단기 안정도식을 쓴다", () => {
  const expected = [5.010285241935083, 8.398413743809318, 14.077712147375411, 23.59754893600546];
  for (const elapsed of [0, DAY / 4, DAY - 1]) {
    for (let grade = 1; grade <= 4; grade += 1) {
      close(review(old, grade, now + elapsed).s, expected[grade - 1]);
    }
  }
  assert.notEqual(review(old, 3, now + DAY).s, expected[2]);
});

test("망각 곡선: t=0에서 1, t=S에서 0.9, 경과 시간에 따라 감소한다", () => {
  assert.equal(retrievability(null, now), 0);
  assert.equal(retrievability(old, now), 1);
  assert.equal(retrievability(old, now - DAY), 1);
  close(retrievability(old, now + 10 * DAY), 0.9);
  close(retrievability(old, now + 12.5 * DAY), 0.8793575437428567);
  assert.ok(retrievability(old, now + 10000 * DAY) > 0);
  assert.ok(retrievability(old, now + 10000 * DAY) < 0.1);
});

test("복습 간격은 목표 기억률을 반영하며 정수 1~365일로 제한된다", () => {
  const high = review(null, 4, now, 0.99);
  const normal = review(null, 4, now, 0.9);
  const low = review(null, 4, now, 0.7);
  assert.ok(high.due < normal.due && normal.due < low.due);
  assert.equal(review(null, 1, now, 0.9999).due, now + DAY);
  assert.equal(review(null, 4, now, 0.01).due, now + 365 * DAY);
  for (const grade of [1, 2, 3, 4]) {
    const result = review(old, grade, now + 20 * DAY);
    assert.ok(Number.isInteger((result.due - result.last) / DAY));
    assert.ok(result.d >= 1 && result.d <= 10);
  }
  assert.equal(review({ ...old, d: 1 }, 4, now + DAY).d, 1);
  assert.ok(review({ ...old, d: 10 }, 1, now + DAY).d <= 10);
});

test("잘못된 등급, 기억률, 과거 복습 시간과 불량 FSRS 상태는 거부한다", () => {
  for (const grade of [0, 5, 2.5, NaN, "3"]) assert.throws(() => review(null, grade, now), RangeError);
  for (const retention of [0, 1, -0.1, NaN, Infinity]) assert.throws(() => review(null, 3, now, retention), RangeError);
  assert.throws(() => review(old, 3, now - 1), RangeError);
  assert.throws(() => review(null, 3, NaN), RangeError);
  assert.throws(() => review({ ...old, s: 0 }, 3, now), RangeError);
});

test("채점 경계와 단계 상하한", () => {
  assert.equal(gradeOf(3, 5, "sure"), 1);
  assert.equal(gradeOf(4, 5, "sure"), 2);
  assert.equal(gradeOf(5, 5, "unsure"), 3);
  assert.equal(gradeOf(5, 5, "none"), 3);
  assert.equal(gradeOf(5, 5, "sure"), 4);
  assert.equal(gradeOf(0, 0, "sure"), 1);
  assert.equal(nextStage(1, true), 2);
  assert.equal(nextStage(3, true), 4);
  assert.equal(nextStage(4, true), 4);
  assert.equal(nextStage(4, false), 3);
  assert.equal(nextStage(2, false), 2);
  assert.equal(nextStage(1, false), 2);
});

const repeats = ids => ids.reduce((sum, id, i) => sum + Number(i > 0 && id[0] === ids[i - 1][0]), 0);

test("interleave: 결정성, 입력 보존, 기존 순서와 가능한 주제 교대", () => {
  const ids = ["A1", "A2", "B1", "B2", "C1"];
  const before = [...ids];
  const topicOf = id => id[0];
  const result = interleave(ids, topicOf);
  assert.equal(repeats(result), 0);
  assert.deepEqual(result, interleave(ids, topicOf));
  assert.deepEqual([...result].sort(), [...ids].sort());
  assert.deepEqual(ids, before);
  assert.deepEqual(interleave(["A1", "B1", "C1"], topicOf), ["A1", "B1", "C1"]);
  assert.deepEqual(interleave([], topicOf), []);
  assert.deepEqual(interleave(["A1", "A2"], topicOf), ["A1", "A2"]);
});

test("interleave: 모든 소규모 주제 분포에서 연속 중복 횟수가 최솟값이다", () => {
  for (let a = 0; a <= 4; a += 1) {
    for (let b = 0; b <= 4; b += 1) {
      for (let c = 0; c <= 4; c += 1) {
        const counts = [a, b, c];
        const ids = counts.flatMap((n, topic) => Array.from({ length: n }, (_, i) => `${topic}:${i}`));
        const minimum = Math.max(0, 2 * Math.max(...counts) - ids.length - 1);
        assert.equal(repeats(interleave(ids, id => id[0])), minimum, `${counts}`);
      }
    }
  }
});

test("pickToday: 착각 우선, 오래된 복습 순서와 주제 교대, 오늘 새 문항 제한", () => {
  const state = loadState({ getItem: () => null });
  state.settings.newPerDay = 3;
  state.daily = { date: dayKey(now), newDone: 1 };
  const items = [
    { id: "ua", topic: "A" }, { id: "ub", topic: "A" },
    { id: "ra", topic: "A" }, { id: "rb", topic: "B" }, { id: "rc", topic: "C" },
    { id: "later", topic: "C" },
    { id: "draft", topic: "A", status: "초안" },
    { id: "new-b", topic: "B", status: "확정" },
    { id: "new-a2", topic: "A", status: "확정" },
    { id: "new-a1", topic: "A", status: "확정" },
  ];
  for (const [id, elapsed] of [["ua", 1], ["ub", 2], ["ra", 8], ["rb", 7], ["rc", 6], ["later", -1]]) {
    const card = getCard(state, id);
    card.fsrs = { ...old, due: now - elapsed * DAY };
    if (id.startsWith("u")) { card.lastConf = "sure"; card.lastPassed = false; }
  }
  getCard(state, "new-a1");
  getCard(state, "orphan").fsrs = { ...old, due: 0 };
  const before = structuredClone({ items, state });
  assert.deepEqual(pickToday(items, state, now), {
    due: ["ub", "ua", "rb", "ra", "rc"], fresh: ["new-a1", "new-a2"],
  });
  assert.deepEqual({ items, state }, before);
});

test("pickToday: 날짜 변경 시 새 문항 한도를 복원하고 한도 초과 시 중단한다", () => {
  const state = loadState({ getItem: () => null });
  state.settings.newPerDay = 2;
  state.daily = { date: dayKey(now), newDone: 99 };
  const items = [
    { id: "z", topic: "B", status: "초안" },
    { id: "b", topic: "A", status: "확정" },
    { id: "a", topic: "A", status: "확정" },
  ];
  assert.deepEqual(pickToday(items, state, now), { due: [], fresh: [] });
  state.daily.date = "2026-10-28";
  assert.deepEqual(pickToday(items, state, now), { due: [], fresh: ["a", "b"] });
  state.settings.newPerDay = 5;
  assert.deepEqual(pickToday(items, state, now).fresh, ["a", "b", "z"]);
  assert.deepEqual(pickToday([], state, now), { due: [], fresh: [] });
});

test("pickToday: 만기가 정확히 현재인 카드도 포함하고 같은 주제가 없으면 만기순이다", () => {
  const state = loadState({ getItem: () => null });
  const items = ["c", "a", "b"].map(id => ({ id, topic: id }));
  for (const [id, due] of [["a", now - DAY], ["b", now - 2 * DAY], ["c", now]]) {
    getCard(state, id).fsrs = { ...old, due };
  }
  assert.deepEqual(pickToday(items, state, now), { due: ["b", "a", "c"], fresh: [] });
});
