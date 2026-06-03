<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, NImage, NSpin } from 'naive-ui'
import {
  ArrowForwardOutline,
  CreateOutline,
  SearchOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import { cmsApi } from '@/api/cms'
import { worksApi, type HotTagItem, type Work } from '@/api/works'
import type { Character, NewsItem } from '@/api/cms'
import { getFreshWorkCreateRoute } from '@/utils/work-create'

const router = useRouter()

const loading = ref(true)
const loadError = ref('')
const featuredWorks = ref<Work[]>([])
const hotTags = ref<HotTagItem[]>([])
const popularCharacters = ref<Character[]>([])
const latestNews = ref<NewsItem[]>([])

const featuredCreators = computed(() => {
  const uniqueCreators = new Map<string, Work['author']>()
  for (const work of featuredWorks.value) {
    if (!uniqueCreators.has(work.author.id)) {
      uniqueCreators.set(work.author.id, work.author)
    }
  }
  return Array.from(uniqueCreators.values()).slice(0, 5)
})

const quickEntries = [
  {
    icon: SparklesOutline,
    title: '先看精选作品',
    description: '适合第一次进入站点的访客，先快速感受社区内容质量。',
    action: '浏览作品',
    path: '/community/works',
  },
  {
    icon: CreateOutline,
    title: '开始发布创作',
    description: '已经准备好作品时，直接进入发布页继续创作流程。',
    action: '立即发布',
    path: '/community/create',
  },
  {
    icon: SearchOutline,
    title: '按关键词探索',
    description: '通过角色名、作品名和标签快速找到你真正想看的内容。',
    action: '去搜索',
    path: '/search',
  },
]

const newcomerSteps = [
  {
    title: '1. 先逛推荐区',
    description: '看看当前社区里完成度更高、互动更好的作品，建立内容预期。',
  },
  {
    title: '2. 关注角色与标签',
    description: '从你熟悉的角色、题材切入，会比从空白列表里翻找舒服很多。',
  },
  {
    title: '3. 再进入创作',
    description: '先浏览再发布，标题、简介和标签会更容易写得清楚。',
  },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatSummary(text: string | null | undefined, fallback = '作者还没有填写简介。'): string {
  const normalized = (text || '').trim()
  if (!normalized) return fallback
  return normalized.length > 70 ? `${normalized.slice(0, 70)}...` : normalized
}

async function fetchHomeData() {
  loading.value = true
  loadError.value = ''
  try {
    const [worksRes, tagsRes, charsRes, newsRes] = await Promise.all([
      worksApi.getWorks({ page: 1, pageSize: 6, sort: 'recommended' }),
      worksApi.getHotTags(),
      cmsApi.getCharacters({ page: 1, pageSize: 4 }),
      cmsApi.getNews({ page: 1, pageSize: 3 }),
    ])

    featuredWorks.value = worksRes.data
    hotTags.value = tagsRes.data
    popularCharacters.value = charsRes.data
    latestNews.value = newsRes.data
  } catch {
    featuredWorks.value = []
    hotTags.value = []
    popularCharacters.value = []
    latestNews.value = []
    loadError.value = '首页内容加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function goToCreateWork() {
  router.push(getFreshWorkCreateRoute())
}

onMounted(fetchHomeData)
</script>

<template>
  <div class="home-page">
    <section class="hero-section">
      <div class="hero-copy">
        <span class="hero-badge">SAO 同人作品社区</span>
        <h1 class="hero-title">先看到值得停留的内容，再决定你要发布什么。</h1>
        <p class="hero-subtitle">
          首页现在更偏向内容入口而不是纯展示页。你可以先逛精选作品、按角色或标签继续找，也可以直接进入创作流程。
        </p>
        <div class="hero-actions">
          <NButton
            type="primary"
            size="large"
            round
            class="sao-btn-primary"
            @click="router.push('/community/works')"
          >
            先看热门作品
            <template #icon>
              <NIcon :component="ArrowForwardOutline" />
            </template>
          </NButton>
          <NButton
            size="large"
            round
            class="hero-secondary-btn"
            @click="goToCreateWork()"
          >
            我是创作者，去发布
          </NButton>
        </div>
      </div>

      <div class="hero-panel sao-card">
        <div class="hero-panel-row">
          <span class="hero-panel-label">当前精选</span>
          <strong>{{ featuredWorks.length || '--' }}</strong>
        </div>
        <div class="hero-panel-row">
          <span class="hero-panel-label">热门标签</span>
          <strong>{{ hotTags.length || '--' }}</strong>
        </div>
        <div class="hero-panel-row">
          <span class="hero-panel-label">最新资讯</span>
          <strong>{{ latestNews.length || '--' }}</strong>
        </div>
        <p class="hero-panel-note">内容露出会优先展示完成度更高、互动更好的作品。</p>
      </div>
    </section>

    <section class="entry-section">
      <div
        v-for="entry in quickEntries"
        :key="entry.title"
        class="entry-card sao-card"
        @click="entry.path === '/community/create' ? goToCreateWork() : router.push(entry.path)"
      >
        <div class="entry-icon">
          <NIcon :component="entry.icon" :size="24" />
        </div>
        <div class="entry-body">
          <h3 class="entry-title">{{ entry.title }}</h3>
          <p class="entry-description">{{ entry.description }}</p>
        </div>
        <div class="entry-action">
          {{ entry.action }}
          <NIcon :component="ArrowForwardOutline" :size="14" />
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="sao-section-title">今日推荐</h2>
          <p class="section-subtitle text-secondary">优先展示信息更完整、互动更稳定的公开作品。</p>
        </div>
        <NButton text class="text-accent" @click="router.push('/community/works?sort=recommended')">
          查看更多
          <template #icon>
            <NIcon :component="ArrowForwardOutline" />
          </template>
        </NButton>
      </div>

      <NSpin :show="loading">
        <div v-if="loadError" class="placeholder-card sao-card">
          {{ loadError }}
        </div>
        <div v-else-if="featuredWorks.length > 0" class="featured-grid">
          <article
            v-for="work in featuredWorks.slice(0, 4)"
            :key="work.id"
            class="featured-card sao-card"
            @click="router.push(`/community/works/${work.id}`)"
          >
            <NImage
              v-if="work.coverImage"
              :src="work.coverImage"
              :alt="work.title"
              object-fit="cover"
              class="featured-cover"
              preview-disabled
            />
            <div v-else class="featured-cover placeholder-cover">
              <span>{{ work.type }}</span>
            </div>

            <div class="featured-body">
              <div class="featured-topline">
                <span class="featured-author">{{ work.author.nickname }}</span>
                <span class="featured-date">{{ formatDate(work.createdAt) }}</span>
              </div>
              <h3 class="featured-title">{{ work.title }}</h3>
              <p class="featured-summary">{{ formatSummary(work.description) }}</p>
              <div v-if="work.tags.length > 0" class="featured-tags">
                <span v-for="tag in work.tags.slice(0, 3)" :key="tag" class="sao-tag">{{ tag }}</span>
              </div>
              <div class="featured-stats text-secondary">
                <span>{{ work.likeCount }} 赞</span>
                <span>{{ work.favoriteCount }} 收藏</span>
                <span>{{ work._count?.comments || 0 }} 评论</span>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="placeholder-card sao-card">
          暂时还没有推荐作品。
        </div>
      </NSpin>
    </section>

    <section class="discovery-section">
      <div class="discovery-card sao-card">
        <div class="section-head compact">
          <div>
            <h2 class="sao-section-title">热门标签</h2>
            <p class="section-subtitle text-secondary">从更明确的题材入口开始浏览，效率会高很多。</p>
          </div>
        </div>
        <div v-if="hotTags.length > 0" class="tag-cloud">
          <NTag
            v-for="tag in hotTags"
            :key="tag.name"
            size="medium"
            :bordered="false"
            class="tag-chip"
            @click="router.push(`/community/works?tag=${encodeURIComponent(tag.name)}`)"
          >
            {{ tag.name }}
            <span class="tag-count">{{ tag.count }}</span>
          </NTag>
        </div>
        <div v-else class="text-secondary small-empty">暂时还没有可推荐的标签。</div>
      </div>

      <div class="discovery-card sao-card">
        <div class="section-head compact">
          <div>
            <h2 class="sao-section-title">最近活跃作者</h2>
            <p class="section-subtitle text-secondary">看作者再找作品，通常比漫无目的翻列表更容易留下来。</p>
          </div>
        </div>
        <div v-if="featuredCreators.length > 0" class="creator-list">
          <button
            v-for="creator in featuredCreators"
            :key="creator.id"
            type="button"
            class="creator-chip"
            @click="router.push(`/user/${creator.id}`)"
          >
            <span class="creator-avatar">{{ creator.nickname.charAt(0) }}</span>
            <span>{{ creator.nickname }}</span>
          </button>
        </div>
        <div v-else class="text-secondary small-empty">还没有活跃作者数据。</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2 class="sao-section-title">新手入口</h2>
          <p class="section-subtitle text-secondary">如果你是第一次来，建议按下面的顺序走，体验会更顺。</p>
        </div>
      </div>
      <div class="newcomer-grid">
        <div v-for="step in newcomerSteps" :key="step.title" class="newcomer-card sao-card">
          <h3 class="newcomer-title">{{ step.title }}</h3>
          <p class="newcomer-description">{{ step.description }}</p>
        </div>
      </div>
    </section>

    <section class="section dual-section">
      <div class="dual-card sao-card">
        <div class="section-head compact">
          <div>
            <h2 class="sao-section-title">人气角色</h2>
            <p class="section-subtitle text-secondary">从熟悉的角色切入，浏览会更有目标感。</p>
          </div>
          <NButton text class="text-accent" @click="router.push('/characters')">查看全部</NButton>
        </div>
        <div v-if="popularCharacters.length > 0" class="character-list">
          <button
            v-for="char in popularCharacters"
            :key="char.id"
            type="button"
            class="character-item"
            @click="router.push(`/characters/${char.id}`)"
          >
            <span class="character-avatar">{{ char.name?.charAt(0) ?? '?' }}</span>
            <span class="character-name">{{ char.name }}</span>
          </button>
        </div>
        <div v-else class="text-secondary small-empty">暂无角色数据。</div>
      </div>

      <div class="dual-card sao-card">
        <div class="section-head compact">
          <div>
            <h2 class="sao-section-title">最新资讯</h2>
            <p class="section-subtitle text-secondary">给访客一个轻量的站外延展入口，不至于只剩作品列表。</p>
          </div>
          <NButton text class="text-accent" @click="router.push('/news')">查看全部</NButton>
        </div>
        <div v-if="latestNews.length > 0" class="news-list">
          <article
            v-for="item in latestNews"
            :key="item.id"
            class="news-item"
            @click="router.push(`/news/${item.id}`)"
          >
            <h3 class="news-title">{{ item.title }}</h3>
            <p class="news-summary">{{ formatSummary(item.summary || item.content?.replace(/<[^>]+>/g, ''), '暂无摘要。') }}</p>
          </article>
        </div>
        <div v-else class="text-secondary small-empty">暂无资讯内容。</div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  padding: 36px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(104, 212, 255, 0.1), rgba(104, 212, 255, 0.03)),
    radial-gradient(circle at top right, rgba(90, 203, 255, 0.22), transparent 38%),
    var(--sao-bg-secondary);
  border: 1px solid rgba(118, 227, 255, 0.16);
}

.hero-badge {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(118, 227, 255, 0.12);
  color: var(--sao-accent);
  font-size: 12px;
  margin-bottom: 14px;
}

.hero-title {
  max-width: 680px;
  margin-bottom: 14px;
  font-size: 38px;
  line-height: 1.25;
  color: var(--sao-text-primary);
}

.hero-subtitle {
  max-width: 620px;
  margin-bottom: 26px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--sao-text-secondary);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-secondary-btn {
  border: 1px solid var(--sao-border-color);
  background: rgba(255, 255, 255, 0.02);
}

.hero-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 24px;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.hero-panel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;

  strong {
    font-size: 22px;
    color: var(--sao-text-primary);
  }
}

