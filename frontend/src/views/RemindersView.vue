<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  createReminder,
  deleteReminder,
  loadReminders,
  newReminder,
  permissions,
  reminderError,
  reminders,
  toggleReminder,
  toggleReminderShare,
  updateReminder
} from '../stores/equinox';

const editingReminder = ref(null);
const pendingDelete = ref(null);

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

const activeReminders = computed(() => reminders.value.filter((item) => !item.isCompleted));
const sharedReminders = computed(() => reminders.value.filter((item) => item.isShared));

const overdueReminders = computed(() => activeReminders.value.filter((item) => {
  if (!item.dueAt) return false;
  return new Date(item.dueAt) < todayStart.value;
}));

const todayReminders = computed(() => activeReminders.value.filter((item) => {
  if (!item.dueAt) return false;
  const due = new Date(item.dueAt);
  return due >= todayStart.value && due < tomorrowStart.value;
}));

const upcomingReminders = computed(() => activeReminders.value.filter((item) => {
  if (!item.dueAt) return true;
  return new Date(item.dueAt) >= tomorrowStart.value;
}));

const completedReminders = computed(() => reminders.value.filter((item) => item.isCompleted));

const reminderGroups = computed(() => [
  { key: 'overdue', label: 'Overdue', items: overdueReminders.value },
  { key: 'today', label: 'Today', items: todayReminders.value },
  { key: 'upcoming', label: 'Upcoming', items: upcomingReminders.value },
  { key: 'completed', label: 'Completed', items: completedReminders.value }
]);

function formatDue(dueAt) {
  if (!dueAt) return 'No due date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dueAt));
}

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function beginEdit(reminder) {
  editingReminder.value = {
    id: reminder.id,
    title: reminder.title,
    dueAt: toDateTimeInput(reminder.dueAt),
    isShared: reminder.isShared
  };
}

async function saveReminder(reminder) {
  await updateReminder(reminder, {
    title: editingReminder.value.title,
    dueAt: editingReminder.value.dueAt || null,
    isShared: editingReminder.value.isShared
  });
  editingReminder.value = null;
}

function askDelete(reminder) {
  pendingDelete.value = reminder;
}

function cancelDelete() {
  pendingDelete.value = null;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const reminder = pendingDelete.value;
  pendingDelete.value = null;
  await deleteReminder(reminder);
}

onMounted(loadReminders);
</script>

<template>
  <AppPage title="Reminders" eyebrow="Family tasks">
    <section class="reminder-overview" aria-label="Reminder overview">
      <article>
        <span>Active</span>
        <strong>{{ activeReminders.length }}</strong>
      </article>
      <article>
        <span>Due today</span>
        <strong>{{ todayReminders.length }}</strong>
      </article>
      <article>
        <span>Overdue</span>
        <strong>{{ overdueReminders.length }}</strong>
      </article>
      <article>
        <span>Shared</span>
        <strong>{{ sharedReminders.length }}</strong>
      </article>
    </section>

    <section class="reminders-workspace">
      <section v-if="permissions.canCreateReminders" class="feature-panel reminder-create-panel">
        <div class="panel-copy">
          <h3>Add Reminder</h3>
          <p>Create private reminders or share family tasks when everyone should see them.</p>
        </div>
        <div class="form-stack">
          <input v-model="newReminder.title" placeholder="Reminder title" />
          <input v-model="newReminder.dueAt" type="datetime-local" />
          <label class="share-row">
            <input v-model="newReminder.isShared" type="checkbox" />
            <span>Share with family</span>
          </label>
          <button class="main-button" @click="createReminder">Add reminder</button>
        </div>
        <p v-if="reminderError" class="storage-error">{{ reminderError }}</p>
      </section>
      <section v-else class="feature-panel reminder-create-panel">
        <div class="panel-copy">
          <h3>Add Reminder</h3>
          <p>This account can read shared reminders but cannot create new reminders.</p>
        </div>
      </section>

      <section class="reminder-board">
        <section v-for="group in reminderGroups" :key="group.key" class="feature-panel reminder-column">
          <div class="storage-section-title">
            <h4>{{ group.label }}</h4>
            <span>{{ group.items.length }}</span>
          </div>
          <p v-if="!group.items.length" class="empty-state">No reminders here.</p>

          <article v-for="reminder in group.items" :key="reminder.id" class="reminder-card" :class="{ completed: reminder.isCompleted }">
            <template v-if="editingReminder?.id !== reminder.id">
              <label class="reminder-check">
                <input
                  :checked="reminder.isCompleted"
                  :disabled="!reminder.canEdit"
                  type="checkbox"
                  @change="toggleReminder(reminder)"
                />
                <span>
                  <strong>{{ reminder.title }}</strong>
                  <small>{{ formatDue(reminder.dueAt) }} / {{ reminder.isShared ? 'Shared' : 'Private' }} / {{ reminder.owner.displayName }}</small>
                </span>
              </label>

              <div v-if="reminder.canEdit" class="item-actions">
                <button @click="beginEdit(reminder)">Edit</button>
                <button @click="toggleReminderShare(reminder)">{{ reminder.isShared ? 'Make private' : 'Share' }}</button>
                <button @click="askDelete(reminder)">Delete</button>
              </div>
              <p v-else class="readonly-note">Read-only shared reminder</p>
            </template>

            <form v-else class="reminder-edit-form" @submit.prevent="saveReminder(reminder)">
              <input v-model="editingReminder.title" placeholder="Reminder title" />
              <input v-model="editingReminder.dueAt" type="datetime-local" />
              <label class="share-row">
                <input v-model="editingReminder.isShared" type="checkbox" />
                <span>Share with family</span>
              </label>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="editingReminder = null">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete reminder?"
      :message="`This will permanently delete '${pendingDelete?.title}'.`"
      confirm-label="Delete"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
