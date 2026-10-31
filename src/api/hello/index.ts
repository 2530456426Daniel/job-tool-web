import { http } from '@/api/http'

import type { Greeting, GreetingRequest } from './types'

/** Hello World 示例接口，对应后端 GreetingController（POST /api/hello） */
export const helloApi = {
  /** 打招呼；name 省略或为空白时后端返回 Hello, World! */
  greet(name?: string): Promise<Greeting> {
    const body: GreetingRequest = name ? { name } : {}
    return http.post<Greeting>('/hello', body)
  },
}
