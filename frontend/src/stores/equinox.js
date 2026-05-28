import { computed, ref } from 'vue';

export const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
export const token = ref(localStorage.getItem('equinox.token') || '');
export const user = ref(JSON.parse(localStorage.getItem('equinox.user') || 'null'));
export const authMode = ref('login');
export const authForm = ref({ username: '', password: '', displayName: '' });
export const dashboard = ref(null);
export const familyUsers = ref([]);
export const notes = ref([]);
export const reminders = ref([]);
export const files = ref([]);
export const folders = ref([]);
export const breadcrumb = ref([]);
export const currentFolder = ref(null);
export const newNote = ref({ title: '', body: '' });
export const newReminder = ref({ title: '', dueAt: '' });
export const newFamilyUser = ref({ displayName: '', username: '', password: '', role: 'FAMILY' });
export const newFolderName = ref('');
export const selectedFile = ref(null);
export const fileInputKey = ref(0);
export const uploadShared = ref(false);
export const error = ref('');
export const familyError = ref('');
export const storageError = ref('');

export const isAuthed = computed(() => Boolean(token.value));
export const isAdmin = computed(() => user.value?.role === 'ADMIN');
export const firstName = computed(() => user.value?.displayName?.split(' ')[0] || 'Family');

export const categories = [
  { label: 'Dashboard', value: 'Live hub', icon: 'LayoutDashboard', to: '/dashboard' },
  { label: 'Files', value: 'Private uploads', icon: 'FolderOpen', to: '/files' },
  { label: 'Notes', value: 'Quick memory', icon: 'NotebookText', to: '/notes' },
  { label: 'Reminders', value: 'Family tasks', icon: 'BellRing', to: '/reminders' },
  { label: 'Family', value: 'Accounts', icon: 'UsersRound', to: '/family', adminOnly: true },
  { label: 'Activity', value: 'Recent history', icon: 'SquareActivity', to: '/activity' }
];

export const metricCards = computed(() => [
  { label: 'Notes', value: dashboard.value?.totals.notes ?? notes.value.length, icon: 'NotebookText' },
  { label: 'Reminders', value: dashboard.value?.totals.reminders ?? reminders.value.length, icon: 'BellRing' },
  { label: 'Files', value: dashboard.value?.totals.files ?? files.value.length, icon: 'FolderOpen' },
  { label: 'Family', value: dashboard.value?.totals.users ?? familyUsers.value.length, icon: 'UsersRound' },
  { label: 'Storage', value: formatBytes(dashboard.value?.totals.storageBytes ?? 0), icon: 'HardDrive' }
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
    throw new Error(body.message || 'Request failed.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function fileExtension(fileName) {
  const extension = String(fileName || '').split('.').pop();
  return extension && extension !== fileName ? extension.slice(0, 4).toUpperCase() : 'FILE';
}

export async function authenticate() {
  error.value = '';
  const path = authMode.value === 'login' ? '/auth/login' : '/auth/register';

  try {
    const body = authMode.value === 'login'
      ? { username: authForm.value.username, password: authForm.value.password }
      : authForm.value;
    const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem('equinox.token', result.token);
    localStorage.setItem('equinox.user', JSON.stringify(result.user));
    await loadAll();
    return true;
  } catch (err) {
    error.value = err.message;
    return false;
  }
}

export function logout() {
  token.value = '';
  user.value = null;
  dashboard.value = null;
  localStorage.removeItem('equinox.token');
  localStorage.removeItem('equinox.user');
}

export async function loadAll() {
  if (!token.value) return;
  await Promise.all([loadDashboard(), loadNotes(), loadReminders(), loadStorage()]);
}

export async function loadDashboard() {
  dashboard.value = await api('/dashboard');
}

export async function loadNotes() {
  notes.value = await api('/notes');
}

export async function loadReminders() {
  reminders.value = await api('/reminders');
}

export async function loadFamilyUsers() {
  if (!isAdmin.value) return;
  familyUsers.value = await api('/users');
}

export async function createFamilyUser() {
  familyError.value = '';
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

  try {
    await api('/users', { method: 'POST', body: JSON.stringify(payload) });
    newFamilyUser.value = { displayName: '', username: '', password: '', role: 'FAMILY' };
    await Promise.all([loadFamilyUsers(), loadDashboard()]);
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function loadStorage() {
  const storage = await api(`/storage${currentFolder.value ? `?folderId=${currentFolder.value.id}` : ''}`);
  folders.value = storage.folders;
  files.value = storage.files;
  breadcrumb.value = storage.breadcrumb;
  currentFolder.value = storage.currentFolder;
}

export async function createNote() {
  if (!newNote.value.title) return;
  await api('/notes', { method: 'POST', body: JSON.stringify(newNote.value) });
  newNote.value = { title: '', body: '' };
  await Promise.all([loadNotes(), loadDashboard()]);
}

export async function createReminder() {
  if (!newReminder.value.title) return;
  await api('/reminders', { method: 'POST', body: JSON.stringify(newReminder.value) });
  newReminder.value = { title: '', dueAt: '' };
  await Promise.all([loadReminders(), loadDashboard()]);
}

export async function toggleReminder(reminder) {
  await api(`/reminders/${reminder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted: !reminder.isCompleted })
  });
  await Promise.all([loadReminders(), loadDashboard()]);
}

export async function uploadFile() {
  if (!selectedFile.value) return;
  const body = new FormData();
  body.append('file', selectedFile.value);
  body.append('isShared', String(uploadShared.value));
  if (currentFolder.value) {
    body.append('folderId', currentFolder.value.id);
  }
  await api('/files', { method: 'POST', body });
  selectedFile.value = null;
  fileInputKey.value += 1;
  uploadShared.value = false;
  await Promise.all([loadStorage(), loadDashboard()]);
}

export async function createFolder() {
  storageError.value = '';
  if (!newFolderName.value.trim()) return;

  try {
    await api('/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: newFolderName.value,
        parentId: currentFolder.value?.id || null
      })
    });
    newFolderName.value = '';
    await loadStorage();
  } catch (err) {
    storageError.value = err.message;
  }
}

export async function openFolder(folder) {
  currentFolder.value = folder;
  await loadStorage();
}

export async function openBreadcrumb(folder) {
  currentFolder.value = folder;
  await loadStorage();
}

export async function openRoot() {
  currentFolder.value = null;
  await loadStorage();
}

export async function toggleFileShare(file) {
  await api(`/files/${file.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isShared: !file.isShared })
  });
  await loadStorage();
}

export async function toggleFolderShare(folder) {
  await api(`/folders/${folder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isShared: !folder.isShared })
  });
  await loadStorage();
}

export async function deleteFile(file) {
  await api(`/files/${file.id}`, { method: 'DELETE' });
  await Promise.all([loadStorage(), loadDashboard()]);
}

export async function deleteFolder(folder) {
  await api(`/folders/${folder.id}`, { method: 'DELETE' });
  await Promise.all([loadStorage(), loadDashboard()]);
}

export async function downloadFile(file) {
  const response = await fetch(`${apiBase}/files/${file.id}/download`, {
    headers: { Authorization: `Bearer ${token.value}` }
  });

  if (!response.ok) {
    storageError.value = 'Download failed.';
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.originalName;
  link.click();
  URL.revokeObjectURL(url);
}
