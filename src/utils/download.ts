/**
 * 触发浏览器下载一个 Blob。
 *
 * 用原生 API 实现，避免为了下载一个文件再引入第三方库。
 *
 * @param blob     文件内容
 * @param fileName 保存时的文件名
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 点击后延迟释放，避免部分浏览器在下载真正开始前就把 blob URL 回收
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 把后端返回的 Blob 按 JSON 解析成错误提示。
 *
 * 后端导出失败时仍以 JSON 返回统一错误体，浏览器只能按 Blob 接收，
 * 因此需要先判断 type 再按文本解析。
 */
export function readJsonErrorFromBlob(blob: Blob): Promise<string | null> {
  if (!blob.type || blob.type.indexOf('json') < 0) {
    return Promise.resolve(null)
  }
  return blob.text().then((text) => {
    try {
      const body = JSON.parse(text) as { message?: string }
      return body.message || '导出失败'
    } catch {
      return '导出失败'
    }
  })
}
