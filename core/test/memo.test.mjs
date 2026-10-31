import test from "node:test";
import assert from "node:assert/strict";
import { memoOf, studiedItems, studySection } from "../memo.js";

const item = (id, extra = {}) => ({ id, total: 3, parts: [], study: "", ...extra });

test("studiedItems: 채점·읽은 문항만, 최근 채점 순", () => {
  const items = [item("a"), item("b"), item("c"), item("d"), item("e", { total: 0 })];
  const state = {
    cards: { b: { stage: 2, fsrs: null }, c: { stage: 1, fsrs: null }, e: { stage: 3, fsrs: {} } },
    log: [{ id: "a", t: 5 }, { id: "d", t: 9 }, { id: "a", t: 1 }],
  };
  assert.deepEqual(studiedItems(items, state).map(i => i.id), ["d", "a", "b"]);
});

test("studySection: 다음 제목 전까지", () => {
  const study = "[키워드]\n가 · 나\n[암기법]\n- 하나\n- 둘\n[셀프 테스트]\nQ. 물음";
  assert.equal(studySection(study, "암기법"), "- 하나\n- 둘");
  assert.equal(studySection(study, "셀프 테스트"), "Q. 물음");
  assert.equal(studySection(study, "근거"), "");
  assert.equal(studySection("", "암기법"), "");
});

test("memoOf: 두문자 있는 part만", () => {
  const memo = memoOf(item("x", {
    parts: [{ label: "1) 장점", mnemonic: "품시안", phrase: "문장" }, { label: "2)", mnemonic: "" }],
    study: "[암기법]\n- 묶기",
  }));
  assert.deepEqual(memo.mnemonics, [{ label: "1) 장점", mnemonic: "품시안", phrase: "문장" }]);
  assert.equal(memo.method, "- 묶기");
});
