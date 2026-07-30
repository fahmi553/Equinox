<script setup>
import { computed, onMounted } from 'vue';
import { Boxes, CheckCircle2, Clock3, LockKeyhole, RefreshCw } from '@lucide/vue';
import {
  loadModules,
  moduleError,
  moduleMessage,
  modules,
  modulesLoading,
  updateModuleSetting
} from '../stores/equinox';

const groups = computed(() => {
  const grouped = new Map();

  for (const module of modules.value) {
    if (!grouped.has(module.group)) grouped.set(module.group, []);
    grouped.get(module.group).push(module);
  }

  return [...grouped.entries()].map(([label, items]) => ({ label, items }));
});

function statusLabel(module) {
  if (module.healthState === 'planned') return 'Planned';
  if (module.isCore) return 'Core';
  return module.isEnabled ? 'Enabled' : 'Disabled';
}

onMounted(loadModules);
</script>

<template>
  <section class="page-shell">
    <header class="page-heading">
      <div>
        <p class="overline">Portal framework</p>
        <h1>Modules</h1>
        <p>Choose the tools your family sees while future portals remain visible as planned work.</p>
      </div>
      <button class="secondary-button" @click="loadModules">
        <RefreshCw :size="17" :stroke-width="2" />
        Refresh
      </button>
    </header>

    <p v-if="moduleMessage" class="success-message">{{ moduleMessage }}</p>
    <p v-if="moduleError" class="error-message">{{ moduleError }}</p>

    <section class="feature-panel">
      <div class="panel-copy">
        <h3>Module Registry</h3>
        <p>Core modules stay available. Optional productivity modules can be disabled without removing their data.</p>
      </div>

      <p v-if="modulesLoading" class="storage-info" role="status" aria-live="polite">Loading modules...</p>
      <p v-else-if="!groups.length" class="empty-state">No modules registered.</p>
      <section v-for="group in groups" :key="group.label" class="module-group">
        <h2>{{ group.label }}</h2>
        <article v-for="module in group.items" :key="module.key" class="module-row">
          <div class="module-icon" aria-hidden="true">
            <Boxes :size="20" :stroke-width="1.9" />
          </div>
          <div class="module-copy">
            <strong>{{ module.label }}</strong>
            <span>{{ module.description }}</span>
          </div>
          <span :class="['module-state', module.healthState, { disabled: !module.isEnabled }]">
            <Clock3 v-if="module.healthState === 'planned'" :size="15" :stroke-width="2.1" />
            <LockKeyhole v-else-if="module.isCore" :size="15" :stroke-width="2.1" />
            <CheckCircle2 v-else :size="15" :stroke-width="2.1" />
            {{ statusLabel(module) }}
          </span>
          <label v-if="module.isToggleable && module.healthState !== 'planned'" class="module-switch">
            <input
              type="checkbox"
              :checked="module.isEnabled"
              @change="updateModuleSetting(module, $event.target.checked)"
            />
            <span aria-hidden="true"></span>
            <small>{{ module.isEnabled ? 'On' : 'Off' }}</small>
          </label>
          <span v-else class="module-locked">{{ module.healthState === 'planned' ? 'Coming later' : 'Always on' }}</span>
        </article>
      </section>
    </section>
  </section>
</template>
