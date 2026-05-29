<script setup>
import { computed, onMounted } from 'vue';
import { FolderOpen, HardDrive, NotebookText, ShieldCheck, UserRound } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import { formatBytes, loadProfile, profile } from '../stores/equinox';

const roleText = computed(() => {
  if (profile.value?.user.role === 'ADMIN') {
    return 'Admin accounts can manage family users and help maintain the shared hub.';
  }

  return 'Family accounts can use their own private space and view shared family items.';
});

function joinedDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

onMounted(loadProfile);
</script>

<template>
  <AppPage title="Profile" eyebrow="Your account">
    <template #actions>
      <button class="secondary-button" @click="loadProfile">Refresh</button>
    </template>

    <section v-if="profile" class="profile-workspace">
      <aside class="storage-sidebar">
        <div class="profile-avatar" aria-hidden="true">
          <UserRound :size="42" :stroke-width="1.7" />
        </div>
        <div class="panel-copy">
          <h3>{{ profile.user.displayName }}</h3>
          <p>@{{ profile.user.username }}</p>
        </div>
        <div class="storage-stat">
          <span>Role</span>
          <strong>{{ profile.user.role }}</strong>
        </div>
        <div class="storage-stat">
          <span>Joined</span>
          <strong>{{ joinedDate(profile.user.createdAt) }}</strong>
        </div>
      </aside>

      <section class="profile-main">
        <section class="feature-panel">
          <div class="profile-role">
            <ShieldCheck :size="34" :stroke-width="1.7" />
            <div>
              <h3>{{ profile.user.role === 'ADMIN' ? 'Admin access' : 'Family access' }}</h3>
              <p>{{ roleText }}</p>
            </div>
          </div>
        </section>

        <section class="profile-metrics">
          <article>
            <HardDrive :size="30" :stroke-width="1.8" />
            <span>Your storage</span>
            <strong>{{ formatBytes(profile.own.storageBytes) }}</strong>
          </article>
          <article>
            <FolderOpen :size="30" :stroke-width="1.8" />
            <span>Your files</span>
            <strong>{{ profile.own.files }}</strong>
          </article>
          <article>
            <FolderOpen :size="30" :stroke-width="1.8" />
            <span>Your folders</span>
            <strong>{{ profile.own.folders }}</strong>
          </article>
          <article>
            <NotebookText :size="30" :stroke-width="1.8" />
            <span>Notes</span>
            <strong>{{ profile.own.notes }}</strong>
          </article>
        </section>

        <section class="feature-panel">
          <div class="panel-copy">
            <h3>Visible to you</h3>
            <p>Your own items plus anything family members shared with you.</p>
          </div>
          <div class="profile-visible-grid">
            <div class="storage-stat">
              <span>Accessible files</span>
              <strong>{{ profile.accessible.files }}</strong>
            </div>
            <div class="storage-stat">
              <span>Accessible folders</span>
              <strong>{{ profile.accessible.folders }}</strong>
            </div>
            <div class="storage-stat">
              <span>Active reminders</span>
              <strong>{{ profile.own.activeReminders }}</strong>
            </div>
          </div>
        </section>

        <section class="feature-panel">
          <div class="panel-copy">
            <h3>Shared with you</h3>
            <p>Recent files owned by family members that your account can open.</p>
          </div>
          <p v-if="!profile.sharedWithMe.length" class="empty-state">No shared files from family yet.</p>
          <article v-for="file in profile.sharedWithMe" :key="file.id" class="shared-file-row">
            <div>
              <h4>{{ file.originalName }}</h4>
              <p>{{ formatBytes(file.size) }} / {{ file.folderPath }} / {{ file.owner.displayName }}</p>
            </div>
          </article>
        </section>
      </section>
    </section>
  </AppPage>
</template>
