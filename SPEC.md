# 지도사2차 암기앱 모듈 약속 (1차 범위)

정적 PWA. 빌드 없음. 브라우저 ES 모듈(`<script type="module">`), 외부 라이브러리 없음. 모든 화면 문구는 한국어.
코드는 작은 함수로 나누고, 주석은 필요한 곳에만 짧게 한국어로.

## 폴더

```
app/
  index.html, app.js, router.js, sw.js, manifest.webmanifest   (Claude)
  data/questions.json, data/answers.json                       (복사본)
  core/  data.js store.js srs.js mask.js confidence.js          (GPT-A, 순수 로직, DOM 금지)
  core/test/*.test.mjs                                         (GPT-A, `node --test core/test` 로 실행)
  ui/    today.js card.js browse.js stats.js listen.js style.css (GPT-B)
```

## 데이터 모양

questions.json `{"version":1,"items":[Q]}`
Q = `{"id":"2013-01","year":2013,"round":3,"no":1,"type":"단답"|"논술필수"|"논술선택","points":5,"question":"…","subs":["1) …"],"topic":"굴착·흙막이·사면·옹벽", …}`

answers.json `{"version":1,"items":[A]}`
A = `{"id":"2013-01","parts":[P],"status":"확정"|"초안","note":"…"}`
P = `{"label":"" | "1)","items":[{"text":"…","key":["핵심어",…]}],"mnemonic":"방·가·사","basis":"근거 조문 또는 교재(…)","verified":"원문일치"?}`
key는 text 안에 그대로 들어 있는 부분 문자열이다(빈 배열일 수도 있음).

## core/data.js

- `export async function loadData(base = "data/")` → `{ items, byId, topics }`
  - items: Q와 A를 id로 합친 배열 `Item = {...Q, parts, status, note, total}` (total = 모든 part의 items 수 합). 답안이 없는 문항은 parts=[], status="없음".
  - byId: `Map<id, Item>`, topics: 등장 순서대로 중복 없는 주제 배열.
- `export function mergeData(qJson, aJson)` → 위와 같은 결과(동기, 테스트용). loadData는 fetch 후 이걸 부른다.

## core/store.js  (localStorage 키 "jd2.v1")

```
State = { version:1,
  settings:{ newPerDay:5, retention:0.9 },
  cards:{ [id]: Card },
  daily:{ date:"YYYY-MM-DD", newDone:0 },
  log:[ {t:ms, id, stage, recalled, total, conf, passed} ] }   // 최근 2000개만 유지
Card = { stage:1..4, fsrs:FsrsState|null, passDays:["YYYY-MM-DD"], lapses:0,
         itemMiss:{ "partIdx:itemIdx": 횟수 }, lastConf:null|"sure"|"unsure"|"none", lastPassed:null|bool }
```
- `export function loadState(storage = globalThis.localStorage)` → State (없거나 깨지면 기본값). storage 접근은 try/catch.
- `export function saveState(state, storage = globalThis.localStorage)`
- `export function getCard(state, id)` → 없으면 기본 Card를 만들어 넣고 반환 (stage 1, fsrs null).
- `export function dayKey(ms)` → 기기 현지시간 "YYYY-MM-DD".
- `export function isMemorized(card)` → stage===4 이고 passDays 중 서로 다른 날 3일 이상.
- `export function exportState(state)` → JSON 문자열, `export function importState(text)` → State (모양 검사, 틀리면 Error).

## core/srs.js  (FSRS-5)

- FSRS-5 기본 가중치 w[0..18] 사용. 공식: 초기 S=w[grade-1], 초기 D, R=(1+FACTOR*t/S)^DECAY (DECAY=-0.5, FACTOR=19/81),
  다음 간격 = S/FACTOR*(r^(1/DECAY)-1), 성공 시 S 증가식, 실패(grade 1) 시 S 감소식, D 갱신과 평균 회귀. 같은 날 재복습은 단기 안정도식 사용.
