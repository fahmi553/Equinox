<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  closeFilePreview,
  createDocumentRecord,
  deleteDocumentRecord,
  documentRecordError,
  documentRecords,
  downloadFile,
  fileExtension,
  filePreview,
  filePreviewType,
  formatBytes,
  importantDocuments,
  loadDocumentRecords,
  loadDocuments,
  newDocumentRecord,
  permissions,
  previewFile,
  saveDocumentRecord,
  storageError,
  toggleDocumentRecordDone,
  toggleFileImportant
} from '../stores/equinox';

const editingRecord = ref(null);
const pendingDeleteRecord = ref(null);

const previewableCount = computed(() => importantDocuments.value.filter((file) => filePreviewType(file)).length);
const sharedCount = computed(() => importantDocuments.value.filter((file) => file.shareState !== 'private').length);
const privateCount = computed(() => importantDocuments.value.filter((file) => file.shareState === 'private').length);
const todayStart = computed(() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
});
const activeRecords = computed(() => documentRecords.value.filter((record) => record.status !== 'DONE'));
const overdueRecords = computed(() => activeRecords.value.filter((record) => record.dueAt && new Date(record.dueAt) < todayStart.value));
const upcomingRecords = computed(() => activeRecords.value.filter((record) => !record.dueAt || new Date(record.dueAt) >= todayStart.value));
const doneRecords = computed(() => documentRecords.value.filter((record) => record.status === 'DONE'));

const recordGroups = computed(() => [
  { key: 'overdue', label: 'Overdue', items: overdueRecords.value },
  { key: 'upcoming', label: 'Upcoming', items: upcomingRecords.value },
  { key: 'done', label: 'Done', items: doneRecords.value }
]);

const categoryOptions = [
  { label: 'Bill', value: 'BILL' },
  { label: 'Renewal', value: 'RENEWAL' },
  { label: 'Warranty', value: 'WARRANTY' },
  { label: 'Insurance', value: 'INSURANCE' },
  { label: 'School', value: 'SCHOOL' },
  { label: 'General', value: 'GENERAL' }
];

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Waiting', value: 'WAITING' },
  { label: 'Done', value: 'DONE' }
];

function shareLabel(file) {
  if (file.shareState === 'inherited') return 'Shared by folder';
  if (file.shareState === 'shared' || file.isShared) return 'Shared';
  return 'Private';
}

function tagNames(file) {
  return (file.tags || []).map((tag) => tag.name).join(', ');
}

function canPreview(file) {
  return Boolean(filePreviewType(file));
}

function formatDue(dueAt) {
  if (!dueAt) return 'No due date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dueAt));
}

function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === '') return 'No amount';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'MYR' }).format(Number(amount));
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function beginEditRecord(record) {
  editingRecord.value = {
    id: record.id,
    title: record.title,
    category: record.category,
    status: record.status,
    amount: record.amount ?? '',
    dueAt: toDateInput(record.dueAt),
    notes: record.notes || '',
    fileId: record.fileId || ''
  };
}

async function submitRecordEdit(record) {
  await saveDocumentRecord(record, editingRecord.value);
  editingRecord.value = null;
}

function askDeleteRecord(record) {
  pendingDeleteRecord.value = record;
}

function cancelDeleteRecord() {
  pendingDeleteRecord.value = null;
}

async function confirmDeleteRecord() {
  if (!pendingDeleteRecord.value) return;
  const record = pendingDeleteRecord.value;
  pendingDeleteRecord.value = null;
  await deleteDocumentRecord(record);
}

onMounted(async () => {
  await Promise.all([loadDocuments(), loadDocumentRecords()]);
});
onUnmounted(closeFilePreview);
</script>

