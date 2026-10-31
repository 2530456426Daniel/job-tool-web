<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled, Refresh, UploadFilled } from '@element-plus/icons-vue';
import { okrStatisticsApi } from '@/api/okrStatistics';
import type { OkrFilterMap, OkrStatisticsRecord } from '@/api/okrStatistics/types';
import { getErrorMessage } from '@/utils/error';

/**
 * 表格列定义，顺序即页面展示顺序，与后端 filters 的键一致。
 * filterable 控制该字段是否出现在筛选区（表格列始终全部展示）；
 * sortable 控制该列标题是否可点击排序。
 */
const columnDefs = [
  { prop: 'name', label: '姓名', filterable: false, sortable: false },
  { prop: 'employeeNo', label: '工号', filterable: false, sortable: true },
  { prop: 'reviewRate', label: '上月OKR达成复盘率', filterable: true, sortable: true },
  { prop: 'okrPublished', label: '本月OKRI是否及时发布', filterable: true, sortable: true },
  { prop: 'growthCurveUpdated', label: '增长曲线是否更新完成', filterable: true, sortable: true },
  { prop: 'managerOrAbove', label: '是否是经理及以上', filterable: true, sortable: false },
  { prop: 'oAlignRate', label: 'O对齐率', filterable: false, sortable: false },
] as const;

/** 需要提供筛选的字段：姓名、工号、O对齐率不参与筛选 */
const filterDefs = columnDefs.filter((col) => col.filterable);

/**
 * 排序顺序：点一下倒序、再点一下正序，如此循环（没有「不排序」这个中间态）。
 *
 * <p>Element Plus 的表头整格本身就可点击排序（click 事件挂在 th 上），
 * 默认循环是 升序 → 降序 → 不排序，这里通过 sort-orders 改成 降序 → 升序。</p>
 */
const SORT_ORDERS: Array<'ascending' | 'descending'> = ['descending', 'ascending'];

const ACCEPT_TYPES =
  '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ALLOWED_EXTENSIONS = ['xls', 'xlsx'];

/** 表格底部预留的呼吸空间，避免最后一行贴着屏幕底边 */
const TABLE_BOTTOM_GAP = 24;
/** 表格卡片头部高度（.table-head 的 12+12 内边距 + 22 行高） */
const TABLE_HEAD_HEIGHT = 46;

const loading = ref(false);
const uploading = ref(false);
const uploaded = ref(false);
const fileName = ref('');

/**
 * 待上传的文件；刻意用普通变量而不是 ref。
 * File 对象若被 Vue 的 reactive/ref 代理，再交给 FormData 可能出问题。
 */
let pendingFile: File | null = null;

const rows = ref<OkrStatisticsRecord[]>([]);
const filterMap = ref<OkrFilterMap>({});

/** 元信息：最近一次上传的摘要 */
const meta = reactive({
  uploadedAt: '',
  okrFileName: '',
  nameListPath: '',
  okrTotal: 0,
  nameListTotal: 0,
  matchedTotal: 0,
});

/** 每个可筛选字段已选中的筛选值 */
const selected = reactive<Record<string, string[]>>({});
filterDefs.forEach((col) => {
  selected[col.prop] = [];
});

/** 名单外被过滤掉的人数：由 达成总数 - 匹配数 得出，无需后端额外字段 */
const filteredOutCount = computed(() => Math.max(meta.okrTotal - meta.matchedTotal, 0));

/* ---------- 三个「未达成」人数：按当前已匹配的全部数据统计 ---------- */

/** 上月OKR复盘未达成：复盘率未达到 100% 即算未达成（口径由需求方确认） */
const reviewNotDoneCount = computed(() => rows.value.filter((row) => row.reviewRate !== '100%').length);

/** 本月OKRI未及时发布 */
const notPublishedCount = computed(() => rows.value.filter((row) => row.okrPublished === '否').length);

/** 增长曲线未更新完成 */
const curveNotUpdatedCount = computed(() => rows.value.filter((row) => row.growthCurveUpdated === '未完成').length);

/* ---------- 表格高度自适应：占满剩余屏幕，而不是固定高度把内容顶到底部 ---------- */
const tableCardRef = ref<HTMLElement>();
const tableHeight = ref(420);

