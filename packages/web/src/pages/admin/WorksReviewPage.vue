<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NImage,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { adminApi } from '@/api/admin'
import type { Work } from '@/api/works'
import { renderSafeRichText } from '@/utils/content'

const message = useMessage()
const dialog = useDialog()

const works = ref<Work[]>([])
const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 20
const statusFilter = ref<'PENDING' | 'PUBLISHED' | 'REJECTED' | 'DRAFT'>('PENDING')

const rejectModalVisible = ref(false)
const rejectWorkId = ref('')
const rejectReason = ref('')
const rejectSubmitting = ref(false)

const detailModalVisible = ref(false)
const detailWork = ref<Work | null>(null)

const statusOptions: SelectOption[] = [
  { label: '待审核', value: 'PENDING' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '草稿', value: 'DRAFT' },
]

const rejectReasonTemplates = [
  '图片清晰度不足，请重新上传更清晰的版本。',
  '内容与 SAO 主题关联度较低，请调整后再次提交。',
  '文案中包含不适宜展示的信息，请修改后重新提交。',
  '封面图与作品主体不一致，请更新后再次提交。',
]

const typeLabels: Record<string, string> = {
  ILLUSTRATION: '插画',
  NOVEL: '小说',
  OTHER: '其他',
}

const typeColors: Record<string, 'success' | 'info' | 'warning'> = {
  ILLUSTRATION: 'success',
  NOVEL: 'info',
  OTHER: 'warning',
}

const statusMap: Record<string, { label: string; type: 'default' | 'warning' | 'success' | 'error' }> = {
  DRAFT: { label: '草稿', type: 'default' },
  PENDING: { label: '待审核', type: 'warning' },
  PUBLISHED: { label: '已发布', type: 'success' },
  REJECTED: { label: '已驳回', type: 'error' },
}

const detailContentHtml = computed(() => renderSafeRichText(detailWork.value?.content || ''))

onMounted(() => {
  void fetchWorks()
})

async function fetchWorks() {
  loading.value = true
  try {
    const res = await adminApi.getWorks({
      page: currentPage.value,
      pageSize,
      status: statusFilter.value,
    })
    works.value = res.data
    totalPages.value = Math.ceil(res.total / pageSize)
  } catch (error) {
    console.error('Failed to load works:', error)
    message.error('加载作品失败')
  } finally {
    loading.value = false
  }
}

function openDetailModal(work: Work) {
  detailWork.value = work
  detailModalVisible.value = true
}

async function handleApprove(workId: string) {
  try {
    await adminApi.approveWork(workId)
    message.success('作品已通过审核')
    detailModalVisible.value = false
    await fetchWorks()
  } catch {
    message.error('操作失败，请稍后重试')
  }
}

function openRejectModal(workId: string) {
  rejectWorkId.value = workId
  rejectReason.value = ''
  rejectModalVisible.value = true
}

function useRejectTemplate(text: string) {
  rejectReason.value = text
}

async function handleReject() {
  if (!rejectReason.value.trim()) {
    message.warning('请输入驳回原因')
    return
  }

  rejectSubmitting.value = true
  try {
    await adminApi.rejectWork(rejectWorkId.value, rejectReason.value)
    message.success('作品已驳回')
    rejectModalVisible.value = false
    detailModalVisible.value = false
    await fetchWorks()
  } catch {
    message.error('操作失败，请稍后重试')
  } finally {
    rejectSubmitting.value = false
  }
}

async function handleMoveBackToPending(workId: string) {
  dialog.warning({
    title: '重新进入审核',
    content: '确认将这篇已发布作品改回待审核状态吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminApi.changeWorkStatus(workId, 'PENDING')
        message.success('作品已改为待审核')
        detailModalVisible.value = false
        await fetchWorks()
      } catch {
        message.error('操作失败，请稍后重试')
      }
    },
  })
}

