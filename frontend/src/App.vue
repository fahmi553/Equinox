<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Bookmark,
  Bell,
  Boxes,
  CircleHelp,
  LayoutDashboard,
  HardDrive,
  ListChecks,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  Moon,
  NotebookText,
  Search,
  Settings,
  SquareActivity,
  Sun,
  Tags,
  UserRound,
  UsersRound,
  X
} from '@lucide/vue';
import CommandPalette from './components/CommandPalette.vue';
import { announcements, householdName, isAdmin, isAuthed, isLightTheme, isModuleEnabled, loadNotifications, logout, permissions, platformName, preferences, themeMode, toggleThemeMode, undoLastAction, undoNotice, unreadNotificationCount, user } from './stores/equinox';

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
      { moduleKey: 'chat', permissionKey: 'canUseChat', label: 'Chat', to: '/chat', icon: MessageCircle },
      { moduleKey: 'storage', label: 'Files', to: '/files', icon: HardDrive },
      { moduleKey: 'search', label: 'Search', to: '/search', icon: Search }
    ].filter((item) => isModuleEnabled(item.moduleKey) && (!item.permissionKey || permissions.value[item.permissionKey]))
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

async function handleLogout() {
  closeMobileNav();
  await logout();
  router.push('/login');
}

function closeMobileNav() {
  mobileNavOpen.value = false;
}

function handleAppKeydown(event) {
  if (event.key === 'Escape') closeMobileNav();
}

watch(() => route.fullPath, () => {
  closeMobileNav();
});

watch(mobileNavOpen, (value) => {
  document.body.style.overflow = value ? 'hidden' : '';
});

onMounted(() => {
  window.addEventListener('keydown', handleAppKeydown);
  notificationTimer = window.setInterval(() => {
    if (isAuthed.value) loadNotifications();
  }, 20000);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleAppKeydown);
  document.body.style.overflow = '';
  window.clearInterval(notificationTimer);
});
</script>

<template>
  <main :class="{ 'compact-mode': preferences.compactMode, 'light-theme': isLightTheme }">
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
        <CommandPalette />
        <button
          class="theme-button"
          type="button"
          :title="isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'"
          :aria-label="isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'"
          :aria-pressed="isLightTheme"
          @click="toggleThemeMode"
        >
          <Sun v-if="isLightTheme" :size="18" :stroke-width="2" />
          <Moon v-else :size="18" :stroke-width="2" />
          <span>{{ themeMode }}</span>
        </button>
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
      <div v-else class="header-account public-header-actions">
        <button
          class="theme-button"
          type="button"
          :title="isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'"
          :aria-label="isLightTheme ? 'Switch to dark theme' : 'Switch to light theme'"
          :aria-pressed="isLightTheme"
          @click="toggleThemeMode"
        >
          <Sun v-if="isLightTheme" :size="18" :stroke-width="2" />
          <Moon v-else :size="18" :stroke-width="2" />
          <span>{{ themeMode }}</span>
        </button>
        <RouterLink class="header-button" to="/login">
          Private Access
        </RouterLink>
      </div>
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
      @click="closeMobileNav"
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

    <div v-if="undoNotice" class="undo-toast" role="status" aria-live="polite">
      <span>{{ undoNotice.message }}</span>
      <button type="button" @click="undoLastAction">Undo</button>
    </div>
  </main>
</template>
