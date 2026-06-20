<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalCount: { type: Number, required: true }
});

defineEmits(['go']);

const windowSize = 10;

const windowStart = computed(() =>
  Math.floor((props.currentPage - 1) / windowSize) * windowSize + 1
);

const windowEnd = computed(() =>
  Math.min(windowStart.value + windowSize - 1, props.totalPages)
);

const pages = computed(() => {
  const list = [];
  for (let p = windowStart.value; p <= windowEnd.value; p++) list.push(p);
  return list;
});
</script>

<template>
  <div v-if="totalCount" class="pagination-bar">
    <div class="pagination-info">Página {{ currentPage }} de {{ totalPages }}</div>
    <div class="pagination-pages">
      <button
        v-if="windowStart > 1"
        type="button"
        class="page-btn nav-btn"
        title="Bloque anterior"
        @click="$emit('go', windowStart - 1)"
      >«</button>
      <button
        v-if="currentPage > 1"
        type="button"
        class="page-btn nav-btn"
        title="Anterior"
        @click="$emit('go', currentPage - 1)"
      >‹</button>
      <button
        v-for="p in pages"
        :key="p"
        type="button"
        class="page-btn"
        :class="{ active: p === currentPage }"
        @click="$emit('go', p)"
      >{{ p }}</button>
      <button
        v-if="currentPage < totalPages"
        type="button"
        class="page-btn nav-btn"
        title="Siguiente"
        @click="$emit('go', currentPage + 1)"
      >›</button>
      <button
        v-if="windowEnd < totalPages"
        type="button"
        class="page-btn nav-btn"
        title="Bloque siguiente"
        @click="$emit('go', windowEnd + 1)"
      >»</button>
    </div>
  </div>
</template>
