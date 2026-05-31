<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Eclipse, LockKeyhole, UserPlus } from '@lucide/vue';
import { authForm, authLoading, authenticate, authStatus, error, loadAuthStatus } from '../stores/equinox';

const router = useRouter();
const isSetup = computed(() => authStatus.value.setupRequired);
const actionLabel = computed(() => {
  if (authLoading.value) return isSetup.value ? 'Creating owner...' : 'Signing in...';
  return isSetup.value ? 'Create owner account' : 'Login';
});

async function submit() {
  if (await authenticate()) {
    router.push('/dashboard');
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
            <strong>{{ isSetup ? 'Owner setup' : 'Account login' }}</strong>
            <span>{{ isSetup ? 'Public registration closes after setup.' : 'Use an account created by an admin.' }}</span>
          </div>
        </div>
        <input v-if="isSetup" v-model="authForm.displayName" placeholder="Display name" autocomplete="name" />
        <input v-model="authForm.username" placeholder="Username" autocomplete="username" />
        <input
          v-model="authForm.password"
          placeholder="Password"
          type="password"
          :autocomplete="isSetup ? 'new-password' : 'current-password'"
        />
        <button class="main-button" type="submit" :disabled="authLoading">{{ actionLabel }}</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </section>
</template>
