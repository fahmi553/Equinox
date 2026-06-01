import { createRouter, createWebHistory } from 'vue-router';
import { isAdmin, isAuthed, isModuleEnabled, loadModules, modules, refreshSession, sessionChecked } from '../stores/equinox';
import ActivityView from '../views/ActivityView.vue';
import BookmarksView from '../views/BookmarksView.vue';
import ChatView from '../views/ChatView.vue';
import DashboardView from '../views/DashboardView.vue';
import FamilyView from '../views/FamilyView.vue';
import GuideView from '../views/GuideView.vue';
import LoginView from '../views/LoginView.vue';
import NotesView from '../views/NotesView.vue';
import NotificationsView from '../views/NotificationsView.vue';
import ModulesView from '../views/ModulesView.vue';
import ProfileView from '../views/ProfileView.vue';
import SearchView from '../views/SearchView.vue';
import SettingsView from '../views/SettingsView.vue';
import TasksView from '../views/TasksView.vue';
import TagsView from '../views/TagsView.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView, meta: { guest: true } },
  { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/notes', component: NotesView, meta: { requiresAuth: true, moduleKey: 'notes' } },
  { path: '/tasks', component: TasksView, meta: { requiresAuth: true, moduleKey: 'tasks' } },
  { path: '/bookmarks', component: BookmarksView, meta: { requiresAuth: true, moduleKey: 'bookmarks' } },
  { path: '/chat', component: ChatView, meta: { requiresAuth: true, moduleKey: 'chat' } },
  { path: '/tags', component: TagsView, meta: { requiresAuth: true, moduleKey: 'tags' } },
  { path: '/search', component: SearchView, meta: { requiresAuth: true, moduleKey: 'search' } },
  { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/notifications', component: NotificationsView, meta: { requiresAuth: true } },
  { path: '/family', component: FamilyView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/modules', component: ModulesView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/guide', component: GuideView, meta: { requiresAuth: true } },
  { path: '/activity', component: ActivityView, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to) => {
  if (!sessionChecked.value) {
    await refreshSession();
  }

  if (to.meta.requiresAuth && !isAuthed.value) {
    return '/login';
  }

  if (to.meta.requiresAdmin && !isAdmin.value) {
    return '/dashboard';
  }

  if (isAuthed.value && !modules.value.length) {
    await loadModules();
  }

  if (to.meta.moduleKey && !isModuleEnabled(to.meta.moduleKey)) {
    return '/dashboard';
  }

  if (to.meta.guest && isAuthed.value) {
    return '/dashboard';
  }

  return true;
});

export default router;
