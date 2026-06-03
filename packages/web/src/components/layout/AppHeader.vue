<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAvatar,
  NBadge,
  NButton,
  NDrawer,
  NDropdown,
  NIcon,
  NInput,
  NModal,
} from 'naive-ui'
import { CloseOutline, MenuOutline, NotificationsOutline, SearchOutline } from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { getFreshWorkCreateRoute } from '@/utils/work-create'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const searchQuery = ref('')
const isMobile = ref(false)
const mobileMenuVisible = ref(false)
const aiAccessModalVisible = ref(false)

const navLinks = [
  { name: '首页', path: '/home' },
  { name: '剧情介绍', path: '/story' },
  { name: '人物图鉴', path: '/characters' },
  { name: '壁纸画廊', path: '/gallery' },
  { name: '官方资讯', path: '/news' },
  { name: '创作社区', path: '/community/works' },
  { name: 'AI 助手', path: '/ai', requiresAiAccess: true },
]

const userDropdownOptions = [
  { label: '我的作品', key: 'my-works' },
  { label: '个人主页', key: 'profile' },
  { label: '发布作品', key: 'create' },
  { type: 'divider', key: 'divider' },
  { label: '退出登录', key: 'logout' },
]

const canAccessAdmin = computed(() => authStore.user?.role === 'ADMIN' || authStore.user?.role === 'MODERATOR')
const canUseAi = computed(() => (
  authStore.user?.aiAccess
  || authStore.user?.role === 'ADMIN'
  || authStore.user?.role === 'MODERATOR'
))

function isActive(path: string): boolean {
  if (path === '/home') {
    return route.path === '/' || route.path === '/home'
  }
  return route.path.startsWith(path)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/home')
}

function goToCreateWork() {
  router.push(getFreshWorkCreateRoute())
}

function handleUserDropdown(key: string) {
  switch (key) {
    case 'profile':
      if (authStore.user) {
        router.push(`/user/${authStore.user.id}`)
      }
      break
    case 'my-works':
      router.push('/creator?tab=published')
      break
    case 'create':
      goToCreateWork()
      break
    case 'logout':
      void handleLogout()
      break
  }
}

function handleSearch() {
  const keyword = searchQuery.value.trim()
  if (!keyword) return

  router.push({ name: 'Search', query: { q: keyword, type: 'all', page: 1 } })
  mobileMenuVisible.value = false
}

function showAiAccessHint() {
  aiAccessModalVisible.value = true
  mobileMenuVisible.value = false
}

async function refreshCurrentUser() {
  if (!authStore.isLoggedIn) return

  try {
    await authStore.fetchMe()
  } catch {
    // fetchMe clears invalid sessions; routing below will handle the logged-out state.
  }
}

async function goTo(path: string) {
  const link = navLinks.find((item) => item.path === path)

  if (link?.requiresAiAccess) {
    if (!authStore.isLoggedIn) {
      router.push({ name: 'Login', query: { redirect: '/ai' } })
      mobileMenuVisible.value = false
      return
    }

    await refreshCurrentUser()

    if (!authStore.isLoggedIn) {
      router.push({ name: 'Login', query: { redirect: '/ai' } })
      mobileMenuVisible.value = false
      return
    }

    if (!canUseAi.value) {
      showAiAccessHint()
      return
    }
  }

  router.push(path)
  mobileMenuVisible.value = false
}

function syncViewport() {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    mobileMenuVisible.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuVisible.value = false
  },
)

