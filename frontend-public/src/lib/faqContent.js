export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>');
}

export function formatFaqContent(text) {
  if (!text) return '';
  const normalized = String(text).replace(/\r\n/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);

  return blocks.map((block) => {
    const lines = block.split('\n');
    const listLines = lines.filter((l) => l.trim());
    const isList = listLines.length > 0 && listLines.every((l) => /^\s*-\s+/.test(l));

    if (isList) {
      const items = listLines
        .map((l) => `<li>${inlineFormat(esc(l.replace(/^\s*-\s+/, '')))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    const body = lines.map((l) => inlineFormat(esc(l))).join('<br>');
    return `<p>${body}</p>`;
  }).join('');
}

export function highlightFaqHtml(html, query) {
  if (!query || !html) return html;
  const q = query.trim();
  if (!q) return html;
  const e = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(${e})`, 'gi'), '<mark class="highlight">$1</mark>');
}

export function hlText(html, q) {
  return highlightFaqHtml(html, q);
}
