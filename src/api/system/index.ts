import { http } from '@/api/http'

import type { SystemInfo } from './types'

/** 系统相关接口，对应后端 SystemController（POST /api/system） */
export const systemApi = {
  /** 应用信息，用于联通性检查 */
  info(): Promise<SystemInfo> {
    return http.post<SystemInfo>('/system/info')
  },
}
