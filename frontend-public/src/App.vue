<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import SiteHeader from './components/SiteHeader.vue';
import Sidebar from './components/Sidebar.vue';
import FaqList from './components/FaqList.vue';
import PaginationBar from './components/PaginationBar.vue';
import SuggestBox from './components/SuggestBox.vue';
import SuggestModal from './components/SuggestModal.vue';
import Lightbox from './components/Lightbox.vue';
import ShareToast from './components/ShareToast.vue';
import { apiUrl, FONT_FAMILIES, FONT_URLS, getShareUrl, copyTextToClipboard } from './lib/helpers.js';

const faqs = ref([]);
const activeCategory = ref('all');
const currentPage = ref(1);
const pageSize = ref(25);
const totalPages = ref(1);
const totalCount = ref(0);
const categoryCounts = ref([]);
const categoryTree = ref([]);
const expandedGroups = ref(new Set());
const searchQuery = ref('');
const searchInput = ref('');
const pendingOpenId = ref(null);
const openCardId = ref(null);
const highlightCardId = ref(null);
const loading = ref(true);
const loadError = ref(null);
const faqsLoading = ref(false);

const logoSrc = ref(apiUrl('/logo-logihub.svg'));
const logoAlt = ref('LogiHub');

const suggestOpen = ref(false);
const lightboxSrc = ref('');
const lightboxVisible = ref(false);
const toastVisible = ref(false);
const toastMessage = ref('');
let toastTimer = null;
let searchDebounce = null;

const sectionTitle = computed(() => categoryLabel(activeCategory.value));

const resultsCount = computed(() => {
  const from = totalCount.value ? (currentPage.value - 1) * pageSize.value + 1 : 0;
  const to = totalCount.value ? from + faqs.value.length - 1 : 0;
  return totalCount.value ? `${from}–${to} de ${totalCount.value}` : '0 preguntas';
});

function categoryLabel(cat) {
  if (cat === 'all') return 'Todas las preguntas';
  if (cat.startsWith('group:')) {
    const g = categoryTree.value.find((x) => x.id === parseInt(cat.slice(6), 10));
    return g ? g.name : 'Categoría';
  }
  if (cat.startsWith('id:')) {
    const id = parseInt(cat.slice(3), 10);
    for (const g of categoryTree.value) {
      const c = (g.children || []).find((x) => x.id === id);
      if (c) return `${g.name} › ${c.name}`;
    }
  }
  return cat;
}

function expandGroupForCategory(cat) {
  const next = new Set(expandedGroups.value);
  if (cat.startsWith('group:')) {
    const gid = parseInt(cat.slice(6), 10);
    if (gid) next.add(gid);
  } else if (cat.startsWith('id:')) {
    const id = parseInt(cat.slice(3), 10);
    for (const g of categoryTree.value) {
      if ((g.children || []).some((c) => c.id === id)) {
        next.add(g.id);
        break;
      }
    }
  }
  expandedGroups.value = next;
}

async function loadSiteConfig() {
  try {
    const r = await fetch(apiUrl('/api/site-config'));
    const cfg = await r.json();
    applySiteConfig(cfg);
  } catch {
    /* defaults */
  }
}

function applySiteConfig(cfg) {
  const name = cfg.brandName || 'Centro de Ayuda LogiHub';
  document.title = name;

  const fontKey = cfg.fontFamily || 'satoshi';
  const fontLink = document.getElementById('fontLink');
  if (fontLink) fontLink.href = FONT_URLS[fontKey] || FONT_URLS.satoshi;
  document.documentElement.style.setProperty(
    '--font-body',
    FONT_FAMILIES[fontKey] || FONT_FAMILIES.satoshi
  );

  logoSrc.value = cfg.logoUrl || apiUrl('/logo-logihub.svg');
  logoAlt.value = cfg.logoUrl ? name : 'LogiHub';
}

async function fetchFAQs(page = currentPage.value) {
  if (faqsLoading.value) return;
  faqsLoading.value = true;
  loading.value = true;
  loadError.value = null;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize.value),
    category: activeCategory.value
  });
  const q = searchInput.value.trim();
  if (q) params.set('q', q);
  if (pendingOpenId.value) {
    params.set('openId', String(pendingOpenId.value));
    pendingOpenId.value = null;
  }

  try {
    const r = await fetch(apiUrl(`/api/faqs?${params}`));
    if (!r.ok) throw new Error(`API ${r.status}`);
    const data = await r.json();
    faqs.value = data.faqs || [];
    const meta = data.meta || {};
    currentPage.value = meta.page || page;
    pageSize.value = meta.limit || pageSize.value;
    totalPages.value = meta.totalPages || 1;
    totalCount.value = meta.total || 0;
    categoryCounts.value = meta.categories || [];
    categoryTree.value = meta.categoryTree || [];
    searchQuery.value = q;
  } catch (e) {
    faqs.value = [];
    totalCount.value = 0;
    totalPages.value = 1;
    loadError.value = e.message || 'Error desconocido';
  } finally {
    faqsLoading.value = false;
    loading.value = false;
  }
}

