<script setup>
import { onMounted } from 'vue';
import AppPage from '../components/AppPage.vue';
import { dashboard, loadDashboard } from '../stores/equinox';

onMounted(loadDashboard);
</script>

<template>
  <AppPage title="Activity" eyebrow="Recent history">
    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Activity Log</h3>
        <p>Recent account and content events.</p>
      </div>
      <p v-if="!(dashboard?.activity || []).length" class="empty-state">No activity yet.</p>
      <article v-for="activity in dashboard?.activity || []" :key="activity.id" class="activity-row">
        <strong>{{ activity.action }}</strong>
        <span>{{ new Date(activity.createdAt).toLocaleString() }}</span>
      </article>
    </section>
  </AppPage>
</template>
