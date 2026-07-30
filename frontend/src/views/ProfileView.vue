<script setup>
import { computed, onMounted } from 'vue';
import { Bookmark, ListChecks, NotebookText, ShieldCheck, UserRound, UsersRound } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import {
  changePassword,
  loadProfile,
  logoutAllDevices,
  passwordError,
  passwordForm,
  passwordMessage,
  profile,
  profileError,
  profileForm,
  profileLoading,
  profileMessage,
  revokeSession,
  sessions,
  updateProfile
} from '../stores/equinox';

const roleText = computed(() => {
  if (profile.value?.user.role === 'ADMIN') {
    return 'Admin accounts can manage family users and help maintain the shared hub.';
  }
  if (profile.value?.user.role === 'GUEST') {
    return 'Guest accounts are for temporary read-only access to shared family information.';
  }
  if (profile.value?.user.role === 'CHILD') {
    return 'Child accounts can use a simpler set of family productivity tools.';
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

    <p v-if="profileLoading" class="storage-info" role="status" aria-live="polite">Loading profile...</p>

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

        <section class="feature-panel">
          <div class="panel-copy">
            <h3>Profile details</h3>
            <p>Keep your name and username clear for family members.</p>
          </div>
          <form class="family-form" @submit.prevent="updateProfile">
            <label class="field-label">
              <span>Display name</span>
              <input v-model="profileForm.displayName" autocomplete="name" />
            </label>
            <label class="field-label">
              <span>Username</span>
              <input v-model="profileForm.username" autocomplete="username" />
            </label>
            <button class="main-button" type="submit">Save profile</button>
            <p v-if="profileError" class="storage-error" role="alert" aria-live="assertive">{{ profileError }}</p>
            <p v-if="profileMessage" class="success-note" role="status" aria-live="polite">{{ profileMessage }}</p>
          </form>
        </section>

        <section class="feature-panel">
          <div class="panel-copy">
            <h3>Change password</h3>
            <p>Update your password without changing your role or family permissions.</p>
          </div>
          <form class="family-form" @submit.prevent="changePassword">
            <label class="field-label">
              <span>Current password</span>
              <input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" />
            </label>
            <label class="field-label">
              <span>New password</span>
              <input v-model="passwordForm.newPassword" type="password" autocomplete="new-password" />
            </label>
            <label class="field-label">
              <span>Confirm new password</span>
              <input v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" />
            </label>
            <button class="main-button" type="submit">Update password</button>
            <p v-if="passwordError" class="storage-error" role="alert" aria-live="assertive">{{ passwordError }}</p>
            <p v-if="passwordMessage" class="success-note" role="status" aria-live="polite">{{ passwordMessage }}</p>
          </form>
        </section>

        <section class="feature-panel">
          <div class="panel-copy dashboard-panel-heading">
            <div>
              <h3>Active sessions</h3>
              <p>Review signed-in devices and remove sessions you do not recognize.</p>
            </div>
            <button class="secondary-button" @click="logoutAllDevices">Logout all</button>
          </div>
          <p v-if="profileLoading" class="storage-info" role="status" aria-live="polite">Loading sessions...</p>
          <p v-else-if="!sessions.length" class="empty-state">No active sessions.</p>
          <article v-for="session in sessions" :key="session.id" class="session-row">
            <div>
              <strong>{{ session.isCurrent ? 'This device' : 'Signed-in device' }}</strong>
              <span>{{ session.ipAddress }} / {{ session.rememberMe ? 'Remembered' : 'Standard' }}</span>
              <small>{{ session.userAgent }}</small>
            </div>
            <div>
              <span>Expires {{ new Date(session.expiresAt).toLocaleString() }}</span>
              <button class="secondary-button" :disabled="session.isCurrent" @click="revokeSession(session)">Remove</button>
            </div>
          </article>
        </section>

        <section class="profile-metrics">
          <article>
            <NotebookText :size="30" :stroke-width="1.8" />
            <span>Your notes</span>
            <strong>{{ profile.own.notes }}</strong>
          </article>
          <article>
            <ListChecks :size="30" :stroke-width="1.8" />
            <span>Active tasks</span>
            <strong>{{ profile.own.activeTasks }}</strong>
          </article>
          <article>
            <Bookmark :size="30" :stroke-width="1.8" />
            <span>Bookmarks</span>
            <strong>{{ profile.own.bookmarks }}</strong>
          </article>
          <article>
            <UsersRound :size="30" :stroke-width="1.8" />
            <span>Shared with you</span>
            <strong>{{ profile.visible.sharedTotal }}</strong>
          </article>
        </section>

        <section class="feature-panel">
          <div class="panel-copy">
            <h3>Visible to you</h3>
            <p>Your own items plus anything family members shared with you.</p>
          </div>
          <div class="profile-visible-grid">
            <div class="storage-stat">
              <span>Shared notes</span>
              <strong>{{ profile.own.sharedNotes }}</strong>
            </div>
            <div class="storage-stat">
              <span>Shared tasks</span>
              <strong>{{ profile.own.sharedTasks }}</strong>
            </div>
            <div class="storage-stat">
              <span>Shared bookmarks</span>
              <strong>{{ profile.own.sharedBookmarks }}</strong>
            </div>
          </div>
        </section>
      </section>
    </section>
  </AppPage>
</template>
