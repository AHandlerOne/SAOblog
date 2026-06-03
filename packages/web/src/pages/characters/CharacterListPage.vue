<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { cmsApi } from '@/api/cms'
import type { Character, Arc } from '@/api/cms'
import { NCard, NInput, NSelect, NGrid, NGridItem, NAvatar, NTag, NSpin, NEmpty, NPagination, NSpace, NIcon } from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'

const router = useRouter()
const loading = ref(false)
const characters = ref<Character[]>([])
const arcs = ref<Arc[]>([])
const searchQuery = ref('')
const selectedArcId = ref<number | null>(null)
const currentPage = ref(1)
const total = ref(0)
const pageSize = 12

const arcOptions = computed<any[]>(() => [
  { label: '全部篇章', value: null },
  ...arcs.value.map(arc => ({ label: arc.name, value: arc.id })),
])

async function fetchArcs() {
  try {
    const res = await cmsApi.getArcs({ pageSize: 50 })
    arcs.value = res.data
  } catch {
    arcs.value = []
  }
}

async function fetchCharacters() {
  loading.value = true
  try {
    const params: { page?: number; pageSize?: number; search?: string; arcId?: number } = {
      page: currentPage.value,
      pageSize,
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    if (selectedArcId.value) {
      params.arcId = selectedArcId.value
    }
    const res = await cmsApi.getCharacters(params)
    characters.value = res.data
    total.value = res.total
  } catch {
    characters.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchCharacters()
}

function handleArcChange(val: number | null) {
  selectedArcId.value = val
  currentPage.value = 1
  fetchCharacters()
}

function handlePageChange(p: number) {
  currentPage.value = p
  fetchCharacters()
}

function goToDetail(char: Character) {
  router.push(`/characters/${char.id}`)
}

const totalPages = computed(() => Math.ceil(total.value / pageSize))

onMounted(() => {
  fetchArcs()
  fetchCharacters()
})
</script>

<template>
  <div class="character-list-page">
    <h1 class="sao-section-title">人物图鉴</h1>
    <p class="page-subtitle text-secondary">艾恩葛朗特中的英雄们</p>

    <div class="filters sao-card">
      <NSpace align="center" :size="16" wrap>
        <div class="search-wrapper">
          <NInput
            v-model:value="searchQuery"
            placeholder="搜索角色名称..."
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <NIcon :component="SearchOutline" />
            </template>
          </NInput>
        </div>
        <NSelect
          :value="selectedArcId"
          :options="arcOptions"
          placeholder="按篇章筛选"
          clearable
          class="arc-select"
          @update:value="handleArcChange"
        />
      </NSpace>
    </div>

    <NSpin :show="loading">
      <div v-if="characters.length === 0 && !loading" class="empty-wrapper">
        <NEmpty description="未找到角色" />
      </div>

      <NGrid v-else :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <NGridItem
          v-for="char in characters"
          :key="char.id"
          span="4 m:3 l:2 xl:1"
        >
          <NCard
            class="character-card sao-card"
            hoverable
            @click="goToDetail(char)"
          >
            <div class="char-card-content">
              <div class="char-avatar-wrapper">
                <NAvatar
                  v-if="char.avatar"
                  :src="char.avatar"
                  :size="80"
                  round
                />
                <div v-else class="char-avatar-large">
                  {{ char.name?.charAt(0) || '?' }}
                </div>
              </div>

              <div class="char-info">
                <h3 class="char-name">{{ char.name }}</h3>
                <p v-if="char.nameJa" class="char-name-ja text-secondary">{{ char.nameJa }}</p>
                <p v-if="char.nameEn" class="char-name-en text-secondary">{{ char.nameEn }}</p>
                <div class="char-meta">
                  <NTag v-if="char.cv" :bordered="false" size="tiny" round>
                    CV: {{ char.cv }}
                  </NTag>
                  <NTag v-if="char.weapon" :bordered="false" size="tiny" type="success" round>
                    {{ char.weapon }}
                  </NTag>
                  <NTag v-if="char.affiliation" :bordered="false" size="tiny" type="warning" round>
                    {{ char.affiliation }}
                  </NTag>
                </div>
                <p class="char-brief text-secondary">
                  {{ char.description?.substring(0, 60) }}{{ char.description && char.description.length > 60 ? '...' : '' }}
                </p>
              </div>
            </div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NSpin>

    <div v-if="totalPages > 1" class="pagination-wrapper">
      <NPagination
        :page="currentPage"
        :page-count="totalPages"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.character-list-page {
  .page-subtitle { margin-bottom: 24px; font-size: 14px; }
}

.filters {
  padding: 16px 20px;
  margin-bottom: 24px;

  .search-wrapper { flex: 1; max-width: 320px; min-width: 200px; }
  .arc-select { width: 180px; }
}

.empty-wrapper { padding: 80px 0; text-align: center; }

.character-card {
  cursor: pointer;
  text-align: center;

  .char-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .char-avatar-wrapper {
    .char-avatar-large {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 700; color: #fff;
    }
  }

  .char-name { font-size: 16px; font-weight: 600; color: var(--sao-text-primary); margin-bottom: 2px; }
  .char-name-ja { font-size: 12px; margin-bottom: 2px; }
  .char-name-en { font-size: 11px; margin-bottom: 6px; }

  .char-meta {
    display: flex; justify-content: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;
  }

  .char-brief { font-size: 12px; line-height: 1.6; text-align: left; }
}

.pagination-wrapper {
  display: flex; justify-content: center; margin-top: 32px;
}

@media (max-width: 640px) {
  .filters {
    padding: 14px;

    .search-wrapper {
      max-width: 100%;
      min-width: 0;
      width: 100%;
    }

    .arc-select {
      width: 100%;
    }
  }
}
</style>
