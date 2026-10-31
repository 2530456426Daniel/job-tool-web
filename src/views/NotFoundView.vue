<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="not-found">
    <div class="not-found__code">404</div>
    <p class="not-found__text">页面不存在</p>
    <RouterLink class="jt-btn jt-btn--primary" to="/">返回首页</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 60vh;
}

.not-found__code {
  font-size: 56px;
  font-weight: 700;
  color: var(--jt-primary);
}

.not-found__text {
  margin: 0 0 8px;
  color: var(--jt-text-secondary);
}
</style>
