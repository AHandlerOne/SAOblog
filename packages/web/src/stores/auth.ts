import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { UserProfile } from '@/api/auth'
import {
  buildLoginRedirect,
  clearStoredAuth,
  getStoredToken,
  hasStoredAuth,
  isSessionExpired,
  setLastActivity,
} from '@/utils/session'

const AI_CONVERSATION_KEY_PREFIX = 'sao_ai_asuna_messages'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const token = ref<string | null>(getStoredToken())

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'MODERATOR')

  function clearStoredAiConversations() {
    Object.keys(localStorage)
      .filter((key) => key === AI_CONVERSATION_KEY_PREFIX || key.startsWith(`${AI_CONVERSATION_KEY_PREFIX}:`))
      .forEach((key) => localStorage.removeItem(key))
  }

  function setAuth(userData: UserProfile, accessToken: string) {
    if (user.value?.id && user.value.id !== userData.id) {
      clearStoredAiConversations()
    }
    user.value = userData
    token.value = accessToken
    localStorage.setItem('sao_token', accessToken)
    localStorage.setItem('sao_user', JSON.stringify(userData))
    setLastActivity()
  }

  function clearAuth() {
    clearStoredAiConversations()
    user.value = null
    token.value = null
    clearStoredAuth()
  }

  function expireSession() {
    clearAuth()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = buildLoginRedirect()
    }
  }

  function updateUserProfile(userData: UserProfile) {
    user.value = userData
    localStorage.setItem('sao_user', JSON.stringify(userData))
  }

  function restoreFromStorage() {
    const storedUser = localStorage.getItem('sao_user')
    const storedToken = getStoredToken()
    if (storedToken && storedUser) {
      if (isSessionExpired()) {
        clearAuth()
        return
      }

      token.value = storedToken
      try {
        user.value = JSON.parse(storedUser) as UserProfile
      } catch {
        clearAuth()
      }
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const { user: userData, accessToken } = await authApi.login(email, password)
    const fullProfile: UserProfile = {
      ...userData,
      bio: (userData as any).bio || null,
    }
    setAuth(fullProfile, accessToken)
  }

  async function register(email: string, password: string, nickname: string): Promise<void> {
    await authApi.register(email, password, nickname)
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout errors and always clear the local session.
    } finally {
      clearAuth()
    }
  }

  async function fetchMe(): Promise<void> {
    try {
      const userData = await authApi.getMe()
      updateUserProfile(userData)
    } catch {
      clearAuth()
    }
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const { accessToken } = await authApi.refresh()
      token.value = accessToken
      localStorage.setItem('sao_token', accessToken)
      setLastActivity()
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  restoreFromStorage()

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    login,
    register,
    logout,
    fetchMe,
    refreshToken,
    clearAuth,
    expireSession,
    updateUserProfile,
    hasStoredAuth,
  }
})
