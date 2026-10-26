// HTML escaping for values interpolated into generated documents (print /
// popup windows). Records hold user-supplied text, so every field that lands
// inside a generated HTML string must be escaped before it is written.

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}