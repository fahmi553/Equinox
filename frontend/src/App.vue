<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Bookmark,
  Bell,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  NotebookText,
  Search,
  Settings,
  SquareActivity,
  Tags,
  UserRound,
  UsersRound,
  X
} from '@lucide/vue';
import { announcements, householdName, isAdmin, isAuthed, isModuleEnabled, loadNotifications, logout, permissions, platformName, preferences, unreadNotificationCount, user } from './stores/equinox';

const route = useRoute();
const router = useRouter();
const mobileNavOpen = ref(false);
let notificationTimer;
const showAppNav = computed(() => isAuthed.value);
const visibleAnnouncements = computed(() => announcements.value.filter((announcement) => (
  !announcement.expiresAt || new Date(announcement.expiresAt) >= new Date()
)));
const primaryAnnouncement = computed(() => visibleAnnouncements.value[0] || null);
const showAnnouncementStrip = computed(() => (
  showAppNav.value
  && route.path !== '/dashboard'
  && permissions.value.canViewAnnouncements
  && isModuleEnabled('announcements')
  && primaryAnnouncement.value
));
const navGroups = computed(() => [
  {
    label: 'Workspace',
    items: [
      { moduleKey: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { moduleKey: 'notes', label: 'Notes', to: '/notes', icon: NotebookText },
      { moduleKey: 'tasks', label: 'Tasks', to: '/tasks', icon: ListChecks },
      { moduleKey: 'bookmarks', label: 'Bookmarks', to: '/bookmarks', icon: Bookmark },
      { moduleKey: 'tags', label: 'Tags', to: '/tags', icon: Tags },
      { moduleKey: 'chat', label: 'Chat', to: '/chat', icon: MessageCircle },
      { moduleKey: 'search', label: 'Search', to: '/search', icon: Search }
    ].filter((item) => isModuleEnabled(item.moduleKey))
  },
  {
    label: 'Account',
    items: [
      { moduleKey: 'profile', label: 'Profile', to: '/profile', icon: UserRound },
      { moduleKey: 'notifications', label: 'Notifications', to: '/notifications', icon: Bell },
      ...(isAdmin.value ? [
        { moduleKey: 'family', label: 'Family', to: '/family', icon: UsersRound },
        { label: 'Modules', to: '/modules', icon: Boxes }
      ] : []),
      { label: 'Settings', to: '/settings', icon: Settings },
      { moduleKey: 'activity', label: 'Activity', to: '/activity', icon: SquareActivity },
      { moduleKey: 'guide', label: 'Guide', to: '/guide', icon: CircleHelp }
    ].filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey))
  }
]);

function handleLogout() {
  mobileNavOpen.value = false;
  logout();
  router.push('/login');
}

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false;
});

onMounted(() => {
  notificationTimer = window.setInterval(() => {
    if (isAuthed.value) loadNotifications();
  }, 20000);
});

onUnmounted(() => window.clearInterval(notificationTimer));
</script>

<template>
  <main :class="{ 'compact-mode': preferences.compactMode }">
    <header class="site-header">
      <RouterLink class="brand" to="/dashboard">
        <img class="brand-logo" src="/template-assets/images/equinox-logo.png" alt="Equinox logo" />
        <span>{{ platformName }}</span>
      </RouterLink>

      <div v-if="showAppNav" class="header-account">
        <div>
          <strong>{{ user.displayName }}</strong>
          <span>{{ user.role }}</span>
        </div>
        <RouterLink class="notification-button" to="/notifications" title="Notifications">
          <Bell :size="20" :stroke-width="2" />
          <span v-if="unreadNotificationCount">{{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}</span>
        </RouterLink>
        <button class="header-button logout-button" title="Logout" @click="handleLogout">
          <LogOut :size="18" :stroke-width="2" />
          <span>Logout</span>
        </button>
        <button
          class="menu-button"
          :title="mobileNavOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileNavOpen"
          aria-controls="mobile-navigation"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          <X v-if="mobileNavOpen" :size="23" :stroke-width="2" />
          <Menu v-else :size="23" :stroke-width="2" />
        </button>
      </div>
      <RouterLink v-else class="header-button" to="/login">
        Private Access
      </RouterLink>
    </header>

    <aside
      v-if="showAppNav"
      id="mobile-navigation"
      :class="['app-sidebar', { open: mobileNavOpen }]"
    >
      <nav aria-label="Equinox modules">
        <section v-for="group in navGroups" :key="group.label" class="sidebar-group">
          <h2>{{ group.label }}</h2>
          <RouterLink v-for="item in group.items" :key="item.to" :to="item.to">
            <component :is="item.icon" :size="19" :stroke-width="1.9" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>
      <div class="sidebar-user">
        <UserRound :size="22" :stroke-width="1.8" />
        <div>
          <strong>{{ user.displayName }}</strong>
          <span>@{{ user.username }}</span>
        </div>
      </div>
    </aside>
    <button
      v-if="showAppNav && mobileNavOpen"
      class="sidebar-backdrop"
      aria-label="Close menu"
      @click="mobileNavOpen = false"
    ></button>

    <div :class="{ 'app-content': showAppNav }">
      <RouterLink v-if="showAnnouncementStrip" class="announcement-strip" to="/dashboard#announcements">
        <Megaphone :size="19" :stroke-width="2" />
        <span>
          <strong>{{ primaryAnnouncement.title }}</strong>
          <small>{{ primaryAnnouncement.body }}</small>
        </span>
        <em>{{ visibleAnnouncements.length }} notice{{ visibleAnnouncements.length === 1 ? '' : 's' }}</em>
      </RouterLink>
      <RouterView :key="$route.fullPath" />

      <footer>
        <strong>{{ platformName }}</strong>
        <span>{{ user?.displayName ? householdName : 'Private family hub, ready for Docker and NAS deployment.' }}</span>
      </footer>
    </div>
  </main>
</template>
