import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 应用级 UI 状态。
 *
 * 这里用 Pinia 管理侧边栏折叠状态，作为状态管理的接入示例；
 * 后续业务状态（用户信息、字典数据等）按同样方式新增 store。
 */
export const useAppStore = defineStore('app', () => {
  /** 侧边栏是否折叠 */
  const sidebarCollapsed = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
  }

  return { sidebarCollapsed, toggleSidebar, setSidebarCollapsed }
})
