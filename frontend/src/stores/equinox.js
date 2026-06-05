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
export const activity = ref([]);
export const modules = ref([]);
export const settings = ref(null);
export const familyUsers = ref([]);
export const rolePermissions = ref([]);
export const announcements = ref([]);
export const chatMessages = ref([]);
export const chatUsers = ref([]);
export const selectedChatUserId = ref('');
export const notifications = ref([]);
export const unreadNotificationCount = ref(0);
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
export const newChatMessage = ref('');
export const defaultPermissions = {
  canCreateNotes: true,
  canCreateTasks: true,
  canCreateTags: true,
  canCreateBookmarks: true,
  canUseChat: true,
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
export const noteError = ref('');
export const taskError = ref('');
export const tagError = ref('');
export const bookmarkError = ref('');
export const globalSearchError = ref('');
export const announcementError = ref('');
export const chatError = ref('');
export const moduleError = ref('');
export const moduleMessage = ref('');
export const settingsError = ref('');
export const settingsMessage = ref('');

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
export const moduleMap = computed(() => Object.fromEntries(
  modules.value.map((item) => [item.key, item])
));
export const preferences = computed(() => settings.value?.preferences || {
  startPage: '/dashboard',
  compactMode: false,
  dateFormat: 'locale'
});
export const defaultStartPage = computed(() => preferences.value.startPage || '/dashboard');
export const platformName = computed(() => settings.value?.system?.platformName || 'Equinox');
export const householdName = computed(() => settings.value?.system?.householdName || 'Family Workspace');

export const categories = [
  { moduleKey: 'dashboard', label: 'Dashboard', value: 'Live hub', icon: 'LayoutDashboard', to: '/dashboard' },
  { moduleKey: 'notes', label: 'Notes', value: 'Quick memory', icon: 'NotebookText', to: '/notes' },
  { moduleKey: 'tasks', label: 'Tasks', value: 'To-do board', icon: 'ListChecks', to: '/tasks' },
  { moduleKey: 'bookmarks', label: 'Bookmarks', value: 'Saved links', icon: 'Bookmark', to: '/bookmarks' },
  { moduleKey: 'tags', label: 'Tags', value: 'Organize items', icon: 'Tags', to: '/tags' },
  { moduleKey: 'chat', permissionKey: 'canUseChat', label: 'Chat', value: 'Family messages', icon: 'MessageCircle', to: '/chat' },
  { moduleKey: 'search', label: 'Search', value: 'Find anything', icon: 'Search', to: '/search' },
  { moduleKey: 'profile', label: 'Profile', value: 'Your account', icon: 'UserRound', to: '/profile' },
  { moduleKey: 'family', label: 'Family', value: 'Accounts', icon: 'UsersRound', to: '/family', adminOnly: true },
  { moduleKey: 'guide', label: 'Guide', value: 'How to use', icon: 'CircleHelp', to: '/guide' },
  { moduleKey: 'activity', label: 'Activity', value: 'Recent history', icon: 'SquareActivity', to: '/activity' }
];

export const metricCards = computed(() => [
  { moduleKey: 'notes', label: 'Notes', value: dashboard.value?.totals.notes ?? notes.value.length, icon: 'NotebookText' },
  { moduleKey: 'tasks', label: 'Tasks', value: dashboard.value?.totals.tasks ?? tasks.value.length, icon: 'ListChecks' },
  { moduleKey: 'bookmarks', label: 'Bookmarks', value: dashboard.value?.totals.bookmarks ?? bookmarks.value.length, icon: 'Bookmark' },
  { label: 'Family', value: dashboard.value?.totals.users ?? familyUsers.value.length, icon: 'UsersRound' }
].filter((metric) => !metric.moduleKey || isModuleEnabled(metric.moduleKey)));

const activityLabels = {
  'auth.owner_setup': 'Owner account created',
  'auth.password_changed': 'Password changed',
  'user.login': 'Signed in',
  'user.created': 'Account created',
  'user.updated': 'Account updated',
  'user.profile_updated': 'Profile updated',
  'user.password_reset': 'Account password reset',
  'user.permissions_updated': 'Account permissions updated',
  'role.permissions_updated': 'Role defaults updated',
  'module.updated': 'Module setting updated',
  'settings.system_updated': 'System settings updated',
  'settings.preferences_updated': 'Preferences updated',
  'settings.integration_updated': 'Integration settings updated',
  'announcement.created': 'Announcement posted',
  'announcement.updated': 'Announcement updated',
  'announcement.deleted': 'Announcement deleted',
  'note.created': 'Note created',
  'note.updated': 'Note updated',
  'note.deleted': 'Note deleted',
  'task.created': 'Task created',
  'task.updated': 'Task updated',
  'task.deleted': 'Task deleted',
  'tag.created': 'Tag created',
  'tag.updated': 'Tag updated',
  'tag.deleted': 'Tag deleted',
  'bookmark.created': 'Bookmark created',
  'bookmark.updated': 'Bookmark updated',
  'bookmark.deleted': 'Bookmark deleted',
  'chat.message_sent': 'Chat message sent'
};

export function activityLabel(action) {
  return activityLabels[action] || String(action || '').replaceAll(/[._]/g, ' ');
}

function activitySubject(item) {
  const metadata = item.metadata || {};
  return metadata.title || metadata.name || metadata.displayName || metadata.username || '';
}

function clientSummary(userAgent = '') {
  if (!userAgent || userAgent === 'unknown') return 'unknown device';

  const browser = userAgent.includes('Edg/') ? 'Edge'
    : userAgent.includes('Chrome/') ? 'Chrome'
      : userAgent.includes('Firefox/') ? 'Firefox'
        : userAgent.includes('Safari/') ? 'Safari'
          : 'browser';
  const device = userAgent.includes('Windows') ? 'Windows'
    : userAgent.includes('Android') ? 'Android'
      : /iPhone|iPad/.test(userAgent) ? 'iOS'
        : userAgent.includes('Macintosh') ? 'macOS'
          : userAgent.includes('Linux') ? 'Linux'
            : 'device';

  return `${browser} on ${device}`;
}

export function activityDetail(item) {
  const metadata = item.metadata || {};
  const actor = item.user?.displayName || 'System';
  const subject = activitySubject(item);

  if (item.action === 'user.login') {
    return `${actor} signed in from ${metadata.ipAddress || 'unknown IP'} using ${clientSummary(metadata.userAgent)}.`;
  }
  if (item.action === 'user.created') {
    return `${actor} created ${metadata.displayName || metadata.username || 'an account'} with the ${metadata.role || 'family'} role.`;
  }
  if (item.action === 'user.updated') {
    return `${actor} updated ${metadata.displayName || metadata.username || 'an account'}${metadata.role ? ` (${metadata.role})` : ''}.`;
  }
  if (item.action === 'user.password_reset') {
    return `${actor} reset the password for ${metadata.displayName || metadata.username || 'an account'}.`;
  }
  if (item.action === 'user.permissions_updated') {
    const changes = (metadata.changedPermissions || []).join(', ');
    return `${actor} updated permissions for ${metadata.displayName || metadata.username || 'an account'}${changes ? `: ${changes}` : ''}.`;
  }
  if (item.action === 'role.permissions_updated') {
    return `${actor} changed the default permissions for the ${metadata.role || 'selected'} role.`;
  }
  if (item.action === 'module.updated') {
    return `${actor} ${metadata.isEnabled ? 'enabled' : 'disabled'} the ${metadata.label || metadata.key || 'selected'} module.`;
  }
  if (item.action === 'settings.system_updated') {
    return `${actor} updated the Equinox platform settings.`;
  }
  if (item.action === 'settings.preferences_updated') {
    return `${actor} updated their personal Equinox preferences.`;
  }
  if (item.action === 'settings.integration_updated') {
    return `${actor} updated the ${metadata.label || metadata.key || 'selected'} integration settings.`;
  }
  if (item.action === 'auth.password_changed') {
    return `${actor} changed their account password.`;
  }
  if (item.action === 'auth.owner_setup') {
    return `${actor} completed the initial Equinox owner setup.`;
  }
  if (item.action === 'user.profile_updated') {
    return `${actor} updated their profile details.`;
  }
  if (item.action === 'chat.message_sent') {
    return `${actor} sent a household chat message.`;
  }
  if (subject) {
    return `${actor}: ${subject}`;
  }

  return `${actor} performed this action.`;
}

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
  activity.value = [];
  modules.value = [];
  settings.value = null;
  profile.value = null;
  familyUsers.value = [];
  rolePermissions.value = [];
  announcements.value = [];
  chatMessages.value = [];
  chatUsers.value = [];
  selectedChatUserId.value = '';
  notifications.value = [];
  unreadNotificationCount.value = 0;
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
    await loadModules();
    await loadSettings();
    if (isModuleEnabled('announcements')) {
      await loadAnnouncements();
    }
    await loadNotifications();
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
  await loadModules();
  await loadSettings();
  await Promise.all([
    loadDashboard(),
    loadNotifications(),
    isModuleEnabled('announcements') ? loadAnnouncements() : Promise.resolve(announcements.value = []),
    isModuleEnabled('tags') ? loadTags() : Promise.resolve(tags.value = []),
    isModuleEnabled('notes') ? loadNotes() : Promise.resolve(notes.value = []),
    isModuleEnabled('tasks') ? loadTasks() : Promise.resolve(tasks.value = []),
    isModuleEnabled('bookmarks') ? loadBookmarks() : Promise.resolve(bookmarks.value = [])
  ]);
}