.hero-panel-label,
.hero-panel-note {
  color: var(--sao-text-secondary);
}

.hero-panel-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
}

.entry-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.entry-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  cursor: pointer;

  :deep(.n-card__content) {
    padding: 20px;
  }
}

.entry-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(118, 227, 255, 0.1);
  color: var(--sao-accent);
}

.entry-body {
  min-width: 0;
}

.entry-title {
  margin-bottom: 8px;
  font-size: 17px;
  color: var(--sao-text-primary);
}

.entry-description {
  line-height: 1.7;
  font-size: 13px;
  color: var(--sao-text-secondary);
}

.entry-action {
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--sao-accent);
  font-size: 13px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.section-head.compact {
  margin-bottom: 2px;
}

.section-subtitle {
  margin-top: 6px;
  font-size: 14px;
}

.placeholder-card {
  padding: 40px 24px;
  text-align: center;
  color: var(--sao-text-secondary);
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.featured-card {
  overflow: hidden;
  cursor: pointer;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.featured-cover {
  width: 100%;
  height: 180px;
}

.placeholder-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sao-text-secondary);
  background: rgba(118, 227, 255, 0.08);
}

.featured-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.featured-topline,
.featured-stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.featured-author {
  color: var(--sao-accent);
}

.featured-date {
  color: var(--sao-text-secondary);
}

