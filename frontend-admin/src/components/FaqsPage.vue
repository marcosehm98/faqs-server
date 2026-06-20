<script setup>
import { computed } from 'vue';
import { formatDate } from '../lib/helpers.js';
import AdminPagination from './AdminPagination.vue';

const props = defineProps({
  faqs: { type: Array, default: () => [] },
  adminMeta: { type: Object, default: () => ({}) },
  adminPage: { type: Number, default: 1 },
  adminPageSize: { type: Number, default: 25 }
});

const emit = defineEmits(['openAdd', 'openEdit', 'confirmDelete', 'restore', 'changePageSize', 'goToPage']);

const sortedFaqs = computed(() =>
  [...props.faqs].sort((a, b) => (a.order || 999) - (b.order || 999) || a.createdAt - b.createdAt)
);

const stats = computed(() => {
  const active = props.adminMeta.active ?? 0;
  const annulled = props.adminMeta.annulled ?? 0;
  const catCount = props.adminMeta.categories ?? 0;
  const attCount = props.adminMeta.attachments ?? 0;
  return [
    { value: active, label: 'Activas', icon: '❓' },
    { value: annulled, label: 'Anuladas', icon: '🚫' },
    { value: catCount, label: 'Categorías', icon: '📂' },
    { value: attCount, label: 'Archivos adjuntos', icon: '📎' }
  ];
});

const faqSubtitle = computed(() => {
  const active = props.adminMeta.active ?? 0;
  const annulled = props.adminMeta.annulled ?? 0;
  const catCount = props.adminMeta.categories ?? 0;
  const lastStr = props.adminMeta.lastUpdatedAt
    ? ` · Última actualización: ${formatDate(props.adminMeta.lastUpdatedAt)}`
    : '';
  const annulStr = annulled ? ` · ${annulled} anulada${annulled !== 1 ? 's' : ''}` : '';
  return `${active} activa${active !== 1 ? 's' : ''} en ${catCount} categoría${catCount !== 1 ? 's' : ''}${annulStr}${lastStr}`;
});

const pageInfo = computed(() => {
  const total = props.adminMeta.total || 0;
  if (!total) return '';
  const from = (props.adminPage - 1) * props.adminPageSize + 1;
  const to = from + props.faqs.length - 1;
  const totalPages = props.adminMeta.totalPages || 1;
  return `${from}–${to} de ${total} · Página ${props.adminPage} de ${totalPages}`;
});

function catLabel(f) {
  if (f.categoryGroup) {
    if (f.categoryId && f.category && f.category !== f.categoryGroup) {
      return `${f.categoryGroup} › ${f.category}`;
    }
    return f.categoryGroup;
  }
  return f.category || 'General';
}

function orderNumHtml(n) {
  const num = parseInt(n, 10);
  if (!num || num >= 999) return '·';
  return num;
}
</script>

<template>
  <div id="page-faqs">
    <div class="stats-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div style="font-size:1.4rem;margin-bottom:4px">{{ s.icon }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <div class="page-header">
      <div>
        <div class="page-title">Preguntas frecuentes</div>
        <div class="page-sub">{{ faqSubtitle }}</div>
      </div>
      <button class="btn btn-primary" @click="emit('openAdd')">+ Nueva pregunta</button>
    </div>

    <div class="pagination-toolbar">
      <label>
        Mostrar
        <select
          id="adminPageSizeSelect"
          :value="adminPageSize"
          @change="emit('changePageSize', parseInt($event.target.value, 10))"
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="75">75</option>
          <option value="100">100</option>
        </select>
        por página
      </label>
      <span class="pagination-info">{{ pageInfo }}</span>
    </div>

    <div id="faqAdminList">
      <div v-if="!sortedFaqs.length" class="empty">
        <div class="ei">📭</div>
        <p>No hay preguntas aún. ¡Agrega la primera!</p>
      </div>

      <div
        v-for="f in sortedFaqs"
        :key="f.id"
        class="faq-row"
        :class="{ annulled: f.isAnnulled }"
      >
        <div style="margin-top:2px;font-size:20px">
          <span
            v-if="orderNumHtml(f.order) !== '·'"
            style="font-size:0.75rem;color:var(--text-2);font-weight:600"
          >{{ orderNumHtml(f.order) }}</span>
          <span v-else>·</span>
        </div>
        <div class="faq-row-info">
          <div class="faq-row-q" :title="f.question">{{ f.question }}</div>
          <div class="faq-row-meta">
            <span class="cat-badge">{{ catLabel(f) }}</span>
            <span v-if="f.isAnnulled" class="annulled-badge">
              Anulada<span v-if="f.deletedAt"> · {{ formatDate(f.deletedAt) }}</span>
            </span>
            <span v-for="t in (f.tags || []).slice(0, 3)" :key="t" class="tag-badge">{{ t }}</span>
            <span v-if="(f.attachments || []).length" class="att-badge">📎 {{ f.attachments.length }}</span>
            <span
              v-if="f.updatedAt || f.createdAt"
              class="date-badge"
              :title="f.updatedAt ? 'Actualizado' : 'Publicado'"
            >
              📅 {{ f.updatedAt ? 'Actualizado' : 'Publicado' }}: {{ formatDate(f.updatedAt || f.createdAt) }}
            </span>
          </div>
        </div>
        <div class="faq-row-actions">
          <template v-if="f.isAnnulled">
            <button class="btn btn-success btn-sm" @click="emit('restore', f.id)">↩ Restaurar</button>
          </template>
          <template v-else>
            <button class="btn btn-ghost btn-sm" @click="emit('openEdit', f.id)">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" title="Anular" @click="emit('confirmDelete', f.id)">🚫</button>
          </template>
        </div>
      </div>
    </div>

    <AdminPagination
      :page="adminPage"
      :total-pages="adminMeta.totalPages || 1"
      :total="adminMeta.total || 0"
      :page-size="adminPageSize"
      :item-count="faqs.length"
      @go-to-page="emit('goToPage', $event)"
    />
  </div>
</template>
