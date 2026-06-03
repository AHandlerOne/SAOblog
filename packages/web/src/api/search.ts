import api from './index'

export type SearchType = 'all' | 'work' | 'character' | 'story'
export type SearchSort = 'relevance' | 'hot' | 'latest'

export interface SearchWorkResult {
  id: string
  title: string
  description: string | null
  type: string
  coverImage: string | null
  tags: string[]
  viewCount: number
  likeCount: number
  favoriteCount: number
  createdAt: string
  author: {
    id: string
    nickname: string
    avatar: string | null
  }
}

export interface SearchCharacterResult {
  id: number
  name: string
  nameJa: string
  nameEn: string
  avatar: string
  description: string
}

export interface SearchStoryResult {
  id: number
  title: string
  content: string
  chapterNumber: number
  isSpoiler: boolean
  createdAt: string
  arcId: number
  arcName: string
}

export interface SearchResponse {
  data: {
    works: SearchWorkResult[]
    characters: SearchCharacterResult[]
    chapters: SearchStoryResult[]
    total: number
  }
  keyword: string
  type: SearchType
  page: number
  pageSize: number
  sort?: SearchSort
  durationMs?: number
}

export const searchApi = {
  async search(params: { q: string; type?: SearchType; sort?: SearchSort; page?: number; pageSize?: number }) {
    const { data } = await api.get<SearchResponse>('/search', { params })
    return data
  },

  async suggest(q: string): Promise<{ data: string[] }> {
    const { data } = await api.get<{ data: string[] }>('/search/suggest', { params: { q } })
    return data
  },

  async hot(): Promise<{ data: string[] }> {
    const { data } = await api.get<{ data: string[] }>('/search/hot')
    return data
  },
}
