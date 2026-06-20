<script setup>
import { ref } from 'vue';
import { apiUrl } from '../lib/helpers.js';

const emit = defineEmits(['login']);

const email = ref('');
const password = ref('');
const showError = ref(false);
const loading = ref(false);

async function doLogin() {
  showError.value = false;
  loading.value = true;
  try {
    const ok = await new Promise((resolve) => {
      emit('login', { email: email.value.trim(), password: password.value, resolve });
    });
    if (!ok) {
      showError.value = true;
      password.value = '';
    }
  } finally {
    loading.value = false;
  }
}

function onKeydown(e) {
  if (e.key === 'Enter') doLogin();
}
</script>

<template>
  <div id="loginScreen">
    <div class="login-card">
      <div class="login-logo">
        <img :src="apiUrl('/favicon.ico')" alt="LogiHub" style="width:40px;height:40px;border-radius:8px">
      </div>
      <div class="login-title">Panel de administración</div>
      <div class="login-sub">Centro de Ayuda LogiHub</div>
      <div class="login-error" :style="{ display: showError ? 'block' : 'none' }">
        Credenciales incorrectas. Inténtalo de nuevo.
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input
          v-model="email"
          type="email"
          class="form-control"
          placeholder="admin@faq.local"
          @keydown="onKeydown"
        >
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input
          v-model="password"
          type="password"
          class="form-control"
          placeholder="••••••••"
          @keydown="onKeydown"
        >
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center" :disabled="loading" @click="doLogin">
        Entrar
      </button>
    </div>
  </div>
</template>
