<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import TagChips from '../components/TagChips.vue';
import {
  bulkDeleteNotes,
  bulkUpdateNotes,
  createNote,
  deleteNote,
  loadNotes,
  loadTags,
  newNote,
  noteError,
  notes,
  notesLoading,
  permissions,
  tags,
  tagsLoading,
  toggleNoteShare,
  updateNote
} from '../stores/equinox';

const editingNote = ref(null);
const pendingDelete = ref(null);
const pendingBulkDelete = ref(false);
const activeTagId = ref('');
const selectedNoteIds = ref([]);
const titleInput = ref(null);
const route = useRoute();

const visibleNotes = computed(() => {
  if (!activeTagId.value) return notes.value;
  return notes.value.filter((note) => (note.tags || []).some((tag) => tag.id === activeTagId.value));
});
const ownNotes = computed(() => visibleNotes.value.filter((note) => note.canEdit));
const sharedNotes = computed(() => visibleNotes.value.filter((note) => !note.canEdit));
const editableVisibleNotes = computed(() => visibleNotes.value.filter((note) => note.canEdit));
const selectedEditableNotes = computed(() => editableVisibleNotes.value.filter((note) => selectedNoteIds.value.includes(note.id)));

function beginEdit(note) {
  editingNote.value = {
    id: note.id,
    title: note.title,
    body: note.body,
    isShared: note.isShared,
    tagIds: (note.tags || []).map((tag) => tag.id)
  };
}

function cancelEdit() {
  editingNote.value = null;
}

async function submitEdit(note) {
  await updateNote(note, {
    title: editingNote.value.title,
    body: editingNote.value.body,
    isShared: editingNote.value.isShared,
    tagIds: editingNote.value.tagIds
  });
  editingNote.value = null;
}

function askDelete(note) {
  pendingDelete.value = note;
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const note = pendingDelete.value;
  pendingDelete.value = null;
  await deleteNote(note);
}

function toggleAllVisibleNotes() {
  selectedNoteIds.value = selectedNoteIds.value.length === editableVisibleNotes.value.length
    ? []
    : editableVisibleNotes.value.map((note) => note.id);
}

async function bulkSetShare(isShared) {
  if (!selectedEditableNotes.value.length) return;
  if (await bulkUpdateNotes(selectedEditableNotes.value.map((note) => note.id), { isShared })) {
    selectedNoteIds.value = [];
  }
}

async function bulkApplyTag(tagId) {
  if (!selectedEditableNotes.value.length || !tagId) return;
  await Promise.all(selectedEditableNotes.value.map((note) => bulkUpdateNotes([note.id], {
    tagIds: [...new Set([...(note.tags || []).map((tag) => tag.id), tagId])]
  })));
  selectedNoteIds.value = [];
}

function askBulkDelete() {
  if (selectedEditableNotes.value.length) {
    pendingBulkDelete.value = true;
  }
}

async function confirmBulkDelete() {
  const ids = selectedEditableNotes.value.map((note) => note.id);
  pendingBulkDelete.value = false;
  selectedNoteIds.value = [];
  await bulkDeleteNotes(ids);
}

function noteVisibility(note) {
  if (!note.canEdit) return 'Read-only shared';
  return note.isShared ? 'Shared' : 'Private';
}

onMounted(async () => {
  await Promise.all([loadNotes(), loadTags()]);
  if (route.query.new === 'note') {
    await nextTick();
    titleInput.value?.focus();
  }
});
</script>

