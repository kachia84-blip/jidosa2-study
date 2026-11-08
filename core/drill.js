// 복습 탭: 한 번이라도 채점한 문항을 상한 없이 이어서 복습한다.
// 순서 점수 = 모름·애매 비율(0~1) + 마지막 복습 뒤 지난 날(14일이면 1, 그 이상은 1로 고정).
// 점수가 같으면 더 오래전에 본 문항부터.
import { weakRatio } from "./srs.js";

const DAY = 86_400_000;

export function drillScore(card, log, id, now) {
  const stale = Math.min(1, Math.max(0, (now - card.fsrs.last) / (14 * DAY)));
  return weakRatio(log, id) + stale;
}

export function pickDrill(items, state, now) {
  const cardOf = id => Object.hasOwn(state.cards, id) ? state.cards[id] : undefined;
  return items
    .filter(item => cardOf(item.id)?.fsrs)
    .map(item => ({ id: item.id, last: cardOf(item.id).fsrs.last,
      score: drillScore(cardOf(item.id), state.log, item.id, now) }))
    .sort((a, b) => b.score - a.score || a.last - b.last || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(x => x.id);
}
