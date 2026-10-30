import test from "node:test";
import assert from "node:assert/strict";
import { upcoming, ddayText } from "../schedule.js";

const at = s => Date.parse(`${s}T09:00:00+09:00`);
const events = [
  { name: "지난 시험", start: "2026-06-06" },
  { name: "접수", start: "2027-02-22", end: "2027-02-26", estimate: true },
  { name: "시험", start: "2027-03-27", exam: true },
];

test("upcoming: 지난 일정은 빼고 가까운 순, D-day 계산", () => {
  const list = upcoming(events, at("2027-02-20"));
  assert.deepEqual(list.map(e => [e.name, e.days]), [["접수", 2], ["시험", 35]]);
  assert.equal(ddayText(list[0]), "약 D-2");
  assert.equal(ddayText(list[1]), "D-35");
});

test("upcoming: 기간 중이면 진행 중", () => {
  const list = upcoming(events, at("2027-02-24"));
  assert.equal(ddayText(list[0]), "진행 중");
});
