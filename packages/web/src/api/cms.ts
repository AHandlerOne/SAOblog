import api from './index'

// --- Arc types (matching backend Prisma model) ---

export interface Arc {
  id: number
  name: string
  nameJa: string
  nameEn: string
  season: string | null
  sortOrder: number
  synopsis: string | null
  coverImage: string | null
  createdAt: string
  _count: { chapters: number }
}

export interface ArcDetail extends Arc {
  chapters: ArcChapter[]
  characters: { character: { id: number; name: string; nameJa: string; nameEn: string; avatar: string } }[]
}

export interface ArcChapter {
  id: number
  arcId: number
  title: string
  content: string
  chapterNumber: number
  isSpoiler: boolean
  createdAt: string
}

export interface ArcChapterFormData {
  title: string
  content: string
  chapterNumber: number
  isSpoiler?: boolean
}

// --- Character types ---

export interface Character {
  id: number
  name: string
  nameJa: string
  nameEn: string
  cv: string | null
  avatar: string
  description: string
  weapon: string | null
  affiliation: string | null
  createdAt: string
  arcs: { role?: string | null; arc: { id: number; name: string; nameEn: string; season?: string | null; synopsis?: string | null } }[]
  wallpapers: { id: number; title: string; imageUrl: string; resolution: string | null }[]
  _count?: { wallpapers: number }
  relatedCharacters?: Array<{
    id: number
    name: string
    nameEn: string
    avatar: string
    arcs: Array<{ role?: string | null; arc: { id: number; name: string } }>
  }>
}

// --- Wallpaper types ---

export interface Wallpaper {
  id: number
  title: string
  imageUrl: string
  resolution: string | null
  sourceUrl: string | null
  tags: string[]
  createdAt: string
  character: { id: number; name: string; nameEn: string; avatar: string } | null
  arc: { id: number; name: string; nameEn: string } | null
}

// --- News types ---

export interface NewsItem {
  id: number
  title: string
  content: string
  category: string
  summary?: string | null
  coverImage: string | null
  source?: string | null
  tags?: string[]
  publishedAt: string | null
  createdAt: string
}

export interface ArcFormData {
  name: string
  nameJa: string
  nameEn: string
  season?: string
  sortOrder: number
  synopsis?: string
  coverImage?: string
}

export interface CharacterFormData {
  name: string
  nameJa: string
  nameEn: string
  avatar: string
  description: string
  cv?: string
  weapon?: string
  affiliation?: string
  arcIds?: number[]
}

export interface WallpaperFormData {
  title: string
  imageUrl: string
  characterId?: number
  arcId?: number
  resolution?: string
  sourceUrl?: string
  tags?: string[]
}

export interface NewsFormData {
  title: string
  content: string
  category: string
  coverImage?: string
  publishedAt?: string
  summary?: string
  source?: string
  tags?: string[]
}

