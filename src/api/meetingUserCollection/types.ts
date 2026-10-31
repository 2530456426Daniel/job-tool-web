/**
 * 查询入参。
 *
 * 注意 answerScore 是「该活动的答题满分」（分母），不是某个人的得分；
 * 个人的答题得分是明细里的 answerScoreTotal。
 */
export interface MeetingUserCollectionRequest {
  /** 活动ID */
  activityId: number | null
  /** 答题分数：该活动的答题满分（分母），需大于0 */
  answerScore: number
  /** 参会时长：应观看时长，单位秒（封顶值与分母），需大于0 */
  attendanceDuration: number
}

/** 明细行：与导出模板 A–I 列一一对应 */
export interface MeetingCollectionRecord {
  /** A 用户编号（字符串，避免前导零丢失） */
  userCode: string
  /** B 姓名 */
  userName: string
  /** 战队名（接口返回，页面不展示） */
  teamName: string
  /** C 答题分数：answer_score_total 原值 */
  answerScoreTotal: number
  /** D 观看时长（单位秒）：已按参会时长封顶 */
  watchDuration: number
  /** E 参会率 */
  joinRate: number
  /** F 答题率 */
  answerRate: number
  /** G 答题准确率 */
  answerAccuracy: number
  /** H 观看率 */
  watchRate: number
  /** I 分数：4 个率的算术平均 */
  score: number
}

/** 战队汇总行：对应导出模板的汇总块 */
export interface MeetingCollectionSummary {
  /** A 战队名 */
  teamName: string
  /** B 总人数（整个战队，不含名单过滤） */
  totalCount: number
  /** C 答题平均分数 */
  avgAnswerScore: number
  /** D 观看平均时长（单位秒） */
  avgWatchDuration: number
  /** E 参会率 */
  joinRate: number
  /** F 答题率 */
  answerRate: number
  /** G 答题准确率 */
  answerAccuracy: number
  /** H 观看率 */
  watchRate: number
  /** I 分数 */
  score: number
}

/** 查询接口返回 */
export interface MeetingUserCollectionListData {
  activityId: number
  /** 共创会名称，取不到为 null */
  meetingName: string | null
  /** 活动日期 yyyy-MM-dd，取不到为 null */
  meetingDate: string | null
  answerScore: number
  attendanceDuration: number
  /** 人员名单实际来源 */
  nameListPath: string
  /** 人员名单条数 */
  nameListTotal: number
  /** 该活动记录数（不含名单过滤） */
  recordTotal: number
  /** 名单与记录的匹配条数 */
  matchedTotal: number
  /** 记录中因不在名单被丢弃的人数 */
  excludedNotInNameList: number
  /** 名单中该活动无记录的人数 */
  excludedNoRecord: number
  /** 汇总战队名 */
  teamName: string | null
  /** 明细条数 */
  total: number
  list: MeetingCollectionRecord[]
  /** 战队汇总，无明细时为 null */
  summary: MeetingCollectionSummary | null
}

/** 导入结果 - 单组（活动ID + 战队ID） */
export interface MeetingUserRecordImportGroup {
  activityId: number
  teamId: number
  teamName: string
  /** 本次导入的行数 */
  rowCount: number
  /** 清空的原有条数 */
  deletedCount: number
}

/** 导入接口返回 */
export interface MeetingUserRecordImportData {
  fileName: string
  /** 导入完成时间 yyyy-MM-dd HH:mm:ss */
  importedAt: string
  /** 解析出的数据行数 */
  total: number
  /** 清空的原有条数 */
  deletedTotal: number
  /** 本次插入的条数 */
  insertedTotal: number
  groups: MeetingUserRecordImportGroup[]
}
