import { createRouter, createWebHistory } from 'vue-router';
import { isAdmin, isAuthed, refreshSession, sessionChecked } from '../stores/equinox';
import ActivityView from '../views/ActivityView.vue';
import BookmarksView from '../views/BookmarksView.vue';
import DashboardView from '../views/DashboardView.vue';
import FamilyView from '../views/FamilyView.vue';
import GuideView from '../views/GuideView.vue';
import LoginView from '../views/LoginView.vue';
import NotesView from '../views/NotesView.vue';
import ProfileView from '../views/ProfileView.vue';
import SearchView from '../views/SearchView.vue';
import TasksView from '../views/TasksView.vue';
import TagsView from '../views/TagsView.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView, meta: { guest: true } },
  { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/notes', component: NotesView, meta: { requiresAuth: true } },
  { path: '/tasks', component: TasksView, meta: { requiresAuth: true } },
  { path: '/bookmarks', component: BookmarksView, meta: { requiresAuth: true } },
  { path: '/tags', component: TagsView, meta: { requiresAuth: true } },
  { path: '/search', component: SearchView, meta: { requiresAuth: true } },
  { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/family', component: FamilyView, meta: { requiresAuth: true, requiresAdmin: true } },
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

  if (to.meta.guest && isAuthed.value) {
    return '/dashboard';
  }

  return true;
});

export default router;