<template>
  <AppPage title="Notes" eyebrow="Quick memory">
    <template #actions>
      <button class="secondary-button" @click="loadNotes">Refresh</button>
    </template>

    <section class="notes-workspace">
      <aside class="storage-sidebar">
        <div class="panel-copy">
          <h3>Notes</h3>
          <p>Keep household information simple, searchable, and easy to share.</p>
        </div>
        <div class="storage-stat">
          <span>Your notes</span>
          <strong>{{ ownNotes.length }}</strong>
        </div>
        <div class="storage-stat">
          <span>Shared with you</span>
          <strong>{{ sharedNotes.length }}</strong>
        </div>
        <div class="storage-stat">
          <span>Total visible</span>
          <strong>{{ visibleNotes.length }}</strong>
        </div>
      </aside>

      <section class="notes-main">
        <section v-if="permissions.canCreateNotes" class="feature-panel">
          <div class="panel-copy">
            <h3>Create note</h3>
            <p>Private by default. Share only when family should be able to read it.</p>
          </div>
          <form class="note-form" @submit.prevent="createNote">
            <label class="field-label">
              <span>Title</span>
              <input ref="titleInput" v-model="newNote.title" />
            </label>
            <label class="field-label">
              <span>Note</span>
              <textarea v-model="newNote.body"></textarea>
            </label>
            <label class="share-row">
              <input v-model="newNote.isShared" type="checkbox" />
              <span>Share with family</span>
            </label>
            <div v-if="tags.length" class="tag-picker">
              <label v-for="tag in tags" :key="tag.id">
                <input v-model="newNote.tagIds" type="checkbox" :value="tag.id" />
                <TagChips :tags="[tag]" />
              </label>
            </div>
            <button class="main-button" type="submit">Add note</button>
          </form>
          <p v-if="noteError" class="storage-error" role="alert" aria-live="assertive">{{ noteError }}</p>
        </section>
        <section v-else class="feature-panel">
          <div class="panel-copy">
            <h3>Create note</h3>
            <p>This account can read shared notes but cannot create new notes.</p>
          </div>
        </section>

        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Visible notes</h4>
            <span>{{ visibleNotes.length }}</span>
          </div>
          <div v-if="editableVisibleNotes.length" class="bulk-toolbar">
            <label class="share-row">
              <input
                type="checkbox"
                :checked="selectedNoteIds.length === editableVisibleNotes.length"
                @change="toggleAllVisibleNotes"
              />
              <span>{{ selectedNoteIds.length ? `${selectedNoteIds.length} selected` : 'Select visible' }}</span>
            </label>
            <button type="button" :disabled="!selectedNoteIds.length" @click="bulkSetShare(true)">Share</button>
            <button type="button" :disabled="!selectedNoteIds.length" @click="bulkSetShare(false)">Make private</button>
            <select :disabled="!selectedNoteIds.length" @change="bulkApplyTag($event.target.value); $event.target.value = ''">
              <option value="">Add tag</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
            <button type="button" :disabled="!selectedNoteIds.length" @click="askBulkDelete">Delete</button>
          </div>
          <div v-if="tags.length" class="tag-filter-row">
            <button :class="{ active: !activeTagId }" @click="activeTagId = ''">All tags</button>
            <button
              v-for="tag in tags"
              :key="tag.id"
              :class="{ active: activeTagId === tag.id }"
              :style="{ '--tag-color': tag.color }"
              @click="activeTagId = tag.id"
            >
              {{ tag.name }}
            </button>
          </div>
          <p v-if="notesLoading || tagsLoading" class="storage-info" role="status" aria-live="polite">Loading notes...</p>
          <p v-else-if="!visibleNotes.length" class="empty-state">No notes here.</p>

          <article v-for="note in visibleNotes" :key="note.id" class="note-card">
            <template v-if="editingNote?.id !== note.id">
              <div class="note-card-heading">
                <label v-if="note.canEdit" class="bulk-select">
                  <input v-model="selectedNoteIds" type="checkbox" :value="note.id" />
                  <span>Select note</span>
                </label>
                <div>
                  <h4>{{ note.title }}</h4>
                  <p>{{ noteVisibility(note) }} / {{ note.owner.displayName }}</p>
                </div>
                <strong :class="['role-pill', note.canEdit ? (note.isShared ? 'admin' : 'family') : 'family']">
                  {{ noteVisibility(note) }}
                </strong>
              </div>
              <TagChips v-if="note.tags?.length" :tags="note.tags" />
              <p class="note-body">{{ note.body || 'No details yet.' }}</p>
              <div class="item-actions">
                <button v-if="note.canEdit" @click="beginEdit(note)">Edit</button>
                <button v-if="note.canEdit" @click="toggleNoteShare(note)">
                  {{ note.isShared ? 'Make private' : 'Share' }}
                </button>
                <button v-if="note.canEdit" @click="askDelete(note)">Delete</button>
              </div>
            </template>

            <form v-else class="note-edit-form" @submit.prevent="submitEdit(note)">
              <label class="field-label">
                <span>Title</span>
                <input v-model="editingNote.title" />
              </label>
              <label class="field-label">
                <span>Note</span>
                <textarea v-model="editingNote.body"></textarea>
              </label>
              <label class="share-row">
                <input v-model="editingNote.isShared" type="checkbox" />
                <span>Share with family</span>
              </label>
              <div v-if="tags.length" class="tag-picker">
                <label v-for="tag in tags" :key="tag.id">
                  <input v-model="editingNote.tagIds" type="checkbox" :value="tag.id" />
                  <TagChips :tags="[tag]" />
                </label>
              </div>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="cancelEdit">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete note?"
      :message="`This will permanently delete '${pendingDelete?.title}'.`"
      confirm-label="Delete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
    <ConfirmDialog
      :open="pendingBulkDelete"
      eyebrow="Delete"
      title="Delete selected notes?"
      :message="`This will delete ${selectedEditableNotes.length} selected note${selectedEditableNotes.length === 1 ? '' : 's'} after the undo window.`"
      confirm-label="Delete selected"
      @cancel="pendingBulkDelete = false"
      @confirm="confirmBulkDelete"
    />
  </AppPage>
</template>
