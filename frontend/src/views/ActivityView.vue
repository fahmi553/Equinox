<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import { activity, activityDetail, activityLabel, activityLoading, loadActivity } from '../stores/equinox';

const activeType = ref('');
const activityTypes = computed(() => [...new Set(activity.value.map((item) => item.action.split('.')[0]))]);
const visibleActivity = computed(() => {
  if (!activeType.value) return activity.value;
  return activity.value.filter((item) => item.action.startsWith(`${activeType.value}.`));
});

onMounted(loadActivity);
</script>

<template>
  <AppPage title="Activity" eyebrow="Recent history">
    <template #actions>
      <button class="secondary-button" @click="loadActivity">Refresh</button>
    </template>

    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Activity Log</h3>
        <p>Recent account and content changes with useful context.</p>
      </div>
      <div v-if="activityTypes.length" class="tag-filter-row">
        <button :class="{ active: !activeType }" @click="activeType = ''">All activity</button>
        <button
          v-for="type in activityTypes"
          :key="type"
          :class="{ active: activeType === type }"
          @click="activeType = type"
        >
          {{ type }}
        </button>
      </div>
      <p v-if="activityLoading" class="storage-info" role="status" aria-live="polite">Loading activity...</p>
      <p v-else-if="!visibleActivity.length" class="empty-state">No activity yet.</p>
      <article v-for="item in visibleActivity" :key="item.id" class="activity-row detailed">
        <div>
          <strong>{{ activityLabel(item.action) }}</strong>
          <p>{{ activityDetail(item) }}</p>
        </div>
        <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
      </article>
    </section>
  </AppPage>
</template>
