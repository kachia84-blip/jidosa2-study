// 그래프를 그려야 하는 문항의 그림(모양만 나타낸 개념도, 눈금 값 없음). 문항 id → SVG.
const AXIS = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>`;
const DASH = `stroke="currentColor" stroke-opacity=".45" stroke-dasharray="4 4" fill="none"`;

const FIGURES = {
  "2013-02": {
    caption: "응력-변형률 곡선: O→Y 탄성, Y→Y′ 항복 평탄부, Y′→U 변형경화, U→F 네킹 후 파단",
    svg: `<svg viewBox="0 0 360 250" role="img" aria-label="응력-변형률 곡선">${AXIS}
<g font-size="12" fill="currentColor">
<path d="M40 210V20" stroke="currentColor" marker-end="url(#ah)"/><path d="M40 210H345" stroke="currentColor" marker-end="url(#ah)"/>
<text x="46" y="22">응력 σ</text><text x="292" y="230">변형률 ε</text><text x="28" y="224">O</text>
<path d="M40 90H80M40 45H230M40 75H310" ${DASH}/><path d="M80 90V210M115 92V210M230 45V210" ${DASH}/>
<path d="M40 210L80 90L115 92Q170 40 230 45Q275 50 310 75" stroke="var(--primary)" stroke-width="3" fill="none"/>
<circle cx="80" cy="90" r="4" fill="var(--primary)"/><circle cx="230" cy="45" r="4" fill="var(--primary)"/><circle cx="310" cy="75" r="4" fill="var(--draft)"/>
<text x="72" y="82">Y</text><text x="117" y="86">Y′</text><text x="226" y="36">U</text><text x="314" y="72">F</text>
<text x="2" y="94" font-size="11">σy</text><text x="2" y="49" font-size="11">σu</text><text x="2" y="79" font-size="11">σf</text>
<text x="84" y="128" font-size="11" fill="var(--primary)">항복강도</text><text x="236" y="62" font-size="11" fill="var(--primary)">극한강도</text><text x="282" y="98" font-size="11" fill="var(--draft)">파괴강도</text>
<text x="46" y="200" font-size="11">탄성</text><text x="83" y="200" font-size="11">항복</text><text x="150" y="200" font-size="11">변형경화</text><text x="250" y="200" font-size="11">네킹</text>
</g></svg>`,
  },
  "2016-02": {
    caption: "다짐곡선은 최적함수비에서 최대건조밀도가 되고, 영공기간극곡선(포화도 100%·공기간극 0)은 그 위쪽의 이론적 한계선이에요",
    svg: `<svg viewBox="0 0 360 250" role="img" aria-label="다짐곡선과 영공기간극곡선">${AXIS}
<g font-size="12" fill="currentColor">
<path d="M40 210V20" stroke="currentColor" marker-end="url(#ah)"/><path d="M40 210H345" stroke="currentColor" marker-end="url(#ah)"/>
<text x="46" y="22">건조밀도 ρd</text><text x="282" y="230">함수비 w</text>
<path d="M40 105H132M132 105V210" ${DASH}/>
<path d="M50 170Q130 50 220 150" stroke="var(--primary)" stroke-width="3" fill="none"/>
<path d="M120 50Q200 100 330 135" stroke="var(--draft)" stroke-width="3" fill="none"/>
<circle cx="132" cy="105" r="4" fill="var(--primary)"/>
<text x="2" y="101" font-size="11">ρd max</text><text x="112" y="226" font-size="11">최적함수비</text>
<text x="150" y="176" font-size="11" fill="var(--primary)">다짐곡선(시험값)</text>
<text x="196" y="80" font-size="11" fill="var(--draft)">영공기간극곡선</text><text x="210" y="95" font-size="11" fill="var(--draft)">S=100%, 공기 0</text>
</g></svg>`,
  },
  "2018-03": {
    caption: "하중-침하 곡선: 전반전단은 극한하중이 뚜렷하고 갑자기 침하, 국부전단은 경계가 덜 뚜렷, 관입전단은 극한점 없이 계속 침하",
    svg: `<svg viewBox="0 0 360 250" role="img" aria-label="하중-침하 곡선 세 가지">${AXIS}
<g font-size="12" fill="currentColor">
<path d="M40 30H345" stroke="currentColor" marker-end="url(#ah)"/><path d="M40 30V235" stroke="currentColor" marker-end="url(#ah)"/>
<text x="300" y="22">하중 q</text><text x="46" y="232">침하 s</text>
<path d="M196 30V210" ${DASH}/><text x="182" y="22" font-size="11">qu</text>
<path d="M40 30C120 34 178 46 194 85L198 205" stroke="var(--primary)" stroke-width="3" fill="none"/>
<path d="M40 30C110 45 170 90 215 150L250 205" stroke="var(--draft)" stroke-width="3" fill="none"/>
<path d="M40 30C110 80 220 140 320 200" stroke="currentColor" stroke-opacity=".7" stroke-width="3" fill="none"/>
<text x="204" y="80" font-size="11" fill="var(--primary)">전반전단파괴</text>
<text x="128" y="150" font-size="11" fill="var(--draft)">국부전단파괴</text>
<text x="236" y="214" font-size="11">관입전단파괴</text>
</g></svg>`,
  },
};

export function figureFor(id) {
  const fig = FIGURES[id];
  if (!fig) return null;
  const node = document.createElement("figure");
  node.className = "figure";
  node.innerHTML = fig.svg;
  const caption = document.createElement("figcaption");
  caption.textContent = fig.caption;
  node.append(caption);
  return node;
}

export const FIGURE_IDS = Object.keys(FIGURES);
