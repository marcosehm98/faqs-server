export const BASE = '/faqs-logihub';

export function apiUrl(path) {
  const base = location.pathname.startsWith(BASE) ? BASE : '';
  return base + path;
}

export const CAT_ICONS = {
  General: '📋',
  Pagos: '💳',
  Envíos: '📦',
  Devoluciones: '↩️',
  Cuenta: '👤',
  Soporte: '🛠️',
  Productos: '🛍️',
  Seguridad: '🔐',
  default: '📄'
};

export const FONT_URLS = {
  satoshi: 'https://fonts.cdnfonts.com/css/satoshi',
  'dm-sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  'plus-jakarta': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  outfit: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap',
  sora: 'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap',
  manrope: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'
};

export const FONT_FAMILIES = {
  satoshi: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
  'dm-sans': "'DM Sans', sans-serif",
  'plus-jakarta': "'Plus Jakarta Sans', sans-serif",
  outfit: "'Outfit', sans-serif",
  sora: "'Sora', sans-serif",
  manrope: "'Manrope', sans-serif"
};

export function formatDate(ts) {
  if (!ts) return '';
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

export function getShareUrl(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('p', id);
  url.hash = '';
  return url.toString();
}

export function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
  }
  return copyTextFallback(text);
}

function copyTextFallback(text) {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    try {
      document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(ta);
    }
  });
}
