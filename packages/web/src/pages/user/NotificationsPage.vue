<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAvatar,
  NButton,
  NCheckbox,
  NEmpty,
  NImage,
  NPagination,
  NSelect,
  NSpin,
  useMessage,
} from 'naive-ui'
import { notificationsApi, type NotificationRecord } from '@/api/notifications'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const message = useMessage()
const notificationStore = useNotificationStore()

const loading = ref(false)
const deleting = ref(false)
const records = ref<NotificationRecord[]>([])
const selectedIds = ref<string[]>([])
const currentPage = ref(1)
const pageSize = 20
const total = ref(0)
const filterType = ref<'ALL' | 'FOLLOW' | 'LIKE' | 'FAVORITE'>('ALL')

const filterOptions = [
  { label: '全部消息', value: 'ALL' },
  { label: '关注通知', value: 'FOLLOW' },
  { label: '点赞通知', value: 'LIKE' },
  { label: '收藏通知', value: 'FAVORITE' },
]

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function formatTime(value: string): string {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getMessageText(item: NotificationRecord): string {
  if (item.type === 'FOLLOW') return `${item.actor.nickname} 关注了你`
  if (item.type === 'LIKE') return `${item.actor.nickname} 点赞了你的作品`
  return `${item.actor.nickname} 收藏了你的作品`
}

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await notificationsApi.getList({
      page: currentPage.value,
      pageSize,
      type: filterType.value,
    })
    records.value = res.data
    total.value = res.total
    selectedIds.value = []
  } finally {
    loading.value = false
  }
}

async function markAllReadAndRefresh(): Promise<void> {
  await notificationsApi.markRead()
  await notificationStore.refreshUnreadCount()
  await fetchList()
}

async function deleteSelected(): Promise<void> {
  if (selectedIds.value.length === 0) {
    message.warning('请先选择消息')
    return
  }
  deleting.value = true
  try {
    const res = await notificationsApi.batchDelete(selectedIds.value)
    message.success(`已删除 ${res.deletedCount} 条消息`)
    await notificationStore.refreshUnreadCount()
    await fetchList()
  } finally {
    deleting.value = false
  }
}

async function openItem(item: NotificationRecord): Promise<void> {
  if (!item.isRead) {
    await notificationsApi.markRead([item.id])
    await notificationStore.refreshUnreadCount()
    item.isRead = true
  }

  if (item.type === 'FOLLOW' || !item.work) {
    router.push(`/user/${item.actor.id}`)
    return
  }
  router.push(`/community/works/${item.work.id}`)
}

async function changePage(page: number): Promise<void> {
  currentPage.value = page
  await fetchList()
}

async function handleFilterChange(): Promise<void> {
  currentPage.value = 1
  await fetchList()
}

function toggleSelection(id: string, checked: boolean): void {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value = [...selectedIds.value, id]
    }
    return
  }
  selectedIds.value = selectedIds.value.filter((item) => item !== id)
}

onMounted(async () => {
  await markAllReadAndRefresh()
})
</script>

<template>
  <div class="notifications-page">
    <div class="header-row">
      <div>
        <h1 class="sao-section-title">消息列表</h1>
        <p class="text-secondary">按时间倒序查看关注、点赞、收藏通知</p>
      </div>
      <div class="actions">
        <NSelect
          v-model:value="filterType"
          :options="filterOptions"
          style="min-width: 180px;"
          @update:value="handleFilterChange"
        />
        <NButton :loading="deleting" type="error" ghost @click="deleteSelected">批量删除</NButton>
      </div>
    </div>

    <NSpin v-if="loading" class="loading-wrap" />
    <NEmpty v-else-if="records.length === 0" description="暂无消息" class="empty-wrap" />

    <div v-else class="list">
      <div
        v-for="item in records"
        :key="item.id"
        class="item sao-card"
        :class="{ unread: !item.isRead }"
        @click="openItem(item)"
      >
        <div class="item-left" @click.stop>
          <NCheckbox
            :checked="selectedIds.includes(item.id)"
            @update:checked="(checked: boolean) => toggleSelection(item.id, checked)"
          />
        </div>
        <NAvatar
          round
          :src="item.actor.avatar || undefined"
          class="actor-avatar"
        >
          {{ item.actor.nickname.charAt(0) }}
        </NAvatar>
        <div class="item-main">
          <div class="item-title">{{ getMessageText(item) }}</div>
          <div class="item-time text-secondary">{{ formatTime(item.createdAt) }}</div>
        </div>
        <NImage
          v-if="item.work?.coverImage"
          :src="item.work.coverImage"
          :alt="item.work.title"
          class="work-cover"
          preview-disabled
        />
      </div>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <NPagination :page="currentPage" :page-count="totalPages" @update:page="changePage" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.notifications-page {
  padding: 24px 0;
}

.header-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
}

.item.unread {
  border-color: rgba(0, 212, 255, 0.45) !important;
}

.item-main {
  flex: 1;
}

.item-title {
  font-size: 14px;
  color: var(--sao-text-primary);
}

.item-time {
  font-size: 12px;
  margin-top: 4px;
}

.work-cover {
  width: 68px;
  height: 68px;
  border-radius: 8px;
  overflow: hidden;
}

.pager {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
  }
}
</style>

