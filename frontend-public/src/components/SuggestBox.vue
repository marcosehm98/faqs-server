<script setup>
defineProps({
  mobile: { type: Boolean, default: false }
});
defineEmits(['open']);
</script>

<template>
  <div class="suggest-box" :class="{ 'suggest-mobile': mobile }">
    <strong>¿No encontraste lo que buscabas?</strong>
    <p v-if="mobile">Cuéntanos qué pregunta crees que deberíamos agregar.</p>
    <p v-else>¿Qué pregunta crees que nos hace falta?</p>
    <button type="button" class="suggest-btn" @click="$emit('open')">
      {{ mobile ? '💡 Sugerir una pregunta' : '💡 Sugerir pregunta' }}
    </button>
  </div>
</template>
