// @ts-nocheck
// Post-login destination helper. Only same-origin relative paths are ever
// honored, so a crafted ?returnTo= query string can't be used to redirect
// people off-site after they log in.
export function safeReturnTo() {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo");
  if (!returnTo) return "/";
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return "/";
}