watch(
  () => authStore.isLoggedIn,
  async (loggedIn) => {
    if (!loggedIn) {
      notificationStore.unreadCount = 0
      return
    }
    await notificationStore.refreshUnreadCount()
  },
  { immediate: true },
)

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <div class="header-logo" @click="router.push('/home')">
        <span class="logo-text">SAO Blog</span>
      </div>

      <nav class="header-nav">
        <button
          v-for="link in navLinks"
          :key="link.path"
          type="button"
          class="nav-link"
          :class="{ active: isActive(link.path) }"
          @click="goTo(link.path)"
        >
          {{ link.name }}
        </button>
      </nav>

      <div class="header-right">
        <div class="header-search">
          <NInput
            v-model:value="searchQuery"
            placeholder="搜索剧情、角色、作品"
            size="small"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <NIcon :size="16" :component="SearchOutline" />
            </template>
          </NInput>
        </div>

        <div v-if="authStore.isLoggedIn && authStore.user" class="header-user">
          <NBadge :value="notificationStore.unreadCount" :max="99" :show-zero="false">
            <NButton text size="small" class="icon-btn" @click="router.push('/notifications')">
              <template #icon>
                <NIcon :component="NotificationsOutline" />
              </template>
            </NButton>
          </NBadge>

          <NDropdown :options="userDropdownOptions" @select="handleUserDropdown">
            <div class="user-entry">
              <NAvatar round size="small" :src="authStore.user.avatar || undefined">
                {{ authStore.user.nickname?.charAt(0)?.toUpperCase() }}
              </NAvatar>
              <span class="user-name">{{ authStore.user.nickname }}</span>
            </div>
          </NDropdown>

          <NButton
            v-if="canAccessAdmin"
            text
            size="small"
            class="text-btn"
            @click="router.push('/admin')"
          >
            管理后台
          </NButton>
        </div>

        <div v-else class="header-auth">
          <NButton text size="small" class="text-btn" @click="router.push('/login')">
            登录
          </NButton>
          <NButton size="small" type="primary" @click="router.push('/register')">
            注册
          </NButton>
        </div>
      </div>

      <NButton quaternary circle class="mobile-menu-trigger" @click="mobileMenuVisible = true">
        <template #icon>
          <NIcon :component="MenuOutline" />
        </template>
      </NButton>
    </div>
  </header>

  <NDrawer
    v-model:show="mobileMenuVisible"
    placement="right"
    width="84vw"
    :trap-focus="false"
  >
    <div class="mobile-drawer">
      <div class="mobile-drawer-top">
        <div class="mobile-drawer-title">导航菜单</div>
        <NButton quaternary circle @click="mobileMenuVisible = false">
          <template #icon>
            <NIcon :component="CloseOutline" />
          </template>
        </NButton>
      </div>

      <div class="mobile-search">
        <NInput
          v-model:value="searchQuery"
          placeholder="搜索内容"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <NIcon :size="16" :component="SearchOutline" />
          </template>
        </NInput>
      </div>

      <nav class="mobile-nav">
        <NButton
          v-for="link in navLinks"
          :key="`mobile-${link.path}`"
          block
          quaternary
          class="mobile-nav-link"
          :class="{ active: isActive(link.path) }"
          @click="goTo(link.path)"
        >
          {{ link.name }}
        </NButton>
      </nav>

      <div class="mobile-auth">
        <template v-if="authStore.isLoggedIn && authStore.user">
          <div class="mobile-user-card">
            <NAvatar round size="small" :src="authStore.user.avatar || undefined">
              {{ authStore.user.nickname?.charAt(0)?.toUpperCase() }}
            </NAvatar>
            <span class="user-name">{{ authStore.user.nickname }}</span>
          </div>
          <NButton block quaternary @click="goTo('/creator?tab=published')">我的作品</NButton>
          <NButton block quaternary @click="goTo('/notifications')">
            消息中心
            <NBadge style="margin-left: 8px;" :value="notificationStore.unreadCount" :show-zero="false" />
          </NButton>
          <NButton block quaternary @click="goTo(`/user/${authStore.user.id}`)">个人主页</NButton>
          <NButton block quaternary @click="goToCreateWork()">发布作品</NButton>
          <NButton v-if="canAccessAdmin" block quaternary @click="goTo('/admin')">管理后台</NButton>
          <NButton block type="error" ghost @click="handleLogout">退出登录</NButton>
        </template>

        <template v-else>
          <NButton block quaternary @click="goTo('/login')">登录</NButton>
          <NButton block type="primary" @click="goTo('/register')">注册</NButton>
        </template>
      </div>
    </div>
  </NDrawer>

  <NModal
    v-model:show="aiAccessModalVisible"
    preset="card"
    title="AI 助手暂未开通"
    :style="{ maxWidth: '520px' }"
  >
    <p class="ai-access-copy">
      为了避免 AI 资源被滥用，AI 助手目前只向管理员授权用户开放。继续保持创作、完善作品信息、积累高质量内容和互动后，管理员会为符合条件的创作者开通 AI 权限。
    </p>
    <template #footer>
      <div class="modal-footer">
        <NButton @click="aiAccessModalVisible = false">我知道了</NButton>
        <NButton type="primary" @click="goTo('/community/create')">去发布作品</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: var(--sao-header-height);
  background: rgba(22, 33, 62, 0.96);
  border-bottom: 1px solid var(--sao-border-color);
  backdrop-filter: blur(8px);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px;
}

.header-logo {
  cursor: pointer;
  flex-shrink: 0;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--sao-text-secondary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover,
  &.active {
    color: var(--sao-text-primary);
    background: rgba(255, 255, 255, 0.08);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.header-search {
  width: 240px;
}

.header-auth,
.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn,
.text-btn {
  color: var(--sao-text-secondary);

  &:hover {
    color: var(--sao-text-primary);
  }
}

.user-entry,
.mobile-user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--sao-text-primary);
  font-size: 14px;
}

.mobile-menu-trigger {
  display: none;
  margin-left: auto;
}

.mobile-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
}

.mobile-drawer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.mobile-nav,
.mobile-auth {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-auth {
  margin-top: auto;
}

.mobile-nav-link.active {
  color: var(--sao-text-primary);
  background: rgba(255, 255, 255, 0.08);
}

.ai-access-copy {
  color: var(--sao-text-secondary);
  line-height: 1.8;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 14px;
  }

  .header-nav,
  .header-right {
    display: none;
  }

  .mobile-menu-trigger {
    display: inline-flex;
  }
}
</style>
