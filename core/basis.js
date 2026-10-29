// 근거 문구를 화면용 조각으로 나눈다: 글자, 원문 링크, 교재 안내.
const URL_RE = /\(?\s*(?:원문\s*:\s*)?(https?:\/\/[^\s)]+)\s*\)?/gu;
const LAW_RE = /(산업안전보건기준에 관한 규칙|산업안전보건법 시행규칙|산업안전보건법 시행령|산업안전보건법|건설기술 진흥법 시행규칙|건설기술 진흥법 시행령|건설기술 진흥법)\s*제(\d+)조(?:의(\d+))?/u;
const RULE_RE = /([가-힣]+표준안전작업지침|보호구 안전인증 고시)/u;

function linkLabel(url) {
  if (url.includes("kosha.or.kr")) return "KOSHA 자료 받기";
  return url.includes("flDownload") ? "별표 원문 받기" : "법제처 원문 열기";
}

// 주소가 없을 때 법령 이름·조문으로 법제처 조문 주소를 만든다.
export function lawUrl(text) {
  const rule = RULE_RE.exec(text);
  if (rule) return `https://www.law.go.kr/행정규칙/${rule[1].replaceAll(" ", "")}`;
  const match = LAW_RE.exec(text);
  if (!match) return null;
  const article = `제${match[2]}조${match[3] ? `의${match[3]}` : ""}`;
  return `https://www.law.go.kr/법령/${match[1].replaceAll(" ", "")}/${article}`;
}

export function basisPieces(text) {
  const pieces = [];
  const urls = [];
  const rest = String(text || "").replace(URL_RE, (_, url) => { urls.push(url); return ""; }).trim();
  if (rest) pieces.push({ t: "text", s: rest });
  if (!urls.length) {
    const made = lawUrl(rest);
    if (made) urls.push(made);
  }
  urls.forEach(url => pieces.push({ t: "link", href: url, s: linkLabel(url) }));
  if (/교재/u.test(rest)) pieces.push({ t: "note", s: "교재(공학) 내용이라 법령 원문 링크가 없어요." });
  return pieces;
}
