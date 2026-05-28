<template>
  <section class="page-shell">
    <div class="section-heading page-heading">
      <div>
        <h2>{{ title }}</h2>
        <h6>{{ eyebrow }}</h6>
      </div>
      <slot name="actions" />
    </div>

    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  eyebrow: {
    type: String,
    required: true
  }
});
</script>
