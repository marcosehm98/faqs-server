<script setup>
import { computed } from 'vue';
import { apiUrl } from '../lib/helpers.js';
import FaqCard from './FaqCard.vue';

const props = defineProps({
  faqs: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  openCardId: { type: Number, default: null },
  highlightCardId: { type: Number, default: null },
  loadError: { type: String, default: null }
});

defineEmits(['toggle', 'share', 'filter-tag', 'open-lightbox']);

const query = computed(() => props.searchQuery.toLowerCase());
</script>

<template>
  <div v-if="loadError" class="empty-state">
    <div class="ei">⚠️</div>
    <h3>No se pudieron cargar las preguntas</h3>
    <p>
      URL API: <code>{{ apiUrl('/api/faqs') }}</code><br>
      {{ loadError }}
    </p>
  </div>

  <div v-else-if="!faqs.length" class="empty-state">
    <div class="ei">🔍</div>
    <h3>{{ query ? 'Sin resultados' : 'Sin preguntas aún' }}</h3>
    <p v-if="query">No encontramos resultados para "<strong>{{ query }}</strong>"</p>
    <p v-else>Pronto habrá contenido aquí.</p>
  </div>

  <div v-else class="faq-list">
    <FaqCard
      v-for="f in faqs"
      :key="f.id"
      :faq="f"
      :highlight="query"
      :open="openCardId === f.id"
      :shared-highlight="highlightCardId === f.id"
      @toggle="$emit('toggle', f.id)"
      @share="$emit('share', f.id)"
      @filter-tag="$emit('filter-tag', $event)"
      @open-lightbox="$emit('open-lightbox', $event)"
    />
  </div>
</template>
