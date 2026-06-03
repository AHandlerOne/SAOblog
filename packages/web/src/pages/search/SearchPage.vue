<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NPagination,
  NSelect,
  NSpin,
  NTag,
} from 'naive-ui'
import { SearchOutline, SparklesOutline, TimeOutline, TrendingUpOutline } from '@vicons/ionicons5'
import {
  searchApi,
  type SearchCharacterResult,
  type SearchSort,
  type SearchStoryResult,
  type SearchType,
  type SearchWorkResult,
} from '@/api/search'
import { worksApi, type Work } from '@/api/works'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const errorText = ref('')
const searchText = ref('')
const searchType = ref<SearchType>('all')
const sortType = ref<SearchSort>('relevance')
const currentPage = ref(1)
const durationMs = ref(0)

const works = ref<SearchWorkResult[]>([])
const characters = ref<SearchCharacterResult[]>([])
const chapters = ref<SearchStoryResult[]>([])
const total = ref(0)

const suggestions = ref<string[]>([])
const hotWords = ref<string[]>([])
const fallbackWorks = ref<Work[]>([])
const showSuggest = ref(false)
const history = ref<string[]>([])

const pageSize = 10

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '作品', value: 'work' },
  { label: '角色', value: 'character' },
  { label: '剧情', value: 'story' },
]

const sortOptions = [
  { label: '相关度', value: 'relevance' },
  { label: '热度', value: 'hot' },
  { label: '发布时间', value: 'latest' },
]

