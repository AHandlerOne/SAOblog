<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { cmsApi } from '@/api/cms'
import type { NewsItem } from '@/api/cms'
import { NButton, NIcon, NImage, NSpin, NEmpty, NTag } from 'naive-ui'
import { ArrowBackOutline, TimeOutline } from '@vicons/ionicons5'
import { renderSafeRichText } from '@/utils/content'

const props = defineProps<{ id: string }>()
const router = useRouter()

const newsItem = ref<NewsItem | null>(null)
const loading = ref(true)
const renderedNewsContent = computed(() => renderSafeRichText(newsItem.value?.content))

onMounted(async () => {
  try {
    const newsId = Number(props.id)
    if (Number.isNaN(newsId)) return
    newsItem.value = (await cmsApi.getNewsItem(newsId)).data
  } catch (error) {
    console.error('Failed to load news item:', error)
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/news')
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

const categoryLabels: Record<string, string> = {
  ANIME: '动画',
  MOVIE: '电影',
  GAME: '游戏',
  AUTHOR: '作者',
  MERCHANDISE: '周边',
  OTHER: '其他',
}
</script>

<template>
  <div class="news-detail-page">
    <NSpin v-if="loading" class="page-loading" />

    <NEmpty
      v-else-if="!newsItem"
      description="未找到该资讯"
      class="page-empty"
    >
      <template #extra>
        <NButton @click="goBack">返回列表</NButton>
      </template>
    </NEmpty>

    <template v-else>
      <!-- Back Button -->
      <div class="page-top">
        <NButton text class="back-btn" @click="goBack">
          <template #icon>
            <NIcon :component="ArrowBackOutline" />
          </template>
          返回资讯列表
        </NButton>
      </div>

      <!-- Article -->
      <article class="news-article sao-card">
        <!-- Cover Image -->
        <div v-if="newsItem.coverImage" class="article-cover">
          <NImage
            :src="newsItem.coverImage"
            :alt="newsItem.title"
            object-fit="cover"
            class="cover-image"
            preview-disabled
          />
        </div>

        <div class="article-content">
          <!-- Meta -->
          <div class="article-meta">
            <NTag v-if="newsItem.category" size="small" :bordered="false" type="info">
              {{ categoryLabels[newsItem.category] || newsItem.category }}
            </NTag>
            <span v-if="newsItem.publishedAt" class="article-date text-secondary">
              <NIcon :size="14" :component="TimeOutline" style="margin-right: 4px; vertical-align: middle;" />
              {{ formatDate(newsItem.publishedAt) }}
            </span>
          </div>

          <!-- Title -->
          <h1 class="article-title">{{ newsItem.title }}</h1>

          <!-- Content -->
          <div class="article-body text-secondary" v-html="renderedNewsContent"></div>
        </div>
      </article>
    </template>
  </div>
</template>

<style scoped lang="scss">
.news-detail-page {
  padding: 24px 0;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.page-top {
  margin-bottom: 24px;
}

.back-btn {
  color: var(--sao-text-secondary);
  font-size: 14px;

  &:hover {
    color: var(--sao-accent);
  }
}

.news-article {
  overflow: hidden;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.article-cover {
  width: 100%;
  max-height: 400px;
  overflow: hidden;

  .cover-image {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.article-content {
  padding: 32px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.article-date,
.article-source {
  font-size: 13px;
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--sao-text-primary);
  margin-bottom: 16px;
  line-height: 1.4;
}

.article-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.article-body {
  font-size: 15px;
  line-height: 2;
  color: var(--sao-text-secondary);

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    color: var(--sao-text-primary);
    margin-top: 24px;
    margin-bottom: 12px;
  }

  :deep(h2) {
    font-size: 22px;
    font-weight: 600;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--sao-border-color);
  }

  :deep(h3) {
    font-size: 18px;
    font-weight: 600;
  }

  :deep(p) {
    margin-bottom: 16px;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 12px;
    margin: 16px 0;
  }

  :deep(a) {
    color: var(--sao-accent);
  }

  :deep(blockquote) {
    border-left: 3px solid var(--sao-accent);
    padding: 12px 16px;
    margin: 16px 0;
    background: rgba(0, 212, 255, 0.05);
    border-radius: 0 8px 8px 0;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 24px;
    margin-bottom: 16px;
  }

  :deep(li) {
    margin-bottom: 4px;
  }

  :deep(code) {
    background: rgba(0, 212, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }

  :deep(pre) {
    background: var(--sao-bg-secondary);
    border: 1px solid var(--sao-border-color);
    border-radius: 12px;
    padding: 16px;
    overflow-x: auto;
    margin: 16px 0;

    code {
      background: transparent;
      padding: 0;
    }
  }
}

@media (max-width: 640px) {
  .article-content {
    padding: 20px 16px;
  }

  .article-title {
    font-size: 22px;
  }
}
</style>