export function isModuleEnabled(key) {
  return moduleMap.value[key]?.isEnabled !== false;
}

export async function loadModules() {
  modules.value = await api('/modules');
}

export async function updateModuleSetting(module, isEnabled) {
  moduleError.value = '';
  moduleMessage.value = '';

  try {
    await api(`/modules/${module.key}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled })
    });
    await loadAll();
    moduleMessage.value = `${module.label} ${isEnabled ? 'enabled' : 'disabled'}.`;
    return true;
  } catch (err) {
    moduleError.value = err.message;
    return false;
  }
}

export async function loadSettings() {
  settings.value = await api('/settings');
}

export async function updateSystemSettings(data) {
  settingsError.value = '';
  settingsMessage.value = '';

  try {
    const result = await api('/settings/system', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    settings.value.system = result.system;
    settingsMessage.value = 'System settings updated.';
    return true;
  } catch (err) {
    settingsError.value = err.message;
    return false;
  }
}

export async function updatePreferences(data) {
  settingsError.value = '';
  settingsMessage.value = '';

  try {
    const result = await api('/settings/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    settings.value.preferences = result.preferences;
    settingsMessage.value = 'Preferences updated.';
    return true;
  } catch (err) {
    settingsError.value = err.message;
    return false;
  }
}

export async function updateIntegrationSetting(integration, data) {
  settingsError.value = '';
  settingsMessage.value = '';

  try {
    const result = await api(`/settings/integrations/${integration.key}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    settings.value.integrations = settings.value.integrations.map((item) => (
      item.key === integration.key ? result.integration : item
    ));
    settingsMessage.value = `${integration.label} settings updated.`;
    return true;
  } catch (err) {
    settingsError.value = err.message;
    return false;
  }
}

export async function loadDashboard() {
  dashboard.value = await api('/dashboard');
  if (dashboard.value?.user) {
    user.value = dashboard.value.user;
    localStorage.setItem('equinox.user', JSON.stringify(dashboard.value.user));
  }
}

export async function loadActivity() {
  activity.value = await api('/activity');
}

export async function loadNotifications() {
  const result = await api('/notifications');
  notifications.value = result.notifications;
  unreadNotificationCount.value = result.unreadCount;
}

export async function markNotificationRead(notification) {
  if (notification.isRead) return;
  await api(`/notifications/${notification.id}/read`, { method: 'PATCH' });
  await loadNotifications();
}

export async function markAllNotificationsRead() {
  await api('/notifications/read-all', { method: 'PATCH' });
  await loadNotifications();
}

export async function loadChatMessages() {
  const params = selectedChatUserId.value ? `?recipientId=${encodeURIComponent(selectedChatUserId.value)}` : '';
  await loadOptionalCollection(`/chat/messages${params}`, chatMessages);
}

export async function loadChatUsers() {
  await loadOptionalCollection('/chat/users', chatUsers);
}

export async function sendChatMessage() {
  chatError.value = '';
  const body = newChatMessage.value.trim();
  if (!body) {
    chatError.value = 'Write a message first.';
    return false;
  }

  try {
    await api('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ body, recipientId: selectedChatUserId.value || null })
    });
    newChatMessage.value = '';
    await loadChatMessages();
    return true;
  } catch (err) {
    chatError.value = err.message;
    return false;
  }
}

