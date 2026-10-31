<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { getSidebarItems } from '@/router'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const menuItems = computed(() => getSidebarItems())
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': appStore.sidebarCollapsed }">
    <div class="sidebar__brand">
      <span class="sidebar__logo">JT</span>
      <span v-show="!appStore.sidebarCollapsed" class="sidebar__name">Job Tool</span>
    </div>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in menuItems"
        :key="item.name"
        :to="item.path"
        class="sidebar__link"
        :title="item.title"
      >
        <span class="sidebar__icon">{{ item.icon }}</span>
        <span v-show="!appStore.sidebarCollapsed" class="sidebar__label">{{ item.title }}</span>
      </RouterLink>
    </nav>

    <div v-show="!appStore.sidebarCollapsed" class="sidebar__footer">v0.1.0</div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: var(--jt-sidebar-width);
  color: var(--jt-sidebar-text);
  background: var(--jt-sidebar-bg);
  transition: width 0.2s ease;
}

.sidebar--collapsed {
  width: var(--jt-sidebar-width-collapsed);
}

.sidebar__brand {
  display: flex;
  gap: 10px;
  align-items: center;
  height: var(--jt-header-height);
  padding: 0 16px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.sidebar__logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--jt-primary);
  border-radius: 7px;
}

.sidebar__name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.sidebar__nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
}

.sidebar__link {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  margin-bottom: 4px;
  color: var(--jt-sidebar-text);
  white-space: nowrap;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.sidebar__link:hover {
  color: #fff;
  background: var(--jt-sidebar-bg-hover);
}

/* 选中态：vue-router 自动加在 RouterLink 上 */
.sidebar__link.router-link-exact-active {
  color: var(--jt-sidebar-text-active);
  background: var(--jt-sidebar-bg-active);
}

.sidebar__icon {
  flex-shrink: 0;
  width: 20px;
  font-size: 15px;
  text-align: center;
}

.sidebar__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__footer {
  padding: 10px 16px;
  font-size: 12px;
  color: #64748b;
  border-top: 1px solid rgb(255 255 255 / 8%);
}
</style>
