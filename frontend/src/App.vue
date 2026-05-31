<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { isAdmin, isAuthed, logout, user } from './stores/equinox';

const router = useRouter();
const showAppNav = computed(() => isAuthed.value);
const navItems = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Notes', to: '/notes' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Bookmarks', to: '/bookmarks' },
  { label: 'Tags', to: '/tags' },
  { label: 'Search', to: '/search' },
  { label: 'Profile', to: '/profile' },
  ...(isAdmin.value ? [{ label: 'Family', to: '/family' }] : []),
  { label: 'Guide', to: '/guide' },
  { label: 'Activity', to: '/activity' }
]);

function handleLogout() {
  logout();
  router.push('/login');
}
</script>

<template>
  <main>
    <header class="site-header">
      <RouterLink class="brand" to="/dashboard">
        <img class="brand-logo" src="/template-assets/images/equinox-logo.png" alt="Equinox logo" />
        <span>Equinox</span>
      </RouterLink>

      <nav v-if="showAppNav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>

      <button v-if="showAppNav" class="header-button" @click="handleLogout">
        Logout
      </button>
      <RouterLink v-else class="header-button" to="/login">
        Private Access
      </RouterLink>
    </header>

    <RouterView :key="$route.fullPath" />

    <footer>
      <strong>Equinox</strong>
      <span>{{ user?.displayName ? `${user.displayName}'s private ecosystem` : 'Private family hub, ready for Docker and NAS deployment.' }}</span>
    </footer>
  </main>
</template>
