<script setup>
import { computed, onMounted } from 'vue';
import AppPage from '../components/AppPage.vue';
import {
  globalSearchError,
  globalSearchQuery,
  globalSearchResults,
  searchEverything
} from '../stores/equinox';

const groups = computed(() => {
  const results = globalSearchResults.value;
  if (!results) return [];

  return [
    { key: 'notes', label: 'Notes', items: results.notes || [], to: '/notes' },
    { key: 'tasks', label: 'Tasks', items: results.tasks || [], to: '/tasks' },
    { key: 'bookmarks', label: 'Bookmarks', items: results.bookmarks || [], to: '/bookmarks' }
  ];
});

const resultCount = computed(() => groups.value.reduce((total, group) => total + group.items.length, 0));

function tagNames(item) {
  return (item.tags || []).map((tag) => tag.name).join(', ');
}

function itemTitle(group, item) {
  return item.title;
}

function itemMeta(group, item) {
  if (group.key === 'bookmarks') {
    return `${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName} / ${item.url}`;
  }

  if (group.key === 'tasks') {
    return `${item.priority} / ${item.status} / ${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName}`;
  }

  return `${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName}`;
}

function itemBody(group, item) {
  if (group.key === 'notes') return item.body || 'No details yet.';
  if (group.key === 'tasks') return item.details || 'No details yet.';
  if (group.key === 'bookmarks') return item.notes || 'No notes yet.';
  return '';
}

onMounted(() => {
  if (globalSearchQuery.value.trim()) {
    searchEverything();
  }
});
</script>

<template>
  <AppPage title="Search" eyebrow="Find anything">
    <section class="feature-panel search-workspace">
      <div class="panel-copy">
        <h3>Global Search</h3>
        <p>Find visible notes, tasks, and bookmarks.</p>
      </div>
      <form class="storage-search" @submit.prevent="searchEverything">
        <input v-model="globalSearchQuery" autofocus placeholder="Search Equinox" />
        <button class="main-button" type="submit">Search</button>
      </form>
      <p v-if="globalSearchError" class="storage-error">{{ globalSearchError }}</p>
    </section>

    <section v-if="globalSearchResults" class="storage-section">
      <div class="storage-section-title">
        <h4>Results</h4>
        <span>{{ resultCount }}</span>
      </div>
      <p v-if="!resultCount" class="empty-state">No matching visible items.</p>

      <section v-for="group in groups" :key="group.key" class="feature-panel search-group">
        <div class="storage-section-title">
          <h4>{{ group.label }}</h4>
          <span>{{ group.items.length }}</span>
        </div>
        <p v-if="!group.items.length" class="empty-state">No {{ group.label.toLowerCase() }} found.</p>

        <article v-for="item in group.items" :key="item.id" class="search-result-row">
          <div class="search-result-body">
            <h4>{{ itemTitle(group, item) }}</h4>
            <p>{{ itemMeta(group, item) }}</p>
            <p v-if="tagNames(item)" class="tag-line">{{ tagNames(item) }}</p>
            <p>{{ itemBody(group, item) }}</p>
            <div class="item-actions">
              <a v-if="group.key === 'bookmarks'" :href="item.url" target="_blank" rel="noreferrer">Open link</a>
              <RouterLink v-else :to="group.to">Open section</RouterLink>
            </div>
          </div>
        </article>
      </section>
    </section>
  </AppPage>
</template>
