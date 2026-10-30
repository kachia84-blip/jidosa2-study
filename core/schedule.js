// 시험 일정: 오늘 기준 다가오는(또는 진행 중인) 일정과 D-day.
const DAY = 86400000;
const toDay = s => Date.parse(`${s}T00:00:00+09:00`);

export function upcoming(events, now) {
  const today = toDay(new Date(now + 9 * 3600000).toISOString().slice(0, 10));
  return events
    .filter(e => toDay(e.end || e.start) >= today)
    .map(e => {
      const days = Math.round((toDay(e.start) - today) / DAY);
      return { ...e, days, ongoing: days <= 0 };
    })
    .sort((a, b) => a.days - b.days);
}

export function ddayText(e) {
  if (e.ongoing) return "진행 중";
  return `${e.estimate ? "약 " : ""}D-${e.days}`;
}
