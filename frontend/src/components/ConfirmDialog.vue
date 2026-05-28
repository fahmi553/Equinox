<template>
  <div v-if="open" class="modal-backdrop" role="presentation" @click.self="$emit('cancel')">
    <section class="confirm-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div>
        <p class="overline">{{ eyebrow }}</p>
        <h3 :id="titleId">{{ title }}</h3>
        <p>{{ message }}</p>
      </div>
      <div class="dialog-actions">
        <button class="secondary-button" @click="$emit('cancel')">Cancel</button>
        <button class="danger-button" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </section>
  </div>
</template>

<script setup>
const titleId = `confirm-${Math.random().toString(36).slice(2)}`;

defineProps({
  open: {
    type: Boolean,
    default: false
  },
  eyebrow: {
    type: String,
    default: 'Confirm'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confirmLabel: {
    type: String,
    default: 'Delete'
  }
});

defineEmits(['cancel', 'confirm']);
</script>
