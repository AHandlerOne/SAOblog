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
  useMessage,
} from 'naive-ui'
import { adminApi } from '@/api/admin'
import type { Work } from '@/api/works'
import { renderSafeRichText } from '@/utils/content'

const message = useMessage()

const works = ref<Work[]>([])
const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const pageSize = 20

const searchInput = ref('')
const appliedSearch = ref('')
const statusFilter = ref<'ALL' | 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED'>('ALL')

const detailModalVisible = ref(false)
const detailWork = ref<Work | null>(null)
const editingStatus = ref<'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED'>('PENDING')
const rejectReason = ref('')
const statusSubmitting = ref(false)

const statusOptions: SelectOption[] = [
  { label: '全部状态', value: 'ALL' },
  { label: '草稿', value: 'DRAFT' },
  { label: '待审核', value: 'PENDING' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已驳回', value: 'REJECTED' },
]

const editStatusOptions: SelectOption[] = [
  { label: '草稿', value: 'DRAFT' },
  { label: '待审核', value: 'PENDING' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已驳回', value: 'REJECTED' },
]

const statusMap: Record<string, { label: string; type: 'default' | 'warning' | 'success' | 'error' }> = {
  DRAFT: { label: '草稿', type: 'default' },
  PENDING: { label: '待审核', type: 'warning' },
  PUBLISHED: { label: '已发布', type: 'success' },
  REJECTED: { label: '已驳回', type: 'error' },
}

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
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      search: appliedSearch.value || undefined,
    })
    works.value = res.data
    total.value = res.total
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize))
  } catch (error) {
    console.error('Failed to load works:', error)
    message.error('加载作品列表失败')
  } finally {
    loading.value = false
  }
}

