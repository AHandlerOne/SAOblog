import api from './index'

export interface LoginResponse {
  user: {
    id: string
    email: string
    nickname: string
    avatar: string | null
    role: string
    isBanned: boolean
    aiAccess: boolean
    createdAt: string
  }
  accessToken: string
}

export interface RegisterResponse {
  user: {
    id: string
    email: string
    nickname: string
    avatar: string | null
    role: string
    isBanned: boolean
    aiAccess: boolean
    createdAt: string
  }
}

export interface UserProfile {
  id: string
  email: string
  nickname: string
  avatar: string | null
  bio: string | null
  role: string
  isBanned: boolean
  aiAccess: boolean
  createdAt: string
}

export interface UpdateProfilePayload {
  nickname: string
  avatar?: string | null
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    return data
  },

  async register(email: string, password: string, nickname: string): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', { email, password, nickname })
    return data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async refresh(): Promise<{ accessToken: string }> {
    const { data } = await api.post<{ accessToken: string }>('/auth/refresh')
    return data
  },

  async getMe(): Promise<UserProfile> {
    const { data } = await api.get<{ user: UserProfile }>('/auth/me')
    return data.user
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<{ user: UserProfile }> {
    const { data } = await api.put<{ user: UserProfile }>('/users/me', payload)
    return data
  },
}
