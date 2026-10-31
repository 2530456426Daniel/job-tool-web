<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useAppStore } from '@/stores/app'

const route = useRoute()
const appStore = useAppStore()

/** 当前页面标题：取路由 meta 中声明的菜单标题 */
const currentTitle = computed(() => route.meta?.sidebar?.title ?? 'Job Tool')
</script>

<template>
  <header class="header">
    <button
      class="header__toggle"
      type="button"
      :title="appStore.sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
      @click="appStore.toggleSidebar()"
    >
      ☰
    </button>

    <h1 class="header__title">{{ currentTitle }}</h1>

    <div class="header__right">
      <span class="header__env">dev</span>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  gap: 12px;
  align-items: center;
  height: var(--jt-header-height);
  padding: 0 20px;
  background: var(--jt-surface);
  border-bottom: 1px solid var(--jt-border);
}

.header__toggle {
  padding: 4px 8px;
  font-size: 16px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
}

.header__toggle:hover {
  background: var(--jt-bg);
}

.header__title {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header__env {
  padding: 1px 8px;
  font-size: 12px;
  color: var(--jt-text-secondary);
  background: var(--jt-bg);
  border-radius: 10px;
}
</style>
