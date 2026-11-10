// 암기 탭: 풀어 본 문항과 그 문항의 두문자·암기법을 모은다.
import { weakRatio } from "./srs.js";

// 한 번이라도 읽었거나(단계 2 이상) 채점한 문항. 최근에 채점한 것부터, 읽기만 한 것은 뒤에.
export function studiedItems(items, state) {
  const last = new Map();
  for (const entry of state.log) last.set(entry.id, Math.max(last.get(entry.id) ?? 0, entry.t));
  return items
    .filter(item => {
      const card = Object.hasOwn(state.cards, item.id) ? state.cards[item.id] : null;
      return item.total && (last.has(item.id) || (card && (card.fsrs || card.stage >= 2)));
    })
    .sort((a, b) => (last.get(b.id) ?? 0) - (last.get(a.id) ?? 0));
}

// study 글에서 [제목] 칸 하나의 본문만 꺼낸다(다음 [제목] 전까지).
export function studySection(study, head) {
  const lines = String(study || "").split("\n");
  const start = lines.findIndex(line => line.trim() === `[${head}]`);
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^\[.+\]$/u.test(line.trim()));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
}

// 문항의 두문자 목록(part 마다)과 암기법 본문.
export function memoOf(item) {
  const mnemonics = item.parts
    .filter(part => part.mnemonic)
    .map(part => ({ label: part.label || "", mnemonic: part.mnemonic, phrase: part.phrase || "" }));
  return { mnemonics, method: studySection(item.study, "암기법") };
}

// 잘 모르는 순: 모름·애매 비율이 높은 것부터, 마지막 채점에서 못 넘긴 것을 앞에, 같으면 최근에 푼 순서(studiedItems 순서 유지).
export function weakFirst(studied, state) {
  const score = item => weakRatio(state.log, item.id)
    + (state.cards[item.id]?.lastPassed === false ? 0.5 : 0);
  return studied.map((item, i) => ({ item, i, s: score(item) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.item);
}
