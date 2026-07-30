<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import TagChips from '../components/TagChips.vue';
import {
  bookmarkError,
  bookmarks,
  createBookmark,
  deleteBookmark,
  loadBookmarks,
  loadTags,
  newBookmark,
  permissions,
  saveBookmark,
  tags,
  toggleBookmarkShare
} from '../stores/equinox';

const editingBookmark = ref(null);
const pendingDelete = ref(null);
const activeTagId = ref('');

const visibleBookmarks = computed(() => {
  if (!activeTagId.value) return bookmarks.value;
  return bookmarks.value.filter((bookmark) => (bookmark.tags || []).some((tag) => tag.id === activeTagId.value));
});
const ownBookmarks = computed(() => visibleBookmarks.value.filter((bookmark) => bookmark.canEdit));
const sharedBookmarks = computed(() => visibleBookmarks.value.filter((bookmark) => !bookmark.canEdit));

function beginEdit(bookmark) {
  editingBookmark.value = {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    notes: bookmark.notes || '',
    isShared: bookmark.isShared,
    tagIds: (bookmark.tags || []).map((tag) => tag.id)
  };
}

async function submitEdit(bookmark) {
  await saveBookmark(bookmark, editingBookmark.value);
  editingBookmark.value = null;
}

function askDelete(bookmark) {
  pendingDelete.value = bookmark;
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const bookmark = pendingDelete.value;
  pendingDelete.value = null;
  await deleteBookmark(bookmark);
}

onMounted(async () => {
  await Promise.all([loadBookmarks(), loadTags()]);
});
</script>

<template>
  <AppPage title="Bookmarks" eyebrow="Saved links">
    <template #actions>
      <button class="secondary-button" @click="loadBookmarks">Refresh</button>
    </template>

    <section class="notes-workspace">
      <aside class="storage-sidebar">
        <div class="panel-copy">
          <h3>Bookmarks</h3>
          <p>Save useful family links, private admin pages, bills, recipes, and portals.</p>
        </div>
        <div class="storage-stat">
          <span>Your links</span>
          <strong>{{ ownBookmarks.length }}</strong>
        </div>
        <div class="storage-stat">
          <span>Shared with you</span>
          <strong>{{ sharedBookmarks.length }}</strong>
        </div>
        <div class="storage-stat">
          <span>Total visible</span>
          <strong>{{ visibleBookmarks.length }}</strong>
        </div>
      </aside>

      <section class="notes-main">
        <section v-if="permissions.canCreateBookmarks" class="feature-panel">
          <div class="panel-copy">
            <h3>Create bookmark</h3>
            <p>Private by default. Share useful household links when everyone should see them.</p>
          </div>
          <form class="note-form" @submit.prevent="createBookmark">
            <label class="field-label">
              <span>Title</span>
              <input v-model="newBookmark.title" />
            </label>
            <label class="field-label">
              <span>URL</span>
              <input v-model="newBookmark.url" placeholder="https://example.com" />
            </label>
            <label class="field-label">
              <span>Notes</span>
              <textarea v-model="newBookmark.notes"></textarea>
            </label>
            <label class="share-row">
              <input v-model="newBookmark.isShared" type="checkbox" />
              <span>Share with family</span>
            </label>
            <div v-if="tags.length" class="tag-picker">
              <label v-for="tag in tags" :key="tag.id">
                <input v-model="newBookmark.tagIds" type="checkbox" :value="tag.id" />
                <TagChips :tags="[tag]" />
              </label>
            </div>
            <button class="main-button" type="submit">Add bookmark</button>
          </form>
          <p v-if="bookmarkError" class="storage-error" role="alert" aria-live="assertive">{{ bookmarkError }}</p>
        </section>
        <section v-else class="feature-panel">
          <div class="panel-copy">
            <h3>Create bookmark</h3>
            <p>This account can read shared bookmarks but cannot create new bookmarks.</p>
          </div>
        </section>

        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Visible bookmarks</h4>
            <span>{{ visibleBookmarks.length }}</span>
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
          <p v-if="!visibleBookmarks.length" class="empty-state">No bookmarks here.</p>

          <article v-for="bookmark in visibleBookmarks" :key="bookmark.id" class="note-card">
            <template v-if="editingBookmark?.id !== bookmark.id">
              <div class="note-card-heading">
                <div>
                  <h4>{{ bookmark.title }}</h4>
                  <p>{{ bookmark.isShared ? 'Shared' : 'Private' }} / {{ bookmark.owner.displayName }}</p>
                </div>
                <strong :class="['role-pill', bookmark.isShared ? 'admin' : 'family']">
                  {{ bookmark.isShared ? 'Shared' : 'Private' }}
                </strong>
              </div>
              <TagChips v-if="bookmark.tags?.length" :tags="bookmark.tags" />
              <p class="note-body">{{ bookmark.notes || 'No notes yet.' }}</p>
              <div class="item-actions">
                <a :href="bookmark.url" target="_blank" rel="noreferrer">Open</a>
                <button v-if="bookmark.canEdit" @click="beginEdit(bookmark)">Edit</button>
                <button v-if="bookmark.canEdit" @click="toggleBookmarkShare(bookmark)">
                  {{ bookmark.isShared ? 'Make private' : 'Share' }}
                </button>
                <button v-if="bookmark.canEdit" @click="askDelete(bookmark)">Delete</button>
              </div>
            </template>

            <form v-else class="note-edit-form" @submit.prevent="submitEdit(bookmark)">
              <label class="field-label">
                <span>Title</span>
                <input v-model="editingBookmark.title" />
              </label>
              <label class="field-label">
                <span>URL</span>
                <input v-model="editingBookmark.url" placeholder="https://example.com" />
              </label>
              <label class="field-label">
                <span>Notes</span>
                <textarea v-model="editingBookmark.notes"></textarea>
              </label>
              <label class="share-row">
                <input v-model="editingBookmark.isShared" type="checkbox" />
                <span>Share with family</span>
              </label>
              <div v-if="tags.length" class="tag-picker">
                <label v-for="tag in tags" :key="tag.id">
                  <input v-model="editingBookmark.tagIds" type="checkbox" :value="tag.id" />
                  <TagChips :tags="[tag]" />
                </label>
              </div>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="editingBookmark = null">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete bookmark?"
      :message="`This will permanently delete '${pendingDelete?.title}'.`"
      confirm-label="Delete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
