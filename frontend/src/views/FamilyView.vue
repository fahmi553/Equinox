<script setup>
import { computed, onMounted } from 'vue';
import { ShieldCheck, UserPlus, UsersRound } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import {
  createFamilyUser,
  familyError,
  familyUsers,
  loadFamilyUsers,
  newFamilyUser,
  user
} from '../stores/equinox';

const adminCount = computed(() => familyUsers.value.filter((item) => item.role === 'ADMIN').length);
const familyCount = computed(() => familyUsers.value.filter((item) => item.role === 'FAMILY').length);

function joinedDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

onMounted(loadFamilyUsers);
</script>

<template>
  <AppPage title="Family" eyebrow="Account management">
    <template #actions>
      <button class="secondary-button" @click="loadFamilyUsers">Refresh</button>
    </template>

    <section class="family-workspace">
      <aside class="storage-sidebar">
        <div class="panel-copy">
          <h3>Accounts</h3>
          <p>{{ user.displayName }} is managing family access.</p>
        </div>

        <div class="storage-stat">
          <span>Total users</span>
          <strong>{{ familyUsers.length }}</strong>
        </div>
        <div class="storage-stat">
          <span>Admins</span>
          <strong>{{ adminCount }}</strong>
        </div>
        <div class="storage-stat">
          <span>Family</span>
          <strong>{{ familyCount }}</strong>
        </div>
      </aside>

      <section class="feature-panel family-main">
        <div class="storage-toolbar">
          <div class="panel-copy">
            <h3>Create family account</h3>
            <p>Add a login for someone who should use the private hub.</p>
          </div>
          <div class="family-heading-icon" aria-hidden="true">
            <UserPlus :size="30" :stroke-width="1.8" />
          </div>
        </div>

        <form class="family-form" @submit.prevent="createFamilyUser">
          <input v-model="newFamilyUser.displayName" placeholder="Display name" autocomplete="name" />
          <input v-model="newFamilyUser.username" placeholder="Username" autocomplete="username" />
          <input v-model="newFamilyUser.password" placeholder="Temporary password" type="password" autocomplete="new-password" />
          <select v-model="newFamilyUser.role">
            <option value="FAMILY">Family</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button class="main-button" type="submit">Create account</button>
          <p v-if="familyError" class="storage-error">{{ familyError }}</p>
        </form>

        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Users</h4>
            <span>{{ familyUsers.length }}</span>
          </div>
          <p v-if="!familyUsers.length" class="empty-state">No family accounts yet.</p>
          <div v-else class="user-list">
            <article v-for="member in familyUsers" :key="member.id" class="user-row">
              <div class="user-avatar" aria-hidden="true">
                <ShieldCheck v-if="member.role === 'ADMIN'" :size="24" :stroke-width="1.9" />
                <UsersRound v-else :size="24" :stroke-width="1.9" />
              </div>
              <div>
                <h4>{{ member.displayName }}</h4>
                <p>@{{ member.username }} / Joined {{ joinedDate(member.createdAt) }}</p>
              </div>
              <strong :class="['role-pill', member.role.toLowerCase()]">{{ member.role }}</strong>
            </article>
          </div>
        </section>
      </section>
    </section>
  </AppPage>
</template>
