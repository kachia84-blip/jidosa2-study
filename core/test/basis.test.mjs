import test from "node:test";
import assert from "node:assert/strict";
import { basisPieces, lawUrl } from "../basis.js";

test("basisPieces: 원문 주소를 글자에서 떼어 링크로", () => {
  const pieces = basisPieces("산업안전보건기준에 관한 규칙 제142조 제2항 (원문: https://www.law.go.kr/법령/산업안전보건기준에관한규칙/제142조)");
  assert.deepEqual(pieces, [
    { t: "text", s: "산업안전보건기준에 관한 규칙 제142조 제2항" },
    { t: "link", href: "https://www.law.go.kr/법령/산업안전보건기준에관한규칙/제142조", s: "법제처 원문 열기" },
  ]);
});

test("basisPieces: 별표 파일 주소는 받기 링크", () => {
  const pieces = basisPieces("규칙 별표 4 (원문: https://law.go.kr/flDownload.do?flSeq=1)");
  assert.equal(pieces[1].s, "별표 원문 받기");
});

test("basisPieces: 주소가 없으면 조문 주소를 만든다", () => {
  assert.equal(lawUrl("산업안전보건기준에 관한 규칙 제619조의2·별표"), "https://www.law.go.kr/법령/산업안전보건기준에관한규칙/제619조의2");
  assert.equal(basisPieces("산업안전보건법 제82조")[1].href, "https://www.law.go.kr/법령/산업안전보건법/제82조");
});

test("basisPieces: 교재 근거는 안내만", () => {
  assert.deepEqual(basisPieces("교재(공학)"), [
    { t: "text", s: "교재(공학)" },
    { t: "note", s: "교재(공학) 내용이라 법령 원문 링크가 없어요." },
  ]);
});

test("basisPieces: 고시·지침은 행정규칙 주소", () => {
  assert.equal(lawUrl("콘크리트공사표준안전작업지침(고시 제2025-78호) 제5조제1호"), "https://www.law.go.kr/행정규칙/콘크리트공사표준안전작업지침");
  assert.equal(lawUrl("건설기술 진흥법 시행규칙 제58조·별표 7"), "https://www.law.go.kr/법령/건설기술진흥법시행규칙/제58조");
});
