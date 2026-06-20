<script setup>
defineProps({
  categoryTree: { type: Array, default: () => [] },
  expandedGroups: { type: Object, default: () => new Set() }
});

const emit = defineEmits([
  'toggleExpand',
  'openCatModal',
  'deleteCategory'
]);

function isExpanded(expandedGroups, groupId) {
  return expandedGroups.has(groupId);
}
</script>

<template>
  <div id="page-categories">
    <div class="page-header">
      <div>
        <div class="page-title">Categorías</div>
        <div class="page-sub">Grupos principales (Operativo, Contable) y sus subcategorías</div>
      </div>
      <button class="btn btn-primary" @click="emit('openCatModal', { type: 'group' })">+ Nuevo grupo</button>
    </div>

    <div id="categoriesList">
      <div v-if="!categoryTree.length" class="empty">
        <div class="ei">📂</div>
        <p>No hay grupos aún. Crea <strong>Operativo</strong> y <strong>Contable</strong>, luego agrega subcategorías.</p>
      </div>

      <div
        v-for="group in categoryTree"
        :key="group.id"
        class="cat-group-card"
        :class="{ open: isExpanded(expandedGroups, group.id) }"
      >
        <div class="cat-group-head">
          <button
            type="button"
            class="cat-chevron"
            :title="isExpanded(expandedGroups, group.id) ? 'Colapsar' : 'Expandir'"
            :aria-expanded="isExpanded(expandedGroups, group.id)"
            @click="emit('toggleExpand', group.id)"
          >▸</button>
          <span style="font-size:1.1rem">{{ group.icon || '📁' }}</span>
          <span class="name">{{ group.name }}</span>
          <span class="meta">{{ group.count }} pregunta{{ group.count !== 1 ? 's' : '' }} · orden {{ group.sortOrder ?? 0 }}</span>
          <div class="cat-actions">
            <button class="btn btn-ghost btn-sm" @click="emit('openCatModal', { type: 'child', parentId: group.id })">+ Sub</button>
            <button class="btn btn-ghost btn-sm" @click="emit('openCatModal', { type: 'group', id: group.id })">✏️</button>
            <button class="btn btn-danger btn-sm" @click="emit('deleteCategory', { id: group.id, label: group.name })">🗑</button>
          </div>
        </div>
        <div class="cat-group-children">
          <div
            v-if="!(group.children || []).length"
            class="cat-child-row"
            style="color:var(--text-2)"
          >Sin subcategorías — usa + Sub</div>
          <div
            v-for="child in (group.children || [])"
            :key="child.id"
            class="cat-child-row"
          >
            <span>{{ child.icon || '📄' }}</span>
            <span class="name">{{ child.name }}</span>
            <span class="meta">{{ child.count }} pregunta{{ child.count !== 1 ? 's' : '' }} · orden {{ child.sortOrder ?? 0 }}</span>
            <div class="cat-actions">
              <button class="btn btn-ghost btn-sm" @click="emit('openCatModal', { type: 'child', parentId: group.id, id: child.id })">✏️</button>
              <button class="btn btn-danger btn-sm" @click="emit('deleteCategory', { id: child.id, label: child.name })">🗑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
