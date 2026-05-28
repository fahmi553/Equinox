<script setup>
import { onMounted } from 'vue';
import AppPage from '../components/AppPage.vue';
import { createNote, loadNotes, newNote, notes } from '../stores/equinox';

onMounted(loadNotes);
</script>

<template>
  <AppPage title="Notes" eyebrow="Quick memory">
    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Personal Notes</h3>
        <p>Capture quick private notes for your household.</p>
      </div>
      <div class="form-stack">
        <input v-model="newNote.title" placeholder="Title" />
        <textarea v-model="newNote.body" placeholder="Write a note"></textarea>
        <button class="main-button" @click="createNote">Add note</button>
      </div>
      <p v-if="!notes.length" class="empty-state">No notes yet.</p>
      <article v-for="note in notes" :key="note.id" class="listing-row">
        <img :src="'/template-assets/images/listing-01.jpg'" alt="" />
        <div>
          <h4>{{ note.title }}</h4>
          <p>{{ note.body || 'No details yet.' }}</p>
        </div>
      </article>
    </section>
  </AppPage>
</template>
