export const BASE = '/faqs-logihub';

export function apiUrl(path) {
  const base = location.pathname.startsWith(BASE) ? BASE : '';
  return base + path;
}

export function publicAppUrl() {
  return apiUrl('/') || '/';
}

export function adminAppUrl() {
  return apiUrl('/admin-panel') || '/admin-panel';
}

export function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function fileIcon(type) {
  if (!type) return '📎';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('doc')) return '📝';
  if (type.includes('excel') || type.includes('sheet') || type.includes('xls')) return '📊';
  return '📎';
}

export function orderNum(n) {
  const num = parseInt(n, 10);
  if (!num || num >= 999) return '·';
  return String(num);
}

export function getClipboardImages(dataTransfer) {
  if (!dataTransfer?.items) return [];
  const files = [];
  for (const item of dataTransfer.items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const name = file.name && file.name !== 'image.png' ? file.name : `portapapeles-${Date.now()}.${ext}`;
    files.push(new File([file], name, { type: file.type }));
  }
  return files;
}
