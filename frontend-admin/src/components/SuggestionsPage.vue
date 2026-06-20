<script setup>
import { computed } from 'vue';
import { formatDate } from '../lib/helpers.js';

const props = defineProps({
  suggestions: { type: Array, default: () => [] }
});

const emit = defineEmits(['useSuggestion', 'markReviewed']);

const pendingCount = computed(() => props.suggestions.filter((s) => s.status === 'pending').length);

const suggestSubtitle = computed(() => {
  const pending = pendingCount.value;
  return `${pending} pendiente${pending !== 1 ? 's' : ''} · ${props.suggestions.length} en total`;
});
</script>

<template>
  <div id="page-suggestions">
    <div class="page-header">
      <div>
        <div class="page-title">Sugerencias externas</div>
        <div class="page-sub">{{ suggestSubtitle }}</div>
      </div>
    </div>

    <div id="suggestionsList">
      <div v-if="!suggestions.length" class="empty">
        <div class="ei">💡</div>
        <p>Aún no hay sugerencias de usuarios.</p>
      </div>

      <div
        v-for="s in suggestions"
        :key="s.id"
        class="faq-row"
        :class="{ annulled: s.status !== 'pending' }"
        :style="{ opacity: s.status === 'pending' ? 1 : 0.7 }"
      >
        <div class="faq-row-info">
          <div class="faq-row-q" style="white-space:normal;text-overflow:unset">{{ s.suggestion }}</div>
          <div class="faq-row-meta">
            <span
              v-if="s.status === 'pending'"
              class="cat-badge"
              style="background:rgba(245,158,11,0.15);color:#D97706"
            >Pendiente</span>
            <span v-else class="annulled-badge">Revisada</span>
            <span class="date-badge">📅 {{ formatDate(s.createdAt) }}</span>
            <span v-if="s.name || s.email" class="date-badge">👤 {{ [s.name, s.email].filter(Boolean).join(' · ') }}</span>
          </div>
        </div>
        <div v-if="s.status === 'pending'" class="faq-row-actions">
          <button class="btn btn-primary btn-sm" @click="emit('useSuggestion', s.id)">+ Crear FAQ</button>
          <button class="btn btn-ghost btn-sm" @click="emit('markReviewed', s.id)">✓ Revisada</button>
        </div>
      </div>
    </div>
  </div>
</template>
