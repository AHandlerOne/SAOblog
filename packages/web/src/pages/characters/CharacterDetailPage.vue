<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { cmsApi } from '@/api/cms'
import type { Character, Wallpaper } from '@/api/cms'
import { NButton, NIcon, NImage, NSpin, NEmpty, NAvatar, NTag, NModal } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'

const props = defineProps<{ id: string }>()
const router = useRouter()

const character = ref<Character | null>(null)
const wallpapers = ref<Wallpaper[]>([])
const loading = ref(true)
const wpLoading = ref(true)
const wpPage = ref(1)
const wpTotal = ref(0)
const previewVisible = ref(false)
const previewSrc = ref('')

const wpPageSize = 12
const wpTotalPages = computed(() => Math.ceil(wpTotal.value / wpPageSize))

async function loadCharacter(charId: number) {
  loading.value = true
  wpLoading.value = true
  previewVisible.value = false
  previewSrc.value = ''
  try {
    const res = await cmsApi.getCharacter(charId)
    character.value = res.data
  } catch (error) {
    console.error('Failed to load character:', error)
    character.value = null
  } finally {
    loading.value = false
  }

  await fetchWallpapers(charId)
}

onMounted(async () => {
  await loadCharacter(Number(props.id))
})

watch(
  () => props.id,
  async (nextId) => {
    await loadCharacter(Number(nextId))
  },
)

async function fetchWallpapers(characterId: number) {
  wpLoading.value = true
  try {
    const res = await cmsApi.getWallpapers({
      characterId,
      page: wpPage.value,
      pageSize: wpPageSize,
    })
    wallpapers.value = res.data
    wpTotal.value = res.total
  } catch {
    wallpapers.value = []
  } finally {
    wpLoading.value = false
  }
}

function goBack() {
  router.push('/characters')
}

function openPreview(url: string) {
  previewSrc.value = url
  previewVisible.value = true
}

function handleWpPageChange(p: number) {
  wpPage.value = p
  fetchWallpapers(Number(props.id))
}

function goToArc(arcId: number) {
  router.push(`/story/${arcId}`)
}
</script>

