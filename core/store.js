const STORAGE_KEY = "jd2.v1";
const CONFIDENCES = ["sure", "unsure", "none"];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const timestamp = value => Number.isFinite(value) && Math.abs(value) <= 8.64e15;
const stage = value => Number.isInteger(value) && value >= 1 && value <= 4;

export function dayKey(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) throw new RangeError("올바른 시간이 아닙니다.");
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function defaultState() {
  return {
    version: 1,
    settings: { newPerDay: 5, retention: 0.9 },
    cards: {},
    daily: { date: dayKey(Date.now()), newDone: 0 },
    log: [],
  };
}

function validFsrs(value) {
  return value === null || (object(value)
    && Number.isFinite(value.s) && value.s > 0
    && Number.isFinite(value.d) && value.d >= 1 && value.d <= 10
    && timestamp(value.due) && timestamp(value.last)
    && count(value.reps) && count(value.lapses));
}

function validCard(card) {
  return object(card) && stage(card.stage) && validFsrs(card.fsrs)
    && Array.isArray(card.passDays) && card.passDays.every(validDay)
    && count(card.lapses) && object(card.itemMiss)
    && Object.entries(card.itemMiss).every(([key, value]) => /^\d+:\d+$/.test(key) && count(value))
    && (card.lastConf === null || CONFIDENCES.includes(card.lastConf))
    && (card.lastPassed === null || typeof card.lastPassed === "boolean");
}

function validLog(entry) {
  return object(entry) && timestamp(entry.t) && typeof entry.id === "string"
    && stage(entry.stage) && count(entry.recalled) && count(entry.total)
    && entry.recalled <= entry.total && CONFIDENCES.includes(entry.conf)
    && typeof entry.passed === "boolean";
}

function validateState(state) {
  const valid = object(state) && state.version === 1
    && object(state.settings) && count(state.settings.newPerDay)
    && Number.isFinite(state.settings.retention) && state.settings.retention > 0 && state.settings.retention < 1
    && object(state.cards) && Object.values(state.cards).every(validCard)
    && object(state.daily) && validDay(state.daily.date) && count(state.daily.newDone)
    && Array.isArray(state.log) && state.log.every(validLog);
  if (!valid) throw new Error("학습 데이터 형식이 올바르지 않습니다.");
}

export function importState(text) {
  const state = JSON.parse(text);
  validateState(state);
  state.log = state.log.slice(-2000);
  return state;
}

export function exportState(state) {
  validateState(state);
  return JSON.stringify({ ...state, log: state.log.slice(-2000) });
}

export function loadState(storage) {
  try {
    const text = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY);
    return text === null ? defaultState() : importState(text);
  } catch {
    return defaultState();
  }
}

export function saveState(state, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, exportState(state));
    return true;
  } catch {
    return false;
  }
}

export function getCard(state, id) {
  if (!Object.hasOwn(state.cards, id)) {
    Object.defineProperty(state.cards, id, {
      value: {
        stage: 1, fsrs: null, passDays: [], lapses: 0,
        itemMiss: {}, lastConf: null, lastPassed: null,
      },
      enumerable: true, writable: true, configurable: true,
    });
  }
  return state.cards[id];
}

export function isMemorized(card) {
  return card.stage === 4 && new Set(card.passDays).size >= 3;
}
