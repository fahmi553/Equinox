<script setup>
import { computed, onMounted, ref } from 'vue';
import { CheckCircle2, Download, File, Folder, HardDrive, RefreshCw, Search, Star, Tags, Trash2, Upload } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import TagChips from '../components/TagChips.vue';
import {
  apiBase,
  adapterContracts,
  createLocalFilePublicLink,
  createLocalFolder,
  deleteLocalItem,
  fileShareUsers,
  filePortalError,
  fileUploadLoading,
  fileUploadStatus,
  latestPublicFileLink,
  loadFileShareUsers,
  loadLocalFiles,
  loadSharedFiles,
  localFiles,
  localFilesLoading,
  loadSettings,
  loadTags,
  revokeLocalFilePublicLink,
  sharedFiles,
  sharedFilesLoading,
  tags,
  token,
  updateLocalFileMetadata,
  updateLocalFileUserShares,
  uploadLocalFile
} from '../stores/equinox';

const activeAdapterKey = ref('local-storage');
const activePortalView = ref('browser');
const currentPath = ref('');
const searchQuery = ref('');
const folderName = ref('');
const selectedFile = ref(null);
const pendingDelete = ref(null);
const uploadInput = ref(null);
const editingMetadataPath = ref('');
const editingSharePath = ref('');
const metadataTagIds = ref([]);
const shareUserIds = ref([]);

const folders = computed(() => localFiles.value?.folders || []);
const files = computed(() => localFiles.value?.files || []);
const sharedFileItems = computed(() => sharedFiles.value?.files || []);
const breadcrumb = computed(() => localFiles.value?.breadcrumb || [{ label: 'Root', path: '' }]);
const summary = computed(() => localFiles.value?.summary || { folders: 0, files: 0, visibleSize: 0 });
const adapter = computed(() => localFiles.value?.adapter || null);
const adapterOptions = computed(() => adapterContracts.value?.adapters?.filter((item) => item.adapterType === 'storage') || [{
  key: 'local-storage',
  label: 'Local Storage',
  health: { state: adapter.value?.health?.state || 'ready' },
  capabilities: adapter.value?.capabilities || []
}]);
const activeAdapter = computed(() => adapterOptions.value.find((item) => item.key === activeAdapterKey.value) || adapterOptions.value[0]);
const capabilities = computed(() => activeAdapter.value?.capabilities || adapter.value?.capabilities || []);
const isSearching = computed(() => Boolean(localFiles.value?.summary?.search));
const hasItems = computed(() => folders.value.length > 0 || files.value.length > 0);
const currentLocationLabel = computed(() => localFiles.value?.currentPath || 'Root');
const canCreateFolder = computed(() => capabilities.value.includes('createFolder'));
const canUpload = computed(() => capabilities.value.includes('upload'));
const canDelete = computed(() => capabilities.value.includes('delete'));
const canDownload = computed(() => capabilities.value.includes('download'));

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function fileType(file) {
  return file.metadata?.extension?.toUpperCase() || 'FILE';
}

function fileAppMetadata(file) {
  return file.metadata?.app || { isImportant: false, isShared: false, tags: [], canEdit: true };
}

function publicUrl(link) {
  if (!link?.url) return '';
  return `${window.location.origin}${link.url}`;
}

async function openPath(path = '') {
  currentPath.value = path;
  searchQuery.value = '';
  await loadLocalFiles(currentPath.value);
}

async function runSearch() {
  await loadLocalFiles(currentPath.value, searchQuery.value.trim());
}

async function submitFolder() {
  if (!canCreateFolder.value) return;
  if (await createLocalFolder(currentPath.value, folderName.value)) {
    folderName.value = '';
  }
}

async function submitUpload() {
  if (!canUpload.value || fileUploadLoading.value) return;
  if (await uploadLocalFile(currentPath.value, selectedFile.value)) {
    selectedFile.value = null;
    if (uploadInput.value) uploadInput.value.value = '';
  }
}

