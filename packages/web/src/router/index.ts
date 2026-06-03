import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import AdminLayout from '@/pages/admin/AdminLayout.vue'
import { authApi } from '@/api/auth'
import { buildLoginRedirect, getStoredToken, isSessionExpired } from '@/utils/session'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        redirect: { name: 'Home' },
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/pages/home/HomePage.vue'),
      },
      {
        path: 'story',
        name: 'StoryList',
        component: () => import('@/pages/story/StoryListPage.vue'),
      },
      {
        path: 'story/:id',
        name: 'StoryDetail',
        component: () => import('@/pages/story/StoryDetailPage.vue'),
        props: true,
      },
      {
        path: 'characters',
        name: 'CharacterList',
        component: () => import('@/pages/characters/CharacterListPage.vue'),
      },
      {
        path: 'characters/:id',
        name: 'CharacterDetail',
        component: () => import('@/pages/characters/CharacterDetailPage.vue'),
        props: true,
      },
      {
        path: 'gallery',
        name: 'Gallery',
        component: () => import('@/pages/gallery/GalleryPage.vue'),
      },
      {
        path: 'news',
        name: 'NewsList',
        component: () => import('@/pages/news/NewsListPage.vue'),
      },
      {
        path: 'news/:id',
        name: 'NewsDetail',
        component: () => import('@/pages/news/NewsDetailPage.vue'),
        props: true,
      },
      {
        path: 'community/works',
        name: 'WorkList',
        component: () => import('@/pages/community/WorksListPage.vue'),
      },
      {
        path: 'community/create',
        name: 'WorkCreate',
        component: () => import('@/pages/community/CreateWorkPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'community/works/:id',
        name: 'WorkDetail',
        component: () => import('@/pages/community/WorkDetailPage.vue'),
        props: true,
      },
      {
        path: 'user/:id',
        name: 'UserProfile',
        component: () => import('@/pages/user/UserProfilePage.vue'),
        props: true,
      },
      {
        path: 'creator',
        name: 'CreatorCenter',
        component: () => import('@/pages/user/CreatorCenterPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/pages/user/NotificationsPage.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('@/pages/search/SearchPage.vue'),
      },
      {
        path: 'ai',
        name: 'AiAssistant',
        component: () => import('@/pages/ai/AiAssistantPage.vue'),
        meta: { requiresAuth: true, requiresAiAccess: true },
      },
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/pages/auth/LoginPage.vue'),
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/pages/auth/RegisterPage.vue'),
      },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiredRole: ['ADMIN', 'MODERATOR'] },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
      },
      {
        path: 'content',
        name: 'AdminContent',
        component: () => import('@/pages/admin/ContentManagePage.vue'),
      },
      {
        path: 'works',
        name: 'AdminWorks',
        component: () => import('@/pages/admin/WorksManagePage.vue'),
      },
      {
        path: 'works-review',
        name: 'AdminWorksReview',
        component: () => import('@/pages/admin/WorksReviewPage.vue'),
      },
      {
        path: 'reports',
        name: 'AdminReports',
        component: () => import('@/pages/admin/ReportsPage.vue'),
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/UsersPage.vue'),
      },
      {
        path: 'chapters',
        name: 'AdminChapters',
        component: () => import('@/pages/admin/ChapterManagePage.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

router.beforeEach(async (to, _from, next) => {
  const token = getStoredToken()

  if (token && isSessionExpired()) {
    localStorage.removeItem('sao_token')
    localStorage.removeItem('sao_user')
    localStorage.removeItem('sao_last_active_at')
    if (to.name !== 'Login') {
      window.location.href = buildLoginRedirect()
      return
    }
  }

  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAiAccess && token) {
    let storedUser = localStorage.getItem('sao_user')
    try {
      const user = await authApi.getMe()
      localStorage.setItem('sao_user', JSON.stringify(user))
      storedUser = JSON.stringify(user)
    } catch {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        const canUseAi = user.aiAccess || user.role === 'ADMIN' || user.role === 'MODERATOR'
        if (!canUseAi) {
          next({ name: 'Home' })
          return
        }
      } catch {
        next({ name: 'Login' })
        return
      }
    }
  }

  if (Array.isArray(to.meta.requiredRole) && token) {
    const storedUser = localStorage.getItem('sao_user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        const requiredRoles = to.meta.requiredRole as string[]
        if (!requiredRoles.includes(user.role)) {
          next({ name: 'Home' })
          return
        }
      } catch {
        next({ name: 'Login' })
        return
      }
    }
  }

  next()
})

export default router
