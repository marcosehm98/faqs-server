<script setup>
import { ref, watch, computed, nextTick } from 'vue';
import { apiUrl } from '../lib/helpers.js';
import { useAuth } from '../composables/useAuth.js';
import { useToast } from '../composables/useToast.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'group' },
  editingId: { type: Number, default: null },
  parentId: { type: Number, default: null },
  categoryTree: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'saved']);

const { authHeaders } = useAuth();
const { toast } = useToast();

const name = ref('');
const icon = ref('📁');
const sortOrder = ref('');
const saving = ref(false);

const modalTitle = computed(() => {
  if (props.editingId) {
    return props.type === 'group' ? 'Editar grupo' : 'Editar subcategoría';
  }
  return props.type === 'group' ? 'Nuevo grupo' : 'Nueva subcategoría';
});

watch(
  () => [props.visible, props.type, props.editingId, props.parentId],
  async ([vis]) => {
    if (!vis) return;
    name.value = '';
    icon.value = props.type === 'group' ? '📁' : '📄';
    sortOrder.value = '';

    if (props.editingId) {
      const item = props.type === 'group'
        ? props.categoryTree.find((g) => g.id === props.editingId)
        : props.categoryTree.flatMap((g) => (g.children || []).map((c) => ({ ...c, groupId: g.id }))).find((c) => c.id === props.editingId);
      if (item) {
        name.value = item.name || '';
        icon.value = item.icon || '';
        sortOrder.value = item.sortOrder ?? '';
      }
    }

    await nextTick();
    document.getElementById('catName')?.focus();
  }
);

function close() {
  emit('close');
}

async function save() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    toast('El nombre es obligatorio', 'error');
    return;
  }

  saving.value = true;
  const body = {
    name: trimmed,
    icon: icon.value.trim() || null,
    sortOrder: sortOrder.value,
    parentId: props.type === 'child' ? props.parentId : null
  };

  try {
    const url = props.editingId
      ? apiUrl(`/api/admin/categories/${props.editingId}`)
      : apiUrl('/api/admin/categories');
    const r = await fetch(url, {
      method: props.editingId ? 'PUT' : 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Error al guardar');
    toast('Categoría guardada ✓', 'success');
    emit('saved');
    close();
  } catch (e) {
    toast(e.message || 'Error guardando', 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    id="catModalOverlay"
    class="modal-overlay"
    :class="{ visible }"
    @click.self="close"
  >
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title" id="catModalTitle">{{ modalTitle }}</span>
        <button class="modal-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input id="catName" v-model="name" type="text" class="form-control" placeholder="Ej: Operativo, Inicio de sesión…">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Icono <span style="font-weight:400;text-transform:none">(emoji)</span></label>
            <input id="catIcon" v-model="icon" type="text" class="form-control" placeholder="⚙️" maxlength="10">
          </div>
          <div class="form-group">
            <label class="form-label">Orden</label>
            <input id="catOrder" v-model="sortOrder" type="number" class="form-control" placeholder="1" min="0">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button id="catSaveBtn" class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
