<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { cmsApi } from '@/api/cms'
import type { ArcDetail, Arc, ArcChapter } from '@/api/cms'
import { NButton, NIcon, NImage, NSpin, NEmpty, NAvatar, NTag } from 'naive-ui'
import { ArrowBackOutline, EyeOutline, ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()

const arc = ref<ArcDetail | null>(null)
const allArcs = ref<Arc[]>([])
const loading = ref(true)
const selectedChapterId = ref<number | null>(null)

const selectedChapter = computed(() => {
  if (!arc.value || !selectedChapterId.value) return null
  return arc.value.chapters.find((item) => item.id === selectedChapterId.value) || null
})

const chapterFlatList = computed(() => {
  if (!arc.value) return []
  return [...arc.value.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
})

const selectedChapterIndex = computed(() => {
  if (!selectedChapter.value) return -1
  return chapterFlatList.value.findIndex((item) => item.id === selectedChapter.value?.id)
})

const prevChapter = computed(() => {
  if (selectedChapterIndex.value <= 0) return null
  return chapterFlatList.value[selectedChapterIndex.value - 1]
})

const nextChapter = computed(() => {
  if (selectedChapterIndex.value < 0 || selectedChapterIndex.value >= chapterFlatList.value.length - 1) return null
  return chapterFlatList.value[selectedChapterIndex.value + 1]
})

const progressKey = computed(() => `story-progress-${props.id}`)

const chapterKeyPoints = computed(() => {
  const content = selectedChapter.value?.content || ''
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('关键点') || line.startsWith('要点') || line.startsWith('•'))
    .slice(0, 5)
})

const highlightedChapterHtml = computed(() => {
  const content = selectedChapter.value?.content || ''
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const withDialog = escaped.replace(/([^\n：:]{1,12})([：:])\s*「([^」]{1,200})」/g, (_m: string, name: string, sep: string, quote: string) => {
    return `<span class="dialog-line"><span class="dialog-speaker">${name}${sep}</span><span class="dialog-quote">「${quote}」</span></span>`
  })

  return withDialog.replace(/\n/g, '<br />')
})

async function fetchArc(): Promise<void> {
  loading.value = true
  try {
    const [arcRes, arcsRes] = await Promise.all([
      cmsApi.getArc(Number(props.id)),
      cmsApi.getArcs({ page: 1, pageSize: 100 }),
    ])
    arc.value = arcRes.data
    allArcs.value = arcsRes.data

    const chapterFromQuery = Number(route.query.chapter || 0)
    if (chapterFromQuery && arc.value.chapters.some((item) => item.id === chapterFromQuery)) {
      selectedChapterId.value = chapterFromQuery
    } else {
      const stored = localStorage.getItem(progressKey.value)
      const storedId = Number(stored || 0)
      if (storedId && arc.value.chapters.some((item) => item.id === storedId)) {
        selectedChapterId.value = storedId
      } else {
        selectedChapterId.value = arc.value.chapters[0]?.id ?? null
      }
    }
  } finally {
    loading.value = false
  }
}

function goBack(): void {
  router.push('/story')
}

function goToCharacter(charId: number): void {
  router.push(`/characters/${charId}`)
}

function jumpToChapter(chapter: ArcChapter): void {
  selectedChapterId.value = chapter.id
  router.replace({ query: { ...route.query, chapter: chapter.id } })
}

function jumpToPrevChapter(): void {
  if (prevChapter.value) {
    jumpToChapter(prevChapter.value)
  }
}

function jumpToNextChapter(): void {
  if (nextChapter.value) {
    jumpToChapter(nextChapter.value)
  }
}

function jumpToArc(arcId: number): void {
  router.push(`/story/${arcId}`)
}

watch(selectedChapterId, (value) => {
  if (value) {
    localStorage.setItem(progressKey.value, String(value))
  }
})

watch(
  () => props.id,
  async () => {
    await fetchArc()
  },
)

onMounted(fetchArc)
</script>

<template>
  <div class="story-detail-page">
    <NSpin v-if="loading" class="page-loading" />

    <NEmpty
      v-else-if="!arc"
      description="未找到该篇章"
      class="page-empty"
    >
      <template #extra>
        <NButton @click="goBack">返回列表</NButton>
      </template>
    </NEmpty>

    <template v-else>
      <div class="page-top">
        <NButton text class="back-btn" @click="goBack">
          <template #icon>
            <NIcon :component="ArrowBackOutline" />
          </template>
          返回篇章列表
        </NButton>
      </div>

      <div class="arc-header sao-card">
        <div class="arc-header-content">
          <div class="arc-cover-section">
            <NImage
              v-if="arc.coverImage"
              :src="arc.coverImage"
              :alt="arc.name"
              object-fit="cover"
              class="arc-cover-img"
              preview-disabled
            />
            <div v-else class="arc-cover-placeholder">
              <NIcon :size="48" :component="EyeOutline" />
            </div>
          </div>
          <div class="arc-header-info">
            <span v-if="arc.season" class="arc-season sao-tag">{{ arc.season }}</span>
            <h1 class="arc-title">{{ arc.name }}</h1>
            <p v-if="arc.nameEn" class="arc-name-en text-secondary">{{ arc.nameEn }}</p>
            <p v-if="arc.nameJa" class="arc-name-ja text-secondary">{{ arc.nameJa }}</p>
            <p class="arc-synopsis text-secondary">{{ arc.synopsis || '暂无简介' }}</p>
          </div>
        </div>
      </div>

      <div class="story-main">
        <aside class="chapter-sidebar sao-card">
          <h3 class="sidebar-title">分集目录</h3>
          <div class="chapter-list">
            <button
              v-for="chapter in chapterFlatList"
              :key="chapter.id"
              type="button"
              class="chapter-link"
              :class="{ active: selectedChapterId === chapter.id }"
              @click="jumpToChapter(chapter)"
            >
              <span class="chapter-num">第{{ chapter.chapterNumber }}章</span>
              <span class="chapter-name">{{ chapter.title }}</span>
            </button>
          </div>
        </aside>

        <section class="chapter-content-wrap">
          <div v-if="selectedChapter" class="chapter-card sao-card">
            <div class="chapter-top">
              <div class="chapter-head-main">
                <h2 class="chapter-title">{{ selectedChapter.title }}</h2>
                <NTag v-if="selectedChapter.isSpoiler" type="warning" :bordered="false" size="small">含剧透</NTag>
              </div>
              <div class="chapter-nav">
                <NButton quaternary size="small" :disabled="!prevChapter" @click="jumpToPrevChapter">
                  <template #icon><NIcon :component="ChevronBackOutline" /></template>
                  上一章
                </NButton>
                <NButton quaternary size="small" :disabled="!nextChapter" @click="jumpToNextChapter">
                  下一章
                  <template #icon><NIcon :component="ChevronForwardOutline" /></template>
                </NButton>
              </div>
            </div>

            <div v-if="chapterKeyPoints.length > 0" class="key-points">
              <h4 class="key-title">剧情关键点</h4>
              <ul>
                <li v-for="(point, idx) in chapterKeyPoints" :key="`point-${idx}`">{{ point }}</li>
              </ul>
            </div>

            <div class="chapter-content" v-html="highlightedChapterHtml" />
          </div>
        </section>
      </div>

      <div v-if="allArcs.length > 1" class="section">
        <h2 class="sao-section-title">跨篇章快速跳转</h2>
        <div class="arc-jump-list">
          <NTag
            v-for="item in allArcs"
            :key="`arc-jump-${item.id}`"
            :bordered="false"
            round
            :type="item.id === arc.id ? 'success' : 'default'"
            class="arc-jump-tag"
            @click="jumpToArc(item.id)"
          >
            {{ item.name }}
          </NTag>
        </div>
      </div>

      <div v-if="arc.characters && arc.characters.length > 0" class="section">
        <h2 class="sao-section-title">登场角色</h2>
        <div class="characters-grid">
          <div
            v-for="rel in arc.characters"
            :key="rel.character.id"
            class="character-card sao-card"
            @click="goToCharacter(rel.character.id)"
          >
            <NAvatar
              v-if="rel.character.avatar"
              :src="rel.character.avatar"
              round
              :size="56"
              class="char-avatar"
            />
            <div v-else class="char-avatar-placeholder">
              {{ rel.character.name.charAt(0) }}
            </div>
            <div class="char-info">
              <h4 class="char-name">{{ rel.character.name }}</h4>
              <span v-if="rel.character.nameEn" class="char-name-en text-secondary">{{ rel.character.nameEn }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.story-detail-page { padding: 24px 0; }
.page-loading, .page-empty { display: flex; justify-content: center; padding: 80px 0; }
.page-top { margin-bottom: 24px; }
.back-btn { color: var(--sao-text-secondary); font-size: 14px; &:hover { color: var(--sao-accent); } }

.arc-header { margin-bottom: 24px; :deep(.n-card__content) { padding: 0; } }
.arc-header-content { display: flex; gap: 32px; padding: 28px; }
.arc-cover-section {
  width: 200px; height: 280px; border-radius: 16px; overflow: hidden; flex-shrink: 0;
  .arc-cover-img { width: 100%; height: 100%; }
  .arc-cover-placeholder { width: 100%; height: 100%; background: rgba(0, 212, 255, 0.08); display: flex; align-items: center; justify-content: center; color: var(--sao-accent); }
}
.arc-header-info { flex: 1; display: flex; flex-direction: column; }
.arc-season { align-self: flex-start; margin-bottom: 12px; }
.arc-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.arc-name-en { margin-bottom: 4px; }
.arc-name-ja { margin-bottom: 12px; }
.arc-synopsis { font-size: 14px; line-height: 1.8; }

.story-main { display: flex; gap: 16px; align-items: flex-start; }
.chapter-sidebar {
  width: 280px;
  max-height: 72vh;
  overflow: auto;
  position: sticky;
  top: calc(var(--sao-header-height) + 16px);
}
.sidebar-title { font-size: 15px; margin-bottom: 12px; }
.chapter-list { display: flex; flex-direction: column; gap: 8px; }
.chapter-link {
  border: 1px solid var(--sao-border-color);
  background: transparent;
  color: var(--sao-text-secondary);
  border-radius: 10px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chapter-link.active {
  border-color: rgba(0, 212, 255, 0.4);
  color: var(--sao-accent);
  background: rgba(0, 212, 255, 0.06);
}
.chapter-num { font-size: 12px; }
.chapter-name { font-size: 13px; font-weight: 600; }

.chapter-content-wrap { flex: 1; min-width: 0; }
.chapter-card :deep(.n-card__content) { padding: 18px 20px; }
.chapter-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.chapter-head-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.chapter-title { font-size: 20px; }
.chapter-nav { display: flex; gap: 8px; }

.key-points {
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid var(--sao-border-color);
  border-radius: 10px;
  background: rgba(0, 212, 255, 0.05);
}
.key-title { font-size: 13px; margin-bottom: 8px; color: var(--sao-accent); }
.key-points ul { margin-left: 16px; }
.key-points li { font-size: 13px; line-height: 1.7; }

.chapter-content {
  font-size: 14px;
  line-height: 1.9;
  color: var(--sao-text-secondary);
  white-space: normal;
  :deep(.dialog-line) {
    display: inline-block;
    padding: 0 4px;
    border-radius: 6px;
    background: rgba(78, 205, 196, 0.08);
  }
  :deep(.dialog-speaker) { color: var(--sao-accent); font-weight: 600; }
  :deep(.dialog-quote) { color: var(--sao-text-primary); }
}

.section { margin-top: 32px; }
.arc-jump-list { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.arc-jump-tag { cursor: pointer; }

.characters-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.character-card { display: flex; align-items: center; gap: 12px; padding: 14px; cursor: pointer; }
.char-avatar-placeholder {
  width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;
}
.char-name { font-size: 14px; margin-bottom: 2px; }
.char-name-en { font-size: 12px; }

@media (max-width: 768px) {
  .arc-header-content { flex-direction: column; gap: 16px; padding: 16px; }
  .arc-cover-section { width: 100%; height: 180px; }
  .story-main { flex-direction: column; }
  .chapter-sidebar { width: 100%; position: static; max-height: none; }
  .chapter-nav { width: 100%; justify-content: space-between; }
}
</style>