- `FsrsState = { s, d, due:ms, last:ms, reps, lapses }`
- `export function review(fsrs /*null이면 새 카드*/, grade /*1~4*/, now, retention = 0.9)` → 새 FsrsState (입력 불변). 간격은 1일 이상, 365일 이하로 반올림.
- `export function retrievability(fsrs, now)` → 0~1
- `export function gradeOf(recalled, total, conf)` → 통과 기준 recalled/total ≥ 0.8. 실패 1, 통과·일부 빠짐 2, 전부 3, 전부+conf "sure" 4.
- `export function nextStage(stage, passed)` → 통과 시 +1(최대 4), 실패 시 -1(최소 2).
- `export function pickToday(items, state, now)` → `{ due:[id], fresh:[id] }`
  - due: fsrs.due ≤ now 인 카드. 확신했는데 틀린 카드(lastConf "sure" && lastPassed false)를 맨 앞, 나머지는 due 오래된 순. 그 뒤 같은 주제가 연달아 오지 않게 섞는다(불가능하면 최소화). 결정적이어야 함(난수 금지).
  - fresh: 아직 카드가 없거나 fsrs null인 문항 중 settings.newPerDay - (오늘 daily.newDone) 개. 확정 문항 우선, 그다음 주제별로 묶어 id 순.
- `export function interleave(ids, topicOf)` 도 export (테스트용).

## core/mask.js

Segment = `{ t:"text"|"hole"|"hint", s:string }`
- `export function maskItem(item /*{text,key}*/, stage)` → Segment[]
  - stage 1: `[{t:"text",s:text}]`
  - stage 2: key 문자열마다 해당 부분을 `{t:"hole",s:원래글자}`로, 나머지는 text. key가 없으면 문장 뒤쪽 절반 어절을 hole로.
  - stage 3: 첫 글자(공백·기호 제외 첫 글자)는 `{t:"hint"}`, 나머지 전부 hole 하나.
  - stage 4: `[]` (화면은 항목 수만 보여 줌)
- `export function maskPart(part, stage)` → `{ label, mnemonic: stage>=3 ? null : mnemonic, count, lines: Segment[][] }`
- `export function initials(texts)` → 각 항목 첫 글자를 "·"로 이은 문자열.
- `export function countHint(question)` → 문제 글에서 "5가지", "3개" 같은 숫자를 찾아 숫자 또는 null.

## core/confidence.js

- `export const CONF = ["sure","unsure","none"]`, 표시 문구 { sure:"확신", unsure:"애매", none:"모름" }
- `export function recordResult(state, id, { stage, recalled, total, conf, passed, missed /*["0:2",…]*/ }, now)`
  → getCard로 카드를 갱신(lastConf, lastPassed, itemMiss 누적, 통과면 passDays에 오늘 추가(중복 없이), 실패면 lapses+1),
    log 추가(2000개 제한). FSRS·stage 갱신은 하지 않는다(그건 ui가 srs로).
- `export function illusions(state)` → lastConf "sure" && lastPassed false 인 id 배열.
- `export function calibration(state)` → `{ sure:{n,ok}, unsure:{n,ok}, none:{n,ok} }` (log 기준).
- `export function weakItems(state, byId, limit = 30)` → `[{id, part, item, text, miss}]` miss 많은 순.

## ui 공통 약속 (GPT-B)

각 화면 모듈은 `export function render(root, ctx)` 하나를 내보낸다. root는 비워진 `<main>` 요소. 이벤트는 root 안에만 단다.
ctx = `{ data /*loadData 결과*/, state, save() /*state 저장*/, go(route, params) /*화면 전환*/, params /*현재 라우트 파라미터*/, now() }`
라우트: `today`, `card` (params: `{ queue:"id,id,…", i:"0", mode:"review"|"one" }`), `browse` (`{topic, year}`), `stats`, `listen` (`{queue}`).
core 함수는 `../core/xxx.js`에서 import 한다. innerHTML에 데이터 문자열을 넣을 때는 반드시 escape 한다(또는 textContent).

### ui/today.js
- 상단: 오늘 날짜, 복습 n개, 새 문항 m개, 외운 문항 k/126.
- 버튼 "오늘 공부 시작" → queue = due 다음 fresh, `go("card",{queue, i:0, mode:"review"})`. 둘 다 0이면 "오늘 할 일 끝" 안내 + "새 문항 더 하기"(fresh 5개 추가 뽑기).
- 착각 문항(confidence.illusions)이 있으면 빨간 상자로 개수와 "먼저 복습" 버튼.
- 설정: 하루 새 문항 수(1~20) 입력, 내보내기(텍스트 파일 저장)·가져오기(파일 선택) 버튼.
- 아래 메뉴: 오늘 · 목록 · 통계 · 듣기 (모든 화면 공통 하단 탭은 index.html이 그림. 화면 모듈은 그리지 않는다).