.featured-title {
  color: var(--sao-text-primary);
  font-size: 16px;
}

.featured-summary {
  min-height: 44px;
  line-height: 1.7;
  font-size: 13px;
  color: var(--sao-text-secondary);
}

.featured-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.discovery-section,
.dual-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.discovery-card,
.dual-card {
  :deep(.n-card__content) {
    padding: 20px;
  }
}

.tag-cloud,
.creator-list,
.character-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-chip {
  cursor: pointer;
}

.tag-count {
  margin-left: 6px;
  opacity: 0.72;
}

.creator-chip,
.character-item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--sao-border-color);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--sao-text-primary);
  cursor: pointer;
}

.creator-avatar,
.character-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.newcomer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.newcomer-card {
  :deep(.n-card__content) {
    padding: 20px;
  }
}

.newcomer-title {
  margin-bottom: 10px;
  font-size: 17px;
  color: var(--sao-text-primary);
}

.newcomer-description,
.news-summary,
.small-empty {
  line-height: 1.7;
  font-size: 13px;
  color: var(--sao-text-secondary);
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.news-item {
  cursor: pointer;
}

.news-title {
  margin-bottom: 6px;
  font-size: 15px;
  color: var(--sao-text-primary);
}

.character-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .hero-section,
  .discovery-section,
  .dual-section {
    grid-template-columns: 1fr;
  }

  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .entry-section,
  .newcomer-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 24px 20px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .section-head {
    flex-direction: column;
  }

  .featured-grid {
    grid-template-columns: 1fr;
  }
}
</style>