<template>
  <AppPage title="Documents" eyebrow="Important family files">
    <template #actions>
      <button class="secondary-button" @click="loadDocuments">Refresh</button>
    </template>

    <section class="document-overview" aria-label="Document overview">
      <article>
        <span>Important</span>
        <strong>{{ importantDocuments.length }}</strong>
      </article>
      <article>
        <span>Previewable</span>
        <strong>{{ previewableCount }}</strong>
      </article>
      <article>
        <span>Shared</span>
        <strong>{{ sharedCount }}</strong>
      </article>
      <article>
        <span>Private</span>
        <strong>{{ privateCount }}</strong>
      </article>
      <article>
        <span>Tracker open</span>
        <strong>{{ activeRecords.length }}</strong>
      </article>
      <article>
        <span>Tracker overdue</span>
        <strong>{{ overdueRecords.length }}</strong>
      </article>
    </section>

    <section class="documents-workspace">
      <section v-if="permissions.canCreateDocumentRecords" class="feature-panel document-record-create">
        <div class="panel-copy">
          <h3>Track Bill or Document</h3>
          <p>Add renewals, bill due dates, warranties, and forms that need attention.</p>
        </div>
        <div class="form-stack">
          <input v-model="newDocumentRecord.title" placeholder="Title" />
          <div class="document-form-grid">
            <select v-model="newDocumentRecord.category">
              <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <select v-model="newDocumentRecord.status">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <input v-model="newDocumentRecord.dueAt" type="date" />
            <input v-model="newDocumentRecord.amount" type="number" min="0" step="0.01" placeholder="Amount" />
          </div>
          <select v-model="newDocumentRecord.fileId">
            <option value="">No linked file</option>
            <option v-for="file in importantDocuments" :key="file.id" :value="file.id">
              {{ file.originalName }}
            </option>
          </select>
          <textarea v-model="newDocumentRecord.notes" placeholder="Notes"></textarea>
          <button class="main-button" @click="createDocumentRecord">Add tracker item</button>
        </div>
        <p v-if="documentRecordError" class="storage-error">{{ documentRecordError }}</p>
      </section>
      <section v-else class="feature-panel document-record-create">
        <div class="panel-copy">
          <h3>Track Bill or Document</h3>
          <p>This account can view documents but cannot create tracker items.</p>
        </div>
      </section>

      <section class="document-record-board">
        <section v-for="group in recordGroups" :key="group.key" class="feature-panel document-record-column">
          <div class="storage-section-title">
            <h4>{{ group.label }}</h4>
            <span>{{ group.items.length }}</span>
          </div>
          <p v-if="!group.items.length" class="empty-state">No tracker items here.</p>

          <article v-for="record in group.items" :key="record.id" class="document-record-card" :class="{ done: record.status === 'DONE' }">
            <template v-if="editingRecord?.id !== record.id">
              <div class="document-record-heading">
                <label class="reminder-check">
                  <input :checked="record.status === 'DONE'" type="checkbox" @change="toggleDocumentRecordDone(record)" />
                  <span>
                    <strong>{{ record.title }}</strong>
                    <small>{{ record.category }} / {{ record.status }} / {{ formatDue(record.dueAt) }}</small>
                  </span>
                </label>
                <strong>{{ formatAmount(record.amount) }}</strong>
              </div>
              <p v-if="record.notes">{{ record.notes }}</p>
              <p v-if="record.file">
                Linked file: {{ record.file.originalName }}
              </p>
              <div class="item-actions">
                <button v-if="record.file && canPreview(record.file)" @click="previewFile(record.file)">Preview file</button>
                <button v-if="record.file" @click="downloadFile(record.file)">Download file</button>
                <button @click="beginEditRecord(record)">Edit</button>
                <button @click="askDeleteRecord(record)">Delete</button>
              </div>
            </template>

            <form v-else class="document-record-edit" @submit.prevent="submitRecordEdit(record)">
              <input v-model="editingRecord.title" placeholder="Title" />
              <div class="document-form-grid">
                <select v-model="editingRecord.category">
                  <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <select v-model="editingRecord.status">
                  <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <input v-model="editingRecord.dueAt" type="date" />
                <input v-model="editingRecord.amount" type="number" min="0" step="0.01" placeholder="Amount" />
              </div>
              <select v-model="editingRecord.fileId">
                <option value="">No linked file</option>
                <option v-for="file in importantDocuments" :key="file.id" :value="file.id">
                  {{ file.originalName }}
                </option>
              </select>
              <textarea v-model="editingRecord.notes" placeholder="Notes"></textarea>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="editingRecord = null">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <section class="feature-panel documents-main">
      <div class="panel-copy">
        <h3>Important Documents</h3>
        <p>Keep passports, certificates, school forms, bills, and other key files easy to find.</p>
      </div>

      <p v-if="storageError" class="storage-error">{{ storageError }}</p>
      <p v-if="!importantDocuments.length" class="empty-state">
        No important documents yet. Mark files as important from the Files page.
      </p>

      <article v-for="file in importantDocuments" :key="file.id" class="document-row">
        <div class="file-badge" aria-hidden="true">
          <strong>{{ fileExtension(file.originalName) }}</strong>
        </div>
        <div class="document-details">
          <h4>{{ file.originalName }}</h4>
          <p>
            {{ formatBytes(file.size) }} / {{ shareLabel(file) }} / {{ file.owner.displayName }}
            <span v-if="file.folderPath"> / {{ file.folderPath }}</span>
          </p>
          <p v-if="file.tags?.length" class="tag-line">{{ tagNames(file) }}</p>
          <div class="item-actions">
            <button v-if="canPreview(file)" @click="previewFile(file)">Preview</button>
            <button @click="downloadFile(file)">Download</button>
            <button v-if="file.canEdit" @click="toggleFileImportant(file)">Remove important</button>
          </div>
          <p v-if="!file.canEdit" class="readonly-note">Read-only shared document</p>
        </div>
      </article>
    </section>

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

    <ConfirmDialog
      :open="Boolean(pendingDeleteRecord)"
      eyebrow="Delete"
      title="Delete tracker item?"
      :message="`This will permanently delete '${pendingDeleteRecord?.title}'.`"
      confirm-label="Delete"
      @cancel="cancelDeleteRecord"
      @confirm="confirmDeleteRecord"
    />
  </AppPage>
</template>
