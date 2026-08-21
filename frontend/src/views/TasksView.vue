<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import TagChips from '../components/TagChips.vue';
import {
  bulkDeleteTasks,
  bulkUpdateTasks,
  createTask,
  deleteTask,
  loadTags,
  loadTasks,
  newTask,
  permissions,
  saveTask,
  tags,
  tagsLoading,
  taskError,
  tasks,
  tasksLoading,
  toggleTaskDone,
  toggleTaskShare
} from '../stores/equinox';

const editingTask = ref(null);
const pendingDelete = ref(null);
const pendingBulkDelete = ref(false);
const activeTagId = ref('');
const selectedTaskIds = ref([]);
const titleInput = ref(null);
const route = useRoute();
const priorityRank = { HIGH: 0, NORMAL: 1, LOW: 2 };

function compareTasks(left, right) {
  const priorityDifference = (priorityRank[left.priority] ?? 1) - (priorityRank[right.priority] ?? 1);
  if (priorityDifference) return priorityDifference;

  const leftDueAt = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const rightDueAt = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY;
  if (leftDueAt !== rightDueAt) return leftDueAt - rightDueAt;

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

const todayStart = computed(() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
});

const tomorrowStart = computed(() => {
  const date = new Date(todayStart.value);
  date.setDate(date.getDate() + 1);
  return date;
});

const visibleTasks = computed(() => {
  if (!activeTagId.value) return tasks.value;
  return tasks.value.filter((task) => (task.tags || []).some((tag) => tag.id === activeTagId.value));
});
const activeTasks = computed(() => visibleTasks.value.filter((task) => task.status !== 'DONE'));
const sharedTasks = computed(() => visibleTasks.value.filter((task) => task.isShared));
const editableVisibleTasks = computed(() => visibleTasks.value.filter((task) => task.canEdit));
const selectedEditableTasks = computed(() => editableVisibleTasks.value.filter((task) => selectedTaskIds.value.includes(task.id)));
const overdueTasks = computed(() => activeTasks.value.filter((task) => task.dueAt && new Date(task.dueAt) < todayStart.value).sort(compareTasks));
const todayTasks = computed(() => activeTasks.value.filter((task) => {
  if (!task.dueAt) return false;
  const due = new Date(task.dueAt);
  return due >= todayStart.value && due < tomorrowStart.value;
}).sort(compareTasks));
const upcomingTasks = computed(() => activeTasks.value.filter((task) => !task.dueAt || new Date(task.dueAt) >= tomorrowStart.value).sort(compareTasks));
const doneTasks = computed(() => visibleTasks.value.filter((task) => task.status === 'DONE').sort(compareTasks));

const taskGroups = computed(() => [
  { key: 'overdue', label: 'Overdue', items: overdueTasks.value },
  { key: 'today', label: 'Today', items: todayTasks.value },
  { key: 'upcoming', label: 'Upcoming', items: upcomingTasks.value },
  { key: 'done', label: 'Done', items: doneTasks.value }
]);

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'High', value: 'HIGH' }
];

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Waiting', value: 'WAITING' },
  { label: 'Done', value: 'DONE' }
];

