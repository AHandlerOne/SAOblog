import api from './index'

export type NotificationType = 'FOLLOW' | 'LIKE' | 'FAVORITE'

export interface NotificationRecord {
  id: string
  userId: string
  actorId: string
  type: NotificationType
  workId: string | null
  isRead: boolean
  createdAt: string
  actor: {
    id: string
    nickname: string
    avatar: string | null
  }
  work: {
    id: string
    title: string
    coverImage: string | null
  } | null
}

export const notificationsApi = {
  async getList(params?: { page?: number; pageSize?: number; type?: 'ALL' | NotificationType }): Promise<{
    data: NotificationRecord[]
    total: number
    page: number
    pageSize: number
  }> {
    const { data } = await api.get('/notifications', { params })
    return data
  },

  async getUnreadCount(): Promise<{ data: { unreadCount: number } }> {
    const { data } = await api.get('/notifications/unread-count')
    return data
  },

  async getUnreadSummary(): Promise<{ data: NotificationRecord[] }> {
    const { data } = await api.get('/notifications/unread-summary')
    return data
  },

  async markRead(ids?: string[]): Promise<void> {
    await api.patch('/notifications/read', { ids })
  },

  async batchDelete(ids: string[]): Promise<{ message: string; deletedCount: number }> {
    const { data } = await api.delete('/notifications', { data: { ids } })
    return data
  },
}

