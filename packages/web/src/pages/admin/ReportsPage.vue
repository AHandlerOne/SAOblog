<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { adminApi } from '@/api/admin'
import type { AdminReport as Report } from '@/api/admin'
import { NCard, NDataTable, NButton, NSpin, NTag, NEmpty, NSelect, NPagination, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

const message = useMessage()

const reports = ref<Report[]>([])
const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 20
const statusFilter = ref<string | null>(null)

const statusOptions: any[] = [
  { label: '全部', value: null },
  { label: '待处理', value: 'PENDING' },
  { label: '已处理', value: 'RESOLVED' },
  { label: '已驳回', value: 'DISMISSED' },
]

onMounted(() => {
  fetchReports()
})

async function fetchReports() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await adminApi.getReports(params)
    reports.value = res.data
    totalPages.value = Math.ceil(res.total / pageSize)
  } catch (error) {
    console.error('Failed to load reports:', error)
  } finally {
    loading.value = false
  }
}

async function handleResolve(reportId: number) {
  try {
    await adminApi.handleReport(reportId, 'RESOLVED')
    message.success('已处理')
    await fetchReports()
  } catch {
    message.error('操作失败')
  }
}

async function handleDismiss(reportId: number) {
  try {
    await adminApi.handleReport(reportId, 'DISMISSED')
    message.success('已驳回')
    await fetchReports()
  } catch {
    message.error('操作失败')
  }
}

function handleStatusChange() {
  currentPage.value = 1
  fetchReports()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchReports()
}

const columns: DataTableColumns<Report> = [
  {
    title: '目标',
    key: 'targetTitle',
    ellipsis: { tooltip: true },
    minWidth: 160,
  },
  {
    title: '类型',
    key: 'targetType',
    width: 80,
    render: (row: Report) => {
      return h(NTag, { size: 'small', bordered: false, type: 'info' }, { default: () => row.targetType })
    },
  },
  {
    title: '原因',
    key: 'reason',
    ellipsis: { tooltip: true },
    minWidth: 150,
  },
  {
    title: '举报人',
    key: 'reporter',
    width: 100,
    render: (row: Report) => row.reporter?.nickname || '-',
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row: Report) => {
      const statusMap: Record<string, { label: string; type: any }> = {
        PENDING: { label: '待处理', type: 'warning' },
        RESOLVED: { label: '已处理', type: 'success' },
        DISMISSED: { label: '已驳回', type: 'default' },
      }
      const s = statusMap[row.status] || { label: row.status, type: 'default' }
      return h(NTag, { size: 'small', type: s.type, bordered: false }, { default: () => s.label })
    },
  },
  {
    title: '时间',
    key: 'createdAt',
    width: 160,
    render: (row: Report) => formatDate(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (row: Report) => {
      if (row.status !== 'PENDING') return h('span', { class: 'text-secondary' }, '已处理')
      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h(NButton, { size: 'small', type: 'success', onClick: () => handleResolve(row.id) }, { default: () => '处理' }),
        h(NButton, { size: 'small', onClick: () => handleDismiss(row.id) }, { default: () => '驳回' }),
      ])
    },
  },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="reports-page">
    <div class="page-header">
      <h1 class="page-title">举报管理</h1>
      <NSelect
        v-model:value="statusFilter"
        :options="statusOptions"
        placeholder="筛选状态"
        clearable
        class="status-select"
        style="width: 140px;"
        @update:value="handleStatusChange"
      />
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty v-else-if="reports.length === 0" description="暂无举报" class="page-empty" />

    <template v-else>
      <NCard class="table-card">
        <NDataTable
          :columns="columns"
          :data="reports"
          :bordered="false"
          :single-line="false"
          :scroll-x="800"
          size="small"
        />
      </NCard>
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination
          :page="currentPage"
          :page-count="totalPages"
          @update:page="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.reports-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.table-card {
  :deep(.n-card) {
    background: var(--sao-card-bg);
    border: 1px solid var(--sao-border-color);
  }

  :deep(.n-data-table) {
    --n-text-color: var(--sao-text-primary);
    --n-th-text-color: var(--sao-text-secondary);
    --n-td-text-color: var(--sao-text-primary);
    --n-border-color: var(--sao-border-color);
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
