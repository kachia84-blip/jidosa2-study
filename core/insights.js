// 통계 계산(화면과 분리): 기출 출제 경향, 내 성적, 약한 분야 우선순위.
const DAY = 86400000;
const dayOf = t => new Date(t + 9 * 3600000).toISOString().slice(0, 10);
const rate = (a, b) => (b ? a / b : null);

// 기출 출제 경향: 주제별 출제 수·비중·점수 합·최근 3년 수·출제 연도.
export function examTrends(items) {
  const last = Math.max(...items.map(i => i.year));
  const map = new Map();
  items.forEach(i => {
    if (!map.has(i.topic)) map.set(i.topic, { topic: i.topic, count: 0, points: 0, recent: 0, years: new Set() });
    const t = map.get(i.topic);
    t.count++; t.points += i.points || 0; t.years.add(i.year);
    if (i.year > last - 3) t.recent++;
  });
  const total = items.length;
  const recentTotal = items.filter(i => i.year > last - 3).length;
  // 최근 3년 비중이 전체 비중보다 30% 넘게 높으면 up, 낮으면 down
  const trendOf = t => {
    const ratio = (t.recent / recentTotal) / (t.count / total);
    return ratio > 1.3 ? "up" : ratio < 0.7 ? "down" : "flat";
  };
  return {
    total, first: Math.min(...items.map(i => i.year)), last,
    topics: [...map.values()].map(t => ({ ...t, share: t.count / total, trend: trendOf(t), years: [...t.years].sort() }))
      .sort((a, b) => b.count - a.count || b.points - a.points),
  };
}

// 내 성적: 전체 떠올린 비율·통과율, 최근 days일 날짜별, 단계별 통과율.
export function myScore(log, now, days = 14) {
  const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);
  const today = Date.parse(`${dayOf(now)}T00:00:00+09:00`);
  const daily = Array.from({ length: days }, (_, k) => {
    const day = dayOf(today - (days - 1 - k) * DAY);
    const list = log.filter(x => dayOf(x.t) === day);
    return { day, n: list.length, rate: rate(sum(list, x => x.recalled), sum(list, x => x.total)) };
  });
  const stages = [2, 3, 4].map(stage => {
    const list = log.filter(x => x.stage === stage);
    return { stage, n: list.length, pass: rate(list.filter(x => x.passed).length, list.length) };
  });
  return {
    n: log.length, questions: new Set(log.map(x => x.id)).size,
    recall: rate(sum(log, x => x.recalled), sum(log, x => x.total)),
    pass: rate(log.filter(x => x.passed).length, log.length), daily, stages,
  };
}

// 약한 분야: 주제별 내 정답률(문항마다 최근 3번만)과 출제 비중을 곱해 우선순위를 매긴다.
export function weakTopics(items, log) {
  const trends = new Map(examTrends(items).topics.map(t => [t.topic, t]));
  const topicOf = new Map(items.map(i => [i.id, i.topic]));
  const recentById = new Map();
  log.forEach(x => {
    if (!topicOf.has(x.id)) return;
    const list = recentById.get(x.id) || [];
    list.push(x); recentById.set(x.id, list.slice(-3));
  });
  return [...trends.values()].map(t => {
    const tries = [...recentById.entries()].filter(([id]) => topicOf.get(id) === t.topic).flatMap(([, l]) => l);
    const recalled = tries.reduce((s, x) => s + x.recalled, 0);
    const total = tries.reduce((s, x) => s + x.total, 0);
    const r = rate(recalled, total);
    const studied = new Set(tries.map(x => x.id)).size;
    return { topic: t.topic, share: t.share, count: t.count, studied, rate: r, priority: t.share * (1 - (r ?? 0)) };
  }).sort((a, b) => b.priority - a.priority || b.count - a.count);
}
