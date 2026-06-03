<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAvatar,
  NButton,
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NModal,
  NNotificationProvider,
  darkTheme,
} from 'naive-ui'
import { notificationsApi } from '@/api/notifications'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useThemeStore } from '@/stores/theme'
import { isSessionExpired, touchSessionActivity } from '@/utils/session'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const router = useRouter()

const loginReminderText = computed(() => `你有 ${notificationStore.unreadCount} 条未读互动消息`)

const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const

function handleActivity(): void {
  if (authStore.isLoggedIn && isSessionExpired()) {
    authStore.expireSession()
    return
  }
  touchSessionActivity()
}

watch(
  () => authStore.isLoggedIn,
  async (isLoggedIn, wasLoggedIn) => {
    if (isLoggedIn && !wasLoggedIn) {
      await notificationStore.checkLoginReminder()
    }
  },
  { immediate: true },
)

async function closeAndMarkRead(): Promise<void> {
  try {
    await notificationsApi.markRead()
    await notificationStore.refreshUnreadCount()
  } finally {
    notificationStore.closeLoginReminder()
  }
}

function goToNotifications(): void {
  notificationStore.closeLoginReminder()
  router.push('/notifications')
}

onMounted(() => {
  for (const eventName of activityEvents) {
    window.addEventListener(eventName, handleActivity, { passive: true })
  }
})

onBeforeUnmount(() => {
  for (const eventName of activityEvents) {
    window.removeEventListener(eventName, handleActivity)
  }
})
</script>

<template>
  <NConfigProvider :theme="themeStore.isDark ? darkTheme : undefined">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <router-view />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>

    <NModal
      v-model:show="notificationStore.loginReminderVisible"
      preset="card"
      title="互动消息提醒"
      :style="{ maxWidth: '560px' }"
    >
      <p>{{ loginReminderText }}</p>
      <div class="login-reminder-list">
        <div
          v-for="item in notificationStore.loginReminderItems"
          :key="item.id"
          class="login-reminder-item"
        >
          <NAvatar round size="small" :src="item.actor.avatar || undefined">
            {{ item.actor.nickname.charAt(0) }}
          </NAvatar>
          <span>
            {{ item.actor.nickname }}
            {{
              item.type === 'FOLLOW'
                ? '关注了你'
                : item.type === 'LIKE'
                  ? '点赞了你的作品'
                  : '收藏了你的作品'
            }}
          </span>
        </div>
      </div>
      <template #footer>
        <div class="login-reminder-footer">
          <NButton @click="closeAndMarkRead">全部标记已读</NButton>
          <NButton type="primary" @click="goToNotifications">查看消息列表</NButton>
        </div>
      </template>
    </NModal>
  </NConfigProvider>
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

.login-reminder-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.login-reminder-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-reminder-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
