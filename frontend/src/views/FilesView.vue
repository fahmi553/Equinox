<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  breadcrumb,
  clearStorageSearch,
  closeFilePreview,
  createFolder,
  currentFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  fileExtension,
  filePreview,
  filePreviewType,
  fileInputKey,
  files,
  folderOptions,
  folders,
  formatBytes,
  loadFolderOptions,
  loadStorage,
  loadTags,
  moveFile,
  newFolderName,
  openBreadcrumb,
  openFolder,
  openRoot,
  permissions,
  previewFile,
  renameFile,
  renameFolder,
  searchStorage,
  selectedFile,
  storageError,
  storageSearch,
  storageSummary,
  tags,
  toggleFileImportant,
  toggleFileShare,
  toggleFolderShare,
  updateFileTags,
  uploadFile,
  uploadShared
} from '../stores/equinox';

const pendingDelete = ref(null);
const editingFolder = ref(null);
const editingFile = ref(null);
const movingFile = ref(null);

const visibleSummary = computed(() => {
  const totalBytes = files.value.reduce((total, file) => total + file.size, 0);
  return {
    folders: folders.value.length,
    files: files.value.length,
    totalBytes
  };
});

const currentLocation = computed(() => {
  if (storageSearch.value.trim()) return 'Search results';
  if (!breadcrumb.value.length) return 'Root storage';
  return breadcrumb.value.map((item) => item.name).join(' / ');
});
const isSearching = computed(() => Boolean(storageSearch.value.trim()));
const canWriteHere = computed(() => !currentFolder.value || currentFolder.value.canEdit);
const canCreateFolderHere = computed(() => canWriteHere.value && permissions.value.canCreateFolders);
const canUploadHere = computed(() => canWriteHere.value && permissions.value.canUploadFiles);

function canPreview(file) {
  return Boolean(filePreviewType(file));
}

function shareLabel(item) {
  if (item.shareState === 'inherited') return 'Shared by folder';
  if (item.shareState === 'shared' || item.isShared) return 'Shared';
  return 'Private';
}

function tagNames(item) {
  return (item.tags || []).map((tag) => tag.name).join(', ');
}

async function toggleFileTag(file, tag) {
  const current = new Set((file.tags || []).map((item) => item.id));
  if (current.has(tag.id)) {
    current.delete(tag.id);
  } else {
    current.add(tag.id);
  }
  await updateFileTags(file, [...current]);
}

function askDelete(type, item) {
  pendingDelete.value = { type, item };
}

function cancelDelete() {
  pendingDelete.value = null;
}

function beginFolderRename(folder) {
  editingFolder.value = { id: folder.id, name: folder.name };
}

function beginFileRename(file) {
  editingFile.value = { id: file.id, name: file.originalName };
}

function beginFileMove(file) {
  movingFile.value = { id: file.id, folderId: file.folderId || '' };
}

async function submitFolderRename(folder) {
  await renameFolder(folder, editingFolder.value?.name);
  editingFolder.value = null;
}

async function submitFileRename(file) {
  await renameFile(file, editingFile.value?.name);
  editingFile.value = null;
}

