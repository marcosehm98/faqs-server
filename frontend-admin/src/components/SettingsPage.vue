<script setup>
import { ref, computed, watch } from 'vue';
import { formatDate, publicAppUrl, adminAppUrl } from '../lib/helpers.js';
const props = defineProps({
  siteConfig: { type: Object, default: () => ({ brandName: 'Centro de Ayuda LogiHub', logoUrl: null, fontFamily: 'satoshi' }) },
  siteFonts: { type: Object, default: () => ({}) },
  users: { type: Array, default: () => [] },
  usersError: { type: Boolean, default: false }
});

const emit = defineEmits([
  'saveSiteConfig',
  'uploadLogo',
  'removeLogo',
  'createUser',
  'exportJson',
  'importJson',
  'updateBrandPreview'
]);

const brandName = ref('');
const fontFamily = ref('satoshi');
const newUserEmail = ref('');
const newUserName = ref('');
const newUserPw = ref('');
const newUserRole = ref('admin');
const importInput = ref(null);

watch(
  () => props.siteConfig,
  (cfg) => {
    brandName.value = cfg.brandName || '';
    fontFamily.value = cfg.fontFamily || 'satoshi';
  },
  { immediate: true, deep: true }
);

const brandPreview = computed(() => brandName.value.trim() || 'Centro de Ayuda');

const fontOptions = computed(() =>
  Object.entries(props.siteFonts).map(([k, v]) => ({ key: k, label: v.label }))
);

function onBrandInput() {
  emit('updateBrandPreview', { brandName: brandName.value, fontFamily: fontFamily.value });
}

function onFontChange() {
  emit('updateBrandPreview', { brandName: brandName.value, fontFamily: fontFamily.value });
}

function saveAppearance() {
  emit('saveSiteConfig', {
    brandName: brandName.value.trim() || 'Centro de Ayuda',
    fontFamily: fontFamily.value
  });
}

function onLogoFile(e) {
  const file = e.target.files?.[0];
  if (file) emit('uploadLogo', file);
  e.target.value = '';
}

function createUser() {
  emit('createUser', {
    email: newUserEmail.value.trim(),
    name: newUserName.value.trim(),
    password: newUserPw.value,
    role: newUserRole.value,
    onSuccess: () => {
      newUserEmail.value = '';
      newUserName.value = '';
      newUserPw.value = '';
    }
  });
}

function triggerImport() {
  importInput.value?.click();
}

function onImportFile(e) {
  const file = e.target.files?.[0];
  if (file) emit('importJson', file);
  e.target.value = '';
}
</script>

