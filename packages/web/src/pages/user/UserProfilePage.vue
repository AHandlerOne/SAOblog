<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { worksApi } from '@/api/works'
import { authApi } from '@/api/auth'
import type { UserProfile as AuthUserProfile } from '@/api/auth'
import type { Work } from '@/api/works'
import { useAuthStore } from '@/stores/auth'
import { useMessage, type FormInst, type FormRules, type UploadFileInfo } from 'naive-ui'
import {
  NAvatar,
  NButton,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NImage,
  NInput,
  NModal,
  NPagination,
  NProgress,
  NSpin,
  NTag,
  NSpace,
  NUpload,
} from 'naive-ui'
import { ArrowBackOutline, ChatbubbleOutline, CloudUploadOutline, CreateOutline, HeartOutline, StarOutline } from '@vicons/ionicons5'

const props = defineProps<{ id: string }>()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const message = useMessage()
const isOwner = computed(() => authStore.user?.id === props.id)

const userProfile = ref<{
  id: string
  nickname: string
  avatar: string
  bio: string
  createdAt: string
  worksCount: number
  followerCount: number
  totalReceivedLikes: number
  totalReceivedFavorites: number
  isFollowing: boolean
} | null>(null)
const works = ref<Work[]>([])
const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 12
const workViewMode = ref<'published' | 'pending'>('published')
const followLoading = ref(false)
let profilePollingTimer: ReturnType<typeof setInterval> | null = null

const editProfileVisible = ref(false)
const editSaving = ref(false)
const editFormRef = ref<FormInst | null>(null)
const avatarFiles = ref<UploadFileInfo[]>([])
const avatarPreviewUrl = ref('')
const avatarUploadProgress = ref(0)
const avatarUploadError = ref('')
const editForm = reactive({
  nickname: '',
})

const editRules: FormRules = {
  nickname: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度需为 2-20 个字符', trigger: 'blur' },
  ],
}

const typeLabels: Record<string, string> = {
  illustration: '插画',
  novel: '小说',
  other: '其他',
}

function applyModeFromQuery() {
  if (route.query.tab === 'pending') {
    workViewMode.value = 'pending'
    return
  }
  workViewMode.value = 'published'
}

function getAvatarUrl(): string {
  return avatarPreviewUrl.value || userProfile.value?.avatar || ''
}

function resetAvatarPreview(url = '') {
  if (avatarPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarPreviewUrl.value)
  }
  avatarPreviewUrl.value = url
}

function openEditProfile() {
  if (!userProfile.value) return
  editForm.nickname = userProfile.value.nickname
  avatarFiles.value = userProfile.value.avatar
    ? [{
        id: 'current-avatar',
        name: 'avatar',
        status: 'finished',
        url: userProfile.value.avatar,
      }]
    : []
  resetAvatarPreview(userProfile.value.avatar)
  avatarUploadProgress.value = 0
  avatarUploadError.value = ''
  editProfileVisible.value = true
}

function handleAvatarChange(fileList: UploadFileInfo[]) {
  avatarFiles.value = fileList.slice(-1)
  const selected = avatarFiles.value[0]
  if (selected?.file instanceof File) {
    resetAvatarPreview(URL.createObjectURL(selected.file))
  } else {
    resetAvatarPreview(selected?.url || '')
  }
  avatarUploadError.value = ''
}

function handleAvatarRemove({ file }: { file: UploadFileInfo }) {
  avatarFiles.value = avatarFiles.value.filter((item) => item.id !== file.id)
  resetAvatarPreview('')
  avatarUploadProgress.value = 0
}

function getAvatarFile(): File | null {
  const file = avatarFiles.value[0]
  return file?.file instanceof File ? file.file : null
}

async function waitForUploadReady(fileId: number): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const res = await worksApi.getUploadStatus(fileId)
    if (res.data.status === 'READY' && res.data.url) {
      return res.data.url
    }
    if (res.data.status === 'FAILED') {
      throw new Error('图片处理失败')
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('图片处理超时')
}

async function uploadAvatarIfNeeded(): Promise<string | null> {
  const file = getAvatarFile()
  if (!file) {
    const existing = avatarFiles.value[0]?.url
    return existing || null
  }

  const upload = await worksApi.uploadImage(file, {
    retries: 3,
    onProgress: (progress) => {
      avatarUploadProgress.value = progress
    },
  })

  return waitForUploadReady(upload.fileId)
}

