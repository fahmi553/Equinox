import { computed, ref } from 'vue';

export const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
export const token = ref(localStorage.getItem('equinox.token') || '');
export const user = ref(JSON.parse(localStorage.getItem('equinox.user') || 'null'));
export const authMode = ref('login');
export const authForm = ref({ username: '', password: '', displayName: '' });
export const dashboard = ref(null);
export const familyUsers = ref([]);
export const rolePermissions = ref([]);
export const announcements = ref([]);
export const profile = ref(null);
export const notes = ref([]);
export const reminders = ref([]);
export const tasks = ref([]);
export const tags = ref([]);
export const bookmarks = ref([]);
export const importantDocuments = ref([]);
export const documentRecords = ref([]);
export const files = ref([]);
export const folders = ref([]);
export const folderOptions = ref([]);
export const breadcrumb = ref([]);
export const currentFolder = ref(null);
export const storageSummary = ref(null);
export const storageSearch = ref('');
export const globalSearchQuery = ref('');
export const globalSearchResults = ref(null);
export const newNote = ref({ title: '', body: '', isShared: false, tagIds: [] });
export const newReminder = ref({ title: '', dueAt: '', isShared: false });
export const newTask = ref({ title: '', details: '', priority: 'NORMAL', status: 'OPEN', dueAt: '', isShared: false, tagIds: [] });
export const newTag = ref({ name: '', color: '#7c3aed', isShared: false });
export const newBookmark = ref({ title: '', url: '', notes: '', isShared: false, tagIds: [] });
export const newDocumentRecord = ref({
  title: '',
  category: 'BILL',
  status: 'OPEN',
  amount: '',
  dueAt: '',
  notes: '',
  fileId: ''
});
export const newAnnouncement = ref({ title: '', body: '', isPinned: false, expiresAt: '' });
export const defaultPermissions = {
  canUploadFiles: true,
  canCreateFolders: true,
  canCreateNotes: true,
  canCreateReminders: true,
  canCreateTasks: true,
  canCreateTags: true,
  canCreateBookmarks: true,
  canCreateDocumentRecords: true,
  canViewAnnouncements: true
};
export const newFamilyUser = ref({
  displayName: '',
  username: '',
  password: '',
  role: 'FAMILY'
});
export const newFolderName = ref('');
export const selectedFile = ref(null);
export const fileInputKey = ref(0);
export const uploadShared = ref(false);
export const filePreview = ref(null);
export const error = ref('');
export const familyError = ref('');
export const storageError = ref('');
export const reminderError = ref('');
export const taskError = ref('');
export const tagError = ref('');
export const bookmarkError = ref('');
export const globalSearchError = ref('');
export const documentRecordError = ref('');
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
  { label: 'Files', value: 'Private uploads', icon: 'FolderOpen', to: '/files' },
  { label: 'Documents', value: 'Important docs', icon: 'FileText', to: '/documents' },
  { label: 'Notes', value: 'Quick memory', icon: 'NotebookText', to: '/notes' },
  { label: 'Reminders', value: 'Family tasks', icon: 'BellRing', to: '/reminders' },
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
  { label: 'Reminders', value: dashboard.value?.totals.reminders ?? reminders.value.length, icon: 'BellRing' },
  { label: 'Tasks', value: dashboard.value?.totals.tasks ?? tasks.value.length, icon: 'ListChecks' },
  { label: 'Bookmarks', value: dashboard.value?.totals.bookmarks ?? bookmarks.value.length, icon: 'Bookmark' },
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
    const err = new Error(body.message || 'Request failed.');
    err.status = response.status;
    throw err;
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

export function filePreviewType(file) {
  const mimeType = file?.mimeType || '';
  const extension = String(file?.originalName || '').split('.').pop()?.toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  if (['csv', 'json', 'md', 'log', 'txt'].includes(extension)) return 'text';

  return null;
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
  await Promise.all([loadDashboard(), loadAnnouncements(), loadTags(), loadNotes(), loadReminders(), loadTasks(), loadBookmarks(), loadStorage(), loadDocuments(), loadDocumentRecords()]);
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

export async function loadReminders() {
  reminders.value = await api('/reminders');
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
    localStorage.setItem('equinox.user', JSON.stringify(profile.value.user));
  }
}

export async function loadDocuments() {
  importantDocuments.value = await api('/documents');
}

