import api from './index'
import type { Work } from './works'

// --- Admin types (matching backend) ---

export interface AdminReport {
  id: number
  reporterId: string
  targetType: string
  targetId: string
  targetTitle: string
  reason: string
  description: string | null
  status: string
  handledById: string | null
  createdAt: string
  resolvedAt: string | null
  reporter: { id: string; nickname: string; avatar: string | null }
  handledBy: { id: string; nickname: string; avatar: string | null } | null
}

export interface AdminStats {
  totalUsers: number
  totalWorks: number
  totalComments: number
  totalReports: number
  pendingWorks: number
  pendingReviews: number
  pendingReports: number
  recentUsers: { id: string; nickname: string; avatar: string | null; createdAt: string }[]
  recentReports: AdminReport[]
}

export interface AdminUser {
  id: string
  email: string
  nickname: string
  avatar: string | null
  bio: string | null
  role: string
  isBanned: boolean
  aiAccess: boolean
  status: 'ACTIVE' | 'BANNED'
  worksCount: number
  createdAt: string
  updatedAt: string
  _count: { works: number; comments: number; reports: number }
}

interface RawAdminStats extends Omit<AdminStats, 'pendingReviews'> {
  pendingReviews?: number
}

interface RawAdminUser {
  id: string
  email: string
  nickname: string
  avatar: string | null
  bio: string | null
  role: string
  isBanned: boolean
  aiAccess: boolean
  createdAt: string
  updatedAt: string
  _count: { works: number; comments: number; reports: number }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

function normalizeReport(report: AdminReport): AdminReport {
  return {
    ...report,
    targetTitle: report.targetTitle || `${report.targetType} #${report.targetId.slice(0, 8)}`,
  }
}

function normalizeUser(user: RawAdminUser): AdminUser {
  return {
    ...user,
    status: user.isBanned ? 'BANNED' : 'ACTIVE',
    worksCount: user._count.works,
  }
}

export const adminApi = {
  // --- Stats ---
  async getStats(): Promise<{ data: AdminStats }> {
    const { data } = await api.get<{ data: RawAdminStats }>('/admin/stats')
    return {
      data: {
        ...data.data,
        pendingReviews: data.data.pendingReviews ?? data.data.pendingWorks,
        recentReports: data.data.recentReports.map(normalizeReport),
      },
    }
  },

  // --- Reports ---
  async getReports(params?: { page?: number; pageSize?: number; status?: string }): Promise<PaginatedResponse<AdminReport>> {
    const { data } = await api.get<PaginatedResponse<AdminReport>>('/admin/reports', { params })
    return {
      ...data,
      data: data.data.map(normalizeReport),
    }
  },

  async handleReport(id: number, status: 'RESOLVED' | 'DISMISSED'): Promise<{ data: AdminReport }> {
    const { data } = await api.put<{ data: AdminReport }>(`/admin/reports/${id}`, { status })
    return data
  },

  // --- Work moderation ---
  async approveWork(id: string): Promise<{ data: Work }> {
    const { data } = await api.post<{ data: Work }>(`/admin/works/${id}/approve`)
    return data
  },

  async rejectWork(id: string, reason: string): Promise<{ data: Work }> {
    const { data } = await api.post<{ data: Work }>(`/admin/works/${id}/reject`, { reason })
    return data
  },

  async changeWorkStatus(
    id: string,
    status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED',
    reason?: string,
  ): Promise<{ data: Work }> {
    const { data } = await api.put<{ data: Work }>(`/admin/works/${id}/status`, { status, reason })
    return data
  },

  async getWorks(params?: {
    page?: number
    pageSize?: number
    status?: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED'
    search?: string
  }): Promise<PaginatedResponse<Work>> {
    const { data } = await api.get<PaginatedResponse<Work>>('/admin/works', { params })
    return data
  },

  async getPendingWorks(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Work>> {
    const { data } = await api.get<PaginatedResponse<Work>>('/admin/works/pending', { params })
    return data
  },

  // --- Users ---
  async getUsers(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResponse<AdminUser>> {
    const { data } = await api.get<PaginatedResponse<RawAdminUser>>('/admin/users', { params })
    return {
      ...data,
      data: data.data.map(normalizeUser),
    }
  },

  async banUser(id: string, reason: string): Promise<void> {
    await api.put(`/admin/users/${id}/ban`, { reason })
  },

  async unbanUser(id: string): Promise<void> {
    await api.put(`/admin/users/${id}/unban`)
  },

  async changeUserRole(id: string, role: string): Promise<{ data: { id: string; nickname: string; role: string } }> {
    const { data } = await api.put<{ data: { id: string; nickname: string; role: string } }>(`/admin/users/${id}/role`, { role })
    return data
  },

  async updateUserAiAccess(id: string, aiAccess: boolean): Promise<{ data: { id: string; nickname: string; aiAccess: boolean } }> {
    const { data } = await api.put<{ data: { id: string; nickname: string; aiAccess: boolean } }>(`/admin/users/${id}/ai-access`, { aiAccess })
    return data
  },

  async resetUserProfile(id: string): Promise<{ data: { id: string; nickname: string; avatar: string | null } }> {
    const { data } = await api.put<{ data: { id: string; nickname: string; avatar: string | null } }>(`/admin/users/${id}/reset-profile`)
    return data
  },

  // --- Content management (CMS admin) ---
  async createArc(arcData: { name: string; nameJa: string; nameEn: string; season?: string; sortOrder: number; synopsis?: string; coverImage?: string }): Promise<{ data: unknown }> {
    const { data } = await api.post('/admin/arcs', arcData)
    return data
  },

  async updateArc(id: number, arcData: Partial<{ name: string; nameJa: string; nameEn: string; season?: string; sortOrder: number; synopsis?: string; coverImage?: string }>): Promise<{ data: unknown }> {
    const { data } = await api.put(`/admin/arcs/${id}`, arcData)
    return data
  },

  async deleteArc(id: number): Promise<void> {
    await api.delete(`/admin/arcs/${id}`)
  },

  async createCharacter(charData: { name: string; nameJa: string; nameEn: string; avatar: string; description: string; cv?: string; weapon?: string; affiliation?: string; arcIds?: number[] }): Promise<{ data: unknown }> {
    const { data } = await api.post('/admin/characters', charData)
    return data
  },

  async updateCharacter(id: number, charData: Partial<{ name: string; nameJa: string; nameEn: string; avatar: string; description: string; cv?: string; weapon?: string; affiliation?: string }>): Promise<{ data: unknown }> {
    const { data } = await api.put(`/admin/characters/${id}`, charData)
    return data
  },

  async deleteCharacter(id: number): Promise<void> {
    await api.delete(`/admin/characters/${id}`)
  },

  async createWallpaper(wpData: { title: string; imageUrl: string; characterId?: number; arcId?: number; resolution?: string; sourceUrl?: string; tags?: string[] }): Promise<{ data: unknown }> {
    const { data } = await api.post('/admin/wallpapers', wpData)
    return data
  },

  async updateWallpaper(id: number, wpData: Partial<{ title: string; imageUrl: string; characterId?: number; arcId?: number; resolution?: string; sourceUrl?: string; tags?: string[] }>): Promise<{ data: unknown }> {
    const { data } = await api.put(`/admin/wallpapers/${id}`, wpData)
    return data
  },

  async deleteWallpaper(id: number): Promise<void> {
    await api.delete(`/admin/wallpapers/${id}`)
  },

  async createNews(newsData: { title: string; content: string; category: string; coverImage?: string; publishedAt?: string }): Promise<{ data: unknown }> {
    const { data } = await api.post('/admin/news', newsData)
    return data
  },

  async updateNews(id: number, newsData: Partial<{ title: string; content: string; category: string; coverImage?: string; publishedAt?: string }>): Promise<{ data: unknown }> {
    const { data } = await api.put(`/admin/news/${id}`, newsData)
    return data
  },

  async deleteNews(id: number): Promise<void> {
    await api.delete(`/admin/news/${id}`)
  },
}
