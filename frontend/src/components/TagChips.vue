<script setup>
defineProps({
  tags: {
    type: Array,
    default: () => []
  }
});
</script>

<template>
  <span class="tag-chip-list">
    <span v-for="tag in tags" :key="tag.id" class="tag-chip" :style="{ borderColor: tag.color }">
      <span class="tag-dot" :style="{ background: tag.color }"></span>
      {{ tag.name }}
    </span>
  </span>
</template>
