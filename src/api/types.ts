/**
 * 与后端约定的统一响应结构，对应后端 com.jobtool.platform.common.ApiResponse
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: number
  /** 提示信息 */
  message: string
  /** 业务数据 */
  data: T
}

/**
 * 分页结果（后端提供分页接口时使用）
 */
export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
}
