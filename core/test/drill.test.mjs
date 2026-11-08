import test from "node:test";
import assert from "node:assert/strict";
import { pickDrill } from "../drill.js";
import { loadState, getCard } from "../store.js";

const DAY = 86_400_000;
const now = new Date(2026, 10, 8, 12).getTime();
const fsrs = last => ({ s: 5, d: 5, due: now + 3 * DAY, last, reps: 2, lapses: 0 });

test("pickDrill: 채점한 문항만, 모름·애매 비율과 오래된 정도로 정렬, 상한 없음", () => {
  const state = loadState({ getItem: () => null });
  const items = ["a", "b", "c", "d", "e", "new"].map(id => ({ id, topic: "A" }));
  getCard(state, "a").fsrs = fsrs(now - 1 * DAY);   // 최근, 비율 0     → 0.07
  getCard(state, "b").fsrs = fsrs(now - 30 * DAY);  // 오래됨, 비율 0   → 1
  getCard(state, "c").fsrs = fsrs(now - 1 * DAY);   // 최근, 비율 1     → 1.07
  getCard(state, "d").fsrs = fsrs(now - 7 * DAY);   // 중간, 비율 0.5   → 1
  getCard(state, "e").fsrs = fsrs(now - 1 * DAY);   // a와 같은 점수, a보다 늦게 본 것처럼 last 같음 → id순
  getCard(state, "new");                             // 채점 전: 빠짐
  const log = (id, conf) => state.log.push({ t: now - DAY, id, stage: 2, recalled: 1, total: 2, conf, passed: true });
  log("c", "none"); log("d", "unsure"); log("d", "sure");
  assert.deepEqual(pickDrill(items, state, now), ["c", "b", "d", "a", "e"]);
  assert.deepEqual(pickDrill([], state, now), []);
});
