<script setup>
import { computed, onMounted } from 'vue';
import {
  BellRing,
  FolderOpen,
  HardDrive,
  LayoutDashboard,
  NotebookText,
  SquareActivity,
  UsersRound
} from '@lucide/vue';
import { categories, currentFolder, dashboard, firstName, isAdmin, loadAll, metricCards, user } from '../stores/equinox';

const iconMap = {
  BellRing,
  FolderOpen,
  HardDrive,
  LayoutDashboard,
  NotebookText,
  SquareActivity,
  UsersRound
};

const visibleCategories = computed(() => categories.filter((category) => !category.adminOnly || isAdmin.value));

onMounted(loadAll);
</script>

<template>
  <section class="main-banner">
    <div class="banner-content">
      <p class="overline">Welcome back, {{ firstName }}</p>
      <h1>Manage your private ecosystem</h1>
      <p class="hero-copy">
        Notes, reminders, uploads, users, and logs in a NAS-ready Docker stack.
      </p>

      <div class="search-panel status-panel">
        <label>
          <span>Signed in</span>
          <strong>{{ user.displayName }}</strong>
        </label>
        <label>
          <span>Role</span>
          <strong>{{ user.role }}</strong>
        </label>
        <label>
          <span>API</span>
          <strong>Docker proxy online</strong>
        </label>
        <label>
          <span>Location</span>
          <strong>{{ currentFolder?.name || 'Root storage' }}</strong>
        </label>
        <button class="main-button" @click="loadAll">Refresh</button>
      </div>

      <ul class="categories">
        <li v-for="category in visibleCategories" :key="category.label">
          <RouterLink :to="category.to">
            <span class="icon">
              <component :is="iconMap[category.icon]" :size="34" :stroke-width="1.7" />
            </span>
            <span>{{ category.label }}</span>
            <small>{{ category.value }}</small>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>

  <section class="popular-categories">
    <div class="section-heading">
      <h2>Family Workspace</h2>
      <h6>Dockerized Equinox</h6>
    </div>

    <div class="metrics">
      <article v-for="metric in metricCards" :key="metric.label">
        <span class="icon">
          <component :is="iconMap[metric.icon]" :size="34" :stroke-width="1.7" />
        </span>
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>

    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Recent Activity</h3>
        <p>The latest account and content events across Equinox.</p>
      </div>
      <article v-for="activity in dashboard?.activity || []" :key="activity.id" class="activity-row">
        <strong>{{ activity.action }}</strong>
        <span>{{ new Date(activity.createdAt).toLocaleString() }}</span>
      </article>
    </section>
  </section>
</template>
