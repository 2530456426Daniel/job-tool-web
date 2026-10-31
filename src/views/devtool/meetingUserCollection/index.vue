<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download, InfoFilled, Search, UploadFilled } from '@element-plus/icons-vue';
import { meetingUserCollectionApi } from '@/api/meetingUserCollection';
import type {
  MeetingCollectionRecord,
  MeetingCollectionSummary,
  MeetingUserRecordImportData,
  MeetingUserRecordImportGroup,
} from '@/api/meetingUserCollection/types';
import { downloadBlob, readJsonErrorFromBlob } from '@/utils/download';
import { getErrorMessage } from '@/utils/error';

/**
 * 表格列定义，顺序即导出模板 A–I 的列序。
 * sortable 控制该列标题是否可点击排序。
 */
const columnDefs = [
  { prop: 'userCode', label: '用户编号', minWidth: 120, sortable: true },
  { prop: 'userName', label: '姓名', minWidth: 110, sortable: false },
  { prop: 'answerScoreTotal', label: '答题分数', minWidth: 110, sortable: true },
  { prop: 'watchDuration', label: '观看时长（单位秒）', minWidth: 160, sortable: true },
  { prop: 'joinRate', label: '参会率', minWidth: 100, sortable: true },
  { prop: 'answerRate', label: '答题率', minWidth: 100, sortable: true },
  { prop: 'answerAccuracy', label: '答题准确率', minWidth: 120, sortable: true },
  { prop: 'watchRate', label: '观看率', minWidth: 100, sortable: true },
  { prop: 'score', label: '分数', minWidth: 100, sortable: true },
] as const;

/**
 * 排序顺序：点一下倒序、再点一下正序，如此循环（没有「不排序」这个中间态）。
 *
 * <p>Element Plus 的表头整格本身就可点击排序（click 事件挂在 th 上），
 * 默认循环是 升序 → 降序 → 不排序，这里通过 sort-orders 改成 降序 → 升序。</p>
 */
const SORT_ORDERS: Array<'ascending' | 'descending'> = ['descending', 'ascending'];

/** 表格底部预留的呼吸空间，避免最后一行贴着屏幕底边 */
const TABLE_BOTTOM_GAP = 24;
/** 表格卡片头部高度（.table-head 的 12+12 内边距 + 22 行高） */
const TABLE_HEAD_HEIGHT = 46;

/** 导入文件的 accept 与允许的扩展名（与后端校验保持一致） */
const ACCEPT_TYPES =
  '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ALLOWED_EXTENSIONS = ['xls', 'xlsx'];

/** 查询参数：答题分数默认 100（满分）、参会时长默认 8820 秒（参考 SQL 的口径），均可在页面上改 */
const form = reactive({
  activityId: null as number | null,
  answerScore: 100,
  attendanceDuration: 8820,
});

const loading = ref(false);
const exporting = ref(false);
/** 是否已经查询过（用于区分「未查询」与「查询后无数据」两种空态） */
const queried = ref(false);

/* ---------- 数据导入 ---------- */

const importing = ref(false);
const importFileName = ref('');
const importResult = ref<MeetingUserRecordImportData | null>(null);

/**
 * 待导入的文件；刻意用普通变量而不是 ref。
 * File 对象若被 Vue 的 reactive/ref 代理，再交给 FormData 可能出问题（与 okrStatistics 一致）。
 */
let pendingImportFile: File | null = null;

const rows = ref<MeetingCollectionRecord[]>([]);
const summary = ref<MeetingCollectionSummary | null>(null);

/** 查询摘要：名单条数、记录数、匹配数等 */
const meta = reactive({
  meetingName: '',
  meetingDate: '',
  nameListPath: '',
  nameListTotal: 0,
  recordTotal: 0,
  matchedTotal: 0,
  excludedNotInNameList: 0,
  excludedNoRecord: 0,
});

const hasData = computed(() => rows.value.length > 0);

/* ---------- 展示格式化：与导出模板的呈现保持一致 ---------- */

/** 答题分数：两位小数 */
const fmt2 = (value: unknown) => Number(value ?? 0).toFixed(2);

/** 各率与分数：一位小数 */
const fmt1 = (value: unknown) => Number(value ?? 0).toFixed(1);

/** 平均值：一位小数，整数时去掉多余的 .0（与导出文件里的显示一致） */
const fmtAvg = (value: unknown) => String(Number(Number(value ?? 0).toFixed(1)));

