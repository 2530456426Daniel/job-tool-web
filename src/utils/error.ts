/**
 * 从任意异常中取出可展示给用户的提示语。
 *
 * 后端的业务错误会由 http 封装抛出 ApiError（继承 Error），
 * message 即后端返回的中文提示，这里统一兜底。
 */
export function getErrorMessage(error: unknown, fallback = '请求失败，请稍后重试'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error) {
    return error
  }
  return fallback
}
