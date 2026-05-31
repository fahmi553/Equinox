import { computed, ref } from 'vue';

export const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
export const token = ref(localStorage.getItem('equinox.token') || '');
export const user = ref(JSON.parse(localStorage.getItem('equinox.user') || 'null'));
export const authMode = ref('login');
export const authForm = ref({ username: '', password: '', displayName: '' });
export const authStatus = ref({ hasOwner: true, setupRequired: false, roles: [] });
export const authLoading = ref(false);
export const sessionChecked = ref(false);
export const dashboard = ref(null);
export const familyUsers = ref([]);
export const rolePermissions = ref([]);
export const announcements = ref([]);
export const profile = ref(null);
export const notes = ref([]);
export const tasks = ref([]);
export const tags = ref([]);
export const bookmarks = ref([]);
export const globalSearchQuery = ref('');
export const globalSearchResults = ref(null);
export const newNote = ref({ title: '', body: '', isShared: false, tagIds: [] });
export const newTask = ref({ title: '', details: '', priority: 'NORMAL', status: 'OPEN', dueAt: '', isShared: false, tagIds: [] });
export const newTag = ref({ name: '', color: '#7c3aed', isShared: false });
export const newBookmark = ref({ title: '', url: '', notes: '', isShared: false, tagIds: [] });
export const newAnnouncement = ref({ title: '', body: '', isPinned: false, expiresAt: '' });
export const defaultPermissions = {
  canCreateNotes: true,
  canCreateTasks: true,
  canCreateTags: true,
  canCreateBookmarks: true,
  canViewAnnouncements: true
};
export const newFamilyUser = ref({
  displayName: '',
  username: '',
  password: '',
  role: 'FAMILY'
});
export const profileForm = ref({ displayName: '', username: '' });
export const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });
export const error = ref('');
export const familyError = ref('');
export const familyMessage = ref('');
export const profileError = ref('');
export const profileMessage = ref('');
export const passwordError = ref('');
export const passwordMessage = ref('');
export const taskError = ref('');
export const tagError = ref('');
export const bookmarkError = ref('');
export const globalSearchError = ref('');
export const announcementError = ref('');

export const isAuthed = computed(() => Boolean(token.value));
export const isAdmin = computed(() => user.value?.role === 'ADMIN');
export const rolePermissionMap = computed(() => Object.fromEntries(
  rolePermissions.value.map((item) => [item.role, item.permissions])
));
export const permissions = computed(() => {
  const roleDefault = user.value?.role ? rolePermissionMap.value[user.value.role] : null;
  return { ...defaultPermissions, ...(roleDefault || {}), ...(user.value?.permissions || {}) };
});
export const firstName = computed(() => user.value?.displayName?.split(' ')[0] || 'Family');

export const categories = [
  { label: 'Dashboard', value: 'Live hub', icon: 'LayoutDashboard', to: '/dashboard' },
  { label: 'Notes', value: 'Quick memory', icon: 'NotebookText', to: '/notes' },
  { label: 'Tasks', value: 'To-do board', icon: 'ListChecks', to: '/tasks' },
  { label: 'Bookmarks', value: 'Saved links', icon: 'Bookmark', to: '/bookmarks' },
  { label: 'Tags', value: 'Organize items', icon: 'Tags', to: '/tags' },
  { label: 'Search', value: 'Find anything', icon: 'Search', to: '/search' },
  { label: 'Profile', value: 'Your account', icon: 'UserRound', to: '/profile' },
  { label: 'Family', value: 'Accounts', icon: 'UsersRound', to: '/family', adminOnly: true },
  { label: 'Guide', value: 'How to use', icon: 'CircleHelp', to: '/guide' },
  { label: 'Activity', value: 'Recent history', icon: 'SquareActivity', to: '/activity' }
];

export const metricCards = computed(() => [
  { label: 'Notes', value: dashboard.value?.totals.notes ?? notes.value.length, icon: 'NotebookText' },
  { label: 'Tasks', value: dashboard.value?.totals.tasks ?? tasks.value.length, icon: 'ListChecks' },
  { label: 'Bookmarks', value: dashboard.value?.totals.bookmarks ?? bookmarks.value.length, icon: 'Bookmark' },
  { label: 'Family', value: dashboard.value?.totals.users ?? familyUsers.value.length, icon: 'UsersRound' }
]);

