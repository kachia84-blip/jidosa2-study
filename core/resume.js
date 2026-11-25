// 오늘의 공부를 하다 멈춘 자리. 틈틈이 들어와도 "오늘"을 누르면 그 카드부터 이어서 한다.
const KEY = "jd2.resume";

export function saveResume(queue, index, storage) {
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify({ queue, i: index })); } catch { /* 저장 못 하면 이어하기만 빠짐 */ }
}

export function clearResume(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(KEY); } catch { /* 무시 */ }
}

export function loadResume(storage) {
  try {
    const r = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY));
    return Array.isArray(r?.queue) && Number.isInteger(r.i) ? r : null;
  } catch { return null; }
}

// 남은 카드 중 지금도 할 것만 남긴다(채점해서 다음 복습일이 미래로 간 카드는 뺌). 남은 게 없으면 null.
export function pickResume(resume, byId, cards, now) {
  if (!resume) return null;
  const done = resume.queue.slice(0, resume.i).filter(id => byId.has(id));
  const left = resume.queue.slice(resume.i).filter(id => byId.has(id)
    && !(cards[id]?.fsrs && cards[id].fsrs.due > now));
  return left.length ? { queue: [...done, ...left], i: done.length } : null;
}
