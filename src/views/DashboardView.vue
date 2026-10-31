<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { systemApi } from '@/api/system'
import type { SystemInfo } from '@/api/system/types'

type CheckState = 'idle' | 'loading' | 'success' | 'error'

const state = ref<CheckState>('idle')
const info = ref<SystemInfo | null>(null)
const errorMessage = ref('')

/** 接口基础路径（模板中不能直接使用 import.meta，需先取到脚本作用域） */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

/** 调用后端 /api/system/info，验证前后端链路是否打通 */
async function checkBackend() {
  state.value = 'loading'
  errorMessage.value = ''
  try {
    info.value = await systemApi.info()
    state.value = 'success'
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '请求失败'
  }
}

onMounted(checkBackend)
</script>

<template>
  <div class="dashboard">
    <section class="jt-card">
      <h2 class="jt-card__title">前后端联通性</h2>

      <div v-if="state === 'loading'" class="dashboard__hint">正在请求后端…</div>

      <template v-else-if="state === 'success'">
        <p class="dashboard__ok">
          <span class="jt-tag jt-tag--success">已连接</span>
          <span class="dashboard__ok-text">后端接口响应正常</span>
        </p>
        <dl class="dashboard__detail">
          <dt>应用名</dt>
          <dd>{{ info?.application }}</dd>
          <dt>服务端时间</dt>
          <dd>{{ info?.timestamp }}</dd>
          <dt>接口地址</dt>
          <dd>{{ apiBaseUrl }}/system/info</dd>
        </dl>
      </template>

      <template v-else-if="state === 'error'">
        <div class="jt-alert jt-alert--error">
          无法连接后端：{{ errorMessage }}
        </div>
        <p class="dashboard__tip">
          请确认后端服务已启动：在 job-tool-platform 目录执行
          <code>./mvnw spring-boot:run</code>
        </p>
      </template>

      <button
        class="jt-btn jt-btn--primary dashboard__btn"
        type="button"
        :disabled="state === 'loading'"
        @click="checkBackend"
      >
        重新检测
      </button>
    </section>

    <section class="jt-card">
      <h2 class="jt-card__title">开始使用</h2>
      <ul class="dashboard__list">
        <li>左侧「Hello World」是前后端联调示例，接的是 <code>POST /api/hello</code> 接口</li>
        <li>新增页面：在 <code>src/views</code> 建组件，在 <code>src/router</code> 注册路由并写 meta</li>
        <li>接口调用统一走 <code>src/api</code>，已封装统一响应结构与错误处理</li>
        <li>接口文档：<code>http://localhost:8081/api/swagger-ui.html</code></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.dashboard__hint {
  color: var(--jt-text-secondary);
}

.dashboard__ok {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 12px;
}

.dashboard__ok-text {
  color: var(--jt-text-secondary);
}

.dashboard__detail {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 6px 12px;
  margin: 0 0 16px;
}

.dashboard__detail dt {
  color: var(--jt-text-secondary);
}

.dashboard__detail dd {
  margin: 0;
  word-break: break-all;
}

.dashboard__tip {
  margin: 12px 0 0;
  color: var(--jt-text-secondary);
}

.dashboard__btn {
  margin-top: 4px;
}

.dashboard__list {
  padding-left: 18px;
  margin: 0;
}

.dashboard__list li {
  margin-bottom: 8px;
}

code {
  padding: 1px 5px;
  font-size: 12px;
  background: var(--jt-bg);
  border-radius: 4px;
}
</style>
