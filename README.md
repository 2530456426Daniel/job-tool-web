# job-tool-web

Job Tool 前端项目，Vue3 + TypeScript + Vite，已搭好侧边栏框架与接口调用规范。

## 技术栈

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| Vue | 3.5 | 组合式 API + `<script setup>` |
| TypeScript | 5.9 | 全量类型约束 |
| Vite | 8.3 | 开发服务器与构建（Rolldown） |
| Vue Router | 5.3 | 路由 + 侧边栏菜单 |
| Pinia | 4.0 | 状态管理 |
| Axios | 1.20 | HTTP 请求封装 |
| Element Plus | 2.14 | 表格/筛选/上传等组件（仅 devtool 统计页使用，全局注册） |
| Sass | 1.93 | 页面样式（`<style lang="scss" scoped>`） |
| pnpm | 11 | 包管理器 |

> 依赖全部为 MIT 等开源许可的公共包，未使用任何 ziroom 私有包。

> 说明：TypeScript 暂用 5.9 而非 7.x。TS 7 改为 Go 实现后不再导出 `typescript/lib/tsc`，
> 当前 `vue-tsc` 仍依赖该路径，升级会导致类型检查失败。待 `vue-tsc` 支持后再升级。

## 快速开始

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器 http://127.0.0.1:5173
pnpm build       # 类型检查 + 生产构建（产物在 dist/）
pnpm typecheck   # 只做类型检查
pnpm preview     # 预览生产构建产物
```

开发时需要同时启动后端（见 `../job-tool-platform/README.md`）：

```bash
cd ../job-tool-platform && ./mvnw spring-boot:run
```

## 目录结构

```
src/
├── api/                 接口层：与后端一一对应
│   ├── http.ts          axios 实例 + 统一响应拆解 + ApiError
│   ├── types.ts         ApiResponse / PageResult 等通用类型
│   ├── hello/           Hello World 示例模块（types.ts + index.ts）
│   ├── system/          系统模块（types.ts + index.ts）
│   ├── okrStatistics/   OKR达成情况统计（types.ts + index.ts）
│   └── meetingUserCollection/ 共创会人员统计（types.ts + index.ts）
├── layouts/             布局层
│   ├── MainLayout.vue   侧边栏 + 顶栏 + 内容区
│   ├── AppSidebar.vue   侧边栏（菜单由路由自动生成）
│   └── AppHeader.vue    顶栏（菜单标题 + 折叠按钮）
├── router/              路由与侧边栏菜单
│   └── index.ts
├── stores/              Pinia 状态
│   └── app.ts           侧边栏折叠等 UI 状态
├── styles/
│   └── main.css         全局样式与主题变量（CSS 变量）
├── utils/
│   ├── download.ts      Blob 下载 + 导出失败的 JSON 错误解析
│   └── error.ts         统一提取可展示的错误提示
├── views/               页面
│   ├── DashboardView.vue    工作台（含后端联通性检测）
│   ├── HelloView.vue        Hello World（前后端联调示例）
│   ├── devtool/
│   │   ├── okrStatistics/         OKR达成情况统计
│   │   └── meetingUserCollection/ 共创会人员统计
│   ├── AboutView.vue        项目说明
│   └── NotFoundView.vue     404
├── App.vue
└── main.ts
```

## 侧边栏与路由

侧边栏菜单**由路由自动生成**：只要在路由 `meta.sidebar` 中声明，菜单就会自动出现，无需改组件。

```ts
{
  path: 'hello',
  name: 'hello',
  component: () => import('@/views/HelloView.vue'),
  meta: { sidebar: { title: 'Hello World', icon: '👋', order: 2 } },
}
```

`order` 控制排序，`hidden: true` 可让页面存在但不显示在菜单中。
菜单标题同时会作为顶栏标题显示。

### 新增一个页面

1. 在 `src/views/` 新建组件；
2. 在 `src/router/index.ts` 的 `MainLayout` children 中注册路由并写好 `meta.sidebar`；
3. 侧边栏与顶栏标题自动生效。

### 新增一个接口模块

1. 在 `src/api/` 下新建目录（如 `job/`），放 `types.ts` + `index.ts`；
2. 在 `index.ts` 中通过 `http` 调用后端接口；
3. 页面里 `import { xxxApi } from '@/api/xxx'` 使用即可。

## 接口调用规范

所有请求统一走 `src/api`，不在组件里直接使用 axios。

```ts
import { helloApi } from '@/api/hello'

