<script setup>
import { ref, watch, computed, nextTick } from 'vue';
import { apiUrl, fileIcon, getClipboardImages } from '../lib/helpers.js';
import { formatFaqContent } from '../lib/faqContent.js';
import { useAuth } from '../composables/useAuth.js';
import { useToast } from '../composables/useToast.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  categoryTree: { type: Array, default: () => [] },
  editingId: { type: Number, default: null },
  editFaq: { type: Object, default: null },
  prefillQuestion: { type: String, default: '' }
});

const emit = defineEmits(['close', 'saved']);

const { authHeaders } = useAuth();
const { toast } = useToast();

const question = ref('');
const answer = ref('');
const tags = ref('');
const order = ref('');
const groupId = ref('');
const categoryId = ref('');
const pendingFiles = ref([]);
const existingAttachments = ref([]);
const saving = ref(false);
const dragOver = ref(false);
const fileInput = ref(null);
const uploadZone = ref(null);

const modalTitle = computed(() => (props.editingId ? 'Editar pregunta' : 'Nueva pregunta'));
const saveLabel = computed(() => {
  if (saving.value) return 'Guardando…';
  return props.editingId ? 'Actualizar' : 'Guardar';
});

const answerPreviewHtml = computed(() => {
  const text = answer.value || '';
  if (!text.trim()) {
    return '<span style="opacity:0.55">La vista previa aparecerá aquí…</span>';
  }
  return formatFaqContent(text);
});

const groupOptions = computed(() => props.categoryTree);

const categoryOptions = computed(() => {
  const gid = parseInt(groupId.value, 10);
  const group = props.categoryTree.find((g) => g.id === gid);
  return group ? (group.children || []) : [];
});

watch(
  () => [props.visible, props.editingId, props.editFaq, props.prefillQuestion],
  async ([vis]) => {
    if (!vis) return;

    pendingFiles.value = [];
    existingAttachments.value = [];

    if (props.editingId && props.editFaq) {
      const f = props.editFaq;
      question.value = f.question || '';
      answer.value = f.answer || '';
      tags.value = (f.tags || []).join(', ');
      order.value = f.order >= 999 ? '' : (f.order || '');
      groupId.value = String(f.categoryGroupId || f.groupId || '');
      categoryId.value = f.categoryId ? String(f.categoryId) : '';
      existingAttachments.value = [...(f.attachments || [])];
    } else {
      question.value = props.prefillQuestion || '';
      answer.value = '';
      tags.value = '';
      order.value = '';
      if (props.categoryTree.length) {
        groupId.value = String(props.categoryTree[0].id);
      } else {
        groupId.value = '';
      }
      categoryId.value = '';
    }

    await nextTick();
    const focusEl = props.prefillQuestion && !props.editingId
      ? document.getElementById('fA')
      : document.getElementById('fQ');
    focusEl?.focus();
  }
);

watch(groupId, () => {
  if (!categoryOptions.value.some((c) => String(c.id) === categoryId.value)) {
    categoryId.value = '';
  }
});

function close() {
  pendingFiles.value = [];
  existingAttachments.value = [];
  emit('close');
}

function onGroupChange() {
  categoryId.value = '';
}

function addFiles(files) {
  const MAX = 10 * 1024 * 1024;
  files.forEach((f) => {
    if (f.size > MAX) {
      toast(`${f.name} supera 10 MB`, 'error');
      return;
    }
    pendingFiles.value.push({
      name: f.name,
      type: f.type,
      fileObj: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    });
  });
}

function onFileSelect(e) {
  addFiles([...e.target.files]);
  e.target.value = '';
}

function onDragOver(e) {
  e.preventDefault();
  dragOver.value = true;
}

function onDragLeave() {
  dragOver.value = false;
}

function onDrop(e) {
  e.preventDefault();
  dragOver.value = false;
  addFiles([...e.dataTransfer.files]);
}

function onUploadPaste(e) {
  const images = getClipboardImages(e.clipboardData);
  if (!images.length) return;
  e.preventDefault();
  e.stopPropagation();
  addFiles(images);
  dragOver.value = true;
  setTimeout(() => { dragOver.value = false; }, 400);
  toast('Imagen pegada desde portapapeles', 'success');
}

function handleGlobalPaste(e) {
  if (!props.visible) return;
  const images = getClipboardImages(e.clipboardData);
  if (!images.length) return;
  const el = document.activeElement;
  const inTextField = el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['file', 'checkbox', 'radio', 'button'].includes(el.type)));
  if (inTextField) {
    const hasText = [...e.clipboardData.items].some((i) => i.kind === 'string' && (i.type === 'text/plain' || i.type === 'text/html'));
    if (hasText) return;
  }
  e.preventDefault();
  addFiles(images);
  toast('Imagen pegada desde portapapeles', 'success');
}

defineExpose({ handleGlobalPaste });

function removeExisting(i) {
  existingAttachments.value.splice(i, 1);
}

function removePending(i) {
  pendingFiles.value.splice(i, 1);
}

