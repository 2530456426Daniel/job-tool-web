/**
 * 明细列表元素：与后端 OkrStatisticsRecord 的 7 个展示字段一一对应
 */
export interface OkrStatisticsRecord {
  /** 姓名 */
  name: string
  /** 工号 */
  employeeNo: string
  /** 上月OKR达成复盘率，如 100% */
  reviewRate: string
  /** 本月OKRI是否及时发布，是/否 */
  okrPublished: string
  /** 增长曲线是否更新完成，完成/未完成 */
  growthCurveUpdated: string
  /** 是否是经理及以上，是/否 */
  managerOrAbove: string
  /** O对齐率，如 100%；源值为空时为“不适用” */
  oAlignRate: string
}

/** 单个筛选项；label 为后端拼好的“值（个数）”，页面直接展示 */
export interface OkrFilterOption {
  /** 用于筛选比对的原始值 */
  value: string
  /** 展示文案，如 100%（30） */
  label: string
  /** 该取值的人数 */
  count: number
}

/** 筛选项集合，键与明细字段同名 */
export type OkrFilterMap = Record<string, OkrFilterOption[]>

/** 列表接口返回 */
export interface OkrStatisticsListData {
  /** 是否已上传过数据；false 时 list 与 filters 为空 */
  uploaded: boolean
  uploadedAt: string | null
  okrFileName: string | null
  nameListPath: string | null
  okrTotal: number | null
  nameListTotal: number | null
  matchedTotal: number | null
  /** 当前列表条数 */
  total: number
  list: OkrStatisticsRecord[]
  filters: OkrFilterMap
}

/** 上传接口返回的摘要 */
export interface OkrStatisticsUploadData {
  uploadedAt: string
  okrFileName: string
  nameListPath: string
  okrTotal: number
  nameListTotal: number
  matchedTotal: number
  /** 因不在人员名单被过滤掉的人数 */
  excludedNotInNameList: number
  /** 在人员名单中但达成 Excel 里没有的人数 */
  excludedNotInOkr: number
}