<template>
  <div class="character-detail-page">
    <NSpin v-if="loading" class="page-loading" />

    <NEmpty
      v-else-if="!character"
      description="未找到该角色"
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
          返回角色列表
        </NButton>
      </div>

      <!-- Character Info Card -->
      <div class="character-header sao-card">
        <div class="character-header-content">
          <div class="char-avatar-section">
            <NAvatar
              v-if="character.avatar"
              :src="character.avatar"
              round
              :size="120"
              class="char-avatar"
            />
            <div v-else class="char-avatar-placeholder">
              {{ character.name.charAt(0) }}
            </div>
          </div>
          <div class="char-info-section">
            <h1 class="char-name">{{ character.name }}</h1>
            <p v-if="character.nameJa" class="char-name-ja text-secondary">{{ character.nameJa }}</p>
            <p v-if="character.nameEn" class="char-name-en text-secondary">{{ character.nameEn }}</p>
            <div class="char-details">
              <div v-if="character.cv" class="detail-item">
                <span class="detail-label text-secondary">CV:</span>
                <span class="detail-value">{{ character.cv }}</span>
              </div>
              <div v-if="character.weapon" class="detail-item">
                <span class="detail-label text-secondary">武器:</span>
                <span class="detail-value">{{ character.weapon }}</span>
              </div>
              <div v-if="character.affiliation" class="detail-item">
                <span class="detail-label text-secondary">阵营:</span>
                <span class="detail-value">{{ character.affiliation }}</span>
              </div>
            </div>
            <!-- Arcs -->
            <div v-if="character.arcs && character.arcs.length > 0" class="char-arcs">
              <span class="detail-label text-secondary">登场篇章:</span>
              <div class="arc-tags">
                <NTag
                  v-for="rel in character.arcs"
                  :key="rel.arc.id"
                  :bordered="false"
                  size="small"
                  round
                  class="arc-tag"
                  @click="goToArc(rel.arc.id)"
                >
                  {{ rel.arc.name }}
                </NTag>
              </div>
            </div>
          </div>
        </div>
        <p v-if="character.description" class="char-description text-secondary">
          {{ character.description }}
        </p>
      </div>

      <!-- Built-in wallpapers -->
      <div v-if="character.wallpapers && character.wallpapers.length > 0" class="section">
        <h2 class="sao-section-title">角色壁纸</h2>
        <p class="section-subtitle text-secondary">共 {{ character._count?.wallpapers ?? character.wallpapers.length }} 张壁纸</p>
        <div class="wallpaper-grid">
          <div
            v-for="wp in character.wallpapers"
            :key="wp.id"
            class="wallpaper-item"
            @click="openPreview(wp.imageUrl)"
          >
            <NImage
              :src="wp.imageUrl"
              :alt="wp.title"
              object-fit="cover"
              class="wallpaper-img"
              preview-disabled
            />
            <div class="wallpaper-overlay">
              <span class="wallpaper-title">{{ wp.title }}</span>
              <span v-if="wp.resolution" class="wallpaper-res">{{ wp.resolution }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="character.arcs && character.arcs.length > 0" class="section">
        <h2 class="sao-section-title">剧情出场节点</h2>
        <div class="arc-timeline">
          <div
            v-for="node in character.arcs"
            :key="`arc-node-${node.arc.id}`"
            class="arc-node sao-card"
            @click="goToArc(node.arc.id)"
          >
            <div class="arc-node-header">
              <span class="arc-node-name">{{ node.arc.name }}</span>
              <NTag v-if="node.role" size="small" :bordered="false" type="info">{{ node.role }}</NTag>
            </div>
            <p v-if="node.arc.synopsis" class="arc-node-desc text-secondary">
              {{ node.arc.synopsis.slice(0, 100) }}{{ node.arc.synopsis.length > 100 ? '...' : '' }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="character.relatedCharacters && character.relatedCharacters.length > 0" class="section">
        <h2 class="sao-section-title">关联角色关系</h2>
        <div class="related-grid">
          <div
            v-for="rel in character.relatedCharacters"
            :key="`rel-char-${rel.id}`"
            class="related-item sao-card"
            @click="router.push(`/characters/${rel.id}`)"
          >
            <NAvatar v-if="rel.avatar" :src="rel.avatar" :size="42" round />
            <div v-else class="related-avatar-placeholder">
              {{ rel.name.charAt(0) }}
            </div>
            <div class="related-main">
              <div class="related-name">{{ rel.name }}</div>
              <div class="related-role text-secondary">{{ rel.arcs?.[0]?.role || '同篇章角色' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- All wallpapers (paginated) -->
      <div v-if="wpTotal > 0" class="section">
        <div v-if="wpTotalPages > 1" class="pagination-wrapper">
          <NPagination
            :page="wpPage"
            :page-count="wpTotalPages"
            @update:page="handleWpPageChange"
          />
        </div>
      </div>

      <!-- Preview Modal -->
      <NModal
        v-model:show="previewVisible"
        preset="card"
        :bordered="false"
        class="preview-modal"
        :style="{ maxWidth: '90vw', maxHeight: '90vh' }"
        content-style="padding: 0; background: transparent;"
      >
        <NImage
          :src="previewSrc"
          object-fit="contain"
          class="preview-image"
          preview-disabled
        />
      </NModal>
    </template>
  </div>
</template>

<style scoped lang="scss">
.character-detail-page { padding: 24px 0; }

.page-loading, .page-empty {
  display: flex; justify-content: center; padding: 80px 0;
}

.page-top { margin-bottom: 24px; }

.back-btn {
  color: var(--sao-text-secondary); font-size: 14px;
  &:hover { color: var(--sao-accent); }
}

.character-header {
  margin-bottom: 40px;
  :deep(.n-card__content) { padding: 0; }
}

.character-header-content {
  display: flex; gap: 32px; padding: 32px;
}

.char-avatar-section { flex-shrink: 0; }

.char-avatar-placeholder {
  width: 120px; height: 120px; border-radius: 50%;
  background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #ffffff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 42px;
}

.char-info-section { flex: 1; }
.char-name { font-size: 28px; font-weight: 700; color: var(--sao-text-primary); margin-bottom: 4px; }
.char-name-ja { font-size: 16px; margin-bottom: 2px; }
.char-name-en { font-size: 14px; margin-bottom: 16px; }

.char-details {
  display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px;
}

.detail-item { display: flex; gap: 6px; font-size: 14px; }
.detail-label { color: var(--sao-text-secondary); }
.detail-value { color: var(--sao-text-primary); font-weight: 500; }

.char-arcs { margin-top: 8px; }
.arc-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.arc-tag { cursor: pointer; &:hover { opacity: 0.8; } }

.char-description {
  padding: 20px 32px 24px;
  font-size: 14px; line-height: 1.8;
  border-top: 1px solid var(--sao-border-color);
  margin: 0 24px; padding-top: 20px;
}

.section { margin-bottom: 48px; }
.section-subtitle { font-size: 14px; margin-bottom: 24px; }

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.arc-timeline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.arc-node {
  cursor: pointer;
}

.arc-node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.arc-node-name {
  font-size: 14px;
  font-weight: 600;
}

.arc-node-desc {
  font-size: 12px;
  line-height: 1.6;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.related-main {
  min-width: 0;
}

.related-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--sao-text-primary);
}

.related-role {
  font-size: 12px;
}

.related-avatar-placeholder {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.wallpaper-item {
  position: relative; border-radius: 12px; overflow: hidden;
  cursor: pointer; aspect-ratio: 16/10;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 212, 255, 0.15);
    .wallpaper-overlay { opacity: 1; }
  }

  .wallpaper-img { width: 100%; height: 100%; }

  .wallpaper-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 12px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    opacity: 0; transition: opacity 0.3s ease;

    .wallpaper-title { display: block; font-size: 13px; color: #ffffff; font-weight: 500; }
    .wallpaper-res { font-size: 11px; color: rgba(255, 255, 255, 0.7); }
  }
}

.preview-modal {
  :deep(.n-card) { background: transparent !important; box-shadow: none !important; }
}

.preview-image { max-width: 90vw; max-height: 85vh; border-radius: 12px; }
.pagination-wrapper { display: flex; justify-content: center; margin-top: 24px; }

@media (max-width: 640px) {
  .character-header-content { flex-direction: column; align-items: center; text-align: center; }
  .char-details { justify-content: center; }
  .char-description { padding: 16px 20px 20px; margin: 0 12px; }
  .wallpaper-grid { grid-template-columns: repeat(2, 1fr); }
  .arc-timeline,
  .related-grid { grid-template-columns: 1fr; }
}
</style>
