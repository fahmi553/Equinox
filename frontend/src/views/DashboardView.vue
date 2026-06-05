<script setup>
import { computed, onMounted } from 'vue';
import {
  AlertCircle,
  Bookmark,
  Bell,
  CheckCircle2,
  CircleHelp,
  Clapperboard,
  Clock3,
  Database,
  HardDrive,
  Images,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  NotebookText,
  Search,
  Server,
  SquareActivity,
  Tags,
  UserRound,
  UsersRound
} from '@lucide/vue';
import {
  activityDetail,
  activityLabel,
  announcements,
  categories,
  dashboard,
  firstName,
  householdName,
  isAdmin,
  isModuleEnabled,
  loadAll,
  metricCards,
  permissions,
  user
} from '../stores/equinox';

const iconMap = {
  api: Server,
  Bookmark,
  Bell,
  CircleHelp,
  database: Database,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  media: Clapperboard,
  NotebookText,
  photos: Images,
  Search,
  SquareActivity,
  storage: HardDrive,
  Tags,
  UserRound,
  UsersRound
};

const visibleCategories = computed(() => categories.filter((category) => (
  (!category.adminOnly || isAdmin.value) && isModuleEnabled(category.moduleKey)
  && (!category.permissionKey || permissions.value[category.permissionKey])
)));
const activeAnnouncements = computed(() => announcements.value.filter((announcement) => {
  if (!announcement.expiresAt) return true;
  return new Date(announcement.expiresAt) >= new Date();
}));
const taskSummary = computed(() => dashboard.value?.taskSummary || { overdue: 0, today: 0, recent: [] });
const services = computed(() => dashboard.value?.services || []);

function formatDue(dueAt) {
  if (!dueAt) return 'No due date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dueAt));
}

onMounted(loadAll);
</script>

<template>
  <section class="main-banner">
    <div class="banner-content">
      <p class="overline">Welcome back, {{ firstName }}</p>
      <h1>Manage your private ecosystem</h1>
      <p class="hero-copy">
        Family tools, productivity, search, and service portals in one self-hosted interface.
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
          <span>Version</span>
          <strong>Equinox 2.0</strong>
        </label>
        <label>
          <span>Direction</span>
          <strong>Ecosystem platform</strong>
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
      <h2>{{ householdName }}</h2>
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

    <section
      v-if="permissions.canViewAnnouncements && isModuleEnabled('announcements')"
      id="announcements"
      class="feature-panel dashboard-announcements"
    >
      <div class="panel-copy">
        <h3>Family Announcements</h3>
        <p>Shared household notices from the family admins.</p>
      </div>
      <p v-if="!activeAnnouncements.length" class="empty-state">No announcements right now.</p>
      <article v-for="announcement in activeAnnouncements.slice(0, 4)" :key="announcement.id" class="announcement-card compact">
        <div class="announcement-card-heading">
          <span v-if="announcement.isPinned">Pinned</span>
          <strong>{{ announcement.title }}</strong>
        </div>
        <p>{{ announcement.body }}</p>
        <small>
          {{ announcement.author.displayName }}
          <span v-if="announcement.expiresAt"> / Until {{ new Date(announcement.expiresAt).toLocaleDateString() }}</span>
        </small>
      </article>
    </section>

    <section class="feature-grid dashboard-grid">
      <section v-if="isModuleEnabled('tasks')" class="feature-panel">
        <div class="panel-copy dashboard-panel-heading">
          <div>
            <h3>Task Summary</h3>
            <p>What needs attention across your visible family tasks.</p>
          </div>
          <RouterLink class="panel-link" to="/tasks">Open tasks</RouterLink>
        </div>
        <div class="dashboard-task-counts">
          <div>
            <AlertCircle :size="22" :stroke-width="1.9" />
            <span>Overdue</span>
            <strong>{{ taskSummary.overdue }}</strong>
          </div>
          <div>
            <Clock3 :size="22" :stroke-width="1.9" />
            <span>Due today</span>
            <strong>{{ taskSummary.today }}</strong>
          </div>
        </div>
        <p v-if="!taskSummary.recent.length" class="empty-state">No active tasks right now.</p>
        <article v-for="task in taskSummary.recent" :key="task.id" class="dashboard-task-row">
          <div>
            <strong>{{ task.title }}</strong>
            <span>{{ task.priority }} / {{ formatDue(task.dueAt) }}</span>
          </div>
          <span>{{ task.owner.displayName }}</span>
        </article>
      </section>

      <section class="feature-panel">
        <div class="panel-copy dashboard-panel-heading">
          <div>
            <h3>Service Status</h3>
            <p>Core services now and integration placeholders for later phases.</p>
          </div>
        </div>
        <article v-for="service in services" :key="service.id" class="service-row">
          <span class="service-icon" aria-hidden="true">
            <component :is="iconMap[service.id]" :size="22" :stroke-width="1.8" />
          </span>
          <div>
            <strong>{{ service.name }}</strong>
            <span>{{ service.detail }}</span>
          </div>
          <span :class="['service-state', service.status]">
            <CheckCircle2 v-if="service.status === 'online'" :size="15" :stroke-width="2.2" />
            <Clock3 v-else :size="15" :stroke-width="2.2" />
            {{ service.status === 'online' ? 'Online' : 'Planned' }}
          </span>
        </article>
      </section>
    </section>

    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Recent Activity</h3>
        <p>The latest account and content events across Equinox.</p>
      </div>
      <p v-if="!(dashboard?.activity || []).length" class="empty-state">No activity yet.</p>
      <article v-for="activity in dashboard?.activity || []" :key="activity.id" class="activity-row">
        <div>
          <strong>{{ activityLabel(activity.action) }}</strong>
          <p>{{ activityDetail(activity) }}</p>
        </div>
        <span>{{ new Date(activity.createdAt).toLocaleString() }}</span>
      </article>
    </section>
  </section>
</template>