const recalcTableHeight = () => {
  const el = tableCardRef.value;
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  const available = window.innerHeight - top - TABLE_HEAD_HEIGHT - TABLE_BOTTOM_GAP;
  tableHeight.value = Math.max(240, available);
};

/**
 * 客户端筛选：字段内多选为 OR，字段间为 AND
 * 后端返回全量明细（数据量百级），筛选与计数均不在前端重复计算，计数直接用接口返回值
 */
const displayRows = computed(() =>
  rows.value.filter((row) =>
    filterDefs.every((col) => {
      const picked = selected[col.prop];
      if (!picked || !picked.length) return true;
      return picked.includes((row as Record<string, any>)[col.prop]);
    }),
  ),
);

const hasSelection = computed(() => filterDefs.some((col) => selected[col.prop]?.length));

/* ---------- 列排序 ---------- */

/**
 * 枚举字段的显式排序权重。
 * 不能依赖中文字符的 Unicode 顺序（否 U+5426 < 是 U+662F，结果反直觉），
 * 这里固定为「正面值在前」。
 */
const ENUM_SORT_ORDER: Record<string, string[]> = {
  okrPublished: ['是', '否'],
  growthCurveUpdated: ['完成', '未完成'],
};

/** '100%' -> 100；空值或非法值返回 -1，升序时排最前、降序时排最后 */
const parsePercent = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? '').replace('%', ''), 10);
  return Number.isNaN(parsed) ? -1 : parsed;
};

/** 单元格比较器：百分比按数值比，枚举按预设权重比，其余按文本比 */
const compareCell = (prop: string, a: any, b: any): number => {
  const va = a?.[prop];
  const vb = b?.[prop];

  if (prop === 'reviewRate') {
    return parsePercent(va) - parsePercent(vb);
  }

  const order = ENUM_SORT_ORDER[prop];
  if (order) {
    const ia = order.indexOf(va);
    const ib = order.indexOf(vb);
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib);
  }

  // 工号等文本：numeric 让不同长度的数字串也能按数值比较
  return String(va ?? '').localeCompare(String(vb ?? ''), 'zh-CN', { numeric: true });
};

/** el-table 的 sort-method 接收的是整行数据，这里按列 prop 生成比较函数 */
const sortMethodOf = (prop: string) => (a: any, b: any) => compareCell(prop, a, b);

/* ---------- 单元格标签配色：让「异常值」一眼可见 ---------- */
type TagType = '' | 'success' | 'info' | 'warning' | 'danger';

/** 复盘率：100% 达标、0% 未做、其余部分达成 */
const rateTagType = (value: string): TagType => {
  if (value === '100%') return 'success';
  if (value === '0%') return 'danger';
  return 'warning';
};

/** 是否及时发布：否 属于问题，标红 */
const publishedTagType = (value: string): TagType => (value === '是' ? 'success' : 'danger');

/** 增长曲线：未完成 标橙 */
const curveTagType = (value: string): TagType => (value === '完成' ? 'success' : 'warning');

/** 是否是经理及以上：只是属性，不做褒贬，用中性色 */
const managerTagType = (value: string): TagType => (value === '是' ? '' : 'info');

/** O对齐率：源值为空 → 不适用，与「确实 0%」区分开 */
const oAlignTagType = (value: string): TagType => {
  if (value === '不适用') return 'info';
  if (value === '100%') return 'success';
  if (value === '0%') return 'danger';
  return 'warning';
};

const resetFilters = () => {
  filterDefs.forEach((col) => {
    selected[col.prop] = [];
  });
};

const fetchList = async () => {
  loading.value = true;
  try {
    const data = await okrStatisticsApi.list();
    uploaded.value = !!data.uploaded;
    rows.value = data.list || [];
    filterMap.value = data.filters || {};
    meta.uploadedAt = data.uploadedAt || '';
    meta.okrFileName = data.okrFileName || '';
    meta.nameListPath = data.nameListPath || '';
    meta.okrTotal = data.okrTotal || 0;
    meta.nameListTotal = data.nameListTotal || 0;
    meta.matchedTotal = data.matchedTotal || 0;
    resetFilters();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    loading.value = false;
    // 上传状态变化会改变上方高度（筛选条显隐），需要重算表格高度
    nextTick(recalcTableHeight);
  }
};

const isExcelFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return !!extension && ALLOWED_EXTENSIONS.includes(extension);
};

const clearPendingFile = () => {
  pendingFile = null;
  fileName.value = '';
};

const handleFileChange = (uploadFile: any) => {
  const file = uploadFile?.raw;
  if (!file) return;
  if (!isExcelFile(file)) {
    ElMessage.error('请上传 Excel 文件（仅支持 .xls、.xlsx）');
    clearPendingFile();
    return;
  }
  pendingFile = file;
  fileName.value = file.name;
};

const handleUpload = async () => {
  const file = pendingFile;
  if (!file) {
    ElMessage.warning('请先选择要上传的达成情况 Excel');
    return;
  }

  uploading.value = true;
  try {
    const data = await okrStatisticsApi.upload(file);
    ElMessage.success(
      `上传成功：解析 ${data.okrTotal} 条，名单 ${data.nameListTotal} 条，匹配 ${data.matchedTotal} 条；` +
        `因不在名单被过滤 ${data.excludedNotInNameList} 条`,
    );
    clearPendingFile();
    await fetchList();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  } finally {
    uploading.value = false;
  }
};

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确认清空当前内存中的数据？清空后需要重新上传 Excel。', '提示', {
      type: 'warning',
      confirmButtonText: '确认清空',
      cancelButtonText: '取消',
    });
  } catch (e) {
    return;
  }
  try {
    await okrStatisticsApi.clear();
    ElMessage.success('已清空');
    clearPendingFile();
    await fetchList();
  } catch (error) {
    ElMessage.error(getErrorMessage(error));
  }
};

onMounted(() => {
  fetchList();
  window.addEventListener('resize', recalcTableHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcTableHeight);
});
</script>

