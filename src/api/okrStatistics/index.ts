import { http } from '@/api/http'

import type { OkrStatisticsListData, OkrStatisticsUploadData } from './types'

/** OKR 达成情况统计接口，对应后端 OkrStatisticsController */
export const okrStatisticsApi = {
  /** 上传达成情况 Excel：解析后与人员名单取交集，整体替换内存数据 */
  upload(file: File): Promise<OkrStatisticsUploadData> {
    const formData = new FormData()
    formData.append('file', file)
    return http.postForm<OkrStatisticsUploadData>(
      '/devtool/okr/statistics/v1/uploadOkrStatisticsExcel',
      formData,
    )
  },

  /** 查询当前内存中的明细列表与筛选项（统一走 POST，请求体为空） */
  list(): Promise<OkrStatisticsListData> {
    return http.post<OkrStatisticsListData>('/devtool/okr/statistics/v1/getOkrStatisticsList', {})
  },

  /** 清空内存数据（调试用） */
  clear(): Promise<boolean> {
    return http.post<boolean>('/devtool/okr/statistics/v1/clearOkrStatisticsData', {})
  },
}
