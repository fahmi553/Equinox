<script setup>
import { computed, onMounted, reactive, watch } from 'vue';
import { Cable, CheckCircle2, Clock3, RefreshCw, Settings2, UserRound } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import {
  adapterContracts,
  isAdmin,
  loadSettings,
  settings,
  settingsError,
  settingsMessage,
  updatePreferences,
  updateSystemSettings
} from '../stores/equinox';

const systemForm = reactive({ platformName: '', householdName: '' });
const preferenceForm = reactive({ startPage: '/dashboard', compactMode: false, dateFormat: 'locale' });
const integrations = computed(() => settings.value?.integrations || []);
const adapters = computed(() => adapterContracts.value?.adapters || []);

watch(settings, (value) => {
  if (!value) return;
  Object.assign(systemForm, value.system || {});
  Object.assign(preferenceForm, value.preferences || {});
}, { immediate: true });

onMounted(loadSettings);
</script>

<template>
  <AppPage title="Settings" eyebrow="Platform preferences">
    <template #actions>
      <button class="secondary-button" @click="loadSettings">
        <RefreshCw :size="17" :stroke-width="2" />
        Refresh
      </button>
    </template>

    <p v-if="settingsMessage" class="success-note">{{ settingsMessage }}</p>
    <p v-if="settingsError" class="storage-error">{{ settingsError }}</p>

    <section class="settings-grid">
      <section class="feature-panel">
        <div class="settings-heading">
          <UserRound :size="24" :stroke-width="1.8" />
          <div class="panel-copy">
            <h3>Your preferences</h3>
            <p>Choose how Equinox opens and how dense the workspace feels on this account.</p>
          </div>
        </div>
        <form class="settings-form" @submit.prevent="updatePreferences(preferenceForm)">
          <label>
            <span>Start page</span>
            <select v-model="preferenceForm.startPage">
              <option value="/dashboard">Dashboard</option>
              <option value="/search">Search</option>
              <option value="/profile">Profile</option>
            </select>
          </label>
          <label>
            <span>Date format</span>
            <select v-model="preferenceForm.dateFormat">
              <option value="locale">Use browser locale</option>
              <option value="day-first">Day first</option>
              <option value="month-first">Month first</option>
            </select>
          </label>
          <label class="settings-check">
            <input v-model="preferenceForm.compactMode" type="checkbox" />
            <span>Use compact workspace spacing</span>
          </label>
          <button class="main-button" type="submit">Save preferences</button>
        </form>
      </section>

      <section v-if="isAdmin" class="feature-panel">
        <div class="settings-heading">
          <Settings2 :size="24" :stroke-width="1.8" />
          <div class="panel-copy">
            <h3>System settings</h3>
            <p>Friendly names shown across the Equinox platform.</p>
          </div>
        </div>
        <form class="settings-form" @submit.prevent="updateSystemSettings(systemForm)">
          <label>
            <span>Platform name</span>
            <input v-model="systemForm.platformName" placeholder="Equinox" />
          </label>
          <label>
            <span>Workspace name</span>
            <input v-model="systemForm.householdName" placeholder="Family Workspace" />
          </label>
          <button class="main-button" type="submit">Save system settings</button>
        </form>
      </section>
    </section>

    <section v-if="isAdmin" class="feature-panel settings-integrations">
      <div class="settings-heading">
        <Cable :size="24" :stroke-width="1.8" />
        <div class="panel-copy">
          <h3>Integration settings</h3>
          <p>Standard adapters are registered now. Capabilities and health are defined before file browsing is built.</p>
        </div>
      </div>
      <article v-for="integration in integrations" :key="integration.key" class="integration-row">
        <div>
          <strong>{{ integration.label }}</strong>
          <span>{{ integration.adapterType }} adapter</span>
        </div>
        <span :class="['module-state', integration.healthState]">
          <Clock3 v-if="integration.healthState === 'planned'" :size="15" :stroke-width="2.1" />
          <CheckCircle2 v-else :size="15" :stroke-width="2.1" />
          {{ integration.healthState }}
        </span>
        <span class="module-locked">{{ integration.capabilities?.length || 0 }} capabilities</span>
      </article>
    </section>

    <section v-if="isAdmin" class="feature-panel settings-integrations">
      <div class="settings-heading">
        <Cable :size="24" :stroke-width="1.8" />
        <div class="panel-copy">
          <h3>Adapter contract</h3>
          <p>These descriptors are the API shape the File Portal will use for local storage, WebDAV, and later NAS services.</p>
        </div>
      </div>
      <article v-for="adapter in adapters" :key="adapter.key" class="integration-row adapter-contract-row">
        <div>
          <strong>{{ adapter.label }}</strong>
          <span>{{ adapter.description }}</span>
        </div>
        <span :class="['module-state', adapter.health.state]">
          {{ adapter.health.state }}
        </span>
        <span class="module-locked">{{ adapter.capabilities.length }} capabilities</span>
      </article>
    </section>
  </AppPage>
</template>
