<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import TagChips from '../components/TagChips.vue';
import {
  createNote,
  deleteNote,
  loadNotes,
  loadTags,
  newNote,
  noteError,
  notes,
  permissions,
  tags,
  toggleNoteShare,
  updateNote
} from '../stores/equinox';

const editingNote = ref(null);
const pendingDelete = ref(null);
const activeTagId = ref('');

const visibleNotes = computed(() => {
  if (!activeTagId.value) return notes.value;
  return notes.value.filter((note) => (note.tags || []).some((tag) => tag.id === activeTagId.value));
});
const ownNotes = computed(() => visibleNotes.value.filter((note) => note.canEdit));
const sharedNotes = computed(() => visibleNotes.value.filter((note) => !note.canEdit));

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

function noteVisibility(note) {
  if (!note.canEdit) return 'Read-only shared';
  return note.isShared ? 'Shared' : 'Private';
}

onMounted(async () => {
  await Promise.all([loadNotes(), loadTags()]);
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
            <input v-model="newNote.title" placeholder="Title" />
            <textarea v-model="newNote.body" placeholder="Write a note"></textarea>
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
          <p v-if="noteError" class="storage-error">{{ noteError }}</p>
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
          <p v-if="!visibleNotes.length" class="empty-state">No notes here.</p>

          <article v-for="note in visibleNotes" :key="note.id" class="note-card">
            <template v-if="editingNote?.id !== note.id">
              <div class="note-card-heading">
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
              <input v-model="editingNote.title" placeholder="Title" />
              <textarea v-model="editingNote.body" placeholder="Write a note"></textarea>
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
  </AppPage>
</template>