async function saveProfile() {
  try {
    await editFormRef.value?.validate()
  } catch {
    return
  }

  editSaving.value = true
  avatarUploadError.value = ''
  try {
    const avatar = await uploadAvatarIfNeeded()
    const res = await authApi.updateProfile({
      nickname: editForm.nickname.trim(),
      avatar,
    })

    const nextUser: AuthUserProfile = res.user
    authStore.updateUserProfile(nextUser)
    if (userProfile.value) {
      userProfile.value.nickname = nextUser.nickname
      userProfile.value.avatar = nextUser.avatar || ''
    }
    editProfileVisible.value = false
    message.success('个人信息已更新')
  } catch (error: any) {
    avatarUploadError.value = error?.message || '保存失败，请稍后重试'
    message.error(error?.response?.data?.message || error?.message || '保存失败，请稍后重试')
  } finally {
    editSaving.value = false
    avatarUploadProgress.value = 0
  }
}

onMounted(async () => {
  applyModeFromQuery()
  if (localStorage.getItem('sao_token') && !authStore.user) {
    await authStore.fetchMe()
  }
  await Promise.all([fetchProfile(), fetchWorks()])
  profilePollingTimer = setInterval(() => {
    void fetchProfile()
  }, 1000 * 60 * 5)
})

onBeforeUnmount(() => {
  if (profilePollingTimer) {
    clearInterval(profilePollingTimer)
    profilePollingTimer = null
  }
  resetAvatarPreview('')
})

watch(() => route.query.tab, () => {
  applyModeFromQuery()
  currentPage.value = 1
  fetchWorks()
})

async function fetchProfile() {
  try {
    const res = await worksApi.getUserProfile(props.id)
    userProfile.value = {
      ...res.data,
      avatar: res.data.avatar || '',
      bio: res.data.bio || '',
    }
  } catch (error) {
    console.error('Failed to load user profile:', error)
  }
}

async function toggleFollow() {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  if (!userProfile.value || isOwner.value) return

  followLoading.value = true
  try {
    const res = await worksApi.toggleFollow(props.id)
    userProfile.value.isFollowing = res.following
    userProfile.value.followerCount += res.following ? 1 : -1
    if (userProfile.value.followerCount < 0) userProfile.value.followerCount = 0
  } catch {
    message.error('操作失败，请稍后重试')
  } finally {
    followLoading.value = false
  }
}

async function fetchWorks() {
  loading.value = true
  try {
    const res = await worksApi.getUserWorks(props.id, {
      page: currentPage.value,
      pageSize,
      includePending: isOwner.value,
      status: isOwner.value && workViewMode.value === 'pending' ? 'PENDING' : 'PUBLISHED',
    })
    works.value = res.data
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize))
  } catch (error) {
    console.error('Failed to load works:', error)
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchWorks()
}

function switchMode(mode: 'published' | 'pending') {
  if (workViewMode.value === mode) return
  router.replace({
    path: route.path,
    query: mode === 'pending' ? { ...route.query, tab: 'pending' } : {},
  })
  currentPage.value = 1
}

function goToWorkDetail(workId: string) {
  router.push(`/community/works/${workId}`)
}

