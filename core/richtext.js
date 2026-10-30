// 답안·풀이·암기 지도 글을 줄마다 종류를 붙인 블록으로 나눈다(화면이 모양을 정한다).
const RULES = [
  ["head", /^\[(.+)\]$/u],
  ["chapter", /^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]\.)\s*(.*)$/u],
  ["section", /^(\d+\))\s*(.*)$/u],
  ["item", /^(\d+\.)\s*(.*)$/u],
  ["sub", /^([가-하]\.)\s*(.*)$/u],
  ["group", /^([①-⑳])\s*(.*)$/u],
  ["q", /^(Q\.)\s*(.*)$/u],
  ["a", /^(A\.)\s*(.*)$/u],
  ["note", /^(※)\s*(.*)$/u],
  ["bullet", /^(-)\s*(.*)$/u],
];

// "핵심어: 설명" 이면 앞쪽을 key 로 뗀다(콜론이 앞쪽 40자 안에 있을 때만).
function splitKey(text) {
  const at = text.search(/[:：]\s/u);
  if (at <= 0 || at > 40) return { s: text };
  return { key: text.slice(0, at).trim(), s: text.slice(at + 1).trim() };
}

export function textBlocks(text) {
  let head = "";
  return String(text || "").split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    for (const [t, re] of RULES) {
      const m = re.exec(line);
      if (!m) continue;
      if (t === "head") { head = m[1]; return { t, s: m[1] }; }
      const body = m[2];
      if (t === "item" || t === "bullet" || t === "sub") return { t, mark: m[1], ...splitKey(body) };
      return { t, mark: m[1], s: body };
    }
    if (head === "키워드" && line.includes(" · ") && !/^두문자/u.test(line)) return { t: "chips", items: line.split(" · ").map(x => x.trim()) };
    if (head === "큰 흐름" && line.includes("→")) return { t: "flow", items: line.split("→").map(x => x.trim()).filter(Boolean) };
    if (/^두문자\s*[:：]/u.test(line)) return { t: "mnemonic", s: line.replace(/^두문자\s*[:：]\s*/u, "") };
    if (head === "용어" && line.includes(" = ")) {
      const [key, ...rest] = line.split(" = ");
      return { t: "term", key: key.trim(), s: rest.join(" = ").trim() };
    }
    return { t: "p", ...splitKey(line) };
  });
}

// 암기 지도를 펼침 사다리 조각으로 나눈다: 키워드 → 큰 흐름 → 묶음마다 세부 → 나머지.
// 묶음 순서(g)를 큰 흐름 상자·묶음 제목·세부 줄·키워드 칩에 붙여 같은 색으로 잇는다.
export function studyChunks(blocks) {
  const chunks = [];
  let head = "", group = -1, pending = [];
  const open = (label, list = []) => { const c = { label, blocks: list }; chunks.push(c); return c; };
  let cur = null;
  for (let b of blocks) {
    if (b.t === "head") {
      head = b.s;
      if (head === "키워드") cur = open("키워드", [b]);
      else if (head === "큰 흐름") cur = open("큰 흐름", [b]);
      else if (head === "세부 흐름") { pending = [b]; cur = null; }
      else if (!chunks.at(-1)?.rest) { cur = open("근거·암기법·셀프 테스트"); cur.rest = true; cur.blocks.push(b); }
      else cur.blocks.push(b);
      continue;
    }
    if (head === "세부 흐름") {
      if (b.t === "group") { group++; cur = open(`${b.mark} ${b.s}`, [...pending, { ...b, g: group }]); pending = []; }
      else if (cur) cur.blocks.push({ ...b, g: group });
      else pending.push(b);
      continue;
    }
    if (b.t === "flow") b = { ...b, g: b.items.map((_, i) => i) };
    (cur || open("", [])).blocks.push(b);
    cur = chunks.at(-1);
  }
  if (pending.length) open("세부 흐름", pending);
  const lines = chunks.flatMap(c => c.blocks).filter(b => b.g >= 0 && b.t === "bullet");
  for (const c of chunks) c.blocks = c.blocks.map(b => b.t !== "chips" ? b : {
    ...b, g: b.items.map(s => lines.find(l => `${l.key || ""} ${l.s}`.includes(s))?.g ?? -1),
  });
  return chunks;
}
