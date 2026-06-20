<script setup>
import { computed } from 'vue';
import { CAT_ICONS } from '../lib/helpers.js';
import SuggestBox from './SuggestBox.vue';

const props = defineProps({
  activeCategory: { type: String, required: true },
  categoryTree: { type: Array, default: () => [] },
  categoryCounts: { type: Array, default: () => [] },
  expandedGroups: { type: Object, required: true }
});

defineEmits(['set-category', 'toggle-group', 'open-suggest']);

const totalAll = computed(() => {
  if (props.categoryTree.length) {
    return props.categoryTree.reduce((s, g) => s + g.count, 0);
  }
  return props.categoryCounts.reduce((s, c) => s + c.count, 0);
});

function isExpanded(groupId) {
  return props.expandedGroups.has(groupId);
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-section" style="margin-top:4px">Categorías</div>
    <div
      class="sidebar-item"
      :class="{ active: activeCategory === 'all' }"
      @click="$emit('set-category', 'all')"
    >
      <span>📚</span> Todas <span class="count">{{ totalAll }}</span>
    </div>

    <template v-if="categoryTree.length">
      <div
        v-for="group in categoryTree"
        :key="group.id"
        class="sidebar-group"
        :class="{ open: isExpanded(group.id) }"
      >
        <div
          class="sidebar-item sidebar-group-title"
          :class="{ active: activeCategory === `group:${group.id}` }"
        >
          <button
            type="button"
            class="sidebar-chevron"
            :title="isExpanded(group.id) ? 'Colapsar' : 'Expandir'"
            :aria-expanded="isExpanded(group.id)"
            @click.stop="$emit('toggle-group', group.id)"
          >▸</button>
          <span class="sidebar-group-label" @click="$emit('set-category', `group:${group.id}`)">
            <span v-if="group.icon">{{ group.icon }} </span>{{ group.name }}
          </span>
          <span class="count">{{ group.count }}</span>
        </div>
        <div class="sidebar-children">
          <div
            v-for="child in group.children || []"
            :key="child.id"
            class="sidebar-item sidebar-subitem"
            :class="{ active: activeCategory === `id:${child.id}` }"
            @click="$emit('set-category', `id:${child.id}`)"
          >
            <span>{{ child.icon || CAT_ICONS[child.name] || CAT_ICONS.default }}</span>
            {{ child.name }}
            <span class="count">{{ child.count }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-for="{ category: cat, count } in categoryCounts"
        :key="cat"
        class="sidebar-item"
        :class="{ active: activeCategory === cat }"
        @click="$emit('set-category', cat)"
      >
        <span>{{ CAT_ICONS[cat] || CAT_ICONS.default }}</span>
        {{ cat }}
        <span class="count">{{ count }}</span>
      </div>
    </template>

    <SuggestBox @open="$emit('open-suggest')" />
  </aside>
</template>
