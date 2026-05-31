<script setup>
import { onMounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  createTag,
  deleteTag,
  loadTags,
  newTag,
  permissions,
  tagError,
  tags,
  updateTag
} from '../stores/equinox';

const editingTag = ref(null);
const pendingDelete = ref(null);

function beginEdit(tag) {
  editingTag.value = {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isShared: tag.isShared
  };
}

async function submitEdit(tag) {
  await updateTag(tag, editingTag.value);
  editingTag.value = null;
}

function askDelete(tag) {
  pendingDelete.value = tag;
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const tag = pendingDelete.value;
  pendingDelete.value = null;
  await deleteTag(tag);
}

onMounted(loadTags);
</script>

<template>
  <AppPage title="Tags" eyebrow="Organize items">
    <template #actions>
      <button class="secondary-button" @click="loadTags">Refresh</button>
    </template>

    <section class="notes-workspace">
      <aside class="storage-sidebar">
        <div class="panel-copy">
          <h3>Tags</h3>
          <p>Use short labels to group notes, tasks, and bookmarks.</p>
        </div>
        <div class="storage-stat">
          <span>Visible tags</span>
          <strong>{{ tags.length }}</strong>
        </div>
      </aside>

      <section class="notes-main">
        <section v-if="permissions.canCreateTags" class="feature-panel">
          <div class="panel-copy">
            <h3>Create tag</h3>
            <p>Private by default. Share a tag when family users should see it in their tag list.</p>
          </div>
          <form class="note-form" @submit.prevent="createTag">
            <input v-model="newTag.name" placeholder="Tag name" />
            <input v-model="newTag.color" type="color" />
            <label class="share-row">
              <input v-model="newTag.isShared" type="checkbox" />
              <span>Share tag</span>
            </label>
            <button class="main-button" type="submit">Create tag</button>
          </form>
          <p v-if="tagError" class="storage-error">{{ tagError }}</p>
        </section>
        <section v-else class="feature-panel">
          <div class="panel-copy">
            <h3>Create tag</h3>
            <p>This account can use visible tags but cannot create new tags.</p>
          </div>
        </section>

        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Visible tags</h4>
            <span>{{ tags.length }}</span>
          </div>
          <p v-if="!tags.length" class="empty-state">No tags yet.</p>

          <article v-for="tag in tags" :key="tag.id" class="note-card">
            <template v-if="editingTag?.id !== tag.id">
              <div class="note-card-heading">
                <div>
                  <h4><span class="tag-dot" :style="{ background: tag.color }"></span>{{ tag.name }}</h4>
                  <p>{{ tag.isShared ? 'Shared' : 'Private' }} / {{ tag.owner?.displayName || 'Family' }}</p>
                </div>
                <strong :class="['role-pill', tag.isShared ? 'admin' : 'family']">
                  {{ tag.isShared ? 'Shared' : 'Private' }}
                </strong>
              </div>
              <div v-if="tag.canEdit" class="item-actions">
                <button @click="beginEdit(tag)">Edit</button>
                <button @click="updateTag(tag, { isShared: !tag.isShared })">{{ tag.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="askDelete(tag)">Delete</button>
              </div>
              <p v-else class="readonly-note">Read-only shared tag</p>
            </template>

            <form v-else class="note-edit-form" @submit.prevent="submitEdit(tag)">
              <input v-model="editingTag.name" placeholder="Tag name" />
              <input v-model="editingTag.color" type="color" />
              <label class="share-row">
                <input v-model="editingTag.isShared" type="checkbox" />
                <span>Share tag</span>
              </label>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="editingTag = null">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete tag?"
      :message="`This will remove '${pendingDelete?.name}' from every item using it.`"
      confirm-label="Delete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
