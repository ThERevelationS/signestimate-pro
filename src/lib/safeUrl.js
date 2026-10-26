// Records carry free-text link fields (typed by users, or imported from the
// external CCS database lookup). Only http/https targets may ever become an
// href — anything else ("javascript:", "data:", ...) would run script in the
// session of whoever clicks the link, including admins who can see every
// project. Returns "" for anything unsafe, so it can gate the anchor itself.

export function safeExternalUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}