export async function loadDocumentRecords() {
  documentRecords.value = await api('/document-records');
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
    newFamilyUser.value = {
      displayName: '',
      username: '',
      password: '',
      role: 'FAMILY'
    };
    await Promise.all([loadFamilyUsers(), loadDashboard()]);
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function updateRolePermissions(role, nextPermissions) {
  familyError.value = '';

  try {
    await api(`/roles/${role}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(nextPermissions)
    });
    await Promise.all([loadRolePermissions(), loadFamilyUsers(), loadDashboard()]);
    return true;
  } catch (err) {
    familyError.value = err.message;
    return false;
  }
}

export async function updateUserPermissions(member, nextPermissions) {
  familyError.value = '';

  try {
    await api(`/users/${member.id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(nextPermissions)
    });
    await Promise.all([loadFamilyUsers(), loadDashboard()]);
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
    await Promise.all([loadTags(), loadNotes(), loadTasks(), loadStorage(), loadDocuments()]);
  } catch (err) {
    tagError.value = err.message;
  }
}

export async function deleteTag(tag) {
  tagError.value = '';

  try {
    await api(`/tags/${tag.id}`, { method: 'DELETE' });
    await Promise.all([loadTags(), loadNotes(), loadTasks(), loadStorage(), loadDocuments()]);
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

export async function loadStorage() {
  const params = new URLSearchParams();
  if (currentFolder.value && !storageSearch.value.trim()) {
    params.set('folderId', currentFolder.value.id);
  }
  if (storageSearch.value.trim()) {
    params.set('q', storageSearch.value.trim());
  }

  const storage = await api(`/storage${params.toString() ? `?${params}` : ''}`);
  folders.value = storage.folders;
  files.value = storage.files;
  breadcrumb.value = storage.breadcrumb;
  currentFolder.value = storage.currentFolder;
  storageSummary.value = storage.summary;
}

export async function loadFolderOptions() {
  folderOptions.value = await api('/folders');
}

export async function searchStorage() {
  await loadStorage();
}

export async function clearStorageSearch() {
  storageSearch.value = '';
  await loadStorage();
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

export async function createReminder() {
  reminderError.value = '';
  if (!newReminder.value.title.trim()) return;

  try {
    await api('/reminders', { method: 'POST', body: JSON.stringify(newReminder.value) });
    newReminder.value = { title: '', dueAt: '', isShared: false };
    await Promise.all([loadReminders(), loadDashboard(), loadProfile()]);
  } catch (err) {
    reminderError.value = err.message;
  }
}

export async function updateReminder(reminder, data) {
  reminderError.value = '';

  try {
    await api(`/reminders/${reminder.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await Promise.all([loadReminders(), loadDashboard(), loadProfile()]);
  } catch (err) {
    reminderError.value = err.message;
  }
}

export async function toggleReminder(reminder) {
  await updateReminder(reminder, { isCompleted: !reminder.isCompleted });
}

export async function toggleReminderShare(reminder) {
  await updateReminder(reminder, { isShared: !reminder.isShared });
}

export async function deleteReminder(reminder) {
  reminderError.value = '';

  try {
    await api(`/reminders/${reminder.id}`, { method: 'DELETE' });
    await Promise.all([loadReminders(), loadDashboard(), loadProfile()]);
  } catch (err) {
    reminderError.value = err.message;
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
  if (!newTask.value.title.trim()) return;

  try {
    await api('/tasks', { method: 'POST', body: JSON.stringify(taskPayload(newTask.value)) });
    newTask.value = { title: '', details: '', priority: 'NORMAL', status: 'OPEN', dueAt: '', isShared: false, tagIds: [] };
    await Promise.all([loadTasks(), loadDashboard(), loadProfile()]);
  } catch (err) {
    taskError.value = err.message;
  }
}

export async function updateFileTags(file, tagIds) {
  storageError.value = '';

  try {
    await api(`/files/${file.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ tagIds })
    });
    await Promise.all([loadStorage(), loadDocuments()]);
  } catch (err) {
    storageError.value = err.message;
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

function documentRecordPayload(source) {
  return {
    title: source.title,
    category: source.category,
    status: source.status,
    amount: source.amount === '' ? null : source.amount,
    dueAt: source.dueAt || null,
    notes: source.notes || '',
    fileId: source.fileId || null
  };
}

export async function createDocumentRecord() {
  documentRecordError.value = '';
  if (!newDocumentRecord.value.title.trim()) return;

  try {
    await api('/document-records', {
      method: 'POST',
      body: JSON.stringify(documentRecordPayload(newDocumentRecord.value))
    });
    newDocumentRecord.value = {
      title: '',
      category: 'BILL',
      status: 'OPEN',
      amount: '',
      dueAt: '',
      notes: '',
      fileId: ''
    };
    await Promise.all([loadDocumentRecords(), loadDashboard()]);
  } catch (err) {
    documentRecordError.value = err.message;
  }
}

export async function updateDocumentRecord(record, data) {
  documentRecordError.value = '';

  try {
    await api(`/document-records/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await Promise.all([loadDocumentRecords(), loadDashboard()]);
  } catch (err) {
    documentRecordError.value = err.message;
  }
}

export async function saveDocumentRecord(record, source) {
  await updateDocumentRecord(record, documentRecordPayload(source));
}

export async function toggleDocumentRecordDone(record) {
  await updateDocumentRecord(record, { status: record.status === 'DONE' ? 'OPEN' : 'DONE' });
}

export async function deleteDocumentRecord(record) {
  documentRecordError.value = '';

  try {
    await api(`/document-records/${record.id}`, { method: 'DELETE' });
    await Promise.all([loadDocumentRecords(), loadDashboard()]);
  } catch (err) {
    documentRecordError.value = err.message;
  }
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
    await Promise.all([loadStorage(), loadFolderOptions(), loadDashboard()]);
  } catch (err) {
    storageError.value = err.message;
  }
}

export async function openFolder(folder) {
  storageSearch.value = '';
  currentFolder.value = folder;
  await loadStorage();
}

export async function openBreadcrumb(folder) {
  storageSearch.value = '';
  currentFolder.value = folder;
  await loadStorage();
}

export async function openRoot() {
  storageSearch.value = '';
  currentFolder.value = null;
  await loadStorage();
}

export async function renameFolder(folder, name) {
  storageError.value = '';
  const cleanName = String(name || '').trim();
  if (!cleanName || cleanName === folder.name) return;

  try {
    await api(`/folders/${folder.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: cleanName })
    });
    await Promise.all([loadStorage(), loadFolderOptions()]);
  } catch (err) {
    storageError.value = err.message;
  }
}

export async function renameFile(file, originalName) {
  storageError.value = '';
  const cleanName = String(originalName || '').trim();
  if (!cleanName || cleanName === file.originalName) return;

  try {
    await api(`/files/${file.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ originalName: cleanName })
    });
    await loadStorage();
  } catch (err) {
    storageError.value = err.message;
  }
}

export async function moveFile(file, folderId) {
  storageError.value = '';

  try {
    await api(`/files/${file.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId: folderId || null })
    });
    await Promise.all([loadStorage(), loadDashboard()]);
  } catch (err) {
    storageError.value = err.message;
  }
}