async function save() {
  const q = question.value.trim();
  const a = answer.value.trim();
  if (!q) {
    toast('La pregunta es obligatoria', 'error');
    return;
  }
  if (!a) {
    toast('La respuesta es obligatoria', 'error');
    return;
  }

  const gid = parseInt(groupId.value, 10) || null;
  const cid = parseInt(categoryId.value, 10) || null;
  if (!gid) {
    toast('Selecciona un grupo (Operativo o Contable)', 'error');
    return;
  }

  const tagList = tags.value.split(',').map((t) => t.trim()).filter(Boolean);
  const orderNum = parseInt(order.value, 10) || 999;

  saving.value = true;

  let newAttachments = [];
  if (pendingFiles.value.length) {
    const formData = new FormData();
    pendingFiles.value.forEach((f) => formData.append('files', f.fileObj));
    try {
      const r = await fetch(apiUrl('/api/admin/upload'), {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Error al subir');
      newAttachments = data.files || [];
    } catch (e) {
      toast(e.message || 'Error subiendo archivos', 'error');
      saving.value = false;
      return;
    }
  }

  const allAttachments = [...existingAttachments.value, ...newAttachments];
  const body = { question: q, answer: a, groupId: gid, categoryId: cid, tags: tagList, order: orderNum, attachments: allAttachments };

  try {
    const url = props.editingId ? apiUrl(`/api/admin/faqs/${props.editingId}`) : apiUrl('/api/admin/faqs');
    const method = props.editingId ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) throw new Error('Sesión expirada — vuelve a iniciar sesión');
      throw new Error(data.error || 'Error al guardar');
    }
    toast(props.editingId ? 'Pregunta actualizada ✓' : 'Pregunta creada ✓', 'success');
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
    id="modalOverlay"
    class="modal-overlay"
    :class="{ visible }"
    @click.self="close"
  >
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title" id="modalTitle">{{ modalTitle }}</span>
        <button class="modal-close" @click="close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Grupo <span style="font-weight:400;text-transform:none">(obligatorio)</span></label>
            <select
              id="fGroup"
              v-model="groupId"
              class="form-control"
              @change="onGroupChange"
            >
              <option v-if="!groupOptions.length" value="">— Configura categorías primero —</option>
              <option v-for="g in groupOptions" :key="g.id" :value="String(g.id)">{{ g.name }}</option>
            </select>
            <div class="form-hint">Operativo, Contable, etc.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Subcategoría <span style="font-weight:400;text-transform:none">(opcional)</span></label>
            <select id="fCat" v-model="categoryId" class="form-control">
              <option value="">— Solo grupo (sin subcategoría) —</option>
              <option v-for="c in categoryOptions" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Orden</label>
            <input id="fOrder" v-model="order" type="number" class="form-control" placeholder="1" min="1">
            <div class="form-hint">Menor número = aparece primero</div>
          </div>
          <div class="form-group"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Pregunta</label>
          <input id="fQ" v-model="question" type="text" class="form-control" placeholder="¿Cómo hago…?">
        </div>
        <div class="form-group">
          <label class="form-label">Respuesta</label>
          <textarea id="fA" v-model="answer" class="form-control" placeholder="Escribe la respuesta completa…"></textarea>
          <div class="form-hint">Puedes usar <code>**negrita**</code>, <code>*cursiva*</code>, listas con <code>- ítem</code> y párrafos separados por una línea en blanco.</div>
          <div class="answer-preview-label">Vista previa</div>
          <div class="answer-preview" id="answerPreview" v-html="answerPreviewHtml"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Etiquetas <span style="font-weight:400;text-transform:none">(separadas por coma)</span></label>
          <input id="fTags" v-model="tags" type="text" class="form-control" placeholder="pago, envío, reembolso">
        </div>
        <div class="form-group">
          <label class="form-label">Archivos adjuntos</label>
          <div
            ref="uploadZone"
            id="uploadZone"
            class="upload-zone"
            tabindex="0"
            :class="{ 'drag-over': dragOver }"
            @click="fileInput?.click()"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
            @paste="onUploadPaste"
          >
            <div class="ui">📎</div>
            <p><strong>Haz clic</strong>, arrastra o <strong>pega</strong> (Ctrl+V / ⌘V)</p>
            <p>Imágenes del portapapeles, PDF, Word, Excel — máx. 10 MB c/u</p>
          </div>
          <input
            ref="fileInput"
            id="fileIn"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            style="display:none"
            @change="onFileSelect"
          >
          <div id="fileChips" class="file-chips">
            <div v-for="(a, i) in existingAttachments" :key="'e-' + i" class="file-chip">
              <img v-if="a.type && a.type.startsWith('image/')" :src="a.url" alt="">
              <span v-else>{{ fileIcon(a.type) }}</span>
              <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ a.originalName || a.name || 'Archivo' }}</span>
              <button class="rm" @click.stop="removeExisting(i)">✕</button>
            </div>
            <div v-for="(f, i) in pendingFiles" :key="'p-' + i" class="file-chip">
              <img v-if="f.preview" :src="f.preview" alt="">
              <span v-else>{{ fileIcon(f.type) }}</span>
              <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.name }}</span>
              <button class="rm" @click.stop="removePending(i)">✕</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="close">Cancelar</button>
          <button id="saveBtn" class="btn btn-primary" :disabled="saving" @click="save">{{ saveLabel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
