<script setup>
import { computed } from 'vue';
import { esc, formatFaqContent, hlText } from '../lib/faqContent.js';
import { formatDate, fileIcon } from '../lib/helpers.js';

const props = defineProps({
  faq: { type: Object, required: true },
  highlight: { type: String, default: '' },
  open: { type: Boolean, default: false },
  sharedHighlight: { type: Boolean, default: false }
});

defineEmits(['toggle', 'share', 'filter-tag', 'open-lightbox']);

const questionHtml = computed(() => hlText(esc(props.faq.question), props.highlight));

const answerHtml = computed(() =>
  hlText(formatFaqContent(props.faq.answer), props.highlight)
);

const images = computed(() =>
  (props.faq.attachments || []).filter((a) => a.type && a.type.startsWith('image/'))
);

const docs = computed(() =>
  (props.faq.attachments || []).filter((a) => !a.type || !a.type.startsWith('image/'))
);

const updatedLabel = computed(() => {
  const ts = props.faq.updatedAt || props.faq.createdAt;
  return ts ? formatDate(ts) : '';
});
</script>

<template>
  <div
    :id="`card-${faq.id}`"
    class="faq-card"
    :class="{ open, 'shared-highlight': sharedHighlight }"
  >
    <div class="faq-question" @click="$emit('toggle')">
      <span class="faq-question-text" v-html="questionHtml" />
      <button
        type="button"
        class="faq-share"
        title="Compartir enlace a esta pregunta"
        @click.stop="$emit('share')"
      >🔗</button>
      <span class="faq-chevron">▾</span>
    </div>
    <div class="faq-answer">
      <div class="faq-answer-inner">
        <div class="faq-answer-body" v-html="answerHtml" />

        <div v-if="faq.tags?.length" class="faq-tags">
          <span
            v-for="t in faq.tags"
            :key="t"
            class="tag"
            @click="$emit('filter-tag', t)"
            v-html="hlText(esc(t), highlight)"
          />
        </div>

        <div v-if="images.length || docs.length" class="faq-attachments">
          <div class="attachments-label">Archivos adjuntos</div>
          <div class="attachments-grid">
            <img
              v-for="a in images"
              :key="a.url"
              class="attachment-img"
              :src="a.url"
              :alt="a.originalName || a.name || ''"
              :title="a.originalName || a.name || ''"
              @click="$emit('open-lightbox', a.url)"
            >
            <a
              v-for="a in docs"
              :key="a.url"
              class="attachment-file"
              :href="a.url"
              :download="a.originalName || a.name || ''"
            >
              <span>{{ fileIcon(a.type) }}</span>{{ a.originalName || a.name || 'Archivo' }}
            </a>
          </div>
        </div>

        <div v-if="updatedLabel" class="faq-updated">
          🕐 Información actualizada al <strong>{{ updatedLabel }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>
