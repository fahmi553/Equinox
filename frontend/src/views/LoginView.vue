<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Eclipse, LockKeyhole, UserPlus } from '@lucide/vue';
import {
  authForm,
  authLoading,
  authMode,
  authenticate,
  authStatus,
  confirmPasswordReset,
  defaultStartPage,
  error,
  loadAuthStatus,
  requestPasswordReset,
  resetCode,
  resetForm,
  resetMessage
} from '../stores/equinox';

const router = useRouter();
const isSetup = computed(() => authStatus.value.setupRequired);
const isResetRequest = computed(() => authMode.value === 'reset-request');
const isResetConfirm = computed(() => authMode.value === 'reset-confirm');
const actionLabel = computed(() => {
  if (isResetRequest.value) return authLoading.value ? 'Creating code...' : 'Create reset code';
  if (isResetConfirm.value) return authLoading.value ? 'Resetting...' : 'Reset password';
  if (authLoading.value) return isSetup.value ? 'Creating owner...' : 'Signing in...';
  return isSetup.value ? 'Create owner account' : 'Login';
});

async function submit() {
  if (isResetRequest.value) {
    await requestPasswordReset();
    return;
  }

  if (isResetConfirm.value) {
    await confirmPasswordReset();
    return;
  }

  if (await authenticate()) {
    router.push(defaultStartPage.value);
  }
}

onMounted(loadAuthStatus);
</script>

<template>
  <section class="main-banner">
    <div class="banner-content">
      <span class="hero-logo" aria-hidden="true">
        <Eclipse :size="66" :stroke-width="1.6" />
      </span>
      <p class="overline">{{ isSetup ? 'First-run setup' : 'Private access' }}</p>
      <h1>{{ isSetup ? 'Create the Equinox owner account' : 'Welcome back to Equinox' }}</h1>
      <p class="hero-copy">
        {{ isSetup
          ? 'Set up the first admin account. After this, new users are added from Family management.'
          : 'Sign in to your family ecosystem, productivity tools, and service portal.' }}
      </p>

      <form id="access" class="search-panel auth-form" @submit.prevent="submit">
        <div class="auth-state-card">
          <UserPlus v-if="isSetup" :size="24" :stroke-width="1.9" />
          <LockKeyhole v-else :size="24" :stroke-width="1.9" />
          <div>
            <strong>{{ isSetup ? 'Owner setup' : isResetRequest || isResetConfirm ? 'Password reset' : 'Account login' }}</strong>
            <span>
              {{ isSetup
                ? 'Public registration closes after setup.'
                : isResetRequest || isResetConfirm
                  ? 'Use a short-lived recovery code to set a new password.'
                  : 'Use an account created by an admin.' }}
            </span>
          </div>
        </div>
        <template v-if="isResetRequest">
          <label class="field-label">
            <span>Username</span>
            <input v-model="resetForm.username" autocomplete="username" />
          </label>
        </template>
        <template v-else-if="isResetConfirm">
          <label class="field-label">
            <span>Username</span>
            <input v-model="resetForm.username" autocomplete="username" />
          </label>
          <label class="field-label">
            <span>Reset code</span>
            <input v-model="resetForm.code" autocomplete="one-time-code" />
          </label>
          <label class="field-label">
            <span>New password</span>
            <input v-model="resetForm.password" type="password" autocomplete="new-password" />
          </label>
        </template>
        <template v-else>
          <label v-if="isSetup" class="field-label">
            <span>Display name</span>
            <input v-model="authForm.displayName" autocomplete="name" />
          </label>
          <label class="field-label">
            <span>Username</span>
            <input v-model="authForm.username" autocomplete="username" />
          </label>
          <label class="field-label">
            <span>Password</span>
            <input
              v-model="authForm.password"
              type="password"
              :autocomplete="isSetup ? 'new-password' : 'current-password'"
            />
          </label>
          <label class="share-row auth-remember-row">
            <input v-model="authForm.rememberMe" type="checkbox" />
            <span>Remember this device</span>
          </label>
        </template>
        <p v-if="resetCode" class="reset-code-box" role="status" aria-live="polite">{{ resetCode }}</p>
        <p v-if="resetMessage" class="success-message" role="status" aria-live="polite">{{ resetMessage }}</p>
        <button class="main-button" type="submit" :disabled="authLoading">{{ actionLabel }}</button>
        <button
          v-if="!isSetup && !isResetRequest && !isResetConfirm"
          class="secondary-button"
          type="button"
          @click="authMode = 'reset-request'; resetForm.username = authForm.username"
        >
          Forgot password
        </button>
        <button
          v-if="isResetRequest || isResetConfirm"
          class="secondary-button"
          type="button"
          @click="authMode = 'login'"
        >
          Back to login
        </button>
        <p v-if="error" class="error" role="alert" aria-live="assertive">{{ error }}</p>
      </form>
    </div>
  </section>
</template>
