<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { worksApi, type HotTagItem, type Work } from '@/api/works'
import { useAuthStore } from '@/stores/auth'
import { getFreshWorkCreateRoute } from '@/utils/work-create'
import {
  NButton,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NPagination,
  NSelect,
  NSpin,
  NSwitch,
  NTabPane,
  NTag,
  NTabs,
} from 'naive-ui'
import {
  ChatbubbleOutline,
  CreateOutline,
  HeartOutline,
  SearchOutline,
  StarOutline,
  TimeOutline,
} from '@vicons/ionicons5'

const router = useRouter()
const authStore = useAuthStore()

const works = ref<Work[]>([])
const hotTags = ref<HotTagItem[]>([])
const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const activeTab = ref('all')
const sortBy = ref('recommended')
const searchQuery = ref('')
const selectedTag = ref<string | null>(null)
const featuredOnly = ref(true)

const pageSize = 12
const SEARCH_DEBOUNCE_MS = 320
const SEARCH_THROTTLE_MS = 800

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let throttleTimer: ReturnType<typeof setTimeout> | null = null
let lastFetchAt = 0
let latestRequestId = 0

const myWorksPath = computed(() => (authStore.user ? '/creator?tab=published' : '/login'))

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '插画', value: 'illustration' },
  { label: '小说', value: 'novel' },
  { label: '其他', value: 'other' },
]

const sortOptions = [
  { label: '推荐', value: 'recommended' },
  { label: '热门', value: 'hot' },
  { label: '最新', value: 'new' },
]

const typeLabels: Record<string, string> = {
  illustration: '插画',
  novel: '小说',
  other: '其他',
}

const typeColors: Record<string, 'success' | 'info' | 'warning'> = {
  illustration: 'success',
  novel: 'info',
  other: 'warning',
}

const sortDescription = computed(() => {
  if (!featuredOnly.value) {
    return '当前已关闭精选开关，列表会展示全部公开作品，不再过滤掉完成度较低的真实作品。'
  }
  if (sortBy.value === 'recommended') {
    return '推荐会优先展示封面、简介、标签更完整，同时互动更稳定的公开作品。'
  }
  if (sortBy.value === 'hot') {
    return '热门更偏向近期互动热度，不只是累计点赞高。'
  }
  return '最新按发布时间倒序展示，适合追更和看新内容。'
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatSummary(text: string | null | undefined): string {
  const normalized = (text || '').trim()
  if (!normalized) return '作者还没有填写简介。'
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
}

function clearSearchTimers() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (throttleTimer) {
    clearTimeout(throttleTimer)
    throttleTimer = null
  }
}

function triggerFetchWorks(options?: { immediate?: boolean }) {
  clearSearchTimers()

  if (options?.immediate) {
    void runFetchWorksWithThrottle(true)
    return
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void runFetchWorksWithThrottle(false)
  }, SEARCH_DEBOUNCE_MS)
}

async function runFetchWorksWithThrottle(forceImmediate: boolean) {
  const elapsed = Date.now() - lastFetchAt
  if (!forceImmediate && elapsed < SEARCH_THROTTLE_MS) {
    throttleTimer = setTimeout(() => {
      throttleTimer = null
      void fetchWorks()
    }, SEARCH_THROTTLE_MS - elapsed)
    return
  }

  await fetchWorks()
}

async function fetchHotTags() {
  try {
    const res = await worksApi.getHotTags()
    hotTags.value = res.data
  } catch {
    hotTags.value = []
  }
}

async function fetchWorks() {
  const requestId = ++latestRequestId
  loading.value = true

  try {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      pageSize,
      sort: sortBy.value,
      curated: featuredOnly.value,
    }

    if (activeTab.value !== 'all') {
      params.type = activeTab.value
    }
    if (searchQuery.value.trim()) {
      params.q = searchQuery.value.trim()
    }
    if (selectedTag.value) {
      params.tag = selectedTag.value
    }

    const res = await worksApi.getWorks(params)
    if (requestId !== latestRequestId) return

    works.value = res.data
    totalCount.value = res.total
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize))
  } catch (error) {
    if (requestId !== latestRequestId) return
    console.error('Failed to load works:', error)
    works.value = []
    totalCount.value = 0
    totalPages.value = 1
  } finally {
    if (requestId === latestRequestId) {
      loading.value = false
      lastFetchAt = Date.now()
    }
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  triggerFetchWorks({ immediate: true })
}