function formatDue(dueAt) {
  if (!dueAt) return 'No due date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dueAt));
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function beginEdit(task) {
  editingTask.value = {
    id: task.id,
    title: task.title,
    details: task.details || '',
    priority: task.priority,
    status: task.status,
    dueAt: toDateInput(task.dueAt),
    isShared: task.isShared,
    tagIds: (task.tags || []).map((tag) => tag.id)
  };
}

async function submitEdit(task) {
  await saveTask(task, editingTask.value);
  editingTask.value = null;
}

function askDelete(task) {
  pendingDelete.value = task;
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const task = pendingDelete.value;
  pendingDelete.value = null;
  await deleteTask(task);
}

function toggleAllVisibleTasks() {
  selectedTaskIds.value = selectedTaskIds.value.length === editableVisibleTasks.value.length
    ? []
    : editableVisibleTasks.value.map((task) => task.id);
}

async function bulkSetShare(isShared) {
  if (!selectedEditableTasks.value.length) return;
  if (await bulkUpdateTasks(selectedEditableTasks.value.map((task) => task.id), { isShared })) {
    selectedTaskIds.value = [];
  }
}

async function bulkSetStatus(status) {
  if (!selectedEditableTasks.value.length) return;
  if (await bulkUpdateTasks(selectedEditableTasks.value.map((task) => task.id), { status })) {
    selectedTaskIds.value = [];
  }
}

async function bulkApplyTag(tagId) {
  if (!selectedEditableTasks.value.length || !tagId) return;
  await Promise.all(selectedEditableTasks.value.map((task) => bulkUpdateTasks([task.id], {
    tagIds: [...new Set([...(task.tags || []).map((tag) => tag.id), tagId])]
  })));
  selectedTaskIds.value = [];
}

function askBulkDelete() {
  if (selectedEditableTasks.value.length) {
    pendingBulkDelete.value = true;
  }
}

async function confirmBulkDelete() {
  const ids = selectedEditableTasks.value.map((task) => task.id);
  pendingBulkDelete.value = false;
  selectedTaskIds.value = [];
  await bulkDeleteTasks(ids);
}

onMounted(async () => {
  await Promise.all([loadTasks(), loadTags()]);
  if (route.query.new === 'task') {
    await nextTick();
    titleInput.value?.focus();
  }
});
</script>

<template>
  <AppPage title="Tasks" eyebrow="To-do board">
    <template #actions>
      <button class="secondary-button" @click="loadTasks">Refresh</button>
    </template>

    <section class="reminder-overview" aria-label="Task overview">
      <article>
        <span>Active</span>
        <strong>{{ activeTasks.length }}</strong>
      </article>
      <article>
        <span>Due today</span>
        <strong>{{ todayTasks.length }}</strong>
      </article>
      <article>
        <span>Overdue</span>
        <strong>{{ overdueTasks.length }}</strong>
      </article>
      <article>
        <span>Shared</span>
        <strong>{{ sharedTasks.length }}</strong>
      </article>
    </section>

    <section class="reminders-workspace">
      <section v-if="permissions.canCreateTasks" class="feature-panel reminder-create-panel">
        <div class="panel-copy">
          <h3>Add Task</h3>
          <p>Create a personal task or share a household to-do with family.</p>
        </div>
        <div class="form-stack">
          <label class="field-label">
            <span>Task title</span>
            <input ref="titleInput" v-model="newTask.title" />
          </label>
          <label class="field-label">
            <span>Details</span>
            <textarea v-model="newTask.details"></textarea>
          </label>
          <div class="document-form-grid">
            <label class="field-label">
              <span>Priority</span>
              <select v-model="newTask.priority">
                <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="field-label">
              <span>Status</span>
              <select v-model="newTask.status">
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="field-label">
              <span>Due date</span>
              <input v-model="newTask.dueAt" type="date" />
            </label>
          </div>
          <label class="share-row">
            <input v-model="newTask.isShared" type="checkbox" />
            <span>Share with family</span>
          </label>
          <div v-if="tags.length" class="tag-picker">
            <label v-for="tag in tags" :key="tag.id">
              <input v-model="newTask.tagIds" type="checkbox" :value="tag.id" />
              <TagChips :tags="[tag]" />
            </label>
          </div>
          <button class="main-button" @click="createTask">Add task</button>
        </div>
        <p v-if="taskError" class="storage-error" role="alert" aria-live="assertive">{{ taskError }}</p>
      </section>
      <section v-else class="feature-panel reminder-create-panel">
        <div class="panel-copy">
          <h3>Add Task</h3>
          <p>This account can read shared tasks but cannot create new tasks.</p>
        </div>
      </section>

      <section class="reminder-board">
        <section v-if="editableVisibleTasks.length" class="feature-panel bulk-toolbar wide">
          <label class="share-row">
            <input
              type="checkbox"
              :checked="selectedTaskIds.length === editableVisibleTasks.length"
              @change="toggleAllVisibleTasks"
            />
            <span>{{ selectedTaskIds.length ? `${selectedTaskIds.length} selected` : 'Select visible tasks' }}</span>
          </label>
          <button type="button" :disabled="!selectedTaskIds.length" @click="bulkSetShare(true)">Share</button>
          <button type="button" :disabled="!selectedTaskIds.length" @click="bulkSetShare(false)">Make private</button>
          <button type="button" :disabled="!selectedTaskIds.length" @click="bulkSetStatus('DONE')">Mark done</button>
          <button type="button" :disabled="!selectedTaskIds.length" @click="bulkSetStatus('OPEN')">Reopen</button>
          <select :disabled="!selectedTaskIds.length" @change="bulkApplyTag($event.target.value); $event.target.value = ''">
            <option value="">Add tag</option>
            <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
          <button type="button" :disabled="!selectedTaskIds.length" @click="askBulkDelete">Delete</button>
        </section>
        <section v-for="group in taskGroups" :key="group.key" class="feature-panel reminder-column">
          <div class="storage-section-title">
            <h4>{{ group.label }}</h4>
            <span>{{ group.items.length }}</span>
          </div>
          <div v-if="group.key === 'overdue' && tags.length" class="tag-filter-row">
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
          <p v-if="tasksLoading || tagsLoading" class="storage-info" role="status" aria-live="polite">Loading tasks...</p>
          <p v-else-if="!group.items.length" class="empty-state">No tasks here.</p>

          <article v-for="task in group.items" :key="task.id" class="reminder-card" :class="{ completed: task.status === 'DONE' }">
            <template v-if="editingTask?.id !== task.id">
              <label v-if="task.canEdit" class="bulk-select">
                <input v-model="selectedTaskIds" type="checkbox" :value="task.id" />
                <span>Select task</span>
              </label>
              <label class="reminder-check">
                <input
                  :checked="task.status === 'DONE'"
                  :disabled="!task.canEdit"
                  type="checkbox"
                  @change="toggleTaskDone(task)"
                />
                <span>
                  <strong>{{ task.title }}</strong>
                  <small>{{ task.priority }} / {{ task.status }} / {{ formatDue(task.dueAt) }} / {{ task.isShared ? 'Shared' : 'Private' }} / {{ task.owner.displayName }}</small>
                </span>
              </label>
              <TagChips v-if="task.tags?.length" :tags="task.tags" />
              <p v-if="task.details">{{ task.details }}</p>

              <div v-if="task.canEdit" class="item-actions">
                <button @click="beginEdit(task)">Edit</button>
                <button @click="toggleTaskShare(task)">{{ task.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="askDelete(task)">Delete</button>
              </div>
              <p v-else class="readonly-note">Read-only shared task</p>
            </template>

            <form v-else class="reminder-edit-form" @submit.prevent="submitEdit(task)">
              <label class="field-label">
                <span>Task title</span>
                <input v-model="editingTask.title" />
              </label>
              <label class="field-label">
                <span>Details</span>
                <textarea v-model="editingTask.details"></textarea>
              </label>
              <div class="document-form-grid">
                <label class="field-label">
                  <span>Priority</span>
                  <select v-model="editingTask.priority">
                    <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label class="field-label">
                  <span>Status</span>
                  <select v-model="editingTask.status">
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <label class="field-label">
                  <span>Due date</span>
                  <input v-model="editingTask.dueAt" type="date" />
                </label>
              </div>
              <label class="share-row">
                <input v-model="editingTask.isShared" type="checkbox" />
                <span>Share with family</span>
              </label>
              <div v-if="tags.length" class="tag-picker">
                <label v-for="tag in tags" :key="tag.id">
                  <input v-model="editingTask.tagIds" type="checkbox" :value="tag.id" />
                  <TagChips :tags="[tag]" />
                </label>
              </div>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="editingTask = null">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete task?"
      :message="`This will permanently delete '${pendingDelete?.title}'.`"
      confirm-label="Delete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
    <ConfirmDialog
      :open="pendingBulkDelete"
      eyebrow="Delete"
      title="Delete selected tasks?"
      :message="`This will delete ${selectedEditableTasks.length} selected task${selectedEditableTasks.length === 1 ? '' : 's'} after the undo window.`"
      confirm-label="Delete selected"
      @cancel="pendingBulkDelete = false"
      @confirm="confirmBulkDelete"
    />
  </AppPage>
</template>
