import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

import type { ApiResponse } from './types'

/**
 * 统一的 axios 实例。
 *
 * baseURL 来自环境变量 VITE_API_BASE_URL：
 * - 开发环境为 /api，由 vite.config.ts 的 proxy 转发到后端（无跨域）
 * - 生产环境可按部署方式改为后端完整地址
 */
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：后续接入登录态后，在这里统一追加 token
instance.interceptors.request.use(
  (config) => {
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// 响应拦截器：统一处理网络错误与业务错误码
instance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    return Promise.reject(error)
  },
)

/** 业务异常，携带后端返回的状态码 */
export class ApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/**
 * 真正发起请求并拆解统一响应结构：
 * 成功（code === 0）时返回 data，否则抛出 ApiError。
 */
async function requestData<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<ApiResponse<T>>(config)
  const body = response.data

  if (!body || typeof body.code !== 'number') {
    throw new ApiError(-1, '响应格式不符合约定')
  }
  if (body.code !== 0) {
    throw new ApiError(body.code, body.message || '请求失败')
  }
  return body.data
}

/**
 * 统一请求封装。
 *
 * 项目约定：后端接口统一使用 POST，参数通过请求体（JSON）传递，
 * 因此这里只暴露 post 一个方法，不提供 get / put / delete。
 */
export const http = {
  post<T>(url: string, data?: unknown): Promise<T> {
    return requestData<T>({ method: 'POST', url, data })
  },
}

export default instance
