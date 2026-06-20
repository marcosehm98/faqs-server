<script setup>
import { ref, computed, provide, onMounted, onUnmounted } from 'vue';
import { apiUrl, getClipboardImages } from './lib/helpers.js';
import { useAuth } from './composables/useAuth.js';
import { useToast } from './composables/useToast.js';
import LoginScreen from './components/LoginScreen.vue';
import AdminLayout from './components/AdminLayout.vue';
import FaqsPage from './components/FaqsPage.vue';
import CategoriesPage from './components/CategoriesPage.vue';
import SuggestionsPage from './components/SuggestionsPage.vue';
import SettingsPage from './components/SettingsPage.vue';
import FaqModal from './components/FaqModal.vue';
import CategoryModal from './components/CategoryModal.vue';
import ConfirmAnnulModal from './components/ConfirmAnnulModal.vue';
import ToastContainer from './components/ToastContainer.vue';

const { authenticated, adminUser, login, logout, tryRestoreSession, authHeaders, setEnterAppCallback } = useAuth();
const { toasts, toast } = useToast();

provide('toast', toast);

const currentPage = ref('faqs');
const faqs = ref([]);
const adminMeta = ref({});
const categoryTree = ref([]);
const expandedAdminGroups = ref(new Set());
const suggestions = ref([]);
const suggestPending = ref(0);
const adminPage = ref(1);
const adminPageSize = ref(25);

const siteConfig = ref({ brandName: 'Centro de Ayuda LogiHub', logoUrl: null, fontFamily: 'satoshi' });
const siteFonts = ref({});
const users = ref([]);
const usersError = ref(false);

const faqModalVisible = ref(false);
const faqEditingId = ref(null);
const faqEditData = ref(null);
const faqPrefillQuestion = ref('');
const faqModalRef = ref(null);

const catModalVisible = ref(false);
const catModalType = ref('group');
const catEditingId = ref(null);
const catParentId = ref(null);

const confirmVisible = ref(false);
const deletingId = ref(null);

const adminUserLabel = computed(() => adminUser.value?.name || adminUser.value?.email || 'Conectado');
const faqCount = computed(() => adminMeta.value.active ?? faqs.value.filter((f) => !f.isAnnulled).length);

async function enterApp() {
  await loadFAQs();
  await loadSuggestions();
  await loadUsers();
  await loadSiteConfig();
}

setEnterAppCallback(enterApp);

async function handleLogin({ email, password, resolve }) {
  try {
    const result = await login(email, password);
    resolve(result.ok);
  } catch {
    toast('Error de conexión con el servidor', 'error');
    resolve(false);
  }
}

function handleLogout() {
  logout();
  currentPage.value = 'faqs';
}

function navigate(page) {
  currentPage.value = page;
  if (page === 'settings') {
    loadUsers();
    loadSiteConfig();
  }
  if (page === 'suggestions') loadSuggestions();
  if (page === 'categories') loadCategories();
}

async function loadFAQs(page = adminPage.value) {
  try {
    const params = new URLSearchParams({ page, limit: adminPageSize.value });
    const r = await fetch(apiUrl(`/api/admin/faqs?${params}`), { headers: authHeaders() });
    const data = await r.json();
    faqs.value = data.faqs || [];
    adminMeta.value = data.meta || {};
    categoryTree.value = adminMeta.value.categoryTree || categoryTree.value;
    adminPage.value = adminMeta.value.page || page;
    if (adminMeta.value.limit) adminPageSize.value = adminMeta.value.limit;
  } catch {
    toast('Error cargando datos', 'error');
  }
}

function changeAdminPageSize(size) {
  adminPageSize.value = parseInt(size, 10) || 25;
  loadFAQs(1);
}