export async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.message || 'Request failed.');
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function loadAuthStatus() {
  authStatus.value = await api('/auth/status');
  if (authStatus.value.setupRequired) {
    authMode.value = 'setup';
  } else if (authMode.value === 'setup') {
    authMode.value = 'login';
  }
}

export async function authenticate() {
  error.value = '';
  authLoading.value = true;
  const path = authMode.value === 'setup' ? '/auth/setup' : '/auth/login';

  try {
    const body = authMode.value === 'login'
      ? { username: authForm.value.username, password: authForm.value.password }
      : {
          username: authForm.value.username,
          password: authForm.value.password,
          displayName: authForm.value.displayName
        };
    const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem('equinox.token', result.token);
    localStorage.setItem('equinox.user', JSON.stringify(result.user));
    authForm.value = { username: '', password: '', displayName: '' };
    await loadAuthStatus();
    await loadAll();
    return true;
  } catch (err) {
    error.value = err.message;
    return false;
  } finally {
    authLoading.value = false;
  }
}

export function logout() {
  token.value = '';
  user.value = null;
  dashboard.value = null;
  profile.value = null;
  familyUsers.value = [];
  rolePermissions.value = [];
  announcements.value = [];
  notes.value = [];
  tasks.value = [];
  tags.value = [];
  bookmarks.value = [];
  localStorage.removeItem('equinox.token');
  localStorage.removeItem('equinox.user');
}

export async function refreshSession() {
  if (!token.value) {
    await loadAuthStatus();
    sessionChecked.value = true;
    return false;
  }

  try {
    const result = await api('/auth/me');
    user.value = result.user;
    localStorage.setItem('equinox.user', JSON.stringify(result.user));
    await loadAuthStatus();
    sessionChecked.value = true;
    return true;
  } catch {
    logout();
    await loadAuthStatus();
    sessionChecked.value = true;
    return false;
  }
}

export async function loadAll() {
  if (!token.value) return;
  await Promise.all([loadDashboard(), loadAnnouncements(), loadTags(), loadNotes(), loadTasks(), loadBookmarks()]);
}

export async function loadDashboard() {
  dashboard.value = await api('/dashboard');
  if (dashboard.value?.user) {
    user.value = dashboard.value.user;
    localStorage.setItem('equinox.user', JSON.stringify(dashboard.value.user));
  }
}

export async function loadNotes() {
  notes.value = await api('/notes');
}

export async function loadTasks() {
  tasks.value = await api('/tasks');
}

export async function loadTags() {
  tags.value = await api('/tags');
}

export async function loadBookmarks() {
  bookmarks.value = await api('/bookmarks');
}

export async function searchEverything() {
  globalSearchError.value = '';
  const query = globalSearchQuery.value.trim();

  if (!query) {
    globalSearchResults.value = null;
    return;
  }

  try {
    const params = new URLSearchParams({ q: query });
    globalSearchResults.value = await api(`/search?${params}`);
  } catch (err) {
    globalSearchError.value = err.message;
  }
}

export async function loadFamilyUsers() {
  if (!isAdmin.value) return;
  familyUsers.value = await api('/users');
}

export async function loadRolePermissions() {
  if (!isAdmin.value) return;
  rolePermissions.value = await api('/roles/permissions');
}

export async function loadAnnouncements(includeExpired = false) {
  try {
    announcements.value = await api(`/announcements${includeExpired ? '?includeExpired=true' : ''}`);
  } catch (err) {
    if (err.status === 403) {
      announcements.value = [];
      return;
    }

    throw err;
  }
}

export async function loadProfile() {
  profile.value = await api('/profile');
  if (profile.value?.user) {
    user.value = profile.value.user;
    profileForm.value = {
      displayName: profile.value.user.displayName,
      username: profile.value.user.username
    };
    localStorage.setItem('equinox.user', JSON.stringify(profile.value.user));
  }
}

export async function updateProfile() {
  profileError.value = '';
  profileMessage.value = '';

  const payload = {
    displayName: profileForm.value.displayName.trim(),
    username: profileForm.value.username.trim()
  };

  if (!payload.displayName || !payload.username) {
    profileError.value = 'Display name and username are required.';
    return false;
  }

  try {
    const result = await api('/profile', { method: 'PATCH', body: JSON.stringify(payload) });
    user.value = result.user;
    if (profile.value) {
      profile.value.user = result.user;
    }
    localStorage.setItem('equinox.user', JSON.stringify(result.user));
    profileMessage.value = 'Profile updated.';
    await loadDashboard();
    return true;
  } catch (err) {
    profileError.value = err.message;
    return false;
  }
}

