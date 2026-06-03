<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { cmsApi } from '@/api/cms'
import type { NewsItem } from '@/api/cms'
import { NCard, NIcon, NImage, NSpin, NEmpty, NPagination, NSelect, NTag } from 'naive-ui'
import { TimeOutline } from '@vicons/ionicons5'

const router = useRouter()

const newsItems = ref<NewsItem[]>([])
const loading = ref(true)
const errorText = ref('')
const selectedCategory = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 12

const categoryOptions = [
  { label: '动画', value: 'ANIME' },
  { label: '电影', value: 'MOVIE' },
  { label: '游戏', value: 'GAME' },
  { label: '作者', value: 'AUTHOR' },
  { label: '周边', value: 'MERCHANDISE' },
  { label: '其他', value: 'OTHER' },
]

const categoryLabels: Record<string, string> = {
  ANIME: '动画',
  MOVIE: '电影',
  GAME: '游戏',
  AUTHOR: '作者',
  MERCHANDISE: '周边',
  OTHER: '其他',
}

onMounted(() => {
  fetchNews()
})

watch(selectedCategory, () => {
  currentPage.value = 1
  fetchNews()
})

async function fetchNews() {
  loading.value = true
  errorText.value = ''
  try {
    const params: any = {
      page: currentPage.value,
      pageSize,
    }
    if (selectedCategory.value) params.category = selectedCategory.value
    const res = await cmsApi.getNews(params)
    newsItems.value = res.data
    totalPages.value = Math.ceil(res.total / pageSize)
  } catch (error) {
    console.error('Failed to load news:', error)
    errorText.value = '资讯加载失败，请稍后重试'
    newsItems.value = []
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchNews()
}

function goToDetail(newsId: number) {
  router.push(`/news/${newsId}`)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="news-list-page">
    <div class="page-header">
      <h1 class="sao-section-title">官方企划</h1>
      <p class="page-subtitle text-secondary">SAO系列最新资讯与动态</p>
    </div>

    <!-- Category Filter -->
    <div class="filters-bar sao-card">
      <div class="filters-row">
        <NSelect
          v-model:value="selectedCategory"
          :options="categoryOptions"
          placeholder="全部分类"
          clearable
          class="category-select"
        />
      </div>
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty
      v-else-if="errorText"
      :description="errorText"
      class="page-empty"
    />

    <NEmpty
      v-else-if="newsItems.length === 0"
      description="暂无资讯"
      class="page-empty"
    />

    <template v-else>
      <div class="news-grid">
        <NCard
          v-for="item in newsItems"
          :key="item.id"
          class="news-card sao-card"
          hoverable
          @click="goToDetail(item.id)"
        >
          <div class="news-card-content">
            <div class="news-cover">
              <NImage
                v-if="item.coverImage"
                :src="item.coverImage"
                :alt="item.title"
                object-fit="cover"
                class="cover-image"
                preview-disabled
              />
              <div v-else class="cover-placeholder">
                <NIcon :size="28" :component="TimeOutline" />
              </div>
            </div>
            <div class="news-info">
              <div class="news-meta">
                <NTag v-if="item.category" size="small" :bordered="false" type="info">
                  {{ categoryLabels[item.category] || item.category }}
                </NTag>
                <span class="news-date text-secondary">{{ formatDate(item.publishedAt ?? '') }}</span>
              </div>
              <h3 class="news-title">{{ item.title }}</h3>
              <p class="news-summary text-secondary">{{ item.content?.replace(/<[^>]*>/g, '').slice(0, 120) }}</p>
            </div>
          </div>
        </NCard>
      </div>

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
.news-list-page {
  padding: 24px 0;
}

.page-header {
  margin-bottom: 32px;
}

.page-subtitle {
  font-size: 14px;
  margin-top: 8px;
}

.filters-bar {
  margin-bottom: 32px;

  :deep(.n-card__content) {
    padding: 16px 20px;
  }
}

.filters-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.category-select {
  width: 180px;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.news-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.news-card {
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(0, 212, 255, 0.3) !important;
    box-shadow: 0 4px 16px rgba(0, 212, 255, 0.1);
  }

  :deep(.n-card__content) {
    padding: 0;
  }
}

.news-card-content {
  display: flex;
  gap: 20px;
  padding: 20px;
}

.news-cover {
  width: 180px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;

  .cover-image {
    width: 100%;
    height: 100%;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    background: rgba(0, 212, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sao-accent);
  }
}

.news-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.news-date {
  font-size: 12px;
}

.news-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--sao-text-primary);
  margin-bottom: 8px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-summary {
  font-size: 13px;
  line-height: 1.6;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.news-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

@media (max-width: 640px) {
  .news-card-content {
    flex-direction: column;
  }

  .news-cover {
    width: 100%;
    height: 180px;
  }
}
</style>