function openDetailModal(work: Work) {
  detailWork.value = work
  editingStatus.value = (work.status as 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED') || 'PENDING'
  rejectReason.value = work.rejectReason || ''
  detailModalVisible.value = true
}

async function handleSearch() {
  currentPage.value = 1
  appliedSearch.value = searchInput.value.trim()
  await fetchWorks()
}

async function handleReset() {
  searchInput.value = ''
  appliedSearch.value = ''
  statusFilter.value = 'ALL'
  currentPage.value = 1
  await fetchWorks()
}

async function handleStatusFilterChange() {
  currentPage.value = 1
  await fetchWorks()
}

async function handlePageChange(page: number) {
  currentPage.value = page
  await fetchWorks()
}

async function saveWorkStatus() {
  if (!detailWork.value) return
  if (editingStatus.value === 'REJECTED' && !rejectReason.value.trim()) {
    message.warning('驳回状态需要填写原因')
    return
  }

  statusSubmitting.value = true
  try {
    await adminApi.changeWorkStatus(
      detailWork.value.id,
      editingStatus.value,
      editingStatus.value === 'REJECTED' ? rejectReason.value.trim() : undefined,
    )
    message.success('作品状态已更新')
    detailModalVisible.value = false
    await fetchWorks()
  } catch (error: any) {
    message.error(error?.response?.data?.message || '更新作品状态失败')
  } finally {
    statusSubmitting.value = false
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDescription(value: string | null | undefined): string {
  return (value || '').trim() || '暂无简介'
}

const columns: DataTableColumns<Work> = [
  {
    title: '作品',
    key: 'title',
    minWidth: 320,
    render: (row) => h('div', { class: 'work-cell' }, [
      row.coverImage
        ? h(NImage, {
            src: row.coverImage,
            width: 64,
            height: 64,
            objectFit: 'cover',
            previewDisabled: true,
            class: 'work-cover',
          })
        : h('div', { class: 'work-cover work-cover-placeholder' }, '无图'),
      h('div', { class: 'work-info' }, [
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            onClick: () => openDetailModal(row),
          },
          { default: () => row.title },
        ),
        h('div', { class: 'work-summary text-secondary' }, formatDescription(row.description)),
      ]),
    ]),
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
    width: 100,
    render: (row) => {
      const type = (row.type || 'OTHER').toUpperCase()
      return h(
        NTag,
        { size: 'small', bordered: false, type: typeColors[type] || 'warning' },
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
        { size: 'small', bordered: false, type: status.type },
        { default: () => status.label },
      )
    },
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 170,
    render: (row) => formatDate(row.updatedAt || row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => h(
      NButton,
      {
        size: 'small',
        onClick: () => openDetailModal(row),
      },
      { default: () => '查看 / 修改' },
    ),
  },
]
</script>

<template>
  <div class="works-manage-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">作品管理</h1>
        <p class="page-desc text-secondary">查看所有作品，支持按标题、作者、标签简单搜索，并直接调整作品状态。</p>
      </div>
    </div>

    <NCard class="filter-card">
      <div class="filter-bar">
        <NInput
          v-model:value="searchInput"
          clearable
          placeholder="搜索作品标题、作者昵称、标签"
          @keyup.enter="handleSearch"
        />
        <NSelect
          v-model:value="statusFilter"
          :options="statusOptions"
          placeholder="筛选状态"
          @update:value="handleStatusFilterChange"
        />
        <NButton type="primary" @click="handleSearch">搜索</NButton>
        <NButton @click="handleReset">重置</NButton>
      </div>
      <div class="filter-meta text-secondary">
        <span>共 {{ total }} 篇作品</span>
        <span v-if="appliedSearch">当前搜索：{{ appliedSearch }}</span>
      </div>
    </NCard>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty v-else-if="works.length === 0" description="当前条件下没有找到作品" class="page-empty" />

    <template v-else>
      <NCard>
        <NDataTable
          :columns="columns"
          :data="works"
          :bordered="false"
          :single-line="false"
          :scroll-x="980"
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
      title="作品详情"
      :style="{ width: 'min(960px, 92vw)' }"
    >
      <template v-if="detailWork">
        <div class="detail-head">
          <div>
            <h2 class="detail-title">{{ detailWork.title }}</h2>
            <div class="detail-meta text-secondary">
              <span>作者：{{ detailWork.author?.nickname || '-' }}</span>
              <span>类型：{{ typeLabels[(detailWork.type || 'OTHER').toUpperCase()] || detailWork.type }}</span>
              <span>当前状态：{{ statusMap[detailWork.status]?.label || detailWork.status }}</span>
              <span>更新时间：{{ formatDate(detailWork.updatedAt || detailWork.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div v-if="detailWork.tags?.length" class="detail-tags">
          <NTag v-for="tag in detailWork.tags" :key="tag" size="small" round>{{ tag }}</NTag>
        </div>

        <div class="detail-status-panel">
          <div class="detail-section-title">修改状态</div>
          <div class="status-edit-row">
            <NSelect v-model:value="editingStatus" :options="editStatusOptions" />
            <NButton type="primary" :loading="statusSubmitting" @click="saveWorkStatus">保存状态</NButton>
          </div>
          <NInput
            v-if="editingStatus === 'REJECTED'"
            v-model:value="rejectReason"
            type="textarea"
            placeholder="驳回状态需要填写原因"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
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
      </template>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="detailModalVisible = false">关闭</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.page-header {
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

.filter-card {
  margin-bottom: 18px;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 180px auto auto;
  gap: 12px;
}

.filter-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
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

.work-cell {
  display: flex;
  gap: 12px;
  align-items: center;
}

.work-cover {
  border-radius: 10px;
  overflow: hidden;
}

.work-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--sao-text-secondary);
  font-size: 12px;
}

.work-info {
  min-width: 0;
}

.work-summary {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.detail-head {
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

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-status-panel,
.detail-section {
  margin-bottom: 20px;
}

.detail-section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sao-text-primary);
}

.status-edit-row {
  display: grid;
  grid-template-columns: minmax(180px, 240px) auto;
  gap: 12px;
  margin-bottom: 12px;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .filter-bar,
  .status-edit-row {
    grid-template-columns: 1fr;
  }

  .detail-content {
    max-height: 46vh;
  }
}
</style>
