/**
 * 问候信息，对应后端 com.jobtool.platform.entity.Greeting
 */
export interface Greeting {
  name: string
  message: string
  serverTime: string
}

/**
 * 打招呼请求体，对应后端 com.jobtool.platform.dto.GreetingRequest
 */
export interface GreetingRequest {
  /** 称呼，可选，最长 32 个字符 */
  name?: string
}
