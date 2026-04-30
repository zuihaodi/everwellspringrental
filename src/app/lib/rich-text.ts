function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyInlineMarks(input: string): string {
  return input
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/==(.+?)==/g, '<mark class="bg-yellow-100 px-1 rounded">$1</mark>');
}

export function renderRichText(input?: string): string {
  if (!input) return "";
  const escaped = escapeHtml(input);
  return applyInlineMarks(escaped).replace(/\r?\n/g, "<br />");
}