const greeting = await helloApi.greet('Job Tool')   // 直接拿到 data，已拆解统一响应结构
```

`src/api/http.ts` 负责：

- **只提供 POST 相关方法**：后端接口统一使用 POST，因此封装里不提供 `get` / `put` / `delete`；
  - `http.post`：JSON 请求；
  - `http.postForm`：multipart 文件上传（传 `FormData`，浏览器自动补 boundary）；
  - `http.postBlob`：下载二进制（如 Excel 导出）；
- 从 `VITE_API_BASE_URL` 读取 `baseURL`（默认 `/api`）；
- 校验 `{code, message, data}` 结构，`code !== 0` 时抛出 `ApiError`；
- 后续接入登录态时，在请求拦截器中统一追加 token。

### 新增一个接口模块

1. 在 `src/api/` 下新建目录（如 `job/`），放 `types.ts` + `index.ts`；
2. `types.ts` 里定义响应类型和请求体类型（与后端 `dto/` 对应）；
3. `index.ts` 里用 `http.post` 调用接口，例如：

```ts
import { http } from '@/api/http'
import type { JobItem, JobQueryRequest } from './types'

export const jobApi = {
  page(request: JobQueryRequest): Promise<JobItem[]> {
    return http.post<JobItem[]>('/jobs', request)
  },
}
```

4. 页面里 `import { jobApi } from '@/api/job'` 使用即可。

> 请求体统一传对象：没有参数时传 `{}` 或不传，不要拼 query 字符串。

## 环境变量

| 文件 | 变量 | 值 | 说明 |
| --- | --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | `/api` | 由 vite 代理转发到后端 |
| `.env.production` | `VITE_API_BASE_URL` | `/api` | 同域部署；不同域时改为后端完整地址 |

开发环境代理配置见 `vite.config.ts`：`/api` → `http://127.0.0.1:8081`。
因为后端 `context-path` 就是 `/api`，所以**不需要 rewrite**。

## 约定

- 路径别名 `@` 指向 `src`
- 样式统一使用 `main.css` 中的 CSS 变量（如 `--jt-primary`），便于统一换肤
- 组件内样式一律使用 `<style scoped>`
- 模板中不要直接使用 `import.meta`（Vue 模板编译器无法解析），先在 `<script setup>` 中赋值给变量

## devtool 工具页面

两个页面由路由自动挂到侧边栏，访问路径（带 `vite.config.ts` 的 `/jobTool/` base）：

| 页面 | 路由 | 对应后端 |
| --- | --- | --- |
| OKR达成情况统计 | `/jobTool/devtool/okr-statistics` | `OkrStatisticsController` |
| 共创会人员统计 | `/jobTool/devtool/meeting-user-collection` | `MeetingUserCollectionController` |

- 页面组件：`src/views/devtool/okrStatistics/index.vue`、`src/views/devtool/meetingUserCollection/index.vue`
- 接口模块：`src/api/okrStatistics`、`src/api/meetingUserCollection`
- 组件库 Element Plus 在 `src/main.ts` 全局注册，页面内直接使用 `el-*` 组件与 `v-loading`；
  主色已通过 `main.css` 的 `--el-color-primary` 对齐到项目主题。
- 导出失败时后端返回 JSON 错误体，前端用 `utils/download.ts#readJsonErrorFromBlob` 解析并提示。

## 后续规划

- [ ] 登录页与路由守卫
- [ ] 侧边栏支持多级菜单与图标组件（替换 emoji）
- [x] 引入组件库（Element Plus）——已在 devtool 统计页使用
- [ ] 列表分页、搜索与表单校验
- [ ] 按需引入 + 打包体积优化
