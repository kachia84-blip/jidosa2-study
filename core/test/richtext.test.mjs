import test from "node:test";
import assert from "node:assert/strict";
import { textBlocks, studyChunks } from "../richtext.js";

test("textBlocks: 암기 지도 칸·칩·흐름·두문자", () => {
  const b = textBlocks("[키워드]\n품질 균일 · 시공성\n두문자: 품시\n[큰 흐름]\n장점 → 단점\n둘은 앞뒷면이에요.");
  assert.deepEqual(b, [
    { t: "head", s: "키워드" },
    { t: "chips", items: ["품질 균일", "시공성"] },
    { t: "mnemonic", s: "품시" },
    { t: "head", s: "큰 흐름" },
    { t: "flow", items: ["장점", "단점"] },
    { t: "p", s: "둘은 앞뒷면이에요." },
  ]);
});

test("textBlocks: 답안 장·소문항·항목·세부", () => {
  const b = textBlocks("Ⅰ. 개요\n1) 장점\n1. 품질 균일: 고르다.\n가. 공장 생산\n① 장점\n- 시공성: 빠르다 → 편차가 작다\n※ 그 밖에: VT");
  assert.deepEqual(b.map(x => x.t), ["chapter", "section", "item", "sub", "group", "bullet", "note"]);
  assert.equal(b[2].key, "품질 균일");
  assert.equal(b[5].s, "빠르다 → 편차가 작다");
});

test("textBlocks: 용어와 문답", () => {
  const b = textBlocks("[용어]\n비계 = 임시 발판\n[셀프 테스트]\nQ. 흐름은?\nA. 장점 → 단점");
  assert.deepEqual(b[1], { t: "term", key: "비계", s: "임시 발판" });
  assert.deepEqual(b[3], { t: "q", mark: "Q.", s: "흐름은?" });
  assert.deepEqual(b[4], { t: "a", mark: "A.", s: "장점 → 단점" });
});

test("studyChunks: 사다리 조각과 묶음 색 번호", () => {
  const text = "[키워드]\n품질 · 비용\n[큰 흐름]\n장점 → 단점\n[세부 흐름]\n① 장점\n- 품질: 고르다\n② 단점\n- 비용: 비싸다\n[근거]\n- 교재(공학) 내용\n[암기법]\n- 묶기";
  const chunks = studyChunks(textBlocks(text));
  assert.deepEqual(chunks.map(c => c.label), ["키워드", "큰 흐름", "① 장점", "② 단점", "근거·암기법·셀프 테스트"]);
  assert.deepEqual(chunks[0].blocks[1].g, [0, 1]);
  assert.deepEqual(chunks[1].blocks[1].g, [0, 1]);
  assert.equal(chunks[2].blocks[0].t, "head");
  assert.equal(chunks[3].blocks[1].g, 1);
  assert.equal(chunks[4].blocks.length, 4);
});