/** 分数只作视觉提示：≥90 绿、60~90 橙、<60 红，不代表考核口径 */
const scoreTagType = (value: number) => {
  if (value >= 90) return 'success';
  if (value >= 60) return 'warning';
  return 'danger';
};

/* ---------- 排序：数字列按数值比，工号按数字串比 ---------- */

const compareCell = (prop: string, a: any, b: any): number => {
  const va = a?.[prop];
  const vb = b?.[prop];
  if (prop === 'userCode') {
    return String(va ?? '').localeCompare(String(vb ?? ''), 'zh-CN', { numeric: true });
  }
  return Number(va ?? 0) - Number(vb ?? 0);
};

const sortMethodOf = (prop: string) => (a: any, b: any) => compareCell(prop, a, b);

/* ---------- 表格高度自适应：占满剩余屏幕，表体内部滚动 ---------- */
const tableCardRef = ref<HTMLElement>();
const tableHeight = ref(420);

const recalcTableHeight = () => {
  const el = tableCardRef.value;
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  const available = window.innerHeight - top - TABLE_HEAD_HEIGHT - TABLE_BOTTOM_GAP;
  tableHeight.value = Math.max(240, available);
};

/* ---------- 汇总行：与导出模板的汇总块同口径（整个战队，不含名单过滤） ---------- */

const summaryMethod = ({ columns }: any): string[] => {
  const data = summary.value;
  if (!data) return [];
  const values: Record<string, string> = {
    userCode: data.teamName ?? '',
    userName: `${data.totalCount ?? 0} 人`,
    answerScoreTotal: fmt1(data.avgAnswerScore),
    watchDuration: fmtAvg(data.avgWatchDuration),
    joinRate: fmt1(data.joinRate),
    answerRate: fmt1(data.answerRate),
    answerAccuracy: fmt1(data.answerAccuracy),
    watchRate: fmt1(data.watchRate),
    score: fmt1(data.score),
  };
  return columns.map((column: any, index: number) =>
    index === 0 ? '战队汇总' : values[column.property] ?? '',
  );
};

/* ---------- 查询 ---------- */

const validate = () => {
  if (!form.activityId) {
    ElMessage.warning('请输入活动ID');
    return false;
  }
  if (!form.answerScore || form.answerScore <= 0) {
    ElMessage.warning('答题分数必须大于0');
    return false;
  }
  if (!form.attendanceDuration || form.attendanceDuration <= 0) {
    ElMessage.warning('参会时长必须大于0');
    return false;
  }
  return true;
};

const handleQuery = async () => {
  if (!validate()) return;
  loading.value = true;
  try {
    const data = await meetingUserCollectionApi.query({ ...form });
    queried.value = true;
    rows.value = data.list || [];
    summary.value = data.summary || null;
    meta.meetingName = data.meetingName || '';
    meta.meetingDate = data.meetingDate || '';
    meta.nameListPath = data.nameListPath || '';
    meta.nameListTotal = data.nameListTotal || 0;
    meta.recordTotal = data.recordTotal || 0;
    meta.matchedTotal = data.matchedTotal || 0;
    meta.excludedNotInNameList = data.excludedNotInNameList || 0;
    meta.excludedNoRecord = data.excludedNoRecord || 0;
    if (!rows.value.length) {
      ElMessage.warning('没有符合条件的数据：请确认活动ID是否正确，或名单里是否有该活动的参会人');
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    loading.value = false;
    nextTick(recalcTableHeight);
  }
};

/* ---------- 导出 ---------- */

const pad = (value: number) => String(value).padStart(2, '0');

/** 与后端同规则的文件名：共创会人员统计_{活动ID}_{yyyyMMddHHmmss}.xlsx */
const buildFileName = () => {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `共创会人员统计_${form.activityId}_${stamp}.xlsx`;
};

const handleExport = async () => {
  if (!queried.value) {
    ElMessage.warning('请先查询出数据再导出');
    return;
  }
  if (!hasData.value) {
    ElMessage.warning('当前没有可导出的数据');
    return;
  }
  exporting.value = true;
  try {
    const result = await meetingUserCollectionApi.exportExcel({ ...form });
    // 后端失败时返回的是 JSON 错误体（responseType=blob 时也会被当成 Blob），需要按文本解析
    const errorMessage = await readJsonErrorFromBlob(result);
    if (errorMessage) {
      ElMessage.error(errorMessage);
      return;
    }
    downloadBlob(result, buildFileName());
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    exporting.value = false;
  }
};

/* ---------- 数据导入：按「活动ID + 战队ID」先清空再导入 ---------- */

const isExcelFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return !!extension && ALLOWED_EXTENSIONS.includes(extension);
};