const columns: DataTableColumns<Work> = [
  {
    title: '作品标题',
    key: 'title',
    minWidth: 240,
    render: (row) => h(
      NButton,
      {
        text: true,
        type: 'primary',
        onClick: () => openDetailModal(row),
      },
      { default: () => row.title },
    ),
  },
  {
    title: '作者',
    key: 'author',
    width: 140,
    render: (row) => row.author?.nickname || '-',
  },
  {
    title: '类型',
    key: 'type',
    width: 110,
    render: (row) => {
      const type = (row.type || 'OTHER').toUpperCase()
      return h(
        NTag,
        { size: 'small', type: typeColors[type] || 'warning', bordered: false },
        { default: () => typeLabels[type] || type },
      )
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => {
      const status = statusMap[row.status] || { label: row.status, type: 'default' as const }
      return h(
        NTag,
        { size: 'small', type: status.type, bordered: false },
        { default: () => status.label },
      )
    },
  },
  {
    title: '待审时长',
    key: 'pendingDuration',
    width: 130,
    render: (row) => (row.status === 'PENDING' ? formatPendingDuration(row.updatedAt) : '-'),
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render: (row) => formatDate(row.updatedAt || row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 360,
    fixed: 'right',
    render: (row) => h(NSpace, { size: 'small' }, {
      default: () => {
        const actions: any[] = [
          h(NButton, {
            size: 'small',
            quaternary: true,
            onClick: () => openDetailModal(row),
          }, { default: () => '查看详情' }),
        ]

        if (row.status === 'PENDING') {
          actions.push(
            h(NButton, {
              size: 'small',
              type: 'success',
              onClick: () => handleApprove(row.id),
            }, { default: () => '通过' }),
            h(NButton, {
              size: 'small',
              type: 'error',
              onClick: () => openRejectModal(row.id),
            }, { default: () => '驳回' }),
          )
        }

        if (row.status === 'PUBLISHED') {
          actions.push(
            h(NButton, {
              size: 'small',
              type: 'warning',
              onClick: () => handleMoveBackToPending(row.id),
            }, { default: () => '改回待审核' }),
          )
        }

        return actions
      },
    }),
  },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatPendingDuration(dateStr: string): string {
  const updatedAt = new Date(dateStr).getTime()
  const diff = Math.max(0, Date.now() - updatedAt)
  const totalMinutes = Math.floor(diff / (60 * 1000))

  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
}

function handlePageChange(page: number) {
  currentPage.value = page
  void fetchWorks()
}

function handleStatusChange() {
  currentPage.value = 1
  void fetchWorks()
}
</script>

<template>
  <div class="works-review-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">作品审核</h1>
        <p class="page-desc text-secondary">支持查看完整内容、审核、驳回，以及将已发布作品重新改回待审核状态。</p>
      </div>
      <NSelect
        v-model:value="statusFilter"
        :options="statusOptions"
        class="status-filter"
        @update:value="handleStatusChange"
      />
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty v-else-if="works.length === 0" description="当前筛选条件下没有作品" class="page-empty" />

    <template v-else>
      <NCard>
        <NDataTable
          :columns="columns"
          :data="works"
          :bordered="false"
          :single-line="false"
          :scroll-x="1180"
          size="small"
        />
      </NCard>
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
      </div>
    </template>

    <NModal
      v-model:show="detailModalVisible"
      preset="card"
      title="作品审核详情"
      :style="{ width: 'min(960px, 92vw)' }"
    >
      <template v-if="detailWork">
        <div class="detail-head">
          <div>
            <h2 class="detail-title">{{ detailWork.title }}</h2>
            <div class="detail-meta text-secondary">
              <span>作者：{{ detailWork.author?.nickname || '-' }}</span>
              <span>类型：{{ typeLabels[(detailWork.type || 'OTHER').toUpperCase()] || detailWork.type }}</span>
              <span>状态：{{ statusMap[detailWork.status]?.label || detailWork.status }}</span>
              <span>更新时间：{{ formatDate(detailWork.updatedAt || detailWork.createdAt) }}</span>
            </div>
          </div>
          <div v-if="detailWork.status === 'PENDING'" class="pending-tip">
            超过 8 小时未审核会自动通过
          </div>
        </div>

        <div v-if="detailWork.tags?.length" class="detail-tags">
          <NTag v-for="tag in detailWork.tags" :key="tag" size="small" round>{{ tag }}</NTag>
        </div>

        <div v-if="detailWork.description" class="detail-section">
          <div class="detail-section-title">作品简介</div>
          <div class="detail-summary">{{ detailWork.description }}</div>
        </div>

        <div v-if="detailWork.coverImage" class="detail-section">
          <div class="detail-section-title">封面图</div>
          <NImage :src="detailWork.coverImage" class="detail-cover" object-fit="cover" />
        </div>

        <div v-if="detailWork.images?.length" class="detail-section">
          <div class="detail-section-title">作品图片</div>
          <div class="detail-gallery">
            <NImage
              v-for="image in detailWork.images"
              :key="image.id"
              :src="image.imageUrl"
              class="detail-gallery-item"
              object-fit="cover"
            />
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">正文内容</div>
          <div v-if="detailContentHtml" class="detail-content" v-html="detailContentHtml"></div>
          <div v-else class="text-secondary">暂无正文内容</div>
        </div>

        <div v-if="detailWork.rejectReason" class="detail-section">
          <div class="detail-section-title">驳回原因</div>
          <div class="detail-summary">{{ detailWork.rejectReason }}</div>
        </div>
      </template>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="detailModalVisible = false">关闭</NButton>
          <NButton
            v-if="detailWork?.status === 'PENDING'"
            type="error"
            ghost
            @click="openRejectModal(detailWork.id)"
          >
            驳回
          </NButton>
          <NButton
            v-if="detailWork?.status === 'PENDING'"
            type="success"
            @click="handleApprove(detailWork.id)"
          >
            通过
          </NButton>
          <NButton
            v-if="detailWork?.status === 'PUBLISHED'"
            type="warning"
            @click="handleMoveBackToPending(detailWork.id)"
          >
            改回待审核
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="rejectModalVisible"
      preset="card"
      title="驳回作品"
      :style="{ maxWidth: '560px' }"
    >
      <p class="reject-hint text-secondary">驳回原因会展示给作者，尽量写清楚，方便对方修改后再次提交。</p>
      <div class="reject-templates">
        <NButton
          v-for="item in rejectReasonTemplates"
          :key="item"
          size="tiny"
          quaternary
          @click="useRejectTemplate(item)"
        >
          使用模板
        </NButton>
      </div>
      <NInput
        v-model:value="rejectReason"
        type="textarea"
        placeholder="请输入驳回原因"
        :autosize="{ minRows: 3, maxRows: 6 }"
      />
      <template #footer>
        <div class="modal-footer">
          <NButton @click="rejectModalVisible = false">取消</NButton>
          <NButton type="error" :loading="rejectSubmitting" @click="handleReject">确认驳回</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.page-desc {
  margin: 0;
  font-size: 14px;
}

.status-filter {
  width: 180px;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-title {
  margin: 0 0 10px;
  font-size: 22px;
  color: var(--sao-text-primary);
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 13px;
}

.pending-tip {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(250, 173, 20, 0.12);
  color: #d48806;
  font-size: 12px;
  height: fit-content;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sao-text-primary);
}

.detail-summary {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  line-height: 1.8;
  color: var(--sao-text-secondary);
}

.detail-cover {
  width: min(280px, 100%);
  border-radius: 14px;
  overflow: hidden;
}

.detail-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.detail-gallery-item {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.detail-content {
  max-height: 58vh;
  overflow: auto;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  line-height: 1.9;
  color: var(--sao-text-secondary);
}

.detail-content :deep(h1),
.detail-content :deep(h2),
.detail-content :deep(h3) {
  margin: 18px 0 10px;
  color: var(--sao-text-primary);
}

.detail-content :deep(p) {
  margin-bottom: 12px;
}

.detail-content :deep(img) {
  max-width: min(100%, 560px);
  display: block;
  margin: 16px auto;
  border-radius: 12px;
}

.reject-hint {
  margin-bottom: 12px;
  font-size: 13px;
}

.reject-templates {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .page-header,
  .detail-head,
  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .status-filter {
    width: 100%;
  }

  .detail-content {
    max-height: 46vh;
  }
}
</style>
