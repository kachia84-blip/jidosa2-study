import test from "node:test";
import assert from "node:assert/strict";
import { loadState, saveState, getCard, dayKey, isMemorized, exportState, importState } from "../store.js";

function fakeStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("빈 storage 기본값은 호출마다 독립적이다", () => {
  const storage = fakeStorage();
  const state = loadState(storage);
  assert.deepEqual(state, {
    version: 1, settings: { newPerDay: 5, retention: 0.9 }, cards: {},
    daily: { date: dayKey(Date.now()), newDone: 0 }, log: [],
  });
  getCard(state, "q1").passDays.push("2026-10-01");
  assert.deepEqual(loadState(storage).cards, {});
});

test("getCard 기본값, 참조 재사용, 특수 id 안전성", () => {
  const state = loadState(fakeStorage());
  const card = getCard(state, "q1");
  assert.deepEqual(card, { stage: 1, fsrs: null, passDays: [], lapses: 0, itemMiss: {}, lastConf: null, lastPassed: null });
  assert.equal(getCard(state, "q1"), card);
  getCard(state, "q2").passDays.push("2026-10-01");
  assert.deepEqual(card.passDays, []);
  for (const id of ["__proto__", "constructor", "toString"]) {
    assert.equal(getCard(state, id).stage, 1);
    assert.ok(Object.hasOwn(state.cards, id));
  }
  assert.equal(Object.getPrototypeOf(state.cards), Object.prototype);
});

test("jd2.v1 저장과 내보내기/가져오기 왕복", () => {
  const storage = fakeStorage();
  const state = loadState(storage);
  const card = getCard(state, "q1");
  card.stage = 3;
  card.fsrs = { s: 3.173, d: 5, due: 1234, last: 1, reps: 2, lapses: 0 };
  card.itemMiss["0:2"] = 3;
  assert.equal(saveState(state, storage), true);
  assert.ok(storage.getItem("jd2.v1"));
  assert.deepEqual(loadState(storage), state);
  const imported = importState(exportState(state));
  assert.deepEqual(imported, state);
  assert.notEqual(imported.cards.q1, card);
});

test("깨진 저장값과 storage 메서드 및 localStorage getter 오류 복구", () => {
  const storage = fakeStorage();
  for (const text of ["{", "null", "[]", "{}", '{"version":2}']) {
    storage.setItem("jd2.v1", text);
    assert.deepEqual(loadState(storage).settings, { newPerDay: 5, retention: 0.9 });
  }
  const broken = { getItem() { throw new Error("읽기 차단"); }, setItem() { throw new Error("쓰기 차단"); } };
  const state = loadState(broken);
  assert.equal(saveState(state, broken), false);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("접근 차단"); } });
    assert.equal(loadState().version, 1);
    assert.equal(saveState(state), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});

test("importState는 중첩된 잘못된 형식도 거부한다", () => {
  const original = loadState(fakeStorage());
  getCard(original, "q1");
  const corruptions = [
    s => { s.version = 2; }, s => { s.settings.retention = 1; },
    s => { s.settings.newPerDay = -1; }, s => { s.cards = []; },
    s => { s.cards.q1.stage = 5; }, s => { s.cards.q1.fsrs = {}; },
    s => { s.cards.q1.passDays = ["2026-02-30"]; }, s => { s.cards.q1.itemMiss = { bad: 2 }; },
    s => { s.cards.q1.lastPassed = "false"; }, s => { s.cards.q1.lastConf = "maybe"; },
    s => { s.daily.date = "2026-13-01"; }, s => { s.daily.newDone = 0.5; },
    s => { s.log = [{}]; },
  ];
  for (const corrupt of corruptions) {
    const state = structuredClone(original);
    corrupt(state);
    assert.throws(() => importState(JSON.stringify(state)), Error);
  }
  assert.throws(() => importState("{"), Error);
});

test("최신 로그 2000건만 저장하며 내보내기는 입력을 변경하지 않는다", () => {
  const state = loadState(fakeStorage());
  state.log = Array.from({ length: 2010 }, (_, t) => ({ t, id: "q", stage: 2, recalled: 1, total: 1, conf: "sure", passed: true }));
  const result = importState(exportState(state));
  assert.equal(state.log.length, 2010);
  assert.equal(result.log.length, 2000);
  assert.equal(result.log[0].t, 10);
  assert.equal(importState(JSON.stringify(state)).log.length, 2000);
});

test("dayKey는 UTC가 아닌 현지 날짜이며 잘못된 시간은 거부한다", () => {
  assert.equal(dayKey(new Date(2026, 9, 29, 0, 5).getTime()), "2026-10-29");
  assert.equal(dayKey(new Date(2026, 0, 1, 23, 59).getTime()), "2026-01-01");
  assert.throws(() => dayKey(NaN), RangeError);
});

test("외움은 4단계와 서로 다른 통과일 3일을 모두 요구한다", () => {
  const card = { stage: 4, passDays: ["2026-10-01", "2026-10-01", "2026-10-02"] };
  assert.equal(isMemorized(card), false);
  card.passDays.push("2026-10-03");
  assert.equal(isMemorized(card), true);
  card.stage = 3;
  assert.equal(isMemorized(card), false);
});
