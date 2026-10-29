import test from "node:test";
import assert from "node:assert/strict";
import { loadData, mergeData } from "../data.js";

const questions = {
  version: 1,
  items: [
    { id: "q1", topic: "굴착", year: 2024, question: "세 가지", subs: ["1) 조건"] },
    { id: "q2", topic: "안전", year: 2025 },
    { id: "q3", topic: "굴착", year: 2026 },
  ],
};
const answers = {
  version: 1,
  items: [
    { id: "q3", status: "초안", parts: [] },
    { id: "q1", status: "확정", note: "메모", parts: [
      { label: "1)", items: [{ text: "가", key: [] }, { text: "나", key: ["나"] }] },
      { label: "2)", items: [{ text: "다", key: [] }] },
    ] },
    { id: "orphan", status: "확정", parts: [] },
  ],
};

test("mergeData: id로 병합하고 문항 순서, 원래 필드, 항목 합계를 보존한다", () => {
  const before = structuredClone({ questions, answers });
  const data = mergeData(questions, answers);
  assert.deepEqual(data.items.map(item => item.id), ["q1", "q2", "q3"]);
  assert.equal(data.items[0].total, 3);
  assert.equal(data.items[0].note, "메모");
  assert.equal(data.items[0].status, "확정");
  assert.equal(data.items[0].year, 2024);
  assert.deepEqual(data.items[0].subs, ["1) 조건"]);
  assert.equal(data.items[2].status, "초안");
  assert.equal(data.items[2].total, 0);
  assert.deepEqual({ questions, answers }, before);
});

test("mergeData: 답안이 없는 문항의 기본값과 Map 참조, 주제 등장 순서", () => {
  const data = mergeData(questions, answers);
  assert.deepEqual(data.topics, ["굴착", "안전"]);
  assert.ok(data.byId instanceof Map);
  for (const item of data.items) assert.equal(data.byId.get(item.id), item);
  assert.deepEqual(data.byId.get("q2"), { ...questions.items[1], parts: [], status: "없음", note: "", outline: null, model: "", easy: "", total: 0 });
  assert.equal(data.byId.has("orphan"), false);
});

test("mergeData: 빈 데이터", () => {
  assert.deepEqual(mergeData({ items: [] }, { items: [] }), { items: [], byId: new Map(), topics: [] });
});

test("loadData: 두 JSON을 가져와 병합하며 기본 경로와 슬래시를 지원한다", async t => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async url => {
    urls.push(url);
    return { ok: true, json: async () => url.endsWith("questions.json") ? questions : answers };
  });
  const expected = mergeData(questions, answers);
  assert.deepEqual(await loadData(), expected);
  assert.deepEqual(await loadData("/custom"), expected);
  assert.deepEqual(urls, ["data/questions.json", "data/answers.json", "/custom/questions.json", "/custom/answers.json"]);
});

test("loadData: HTTP 오류와 잘못된 JSON을 숨기지 않는다", async t => {
  const mock = t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 404 }));
  await assert.rejects(loadData(), /404/);
  mock.mock.mockImplementation(async () => ({ ok: true, json: async () => { throw new SyntaxError("JSON 오류"); } }));
  await assert.rejects(loadData(), SyntaxError);
});
