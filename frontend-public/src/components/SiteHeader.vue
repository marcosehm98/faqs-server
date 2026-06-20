<script setup>
defineProps({
  logoSrc: { type: String, required: true },
  logoAlt: { type: String, default: 'LogiHub' }
});

const searchInput = defineModel({ type: String, default: '' });
const emit = defineEmits(['input']);
</script>

<template>
  <header class="site-header">
    <div class="logo">
      <img class="logo-full" :src="logoSrc" :alt="logoAlt">
    </div>
    <div class="header-search">
      <span class="search-icon">⌕</span>
      <input
        v-model="searchInput"
        type="text"
        placeholder="Buscar preguntas, etiquetas, categorías…"
        @input="emit('input')"
      >
    </div>
  </header>
</template>
