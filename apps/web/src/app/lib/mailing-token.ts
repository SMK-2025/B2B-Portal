export function authorizedMailingToken() {
  if (typeof window === "undefined") return null;
  try {
    const choice = JSON.parse(
      localStorage.getItem("b2b-matching-consent-v1") || "null",
    );
    if (choice?.marketing !== true) return null;
    const token = new URLSearchParams(window.location.search).get("ml");
    return token && /^[A-Za-z0-9_-]{40,60}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