const clearPendingImportFile = () => {
  pendingImportFile = null;
  importFileName.value = '';
};

const handleImportFileChange = (uploadFile: any) => {
  const file = uploadFile?.raw;
  if (!file) return;
  if (!isExcelFile(file)) {
    ElMessage.error('请上传 Excel 文件（仅支持 .xls、.xlsx）');
    clearPendingImportFile();
    return;
  }
  pendingImportFile = file;
  importFileName.value = file.name;
};

/** 分组结果的展示文案 */
const importGroupText = (group: MeetingUserRecordImportGroup) => {
  const team = group.teamName ? `（${group.teamName}）` : '';
  return `活动 ${group.activityId} / 战队 ${group.teamId}${team}：清空 ${group.deletedCount} 条，导入 ${group.rowCount} 条`;
};

const handleImport = async () => {
  const file = pendingImportFile;
  if (!file) {
    ElMessage.warning('请先选择要导入的 Excel');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '导入会先清空该 Excel 中相同「活动ID + 战队ID」的原有参会数据，再插入 Excel 内容；' +
        '清空与插入在同一事务内完成，失败会整体回滚。确认导入？',
      '确认导入',
      { type: 'warning', confirmButtonText: '确认导入', cancelButtonText: '取消' },
    );
  } catch (e) {
    return;
  }

  importing.value = true;
  try {
    const data = await meetingUserCollectionApi.importExcel(file);
    importResult.value = data;
    ElMessage.success(`导入完成：清空 ${data.deletedTotal} 条，导入 ${data.insertedTotal} 条`);
    clearPendingImportFile();

    // 导入的活动中包含当前正在查看的活动时，自动刷新明细
    const importedActivityIds = (data.groups || []).map((group) => group.activityId);
    if (queried.value && form.activityId && importedActivityIds.includes(form.activityId)) {
      await handleQuery();
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    importing.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', recalcTableHeight);
  nextTick(recalcTableHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcTableHeight);
});
</script>

