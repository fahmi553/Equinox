<script setup>
import { computed, onMounted, ref } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
const token = ref(localStorage.getItem('equinox.token') || '');
const user = ref(JSON.parse(localStorage.getItem('equinox.user') || 'null'));
const authMode = ref('login');
const authForm = ref({ username: '', password: '', displayName: '' });
const dashboard = ref(null);
const notes = ref([]);
const reminders = ref([]);
const files = ref([]);
const folders = ref([]);
const breadcrumb = ref([]);
const currentFolder = ref(null);
const newNote = ref({ title: '', body: '' });
const newReminder = ref({ title: '', dueAt: '' });
const newFolderName = ref('');
const selectedFile = ref(null);
const fileInputKey = ref(0);
const uploadShared = ref(false);
const error = ref('');
const storageError = ref('');

const categories = [
  { label: 'Dashboard', value: 'Live hub', icon: '/template-assets/images/search-icon-01.png' },
  { label: 'Notes', value: 'Quick memory', icon: '/template-assets/images/search-icon-02.png' },
  { label: 'Reminders', value: 'Family tasks', icon: '/template-assets/images/search-icon-03.png' },
  { label: 'Files', value: 'Private uploads', icon: '/template-assets/images/search-icon-04.png' },
  { label: 'Activity', value: 'Recent history', icon: '/template-assets/images/search-icon-05.png' }
];

const metricCards = computed(() => [
  { label: 'Notes', value: dashboard.value?.totals.notes ?? notes.value.length, icon: categories[1].icon },
  { label: 'Reminders', value: dashboard.value?.totals.reminders ?? reminders.value.length, icon: categories[2].icon },
  { label: 'Files', value: dashboard.value?.totals.files ?? files.value.length, icon: categories[3].icon },
  { label: 'Storage', value: formatBytes(dashboard.value?.totals.storageBytes ?? 0), icon: categories[0].icon }
]);

const isAuthed = computed(() => Boolean(token.value));
const firstName = computed(() => user.value?.displayName?.split(' ')[0] || 'Family');

async function api(path, options = {}) {
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

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function fileExtension(fileName) {
  const extension = String(fileName || '').split('.').pop();
  return extension && extension !== fileName ? extension.slice(0, 4).toUpperCase() : 'FILE';
}

async function authenticate() {
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
  } catch (err) {
    error.value = err.message;
  }
}

function logout() {
  token.value = '';
  user.value = null;
  dashboard.value = null;
  localStorage.removeItem('equinox.token');
  localStorage.removeItem('equinox.user');
}

async function loadAll() {
  if (!token.value) return;
  const storage = await api(`/storage${currentFolder.value ? `?folderId=${currentFolder.value.id}` : ''}`);
  [dashboard.value, notes.value, reminders.value] = await Promise.all([
    api('/dashboard'),
    api('/notes'),
    api('/reminders')
  ]);
  folders.value = storage.folders;
  files.value = storage.files;
  breadcrumb.value = storage.breadcrumb;
  currentFolder.value = storage.currentFolder;
}

async function createNote() {
  if (!newNote.value.title) return;
  await api('/notes', { method: 'POST', body: JSON.stringify(newNote.value) });
  newNote.value = { title: '', body: '' };
  await loadAll();
}

async function createReminder() {
  if (!newReminder.value.title) return;
  await api('/reminders', { method: 'POST', body: JSON.stringify(newReminder.value) });
  newReminder.value = { title: '', dueAt: '' };
  await loadAll();
}

async function toggleReminder(reminder) {
  await api(`/reminders/${reminder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted: !reminder.isCompleted })
  });
  await loadAll();
}

async function uploadFile() {
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
  await loadAll();
}

async function createFolder() {
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
    await loadAll();
  } catch (err) {
    storageError.value = err.message;
  }
}

async function openFolder(folder) {
  currentFolder.value = folder;
  await loadAll();
}

async function openBreadcrumb(folder) {
  currentFolder.value = folder;
  await loadAll();
}

async function openRoot() {
  currentFolder.value = null;
  await loadAll();
}

async function toggleFileShare(file) {
  await api(`/files/${file.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isShared: !file.isShared })
  });
  await loadAll();
}

