<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  src: { type: String, default: '' }
});

defineEmits(['close']);
</script>

<template>
  <div class="lightbox" :class="{ visible }" @click="$emit('close')">
    <button type="button" class="lightbox-close">✕</button>
    <img :src="src" alt="">
  </div>
</template>
