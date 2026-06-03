<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { cmsApi } from '@/api/cms'
import type { Wallpaper, Character, Arc } from '@/api/cms'
import { NImage, NInput, NSelect, NSpin, NEmpty, NPagination, NModal, NTag, NIcon } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

const wallpapers = ref<Wallpaper[]>([])
const characters = ref<Character[]>([])
const arcs = ref<Arc[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCharacterId = ref<number | null>(null)
const selectedArcId = ref<number | null>(null)
const selectedResolution = ref<string | null>(null)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 24

const previewVisible = ref(false)
const previewSrc = ref('')
const previewTitle = ref('')
const previewSource = ref('')

const resolutionOptions = [
  { label: '1920x1080', value: '1920x1080' },
  { label: '2560x1440', value: '2560x1440' },
  { label: '3840x2160', value: '3840x2160' },
  { label: '手机壁纸', value: 'mobile' },
]

const characterOptions = ref<{ label: string; value: number }[]>([])
const arcOptions = ref<{ label: string; value: number }[]>([])

onMounted(async () => {
  try {
    const [charsRes, arcsRes] = await Promise.all([
      cmsApi.getCharacters({ pageSize: 100 }),
      cmsApi.getArcs(),
    ])
    characters.value = charsRes.data
    arcs.value = arcsRes.data
    characterOptions.value = charsRes.data.map(c => ({ label: c.name, value: c.id }))
    arcOptions.value = arcsRes.data.map(a => ({ label: a.name, value: a.id }))
  } catch {
    // ignore
  }
  await fetchWallpapers()
})

watch([searchQuery, selectedCharacterId, selectedArcId, selectedResolution], () => {
  currentPage.value = 1
  fetchWallpapers()
})

async function fetchWallpapers() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize,
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (selectedCharacterId.value) params.characterId = selectedCharacterId.value
    if (selectedArcId.value) params.arcId = selectedArcId.value
    if (selectedResolution.value) params.resolution = selectedResolution.value
    const res = await cmsApi.getWallpapers(params)
    wallpapers.value = res.data
    totalPages.value = Math.ceil(res.total / pageSize)
  } catch (error) {
    console.error('Failed to load wallpapers:', error)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchWallpapers()
}

function openPreview(wp: Wallpaper) {
  previewSrc.value = wp.imageUrl
  previewTitle.value = wp.title
  previewSource.value = wp.sourceUrl || ''
  previewVisible.value = true
}
</script>

<template>
  <div class="gallery-page">
    <div class="page-header">
      <h1 class="sao-section-title">壁纸画廊</h1>
      <p class="page-subtitle text-secondary">精选SAO系列高清壁纸</p>
    </div>

    <!-- Filters -->
    <div class="filters-bar sao-card">
      <div class="filters-row">
        <NInput
          v-model:value="searchQuery"
          placeholder="搜索壁纸..."
          clearable
          class="search-input"
          @keyup.enter="fetchWallpapers"
        >
          <template #prefix>
            <NIcon :component="SearchOutline" />
          </template>
        </NInput>
        <NSelect
          v-model:value="selectedCharacterId"
          :options="characterOptions"
          placeholder="按角色筛选"
          clearable
          class="filter-select"
        />
        <NSelect
          v-model:value="selectedArcId"
          :options="arcOptions"
          placeholder="按篇章筛选"
          clearable
          class="filter-select"
        />
        <NSelect
          v-model:value="selectedResolution"
          :options="resolutionOptions"
          placeholder="分辨率"
          clearable
          class="filter-select resolution-select"
        />
      </div>
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty
      v-else-if="wallpapers.length === 0"
      description="未找到匹配的壁纸"
      class="page-empty"
    />

    <template v-else>
      <div class="masonry-grid">
        <div
          v-for="wp in wallpapers"
          :key="wp.id"
          class="masonry-item"
          @click="openPreview(wp)"
        >
          <NImage
            :src="wp.imageUrl"
            :alt="wp.title"
            object-fit="cover"
            class="masonry-img"
            preview-disabled
          />
          <div class="masonry-overlay">
            <div class="overlay-content">
              <span class="overlay-title">{{ wp.title }}</span>
              <div class="overlay-meta">
                <NTag v-if="wp.resolution" size="small" :bordered="false" type="info">
                  {{ wp.resolution }}
                </NTag>
                <span v-if="wp.character?.name" class="overlay-char text-secondary">{{ wp.character.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination
          :page="currentPage"
          :page-count="totalPages"
          @update:page="handlePageChange"
        />
      </div>
    </template>

    <!-- Preview Modal -->
    <NModal
      v-model:show="previewVisible"
      preset="card"
      :bordered="false"
      :title="previewTitle"
      class="preview-modal"
      :style="{ maxWidth: '90vw', maxHeight: '90vh' }"
      content-style="padding: 0; background: transparent; overflow: hidden;"
    >
      <div class="preview-container">
        <NImage
          :src="previewSrc"
          object-fit="contain"
          class="preview-image"
          preview-disabled
        />
        <div v-if="previewSource" class="preview-source text-secondary">
          来源: {{ previewSource }}
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.gallery-page {
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
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 200px;

  :deep(.n-input) {
    background: rgba(255, 255, 255, 0.06) !important;
    border: 1px solid var(--sao-border-color) !important;
    border-radius: 12px !important;

    .n-input__input-el {
      color: var(--sao-text-primary) !important;
    }

    .n-input__placeholder {
      color: var(--sao-text-secondary) !important;
    }
  }
}

.filter-select {
  width: 160px;
}

.resolution-select {
  width: 140px;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.masonry-grid {
  column-count: 4;
  column-gap: 16px;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 16px;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 212, 255, 0.15);

    .masonry-overlay {
      opacity: 1;
    }
  }

  .masonry-img {
    width: 100%;
    display: block;
  }

  .masonry-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .overlay-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .overlay-title {
    font-size: 13px;
    color: #ffffff;
    font-weight: 500;
  }

  .overlay-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .overlay-char {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7) !important;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.preview-modal {
  :deep(.n-card) {
    background: rgba(26, 26, 46, 0.95) !important;
    border: 1px solid var(--sao-border-color) !important;
  }

  :deep(.n-card-header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--sao-border-color);
  }
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 75vh;
}

.preview-source {
  padding: 12px;
  font-size: 12px;
  text-align: center;
}

@media (max-width: 1024px) {
  .masonry-grid {
    column-count: 3;
  }
}

@media (max-width: 768px) {
  .masonry-grid {
    column-count: 2;
  }

  .filters-row {
    flex-direction: column;
  }

  .search-input,
  .filter-select,
  .resolution-select {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .masonry-grid {
    column-count: 1;
  }
}
</style>
