import { http } from '@/api/http'

import type {
  MeetingUserCollectionListData,
  MeetingUserCollectionRequest,
  MeetingUserRecordImportData,
} from './types'

/** 共创会人员统计接口，对应后端 MeetingUserCollectionController */
export const meetingUserCollectionApi = {
  /** 查询参会明细与战队汇总 */
  query(request: MeetingUserCollectionRequest): Promise<MeetingUserCollectionListData> {
    return http.post<MeetingUserCollectionListData>(
      '/devtool/meeting/user/collection/v1/getMeetingUserCollectionList',
      request,
    )
  },

  /**
   * 导出与样例同模板的 Excel。
   *
   * 后端在参数非法/名单读取失败/无可导出数据时返回的是 JSON 错误体，
   * 此时拿到的仍是 Blob，调用方需要判断 Blob 类型并按文本解析（见页面里的导出处理）。
   */
  exportExcel(request: MeetingUserCollectionRequest): Promise<Blob> {
    return http.postBlob('/devtool/meeting/user/collection/v1/exportMeetingUserCollectionExcel', request)
  },

  /**
   * 导入参会数据（导入模版 Excel）。
   *
   * 后端会先按 Excel 中出现的「活动ID + 战队ID」清空原有数据，
   * 再批量插入；清空与插入在同一事务内完成，失败整体回滚。
   */
  importExcel(file: File): Promise<MeetingUserRecordImportData> {
    const formData = new FormData()
    formData.append('file', file)
    return http.postForm<MeetingUserRecordImportData>(
      '/devtool/meeting/user/collection/v1/importMeetingUserRealRecordExcel',
      formData,
    )
  },
}
