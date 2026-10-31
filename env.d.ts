/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 接口基础路径，默认 /api（开发环境由 vite 代理到后端） */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
