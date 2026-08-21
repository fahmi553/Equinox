<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { FileUp, ListChecks, NotebookText, Search, Upload } from '@lucide/vue';
import { useRouter } from 'vue-router';
import {
  globalSearchQuery,
  isAdmin,
  isAuthed,
  isModuleEnabled,
  permissions,
  searchEverything
} from '../stores/equinox';

const router = useRouter();
const open = ref(false);
const query = ref('');
const inputRef = ref(null);

const commands = computed(() => [
  { id: 'dashboard', label: 'Open Dashboard', detail: 'Go to family overview', path: '/dashboard', moduleKey: 'dashboard', icon: Search },
  { id: 'search', label: 'Search Equinox', detail: 'Search notes, tasks, files, and bookmarks', path: '/search', moduleKey: 'search', icon: Search },
  { id: 'note', label: 'Create Note', detail: 'Open notes and focus the create form', path: '/notes?new=note', moduleKey: 'notes', permissionKey: 'canCreateNotes', icon: NotebookText },
  { id: 'task', label: 'Create Task', detail: 'Open tasks and focus the create form', path: '/tasks?new=task', moduleKey: 'tasks', permissionKey: 'canCreateTasks', icon: ListChecks },
  { id: 'upload', label: 'Upload File', detail: 'Open the file upload panel', path: '/files?upload=true', moduleKey: 'storage', icon: Upload },
  { id: 'bookmarks', label: 'Open Bookmarks', detail: 'Saved family links', path: '/bookmarks', moduleKey: 'bookmarks', icon: FileUp },
  { id: 'family', label: 'Manage Family', detail: 'Users, roles, and announcements', path: '/family', adminOnly: true, icon: Search }
].filter((command) => (
  isAuthed.value
  && (!command.moduleKey || isModuleEnabled(command.moduleKey))
  && (!command.permissionKey || permissions.value[command.permissionKey])
  && (!command.adminOnly || isAdmin.value)
)));

const visibleCommands = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return commands.value;
  return commands.value.filter((command) => (
    command.label.toLowerCase().includes(needle)
    || command.detail.toLowerCase().includes(needle)
  ));
});

async function showPalette() {
  if (!isAuthed.value) return;
  open.value = true;
  await nextTick();
  inputRef.value?.focus();
}

function closePalette() {
  open.value = false;
  query.value = '';
}

async function runCommand(command) {
  await router.push(command.path);
  closePalette();
}

async function runSearch() {
  const term = query.value.trim();
  if (!term) return;
  globalSearchQuery.value = term;
  await router.push('/search');
  await searchEverything();
  closePalette();
}

function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (open.value) {
      closePalette();
    } else {
      void showPalette();
    }
  }
  if (event.key === 'Escape' && open.value) {
    closePalette();
  }
}

watch(isAuthed, (value) => {
  if (!value) closePalette();
});

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <button v-if="isAuthed" class="command-button" type="button" title="Command palette" @click="showPalette">
    <Search :size="18" :stroke-width="2" />
    <span>Ctrl K</span>
  </button>

  <div v-if="open" class="command-backdrop" role="presentation" @click.self="closePalette">
    <section class="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
      <div class="command-search">
        <Search :size="20" :stroke-width="2" />
        <label class="field-label">
          <span id="command-palette-title">Command palette</span>
          <input ref="inputRef" v-model="query" placeholder="Search or run a command" @keydown.enter.prevent="visibleCommands[0] ? runCommand(visibleCommands[0]) : runSearch()" />
        </label>
      </div>

      <div class="command-list">
        <button v-for="command in visibleCommands" :key="command.id" type="button" @click="runCommand(command)">
          <component :is="command.icon" :size="18" :stroke-width="2" />
          <span>
            <strong>{{ command.label }}</strong>
            <small>{{ command.detail }}</small>
          </span>
        </button>
        <button v-if="query.trim()" type="button" @click="runSearch">
          <Search :size="18" :stroke-width="2" />
          <span>
            <strong>Search for "{{ query.trim() }}"</strong>
            <small>Run a full global search</small>
          </span>
        </button>
        <p v-if="!visibleCommands.length && !query.trim()" class="empty-state">No commands available.</p>
      </div>
    </section>
  </div>
</template>
