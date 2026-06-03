import api from './index'

// --- Work types (matching backend) ---

export type WorkType = 'ILLUSTRATION' | 'NOVEL' | 'OTHER'

export interface Work {
  id: string
  title: string
  description: string | null
  content: string | null
  type: WorkType | string
  coverImage: string | null
  tags: string[]
  status: string
  rejectReason?: string | null
  visibility: string
  viewCount: number
  likeCount: number
  favoriteCount: number
  editCount: number
  isLiked: boolean
  isFavorited: boolean
  createdAt: string
  updatedAt: string
  author: {
    id: string
    nickname: string
    avatar: string | null
    bio?: string | null
  }
  images?: WorkImage[]
  _count?: { comments: number }
}

export interface HotTagItem {
  name: string
  count: number
}

export interface WorkImage {
  id: number
  workId: string
  imageUrl: string
  sortOrder: number
}

export interface CreateWorkData {
  type: WorkType
  title: string
  description?: string
  summary?: string
  content?: string
  tags?: string[]
  coverImage?: string
  images?: string[]
  draftSizeBytes?: number
}

export interface CreateCommentData {
  content: string
  parentId?: string
}

export interface Comment {
  id: string
  workId: string
  authorId: string
  content: string
  parentId: string | null
  likeCount?: number
  dislikeCount?: number
  liked?: boolean
  disliked?: boolean
  deletedAt: string | null
  createdAt: string
  replies?: Comment[]
  author: {
    id: string
    nickname: string
    avatar: string | null
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface CreateReportData {
  targetType: 'WORK' | 'COMMENT' | 'USER'
  targetId: string
  reason: string
  description?: string
}

export interface UploadStatusRecord {
  id: number
  status: 'UPLOADED' | 'READY' | 'FAILED' | string
  url: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  createdAt: string
  updatedAt: string
}

export interface UploadSessionStatus {
  uploadId: string
  uploadedChunks: number[]
  totalChunks: number
  chunkSize: number
  progress: number
}

export interface CreatorDashboard {
  draftCount: number
  pendingCount: number
  rejectedCount: number
  publishedCount: number
  totalViews: number
  totalLikes: number
  totalFavorites: number
  totalComments: number
}

export interface UserInteractionTrend {
  id: string
  period: 'WEEK' | 'MONTH'
  periodStart: string
  followerDelta: number
  receivedLikeDelta: number
  receivedFavoriteDelta: number
}

export const worksApi = {
  async getWorks(params?: { page?: number; pageSize?: number; sort?: string; type?: string; tag?: string; q?: string; curated?: boolean }): Promise<PaginatedResponse<Work>> {
    const { data } = await api.get<PaginatedResponse<Work>>('/works', { params })
    return data
  },

  async getHotTags(): Promise<{ data: HotTagItem[] }> {
    const { data } = await api.get<{ data: HotTagItem[] }>('/works/tags/hot')
    return data
  },

  async getWork(id: string): Promise<{ data: Work }> {
    const { data } = await api.get<{ data: Work }>(`/works/${id}`)
    return data
  },

  async getRelatedWorks(id: string, limit = 4): Promise<{ data: Work[] }> {
    const { data } = await api.get<{ data: Work[] }>(`/works/${id}/related`, { params: { limit } })
    return data
  },

  async createWork(workData: CreateWorkData): Promise<{ data: Work }> {
    const { data } = await api.post<{ data: Work }>('/works', workData)
    return data
  },

  async updateWork(id: string, workData: Partial<CreateWorkData>): Promise<{ data: Work }> {
    const { data } = await api.put<{ data: Work }>(`/works/${id}`, workData)
    return data
  },

  async deleteWork(id: string): Promise<void> {
    await api.delete(`/works/${id}`)
  },

  async batchDeleteWorks(ids: string[]): Promise<{ message: string; deletedCount: number }> {
    const { data } = await api.post<{ message: string; deletedCount: number }>('/creator/works/batch-delete', { ids })
    return data
  },

  async like(id: string): Promise<{ liked: boolean }> {
    const { data } = await api.post<{ liked: boolean }>(`/works/${id}/like`)
    return data
  },

  async favorite(id: string): Promise<{ favorited: boolean }> {
    const { data } = await api.post<{ favorited: boolean }>(`/works/${id}/favorite`)
    return data
  },

  async getComments(workId: string, params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Comment>> {
    const { data } = await api.get<PaginatedResponse<Comment>>(`/works/${workId}/comments`, { params })
    return data
  },

  async getCommentsWithSort(workId: string, params?: { page?: number; pageSize?: number; sort?: 'new' | 'hot' }): Promise<PaginatedResponse<Comment> & { sort?: string }> {
    const { data } = await api.get<PaginatedResponse<Comment>>(`/works/${workId}/comments`, { params })
    return data
  },

  async createComment(workId: string, commentData: CreateCommentData): Promise<{ data: Comment }> {
    const { data } = await api.post<{ data: Comment }>(`/works/${workId}/comments`, commentData)
    return data
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`)
  },

  async reactComment(commentId: string, type: 'LIKE' | 'DISLIKE'): Promise<{ liked: boolean; disliked: boolean; likeCount: number; dislikeCount: number }> {
    const { data } = await api.post<{ liked: boolean; disliked: boolean; likeCount: number; dislikeCount: number }>(`/comments/${commentId}/reaction`, { type })
    return data
  },

  async createReport(reportData: CreateReportData): Promise<{ data: { id: number } }> {
    const { data } = await api.post<{ data: { id: number } }>('/reports', reportData)
    return data
  },

  async getUserWorks(userId: string, params?: { page?: number; pageSize?: number; includePending?: boolean; status?: 'PUBLISHED' | 'PENDING' }): Promise<PaginatedResponse<Work>> {
    const { data } = await api.get<PaginatedResponse<Work>>(`/users/${userId}/works`, { params })
    return data
  },

  async revokeWork(id: string): Promise<{ data: Work; message: string }> {
    const { data } = await api.post<{ data: Work; message: string }>(`/works/${id}/revoke`)
    return data
  },

  async getUserProfile(userId: string): Promise<{ data: { id: string; nickname: string; avatar: string | null; bio: string | null; role: string; createdAt: string; worksCount: number; followerCount: number; totalReceivedLikes: number; totalReceivedFavorites: number; isFollowing: boolean } }> {
    const { data } = await api.get(`/users/${userId}`)
    return data
  },

  async toggleFollow(userId: string): Promise<{ following: boolean }> {
    const { data } = await api.post<{ following: boolean }>(`/users/${userId}/follow`)
    return data
  },

  async getUserInteractionTrends(userId: string, params?: { period?: 'WEEK' | 'MONTH'; limit?: number }): Promise<{ data: UserInteractionTrend[] }> {
    const { data } = await api.get<{ data: UserInteractionTrend[] }>(`/users/${userId}/interaction-trends`, { params })
    return data
  },

  async getCreatorWorks(params?: { page?: number; pageSize?: number; status?: 'DRAFT' | 'PENDING' | 'REJECTED' | 'PUBLISHED' }): Promise<PaginatedResponse<Work>> {
    const { data } = await api.get<PaginatedResponse<Work>>('/creator/works', { params })
    return data
  },

  async getCreatorDashboard(): Promise<{ data: CreatorDashboard }> {
    const { data } = await api.get<{ data: CreatorDashboard }>('/creator/dashboard')
    return data
  },

  async submitDraft(id: string): Promise<{ data: Work; message: string }> {
    const { data } = await api.post<{ data: Work; message: string }>(`/creator/works/${id}/submit`)
    return data
  },

  async saveDraft(payload: CreateWorkData & { id?: string; draftSizeBytes: number }): Promise<{ data: Work }> {
    const { data } = await api.post<{ data: Work }>('/creator/drafts/save', payload)
    return data
  },

  async resubmitWork(id: string): Promise<{ data: Work; message: string }> {
    const { data } = await api.post<{ data: Work; message: string }>(`/creator/works/${id}/resubmit`)
    return data
  },

  async initChunkUpload(file: File): Promise<{ uploadId: string; chunkSize: number; uploadedChunks: number[] }> {
    const { data } = await api.post('/upload/init', {
      filename: file.name,
      mimeType: file.type,
      totalSize: file.size,
      totalChunks: Math.ceil(file.size / (2 * 1024 * 1024)),
    })
    return data
  },

  async getUploadSession(uploadId: string): Promise<UploadSessionStatus> {
    const { data } = await api.get<UploadSessionStatus>(`/upload/session/${uploadId}`)
    return data
  },

  async uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob): Promise<void> {
    await api.put(`/upload/session/${uploadId}/chunk/${chunkIndex}`, chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  },

  async completeChunkUpload(uploadId: string): Promise<{ fileId: number; status: string; url?: string }> {
    const { data } = await api.post<{ fileId: number; status: string; url?: string }>(`/upload/session/${uploadId}/complete`)
    return data
  },

  async uploadImage(
    file: File,
    options?: {
      onProgress?: (progress: number) => void
      retries?: number
      uploadId?: string
    },
  ): Promise<{ fileId: number; status: string; uploadId: string; url?: string }> {
    const retries = options?.retries ?? 3
    const init = options?.uploadId
      ? { uploadId: options.uploadId, chunkSize: 2 * 1024 * 1024, uploadedChunks: [] as number[] }
      : await worksApi.initChunkUpload(file)
    const chunkSize = init.chunkSize
    const totalChunks = Math.ceil(file.size / chunkSize)

    let uploadedChunkSet = new Set<number>(init.uploadedChunks)
    if (uploadedChunkSet.size === 0 && options?.uploadId) {
      const remote = await worksApi.getUploadSession(options.uploadId)
      uploadedChunkSet = new Set(remote.uploadedChunks)
    }

    const updateProgress = () => {
      if (options?.onProgress) {
        options.onProgress(uploadedChunkSet.size / totalChunks)
      }
    }

    updateProgress()

    for (let i = 0; i < totalChunks; i += 1) {
      if (uploadedChunkSet.has(i)) {
        continue
      }
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      let lastErr: unknown
      for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
          await worksApi.uploadChunk(init.uploadId, i, chunk)
          uploadedChunkSet.add(i)
          updateProgress()
          lastErr = undefined
          break
        } catch (error) {
          lastErr = error
          if (attempt < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * (attempt + 1), 4000)))
          }
        }
      }

      if (lastErr) {
        throw Object.assign(new Error('Chunk upload failed'), { uploadId: init.uploadId, cause: lastErr })
      }
    }

    const completed = await worksApi.completeChunkUpload(init.uploadId)
    options?.onProgress?.(1)
    return { ...completed, uploadId: init.uploadId }
  },

  async getUploadStatus(fileId: number): Promise<{ data: UploadStatusRecord }> {
    const { data } = await api.get<{ data: UploadStatusRecord }>(`/upload/${fileId}`)
    return data
  },
}
