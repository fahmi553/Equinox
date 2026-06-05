<script setup>
import { computed, onMounted, ref } from 'vue';
import { ShieldCheck, UserPlus, UsersRound } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  announcementError,
  announcements,
  createAnnouncement,
  createFamilyUser,
  deleteAnnouncement,
  familyError,
  familyMessage,
  familyUsers,
  loadAnnouncements,
  loadFamilyUsers,
  loadRolePermissions,
  newAnnouncement,
  rolePermissions,
  saveAnnouncement,
  toggleAnnouncementPin,
  resetFamilyUserPassword,
  updateFamilyUser,
  updateRolePermissions,
  updateUserPermissions,
  newFamilyUser,
  user
} from '../stores/equinox';

const editingAnnouncement = ref(null);
const pendingDeleteAnnouncement = ref(null);
const editingMember = ref(null);
const passwordReset = ref({ userId: '', password: '' });
const adminCount = computed(() => familyUsers.value.filter((item) => item.role === 'ADMIN').length);
const familyCount = computed(() => familyUsers.value.filter((item) => item.role === 'FAMILY').length);
const guestCount = computed(() => familyUsers.value.filter((item) => item.role === 'GUEST').length);
const childCount = computed(() => familyUsers.value.filter((item) => item.role === 'CHILD').length);
const roleOptions = [
  { value: 'FAMILY', label: 'Family' },
  { value: 'CHILD', label: 'Child' },
  { value: 'GUEST', label: 'Guest' },
  { value: 'ADMIN', label: 'Admin' }
];
const permissionOptions = [
  { key: 'canCreateNotes', label: 'Create notes' },
  { key: 'canCreateTasks', label: 'Create tasks' },
  { key: 'canCreateTags', label: 'Create tags' },
  { key: 'canCreateBookmarks', label: 'Create bookmarks' },
  { key: 'canUseChat', label: 'Use chat' },
  { key: 'canViewAnnouncements', label: 'View announcements' }
];

function joinedDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function memberPermission(member, key) {
  return member.permissions?.[key] !== false;
}

function memberOverride(member, key) {
  return member.permissionOverrides?.[key] ?? null;
}

function memberPermissionLabel(member, key) {
  const override = memberOverride(member, key);
  if (override === true) return 'Allowed override';
  if (override === false) return 'Blocked override';
  return memberPermission(member, key) ? 'Role allows' : 'Role blocks';
}

async function toggleMemberPermission(member, key) {
  await updateUserPermissions(member, {
    [key]: memberOverride(member, key) === null ? !memberPermission(member, key) : null
  });
}

async function toggleRolePermission(roleItem, key) {
  await updateRolePermissions(roleItem.role, {
    ...roleItem.permissions,
    [key]: !roleItem.permissions[key]
  });
}

function beginMemberEdit(member) {
  editingMember.value = {
    id: member.id,
    displayName: member.displayName,
    username: member.username,
    role: member.role
  };
}

async function submitMemberEdit(member) {
  const saved = await updateFamilyUser(member, editingMember.value);
  if (saved) {
    editingMember.value = null;
  }
}

function beginPasswordReset(member) {
  passwordReset.value = { userId: member.id, password: '' };
}

async function submitPasswordReset(member) {
  const saved = await resetFamilyUserPassword(member, passwordReset.value.password);
  if (saved) {
    passwordReset.value = { userId: '', password: '' };
  }
}

function beginAnnouncementEdit(announcement) {
  editingAnnouncement.value = {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    isPinned: announcement.isPinned,
    expiresAt: toDateInput(announcement.expiresAt)
  };
}

async function submitAnnouncementEdit(announcement) {
  await saveAnnouncement(announcement, editingAnnouncement.value);
  editingAnnouncement.value = null;
}

function askDeleteAnnouncement(announcement) {
  pendingDeleteAnnouncement.value = announcement;
}

function cancelDeleteAnnouncement() {
  pendingDeleteAnnouncement.value = null;
}

async function confirmDeleteAnnouncement() {
  if (!pendingDeleteAnnouncement.value) return;
  const announcement = pendingDeleteAnnouncement.value;
  pendingDeleteAnnouncement.value = null;
  await deleteAnnouncement(announcement);
}

