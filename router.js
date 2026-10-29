// 해시 라우터: #/route?a=1&b=2
export function parseHash(hash = location.hash) {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  return { route: path || "today", params: Object.fromEntries(new URLSearchParams(query)) };
}

export function toHash(route, params = {}) {
  const q = new URLSearchParams(params).toString();
  return `#/${route}${q ? "?" + q : ""}`;
}

export function startRouter(onRoute) {
  const fire = () => onRoute(parseHash());
  window.addEventListener("hashchange", fire);
  fire();
}
