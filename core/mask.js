function firstCharacter(text) {
  return /[\p{L}\p{N}]/u.exec(text);
}

function keywordRanges(text, keys) {
  const ranges = [];
  for (const key of new Set(keys.filter(key => typeof key === "string" && key.length > 0))) {
    let start = text.indexOf(key);
    while (start !== -1) {
      ranges.push([start, start + key.length]);
      start = text.indexOf(key, start + 1);
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged = [];
  for (const range of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && range[0] < previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

function segmentsFromRanges(text, ranges) {
  const segments = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ t: "text", s: text.slice(cursor, start) });
    segments.push({ t: "hole", s: text.slice(start, end) });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ t: "text", s: text.slice(cursor) });
  return segments;
}

export function maskItem(item, stage) {
  const { text, key = [] } = item;
  if (stage === 1) return [{ t: "text", s: text }];
  if (stage >= 4) return [];
  if (stage === 3) {
    const first = firstCharacter(text);
    if (!first) return text ? [{ t: "hole", s: text }] : [];
    const end = first.index + first[0].length;
    return [
      ...(first.index ? [{ t: "text", s: text.slice(0, first.index) }] : []),
      { t: "hint", s: first[0] },
      ...(end < text.length ? [{ t: "hole", s: text.slice(end) }] : []),
    ];
  }
  const keys = key.filter(value => typeof value === "string" && value.length > 0);
  if (keys.length) return segmentsFromRanges(text, keywordRanges(text, keys));
  const words = [...text.matchAll(/\S+/gu)];
  if (!words.length) return text ? [{ t: "text", s: text }] : [];
  return segmentsFromRanges(text, [[words[Math.floor(words.length / 2)].index, text.length]]);
}

export function maskPart(part, stage) {
  return {
    label: part.label,
    mnemonic: stage >= 3 ? null : part.mnemonic,
    count: part.items.length,
    lines: part.items.map(item => maskItem(item, stage)),
  };
}

export function initials(texts) {
  return texts.map(text => firstCharacter(text)?.[0] ?? "").join("·");
}

export function countHint(question) {
  const match = /(\d+)\s*(?:가지|개)/u.exec(question);
  return match ? Number(match[1]) : null;
}
