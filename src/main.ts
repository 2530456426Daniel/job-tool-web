import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import 'element-plus/dist/index.css'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// 组件库只在 devtool 的两个统计页面使用，统一全局注册，页面内可直接用 el-* 组件与 v-loading
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
