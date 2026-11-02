// 교재(공학) 항목을 출처 2곳으로 확인한 결과. 항목마다 판정과 출처 링크를 보여 준다.
import { withIcon } from "./icons.js";

const LABEL = { "일치": "출처 일치", "수정": "출처대로 고침", "근거없음": "출처 못 찾음", "법령": "법령 원문 확인" };

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "출처"; }
}

export function appendXcheck(parent, part) {
  if (!part.xcheck?.some(Boolean)) return;
  const details = el("details", null, "basis xcheck");
  const missing = part.xcheck.filter(c => c?.verdict === "근거없음").length;
  details.append(el("summary", withIcon(missing ? `출처 확인 · ${missing}개 못 찾음` : "출처 확인")));
  const list = el("ol");
  part.xcheck.forEach((c, i) => {
    const li = el("li");
    if (!c) { li.append(el("span", "확인 안 함", "muted")); list.append(li); return; }
    li.append(el("span", LABEL[c.verdict] || c.verdict, c.verdict === "근거없음" ? "badge draft" : "badge"),
      el("span", ` ${part.items[i]?.text ?? ""}`));
    if (c.note) li.append(el("p", c.note, "muted"));
    c.src.forEach(url => {
      const link = el("a", host(url), "btn basis-link");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      li.append(link);
    });
    list.append(li);
  });
  details.append(list);
  parent.append(details);
}
