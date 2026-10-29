import test from "node:test";
import assert from "node:assert/strict";
import { maskItem, maskPart, initials, countHint } from "../mask.js";

const original = { text: "안전 난간 설치 및 안전 점검", key: ["안전", "설치"] };
const join = segments => segments.map(segment => segment.s).join("");

test("1단계 원문, 2단계 모든 핵심어, 4단계 백지", () => {
  const item = structuredClone(original);
  assert.deepEqual(maskItem(item, 1), [{ t: "text", s: item.text }]);
  const masked = maskItem(item, 2);
  assert.deepEqual(masked.filter(segment => segment.t === "hole").map(segment => segment.s), ["안전", "설치", "안전"]);
  assert.equal(join(masked), item.text);
  assert.deepEqual(maskItem(item, 4), []);
  assert.deepEqual(item, original);
});

test("2단계: 겹치는 핵심어, 중복, 빈 키, 정규식 기호를 안전하게 처리한다", () => {
  const item = { text: "가나다라 a+b a+b", key: ["가나", "나다", "가나", "", "a+b"] };
  const result = maskItem(item, 2);
  assert.deepEqual(result, [
    { t: "hole", s: "가나다" }, { t: "text", s: "라 " },
    { t: "hole", s: "a+b" }, { t: "text", s: " " }, { t: "hole", s: "a+b" },
  ]);
  assert.equal(join(result), item.text);
  assert.deepEqual(maskItem({ text: "abc", key: ["없는말"] }, 2), [{ t: "text", s: "abc" }]);
});

test("핵심어가 없으면 뒤쪽 절반 어절을 한 빈칸으로 가린다", () => {
  assert.deepEqual(maskItem({ text: "가 나 다 라", key: [] }, 2), [
    { t: "text", s: "가 나 " }, { t: "hole", s: "다 라" },
  ]);
  assert.deepEqual(maskItem({ text: "  가  나\t다  " }, 2), [
    { t: "text", s: "  가  " }, { t: "hole", s: "나\t다  " },
  ]);
  assert.deepEqual(maskItem({ text: "하나" }, 2), [{ t: "hole", s: "하나" }]);
  assert.deepEqual(maskItem({ text: "", key: [] }, 2), []);
});

test("3단계: 공백과 기호를 건너뛰고 첫 글자만 힌트로 남긴다", () => {
  const item = { text: "  • 안전 난간", key: ["안전"] };
  assert.deepEqual(maskItem(item, 3), [
    { t: "text", s: "  • " }, { t: "hint", s: "안" }, { t: "hole", s: "전 난간" },
  ]);
  assert.equal(join(maskItem(item, 3)), item.text);
  assert.deepEqual(maskItem({ text: "𐐀문자" }, 3), [{ t: "hint", s: "𐐀" }, { t: "hole", s: "문자" }]);
  assert.deepEqual(maskItem({ text: "가" }, 3), [{ t: "hint", s: "가" }]);
  assert.deepEqual(maskItem({ text: " • " }, 3), [{ t: "hole", s: " • " }]);
  assert.deepEqual(maskItem({ text: "" }, 3), []);
});

test("maskPart: 라벨, 항목 수, 단계별 두문자 노출", () => {
  const part = { label: "1)", mnemonic: "안·설", items: [original, { text: "설비 점검", key: ["설비"] }] };
  for (const stage of [1, 2, 3, 4]) {
    const result = maskPart(part, stage);
    assert.equal(result.label, "1)");
    assert.equal(result.count, 2);
    assert.equal(result.mnemonic, stage >= 3 ? null : "안·설");
    assert.deepEqual(result.lines, part.items.map(item => maskItem(item, stage)));
  }
  assert.deepEqual(maskPart({ label: "", mnemonic: "", items: [] }, 4).lines, []);
});

test("initials와 countHint: 한글, 숫자, 공백, 일치 없음", () => {
  assert.equal(initials([" • 안전", "(보호구)", "𐐀문자", "3단계"]), "안·보·𐐀·3");
  assert.equal(initials([]), "");
  assert.equal(initials(["", "!"]), "·");
  assert.equal(countHint("2024년 문제: 방안을 5가지 쓰시오"), 5);
  assert.equal(countHint("3 개를 쓰시오"), 3);
  assert.equal(countHint("12가지 중 3개"), 12);
  assert.equal(countHint("원인을 설명하시오"), null);
});
