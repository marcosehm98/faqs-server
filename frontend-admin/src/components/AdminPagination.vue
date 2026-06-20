<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 25 },
  itemCount: { type: Number, default: 0 }
});

const emit = defineEmits(['goToPage']);

const pageInfo = computed(() => {
  if (!props.total) return '';
  const from = (props.page - 1) * props.pageSize + 1;
  const to = from + props.itemCount - 1;
  return `${from}–${to} de ${props.total} · Página ${props.page} de ${props.totalPages}`;
});

const windowStart = computed(() => Math.floor((props.page - 1) / 10) * 10 + 1);
const windowEnd = computed(() => Math.min(windowStart.value + 9, props.totalPages));

const pages = computed(() => {
  const list = [];
  for (let p = windowStart.value; p <= windowEnd.value; p++) list.push(p);
  return list;
});
</script>

<template>
  <div v-if="total" class="pagination-bar">
    <div class="pagination-pages">
      <button
        v-if="windowStart > 1"
        class="page-btn nav-btn"
        title="Bloque anterior"
        @click="emit('goToPage', windowStart - 1)"
      >«</button>
      <button
        v-if="page > 1"
        class="page-btn nav-btn"
        title="Anterior"
        @click="emit('goToPage', page - 1)"
      >‹</button>
      <button
        v-for="p in pages"
        :key="p"
        class="page-btn"
        :class="{ active: p === page }"
        @click="emit('goToPage', p)"
      >{{ p }}</button>
      <button
        v-if="page < totalPages"
        class="page-btn nav-btn"
        title="Siguiente"
        @click="emit('goToPage', page + 1)"
      >›</button>
      <button
        v-if="windowEnd < totalPages"
        class="page-btn nav-btn"
        title="Bloque siguiente"
        @click="emit('goToPage', windowEnd + 1)"
      >»</button>
    </div>
  </div>
</template>