async function revokeWork(workId: string) {
  try {
    await worksApi.revokeWork(workId)
    message.success('已撤销提交，作品已回到草稿箱')
    await fetchWorks()
  } catch (error) {
    console.error('Failed to revoke work:', error)
    message.error('撤销失败，请稍后重试')
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<template>
  <div class="user-profile-page">
    <div class="page-top">
      <NButton text class="back-btn" @click="router.back()">
        <template #icon>
          <NIcon :component="ArrowBackOutline" />
        </template>
        返回
      </NButton>
    </div>

    <NSpin v-if="loading && !userProfile" class="page-loading" />

    <template v-else-if="userProfile">
      <div class="profile-card sao-card">
        <div class="profile-content">
          <div class="profile-avatar-section">
            <NAvatar
              v-if="userProfile.avatar"
              :src="userProfile.avatar"
              round
              :size="96"
              class="profile-avatar"
            />
            <div v-else class="profile-avatar-placeholder">
              {{ userProfile.nickname.charAt(0) }}
            </div>
          </div>
          <div class="profile-info-section">
            <h1 class="profile-name">{{ userProfile.nickname }}</h1>
            <p v-if="userProfile.bio" class="profile-bio text-secondary">{{ userProfile.bio }}</p>
            <div class="profile-core-stats">
              <div class="core-item">
                <span class="core-label text-secondary">粉丝</span>
                <strong>{{ userProfile.followerCount }}</strong>
              </div>
              <div class="core-item">
                <span class="core-label text-secondary">获赞</span>
                <strong>{{ userProfile.totalReceivedLikes }}</strong>
              </div>
              <div class="core-item">
                <span class="core-label text-secondary">收藏</span>
                <strong>{{ userProfile.totalReceivedFavorites }}</strong>
              </div>
            </div>
            <div class="profile-meta">
              <span class="meta-item text-secondary">加入时间: {{ formatDate(userProfile.createdAt) }}</span>
              <span class="meta-item text-secondary">作品: {{ userProfile.worksCount || works.length }}</span>
            </div>
            <NSpace class="profile-actions" size="small">
              <NButton
                v-if="isOwner"
                size="small"
                type="primary"
                class="edit-btn"
                @click="openEditProfile"
              >
                <template #icon>
                  <NIcon :component="CreateOutline" />
                </template>
                编辑资料
              </NButton>
              <NButton
                v-if="!isOwner"
                size="small"
                type="primary"
                class="follow-btn"
                :loading="followLoading"
                @click="toggleFollow"
              >
                {{ userProfile.isFollowing ? '取消关注' : '关注' }}
              </NButton>
            </NSpace>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="sao-section-title">作品列表</h2>
          <NSpace v-if="isOwner" size="small">
            <NButton size="small" :type="workViewMode === 'published' ? 'primary' : 'default'" @click="switchMode('published')">
              已发布
            </NButton>
            <NButton size="small" :type="workViewMode === 'pending' ? 'primary' : 'default'" @click="switchMode('pending')">
              待审核
            </NButton>
          </NSpace>
        </div>
      </div>

      <NSpin v-if="loading" size="small" style="display:flex;justify-content:center;padding:40px 0;" />

      <NEmpty v-else-if="works.length === 0" description="该用户暂无作品" class="page-empty" />

      <template v-else>
        <div class="works-grid">
          <div
            v-for="work in works"
            :key="work.id"
            class="work-card sao-card"
            @click="goToWorkDetail(work.id)"
          >
            <div class="work-cover">
              <NImage
                v-if="work.coverImage"
                :src="work.coverImage"
                :alt="work.title"
                object-fit="cover"
                class="cover-image"
                preview-disabled
              />
              <div v-else class="cover-placeholder">
                <NIcon :size="28" :component="HeartOutline" />
              </div>
              <NTag
                v-if="work.type"
                size="small"
                :bordered="false"
                type="info"
                class="work-type-badge"
              >
                {{ typeLabels[work.type] || work.type }}
              </NTag>
              <NTag
                v-if="work.status !== 'PUBLISHED'"
                size="small"
                :bordered="false"
                type="warning"
                class="work-status-badge"
              >
                {{ work.status === 'PENDING' ? '待审核' : work.status }}
              </NTag>
            </div>
            <div class="work-info">
              <h3 class="work-title">{{ work.title }}</h3>
              <p v-if="work.description" class="work-summary text-secondary">{{ work.description }}</p>
              <div v-if="isOwner && work.status === 'PENDING'" class="work-actions">
                <NButton size="tiny" secondary type="warning" @click.stop="revokeWork(work.id)">
                  撤销提交
                </NButton>
              </div>
              <div class="work-stats">
                <span class="stat-item"><NIcon :size="13" :component="HeartOutline" />{{ work.likeCount }}</span>
                <span class="stat-item"><NIcon :size="13" :component="StarOutline" />{{ work.favoriteCount }}</span>
                <span class="stat-item"><NIcon :size="13" :component="ChatbubbleOutline" />{{ work._count?.comments || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination-wrapper">
          <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
        </div>
      </template>
    </template>

    <NEmpty v-else description="未找到该用户" class="page-empty">
      <template #extra>
        <NButton @click="router.back()">返回</NButton>
      </template>
    </NEmpty>

    <NModal v-model:show="editProfileVisible" preset="card" title="编辑个人信息" :style="{ maxWidth: '560px', width: '92vw' }">
      <NForm ref="editFormRef" :model="editForm" :rules="editRules" label-placement="top">
        <div class="avatar-editor">
          <div class="avatar-preview">
            <NAvatar v-if="getAvatarUrl()" :src="getAvatarUrl()" round :size="84" />
            <div v-else class="avatar-preview-fallback">{{ editForm.nickname.charAt(0) || 'U' }}</div>
          </div>
          <div class="avatar-actions">
            <NUpload
              :file-list="avatarFiles"
              :max="1"
              accept="image/*"
              list-type="image-card"
              @update:file-list="handleAvatarChange"
              @remove="handleAvatarRemove"
            >
              <div class="upload-trigger">
                <NIcon :size="24" :component="CloudUploadOutline" />
                <span>更换头像</span>
              </div>
            </NUpload>
            <p class="upload-hint text-secondary">支持 JPG / PNG，建议使用正方形图片</p>
            <NProgress v-if="avatarUploadProgress > 0" type="line" :percentage="Math.round(avatarUploadProgress * 100)" :height="8" />
            <p v-if="avatarUploadError" class="upload-error">{{ avatarUploadError }}</p>
          </div>
        </div>

        <NFormItem label="用户名" path="nickname">
          <NInput v-model:value="editForm.nickname" maxlength="20" show-count placeholder="请输入用户名" />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="editProfileVisible = false">取消</NButton>
          <NButton type="primary" :loading="editSaving" @click="saveProfile">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.user-profile-page {
  padding: 24px 0;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.page-top {
  margin-bottom: 24px;
}

.back-btn {
  color: var(--sao-text-secondary);
  font-size: 14px;

  &:hover {
    color: var(--sao-accent);
  }
}

.profile-card {
  margin-bottom: 40px;

  :deep(.n-card__content) {
    padding: 0;
  }
}

.profile-content {
  display: flex;
  gap: 24px;
  padding: 32px;
  align-items: center;
}

.profile-avatar-section {
  flex-shrink: 0;

  .profile-avatar {
    background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
    color: #ffffff;
    font-weight: 700;
    font-size: 36px;
  }

  .profile-avatar-placeholder {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 36px;
  }
}

.profile-info-section {
  flex: 1;
}

.profile-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--sao-text-primary);
  margin-bottom: 8px;
}

.profile-bio {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.profile-meta,
.profile-core-stats,
.profile-actions {
  display: flex;
  gap: 20px;
}

.profile-core-stats {
  margin-bottom: 10px;
}

.core-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.core-label {
  font-size: 12px;
}

.meta-item {
  font-size: 13px;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.work-card {
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    border-color: rgba(0, 212, 255, 0.3) !important;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 212, 255, 0.1);
  }

  :deep(.n-card__content) {
    padding: 0;
  }
}

.work-cover {
  position: relative;
  height: 180px;
  overflow: hidden;

  .cover-image {
    width: 100%;
    height: 100%;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    background: rgba(0, 212, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sao-accent);
  }

  .work-type-badge,
  .work-status-badge {
    position: absolute;
    top: 12px;
  }

  .work-type-badge {
    right: 12px;
  }

  .work-status-badge {
    left: 12px;
  }
}

.work-info {
  padding: 16px;
}

.work-actions {
  margin-bottom: 10px;
}

.work-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--sao-text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-summary {
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}

.work-stats {
  display: flex;
  gap: 16px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--sao-text-secondary);
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.avatar-editor {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.avatar-preview {
  flex-shrink: 0;
}

.avatar-preview-fallback {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 30px;
}

.avatar-actions {
  flex: 1;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 24px;
  border: 1px dashed var(--sao-border-color);
  border-radius: 12px;
  color: var(--sao-text-secondary);
  cursor: pointer;
}

.upload-hint {
  font-size: 12px;
  margin: 8px 0 0;
}

.upload-error {
  color: var(--sao-danger);
  font-size: 12px;
  margin-top: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .profile-content {
    flex-direction: column;
    text-align: center;
  }

  .profile-meta,
  .profile-core-stats,
  .profile-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .works-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .work-cover {
    height: 140px;
  }

  .section-header,
  .avatar-editor {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