onMounted(async () => {
  await Promise.all([loadRolePermissions(), loadFamilyUsers(), loadAnnouncements(true)]);
});
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
        <div class="storage-stat">
          <span>Children</span>
          <strong>{{ childCount }}</strong>
        </div>
        <div class="storage-stat">
          <span>Guests</span>
          <strong>{{ guestCount }}</strong>
        </div>
        <div class="storage-stat">
          <span>Role defaults</span>
          <strong>{{ rolePermissions.length }}</strong>
        </div>
      </aside>

      <section class="feature-panel family-main">
        <section class="storage-section">
          <div class="storage-section-title">
            <h4>Role defaults</h4>
            <span>{{ rolePermissions.length }}</span>
          </div>
          <div class="role-permission-list">
            <article v-for="roleItem in rolePermissions" :key="roleItem.role" class="role-permission-card">
              <div>
                <h4>{{ roleItem.role }}</h4>
                <p>New and inherited permissions for this role.</p>
              </div>
              <div class="permission-strip role-defaults">
                <button
                  v-for="option in permissionOptions"
                  :key="option.key"
                  :class="['permission-toggle', { active: roleItem.permissions[option.key] }]"
                  type="button"
                  @click="toggleRolePermission(roleItem, option.key)"
                >
                  {{ option.label }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <div class="storage-toolbar">
          <div class="panel-copy">
            <h3>Create family account</h3>
            <p>Add a login. New accounts inherit their selected role permissions.</p>
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
            <option v-for="role in roleOptions" :key="role.value" :value="role.value">{{ role.label }}</option>
          </select>
          <button class="main-button" type="submit">Create account</button>
          <p v-if="familyError" class="storage-error">{{ familyError }}</p>
          <p v-if="familyMessage" class="success-note">{{ familyMessage }}</p>
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
              <div v-if="editingMember?.id !== member.id">
                <h4>{{ member.displayName }}</h4>
                <p>
                  @{{ member.username }} / Joined {{ joinedDate(member.createdAt) }}
                </p>
              </div>
              <form v-else class="account-edit-form" @submit.prevent="submitMemberEdit(member)">
                <input v-model="editingMember.displayName" placeholder="Display name" />
                <input v-model="editingMember.username" placeholder="Username" />
                <select v-model="editingMember.role">
                  <option v-for="role in roleOptions" :key="role.value" :value="role.value">{{ role.label }}</option>
                </select>
                <div class="item-actions">
                  <button type="submit">Save</button>
                  <button type="button" @click="editingMember = null">Cancel</button>
                </div>
              </form>
              <strong :class="['role-pill', member.role.toLowerCase()]">{{ member.role }}</strong>
              <div class="item-actions account-actions">
                <button v-if="editingMember?.id !== member.id" @click="beginMemberEdit(member)">Edit account</button>
                <button v-if="passwordReset.userId !== member.id" @click="beginPasswordReset(member)">Reset password</button>
              </div>
              <form v-if="passwordReset.userId === member.id" class="password-reset-form" @submit.prevent="submitPasswordReset(member)">
                <input v-model="passwordReset.password" type="password" placeholder="New temporary password" autocomplete="new-password" />
                <button type="submit">Save password</button>
                <button type="button" @click="passwordReset = { userId: '', password: '' }">Cancel</button>
              </form>
              <div class="permission-strip">
                <button
                  v-for="option in permissionOptions"
                  :key="option.key"
                  :class="[
                    'permission-toggle',
                    {
                      active: memberPermission(member, option.key),
                      override: memberOverride(member, option.key) !== null
                    }
                  ]"
                  type="button"
                  @click="toggleMemberPermission(member, option.key)"
                >
                  {{ option.label }}
                  <small>{{ memberPermissionLabel(member, option.key) }}</small>
                </button>
              </div>
            </article>
          </div>
        </section>

        <section class="family-announcements">
          <div class="storage-section-title">
            <h4>Announcements</h4>
            <span>{{ announcements.length }}</span>
          </div>

          <form class="announcement-form" @submit.prevent="createAnnouncement">
            <input v-model="newAnnouncement.title" placeholder="Announcement title" />
            <textarea v-model="newAnnouncement.body" placeholder="Message for the family"></textarea>
            <div class="announcement-options">
              <label class="share-row">
                <input v-model="newAnnouncement.isPinned" type="checkbox" />
                <span>Pin announcement</span>
              </label>
              <input v-model="newAnnouncement.expiresAt" type="date" />
            </div>
            <button class="main-button" type="submit">Post announcement</button>
            <p v-if="announcementError" class="storage-error">{{ announcementError }}</p>
          </form>

          <p v-if="!announcements.length" class="empty-state">No announcements yet.</p>
          <article v-for="announcement in announcements" :key="announcement.id" class="announcement-card">
            <template v-if="editingAnnouncement?.id !== announcement.id">
              <div class="announcement-card-heading">
                <span v-if="announcement.isPinned">Pinned</span>
                <strong>{{ announcement.title }}</strong>
              </div>
              <p>{{ announcement.body }}</p>
              <small>
                Posted by {{ announcement.author.displayName }}
                <span v-if="announcement.expiresAt"> / Expires {{ new Date(announcement.expiresAt).toLocaleDateString() }}</span>
              </small>
              <div class="item-actions">
                <button @click="beginAnnouncementEdit(announcement)">Edit</button>
                <button @click="toggleAnnouncementPin(announcement)">{{ announcement.isPinned ? 'Unpin' : 'Pin' }}</button>
                <button @click="askDeleteAnnouncement(announcement)">Delete</button>
              </div>
            </template>

            <form v-else class="announcement-form compact" @submit.prevent="submitAnnouncementEdit(announcement)">
              <input v-model="editingAnnouncement.title" placeholder="Announcement title" />
              <textarea v-model="editingAnnouncement.body" placeholder="Message for the family"></textarea>
              <div class="announcement-options">
                <label class="share-row">
                  <input v-model="editingAnnouncement.isPinned" type="checkbox" />
                  <span>Pin announcement</span>
                </label>
                <input v-model="editingAnnouncement.expiresAt" type="date" />
              </div>
              <div class="item-actions">
                <button type="submit">Save</button>
                <button type="button" @click="editingAnnouncement = null">Cancel</button>
              </div>
            </form>
          </article>
        </section>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDeleteAnnouncement)"
      eyebrow="Delete"
      title="Delete announcement?"
      :message="`This will permanently delete '${pendingDeleteAnnouncement?.title}'.`"
      confirm-label="Delete"
      @cancel="cancelDeleteAnnouncement"
      @confirm="confirmDeleteAnnouncement"
    />
  </AppPage>
</template>
