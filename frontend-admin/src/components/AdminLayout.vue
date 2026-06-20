<script setup>
defineProps({
  currentPage: { type: String, default: 'faqs' },
  faqCount: { type: Number, default: 0 },
  suggestPending: { type: Number, default: 0 },
  adminUserLabel: { type: String, default: 'Conectado' }
});

const emit = defineEmits(['navigate', 'logout']);

const navItems = [
  { id: 'faqs', icon: '❓', label: 'Preguntas', badgeKey: 'faqCount' },
  { id: 'categories', icon: '📂', label: 'Categorías' },
  { id: 'suggestions', icon: '💡', label: 'Sugerencias', badgeKey: 'suggestPending' },
  { id: 'settings', icon: '⚙️', label: 'Configuración' }
];
</script>

<template>
  <div class="admin-shell">
    <header class="app-header">
      <div class="app-logo">
        <span>LogiHub</span> FAQ Admin <span class="admin-badge">PANEL INTERNO</span>
      </div>
      <div class="header-right">
        <div class="live-dot" title="Servidor activo"></div>
        <span style="font-size:0.8rem;color:var(--text-2)">{{ adminUserLabel }}</span>
        <button class="btn btn-ghost btn-sm" @click="emit('logout')">Salir</button>
      </div>
    </header>

    <div class="app-body">
      <aside class="sidebar">
        <div class="sidebar-label" style="margin-top:6px">Menú</div>
        <div
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: currentPage === item.id }"
          @click="emit('navigate', item.id)"
        >
          <span>{{ item.icon }}</span> {{ item.label }}
          <span
            v-if="item.badgeKey === 'faqCount'"
            class="badge"
          >{{ faqCount }}</span>
          <span
            v-if="item.badgeKey === 'suggestPending'"
            class="badge"
          >{{ suggestPending }}</span>
        </div>
      </aside>

      <div class="content">
        <slot />
      </div>
    </div>
  </div>
</template>