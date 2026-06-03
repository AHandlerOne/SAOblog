const TOKEN_KEY = 'sao_token'
const USER_KEY = 'sao_user'
const LAST_ACTIVE_KEY = 'sao_last_active_at'

export const SESSION_IDLE_LIMIT_MS = 60 * 60 * 1000
const ACTIVITY_TOUCH_INTERVAL_MS = 30 * 1000

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function hasStoredAuth(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY) && localStorage.getItem(USER_KEY))
}

export function getLastActivity(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVE_KEY)
  if (!raw) return null

  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function setLastActivity(timestamp = Date.now()): void {
  localStorage.setItem(LAST_ACTIVE_KEY, String(timestamp))
}

export function clearLastActivity(): void {
  localStorage.removeItem(LAST_ACTIVE_KEY)
}

export function isSessionExpired(now = Date.now()): boolean {
  const lastActivity = getLastActivity()
  if (!lastActivity) return false
  return now - lastActivity >= SESSION_IDLE_LIMIT_MS
}

export function touchSessionActivity(): void {
  if (!getStoredToken()) return

  const now = Date.now()
  const lastActivity = getLastActivity()
  if (lastActivity && now - lastActivity < ACTIVITY_TOUCH_INTERVAL_MS) {
    return
  }

  setLastActivity(now)
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  clearLastActivity()
}

export function buildLoginRedirect(reason = 'timeout'): string {
  const params = new URLSearchParams()
  if (reason) {
    params.set('reason', reason)
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (currentPath && !currentPath.startsWith('/login')) {
    params.set('redirect', currentPath)
  }

  return `/login?${params.toString()}`
}
