<script setup lang="ts">
import { computed, ref } from 'vue'

import { helloApi } from '@/api/hello'
import type { Greeting } from '@/api/hello/types'

const name = ref('')
const greeting = ref<Greeting | null>(null)
const rawResponse = ref('')
const loading = ref(false)
const errorMessage = ref('')

/** 接口基础路径（模板中不能直接用 import.meta，先取到脚本作用域） */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

/** 本次请求的地址（统一 POST，参数走请求体） */
const requestUrl = `${apiBaseUrl}/hello`

/** 本次请求的请求体，展示出来便于理解前后端如何对接 */
const requestBody = computed(() => {
  const query = name.value.trim()
  return JSON.stringify(query ? { name: query } : {}, null, 2)
})

async function sendGreeting() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await helloApi.greet(name.value.trim() || undefined)
    greeting.value = data
    rawResponse.value = JSON.stringify(
      { code: 0, message: 'success', data },
      null,
      2,
    )
  } catch (error) {
    greeting.value = null
    rawResponse.value = ''
    errorMessage.value = error instanceof Error ? error.message : '请求失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="hello">
    <section class="jt-card">
      <h2 class="jt-card__title">Hello World</h2>
      <p class="hello__desc">
        向后端发起 <code>POST {{ requestUrl }}</code> 请求，参数通过请求体传递，数据由后端返回。
        输入内容留空时，请求体为 <code>{}</code>，后端会返回默认的 <code>Hello, World!</code>
      </p>

      <div class="hello__form">
        <input
          v-model="name"
          class="hello__input"
          type="text"
          placeholder="请输入称呼，例如：Job Tool"
          maxlength="32"
          @keyup.enter="sendGreeting"
        />
        <button class="jt-btn jt-btn--primary" type="button" :disabled="loading" @click="sendGreeting">
          {{ loading ? '请求中…' : '发送请求' }}
        </button>
      </div>

      <!-- 请求信息 -->
      <dl class="hello__meta">
        <dt>请求地址</dt>
        <dd><code>POST {{ requestUrl }}</code></dd>
        <dt>请求体</dt>
        <dd><code>{{ requestBody }}</code></dd>
      </dl>

      <!-- 错误 -->
      <div v-if="errorMessage" class="jt-alert jt-alert--error hello__error">
        {{ errorMessage }}
        <div class="hello__error-tip">
          请确认后端已启动：在 job-tool-platform 目录执行 <code>./mvnw spring-boot:run</code>
        </div>
      </div>

      <!-- 结果 -->
      <template v-if="greeting">
        <div class="hello__result">
          <span class="jt-tag jt-tag--success">调用成功</span>
          <span class="hello__message">{{ greeting.message }}</span>
        </div>

        <dl class="hello__meta">
          <dt>称呼</dt>
          <dd>{{ greeting.name }}</dd>
          <dt>服务端时间</dt>
          <dd>{{ greeting.serverTime }}</dd>
        </dl>

        <details class="hello__raw">
          <summary>查看原始响应</summary>
          <pre>{{ rawResponse }}</pre>
        </details>
      </template>
    </section>
  </div>
</template>

<style scoped>
.hello {
  max-width: 720px;
}

.hello__desc {
  margin: 0 0 16px;
  color: var(--jt-text-secondary);
}

.hello__form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.hello__input {
  flex: 1;
  padding: 7px 12px;
  font-size: 14px;
  color: var(--jt-text);
  border: 1px solid var(--jt-border);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s ease;
}

.hello__input:focus {
  border-color: var(--jt-primary);
}

.hello__meta {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 6px 12px;
  margin: 0 0 12px;
}

.hello__meta dt {
  color: var(--jt-text-secondary);
}

.hello__meta dd {
  margin: 0;
  word-break: break-all;
}

.hello__error {
  margin-bottom: 12px;
}

.hello__error-tip {
  margin-top: 6px;
  font-size: 12px;
}

.hello__result {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--jt-primary-light);
  border-radius: var(--jt-radius);
}

.hello__message {
  font-size: 16px;
  font-weight: 600;
}

.hello__raw summary {
  font-size: 13px;
  color: var(--jt-text-secondary);
  cursor: pointer;
}

.hello__raw pre {
  padding: 12px;
  margin: 8px 0 0;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.6;
  background: var(--jt-bg);
  border-radius: 6px;
}

code {
  padding: 1px 5px;
  font-size: 12px;
  background: var(--jt-bg);
  border-radius: 4px;
}
</style>