<template>
  <div id="page-settings">
    <div class="page-header">
      <div>
        <div class="page-title">Configuración</div>
        <div class="page-sub">Opciones del servidor FAQ</div>
      </div>
    </div>

    <div class="settings-card">
      <h3>🎨 Apariencia pública</h3>
      <p style="font-size:0.85rem;color:var(--text-2);margin-bottom:16px">Logo y tipografía del header que ven tus usuarios en la vista pública.</p>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;padding:14px;background:var(--surface2);border-radius:var(--radius-sm)">
        <div
          id="logoPreview"
          style="width:38px;height:38px;min-width:38px;border-radius:8px;background:var(--accent-light);border:1px solid var(--accent-mid);display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:700;color:var(--accent)"
        >
          <img
            v-if="siteConfig.logoUrl"
            :src="siteConfig.logoUrl"
            alt=""
            style="width:100%;height:100%;object-fit:contain"
          >
          <template v-else>{{ brandPreview.charAt(0).toUpperCase() }}</template>
        </div>
        <div style="flex:1">
          <div style="font-size:0.85rem;font-weight:600" id="brandPreview">{{ brandPreview }}</div>
          <div style="font-size:0.75rem;color:var(--text-2);margin-top:2px">Vista previa del header</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre del sitio</label>
        <input
          v-model="brandName"
          type="text"
          class="form-control"
          id="cfgBrandName"
          placeholder="Centro de Ayuda"
          @input="onBrandInput"
        >
      </div>
      <div class="form-group">
        <label class="form-label">Logo <span style="font-weight:400;text-transform:none">(PNG, JPG, SVG — recomendado cuadrado)</span></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">
            📷 Subir logo
            <input type="file" id="cfgLogoFile" accept="image/*" style="display:none" @change="onLogoFile">
          </label>
          <span style="font-size:0.75rem;color:var(--text-2)">o pega imagen con Ctrl+V / ⌘V en esta sección</span>
          <button
            v-if="siteConfig.logoUrl"
            class="btn btn-ghost btn-sm"
            id="cfgRemoveLogoBtn"
            @click="emit('removeLogo')"
          >✕ Quitar logo</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tipografía</label>
        <select v-model="fontFamily" class="form-control" id="cfgFont" @change="onFontChange">
          <option v-for="f in fontOptions" :key="f.key" :value="f.key">{{ f.label }}</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" @click="saveAppearance">Guardar apariencia</button>
    </div>

    <div class="settings-card">
      <h3>👥 Usuarios administradores</h3>
      <p style="font-size:0.85rem;color:var(--text-2);margin-bottom:14px">Los admins se guardan en la tabla <code>users</code> de MySQL.</p>
      <div id="usersList" style="margin-bottom:16px">
        <p v-if="usersError" style="font-size:0.85rem;color:var(--danger)">No se pudieron cargar los usuarios.</p>
        <p v-else-if="!users.length" style="font-size:0.85rem;color:var(--text-2)">No hay usuarios registrados.</p>
        <div
          v-for="u in users"
          :key="u.id"
          class="faq-row"
          style="margin-bottom:6px;padding:12px 14px"
        >
          <div class="faq-row-info">
            <div class="faq-row-q">{{ u.name }} <span style="color:var(--text-2);font-weight:400">({{ u.email }})</span></div>
            <div class="faq-row-meta">
              <span class="cat-badge">{{ u.role }}</span>
              <span v-if="u.lastLoginAt" class="date-badge">📅 Último acceso: {{ formatDate(u.lastLoginAt) }}</span>
              <span v-else class="date-badge">Sin acceso aún</span>
            </div>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Email</label>
          <input v-model="newUserEmail" type="email" class="form-control" id="newUserEmail" placeholder="nuevo@empresa.com">
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Nombre</label>
          <input v-model="newUserName" type="text" class="form-control" id="newUserName" placeholder="Nombre del admin">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Contraseña</label>
          <input v-model="newUserPw" type="password" class="form-control" id="newUserPw" placeholder="Mín. 6 caracteres">
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Rol</label>
          <select v-model="newUserRole" class="form-control" id="newUserRole">
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" @click="createUser">+ Agregar usuario</button>
    </div>

    <div class="settings-card">
      <h3>🗄️ Base de datos MySQL</h3>
      <p style="font-size:0.85rem;color:var(--text-2);margin-bottom:14px">Las preguntas se guardan en MySQL. Configura la URL en <strong>.env</strong>:</p>
      <div class="code-block">DATABASE_URL=mysql+pymysql://usuario:password@host:puerto/db?charset=utf8mb4</div>
    </div>

    <div class="settings-card">
      <h3>🌐 URLs del sistema</h3>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:0.85rem">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm)">
          <span style="color:var(--text-2)">Vista pública</span>
          <a :href="publicAppUrl()" target="_blank" style="color:var(--accent)">{{ publicAppUrl() }}</a>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm)">
          <span style="color:var(--text-2)">Panel admin</span>
          <a :href="adminAppUrl()" target="_blank" style="color:var(--accent)">{{ adminAppUrl() }}</a>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <h3>💾 Exportar / Importar datos</h3>
      <p style="font-size:0.85rem;color:var(--text-2);margin-bottom:14px">Descarga un backup de todas las preguntas en formato JSON o importa desde un archivo previo.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" @click="emit('exportJson')">⬇ Exportar JSON</button>
        <label class="btn btn-ghost" style="cursor:pointer" @click.prevent="triggerImport">
          ⬆ Importar JSON
          <input ref="importInput" type="file" accept=".json" style="display:none" @change="onImportFile">
        </label>
      </div>
    </div>
  </div>
</template>