export async function changePassword() {
  passwordError.value = '';
  passwordMessage.value = '';

  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
    passwordError.value = 'Current password and new password are required.';
    return false;
  }

  if (passwordForm.value.newPassword.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.';
    return false;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'New password confirmation does not match.';
    return false;
  }

  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword
      })
    });
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
    passwordMessage.value = 'Password updated.';
    return true;
  } catch (err) {
    passwordError.value = err.message;
    return false;
  }
}

export async function createFamilyUser() {
  familyError.value = '';
  familyMessage.value = '';
  const payload = {
    displayName: newFamilyUser.value.displayName.trim(),
    username: newFamilyUser.value.username.trim(),
    password: newFamilyUser.value.password,
    role: newFamilyUser.value.role
  };

  if (!payload.displayName || !payload.username || !payload.password) {
    familyError.value = 'Display name, username, and password are required.';
    return false;
  }

  if (payload.password.length < 8) {
    familyError.value = 'Temporary password must be at least 8 characters.';
    return false;
  }

  try {
    await api('/users', { method: 'POST', body: JSON.stringify(payload) });
    newFamilyUser.value = {
      displayName: '',
      username: '',
      password: '',
      role: 'FAMILY'
    };
    await Promise.all([loadFamilyUsers(), loadDashboard()]);
    familyMessage.value = 'Account created.';
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function updateRolePermissions(role, nextPermissions) {
  familyError.value = '';
  familyMessage.value = '';

  try {
    await api(`/roles/${role}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(nextPermissions)
    });
    await Promise.all([loadRolePermissions(), loadFamilyUsers(), loadDashboard()]);
    familyMessage.value = 'Role defaults updated.';
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function updateUserPermissions(member, nextPermissions) {
  familyError.value = '';
  familyMessage.value = '';

  try {
    await api(`/users/${member.id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(nextPermissions)
    });
    await Promise.all([loadFamilyUsers(), loadDashboard()]);
    familyMessage.value = 'User permissions updated.';
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function updateFamilyUser(member, data) {
  familyError.value = '';
  familyMessage.value = '';

  try {
    await api(`/users/${member.id}`, { method: 'PATCH', body: JSON.stringify(data) });
    await Promise.all([loadFamilyUsers(), loadDashboard(), loadProfile()]);
    familyMessage.value = 'Account updated.';
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function resetFamilyUserPassword(member, password) {
  familyError.value = '';
  familyMessage.value = '';

  if (!password || password.length < 8) {
    familyError.value = 'Temporary password must be at least 8 characters.';
    return false;
  }

  try {
    await api(`/users/${member.id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    familyMessage.value = `Password reset for ${member.displayName}.`;
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

function announcementPayload(source) {
  return {
    title: source.title,
    body: source.body,
    isPinned: Boolean(source.isPinned),
    expiresAt: source.expiresAt || null
  };
}

export async function createAnnouncement() {
  announcementError.value = '';
  if (!newAnnouncement.value.title.trim() || !newAnnouncement.value.body.trim()) return false;

  try {
    await api('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementPayload(newAnnouncement.value))
    });
    newAnnouncement.value = { title: '', body: '', isPinned: false, expiresAt: '' };
    await Promise.all([loadAnnouncements(true), loadDashboard()]);
    return true;
  } catch (err) {
    announcementError.value = err.message;
    return false;
  }
}

export async function updateAnnouncement(announcement, data) {
  announcementError.value = '';

  try {
    await api(`/announcements/${announcement.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await Promise.all([loadAnnouncements(true), loadDashboard()]);
  } catch (err) {
    announcementError.value = err.message;
  }
}

export async function saveAnnouncement(announcement, source) {
  await updateAnnouncement(announcement, announcementPayload(source));
}

export async function toggleAnnouncementPin(announcement) {
  await updateAnnouncement(announcement, { isPinned: !announcement.isPinned });
}

export async function deleteAnnouncement(announcement) {
  announcementError.value = '';

  try {
    await api(`/announcements/${announcement.id}`, { method: 'DELETE' });
    await Promise.all([loadAnnouncements(true), loadDashboard()]);
  } catch (err) {
    announcementError.value = err.message;
  }
}

export async function createTag() {
  tagError.value = '';
  if (!newTag.value.name.trim()) return false;

  try {
    await api('/tags', { method: 'POST', body: JSON.stringify(newTag.value) });
    newTag.value = { name: '', color: '#7c3aed', isShared: false };
    await loadTags();
    return true;
  } catch (err) {
    tagError.value = err.message;
    return false;
  }
}

export async function updateTag(tag, data) {
  tagError.value = '';

  try {
    await api(`/tags/${tag.id}`, { method: 'PATCH', body: JSON.stringify(data) });
    await Promise.all([loadTags(), loadNotes(), loadTasks(), loadBookmarks()]);
  } catch (err) {
    tagError.value = err.message;
  }
}

export async function deleteTag(tag) {
  tagError.value = '';

  try {
    await api(`/tags/${tag.id}`, { method: 'DELETE' });
    await Promise.all([loadTags(), loadNotes(), loadTasks(), loadBookmarks()]);
  } catch (err) {
    tagError.value = err.message;
  }
}

function bookmarkPayload(source) {
  return {
    title: source.title,
    url: source.url,
    notes: source.notes || '',
    isShared: Boolean(source.isShared),
    tagIds: source.tagIds || []
  };
}

export async function createBookmark() {
  bookmarkError.value = '';
  if (!newBookmark.value.title.trim() || !newBookmark.value.url.trim()) return;

  try {
    await api('/bookmarks', { method: 'POST', body: JSON.stringify(bookmarkPayload(newBookmark.value)) });
    newBookmark.value = { title: '', url: '', notes: '', isShared: false, tagIds: [] };
    await Promise.all([loadBookmarks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    bookmarkError.value = err.message;
  }
}

export async function updateBookmark(bookmark, data) {
  bookmarkError.value = '';

  try {
    await api(`/bookmarks/${bookmark.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await Promise.all([loadBookmarks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    bookmarkError.value = err.message;
  }
}

export async function saveBookmark(bookmark, source) {
  await updateBookmark(bookmark, bookmarkPayload(source));
}

export async function toggleBookmarkShare(bookmark) {
  await updateBookmark(bookmark, { isShared: !bookmark.isShared });
}

export async function deleteBookmark(bookmark) {
  bookmarkError.value = '';

  try {
    await api(`/bookmarks/${bookmark.id}`, { method: 'DELETE' });
    await Promise.all([loadBookmarks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    bookmarkError.value = err.message;
  }
}

export async function createNote() {
  if (!newNote.value.title) return;
  await api('/notes', { method: 'POST', body: JSON.stringify(newNote.value) });
  newNote.value = { title: '', body: '', isShared: false, tagIds: [] };
  await Promise.all([loadNotes(), loadDashboard(), loadProfile()]);
}

export async function updateNote(note, data) {
  await api(`/notes/${note.id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
  await Promise.all([loadNotes(), loadDashboard(), loadProfile()]);
}

export async function toggleNoteShare(note) {
  await updateNote(note, { isShared: !note.isShared });
}

export async function deleteNote(note) {
  await api(`/notes/${note.id}`, { method: 'DELETE' });
  await Promise.all([loadNotes(), loadDashboard(), loadProfile()]);
}

function taskPayload(source) {
  return {
    title: source.title,
    details: source.details || '',
    priority: source.priority || 'NORMAL',
    status: source.status || 'OPEN',
    dueAt: source.dueAt || null,
    isShared: Boolean(source.isShared),
    tagIds: source.tagIds || []
  };
}

export async function createTask() {
  taskError.value = '';
  if (!newTask.value.title.trim()) return;

  try {
    await api('/tasks', { method: 'POST', body: JSON.stringify(taskPayload(newTask.value)) });
    newTask.value = { title: '', details: '', priority: 'NORMAL', status: 'OPEN', dueAt: '', isShared: false, tagIds: [] };
    await Promise.all([loadTasks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    taskError.value = err.message;
  }
}

export async function updateTask(task, data) {
  taskError.value = '';

  try {
    await api(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await Promise.all([loadTasks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    taskError.value = err.message;
  }
}

export async function saveTask(task, source) {
  await updateTask(task, taskPayload(source));
}

export async function toggleTaskDone(task) {
  await updateTask(task, { status: task.status === 'DONE' ? 'OPEN' : 'DONE' });
}

export async function toggleTaskShare(task) {
  await updateTask(task, { isShared: !task.isShared });
}

export async function deleteTask(task) {
  taskError.value = '';

  try {
    await api(`/tasks/${task.id}`, { method: 'DELETE' });
    await Promise.all([loadTasks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    taskError.value = err.message;
  }
}