### ui/card.js  (암기 카드, 가장 중요)
한 문항씩 queue를 진행. 화면 위: 진행 "3 / 12", 연도·회차·번호·배점·주제, status가 "초안"이면 노란 "초안·확인 필요" 배지, note가 있으면 접힌 "메모".
흐름:
1. 새 카드(fsrs null): 사전 시험 — 문제와 countHint(또는 total)로 "몇 가지 떠오르나요? 10초" 카운트다운, "답 보기"로 건너뛰기 가능 → stage 1 전체 답안(항목 번호 목록 + 두문자 + basis) → "다 읽었어요" → 카드 stage를 2로 바꾸고 이 문항을 queue 맨 뒤에 다시 넣는다(같은 세션에서 바로 인출 연습). daily.newDone+1.
2. 복습(stage≥2): 먼저 확신도 3버튼(확신/애매/모름) → maskPart로 가린 답안 표시(hole은 밑줄 빈칸, 눌러서 개별 공개 가능; stage 4는 "n가지를 모두 떠올려 보세요"와 part 라벨만) → "답 확인" → 전체 답안 공개, 항목마다 "떠올림 / 못 떠올림" 토글(기본 떠올림) → "채점".
3. 채점: recalled/total, passed, grade=gradeOf, card.fsrs=review(card.fsrs, grade, now, settings.retention), card.stage=nextStage, confidence.recordResult, save(). 결과 한 줄(“통과! 다음 복습 3일 뒤 · 단계 3 앞글자”) 보여 주고 "다음".
4. 항목마다 "근거" 펼치기(part.basis, verified 있으면 "원문 확인" 표시).
5. queue 끝 → 요약(통과 x / 전체 y, 걸린 시간) + "10~15분 했으면 5분 쉬세요" 안내 + 오늘로 버튼.
mode "one"이면 한 문항만 하고 목록으로 돌아감.
단계 이름: 1 보기, 2 빈칸, 3 앞글자, 4 백지.

### ui/browse.js
- 주제 칩(전체+topics), 연도 선택. 목록 항목: "2025-06 · 논술필수 · 주제", 문제 앞부분 60자, 단계 배지(새/빈칸/앞글자/백지/외움), 초안 표시.
- 항목 누르면 `go("card",{queue:id, i:0, mode:"one"})`.
- "이 주제 듣기" 버튼 → `go("listen",{queue: 보이는 id들})`.

### ui/stats.js
- 전체 외움 비율 막대, 주제별 외움/학습중/새 비율 막대(가로 막대, div로).
- 확신도 보정표(calibration): 확신 정답률·애매·모름.
- 착각 문항 목록, 자주 빠뜨리는 항목 top 10(weakItems) — 누르면 그 문항 카드(mode one).

### ui/listen.js
- speechSynthesis(ko-KR, 속도 0.95 조절 가능 0.7~1.3). queue 없으면 오늘 복습+새 문항, 그래도 없으면 전체 확정 문항.
- 순서: "n번째, 연도 회차" → 문제 읽기 → 3초 쉼(조절 1~10초) → part 라벨과 항목을 "첫째, …" 순서로 읽기 → 두문자 읽기 → 2초 → 다음.
- 재생/일시정지/이전/다음 버튼, 현재 문항 글자 표시. 화면 떠날 때(render가 다시 불리기 전) speechSynthesis.cancel() — root에 `data-cleanup`이 아니라 `window.addEventListener("hashchange", …, {once:true})`로 정리.
- speechSynthesis가 없으면 안내 문구만.

### ui/style.css
- 모바일 우선(폭 360~480 기준, 데스크톱은 가운데 최대 560px). 글자 17px, 버튼 높이 48px 이상, 다크 모드(prefers-color-scheme) 지원, CSS 변수로 색 정의.
- 클래스 약속: `.hole`(밑줄 빈칸, 눌러 공개 시 `.open`), `.hint`, `.badge`, `.badge.draft`, `.badge.stage1~4`, `.badge.done`, `.btn`, `.btn.primary`, `.btn.danger`, `.row`, `.muted`, `.alert`, `.bar` > `.fill`, 하단 탭 `nav.tabs a.on`.
- 주제 색: `--topic-0` ~ `--topic-10`.
