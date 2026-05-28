<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  breadcrumb,
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  fileExtension,
  fileInputKey,
  files,
  folders,
  formatBytes,
  loadStorage,
  newFolderName,
  openBreadcrumb,
  openFolder,
  openRoot,
  selectedFile,
  storageError,
  toggleFileShare,
  toggleFolderShare,
  uploadFile,
  uploadShared
} from '../stores/equinox';

const pendingDelete = ref(null);

const storageSummary = computed(() => {
  const totalBytes = files.value.reduce((total, file) => total + file.size, 0);
  return {
    folders: folders.value.length,
    files: files.value.length,
    totalBytes
  };
});

const currentLocation = computed(() => {
  if (!breadcrumb.value.length) return 'Root storage';
  return breadcrumb.value.map((item) => item.name).join(' / ');
});

function askDelete(type, item) {
  pendingDelete.value = { type, item };
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;

  const { type, item } = pendingDelete.value;
  pendingDelete.value = null;

  if (type === 'folder') {
    await deleteFolder(item);
    return;
  }

  await deleteFile(item);
}

onMounted(loadStorage);
</script>

<template>
  <AppPage title="Files" eyebrow="Private cloud storage">
    <template #actions>
      <button class="secondary-button" @click="loadStorage">Refresh</button>
    </template>

    <section class="storage-workspace">
      <aside class="storage-sidebar">
        <div class="panel-copy">
          <h3>Storage</h3>
          <p>{{ currentLocation }}</p>
        </div>

        <div class="storage-stat">
          <span>Folders</span>
          <strong>{{ storageSummary.folders }}</strong>
        </div>
        <div class="storage-stat">
          <span>Files</span>
          <strong>{{ storageSummary.files }}</strong>
        </div>
        <div class="storage-stat">
          <span>Visible size</span>
          <strong>{{ formatBytes(storageSummary.totalBytes) }}</strong>
        </div>

        <nav class="breadcrumb-row vertical">
          <button @click="openRoot">Root</button>
          <button v-for="crumb in breadcrumb" :key="crumb.id" @click="openBreadcrumb(crumb)">
            {{ crumb.name }}
          </button>
        </nav>
      </aside>

      <section class="feature-panel storage-main">
        <div class="storage-toolbar">
          <div class="panel-copy">
            <h3>File Manager</h3>
            <p>Organize folders, upload files, and share selected items with family.</p>
          </div>
          <div class="folder-create">
            <input v-model="newFolderName" placeholder="New folder name" @keyup.enter="createFolder" />
            <button class="main-button" @click="createFolder">Create folder</button>
          </div>
        </div>

        <p v-if="storageError" class="storage-error">{{ storageError }}</p>

        <section class="upload-zone">
          <div>
            <h4>Upload to {{ currentLocation }}</h4>
            <p>Files stay in your Docker storage volume. Share only when family access is needed.</p>
          </div>
          <label class="file-picker">
            <input :key="fileInputKey" type="file" @change="selectedFile = $event.target.files[0] || null" />
            <span class="file-picker-button">Select file</span>
            <span class="file-picker-status">{{ selectedFile ? '1 file selected' : 'No file selected' }}</span>
          </label>
          <label class="share-row">
            <input v-model="uploadShared" type="checkbox" />
            <span>Share with family</span>
          </label>
          <button class="main-button" :disabled="!selectedFile" @click="uploadFile">Upload file</button>
        </section>

        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Folders</h4>
            <span>{{ folders.length }}</span>
          </div>
          <p v-if="!folders.length" class="empty-state">No folders in this location.</p>
          <div v-else class="folder-grid">
            <article v-for="folder in folders" :key="folder.id" class="folder-card">
              <button class="folder-open" @click="openFolder(folder)">
                <span>Folder</span>
                <strong>{{ folder.name }}</strong>
                <small>{{ folder.isShared ? 'Shared' : 'Private' }} / {{ folder.owner.displayName }}</small>
              </button>
              <div class="item-actions">
                <button @click="toggleFolderShare(folder)">{{ folder.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="askDelete('folder', folder)">Delete</button>
              </div>
            </article>
          </div>
        </section>

        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Files</h4>
            <span>{{ files.length }}</span>
          </div>
          <p v-if="!files.length" class="empty-state">No files in this location.</p>
          <article v-for="file in files" :key="file.id" class="file-row">
            <div class="file-badge" aria-hidden="true">
              <strong>{{ fileExtension(file.originalName) }}</strong>
            </div>
            <div class="file-details">
              <h4>{{ file.originalName }}</h4>
              <p>{{ formatBytes(file.size) }} / {{ file.isShared ? 'Shared' : 'Private' }} / {{ file.owner.displayName }}</p>
              <div class="item-actions">
                <button @click="downloadFile(file)">Download</button>
                <button @click="toggleFileShare(file)">{{ file.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="askDelete('file', file)">Delete</button>
              </div>
            </div>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      :title="pendingDelete?.type === 'folder' ? 'Delete folder?' : 'Delete file?'"
      :message="pendingDelete?.type === 'folder'
        ? `This will delete '${pendingDelete?.item?.name}' and any files inside it.`
        : `This will permanently delete '${pendingDelete?.item?.originalName}'.`"
      confirm-label="Delete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