async function submitFileMove(file) {
  await moveFile(file, movingFile.value?.folderId || null);
  movingFile.value = null;
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

onMounted(async () => {
  await Promise.all([loadStorage(), loadFolderOptions(), loadTags()]);
});

onUnmounted(closeFilePreview);
</script>

<template>
  <AppPage title="Files" eyebrow="Private cloud storage">
    <template #actions>
      <button class="secondary-button" @click="loadStorage">Refresh</button>
    </template>

    <section class="file-manager">
      <section class="storage-overview" aria-label="Storage overview">
        <article>
          <span>Total folders</span>
          <strong>{{ storageSummary?.folders ?? visibleSummary.folders }}</strong>
        </article>
        <article>
          <span>Total files</span>
          <strong>{{ storageSummary?.files ?? visibleSummary.files }}</strong>
        </article>
        <article>
          <span>Total storage</span>
          <strong>{{ formatBytes(storageSummary?.storageBytes ?? visibleSummary.totalBytes) }}</strong>
        </article>
        <article>
          <span>Shared files</span>
          <strong>{{ storageSummary?.sharedFiles ?? 0 }}</strong>
        </article>
        <article>
          <span>Private files</span>
          <strong>{{ storageSummary?.privateFiles ?? 0 }}</strong>
        </article>
        <article>
          <span>Important docs</span>
          <strong>{{ storageSummary?.importantFiles ?? 0 }}</strong>
        </article>
      </section>

      <section class="feature-panel storage-main">
        <div class="file-manager-header">
          <div class="panel-copy">
            <h3>{{ currentLocation }}</h3>
            <p>Organize folders, upload files, and share selected items with family.</p>
          </div>
          <nav class="breadcrumb-row">
            <button @click="openRoot">Root</button>
            <button v-for="crumb in breadcrumb" :key="crumb.id" @click="openBreadcrumb(crumb)">
              {{ crumb.name }}
            </button>
          </nav>
        </div>

        <p v-if="storageError" class="storage-error">{{ storageError }}</p>

        <div class="file-command-bar">
          <form class="storage-search" @submit.prevent="searchStorage">
            <input v-model="storageSearch" placeholder="Search files and folders" />
            <button class="secondary-button" type="submit">Search</button>
            <button class="secondary-button" type="button" :disabled="!storageSearch" @click="clearStorageSearch">
              Clear
            </button>
          </form>
          <form v-if="canCreateFolderHere" class="folder-create" @submit.prevent="createFolder">
            <input v-model="newFolderName" placeholder="New folder name" @keyup.enter="createFolder" />
            <button class="main-button" type="submit">Create folder</button>
          </form>
          <p v-else-if="canWriteHere" class="readonly-note">This account cannot create folders.</p>
          <p v-else class="readonly-note">Shared folders are read-only for family users.</p>
        </div>

        <section v-if="!isSearching && canUploadHere" class="upload-zone compact">
          <div>
            <h4>Upload to {{ currentLocation }}</h4>
            <p>Files stay inside the Equinox Docker storage volume.</p>
          </div>
          <label class="file-picker">
            <input :key="fileInputKey" type="file" @change="selectedFile = $event.target.files[0] || null" />
            <span class="file-picker-button">Select file</span>
            <span class="file-picker-status">{{ selectedFile ? selectedFile.name : 'No file selected' }}</span>
          </label>
          <label class="share-row">
            <input v-model="uploadShared" type="checkbox" />
            <span>Share with family</span>
          </label>
          <button class="main-button" :disabled="!selectedFile" @click="uploadFile">Upload file</button>
        </section>
        <section v-else-if="!isSearching && canWriteHere" class="upload-zone compact">
          <div>
            <h4>Upload to {{ currentLocation }}</h4>
            <p>This account cannot upload files.</p>
          </div>
        </section>

        <section class="storage-section file-section">
          <div class="storage-section-title">
            <h4>Folders</h4>
            <span>{{ folders.length }}</span>
          </div>
          <p v-if="!folders.length" class="empty-state">No folders in this location.</p>
          <div v-else class="folder-grid">
            <article v-for="folder in folders" :key="folder.id" class="folder-card">
              <button v-if="editingFolder?.id !== folder.id" class="folder-open" @click="openFolder(folder)">
                <span>Folder</span>
                <strong>{{ folder.name }}</strong>
                <small>{{ shareLabel(folder) }} / {{ folder.owner.displayName }}</small>
              </button>
              <form v-else-if="folder.canEdit" class="inline-editor" @submit.prevent="submitFolderRename(folder)">
                <input v-model="editingFolder.name" placeholder="Folder name" />
                <button class="main-button" type="submit">Save</button>
                <button class="secondary-button" type="button" @click="editingFolder = null">Cancel</button>
              </form>
              <div v-if="folder.canEdit" class="item-actions">
                <button @click="beginFolderRename(folder)">Rename</button>
                <button @click="toggleFolderShare(folder)">{{ folder.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="askDelete('folder', folder)">Delete</button>
              </div>
              <p v-else class="readonly-note">Read-only shared folder</p>
            </article>
          </div>
        </section>

        <section class="storage-section file-section">
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
              <template v-if="editingFile?.id !== file.id">
                <h4>{{ file.originalName }}</h4>
                <p>
                  {{ formatBytes(file.size) }} / {{ shareLabel(file) }} / {{ file.owner.displayName }}
                  <span v-if="file.folderPath"> / {{ file.folderPath }}</span>
                </p>
                <p v-if="file.tags?.length" class="tag-line">{{ tagNames(file) }}</p>
              </template>

              <form v-else-if="file.canEdit" class="inline-editor" @submit.prevent="submitFileRename(file)">
                <input v-model="editingFile.name" placeholder="File name" />
                <button class="main-button" type="submit">Save</button>
                <button class="secondary-button" type="button" @click="editingFile = null">Cancel</button>
              </form>

              <form v-if="file.canEdit && movingFile?.id === file.id" class="move-editor" @submit.prevent="submitFileMove(file)">
                <select v-model="movingFile.folderId">
                  <option value="">Root</option>
                  <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">
                    {{ folder.path }}
                  </option>
                </select>
                <button class="main-button" type="submit">Move</button>
                <button class="secondary-button" type="button" @click="movingFile = null">Cancel</button>
              </form>

              <div v-else class="item-actions">
                <button v-if="canPreview(file)" @click="previewFile(file)">Preview</button>
                <button @click="downloadFile(file)">Download</button>
                <button v-if="file.canEdit" @click="beginFileRename(file)">Rename</button>
                <button v-if="file.canEdit" @click="beginFileMove(file)">Move</button>
                <button v-if="file.canEdit" @click="toggleFileImportant(file)">{{ file.isImportant ? 'Unmark important' : 'Mark important' }}</button>
                <button v-if="file.canEdit" @click="toggleFileShare(file)">{{ file.isShared ? 'Make private' : 'Share' }}</button>
                <button v-if="file.canEdit" @click="askDelete('file', file)">Delete</button>
              </div>
              <div v-if="file.canEdit && tags.length && movingFile?.id !== file.id" class="tag-filter-row file-tags">
                <button
                  v-for="tag in tags"
                  :key="tag.id"
                  :class="{ active: (file.tags || []).some((item) => item.id === tag.id) }"
                  @click="toggleFileTag(file, tag)"
                >
                  {{ tag.name }}
                </button>
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

    <div v-if="filePreview" class="modal-backdrop">
      <section class="file-preview-dialog">
        <header>
          <div class="preview-heading">
            <div class="file-badge preview-badge" aria-hidden="true">
              <strong>{{ fileExtension(filePreview.file.originalName) }}</strong>
            </div>
            <div>
              <p class="overline">Preview</p>
              <h3>{{ filePreview.file.originalName }}</h3>
              <p>
                {{ formatBytes(filePreview.file.size) }} / {{ shareLabel(filePreview.file) }} / {{ filePreview.file.owner.displayName }}
              </p>
            </div>
          </div>
          <button class="secondary-button" @click="closeFilePreview">Close</button>
        </header>

        <div class="file-preview-stage" :class="`is-${filePreview.type}`">
          <div class="file-preview-toolbar">
            <span>{{ filePreview.type.toUpperCase() }}</span>
            <strong>{{ filePreview.loading ? 'Loading' : 'Ready' }}</strong>
          </div>
          <div class="file-preview-body">
            <p v-if="filePreview.loading" class="preview-loading">Loading preview...</p>
            <img v-else-if="filePreview.type === 'image'" :src="filePreview.url" :alt="filePreview.file.originalName" />
            <iframe v-else-if="filePreview.type === 'pdf'" :src="filePreview.url" :title="filePreview.file.originalName"></iframe>
            <pre v-else>{{ filePreview.text }}</pre>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="secondary-button" @click="downloadFile(filePreview.file)">Download</button>
          <button class="main-button" @click="closeFilePreview">Done</button>
        </div>
      </section>
    </div>
  </AppPage>
</template>
