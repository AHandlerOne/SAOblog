<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { adminApi } from '@/api/admin'
import type { AdminStats, AdminReport } from '@/api/admin'
import { NCard, NGrid, NGi, NStatistic, NIcon, NSpin, NDataTable, NTag, NButton } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { PeopleOutline, DocumentTextOutline, ChatbubbleOutline, CheckmarkCircleOutline, FlagOutline } from '@vicons/ionicons5'

const stats = ref<AdminStats | null>(null)
const loading = ref(true)
const errorText = ref('')

onMounted(async () => {
  try {
    const res = await adminApi.getStats()
    stats.value = res.data
  } catch (error) {
    console.error('Failed to load stats:', error)
    errorText.value = '仪表盘数据加载失败，请刷新后重试'
  } finally {
    loading.value = false
  }
})

const reportColumns: DataTableColumns<AdminReport> = [
  {
    title: '目标',
    key: 'targetTitle',
    ellipsis: { tooltip: true },
  },
  {
    title: '原因',
    key: 'reason',
    ellipsis: { tooltip: true },
  },
  {
    title: '举报人',
    key: 'reporter',
    render: (row: any) => row.reporter?.nickname || '-',
  },
  {
    title: '状态',
    key: 'status',
    render: (row: any) => {
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
    render: (row: any) => formatDate(row.createdAt),
  },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="dashboard-page">
    <h1 class="page-title">管理仪表盘</h1>

    <NSpin v-if="loading" class="page-loading" />
    <div v-else-if="errorText" class="empty-state text-secondary">{{ errorText }}</div>

    <template v-else-if="stats">
      <!-- Stats Cards -->
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive class="stats-grid">
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: rgba(0, 212, 255, 0.1); color: var(--sao-accent);">
                <NIcon :size="24" :component="PeopleOutline" />
              </div>
              <NStatistic label="总用户数" :value="stats.totalUsers" class="stat-value" />
            </div>
          </NCard>
        </NGi>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: rgba(78, 205, 196, 0.1); color: var(--sao-accent-secondary);">
                <NIcon :size="24" :component="DocumentTextOutline" />
              </div>
              <NStatistic label="总作品数" :value="stats.totalWorks" class="stat-value" />
            </div>
          </NCard>
        </NGi>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: rgba(255, 217, 61, 0.1); color: #FFD93D;">
                <NIcon :size="24" :component="ChatbubbleOutline" />
              </div>
              <NStatistic label="总评论数" :value="stats.totalComments" class="stat-value" />
            </div>
          </NCard>
        </NGi>
        <NGi span="4 m:2 l:1">
          <NCard class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: rgba(255, 107, 107, 0.1); color: var(--sao-danger);">
                <NIcon :size="24" :component="CheckmarkCircleOutline" />
              </div>
              <NStatistic label="待审核" :value="stats.pendingReviews" class="stat-value" />
            </div>
          </NCard>
        </NGi>
      </NGrid>

      <!-- Recent Reports -->
      <div class="section">
        <h2 class="section-title">最近举报</h2>
        <NCard class="reports-card">
          <NDataTable
            v-if="stats.recentReports && stats.recentReports.length > 0"
            :columns="reportColumns"
            :data="stats.recentReports"
            :bordered="false"
            :single-line="false"
            size="small"
          />
          <div v-else class="empty-state text-secondary">
            暂无举报
          </div>
        </NCard>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  padding: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--sao-text-primary);
  margin-bottom: 24px;
}

.page-loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.stats-grid {
  margin-bottom: 32px;
}

.stat-card {
  :deep(.n-card) {
    background: var(--sao-card-bg);
    border: 1px solid var(--sao-border-color);
  }

  :deep(.n-card__content) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  :deep(.n-statistic-value) {
    color: var(--sao-text-primary);
    font-size: 24px;
    font-weight: 700;
  }

  :deep(.n-statistic-label) {
    color: var(--sao-text-secondary);
    font-size: 13px;
  }
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--sao-text-primary);
  margin-bottom: 12px;
}

.reports-card {
  :deep(.n-card) {
    background: var(--sao-card-bg);
    border: 1px solid var(--sao-border-color);
  }

  :deep(.n-data-table) {
    --n-text-color: var(--sao-text-primary);
    --n-th-text-color: var(--sao-text-secondary);
    --n-td-text-color: var(--sao-text-primary);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  .stat-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