// --- Shared pagination response (matching backend) ---

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export const cmsApi = {
  // --- Arcs ---
  async getArcs(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Arc>> {
    const { data } = await api.get<PaginatedResponse<Arc>>('/arcs', { params })
    return data
  },

  async getArc(id: number): Promise<{ data: ArcDetail }> {
    const { data } = await api.get<{ data: ArcDetail }>(`/arcs/${id}`)
    return data
  },

  async getArcChapters(arcId: number, params?: { page?: number; pageSize?: number; hideSpoilers?: boolean }): Promise<PaginatedResponse<ArcChapter>> {
    const { data } = await api.get<PaginatedResponse<ArcChapter>>(`/arcs/${arcId}/chapters`, { params })
    return data
  },

  // --- Characters ---
  async getCharacters(params?: { page?: number; pageSize?: number; arcId?: number; search?: string }): Promise<PaginatedResponse<Character>> {
    const { data } = await api.get<PaginatedResponse<Character>>('/characters', { params })
    return data
  },

  async getCharacter(id: number): Promise<{ data: Character }> {
    const { data } = await api.get<{ data: Character }>(`/characters/${id}`)
    return data
  },

  // --- Wallpapers ---
  async getWallpapers(params?: {
    page?: number
    pageSize?: number
    characterId?: number
    arcId?: number
    tag?: string
    search?: string
    resolution?: string
  }): Promise<PaginatedResponse<Wallpaper>> {
    const { data } = await api.get<PaginatedResponse<Wallpaper>>('/wallpapers', { params })
    return data
  },

  // --- News ---
  async getNews(params?: { page?: number; pageSize?: number; category?: string }): Promise<PaginatedResponse<NewsItem>> {
    const { data } = await api.get<PaginatedResponse<NewsItem>>('/news', { params })
    return data
  },

  async getNewsItem(id: number): Promise<{ data: NewsItem }> {
    const { data } = await api.get<{ data: NewsItem }>(`/news/${id}`)
    return data
  },

  // --- Management (Admin) ---
  async createArc(arcData: ArcFormData): Promise<{ data: Arc }> {
    const { data } = await api.post<{ data: Arc }>('/admin/arcs', arcData)
    return data
  },

  async updateArc(id: number, arcData: Partial<ArcFormData>): Promise<{ data: Arc }> {
    const { data } = await api.put<{ data: Arc }>(`/admin/arcs/${id}`, arcData)
    return data
  },

  async deleteArc(id: number): Promise<void> {
    await api.delete(`/admin/arcs/${id}`)
  },

  async createArcChapter(arcId: number, chapterData: ArcChapterFormData): Promise<{ data: ArcChapter }> {
    const { data } = await api.post<{ data: ArcChapter }>(`/admin/arcs/${arcId}/chapters`, chapterData)
    return data
  },

  async updateArcChapter(arcId: number, chapterId: number, chapterData: Partial<ArcChapterFormData>): Promise<{ data: ArcChapter }> {
    const { data } = await api.put<{ data: ArcChapter }>(`/admin/arcs/${arcId}/chapters/${chapterId}`, chapterData)
    return data
  },

  async deleteArcChapter(arcId: number, chapterId: number): Promise<void> {
    await api.delete(`/admin/arcs/${arcId}/chapters/${chapterId}`)
  },

  async createCharacter(charData: CharacterFormData): Promise<{ data: Character }> {
    const { data } = await api.post<{ data: Character }>('/admin/characters', charData)
    return data
  },

  async updateCharacter(id: number, charData: Partial<CharacterFormData>): Promise<{ data: Character }> {
    const { data } = await api.put<{ data: Character }>(`/admin/characters/${id}`, charData)
    return data
  },

  async deleteCharacter(id: number): Promise<void> {
    await api.delete(`/admin/characters/${id}`)
  },

  async createWallpaper(wpData: WallpaperFormData): Promise<{ data: Wallpaper }> {
    const { data } = await api.post<{ data: Wallpaper }>('/admin/wallpapers', wpData)
    return data
  },

  async updateWallpaper(id: number, wpData: Partial<WallpaperFormData>): Promise<{ data: Wallpaper }> {
    const { data } = await api.put<{ data: Wallpaper }>(`/admin/wallpapers/${id}`, wpData)
    return data
  },

  async deleteWallpaper(id: number): Promise<void> {
    await api.delete(`/admin/wallpapers/${id}`)
  },

  async createNews(newsData: NewsFormData): Promise<{ data: NewsItem }> {
    const { data } = await api.post<{ data: NewsItem }>('/admin/news', newsData)
    return data
  },

  async updateNews(id: number, newsData: Partial<NewsFormData>): Promise<{ data: NewsItem }> {
    const { data } = await api.put<{ data: NewsItem }>(`/admin/news/${id}`, newsData)
    return data
  },

  async deleteNews(id: number): Promise<void> {
    await api.delete(`/admin/news/${id}`)
  },
}