async function loadFAQs() {
  const id = parseInt(new URLSearchParams(window.location.search).get('p'), 10);
  if (id) {
    pendingOpenId.value = id;
    activeCategory.value = 'all';
    searchInput.value = '';
  }
  await fetchFAQs(1);
  if (id && faqs.value.find((f) => f.id === id)) {
    await nextTick();
    openCard(id, true);
  }
}

function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => fetchFAQs(1), 320);
}

function changePageSize(size) {
  pageSize.value = parseInt(size, 10) || 25;
  fetchFAQs(1);
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  fetchFAQs(page).then(() => {
    document.getElementById('faqList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function setCategory(cat) {
  activeCategory.value = cat;
  expandGroupForCategory(cat);
  searchInput.value = '';
  openCardId.value = null;
  fetchFAQs(1);
}

function toggleGroupExpand(groupId) {
  const next = new Set(expandedGroups.value);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);
  expandedGroups.value = next;
}

function toggleCard(id) {
  const was = openCardId.value === id;
  openCardId.value = was ? null : id;
  if (!was) {
    history.replaceState(null, '', getShareUrl(id));
  } else {
    history.replaceState(null, '', window.location.pathname);
  }
}

function openCard(id, scroll = false) {
  openCardId.value = id;
  highlightCardId.value = id;
  setTimeout(() => {
    if (highlightCardId.value === id) highlightCardId.value = null;
  }, 2000);
  if (scroll) {
    nextTick(() => {
      document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

function filterByTag(tag) {
  searchInput.value = tag;
  fetchFAQs(1);
}

function shareFAQ(id) {
  copyTextToClipboard(getShareUrl(id)).finally(() => showShareToast('Copiado para compartir'));
}

function showShareToast(msg) {
  toastMessage.value = msg;
  toastVisible.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 2400);
}

function openSuggestModal() {
  suggestOpen.value = true;
}

function closeSuggestModal() {
  suggestOpen.value = false;
}

function openLightbox(src) {
  lightboxSrc.value = src;
  lightboxVisible.value = true;
}

function closeLightbox() {
  lightboxVisible.value = false;
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    closeLightbox();
    closeSuggestModal();
  }
}

onMounted(() => {
  loadSiteConfig();
  loadFAQs();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  clearTimeout(searchDebounce);
  clearTimeout(toastTimer);
});
</script>

<template>
  <SiteHeader v-model="searchInput" @input="onSearchInput" :logo-src="logoSrc" :logo-alt="logoAlt" />

  <div class="app-layout">
    <Sidebar
      :active-category="activeCategory"
      :category-tree="categoryTree"
      :category-counts="categoryCounts"
      :expanded-groups="expandedGroups"
      @set-category="setCategory"
      @toggle-group="toggleGroupExpand"
      @open-suggest="openSuggestModal"
    />

    <main class="main-content">
      <SuggestBox mobile @open="openSuggestModal" />

      <div class="section-header">
        <h1 class="section-title">{{ sectionTitle }}</h1>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <label style="font-size:0.8rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px">
            Mostrar
            <select
              :value="pageSize"
              @change="changePageSize($event.target.value)"
              style="padding:5px 8px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.8rem;background:var(--surface)"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
            </select>
            por página
          </label>
          <span class="results-count">{{ resultsCount }}</span>
        </div>
      </div>

      <div id="faqList">
        <div v-if="loading" class="loader"><div class="spinner"></div></div>
        <FaqList
          v-else
          :faqs="faqs"
          :search-query="searchQuery"
          :open-card-id="openCardId"
          :highlight-card-id="highlightCardId"
          :load-error="loadError"
          @toggle="toggleCard"
          @share="shareFAQ"
          @filter-tag="filterByTag"
          @open-lightbox="openLightbox"
        />
      </div>

      <PaginationBar
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="totalCount"
        @go="goToPage"
      />
    </main>
  </div>

  <SuggestModal :open="suggestOpen" @close="closeSuggestModal" />
  <Lightbox :visible="lightboxVisible" :src="lightboxSrc" @close="closeLightbox" />
  <ShareToast :visible="toastVisible" :message="toastMessage" />
</template>
