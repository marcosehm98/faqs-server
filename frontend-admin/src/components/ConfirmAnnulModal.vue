<script setup>
defineProps({
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'confirm']);
</script>

<template>
  <div
    id="confirmOverlay"
    class="modal-overlay"
    :class="{ visible }"
    @click.self="emit('close')"
  >
    <div class="modal" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">¿Anular pregunta?</span>
        <button class="modal-close" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-2);font-size:0.9rem;margin-bottom:20px">La pregunta dejará de mostrarse al público, pero se conserva en la base de datos. Puedes restaurarla después.</p>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
          <button class="btn btn-danger" id="confirmDeleteBtn" @click="emit('confirm')">Anular</button>
        </div>
      </div>
    </div>
  </div>
</template>