function setTag(tag: string | null) {
  selectedTag.value = tag
}

function resetFilters() {
  searchQuery.value = ''
  selectedTag.value = null
  activeTab.value = 'all'
  sortBy.value = 'recommended'
  featuredOnly.value = true
  currentPage.value = 1
  triggerFetchWorks({ immediate: true })
}

function goToDetail(workId: string) {
  router.push(`/community/works/${workId}`)
}

function goToCreateWork() {
  router.push(getFreshWorkCreateRoute())
}

onMounted(() => {
  void Promise.all([fetchWorks(), fetchHotTags()])
})

onBeforeUnmount(() => {
  clearSearchTimers()
})

watch([activeTab, sortBy, selectedTag, featuredOnly], () => {
  currentPage.value = 1
  triggerFetchWorks({ immediate: true })
})

watch(searchQuery, () => {
  currentPage.value = 1
  triggerFetchWorks()
})
</script>

<template>
  <div class="works-list-page">
    <div class="page-header">
      <div>
        <h1 class="sao-section-title">创作社区</h1>
        <p class="page-subtitle text-secondary">这里既可以按精选逛，也可以直接切回全部公开作品。</p>
      </div>
      <div class="header-actions">
        <NButton v-if="authStore.isLoggedIn" round @click="router.push(myWorksPath)">
          我的作品
        </NButton>
        <NButton type="primary" round class="sao-btn-primary" @click="goToCreateWork()">
          <template #icon>
            <NIcon :component="CreateOutline" />
          </template>
          发布作品
        </NButton>
      </div>
    </div>

    <div class="filters-panel sao-card">
      <div class="filters-row">
        <NInput
          v-model:value="searchQuery"
          placeholder="搜索作品标题、作者、标签"
          clearable
          class="search-input"
          @keyup.enter="triggerFetchWorks({ immediate: true })"
        >
          <template #prefix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>
        <NSelect v-model:value="sortBy" :options="sortOptions" class="sort-select" />
      </div>

      <div class="browse-filters">
        <NTabs v-model:value="activeTab" type="segment">
          <NTabPane v-for="item in typeOptions" :key="item.value" :name="item.value" :tab="item.label" />
        </NTabs>

        <div class="filter-rows">
          <div class="quick-tags">
            <span class="quick-tags-label text-secondary">快速标签</span>
            <NTag
              :bordered="false"
              :type="selectedTag === null ? 'info' : 'default'"
              class="filter-tag"
              @click="setTag(null)"
            >
              全部
            </NTag>
            <NTag
              v-for="tag in hotTags"
              :key="tag.name"
              :bordered="false"
              :type="selectedTag === tag.name ? 'info' : 'default'"
              class="filter-tag"
              @click="setTag(tag.name)"
            >
              {{ tag.name }}
              <span class="filter-tag-count">{{ tag.count }}</span>
            </NTag>
          </div>

          <div class="featured-toggle">
            <div class="toggle-copy">
              <strong>精选模式</strong>
              <span class="text-secondary">开启后优先过滤并展示完成度更高的公开作品。</span>
            </div>
            <NSwitch v-model:value="featuredOnly" />
          </div>
        </div>
      </div>
    </div>

    <div class="result-toolbar">
      <div class="result-summary text-secondary">
        共 {{ totalCount }} 个结果
        <span v-if="selectedTag"> · 当前标签：{{ selectedTag }}</span>
        <span> · {{ featuredOnly ? '精选已开启' : '全部公开作品' }}</span>
      </div>
      <div class="result-tip text-secondary">{{ sortDescription }}</div>
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty v-else-if="works.length === 0" class="page-empty" description="没有找到符合条件的作品。">
      <template #extra>
        <div class="empty-actions">
          <NButton @click="resetFilters">清空筛选</NButton>
          <NButton type="primary" class="sao-btn-primary" @click="goToCreateWork()">去发布作品</NButton>
        </div>
      </template>
    </NEmpty>

    <template v-else>
      <div class="works-grid">
        <article
          v-for="work in works"
          :key="work.id"
          class="work-card sao-card"
          @click="goToDetail(work.id)"
        >
          <div class="work-cover">
            <NImage
              v-if="work.coverImage"
              :src="work.coverImage"
              :alt="work.title"
              object-fit="cover"
              class="cover-image"
              preview-disabled
            />
            <div v-else class="cover-placeholder">
              <NIcon :component="CreateOutline" :size="30" />
            </div>
            <NTag
              v-if="work.type"
              size="small"
              :bordered="false"
              class="work-type-badge"
              :type="typeColors[work.type.toLowerCase()] || 'info'"
            >
              {{ typeLabels[work.type.toLowerCase()] || work.type }}
            </NTag>
          </div>

          <div class="work-body">
            <div class="work-topline">
              <button
                type="button"
                class="author-link"
                @click.stop="router.push(`/user/${work.author.id}`)"
              >
                <span class="author-avatar">{{ work.author.nickname.charAt(0) }}</span>
                <span class="author-name">{{ work.author.nickname }}</span>
              </button>
              <span class="work-date text-secondary">
                <NIcon :component="TimeOutline" :size="12" />
                {{ formatDate(work.createdAt) }}
              </span>
            </div>

            <h3 class="work-title">{{ work.title }}</h3>
            <p class="work-summary">{{ formatSummary(work.description) }}</p>

            <div v-if="work.tags.length > 0" class="work-tags">
              <span v-for="tag in work.tags.slice(0, 4)" :key="tag" class="sao-tag">{{ tag }}</span>
            </div>

            <div class="work-stats text-secondary">
              <span class="stat-item">
                <NIcon :component="HeartOutline" :size="14" />
                {{ work.likeCount }}
              </span>
              <span class="stat-item">
                <NIcon :component="StarOutline" :size="14" />
                {{ work.favoriteCount }}
              </span>
              <span class="stat-item">
                <NIcon :component="ChatbubbleOutline" :size="14" />
                {{ work._count?.comments || 0 }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.works-list-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 0;
}

