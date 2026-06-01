<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { MessageCircle, Send, Trash2, UserRound } from '@lucide/vue';
import { useRoute } from 'vue-router';
import AppPage from '../components/AppPage.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  chatError,
  chatMessages,
  chatUsers,
  deleteChatMessage,
  isAdmin,
  loadChatMessages,
  loadChatUsers,
  newChatMessage,
  selectedChatUserId,
  sendChatMessage,
  user
} from '../stores/equinox';

const chatList = ref(null);
const pendingDelete = ref(null);
const route = useRoute();
let refreshTimer;

const canSend = computed(() => Boolean(newChatMessage.value.trim()));
const selectedChatUser = computed(() => chatUsers.value.find((member) => member.id === selectedChatUserId.value));
const conversationTitle = computed(() => selectedChatUser.value?.displayName || 'Household Chat');
const conversationCopy = computed(() => selectedChatUser.value
  ? `A private conversation with ${selectedChatUser.value.displayName}.`
  : 'A shared conversation for everyone signed in to Equinox.');

function isOwnMessage(message) {
  return message.authorId === user.value.id;
}

function canDelete(message) {
  return isAdmin.value || isOwnMessage(message);
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

async function scrollToLatest() {
  await nextTick();
  if (chatList.value) {
    chatList.value.scrollTop = chatList.value.scrollHeight;
  }
}

async function refreshChat(scroll = false) {
  await loadChatMessages();
  if (scroll) await scrollToLatest();
}

async function submitMessage() {
  if (await sendChatMessage()) {
    await scrollToLatest();
  }
}

async function selectConversation(memberId = '') {
  selectedChatUserId.value = memberId;
  await refreshChat(true);
}

function askDelete(message) {
  pendingDelete.value = message;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  const message = pendingDelete.value;
  pendingDelete.value = null;
  await deleteChatMessage(message);
}

onMounted(async () => {
  await loadChatUsers();
  if (typeof route.query.user === 'string' && chatUsers.value.some((member) => member.id === route.query.user)) {
    selectedChatUserId.value = route.query.user;
  }
  await refreshChat(true);
  refreshTimer = window.setInterval(() => refreshChat(), 8000);
});

onUnmounted(() => window.clearInterval(refreshTimer));

watch(() => route.query.user, async (memberId) => {
  if (typeof memberId === 'string' && chatUsers.value.some((member) => member.id === memberId)) {
    await selectConversation(memberId);
  }
});
</script>

<template>
  <AppPage title="Chat" eyebrow="Family messages">
    <template #actions>
      <button class="secondary-button" @click="refreshChat()">Refresh</button>
    </template>

    <section class="chat-workspace">
      <aside class="chat-conversations">
        <div class="panel-copy">
          <h3>Conversations</h3>
          <p>Choose the household room or message one person privately.</p>
        </div>
        <button :class="{ active: !selectedChatUserId }" @click="selectConversation()">
          <MessageCircle :size="19" :stroke-width="1.9" />
          <span>
            <strong>Household</strong>
            <small>Everyone</small>
          </span>
        </button>
        <button
          v-for="member in chatUsers"
          :key="member.id"
          :class="{ active: selectedChatUserId === member.id }"
          @click="selectConversation(member.id)"
        >
          <UserRound :size="19" :stroke-width="1.9" />
          <span>
            <strong>{{ member.displayName }}</strong>
            <small>@{{ member.username }}</small>
          </span>
        </button>
      </aside>

      <section class="chat-shell">
      <div class="chat-heading">
        <div>
          <h3>{{ conversationTitle }}</h3>
          <p>{{ conversationCopy }}</p>
        </div>
        <span>{{ chatMessages.length }} messages</span>
      </div>

      <div ref="chatList" class="chat-message-list" aria-live="polite">
        <p v-if="!chatMessages.length" class="empty-state">No messages yet. Start the conversation.</p>
        <article
          v-for="message in chatMessages"
          :key="message.id"
          :class="['chat-message', { own: isOwnMessage(message) }]"
        >
          <div class="chat-message-meta">
            <strong>{{ isOwnMessage(message) ? 'You' : message.author.displayName }}</strong>
            <span>{{ formatTime(message.createdAt) }}</span>
          </div>
          <p>{{ message.body }}</p>
          <button v-if="canDelete(message)" title="Delete message" @click="askDelete(message)">
            <Trash2 :size="15" :stroke-width="2" />
          </button>
        </article>
      </div>

      <form class="chat-compose" @submit.prevent="submitMessage">
        <textarea v-model="newChatMessage" maxlength="1200" placeholder="Write a family message"></textarea>
        <button class="main-button" type="submit" :disabled="!canSend">
          <Send :size="18" :stroke-width="2" />
          <span>Send</span>
        </button>
      </form>
      <p v-if="chatError" class="storage-error">{{ chatError }}</p>
      </section>
    </section>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      eyebrow="Delete"
      title="Delete chat message?"
      message="This message will be permanently removed from the conversation."
      confirm-label="Delete message"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