async function downloadFile(file) {
  if (!canDownload.value) return;
  const params = new URLSearchParams({ path: file.path });
  const response = await fetch(`${apiBase}/file-portal/local/download?${params}`, {
    headers: { Authorization: `Bearer ${token.value}` }
  });

  if (!response.ok) {
    filePortalError.value = 'Download failed. Please refresh and try again.';
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadSharedFile(file) {
  const metadataId = fileAppMetadata(file).id;
  if (!metadataId) return;

  const params = new URLSearchParams({ id: metadataId });
  const response = await fetch(`${apiBase}/file-portal/shared/download?${params}`, {
    headers: { Authorization: `Bearer ${token.value}` }
  });

  if (!response.ok) {
    filePortalError.value = 'Download failed. Please refresh and try again.';
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function askDelete(item) {
  if (!canDelete.value) return;
  pendingDelete.value = item;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const item = pendingDelete.value;
  pendingDelete.value = null;
  await deleteLocalItem(item.path, currentPath.value);
}

async function toggleImportant(file) {
  const metadata = fileAppMetadata(file);
  await updateLocalFileMetadata(file.path, {
    isImportant: !metadata.isImportant,
    isShared: metadata.isShared,
    tagIds: metadata.tags.map((tag) => tag.id)
  }, currentPath.value);
}

async function toggleShared(file) {
  const metadata = fileAppMetadata(file);
  await updateLocalFileMetadata(file.path, {
    isImportant: metadata.isImportant,
    isShared: !metadata.isShared,
    tagIds: metadata.tags.map((tag) => tag.id)
  }, currentPath.value);
}

function editMetadata(file) {
  editingMetadataPath.value = editingMetadataPath.value === file.path ? '' : file.path;
  metadataTagIds.value = fileAppMetadata(file).tags.map((tag) => tag.id);
}

function editSharing(file) {
  editingSharePath.value = editingSharePath.value === file.path ? '' : file.path;
  shareUserIds.value = fileAppMetadata(file).sharedWith.map((member) => member.id);
  latestPublicFileLink.value = null;
}

async function saveMetadata(file) {
  const metadata = fileAppMetadata(file);
  if (await updateLocalFileMetadata(file.path, {
    isImportant: metadata.isImportant,
    isShared: metadata.isShared,
    tagIds: metadataTagIds.value
  }, currentPath.value)) {
    editingMetadataPath.value = '';
    metadataTagIds.value = [];
  }
}

async function saveUserShares(file) {
  if (await updateLocalFileUserShares(file.path, shareUserIds.value, currentPath.value)) {
    editingSharePath.value = '';
    shareUserIds.value = [];
  }
}

async function createPublicLink(file) {
  await createLocalFilePublicLink(file.path, currentPath.value);
}

async function refreshPortal() {
  if (activePortalView.value === 'shared') {
    await loadSharedFiles();
    return;
  }

  await loadLocalFiles(currentPath.value, searchQuery.value.trim());
}

function selectAdapter() {
  currentPath.value = '';
  searchQuery.value = '';
  loadLocalFiles();
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadTags(), loadFileShareUsers(), loadLocalFiles(), loadSharedFiles()]);
});
</script>

<template>
  <AppPage title="Files" eyebrow="File portal">
    <template #actions>
      <button class="secondary-button" :disabled="localFilesLoading" @click="refreshPortal">
        <RefreshCw :size="17" :stroke-width="2" />
        Refresh
      </button>
    </template>

    <section class="storage-workspace">
      <aside class="storage-sidebar">
        <div class="panel-copy">
          <h3>Sources</h3>
          <p>Choose the storage source Equinox should browse.</p>
        </div>

        <label class="portal-source-select">
          <span>Active source</span>
          <select v-model="activeAdapterKey" @change="selectAdapter">
            <option
              v-for="option in adapterOptions"
              :key="option.key"
              :value="option.key"
              :disabled="option.health.state !== 'ready'"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="source-card active">
          <span class="source-icon">
            <HardDrive :size="20" :stroke-width="2" />
          </span>
          <div>
            <strong>{{ activeAdapter?.label || 'Local Storage' }}</strong>
            <small>{{ adapter?.health?.message || activeAdapter?.health?.message || 'Ready for local files.' }}</small>
          </div>
        </div>

        <div class="portal-view-switch">
          <button :class="{ active: activePortalView === 'browser' }" @click="activePortalView = 'browser'">
            Browser
          </button>
          <button :class="{ active: activePortalView === 'shared' }" @click="activePortalView = 'shared'">
            Shared
          </button>
        </div>

        <div class="storage-stat">
          <span>Folders</span>
          <strong>{{ summary.folders }}</strong>
        </div>
        <div class="storage-stat">
          <span>Files</span>
          <strong>{{ summary.files }}</strong>
        </div>
        <div class="storage-stat">
          <span>Visible size</span>
          <strong>{{ formatSize(summary.visibleSize) }}</strong>
        </div>
        <div class="storage-stat">
          <span>Health</span>
          <strong>{{ adapter?.health?.state || 'checking' }}</strong>
        </div>
        <div class="storage-stat">
          <span>Shared with me</span>
          <strong>{{ sharedFileItems.length }}</strong>
        </div>

        <div class="capability-list">
          <span
            v-for="capability in capabilities"
            :key="capability"
          >
            <CheckCircle2 :size="14" :stroke-width="2" />
            {{ capability }}
          </span>
        </div>
      </aside>

      <section v-if="activePortalView === 'browser'" class="file-manager">
        <section class="feature-panel">
          <div class="file-manager-header">
            <div class="panel-copy">
              <h3>File Browser</h3>
              <p>{{ currentLocationLabel }}</p>
            </div>
            <div class="portal-location-pill">
              <Folder :size="17" :stroke-width="2" />
              {{ currentLocationLabel }}
            </div>
          </div>

          <div class="breadcrumb-row">
            <button v-for="crumb in breadcrumb" :key="crumb.path" @click="openPath(crumb.path)">
              {{ crumb.label }}
            </button>
          </div>

          <form class="storage-search" @submit.prevent="runSearch">
            <label class="field-label">
              <span>Search local storage</span>
              <input v-model="searchQuery" />
            </label>
            <button class="secondary-button" type="submit">
              <Search :size="17" :stroke-width="2" />
              Search
            </button>
            <button class="secondary-button" type="button" @click="openPath(currentPath)">Clear</button>
          </form>
          <p v-if="filePortalError" class="storage-error" role="alert" aria-live="assertive">{{ filePortalError }}</p>
          <p v-else-if="localFilesLoading" class="storage-info" role="status" aria-live="polite">Loading files...</p>
        </section>

        <section class="feature-grid">
          <form v-if="canCreateFolder" class="feature-panel form-stack" @submit.prevent="submitFolder">
            <div class="panel-copy">
              <h3>Create Folder</h3>
              <p>Add a folder inside the current location.</p>
            </div>
            <label class="field-label">
              <span>Folder name</span>
              <input v-model="folderName" />
            </label>
            <button class="main-button" type="submit">Create folder</button>
          </form>

          <form v-if="canUpload" class="feature-panel form-stack" @submit.prevent="submitUpload">
            <div class="panel-copy">
              <h3>Upload File</h3>
              <p>Upload into the current local adapter folder.</p>
            </div>
            <span class="field-label-text">File</span>
            <label :class="['file-picker', { busy: fileUploadLoading }]">
              <input
                ref="uploadInput"
                type="file"
                :disabled="fileUploadLoading"
                @change="selectedFile = $event.target.files?.[0] || null"
              />
              <span class="file-picker-button">
                <Upload :size="17" :stroke-width="2" />
                Select file
              </span>
              <span class="file-picker-status">{{ selectedFile?.name || 'No file selected' }}</span>
            </label>
            <p v-if="fileUploadStatus" class="storage-info" role="status" aria-live="polite">{{ fileUploadStatus }}</p>
            <button class="main-button" type="submit" :disabled="fileUploadLoading || !selectedFile">
              {{ fileUploadLoading ? 'Uploading...' : 'Upload file' }}
            </button>
          </form>
        </section>

        <section class="feature-panel portal-list-panel">
          <div class="storage-section-title">
            <h4>{{ isSearching ? 'Search results' : 'Current folder' }}</h4>
            <span>{{ folders.length + files.length }}</span>
          </div>

          <p v-if="!hasItems && !localFilesLoading" class="empty-state">
            {{ isSearching ? 'No matching files or folders.' : 'No files or folders here.' }}
          </p>

          <div v-if="folders.length" class="portal-list-group">
            <h5>Folders</h5>
            <article v-for="folder in folders" :key="folder.id" class="folder-row">
              <button class="folder-open" @click="openPath(folder.path)">
                <Folder :size="24" :stroke-width="1.8" />
                <span>
                  <strong>{{ folder.name }}</strong>
                  <small>{{ folder.metadata.displayPath }}</small>
                </span>
              </button>
              <div v-if="canDelete" class="item-actions">
                <button @click="askDelete(folder)">
                  <Trash2 :size="15" :stroke-width="2" />
                  Delete
                </button>
              </div>
            </article>
          </div>

          <div v-if="files.length" class="portal-list-group">
            <h5>Files</h5>
            <article v-for="file in files" :key="file.id" class="file-row">
              <div class="file-badge">
                <File :size="20" :stroke-width="2" />
                <strong>{{ fileType(file) }}</strong>
              </div>
              <div class="file-details">
                <h4>{{ file.name }}</h4>
                <p>{{ formatSize(file.size) }} / {{ file.metadata.displayPath }}</p>
                <div class="file-metadata-row">
                  <span v-if="fileAppMetadata(file).isImportant" class="important-pill">
                    <Star :size="14" :stroke-width="2" />
                    Important
                  </span>
                  <span v-if="fileAppMetadata(file).isShared" class="shared-pill">
                    Shared
                  </span>
                  <span v-if="fileAppMetadata(file).sharedWith.length" class="shared-pill">
                    {{ fileAppMetadata(file).sharedWith.length }} people
                  </span>
                  <TagChips v-if="fileAppMetadata(file).tags.length" :tags="fileAppMetadata(file).tags" />
                </div>
              </div>
              <div class="item-actions">
                <button @click="toggleImportant(file)">
                  <Star :size="15" :stroke-width="2" />
                  {{ fileAppMetadata(file).isImportant ? 'Unmark' : 'Important' }}
                </button>
                <button @click="toggleShared(file)">
                  {{ fileAppMetadata(file).isShared ? 'Unshare' : 'Share' }}
                </button>
                <button @click="editSharing(file)">
                  Share settings
                </button>
                <button @click="editMetadata(file)">
                  <Tags :size="15" :stroke-width="2" />
                  Tags
                </button>
                <button v-if="canDownload" @click="downloadFile(file)">
                  <Download :size="15" :stroke-width="2" />
                  Download
                </button>
                <button v-if="canDelete" @click="askDelete(file)">
                  <Trash2 :size="15" :stroke-width="2" />
                  Delete
                </button>
              </div>
              <form
                v-if="editingMetadataPath === file.path"
                class="file-metadata-editor"
                @submit.prevent="saveMetadata(file)"
              >
                <div v-if="tags.length" class="tag-picker">
                  <label v-for="tag in tags" :key="tag.id">
                    <input v-model="metadataTagIds" type="checkbox" :value="tag.id" />
                    <TagChips :tags="[tag]" />
                  </label>
                </div>
                <p v-else class="empty-state">Create tags first to label files.</p>
                <div class="item-actions">
                  <button type="submit">Save tags</button>
                  <button type="button" @click="editingMetadataPath = ''">Cancel</button>
                </div>
              </form>
              <form
                v-if="editingSharePath === file.path"
                class="file-metadata-editor"
                @submit.prevent="saveUserShares(file)"
              >
                <div v-if="fileShareUsers.length" class="tag-picker">
                  <label v-for="member in fileShareUsers" :key="member.id">
                    <input v-model="shareUserIds" type="checkbox" :value="member.id" />
                    <span class="share-user-chip">{{ member.displayName }} <small>{{ member.role }}</small></span>
                  </label>
                </div>
                <p v-else class="empty-state">No other users are available to share with.</p>
                <div class="public-link-list">
                  <div v-for="link in fileAppMetadata(file).publicLinks" :key="link.id" class="public-link-row">
                    <span>{{ link.label || 'Public link' }}</span>
                    <small>Expires {{ new Date(link.expiresAt).toLocaleString() }} / {{ link.downloadCount }} downloads</small>
                    <button type="button" @click="revokeLocalFilePublicLink(link.id, currentPath)">Revoke</button>
                  </div>
                  <p v-if="latestPublicFileLink" class="reset-code-box">{{ publicUrl(latestPublicFileLink) }}</p>
                </div>
                <div class="item-actions">
                  <button type="submit">Save people</button>
                  <button type="button" @click="createPublicLink(file)">Create public link</button>
                  <button type="button" @click="editingSharePath = ''">Cancel</button>
                </div>
              </form>
            </article>
          </div>
        </section>

        <section class="storage-overview">
          <article>
            <span>Source</span>
            <strong>{{ activeAdapter?.label || 'Local' }}</strong>
          </article>
          <article>
            <span>Location</span>
            <strong>{{ currentLocationLabel }}</strong>
          </article>
          <article>
            <span>Actions</span>
            <strong>{{ capabilities.length }}</strong>
          </article>
        </section>
      </section>

      <section v-else class="file-manager">
        <section class="feature-panel">
          <div class="file-manager-header">
            <div class="panel-copy">
              <h3>Shared Files</h3>
              <p>Files family members shared through Equinox. This view is read-only.</p>
            </div>
            <div class="portal-location-pill">
              <File :size="17" :stroke-width="2" />
              {{ sharedFileItems.length }} files
            </div>
          </div>
          <p v-if="filePortalError" class="storage-error" role="alert" aria-live="assertive">{{ filePortalError }}</p>
          <p v-else-if="sharedFilesLoading" class="storage-info" role="status" aria-live="polite">Loading shared files...</p>
        </section>

        <section class="feature-panel portal-list-panel">
          <div class="storage-section-title">
            <h4>Shared with family</h4>
            <span>{{ sharedFileItems.length }}</span>
          </div>
          <p v-if="!sharedFileItems.length && !sharedFilesLoading" class="empty-state">No shared files yet.</p>
          <article v-for="file in sharedFileItems" :key="file.metadata.app.id" class="file-row">
            <div class="file-badge">
              <File :size="20" :stroke-width="2" />
              <strong>{{ fileType(file) }}</strong>
            </div>
            <div class="file-details">
              <h4>{{ file.name }}</h4>
              <p>{{ formatSize(file.size) }} / {{ file.metadata.displayPath }}</p>
              <div class="file-metadata-row">
                <span class="shared-pill">Shared by {{ fileAppMetadata(file).owner?.displayName || 'family' }}</span>
                <span v-if="fileAppMetadata(file).isImportant" class="important-pill">
                  <Star :size="14" :stroke-width="2" />
                  Important
                </span>
                <TagChips v-if="fileAppMetadata(file).tags.length" :tags="fileAppMetadata(file).tags" />
              </div>
            </div>
            <div class="item-actions">
              <button @click="downloadSharedFile(file)">
                <Download :size="15" :stroke-width="2" />
                Download
              </button>
            </div>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete item?"
      :message="`This will permanently delete '${pendingDelete?.name}'.`"
      confirm-label="Delete"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