.page-header,
.filters-row,
.result-toolbar,
.work-topline,
.work-stats,
.header-actions {
  display: flex;
}

.page-header,
.result-toolbar {
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-actions {
  align-items: center;
  gap: 10px;
}

.page-subtitle {
  margin-top: 8px;
  font-size: 14px;
}

.filters-panel {
  :deep(.n-card__content) {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 18px 20px;
  }
}

.filters-row {
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 0;
}

.sort-select {
  width: 132px;
}

.browse-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--sao-border-color);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(118, 227, 255, 0.06), rgba(255, 255, 255, 0.02));
}

.filter-rows {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.quick-tags-label {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  font-size: 13px;
}

.filter-tag {
  cursor: pointer;
}

.filter-tag-count {
  margin-left: 6px;
  opacity: 0.72;
}

.featured-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--sao-border-color);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
}

.toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--sao-text-primary);
    font-size: 14px;
  }

  span {
    font-size: 13px;
    line-height: 1.6;
  }
}

.result-toolbar {
  align-items: center;
}

.result-summary,
.result-tip {
  font-size: 13px;
  line-height: 1.7;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.empty-actions {
  display: flex;
  gap: 10px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(264px, 1fr));
  gap: 18px;
}

.work-card {
  overflow: hidden;
  cursor: pointer;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.work-cover {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(118, 227, 255, 0.08);
  color: var(--sao-accent);
}

.work-type-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.work-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.work-topline {
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.author-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.author-name {
  font-size: 13px;
  color: var(--sao-accent);
}

.work-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.work-title {
  color: var(--sao-text-primary);
  font-size: 16px;
  line-height: 1.5;
}

.work-summary {
  min-height: 46px;
  color: var(--sao-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.work-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.work-stats {
  gap: 16px;
  align-items: center;
  font-size: 12px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

@media (max-width: 768px) {
  .page-header,
  .result-toolbar,
  .filters-row,
  .featured-toggle,
  .empty-actions {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .sort-select {
    width: 100%;
  }

  .browse-filters {
    padding: 14px;
  }

  .featured-toggle,
  .result-toolbar {
    align-items: flex-start;
  }

  .works-grid {
    grid-template-columns: 1fr;
  }
}
</style>