export async function toggleFileShare(file) {
  await api(`/files/${file.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isShared: !file.isShared })
  });
  await Promise.all([loadStorage(), loadDocuments(), loadDashboard()]);
}

export async function toggleFileImportant(file) {
  await api(`/files/${file.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isImportant: !file.isImportant })
  });
  await Promise.all([loadStorage(), loadDocuments(), loadDashboard()]);
}

export async function toggleFolderShare(folder) {
  await api(`/folders/${folder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isShared: !folder.isShared })
  });
  await Promise.all([loadStorage(), loadFolderOptions(), loadDashboard()]);
}

export async function deleteFile(file) {
  await api(`/files/${file.id}`, { method: 'DELETE' });
  await Promise.all([loadStorage(), loadDocuments(), loadDashboard()]);
}

export async function deleteFolder(folder) {
  await api(`/folders/${folder.id}`, { method: 'DELETE' });
  await Promise.all([loadStorage(), loadFolderOptions(), loadDashboard()]);
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

export function closeFilePreview() {
  if (filePreview.value?.url) {
    URL.revokeObjectURL(filePreview.value.url);
  }
  filePreview.value = null;
}

export async function previewFile(file) {
  storageError.value = '';
  closeFilePreview();

  const type = filePreviewType(file);
  if (!type) {
    storageError.value = 'Preview is not available for this file type.';
    return;
  }

  filePreview.value = { file, type, loading: true, url: '', text: '' };

  try {
    const response = await fetch(`${apiBase}/files/${file.id}/preview`, {
      headers: { Authorization: `Bearer ${token.value}` }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Preview failed.');
    }

    if (type === 'text') {
      const text = await response.text();
      filePreview.value = { file, type, loading: false, url: '', text };
      return;
    }

    const blob = await response.blob();
    filePreview.value = {
      file,
      type,
      loading: false,
      url: URL.createObjectURL(blob),
      text: ''
    };
  } catch (err) {
    closeFilePreview();
    storageError.value = err.message;
  }
}
