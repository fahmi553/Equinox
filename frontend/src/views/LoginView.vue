<script setup>
import { useRouter } from 'vue-router';
import { Eclipse } from '@lucide/vue';
import { authForm, authMode, authenticate, error } from '../stores/equinox';

const router = useRouter();

async function submit() {
  if (await authenticate()) {
    router.push('/dashboard');
  }
}
</script>

<template>
  <section class="main-banner">
    <div class="banner-content">
      <span class="hero-logo" aria-hidden="true">
        <Eclipse :size="66" :stroke-width="1.6" />
      </span>
      <p class="overline">Private Home Server</p>
      <h1>Equinox family command center</h1>
      <p class="hero-copy">
        Your private cloud, productivity system, family platform, and home server dashboard.
      </p>

      <form id="access" class="search-panel auth-form" @submit.prevent="submit">
        <div class="mode-switch">
          <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">
            Login
          </button>
          <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">
            Register
          </button>
        </div>
        <input v-if="authMode === 'register'" v-model="authForm.displayName" placeholder="Display name" />
        <input v-model="authForm.username" placeholder="Username" autocomplete="username" />
        <input v-model="authForm.password" placeholder="Password" type="password" autocomplete="current-password" />
        <button class="main-button" type="submit">{{ authMode === 'login' ? 'Login' : 'Create account' }}</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </section>
</template>
