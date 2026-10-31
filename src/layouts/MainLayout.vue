<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="layout">
    <AppSidebar />

    <div class="layout__main">
      <AppHeader />

      <main class="layout__content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100%;
}

.layout__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.layout__content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
