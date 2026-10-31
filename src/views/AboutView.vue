<script setup lang="ts">
const techStack = [
  { name: 'Vue 3', desc: '组合式 API + <script setup>' },
  { name: 'TypeScript', desc: '全量类型约束' },
  { name: 'Vite', desc: '开发服务器与构建' },
  { name: 'Vue Router', desc: '路由与侧边栏菜单' },
  { name: 'Pinia', desc: '状态管理' },
  { name: 'Axios', desc: 'HTTP 请求封装' },
]
</script>

<template>
  <div class="about">
    <section class="jt-card">
      <h2 class="jt-card__title">关于项目</h2>
      <p class="about__text">
        Job Tool 是一个前后端分离的项目模板：前端为 Vue3 + TypeScript，后端为
        Spring Boot + MyBatis，接口统一返回 <code>{ code, message, data }</code> 结构。
      </p>
    </section>

    <section class="jt-card">
      <h2 class="jt-card__title">前端技术栈</h2>
      <ul class="about__list">
        <li v-for="item in techStack" :key="item.name">
          <strong>{{ item.name }}</strong>
          <span class="about__desc">{{ item.desc }}</span>
        </li>
      </ul>
    </section>

    <section class="jt-card">
      <h2 class="jt-card__title">目录结构</h2>
      <pre class="about__tree">src/
├── api/          接口定义（按业务模块分目录）
│   ├── http.ts   axios 实例 + 统一响应拆解
│   └── types.ts  统一响应类型
├── layouts/      布局（侧边栏 + 顶栏）
├── router/       路由与侧边栏菜单
├── stores/       Pinia 状态
├── styles/       全局样式与主题变量
└── views/        页面</pre>
    </section>
  </div>
</template>

<style scoped>
.about {
  display: grid;
  gap: 16px;
}

.about__text {
  margin: 0;
  color: var(--jt-text-secondary);
}

.about__list {
  padding-left: 18px;
  margin: 0;
}

.about__list li {
  margin-bottom: 6px;
}

.about__desc {
  margin-left: 8px;
  color: var(--jt-text-secondary);
}

.about__tree {
  padding: 14px;
  margin: 0;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.7;
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
