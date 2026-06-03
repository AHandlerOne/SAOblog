<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cmsApi } from '@/api/cms'
import type { Arc } from '@/api/cms'
import { NCard, NImage, NTag, NSpin, NEmpty } from 'naive-ui'

const router = useRouter()
const loading = ref(false)
const arcs = ref<Arc[]>([])

async function fetchArcs() {
  loading.value = true
  try {
    const res = await cmsApi.getArcs({ pageSize: 50 })
    arcs.value = res.data
  } catch {
    arcs.value = []
  } finally {
    loading.value = false
  }
}

function goToDetail(arc: Arc) {
  router.push(`/story/${arc.id}`)
}

onMounted(fetchArcs)
</script>

<template>
  <div class="story-list-page">
    <h1 class="sao-section-title">剧情介绍</h1>
    <p class="page-subtitle text-secondary">探索刀剑神域各篇章的精彩故事</p>

    <NSpin :show="loading">
      <div v-if="arcs.length === 0 && !loading" class="empty-wrapper">
        <NEmpty description="暂无剧情数据" />
      </div>

      <div v-else class="timeline">
        <div
          v-for="(arc, index) in arcs"
          :key="arc.id"
          class="timeline-item"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="timeline-marker">
            <div class="marker-dot"></div>
            <div v-if="index < arcs.length - 1" class="marker-line"></div>
          </div>

          <NCard
            class="timeline-card sao-card"
            hoverable
            @click="goToDetail(arc)"
          >
            <div class="arc-card-content">
              <div class="arc-cover">
                <NImage
                  v-if="arc.coverImage"
                  :src="arc.coverImage"
                  :alt="arc.name"
                  object-fit="cover"
                  class="cover-image"
                  preview-disabled
                />
                <div v-else class="cover-placeholder">
                  <span>{{ arc.name?.charAt(0) || '?' }}</span>
                </div>
              </div>

              <div class="arc-info">
                <div class="arc-meta">
                  <NTag :bordered="false" size="small" type="info" round>
                    {{ arc.season || '未分类' }}
                  </NTag>
                  <span v-if="arc.nameEn" class="arc-date text-secondary">{{ arc.nameEn }}</span>
                </div>

                <h3 class="arc-title">{{ arc.name }}</h3>
                <p class="arc-synopsis text-secondary">
                  {{ arc.synopsis || '暂无简介' }}
                </p>

                <div class="arc-footer">
                  <span class="arc-chapters text-secondary">
                    {{ arc._count?.chapters || 0 }} 章节
                  </span>
                  <span class="arc-action text-accent">查看详情 &rarr;</span>
                </div>
              </div>
            </div>
          </NCard>
        </div>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
.story-list-page {
  .page-subtitle {
    margin-bottom: 32px;
    font-size: 14px;
  }
}

.empty-wrapper {
  padding: 80px 0;
  text-align: center;
}

.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-marker {
  position: absolute;
  left: -32px;
  top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;

  .marker-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
    flex-shrink: 0;
  }

  .marker-line {
    width: 2px;
    flex: 1;
    background: linear-gradient(to bottom, var(--sao-accent), transparent);
    margin-top: 4px;
    min-height: 40px;
  }
}

.timeline-card {
  cursor: pointer;
  padding: 0;
  overflow: hidden;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.arc-card-content {
  display: flex;
  gap: 0;
  min-height: 180px;
}

.arc-cover {
  width: 200px;
  min-height: 180px;
  flex-shrink: 0;
  overflow: hidden;

  .cover-image {
    width: 100%;
    height: 100%;
    min-height: 180px;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    min-height: 180px;
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(78, 205, 196, 0.05));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: 700;
    color: var(--sao-accent);
  }
}

.arc-info {
  padding: 20px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.arc-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;

  .arc-date {
    font-size: 12px;
    display: flex;
    align-items: center;
  }
}

.arc-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--sao-text-primary);
  margin-bottom: 4px;
}

.arc-title-en {
  font-size: 13px;
  margin-bottom: 8px;
}

.arc-synopsis {
  font-size: 13px;
  line-height: 1.7;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.arc-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;

  .arc-action {
    margin-left: auto;
    font-weight: 500;
  }
}

@media (max-width: 768px) {
  .arc-card-content {
    flex-direction: column;
  }

  .arc-cover {
    width: 100%;
    min-height: 140px;
    max-height: 200px;

    .cover-image {
      min-height: 140px;
    }

    .cover-placeholder {
      min-height: 140px;
    }
  }

  .timeline {
    padding-left: 24px;
  }

  .timeline-marker {
    left: -24px;
  }
}
</style>
