<script setup>
import { onMounted } from 'vue';
import { Bell, CheckCheck, MessageCircle, Megaphone } from '@lucide/vue';
import AppPage from '../components/AppPage.vue';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifications,
  unreadNotificationCount
} from '../stores/equinox';

const iconMap = {
  ANNOUNCEMENT: Megaphone,
  CHAT: MessageCircle
};

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

async function openNotification(notification) {
  await markNotificationRead(notification);
}

onMounted(loadNotifications);
</script>

<template>
  <AppPage title="Notifications" eyebrow="Personal updates">
    <template #actions>
      <button class="secondary-button" :disabled="!unreadNotificationCount" @click="markAllNotificationsRead">
        <CheckCheck :size="18" :stroke-width="2" />
        <span>Mark all read</span>
      </button>
    </template>

    <section class="feature-panel notification-panel">
      <div class="panel-copy">
        <h3>Your Notifications</h3>
        <p>New family chat messages and announcements appear here for your account.</p>
      </div>
      <p v-if="!notifications.length" class="empty-state">No notifications yet.</p>
      <RouterLink
        v-for="notification in notifications"
        :key="notification.id"
        :to="notification.link || '/notifications'"
        :class="['notification-row', { unread: !notification.isRead }]"
        @click="openNotification(notification)"
      >
        <span class="notification-icon">
          <component :is="iconMap[notification.type] || Bell" :size="20" :stroke-width="1.9" />
        </span>
        <span>
          <strong>{{ notification.title }}</strong>
          <small>{{ notification.body }}</small>
        </span>
        <time>{{ formatTime(notification.createdAt) }}</time>
      </RouterLink>
    </section>
  </AppPage>
</template>