<template>
  <div class="meeting-collection">
    <!-- 数据导入：按「活动ID + 战队ID」先清空再导入，是查询/导出前的数据准备 -->
    <div class="import-bar">
      <span class="import-title">数据导入</span>

      <el-upload
        :show-file-list="false"
        :accept="ACCEPT_TYPES"
        :auto-upload="false"
        :on-change="handleImportFileChange"
      >
        <el-button :icon="UploadFilled">选择导入Excel</el-button>
      </el-upload>

      <span class="filename" :class="{ empty: !importFileName }" :title="importFileName">
        {{ importFileName || '未选择文件' }}
      </span>

      <el-button type="primary" :loading="importing" :disabled="!importFileName" @click="handleImport">
        导入并覆盖
      </el-button>

      <el-tooltip placement="top">
        <template #content>
          <div class="tip-line">· 模版：docs/共创会导入数据.xlsx（21 列，与 meeting_user_real_record 字段一一对应，无 id 列）</div>
          <div class="tip-line">· 导入前先按 Excel 中出现的「活动ID + 战队ID」清空原有数据，再按行顺序插入</div>
          <div class="tip-line">· 清空与插入在同一事务内，失败整体回滚；id 由数据库自增</div>
        </template>
        <el-icon class="help-icon"><InfoFilled /></el-icon>
      </el-tooltip>

      <template v-if="importResult">
        <i class="sep"></i>
        <span class="import-result">
          清空 <b>{{ importResult.deletedTotal }}</b> 条 · 导入 <b>{{ importResult.insertedTotal }}</b> 条
          <span class="muted">（{{ importResult.importedAt }}）</span>
        </span>
      </template>

      <div v-if="importResult && importResult.groups.length" class="import-groups">
        <span v-for="group in importResult.groups" :key="group.activityId + '-' + group.teamId" class="group-item">
          {{ importGroupText(group) }}
        </span>
      </div>
    </div>

    <!-- 参数区 -->
    <div class="param-bar">
      <div class="param-item">
        <label class="param-label">活动ID</label>
        <el-input-number
          v-model="form.activityId"
          :min="1"
          :step="1"
          :precision="0"
          :controls="false"
          placeholder="如 645"
          style="width: 130px"
          @keyup.enter="handleQuery"
        />
      </div>

      <div class="param-item">
        <label class="param-label">答题分数（该活动答题满分）</label>
        <el-input-number
          v-model="form.answerScore"
          :min="1"
          :precision="2"
          :step="10"
          :controls="false"
          style="width: 130px"
          @keyup.enter="handleQuery"
        />
      </div>

      <div class="param-item">
        <label class="param-label">参会时长（应观看时长，秒）</label>
        <el-input-number
          v-model="form.attendanceDuration"
          :min="1"
          :step="60"
          :precision="0"
          :controls="false"
          style="width: 150px"
          @keyup.enter="handleQuery"
        />
      </div>

      <el-button type="primary" :icon="Search" :loading="loading" @click="handleQuery">查询</el-button>
      <el-button
        type="success"
        :icon="Download"
        :loading="exporting"
        :disabled="!queried || !hasData"
        @click="handleExport"
      >
        导出Excel
      </el-button>

      <el-tooltip placement="top">
        <template #content>
          <div class="tip-line">· 答题分数＝该活动的答题满分（答题准确率的分母），不是某个人的得分</div>
          <div class="tip-line">· 参会时长＝应观看时长（秒），既是观看时长的封顶值，也是观看率的分母</div>
          <div class="tip-line">· 明细按人员名单取交集：名单外的人不展示，名单里但该活动无记录的人也不展示</div>
          <div class="tip-line">· 汇总行为整个战队口径（不含名单过滤），与导出模板的汇总块一致</div>
        </template>
        <el-icon class="help-icon"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>

    <!-- 概况区 -->
    <div class="overview-bar">
      <template v-if="queried">
        <span class="meeting">
          <b>{{ meta.meetingName || '—' }}</b>
          <i class="dot"></i>
          <span class="muted">ID {{ form.activityId }}</span>
          <i class="dot"></i>
          <span class="muted">{{ meta.meetingDate || '日期未知' }}</span>
        </span>

        <i class="sep"></i>

        <span><b>{{ meta.recordTotal }}</b> 活动记录</span>
        <i class="dot"></i>
        <span :title="meta.nameListPath"><b>{{ meta.nameListTotal }}</b> 名单</span>
        <i class="dot"></i>
        <span><b>{{ meta.matchedTotal }}</b> 匹配</span>
        <i class="dot"></i>
        <span class="muted" title="有参会记录但不在人员名单中被过滤掉的人数">
          <b>{{ meta.excludedNotInNameList }}</b> 名单外过滤
        </span>
        <i class="dot"></i>
        <span class="muted" title="在人员名单中但该活动没有参会记录的人数">
          <b>{{ meta.excludedNoRecord }}</b> 名单内无记录
        </span>
      </template>
      <span v-else class="overview-empty">
        填写活动ID、答题分数与参会时长后点击「查询」，这里会显示共创会信息与匹配概况
      </span>
    </div>

    <!-- 明细表：表体内部滚动，底部为战队汇总行 -->
    <div ref="tableCardRef" class="table-card">
      <div class="table-head">
        <span class="title">参会明细</span>
        <span v-if="queried" class="sub">共 {{ rows.length }} 人</span>
        <span v-if="summary" class="summary-hint" title="汇总行口径：整个战队，不含人员名单过滤">
          汇总行＝整个战队（含名单外人员）
        </span>
      </div>

      <el-table
        :data="rows"
        :height="tableHeight"
        v-loading="loading"
        stripe
        :show-summary="!!summary"
        :summary-method="summaryMethod"
      >
        <el-table-column type="index" label="序号" width="64" align="center" fixed />
        <el-table-column
          v-for="col in columnDefs"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :min-width="col.minWidth"
          :sortable="col.sortable"
          :sort-method="col.sortable ? sortMethodOf(col.prop) : undefined"
          :sort-orders="col.sortable ? SORT_ORDERS : undefined"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="col.prop === 'userCode'" class="cell-code">{{ row.userCode }}</span>
            <span v-else-if="col.prop === 'userName'" class="cell-name">{{ row.userName }}</span>
            <span v-else-if="col.prop === 'answerScoreTotal'" class="cell-num">
              {{ fmt2(row.answerScoreTotal) }}
            </span>
            <span v-else-if="col.prop === 'watchDuration'" class="cell-num">{{ row.watchDuration }}</span>
            <el-tag
              v-else-if="col.prop === 'score'"
              :type="scoreTagType(row.score)"
              effect="light"
              round
            >
              {{ fmt1(row.score) }}
            </el-tag>
            <span v-else class="cell-num">{{ fmt1(row[col.prop]) }}</span>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            :image-size="70"
            :description="queried ? '没有匹配到人员名单的参会记录' : '暂无数据，请先在上方输入参数并查询'"
          />
        </template>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* el-main 自带 20px 内边距，这里不再叠加 */