function goToAdminPage(page) {
  const total = adminMeta.value.totalPages || 1;
  if (page < 1 || page > total || page === adminPage.value) return;
  loadFAQs(page).then(() => {
    document.getElementById('faqAdminList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function loadCategories() {
  try {
    const r = await fetch(apiUrl('/api/admin/categories'), { headers: authHeaders() });
    const data = await r.json();
    categoryTree.value = data.tree || [];
  } catch {
    toast('Error cargando categorías', 'error');
  }
}

function toggleAdminGroupExpand(groupId) {
  const next = new Set(expandedAdminGroups.value);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);
  expandedAdminGroups.value = next;
}

async function loadSuggestions() {
  try {
    const r = await fetch(apiUrl('/api/admin/suggestions'), { headers: authHeaders() });
    if (!r.ok) throw new Error();
    const data = await r.json();
    suggestions.value = data.suggestions || [];
    suggestPending.value = data.pending || 0;
  } catch {
    /* silencioso */
  }
}

async function loadUsers() {
  usersError.value = false;
  try {
    const r = await fetch(apiUrl('/api/admin/users'), { headers: authHeaders() });
    if (!r.ok) throw new Error();
    users.value = await r.json();
  } catch {
    usersError.value = true;
    users.value = [];
  }
}

async function loadSiteConfig() {
  try {
    const r = await fetch(apiUrl('/api/admin/site-config'), { headers: authHeaders() });
    if (!r.ok) throw new Error();
    const data = await r.json();
    siteConfig.value = { brandName: data.brandName, logoUrl: data.logoUrl, fontFamily: data.fontFamily };
    siteFonts.value = data.fonts || {};
  } catch {
    /* silencioso */
  }
}

function openAdd(prefillQuestion = '') {
  faqEditingId.value = null;
  faqEditData.value = null;
  faqPrefillQuestion.value = prefillQuestion;
  faqModalVisible.value = true;
}

async function openEdit(id) {
  let f = faqs.value.find((x) => x.id === id);
  if (!f) {
    try {
      const r = await fetch(apiUrl(`/api/admin/faqs/${id}`), { headers: authHeaders() });
      if (!r.ok) {
        toast('Pregunta no encontrada', 'error');
        return;
      }
      f = await r.json();
    } catch {
      toast('Error al cargar la pregunta', 'error');
      return;
    }
  }
  faqEditingId.value = id;
  faqEditData.value = f;
  faqPrefillQuestion.value = '';
  faqModalVisible.value = true;
}

function closeFaqModal() {
  faqModalVisible.value = false;
  faqEditingId.value = null;
  faqEditData.value = null;
  faqPrefillQuestion.value = '';
}

async function onFaqSaved() {
  closeFaqModal();
  await loadFAQs();
}

function confirmDelete(id) {
  deletingId.value = id;
  confirmVisible.value = true;
}

function closeConfirm() {
  confirmVisible.value = false;
  deletingId.value = null;
}

async function doDelete() {
  if (!deletingId.value) return;
  try {
    await fetch(apiUrl(`/api/admin/faqs/${deletingId.value}`), {
      method: 'DELETE',
      headers: authHeaders()
    });
    toast('Pregunta anulada', 'success');
    closeConfirm();
    await loadFAQs();
  } catch {
    toast('Error al anular', 'error');
  }
}

async function restoreFAQ(id) {
  try {
    const r = await fetch(apiUrl(`/api/admin/faqs/${id}/restore`), {
      method: 'POST',
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    toast('Pregunta restaurada ✓', 'success');
    await loadFAQs();
  } catch {
    toast('Error al restaurar', 'error');
  }
}

function openCatModal({ type, parentId = null, id = null }) {
  catModalType.value = type;
  catEditingId.value = id;
  catParentId.value = type === 'child' ? parentId : null;
  catModalVisible.value = true;
}

function closeCatModal() {
  catModalVisible.value = false;
  catEditingId.value = null;
  catParentId.value = null;
}

async function onCatSaved() {
  closeCatModal();
  await loadCategories();
  await loadFAQs(adminPage.value);
}

async function deleteCategoryItem({ id, label }) {
  if (!window.confirm(`¿Eliminar "${label}"?`)) return;
  try {
    const r = await fetch(apiUrl(`/api/admin/categories/${id}`), {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'No se pudo eliminar');
    toast('Categoría eliminada', 'success');
    await loadCategories();
    await loadFAQs(adminPage.value);
  } catch (e) {
    toast(e.message || 'Error al eliminar', 'error');
  }
}

function useSuggestion(id) {
  const s = suggestions.value.find((x) => x.id === id);
  if (!s) return;
  currentPage.value = 'faqs';
  openAdd(s.suggestion);
}

async function markReviewed(id) {
  try {
    const r = await fetch(apiUrl(`/api/admin/suggestions/${id}/reviewed`), {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (!r.ok) throw new Error();
    toast('Marcada como revisada', 'success');
    await loadSuggestions();
  } catch {
    toast('Error al actualizar', 'error');
  }
}

async function uploadLogoFile(file) {
  if (!file?.type?.startsWith('image/')) {
    toast('Solo se permiten imágenes', 'error');
    return;
  }
  const formData = new FormData();
  formData.append('files', file);
  try {
    const r = await fetch(apiUrl('/api/admin/upload'), { method: 'POST', headers: authHeaders(), body: formData });
    const data = await r.json();
    if (!r.ok || !data.files?.length) throw new Error();
    siteConfig.value = { ...siteConfig.value, logoUrl: data.files[0].url };
    toast('Logo listo — guarda para aplicar', 'success');
  } catch {
    toast('Error al subir el logo', 'error');
  }
}

function removeLogo() {
  siteConfig.value = { ...siteConfig.value, logoUrl: null };
}

async function saveSiteConfig({ brandName, fontFamily }) {
  try {
    const r = await fetch(apiUrl('/api/admin/site-config'), {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ brandName, logoUrl: siteConfig.value.logoUrl, fontFamily })
    });
    if (!r.ok) throw new Error();
    siteConfig.value = await r.json();
    toast('Apariencia guardada ✓', 'success');
  } catch {
    toast('Error al guardar', 'error');
  }
}

async function createUser({ email, name, password, role, onSuccess }) {
  if (!email || !password) {
    toast('Email y contraseña son obligatorios', 'error');
    return;
  }
  try {
    const r = await fetch(apiUrl('/api/admin/users'), {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, password, name: name || 'Administrador', role })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error');
    toast('Usuario creado ✓', 'success');
    if (onSuccess) onSuccess();
    await loadUsers();
  } catch (e) {
    toast(e.message || 'Error al crear usuario', 'error');
  }
}

async function exportJSON() {
  try {
    const r = await fetch(apiUrl('/api/admin/faqs?all=1'), { headers: authHeaders() });
    const data = await r.json();
    const all = data.faqs || [];
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `faq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast(`Backup descargado (${all.length} preguntas)`, 'success');
  } catch {
    toast('Error al exportar', 'error');
  }
}

async function importJSON(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error();
    if (!window.confirm(`¿Importar ${data.length} preguntas nuevas?\n\nSe añadirán al listado actual. Las preguntas que ya tienes no se borran ni se modifican.`)) return;
    for (const f of data) {
      await fetch(apiUrl('/api/admin/faqs'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(f)
      });
    }
    toast(`${data.length} preguntas importadas`, 'success');
    await loadFAQs();
  } catch {
    toast('Error al importar el archivo', 'error');
  }
}

function onGlobalPaste(e) {
  if (faqModalVisible.value && faqModalRef.value?.handleGlobalPaste) {
    faqModalRef.value.handleGlobalPaste(e);
    if (e.defaultPrevented) return;
  }
  if (currentPage.value === 'settings') {
    const images = getClipboardImages(e.clipboardData);
    if (images.length) {
      e.preventDefault();
      uploadLogoFile(images[0]);
    }
  }
}

function onGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (faqModalVisible.value) closeFaqModal();
    else if (catModalVisible.value) closeCatModal();
    else if (confirmVisible.value) closeConfirm();
  }
}

onMounted(() => {
  tryRestoreSession();
  document.addEventListener('paste', onGlobalPaste);
  document.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('paste', onGlobalPaste);
  document.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <LoginScreen v-if="!authenticated" @login="handleLogin" />

  <template v-else>
    <AdminLayout
      :current-page="currentPage"
      :faq-count="faqCount"
      :suggest-pending="suggestPending"
      :admin-user-label="adminUserLabel"
      @navigate="navigate"
      @logout="handleLogout"
    >
      <FaqsPage
        v-show="currentPage === 'faqs'"
        :faqs="faqs"
        :admin-meta="adminMeta"
        :admin-page="adminPage"
        :admin-page-size="adminPageSize"
        @open-add="openAdd()"
        @open-edit="openEdit"
        @confirm-delete="confirmDelete"
        @restore="restoreFAQ"
        @change-page-size="changeAdminPageSize"
        @go-to-page="goToAdminPage"
      />
      <CategoriesPage
        v-show="currentPage === 'categories'"
        :category-tree="categoryTree"
        :expanded-groups="expandedAdminGroups"
        @toggle-expand="toggleAdminGroupExpand"
        @open-cat-modal="openCatModal"
        @delete-category="deleteCategoryItem"
      />
      <SuggestionsPage
        v-show="currentPage === 'suggestions'"
        :suggestions="suggestions"
        @use-suggestion="useSuggestion"
        @mark-reviewed="markReviewed"
      />
      <SettingsPage
        v-show="currentPage === 'settings'"
        :site-config="siteConfig"
        :site-fonts="siteFonts"
        :users="users"
        :users-error="usersError"
        @save-site-config="saveSiteConfig"
        @upload-logo="uploadLogoFile"
        @remove-logo="removeLogo"
        @create-user="createUser"
        @export-json="exportJSON"
        @import-json="importJSON"
      />
    </AdminLayout>

    <FaqModal
      ref="faqModalRef"
      :visible="faqModalVisible"
      :category-tree="categoryTree"
      :editing-id="faqEditingId"
      :edit-faq="faqEditData"
      :prefill-question="faqPrefillQuestion"
      @close="closeFaqModal"
      @saved="onFaqSaved"
    />

    <CategoryModal
      :visible="catModalVisible"
      :type="catModalType"
      :editing-id="catEditingId"
      :parent-id="catParentId"
      :category-tree="categoryTree"
      @close="closeCatModal"
      @saved="onCatSaved"
    />

    <ConfirmAnnulModal
      :visible="confirmVisible"
      @close="closeConfirm"
      @confirm="doDelete"
    />
  </template>

  <ToastContainer :toasts="toasts" />
</template>
