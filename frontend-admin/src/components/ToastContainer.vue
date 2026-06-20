<script setup>
defineProps({
  toasts: { type: Array, default: () => [] }
});
</script>

<template>
  <div class="toast-container">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="t.type"
    >
      <span>{{ t.type === 'success' ? '✓' : '✕' }}</span> {{ t.msg }}
    </div>
  </div>
</template>