async function toggleFolderShare(folder) {
  await api(`/folders/${folder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isShared: !folder.isShared })
  });
  await loadAll();
}

async function deleteFile(file) {
  await api(`/files/${file.id}`, { method: 'DELETE' });
  await loadAll();
}

async function deleteFolder(folder) {
  await api(`/folders/${folder.id}`, { method: 'DELETE' });
  await loadAll();
}

async function downloadFile(file) {
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

onMounted(loadAll);
</script>

<template>
  <main>
    <header class="site-header">
      <a class="brand" href="#">
        <span class="brand-mark">EQ</span>
        <span>Equinox</span>
      </a>
      <nav>
        <a class="active" href="#">Home</a>
        <a href="#notes">Notes</a>
        <a href="#files">Files</a>
        <a href="#activity">Activity</a>
      </nav>
      <button v-if="isAuthed" class="header-button" @click="logout">Logout</button>
      <a v-else class="header-button" href="#access">Private Access</a>
    </header>

    <section class="main-banner">
      <div class="banner-content">
        <p class="overline">{{ isAuthed ? `Welcome back, ${firstName}` : 'Private Home Server' }}</p>
        <h1>{{ isAuthed ? 'Manage your family hub' : 'Equinox family command center' }}</h1>
        <p class="hero-copy">
          Notes, reminders, uploads, users, and logs in a NAS-ready Docker stack.
        </p>

        <form v-if="!isAuthed" id="access" class="search-panel auth-form" @submit.prevent="authenticate">
          <div class="mode-switch">
            <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">
              Login
            </button>
            <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">
              Register
            </button>
          </div>
          <input v-if="authMode === 'register'" v-model="authForm.displayName" placeholder="Display name" />
          <input v-model="authForm.username" placeholder="Username" autocomplete="username" />
          <input v-model="authForm.password" placeholder="Password" type="password" autocomplete="current-password" />
          <button class="main-button" type="submit">{{ authMode === 'login' ? 'Login' : 'Create account' }}</button>
          <p v-if="error" class="error">{{ error }}</p>
        </form>

        <div v-else class="search-panel status-panel">
          <label>
            <span>Signed in</span>
            <strong>{{ user.displayName }}</strong>
          </label>
          <label>
            <span>Role</span>
            <strong>{{ user.role }}</strong>
          </label>
          <label>
            <span>API</span>
            <strong>Docker proxy online</strong>
          </label>
          <label>
            <span>Location</span>
            <strong>{{ currentFolder?.name || 'Root storage' }}</strong>
          </label>
          <button class="main-button" @click="loadAll">Refresh</button>
        </div>

        <ul class="categories">
          <li v-for="category in categories" :key="category.label">
            <a href="#">
              <span class="icon"><img :src="category.icon" :alt="category.label" /></span>
              <span>{{ category.label }}</span>
              <small>{{ category.value }}</small>
            </a>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="isAuthed" class="popular-categories">
      <div class="section-heading">
        <h2>Family Workspace</h2>
        <h6>Dockerized Equinox</h6>
      </div>

      <div class="metrics">
        <article v-for="metric in metricCards" :key="metric.label">
          <span class="icon"><img :src="metric.icon" :alt="metric.label" /></span>
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </div>

      <div class="feature-grid">
        <section id="notes" class="feature-panel">
          <div class="panel-copy">
            <h3>Notes</h3>
            <p>Capture quick private notes for your household.</p>
          </div>
          <div class="form-stack">
            <input v-model="newNote.title" placeholder="Title" />
            <textarea v-model="newNote.body" placeholder="Write a note"></textarea>
            <button class="main-button" @click="createNote">Add note</button>
          </div>
          <article v-for="note in notes" :key="note.id" class="listing-row">
            <img :src="'/template-assets/images/listing-01.jpg'" alt="" />
            <div>
              <h4>{{ note.title }}</h4>
              <p>{{ note.body || 'No details yet.' }}</p>
            </div>
          </article>
        </section>

        <section class="feature-panel">
          <div class="panel-copy">
            <h3>Reminders</h3>
            <p>Track what still needs attention.</p>
          </div>
          <div class="form-stack">
            <input v-model="newReminder.title" placeholder="Reminder" />
            <input v-model="newReminder.dueAt" type="datetime-local" />
            <button class="main-button" @click="createReminder">Add reminder</button>
          </div>
          <label v-for="reminder in reminders" :key="reminder.id" class="check-row">
            <input :checked="reminder.isCompleted" type="checkbox" @change="toggleReminder(reminder)" />
            <span>{{ reminder.title }}</span>
          </label>
        </section>

        <section id="files" class="feature-panel">
          <div class="panel-copy">
            <h3>Files</h3>
            <p>Browse folders, share files with family, and store everything in Docker volumes.</p>
          </div>
          <nav class="breadcrumb-row">
            <button @click="openRoot">Root</button>
            <button v-for="crumb in breadcrumb" :key="crumb.id" @click="openBreadcrumb(crumb)">
              {{ crumb.name }}
            </button>
          </nav>
          <div class="folder-create">
            <input v-model="newFolderName" placeholder="New folder name" />
            <button class="main-button" @click="createFolder">Create folder</button>
          </div>
          <p v-if="storageError" class="storage-error">{{ storageError }}</p>
          <div class="folder-grid">
            <article v-for="folder in folders" :key="folder.id" class="folder-card">
              <button class="folder-open" @click="openFolder(folder)">
                <span>Folder</span>
                <strong>{{ folder.name }}</strong>
                <small>{{ folder.isShared ? 'Shared' : 'Private' }} / {{ folder.owner.displayName }}</small>
              </button>
              <div class="item-actions">
                <button @click="toggleFolderShare(folder)">{{ folder.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="deleteFolder(folder)">Delete</button>
              </div>
            </article>
          </div>
          <div class="form-stack">
            <label class="file-picker">
              <input :key="fileInputKey" type="file" @change="selectedFile = $event.target.files[0] || null" />
              <span class="file-picker-button">Select file</span>
              <span class="file-picker-status">{{ selectedFile ? '1 file selected' : 'No file selected' }}</span>
            </label>
            <label class="share-row">
              <input v-model="uploadShared" type="checkbox" />
              <span>Share with family</span>
            </label>
            <button class="main-button" @click="uploadFile">Upload file</button>
          </div>
          <article v-for="file in files" :key="file.id" class="file-row">
            <div class="file-badge" aria-hidden="true">
              <span>EQ</span>
              <strong>{{ fileExtension(file.originalName) }}</strong>
            </div>
            <div class="file-details">
              <h4>{{ file.originalName }}</h4>
              <p>{{ formatBytes(file.size) }} / {{ file.isShared ? 'Shared' : 'Private' }} / {{ file.owner.displayName }}</p>
              <div class="item-actions">
                <button @click="downloadFile(file)">Download</button>
                <button @click="toggleFileShare(file)">{{ file.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="deleteFile(file)">Delete</button>
              </div>
            </div>
          </article>
        </section>

        <section id="activity" class="feature-panel">
          <div class="panel-copy">
            <h3>Activity</h3>
            <p>Recent account and content events.</p>
          </div>
          <article v-for="activity in dashboard?.activity || []" :key="activity.id" class="activity-row">
            <strong>{{ activity.action }}</strong>
            <span>{{ new Date(activity.createdAt).toLocaleString() }}</span>
          </article>
        </section>
      </div>
    </section>

    <footer>
      <strong>Equinox</strong>
      <span>Private family hub, ready for Docker and NAS deployment.</span>
    </footer>
  </main>
</template>
