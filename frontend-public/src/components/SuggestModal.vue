<script setup>
import { ref, watch, nextTick } from 'vue';
import { apiUrl } from '../lib/helpers.js';

const props = defineProps({
  open: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const suggestion = ref('');
const name = ref('');
const email = ref('');
const msgClass = ref('form-msg');
const msgText = ref('');
const submitting = ref(false);
const suggestTextRef = ref(null);

watch(() => props.open, (visible) => {
  if (visible) {
    msgClass.value = 'form-msg';
    msgText.value = '';
    nextTick(() => suggestTextRef.value?.focus());
  }
});

async function submitSuggestion() {
  const text = suggestion.value.trim();
  const userName = name.value.trim();
  const userEmail = email.value.trim();

  if (text.length < 10) {
    msgClass.value = 'form-msg err';
    msgText.value = 'Escribe al menos 10 caracteres.';
    return;
  }

  submitting.value = true;
  try {
    const r = await fetch(apiUrl('/api/suggestions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion: text, name: userName, email: userEmail })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error al enviar');
    msgClass.value = 'form-msg ok';
    msgText.value = data.message || '¡Gracias! Recibimos tu sugerencia.';
    suggestion.value = '';
    name.value = '';
    email.value = '';
    setTimeout(() => emit('close'), 2000);
  } catch (e) {
    msgClass.value = 'form-msg err';
    msgText.value = e.message || 'No se pudo enviar. Intenta de nuevo.';
  } finally {
    submitting.value = false;
  }
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close');
}
</script>

<template>
  <div
    class="modal-overlay"
    :class="{ visible: open }"
    @click="onOverlayClick"
  >
    <div class="modal-card">
      <div class="modal-card-header">
        <div>
          <div class="modal-card-title">Sugerir una pregunta</div>
          <div class="modal-card-sub">¿Qué pregunta crees que nos hace falta?</div>
        </div>
        <button type="button" class="modal-close-btn" @click="emit('close')">✕</button>
      </div>
      <div class="modal-card-body">
        <label class="field-label">Tu sugerencia *</label>
        <textarea
          ref="suggestTextRef"
          v-model="suggestion"
          class="field-input"
          placeholder="Ej: ¿Cómo cambio mi contraseña?"
          maxlength="500"
        />
        <div class="field-hint">Mínimo 10 caracteres</div>
        <div class="field-row">
          <div>
            <label class="field-label">Tu nombre <span style="font-weight:400">(opcional)</span></label>
            <input v-model="name" type="text" class="field-input" placeholder="María" maxlength="100">
          </div>
          <div>
            <label class="field-label">Email <span style="font-weight:400">(opcional)</span></label>
            <input v-model="email" type="email" class="field-input" placeholder="tu@email.com" maxlength="255">
          </div>
        </div>
        <button type="button" class="submit-btn" :disabled="submitting" @click="submitSuggestion">
          {{ submitting ? 'Enviando…' : 'Enviar sugerencia' }}
        </button>
        <div :class="msgClass">{{ msgText }}</div>
      </div>
    </div>
  </div>
</template>