.meeting-collection {
  padding-bottom: 20px;

  /* ---------- 数据导入 ---------- */
  .import-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    .import-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .filename {
      max-width: 240px;
      overflow: hidden;
      font-size: 13px;
      color: #303133;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.empty {
        color: #a8abb2;
      }
    }

    .help-icon {
      color: #909399;
      cursor: help;

      &:hover {
        color: #409eff;
      }
    }

    .import-result {
      font-size: 13px;
      color: #606266;

      b {
        margin-right: 2px;
        font-size: 15px;
        color: #303133;
      }

      .muted {
        color: #909399;
      }
    }

    .sep {
      flex-shrink: 0;
      width: 1px;
      height: 14px;
      margin: 0 2px;
      background: #dcdfe6;
    }

    /* 导入分组明细：整行换行展示在控件下方 */
    .import-groups {
      display: flex;
      flex: 1 0 100%;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 12px;
      color: #606266;

      .group-item {
        padding: 2px 8px;
        background: #f5f7fa;
        border-radius: 4px;
      }
    }
  }

  /* ---------- 参数区 ---------- */
  .param-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 12px;
    padding: 12px 16px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    .param-item {
      display: flex;
      flex-direction: column;

      .param-label {
        margin-bottom: 4px;
        font-size: 12px;
        color: #909399;
      }
    }

    .help-icon {
      margin-bottom: 6px;
      color: #909399;
      cursor: help;

      &:hover {
        color: #409eff;
      }
    }
  }

  .tip-line {
    line-height: 20px;
  }

  /* ---------- 概况区 ---------- */
  .overview-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    padding: 10px 16px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #606266;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    b {
      margin-right: 2px;
      font-size: 15px;
      color: #303133;
    }

    .meeting b {
      font-size: 14px;
      font-weight: 600;
    }

    .muted b {
      font-size: 14px;
      color: #909399;
    }

    .overview-empty {
      color: #a8abb2;
    }

    .dot {
      flex-shrink: 0;
      width: 3px;
      height: 3px;
      background: #dcdfe6;
      border-radius: 50%;
    }

    .sep {
      flex-shrink: 0;
      width: 1px;
      height: 14px;
      margin: 0 2px;
      background: #dcdfe6;
    }
  }

  /* ---------- 表格卡片 ---------- */
  .table-card {
    overflow: hidden;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    .table-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f2f5;

      .title {
        font-size: 15px;
        font-weight: 600;
        color: #303133;
      }

      .sub {
        font-size: 12px;
        color: #909399;
      }

      .summary-hint {
        padding: 1px 8px;
        font-size: 12px;
        color: #409eff;
        background: #ecf5ff;
        border-radius: 10px;
      }
    }
  }

  /* ---------- 表格 ---------- */
  :deep(.el-table) {
    th.el-table__cell {
      font-weight: 600;
      color: #303133;
      background: #fafafa;
    }

    /* 可排序表头：整格可点，去掉默认那两个小三角按钮（太难点），改用文字箭头提示当前顺序 */
    th.el-table__cell.is-sortable {
      cursor: pointer;
      user-select: none;

      &:hover {
        color: var(--el-color-primary, #409eff);
      }
    }

    th.el-table__cell .cell {
      /* 表头文字与排序箭头保持在同一行 */
      white-space: nowrap;
    }

    th.el-table__cell .caret-wrapper {
      display: none;
    }

    /*
      箭头挂在 .cell 内，而不是直接挂在 th 上：
      th 里的 .cell 是块级元素，::after 挂在 th 上会被挤到第二行（标题与箭头分行）
    */
    th.el-table__cell.descending .cell::after,
    th.el-table__cell.ascending .cell::after {
      margin-left: 4px;
      font-size: 12px;
      color: var(--el-color-primary, #409eff);
    }

    th.el-table__cell.descending .cell::after {
      content: '↓';
    }

    th.el-table__cell.ascending .cell::after {
      content: '↑';
    }

    /* 汇总行与导出模板的汇总块对齐：加粗、底色区分 */
    .el-table__footer-wrapper td.el-table__cell {
      font-weight: 600;
      color: #303133;
      background: #fafafa;
    }

    .cell-name {
      font-weight: 500;
      color: #303133;
    }

    .cell-code {
      font-family: Menlo, Consolas, monospace;
      letter-spacing: 0.3px;
      color: #606266;
    }

    .cell-num {
      font-family: Menlo, Consolas, monospace;
    }
  }
}
</style>
