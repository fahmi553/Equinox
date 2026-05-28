<script setup>
import { onMounted } from 'vue';
import AppPage from '../components/AppPage.vue';
import { createReminder, loadReminders, newReminder, reminders, toggleReminder } from '../stores/equinox';

onMounted(loadReminders);
</script>

<template>
  <AppPage title="Reminders" eyebrow="Family tasks">
    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Reminder List</h3>
        <p>Track what still needs attention.</p>
      </div>
      <div class="form-stack">
        <input v-model="newReminder.title" placeholder="Reminder" />
        <input v-model="newReminder.dueAt" type="datetime-local" />
        <button class="main-button" @click="createReminder">Add reminder</button>
      </div>
      <p v-if="!reminders.length" class="empty-state">No reminders yet.</p>
      <label v-for="reminder in reminders" :key="reminder.id" class="check-row">
        <input :checked="reminder.isCompleted" type="checkbox" @change="toggleReminder(reminder)" />
        <span>{{ reminder.title }}</span>
      </label>
    </section>
  </AppPage>
</template>