const hasResult = computed(() => works.value.length > 0 || characters.value.length > 0 || chapters.value.length > 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const hasKeyword = computed(() => searchText.value.trim().length > 0)
const noResult = computed(() => hasKeyword.value && !loading.value && !errorText.value && !hasResult.value)
const sortHint = computed(() => {
  if (sortType.value === 'hot') return '当前更偏向互动热度和近期热度。'
  if (sortType.value === 'latest') return '当前按发布时间排序，适合找新内容。'
  return '当前按关键词相关度排序，标题和摘要命中的结果会更靠前。'
})

function syncFromRoute() {
  const q = String(route.query.q || '').trim()
  const type = String(route.query.type || 'all') as SearchType
  const sort = String(route.query.sort || 'relevance') as SearchSort
  const page = Number(route.query.page || 1)

  searchText.value = q
  searchType.value = ['all', 'work', 'character', 'story'].includes(type) ? type : 'all'
  sortType.value = ['relevance', 'hot', 'latest'].includes(sort) ? sort : 'relevance'
  currentPage.value = Number.isNaN(page) || page < 1 ? 1 : page
}

function saveHistory(word: string) {
  const clean = word.trim()
  if (!clean) return
  const merged = [clean, ...history.value.filter((item) => item !== clean)].slice(0, 12)
  history.value = merged
  localStorage.setItem('sao-search-history', JSON.stringify(merged))
}

function executeSearch() {
  const q = searchText.value.trim()
  if (!q) {
    router.push({ name: 'Search' })
    return
  }

  saveHistory(q)
  showSuggest.value = false
  router.push({
    name: 'Search',
    query: {
      q,
      type: searchType.value,
      sort: sortType.value,
      page: 1,
    },
  })
}

function handlePageChange(page: number) {
  router.push({
    name: 'Search',
    query: {
      q: searchText.value.trim(),
      type: searchType.value,
      sort: sortType.value,
      page,
    },
  })
}

function useWord(word: string) {
  searchText.value = word
  executeSearch()
}

function clearHistory() {
  history.value = []
  localStorage.removeItem('sao-search-history')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightTerms(keyword: string): string[] {
  const normalized = keyword.trim().replace(/\s+/g, ' ')
  if (!normalized) return []
  const terms = new Set<string>([normalized, ...normalized.split(' ')])
  return Array.from(terms)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .sort((left, right) => right.length - left.length)
}

function highlightText(text: string | null | undefined): string {
  const source = text || ''
  const terms = buildHighlightTerms(searchText.value)
  let result = escapeHtml(source)

  for (const term of terms) {
    const pattern = new RegExp(escapeRegExp(escapeHtml(term)), 'gi')
    result = result.replace(pattern, (match) => `<mark>${match}</mark>`)
  }

  return result
}

function getStorySnippet(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 120)}...`
}

function getDescription(text: string | null | undefined, fallback: string): string {
  const normalized = (text || '').trim()
  if (!normalized) return fallback
  return normalized.length > 110 ? `${normalized.slice(0, 110)}...` : normalized
}

async function fetchResults() {
  if (!searchText.value.trim()) {
    works.value = []
    characters.value = []
    chapters.value = []
    total.value = 0
    durationMs.value = 0
    return
  }

  loading.value = true
  errorText.value = ''
  try {
    const res = await searchApi.search({
      q: searchText.value.trim(),
      type: searchType.value,
      sort: sortType.value,
      page: currentPage.value,
      pageSize,
    })
    works.value = res.data.works
    characters.value = res.data.characters
    chapters.value = res.data.chapters
    total.value = res.data.total
    durationMs.value = res.durationMs || 0
  } catch (error: any) {
    works.value = []
    characters.value = []
    chapters.value = []
    total.value = 0
    errorText.value = error.response?.data?.message || '搜索失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function loadSuggest() {
  const keyword = searchText.value.trim()
  if (!keyword) {
    suggestions.value = []
    return
  }

  try {
    const res = await searchApi.suggest(keyword)
    suggestions.value = res.data
  } catch {
    suggestions.value = []
  }
}

async function loadAssistData() {
  try {
    const [hotRes, fallbackRes] = await Promise.all([
      searchApi.hot(),
      worksApi.getWorks({ page: 1, pageSize: 4, sort: 'recommended' }),
    ])
    hotWords.value = hotRes.data
    fallbackWorks.value = fallbackRes.data
  } catch {
    hotWords.value = []
    fallbackWorks.value = []
  }
}

function hideSuggestSoon() {
  window.setTimeout(() => {
    showSuggest.value = false
  }, 120)
}

onMounted(async () => {
  syncFromRoute()
  await Promise.all([fetchResults(), loadAssistData()])

  const historyRaw = localStorage.getItem('sao-search-history')
  if (historyRaw) {
    try {
      history.value = JSON.parse(historyRaw)
    } catch {
      history.value = []
    }
  }
})

watch(
  () => route.query,
  () => {
    syncFromRoute()
    void fetchResults()
  },
)

watch(searchText, () => {
  void loadSuggest()
})
</script>

<template>
  <div class="search-page">
    <div class="page-header">
      <h1 class="sao-section-title">全局搜索</h1>
      <p class="page-subtitle text-secondary">支持作品标题、作者、标签、角色名和剧情关键词。</p>
    </div>

    <div class="search-bar sao-card">
      <div class="search-input-wrap">
        <NInput
          v-model:value="searchText"
          placeholder="输入关键词后回车搜索"
          clearable
          @focus="showSuggest = true"
          @blur="hideSuggestSoon"
          @keyup.enter="executeSearch"
        >
          <template #prefix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>

        <div v-if="showSuggest && suggestions.length > 0" class="suggest-panel">
          <button
            v-for="item in suggestions"
            :key="`sg-${item}`"
            type="button"
            class="suggest-item"
            @mousedown.prevent="useWord(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <NSelect v-model:value="searchType" :options="typeOptions" class="type-select" />
      <NSelect v-model:value="sortType" :options="sortOptions" class="sort-select" />
      <NButton type="primary" class="sao-btn-primary" @click="executeSearch">搜索</NButton>
    </div>

    <div class="side-panels">
      <NCard size="small" class="panel-card">
        <template #header>搜索历史</template>
        <div v-if="history.length === 0" class="panel-empty">还没有历史记录。</div>
        <div v-else class="word-list">
          <NTag
            v-for="word in history"
            :key="`hs-${word}`"
            size="small"
            :bordered="false"
            class="word-tag"
            @click="useWord(word)"
          >
            {{ word }}
          </NTag>
        </div>
        <template #footer>
          <NButton text size="tiny" @click="clearHistory">清空历史</NButton>
        </template>
      </NCard>

      <NCard size="small" class="panel-card">
        <template #header>热门搜索</template>
        <div v-if="hotWords.length === 0" class="panel-empty">暂时还没有热词。</div>
        <div v-else class="word-list">
          <NTag
            v-for="word in hotWords"
            :key="`hot-${word}`"
            size="small"
            :bordered="false"
            type="warning"
            class="word-tag"
            @click="useWord(word)"
          >
            {{ word }}
          </NTag>
        </div>
      </NCard>
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <template v-else-if="!hasKeyword">
      <div class="welcome-empty sao-card">
        <div class="welcome-icon">
          <NIcon :component="SparklesOutline" :size="26" />
        </div>
        <h2 class="welcome-title">先输入关键词，或者从下面的热词开始。</h2>
        <p class="welcome-text">如果你只是想随便逛，直接点推荐作品通常比空搜更快进入状态。</p>
      </div>

      <div v-if="fallbackWorks.length > 0" class="fallback-section">
        <div class="fallback-head">
          <h3 class="section-title">推荐先看这些作品</h3>
          <span class="text-secondary">搜索前的默认入口</span>
        </div>
        <div class="fallback-grid">
          <article
            v-for="item in fallbackWorks"
            :key="item.id"
            class="fallback-card sao-card"
            @click="router.push(`/community/works/${item.id}`)"
          >
            <NImage
              v-if="item.coverImage"
              :src="item.coverImage"
              :alt="item.title"
              object-fit="cover"
              class="fallback-cover"
              preview-disabled
            />
            <div class="fallback-body">
              <h4 class="fallback-title">{{ item.title }}</h4>
              <p class="fallback-desc">{{ getDescription(item.description, '作者还没有填写简介。') }}</p>
            </div>
          </article>
        </div>
      </div>
    </template>

    <NEmpty v-else-if="errorText" :description="errorText" class="page-empty" />

    <template v-else-if="noResult">
      <NEmpty description="没有找到相关内容。" class="page-empty">
        <template #extra>
          <NButton @click="router.push('/community/works?sort=recommended')">去看看推荐作品</NButton>
        </template>
      </NEmpty>

      <div v-if="hotWords.length > 0" class="no-result-panel sao-card">
        <div class="no-result-head">
          <NIcon :component="TrendingUpOutline" />
          <span>可以先试试这些热词</span>
        </div>
        <div class="word-list">
          <NTag
            v-for="word in hotWords"
            :key="`retry-${word}`"
            size="small"
            :bordered="false"
            class="word-tag"
            @click="useWord(word)"
          >
            {{ word }}
          </NTag>
        </div>
      </div>

      <div v-if="fallbackWorks.length > 0" class="fallback-section">
        <div class="fallback-head">
          <h3 class="section-title">也可以直接浏览这些推荐作品</h3>
          <span class="text-secondary">避免搜索路径直接中断</span>
        </div>
        <div class="fallback-grid">
          <article
            v-for="item in fallbackWorks"
            :key="item.id"
            class="fallback-card sao-card"
            @click="router.push(`/community/works/${item.id}`)"
          >
            <NImage
              v-if="item.coverImage"
              :src="item.coverImage"
              :alt="item.title"
              object-fit="cover"
              class="fallback-cover"
              preview-disabled
            />
            <div class="fallback-body">
              <h4 class="fallback-title">{{ item.title }}</h4>
              <p class="fallback-desc">{{ getDescription(item.description, '作者还没有填写简介。') }}</p>
            </div>
          </article>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="result-meta">
        <span class="text-secondary">共 {{ total }} 条结果 · 响应 {{ durationMs }}ms</span>
        <span class="text-secondary">{{ sortHint }}</span>
      </div>

      <div v-if="works.length > 0" class="section">
        <h3 class="section-title">作品</h3>
        <div class="result-list">
          <NCard
            v-for="item in works"
            :key="item.id"
            class="result-card"
            hoverable
            @click="router.push(`/community/works/${item.id}`)"
          >
            <div class="work-result">
              <NImage
                v-if="item.coverImage"
                :src="item.coverImage"
                :alt="item.title"
                object-fit="cover"
                class="work-result-cover"
                preview-disabled
              />
              <div class="work-result-body">
                <div class="result-title" v-html="highlightText(item.title)"></div>
                <p class="result-desc" v-html="highlightText(getDescription(item.description, '作者还没有填写简介。'))"></p>
                <div v-if="item.tags.length > 0" class="result-tags">
                  <span v-for="tag in item.tags.slice(0, 4)" :key="tag" class="sao-tag">{{ tag }}</span>
                </div>
                <div class="result-meta-line text-secondary">
                  <span>作者：{{ item.author.nickname }}</span>
                  <span>{{ item.likeCount }} 赞</span>
                  <span>{{ item.viewCount }} 浏览</span>
                </div>
              </div>
            </div>
          </NCard>
        </div>
      </div>

      <div v-if="characters.length > 0" class="section">
        <h3 class="section-title">角色</h3>
        <div class="result-list">
          <NCard
            v-for="item in characters"
            :key="item.id"
            class="result-card"
            hoverable
            @click="router.push(`/characters/${item.id}`)"
          >
            <div class="result-title" v-html="highlightText(item.name)"></div>
            <p class="result-desc" v-html="highlightText(getDescription(item.description, '暂无描述。'))"></p>
          </NCard>
        </div>
      </div>

      <div v-if="chapters.length > 0" class="section">
        <h3 class="section-title">剧情章节</h3>
        <div class="result-list">
          <NCard
            v-for="item in chapters"
            :key="item.id"
            class="result-card"
            hoverable
            @click="router.push(`/story/${item.arcId}`)"
          >
            <div class="result-title" v-html="highlightText(item.title)"></div>
            <div class="result-meta-line text-secondary">
              <span>{{ item.arcName }}</span>
              <span class="meta-inline">
                <NIcon :component="TimeOutline" :size="12" />
                第 {{ item.chapterNumber }} 章
              </span>
            </div>
            <p class="result-desc" v-html="highlightText(getStorySnippet(item.content))"></p>
            <NTag v-if="item.isSpoiler" size="small" type="warning" :bordered="false">含剧透</NTag>
          </NCard>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.search-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 0;
}

.page-subtitle {
  margin-top: 8px;
  font-size: 14px;
}

.search-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px 140px 88px;
  gap: 10px;

  :deep(.n-card__content) {
    padding: 18px;
  }
}

.search-input-wrap {
  position: relative;
}

.suggest-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  overflow: hidden;
  border: 1px solid var(--sao-border-color);
  border-radius: 12px;
  background: var(--sao-bg-secondary);
}

.suggest-item {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: var(--sao-text-secondary);
  text-align: left;
  cursor: pointer;
}

.suggest-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--sao-text-primary);
}

.side-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel-card :deep(.n-card__content) {
  padding-top: 10px;
}

.panel-empty,
.welcome-text,
.result-meta,
.result-meta-line,
.fallback-desc {
  color: var(--sao-text-secondary);
}

.word-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.word-tag {
  cursor: pointer;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.welcome-empty,
.no-result-panel {
  text-align: center;

  :deep(.n-card__content) {
    padding: 28px 20px;
  }
}

.welcome-icon {
  margin-bottom: 12px;
  color: var(--sao-accent);
}

.welcome-title {
  margin-bottom: 10px;
  color: var(--sao-text-primary);
  font-size: 22px;
}

.welcome-text {
  font-size: 14px;
  line-height: 1.7;
}

.no-result-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--sao-text-primary);
}

.fallback-section,
.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fallback-head,
.result-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.fallback-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.fallback-card {
  overflow: hidden;
  cursor: pointer;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.fallback-cover {
  width: 100%;
  height: 150px;
}

.fallback-body {
  padding: 14px;
}

.fallback-title {
  margin-bottom: 8px;
  color: var(--sao-text-primary);
  font-size: 15px;
}

.section-title {
  color: var(--sao-text-primary);
  font-size: 17px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  cursor: pointer;
}

.work-result {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 14px;
}

.work-result-cover {
  width: 132px;
  height: 96px;
  border-radius: 12px;
}

.work-result-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-title {
  color: var(--sao-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.result-desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--sao-text-secondary);
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.result-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
}

.meta-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

:deep(mark) {
  padding: 0 2px;
  border-radius: 4px;
  background: rgba(255, 214, 102, 0.2);
  color: #ffd666;
}

@media (max-width: 960px) {
  .search-bar,
  .side-panels,
  .fallback-grid {
    grid-template-columns: 1fr;
  }

  .fallback-head,
  .result-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .work-result {
    grid-template-columns: 1fr;
  }

  .work-result-cover {
    width: 100%;
    height: 180px;
  }
}
</style>
