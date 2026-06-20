import { ref, computed } from 'vue';
import { apiUrl } from '../lib/helpers.js';

export const SESSION_KEY = 'faq_admin_session';

const adminToken = ref('');
const adminUser = ref(null);
let enterAppCallback = null;

export function useAuth() {
  const authenticated = computed(() => !!adminToken.value);

  function authHeaders(extra = {}) {
    return { 'x-admin-token': adminToken.value, ...extra };
  }

  function saveSession(token, user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setEnterAppCallback(fn) {
    enterAppCallback = fn;
  }

  async function login(email, password) {
    const r = await fetch(apiUrl('/api/admin/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      adminToken.value = data.token;
      adminUser.value = data.user;
      saveSession(data.token, data.user);
      if (enterAppCallback) await enterAppCallback();
      return { ok: true };
    }
    return { ok: false };
  }

  function logout() {
    adminToken.value = '';
    adminUser.value = null;
    clearSession();
  }

  async function tryRestoreSession() {
    const saved = loadSession();
    if (!saved?.token) return;
    adminToken.value = saved.token;
    adminUser.value = saved.user || null;
    try {
      const r = await fetch(apiUrl('/api/admin/faqs?page=1&limit=1'), { headers: authHeaders() });
      if (!r.ok) throw new Error();
      if (enterAppCallback) await enterAppCallback();
    } catch {
      clearSession();
      adminToken.value = '';
      adminUser.value = null;
    }
  }

  return {
    adminToken,
    adminUser,
    authenticated,
    login,
    logout,
    tryRestoreSession,
    authHeaders,
    setEnterAppCallback
  };
}
