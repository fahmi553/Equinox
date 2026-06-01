<script setup>
import { computed, onMounted } from 'vue';
import AppPage from '../components/AppPage.vue';
import TagChips from '../components/TagChips.vue';
import {
  globalSearchError,
  globalSearchQuery,
  globalSearchResults,
  isModuleEnabled,
  searchEverything
} from '../stores/equinox';

const groups = computed(() => {
  const results = globalSearchResults.value;
  if (!results) return [];

  const nativeGroups = [
    { key: 'notes', label: 'Notes', items: results.notes || [], to: '/notes' },
    { key: 'tasks', label: 'Tasks', items: results.tasks || [], to: '/tasks' },
    { key: 'bookmarks', label: 'Bookmarks', items: results.bookmarks || [], to: '/bookmarks' },
    { key: 'announcements', label: 'Announcements', items: results.announcements || [], to: '/dashboard' },
    { key: 'tags', label: 'Tags', items: results.tags || [], to: '/tags' }
  ].filter((group) => isModuleEnabled(group.key));
  const adapterGroups = (results.adapterSources || []).map((source) => ({
    key: `adapter:${source.key}`,
    label: source.label,
    items: (results.adapterResults || []).filter((item) => item.sourceKey === source.key),
    source
  }));

  return [...nativeGroups, ...adapterGroups];
});

const resultCount = computed(() => groups.value.reduce((total, group) => total + group.items.length, 0));
const searched = computed(() => Boolean(globalSearchResults.value));
const visibleGroups = computed(() => groups.value.filter((group) => group.items.length));
const adapterSources = computed(() => globalSearchResults.value?.adapterSources || []);

function itemTitle(group, item) {
  return item.title || item.name;
}

function itemMeta(group, item) {
  if (group.key.startsWith('adapter:')) {
    return item.meta || `${group.label} integration`;
  }

  if (group.key === 'bookmarks') {
    return `${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName} / ${item.url}`;
  }

  if (group.key === 'tasks') {
    return `${item.priority} / ${item.status} / ${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName}`;
  }
  if (group.key === 'announcements') {
    return `${item.isPinned ? 'Pinned' : 'Announcement'} / ${item.author.displayName}`;
  }
  if (group.key === 'tags') {
    return `${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName}`;
  }

  return `${item.isShared ? 'Shared' : 'Private'} / ${item.owner.displayName}`;
}

function itemBody(group, item) {
  if (group.key === 'notes') return item.body || 'No details yet.';
  if (group.key === 'tasks') return item.details || 'No details yet.';
  if (group.key === 'bookmarks') return item.notes || 'No notes yet.';
  if (group.key === 'announcements') return item.body;
  if (group.key === 'tags') return 'Use this tag to organize related notes, tasks, and bookmarks.';
  if (group.key.startsWith('adapter:')) return item.summary || 'Matched through an integration.';
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
        <p>Find visible notes, tasks, bookmarks, announcements, tags, and future portal results.</p>
      </div>
      <form class="storage-search" @submit.prevent="searchEverything">
        <input v-model="globalSearchQuery" autofocus placeholder="Search Equinox" />
        <button class="main-button" type="submit">Search</button>
      </form>
      <p v-if="globalSearchError" class="storage-error">{{ globalSearchError }}</p>
    </section>

    <section v-if="searched" class="storage-section">
      <div class="storage-section-title">
        <h4>Results</h4>
        <span>{{ resultCount }}</span>
      </div>
      <p v-if="!resultCount" class="empty-state">No matching visible items.</p>

      <section v-for="group in visibleGroups" :key="group.key" class="feature-panel search-group">
        <div class="storage-section-title">
          <h4>{{ group.label }}</h4>
          <span>{{ group.items.length }}</span>
        </div>

        <article v-for="item in group.items" :key="item.id" class="search-result-row">
          <div class="search-result-body">
            <h4>{{ itemTitle(group, item) }}</h4>
            <span class="search-result-type">{{ group.label }}</span>
            <p>{{ itemMeta(group, item) }}</p>
            <TagChips v-if="item.tags?.length" :tags="item.tags" />
            <p>{{ itemBody(group, item) }}</p>
            <div class="item-actions">
              <a v-if="group.key === 'bookmarks'" :href="item.url" target="_blank" rel="noreferrer">Open link</a>
              <a v-else-if="group.key.startsWith('adapter:') && item.href" :href="item.href" target="_blank" rel="noreferrer">Open result</a>
              <RouterLink v-else-if="group.to" :to="group.to">Open section</RouterLink>
            </div>
          </div>
        </article>
      </section>

      <section v-if="adapterSources.length" class="feature-panel search-sources">
        <div class="panel-copy">
          <h3>Portal Search Sources</h3>
          <p>These integrations will join the same result list when their adapters are connected.</p>
        </div>
        <div class="search-source-list">
          <span v-for="source in adapterSources" :key="source.key">
            {{ source.label }}
            <small>{{ source.healthState === 'planned' ? 'Planned' : source.isEnabled ? 'Online' : 'Disabled' }}</small>
          </span>
        </div>
      </section>
    </section>
  </AppPage>
</template>
