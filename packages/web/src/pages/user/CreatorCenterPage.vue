<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { worksApi, type CreatorDashboard, type UserInteractionTrend, type Work } from '@/api/works'
import { getFreshWorkCreateRoute } from '@/utils/work-create'
import {
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NGrid,
  NGi,
  NModal,
  NPagination,
  NSpin,
  NStatistic,
  NTabPane,
  NTabs,
  NTag,
  useMessage,
} from 'naive-ui'

type CreatorTab = 'DRAFT' | 'PENDING' | 'REJECTED' | 'PUBLISHED'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const dashboardLoading = ref(false)
const batchDeleting = ref(false)
const deleteConfirmVisible = ref(false)
const works = ref<Work[]>([])
const activeTab = ref<CreatorTab>('PUBLISHED')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const dashboard = ref<CreatorDashboard | null>(null)
const selectedWorkIds = ref<string[]>([])
const trendPeriod = ref<'WEEK' | 'MONTH'>('WEEK')
const interactionTrends = ref<UserInteractionTrend[]>([])

const tabLabel: Record<CreatorTab, string> = {
  DRAFT: '草稿箱',
  PENDING: '待审核',
  REJECTED: '已驳回',
  PUBLISHED: '已发布',
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const selectedCount = computed(() => selectedWorkIds.value.length)
const selectedWorks = computed(() => works.value.filter((work) => selectedWorkIds.value.includes(work.id)))
const allVisibleSelected = computed(() => works.value.length > 0 && works.value.every((work) => selectedWorkIds.value.includes(work.id)))

function syncTabFromRoute() {
  const tab = String(route.query.tab || '').toLowerCase()
  if (tab === 'draft') activeTab.value = 'DRAFT'
  else if (tab === 'pending') activeTab.value = 'PENDING'
  else if (tab === 'rejected') activeTab.value = 'REJECTED'
  else activeTab.value = 'PUBLISHED'
}

function clearSelection() {
  selectedWorkIds.value = []
}

async function fetchDashboard() {
  dashboardLoading.value = true
  try {
    const res = await worksApi.getCreatorDashboard()
    dashboard.value = res.data
  } finally {
    dashboardLoading.value = false
  }
}

async function fetchTrends() {
  try {
    const me = localStorage.getItem('sao_user')
    if (!me) {
      interactionTrends.value = []
      return
    }
    const user = JSON.parse(me) as { id?: string }
    if (!user.id) {
      interactionTrends.value = []
      return
    }
    const res = await worksApi.getUserInteractionTrends(user.id, { period: trendPeriod.value, limit: 12 })
    interactionTrends.value = res.data
  } catch {
    interactionTrends.value = []
  }
}

async function fetchWorks() {
  loading.value = true
  try {
    const res = await worksApi.getCreatorWorks({
      status: activeTab.value,
      page: currentPage.value,
      pageSize,
    })
    works.value = res.data
    total.value = res.total
    clearSelection()
  } catch (error: any) {
    works.value = []
    total.value = 0
    clearSelection()
    message.error(error?.response?.data?.message || '加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function switchTab(tab: CreatorTab) {
  router.replace({
    name: 'CreatorCenter',
    query: { tab: tab.toLowerCase() },
  })
}

async function submitDraft(workId: string) {
  try {
    await worksApi.submitDraft(workId)
    message.success('已提交审核')
    await Promise.all([fetchDashboard(), fetchWorks()])
  } catch (error: any) {
    message.error(error?.response?.data?.message || '提交失败')
  }
}

async function revokeWork(workId: string) {
  try {
    await worksApi.revokeWork(workId)
    message.success('已撤销提交')
    await Promise.all([fetchDashboard(), fetchWorks()])
  } catch (error: any) {
    message.error(error?.response?.data?.message || '撤销失败')
  }
}

async function resubmitWork(workId: string) {
  try {
    await worksApi.resubmitWork(workId)
    message.success('已重新提交审核')
    await Promise.all([fetchDashboard(), fetchWorks()])
  } catch (error: any) {
    message.error(error?.response?.data?.message || '重提失败')
  }
}

function goToCreate() {
  router.push(getFreshWorkCreateRoute())
}

function goToDetail(workId: string) {
  router.push(`/community/works/${workId}`)
}

function goToEdit(workId: string) {
  router.push({
    name: 'WorkCreate',
    query: { workId },
  })
}

function handlePageChange(page: number) {
  currentPage.value = page
  void fetchWorks()
}

function handleWorkSelect(workId: string, checked: boolean) {
  if (checked) {
    if (!selectedWorkIds.value.includes(workId)) {
      selectedWorkIds.value = [...selectedWorkIds.value, workId]
    }
    return
  }

  selectedWorkIds.value = selectedWorkIds.value.filter((id) => id !== workId)
}

function toggleSelectCurrentPage(checked: boolean) {
  if (checked) {
    selectedWorkIds.value = works.value.map((work) => work.id)
    return
  }

  clearSelection()
}

function openBatchDeleteConfirm() {
  if (selectedCount.value === 0) {
    message.warning('请先选择要删除的作品')
    return
  }
  deleteConfirmVisible.value = true
}

async function confirmBatchDelete() {
  if (selectedWorkIds.value.length === 0) {
    deleteConfirmVisible.value = false
    return
  }

  batchDeleting.value = true
  try {
    const result = await worksApi.batchDeleteWorks(selectedWorkIds.value)
    message.success(`已删除 ${result.deletedCount} 篇作品`)
    deleteConfirmVisible.value = false
    clearSelection()
    await Promise.all([fetchDashboard(), fetchWorks()])
  } catch (error: any) {
    message.error(error?.response?.data?.message || '批量删除失败')
  } finally {
    batchDeleting.value = false
  }
}

function formatDate(date: string): string {
  const value = new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function getEditHint(work: Work): string {
  if (work.editCount <= 0) {
    return '首次发布'
  }
  return `已编辑 ${work.editCount} 次`
}

async function switchTrendPeriod(period: 'WEEK' | 'MONTH') {
  if (trendPeriod.value === period) return
  trendPeriod.value = period
  await fetchTrends()
}

onMounted(async () => {
  syncTabFromRoute()
  await Promise.all([fetchDashboard(), fetchWorks(), fetchTrends()])
})

watch(() => route.query.tab, async () => {
  syncTabFromRoute()
  currentPage.value = 1
  clearSelection()
  await fetchWorks()
})
</script>

<template>
  <div class="creator-center-page">
    <div class="page-header">
      <div>
        <h1 class="sao-section-title">创作者中心</h1>
        <p class="page-subtitle text-secondary">管理自己的作品、审核状态和二次编辑记录</p>
      </div>
      <NButton type="primary" @click="goToCreate">发布新作品</NButton>
    </div>

    <NSpin v-if="dashboardLoading" size="small" class="dashboard-loading" />
    <NGrid v-else :cols="4" :x-gap="12" :y-gap="12" responsive="screen" class="stats-grid">
      <NGi>
        <NCard size="small"><NStatistic label="草稿" :value="dashboard?.draftCount || 0" /></NCard>
      </NGi>
      <NGi>
        <NCard size="small"><NStatistic label="待审核" :value="dashboard?.pendingCount || 0" /></NCard>
      </NGi>
      <NGi>
        <NCard size="small"><NStatistic label="已驳回" :value="dashboard?.rejectedCount || 0" /></NCard>
      </NGi>
      <NGi>
        <NCard size="small"><NStatistic label="已发布" :value="dashboard?.publishedCount || 0" /></NCard>
      </NGi>
    </NGrid>

    <NCard size="small" class="trend-card">
      <div class="trend-header">
        <h3>互动增长趋势</h3>
        <div class="trend-actions">
          <NButton size="tiny" :type="trendPeriod === 'WEEK' ? 'primary' : 'default'" @click="switchTrendPeriod('WEEK')">周</NButton>
          <NButton size="tiny" :type="trendPeriod === 'MONTH' ? 'primary' : 'default'" @click="switchTrendPeriod('MONTH')">月</NButton>
        </div>
      </div>
      <NEmpty v-if="interactionTrends.length === 0" description="暂无趋势数据" />
      <div v-else class="trend-list">
        <div v-for="item in interactionTrends" :key="item.id" class="trend-item">
          <span class="trend-time text-secondary">{{ formatDate(item.periodStart) }}</span>
          <span>粉丝 {{ item.followerDelta >= 0 ? '+' : '' }}{{ item.followerDelta }}</span>
          <span>获赞 {{ item.receivedLikeDelta >= 0 ? '+' : '' }}{{ item.receivedLikeDelta }}</span>
          <span>获藏 {{ item.receivedFavoriteDelta >= 0 ? '+' : '' }}{{ item.receivedFavoriteDelta }}</span>
        </div>
      </div>
    </NCard>

    <NTabs :value="activeTab" type="segment" class="status-tabs" @update:value="switchTab">
      <NTabPane name="DRAFT" :tab="tabLabel.DRAFT" />
      <NTabPane name="PENDING" :tab="tabLabel.PENDING" />
      <NTabPane name="REJECTED" :tab="tabLabel.REJECTED" />
      <NTabPane name="PUBLISHED" :tab="tabLabel.PUBLISHED" />
    </NTabs>

    <NCard v-if="works.length > 0" size="small" class="selection-bar">
      <div class="selection-bar-inner">
        <div class="selection-main">
          <NCheckbox :checked="allVisibleSelected" @update:checked="toggleSelectCurrentPage">
            全选本页
          </NCheckbox>
          <span class="selection-count text-secondary">已选择 {{ selectedCount }} 项</span>
        </div>
        <div class="selection-actions">
          <NButton v-if="selectedCount > 0" size="small" secondary @click="clearSelection">取消选择</NButton>
          <NButton size="small" type="error" ghost :disabled="selectedCount === 0" @click="openBatchDeleteConfirm">
            批量删除
          </NButton>
        </div>
      </div>
    </NCard>

    <NSpin v-if="loading" class="page-loading" />
    <NEmpty v-else-if="works.length === 0" :description="`暂无${tabLabel[activeTab]}作品`" class="page-empty" />

    <div v-else class="work-list">
      <NCard
        v-for="work in works"
        :key="work.id"
        class="work-card"
        size="small"
        :class="{ selected: selectedWorkIds.includes(work.id) }"
      >
        <div class="work-main">
          <div class="work-select">
            <NCheckbox
              :checked="selectedWorkIds.includes(work.id)"
              @update:checked="(checked) => handleWorkSelect(work.id, checked)"
            />
          </div>
          <div class="work-info">
            <div class="work-header">
              <h3 class="work-title">{{ work.title }}</h3>
              <div class="work-tags">
                <NTag v-if="work.editCount > 0" type="warning" size="small" :bordered="false">
                  {{ getEditHint(work) }}
                </NTag>
                <NTag v-if="work.status === 'REJECTED' && work.rejectReason" type="error" size="small" :bordered="false">
                  需修改后重提
                </NTag>
              </div>
            </div>
            <p class="work-desc text-secondary">{{ work.description || '暂无简介' }}</p>
            <div class="work-meta text-secondary">
              <span>创建于 {{ formatDate(work.createdAt) }}</span>
              <span>最近更新 {{ formatDate(work.updatedAt) }}</span>
              <span>评论 {{ work._count?.comments || 0 }}</span>
            </div>
            <NTag v-if="work.status === 'REJECTED' && work.rejectReason" type="error" size="small" :bordered="false" class="reject-reason">
              驳回原因：{{ work.rejectReason }}
            </NTag>
          </div>
          <div class="work-actions">
            <NButton size="small" @click="goToDetail(work.id)">查看</NButton>
            <NButton size="small" secondary @click="goToEdit(work.id)">编辑</NButton>
            <NButton v-if="work.status === 'DRAFT'" size="small" type="primary" @click="submitDraft(work.id)">提交审核</NButton>
            <NButton v-if="work.status === 'PENDING'" size="small" type="warning" @click="revokeWork(work.id)">撤销提交</NButton>
            <NButton v-if="work.status === 'REJECTED'" size="small" type="primary" @click="resubmitWork(work.id)">重新提交</NButton>
          </div>
        </div>
      </NCard>
    </div>

    <div v-if="totalPages > 1" class="pagination-wrapper">
      <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
    </div>

    <NModal
      v-model:show="deleteConfirmVisible"
      preset="card"
      title="确认删除所选作品"
      class="delete-modal"
      :style="{ maxWidth: '560px' }"
    >
      <div class="delete-summary">
        <p>将删除 {{ selectedCount }} 篇作品。此操作不可撤销，请确认。</p>
        <div class="delete-list">
          <div v-for="work in selectedWorks.slice(0, 5)" :key="work.id" class="delete-item">
            {{ work.title }}
          </div>
          <div v-if="selectedWorks.length > 5" class="delete-item more">
            以及另外 {{ selectedWorks.length - 5 }} 篇作品
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="deleteConfirmVisible = false">取消</NButton>
          <NButton type="error" :loading="batchDeleting" @click="confirmBatchDelete">确认删除</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.creator-center-page {
  padding: 24px 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-subtitle {
  margin-top: 8px;
  font-size: 14px;
}

.dashboard-loading {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.stats-grid {
  margin-bottom: 16px;
}

.status-tabs {
  margin-bottom: 14px;
}

.trend-card {
  margin-bottom: 14px;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.trend-actions {
  display: flex;
  gap: 8px;
}

.trend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trend-item {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
  gap: 8px;
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid var(--sao-border-color);
  border-radius: 10px;
}

.selection-bar {
  margin-bottom: 14px;
}

.selection-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.selection-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selection-count {
  font-size: 13px;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.work-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.work-card {
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;

  &.selected {
    border-color: rgba(0, 212, 255, 0.45) !important;
    box-shadow: 0 10px 26px rgba(0, 212, 255, 0.1);
  }
}

.work-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.work-select {
  padding-top: 8px;
}

.work-info {
  flex: 1;
  min-width: 0;
}

.work-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.work-title {
  font-size: 16px;
  color: var(--sao-text-primary);
  margin: 0;
}

.work-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.work-desc {
  font-size: 13px;
  margin-bottom: 8px;
  line-height: 1.7;
}

.work-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  margin-bottom: 8px;
}

.reject-reason {
  margin-top: 4px;
}

.work-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.delete-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--sao-text-primary);
}

.delete-summary p {
  margin: 0;
  line-height: 1.7;
}

.delete-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--sao-border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.delete-item {
  font-size: 13px;
  color: var(--sao-text-secondary);
}

.delete-item.more {
  color: var(--sao-accent);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .selection-bar-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .selection-actions {
    width: 100%;
  }

  .work-main {
    flex-direction: column;
  }

  .work-select {
    padding-top: 0;
  }

  .work-header {
    flex-direction: column;
  }

  .work-tags {
    justify-content: flex-start;
  }

  .work-actions {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
