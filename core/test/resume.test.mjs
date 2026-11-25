import test from "node:test";
import assert from "node:assert/strict";
import { pickResume, saveResume, loadResume, clearResume } from "../resume.js";

const byId = new Map(["a", "b", "c", "d"].map(id => [id, {}]));
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

test("멈춘 자리부터 이어서, 앞에 한 개수는 그대로", () => {
  const r = pickResume({ queue: ["a", "b", "c", "d"], i: 2 }, byId, {}, 100);
  assert.deepEqual(r, { queue: ["a", "b", "c", "d"], i: 2 });
});

test("채점해서 다음 복습일이 미래로 간 카드는 건너뜀", () => {
  const cards = { c: { fsrs: { due: 500 } }, d: { fsrs: { due: 50 } } };
  assert.deepEqual(pickResume({ queue: ["a", "b", "c", "d"], i: 2 }, byId, cards, 100), { queue: ["a", "b", "d"], i: 2 });
});

test("남은 게 없으면 null", () => {
  assert.equal(pickResume({ queue: ["a", "b"], i: 2 }, byId, {}, 100), null);
  assert.equal(pickResume(null, byId, {}, 100), null);
});

test("저장·불러오기·지우기", () => {
  const s = mem();
  saveResume(["a", "b"], 1, s);
  assert.deepEqual(loadResume(s), { queue: ["a", "b"], i: 1 });
  clearResume(s);
  assert.equal(loadResume(s), null);
});