export async function deleteChatMessage(message) {
  chatError.value = '';
  try {
    await api(`/chat/messages/${message.id}`, { method: 'DELETE' });
    await loadChatMessages();
  } catch (err) {
    chatError.value = err.message;
  }
}

async function loadOptionalCollection(path, collection) {
  try {
    collection.value = await api(path);
  } catch (err) {
    if (err.status === 404) {
      collection.value = [];
      return;
    }

    throw err;
  }
}

export async function loadNotes() {
  await loadOptionalCollection('/notes', notes);
}

export async function loadTasks() {
  await loadOptionalCollection('/tasks', tasks);
}

export async function loadTags() {
  await loadOptionalCollection('/tags', tags);
}

export async function loadBookmarks() {
  await loadOptionalCollection('/bookmarks', bookmarks);
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
    if (err.status === 403 || err.status === 404) {
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
  if (!newAnnouncement.value.title.trim() || !newAnnouncement.value.body.trim()) {
    announcementError.value = 'Title and message are required.';
    return false;
  }

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
  if (!newTag.value.name.trim()) {
    tagError.value = 'Tag name is required.';
    return false;
  }

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
  if (!newBookmark.value.title.trim() || !newBookmark.value.url.trim()) {
    bookmarkError.value = 'Title and URL are required.';
    return false;
  }

  try {
    await api('/bookmarks', { method: 'POST', body: JSON.stringify(bookmarkPayload(newBookmark.value)) });
    newBookmark.value = { title: '', url: '', notes: '', isShared: false, tagIds: [] };
    await Promise.all([loadBookmarks(), loadDashboard(), loadProfile()]);
    return true;
  } catch (err) {
    bookmarkError.value = err.message;
    return false;
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
  noteError.value = '';
  if (!newNote.value.title.trim()) {
    noteError.value = 'Title is required.';
    return false;
  }

  try {
    await api('/notes', { method: 'POST', body: JSON.stringify(newNote.value) });
    newNote.value = { title: '', body: '', isShared: false, tagIds: [] };
    await Promise.all([loadNotes(), loadDashboard(), loadProfile()]);
    return true;
  } catch (err) {
    noteError.value = err.message;
    return false;
  }
}

export async function updateNote(note, data) {
  noteError.value = '';

  try {
    await api(`/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await Promise.all([loadNotes(), loadDashboard(), loadProfile()]);
    return true;
  } catch (err) {
    noteError.value = err.message;
    return false;
  }
}

export async function toggleNoteShare(note) {
  await updateNote(note, { isShared: !note.isShared });
}

export async function deleteNote(note) {
  noteError.value = '';

  try {
    await api(`/notes/${note.id}`, { method: 'DELETE' });
    await Promise.all([loadNotes(), loadDashboard(), loadProfile()]);
  } catch (err) {
    noteError.value = err.message;
  }
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
  if (!newTask.value.title.trim()) {
    taskError.value = 'Title is required.';
    return false;
  }

  try {
    await api('/tasks', { method: 'POST', body: JSON.stringify(taskPayload(newTask.value)) });
    newTask.value = { title: '', details: '', priority: 'NORMAL', status: 'OPEN', dueAt: '', isShared: false, tagIds: [] };
    await Promise.all([loadTasks(), loadDashboard(), loadProfile()]);
    return true;
  } catch (err) {
    taskError.value = err.message;
    return false;
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
