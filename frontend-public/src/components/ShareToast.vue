<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: '' }
});
</script>

<template>
  <div
    class="share-toast"
    :class="{ visible }"
    role="status"
    aria-live="polite"
  >{{ message }}</div>
</template>
