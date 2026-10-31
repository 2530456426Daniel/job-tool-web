import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'

/**
 * 侧边栏导航项。
 *
 * 只需在路由 meta 中声明 sidebar 信息，侧边栏会自动渲染。
 * 新增页面时：加一个路由 + 写好 meta，侧边栏菜单自动出现。
 */
export interface SidebarMeta {
  /** 菜单标题 */
  title: string
  /** 菜单图标（emoji 或字符，后续可替换为图标组件） */
  icon?: string
  /** 菜单排序，越小越靠前 */
  order?: number
  /** 是否在侧边栏隐藏 */
  hidden?: boolean
}

declare module 'vue-router' {
  interface RouteMeta {
    sidebar?: SidebarMeta
  }
}

/**
 * 需要出现在侧边栏的菜单项（按 order 排序）。
 */
export function getSidebarItems(): (SidebarMeta & { path: string; name: string })[] {
  const layoutRoute = routes.find((route) => route.path === '/')
  const children = layoutRoute?.children ?? []

  return children
    .filter((route) => route.meta?.sidebar && !route.meta.sidebar.hidden)
    .map((route) => {
      const sidebar = route.meta!.sidebar as SidebarMeta
      const path = route.path.startsWith('/') ? route.path : `/${route.path}`
      return {
        ...sidebar,
        path: path === '/dashboard' ? '/' : path,
        name: String(route.name ?? path),
      }
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { sidebar: { title: '工作台', icon: '🏠', order: 1 } },
      },
      {
        path: 'hello',
        name: 'hello',
        component: () => import('@/views/HelloView.vue'),
        meta: { sidebar: { title: 'Hello World', icon: '👋', order: 2 } },
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/AboutView.vue'),
        meta: { sidebar: { title: '关于项目', icon: 'ℹ️', order: 99 } },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

export default router