<template>
  <div class="okr-statistics">
    <!-- 工具栏：左侧统计概览，右侧上传操作 -->
    <div class="toolbar">
      <div v-if="uploaded" class="summary">
        <span><b>{{ meta.okrTotal }}</b> 达成</span>
        <i class="dot"></i>
        <span><b>{{ meta.nameListTotal }}</b> 名单</span>
        <i class="dot"></i>
        <span><b>{{ meta.matchedTotal }}</b> 匹配</span>
        <i class="dot"></i>
        <span class="muted"><b>{{ filteredOutCount }}</b> 名单外过滤</span>

        <i class="sep"></i>

        <span class="warn" title="上月OKR达成复盘率未达到 100% 的人数">
          <b>{{ reviewNotDoneCount }}</b> 复盘未达成
        </span>
        <i class="dot"></i>
        <span class="warn" title="本月OKRI未及时发布的人数">
          <b>{{ notPublishedCount }}</b> 未及时发布
        </span>
        <i class="dot"></i>
        <span class="warn" title="增长曲线未更新完成的人数">
          <b>{{ curveNotUpdatedCount }}</b> 增长曲线未更新
        </span>
      </div>
      <span v-else class="summary-empty">上传达成情况 Excel 后，这里显示统计概览</span>

      <div class="flex-spacer"></div>

      <el-upload
        :show-file-list="false"
        :accept="ACCEPT_TYPES"
        :auto-upload="false"
        :on-change="handleFileChange"
      >
        <el-button :icon="UploadFilled">选择 Excel</el-button>
      </el-upload>

      <span class="filename" :class="{ empty: !fileName }" :title="fileName">
        {{ fileName || '未选择文件' }}
      </span>

      <el-button type="primary" :loading="uploading" :disabled="!fileName" @click="handleUpload">
        上传并匹配
      </el-button>
      <el-button :disabled="!uploaded" @click="handleClear">清空</el-button>

      <el-tooltip
        content="上传后会重新读取人员名单并取交集：名单外的人不展示，名单中但达成 Excel 里没有的人也不展示。"
        placement="top"
      >
        <el-icon class="help-icon"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>

    <!-- 筛选 -->
    <div v-if="uploaded" class="filter-bar">
      <div class="filter-grid">
        <div v-for="col in filterDefs" :key="col.prop" class="filter-item">
          <label class="filter-label">{{ col.label }}</label>
          <el-select
            v-model="selected[col.prop]"
            size="small"
            multiple
            collapse-tags
            clearable
            placeholder="全部"
          >
            <el-option
              v-for="option in filterMap[col.prop] || []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>
      <el-button
        class="reset-btn"
        :icon="Refresh"
        size="small"
        :disabled="!hasSelection"
        @click="resetFilters"
      >
        重置
      </el-button>
    </div>

    <!-- 明细：占满剩余屏幕高度，表体内部滚动 -->
    <div ref="tableCardRef" class="table-card">
      <div class="table-head">
        <span class="title">统计数据</span>
        <span v-if="uploaded" class="sub">
          共 {{ rows.length }} 条<template v-if="hasSelection">，筛选后 {{ displayRows.length }} 条</template>
        </span>
        <span v-if="hasSelection" class="filtered-tag">已筛选</span>
      </div>
      <el-table :data="displayRows" :height="tableHeight" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="64" align="center" fixed />
        <el-table-column
          v-for="col in columnDefs"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :min-width="col.prop === 'name' ? 100 : 150"
          :sortable="col.sortable"
          :sort-method="col.sortable ? sortMethodOf(col.prop) : undefined"
          :sort-orders="col.sortable ? SORT_ORDERS : undefined"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="col.prop === 'name'" class="cell-name">{{ row.name }}</span>
            <span v-else-if="col.prop === 'employeeNo'" class="cell-code">{{ row.employeeNo }}</span>
            <el-tag
              v-else-if="col.prop === 'reviewRate'"
              :type="rateTagType(row.reviewRate)"
              effect="light"
              round
            >
              {{ row.reviewRate }}
            </el-tag>
            <el-tag
              v-else-if="col.prop === 'okrPublished'"
              :type="publishedTagType(row.okrPublished)"
              effect="light"
              round
            >
              {{ row.okrPublished }}
            </el-tag>
            <el-tag
              v-else-if="col.prop === 'growthCurveUpdated'"
              :type="curveTagType(row.growthCurveUpdated)"
              effect="light"
              round
            >
              {{ row.growthCurveUpdated }}
            </el-tag>
            <el-tag
              v-else-if="col.prop === 'managerOrAbove'"
              :type="managerTagType(row.managerOrAbove)"
              effect="light"
              round
            >
              {{ row.managerOrAbove }}
            </el-tag>
            <el-tag
              v-else-if="col.prop === 'oAlignRate'"
              :type="oAlignTagType(row.oAlignRate)"
              effect="light"
              round
            >
              {{ row.oAlignRate }}
            </el-tag>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            :image-size="70"
            :description="uploaded ? '没有符合筛选条件的数据' : '暂无数据，请先选择并上传达成情况 Excel'"
          />
        </template>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* el-main 自带 20px 内边距，这里不再叠加 */
.okr-statistics {
  padding-bottom: 20px;

  .flex-spacer {
    flex: 1;
  }

  /* ---------- 工具栏 ---------- */
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    .filename {
      max-width: 280px;
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

    .summary-empty {
      font-size: 13px;
      color: #a8abb2;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      font-size: 13px;
      color: #606266;

      b {
        margin-right: 2px;
        font-size: 15px;
        color: #303133;
      }

      .muted b {
        color: #909399;
      }

      /* 三个「未达成」人数统一用警示色，和上面的数据概况区分开 */
      .warn b {
        color: #e6a23c;
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
  }

  /* ---------- 筛选 ---------- */
  .filter-bar {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    .filter-grid {
      display: grid;
      flex: 1;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 10px 12px;
    }

    .filter-item {
      .filter-label {
        display: block;
        margin-bottom: 4px;
        overflow: hidden;
        font-size: 12px;
        color: #909399;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      :deep(.el-select) {
        width: 100%;
      }
    }

    .reset-btn {
      flex-shrink: 0;
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

      .filtered-tag {
        padding: 1px 8px;
        font-size: 12px;
        color: #e6a23c;
        background: #fdf6ec;
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

    .cell-name {
      font-weight: 500;
      color: #303133;
    }

    .cell-code {
      font-family: Menlo, Consolas, monospace;
      letter-spacing: 0.3px;
      color: #606266;
    }
  }
}
</style>
