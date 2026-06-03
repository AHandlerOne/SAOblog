import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsApi, type NotificationRecord } from '@/api/notifications'

export const useNotificationStore = defineStore('notifications', () => {
  const unreadCount = ref(0)
  const loginReminderVisible = ref(false)
  const loginReminderItems = ref<NotificationRecord[]>([])

  async function refreshUnreadCount(): Promise<void> {
    try {
      const res = await notificationsApi.getUnreadCount()
      unreadCount.value = res.data.unreadCount
    } catch {
      unreadCount.value = 0
    }
  }

  async function checkLoginReminder(): Promise<void> {
    try {
      const [summary, unread] = await Promise.all([
        notificationsApi.getUnreadSummary(),
        notificationsApi.getUnreadCount(),
      ])
      unreadCount.value = unread.data.unreadCount
      loginReminderItems.value = summary.data
      loginReminderVisible.value = unreadCount.value > 0
    } catch {
      loginReminderVisible.value = false
    }
  }

  function closeLoginReminder(): void {
    loginReminderVisible.value = false
  }

  return {
    unreadCount,
    loginReminderVisible,
    loginReminderItems,
    refreshUnreadCount,
    checkLoginReminder,
    closeLoginReminder,
  }
})

