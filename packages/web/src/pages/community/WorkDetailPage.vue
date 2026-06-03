<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { worksApi, type Comment, type Work } from '@/api/works'
import {
  NAvatar,
  NButton,
  NEmpty,
  NIcon,
  NImage,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import {
  ArrowBackOutline,
  ArrowDownOutline,
  ArrowUpOutline,
  ChatbubbleOutline,
  FlagOutline,
  Heart,
  HeartOutline,
  SendOutline,
  Star,
  StarOutline,
  ThumbsDownOutline,
  ThumbsUpOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { renderSafeRichText } from '@/utils/content'

const props = defineProps<{ id: string }>()

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const work = ref<Work | null>(null)
const relatedWorks = ref<Work[]>([])
const comments = ref<Comment[]>([])
const loading = ref(true)
const commentsLoading = ref(false)
const relatedLoading = ref(false)
const commentText = ref('')
const commentsTotal = ref(0)
const commentsPage = ref(1)
const commentsPageSize = 20
const commentSort = ref<'new' | 'hot'>('new')
const replyDrafts = ref<Record<string, string>>({})
const replyActiveId = ref<string | null>(null)

const reportModalVisible = ref(false)
const reportReason = ref('')
const reportDescription = ref('')
const reportSubmitting = ref(false)

const commentsSectionRef = ref<HTMLElement | null>(null)

const isIllustration = computed(() => work.value?.type === 'ILLUSTRATION')
const commentsTotalPages = computed(() => Math.max(1, Math.ceil(commentsTotal.value / commentsPageSize)))
const renderedWorkContent = computed(() => renderSafeRichText(work.value?.content))

const typeLabels: Record<string, string> = {
  ILLUSTRATION: '插画',
  NOVEL: '小说',
  OTHER: '其他',
}

const commentSortOptions = [
  { label: '最新', value: 'new' },
  { label: '热度', value: 'hot' },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDescription(text: string | null | undefined): string {
  return (text || '').trim() || '作者还没有填写简介。'
}

function scrollToComments() {
  commentsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function fetchWork() {
  loading.value = true
  try {
    const res = await worksApi.getWork(props.id)
    work.value = res.data
  } catch (error) {
    console.error('Failed to load work:', error)
    work.value = null
  } finally {
    loading.value = false
  }
}

async function fetchRelatedWorks() {
  relatedLoading.value = true
  try {
    const res = await worksApi.getRelatedWorks(props.id, 4)
    relatedWorks.value = res.data
  } catch (error) {
    console.error('Failed to load related works:', error)
    relatedWorks.value = []
  } finally {
    relatedLoading.value = false
  }
}

async function fetchComments() {
  commentsLoading.value = true
  try {
    const res = await worksApi.getCommentsWithSort(props.id, {
      page: commentsPage.value,
      pageSize: commentsPageSize,
      sort: commentSort.value,
    })
    comments.value = res.data
    commentsTotal.value = res.total
  } catch (error) {
    console.error('Failed to load comments:', error)
    comments.value = []
    commentsTotal.value = 0
  } finally {
    commentsLoading.value = false
  }
}

function goBack() {
  router.push('/community/works')
}

function goToAuthorProfile() {
  if (work.value) {
    router.push(`/user/${work.value.author.id}`)
  }
}

function redirectToLogin() {
  router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
}

async function toggleLike() {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    redirectToLogin()
    return
  }
  if (!work.value) return

  try {
    const res = await worksApi.like(props.id)
    work.value.isLiked = res.liked
    work.value.likeCount += res.liked ? 1 : -1
  } catch {
    message.error('操作失败，请稍后重试')
  }
}

async function toggleFavorite() {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    redirectToLogin()
    return
  }
  if (!work.value) return

  try {
    const res = await worksApi.favorite(props.id)
    work.value.isFavorited = res.favorited
    work.value.favoriteCount += res.favorited ? 1 : -1
  } catch {
    message.error('操作失败，请稍后重试')
  }
}

async function submitComment() {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    redirectToLogin()
    return
  }

  const content = commentText.value.trim()
  if (!content) {
    message.warning('请输入评论内容')
    return
  }

  try {
    await worksApi.createComment(props.id, { content })
    commentText.value = ''
    commentsPage.value = 1
    commentSort.value = 'new'
    await fetchComments()
    await nextTick()
    scrollToComments()
    message.success('评论已发送')
  } catch {
    message.error('评论发送失败')
  }
}

async function submitReply(parentId: string) {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    redirectToLogin()
    return
  }

  const content = (replyDrafts.value[parentId] || '').trim()
  if (!content) {
    message.warning('请输入回复内容')
    return
  }

  try {
    await worksApi.createComment(props.id, { content, parentId })
    replyDrafts.value[parentId] = ''
    replyActiveId.value = null
    commentsPage.value = 1
    commentSort.value = 'new'
    await fetchComments()
    await nextTick()
    scrollToComments()
    message.success('回复已发送')
  } catch {
    message.error('回复发送失败')
  }
}

async function deleteComment(commentId: string) {
  try {
    await worksApi.deleteComment(commentId)
    await fetchComments()
    message.success('评论已删除')
  } catch {
    message.error('删除失败')
  }
}

async function reactComment(comment: Comment, type: 'LIKE' | 'DISLIKE') {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    return
  }

  try {
    const result = await worksApi.reactComment(comment.id, type)
    comment.liked = result.liked
    comment.disliked = result.disliked
    comment.likeCount = result.likeCount
    comment.dislikeCount = result.dislikeCount
  } catch {
    message.error('操作失败，请稍后重试')
  }
}

function handleCommentsPageChange(page: number) {
  commentsPage.value = page
  void fetchComments()
  scrollToComments()
}

function handleSortChange(value: 'new' | 'hot') {
  commentSort.value = value
  commentsPage.value = 1
  void fetchComments()
}

function canDeleteComment(comment: Comment): boolean {
  return authStore.user?.id === comment.authorId || authStore.user?.role === 'ADMIN'
}

function openReportModal() {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    redirectToLogin()
    return
  }

  reportReason.value = ''
  reportDescription.value = ''
  reportModalVisible.value = true
}

async function submitReport() {
  if (!reportReason.value.trim()) {
    message.warning('请填写举报原因')
    return
  }

  reportSubmitting.value = true
  try {
    await worksApi.createReport({
      targetType: 'WORK',
      targetId: props.id,
      reason: reportReason.value.trim(),
      description: reportDescription.value.trim() || undefined,
    })
    reportModalVisible.value = false
    message.success('举报已提交，管理员会尽快处理')
  } catch {
    message.error('举报提交失败')
  } finally {
    reportSubmitting.value = false
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToBottom() {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
}

async function loadDetailPage() {
  commentsPage.value = 1
  commentSort.value = 'new'
  commentText.value = ''
  replyDrafts.value = {}
  replyActiveId.value = null
  relatedWorks.value = []
  comments.value = []
  commentsTotal.value = 0
  await fetchWork()
  await Promise.all([fetchComments(), fetchRelatedWorks()])
}

onMounted(async () => {
  await loadDetailPage()
})

watch(
  () => props.id,
  async (nextId, prevId) => {
    if (!nextId || nextId === prevId) return
    await loadDetailPage()
  },
)
</script>

<template>
  <div class="work-detail-page">
    <NSpin v-if="loading" class="page-loading" />

    <NEmpty v-else-if="!work" description="没有找到这篇作品。" class="page-empty">
      <template #extra>
        <NButton @click="goBack">返回作品列表</NButton>
      </template>
    </NEmpty>

    <template v-else>
      <div class="page-top">
        <NButton text class="back-btn" @click="goBack">
          <template #icon>
            <NIcon :component="ArrowBackOutline" />
          </template>
          返回作品列表
        </NButton>
      </div>

      <div class="work-main">
        <div class="work-content-area">
          <div class="work-display sao-card">
            <div class="work-header">
              <h1 class="work-title">{{ work.title }}</h1>
              <div class="work-meta">
                <NTag size="small" :bordered="false" type="info">
                  {{ typeLabels[work.type] || work.type }}
                </NTag>
                <span class="text-secondary">{{ formatDate(work.createdAt) }}</span>
                <span class="text-secondary">{{ work.viewCount }} 浏览</span>
              </div>
              <div v-if="work.tags.length > 0" class="work-tags">
                <button
                  v-for="tag in work.tags"
                  :key="tag"
                  type="button"
                  class="tag-link"
                  @click="router.push(`/community/works?tag=${encodeURIComponent(tag)}`)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>

            <div v-if="isIllustration && work.images?.length" class="illustration-gallery">
              <div v-for="img in work.images" :key="img.id" class="gallery-image-wrap">
                <NImage
                  :src="img.imageUrl"
                  :alt="`${work.title}-${img.sortOrder + 1}`"
                  object-fit="contain"
                  class="gallery-image"
                />
              </div>
            </div>

            <div v-else-if="work.content" class="work-rich-content" v-html="renderedWorkContent"></div>
          </div>

          <div class="action-bar sao-card">
            <div class="action-buttons">
              <NButton :type="work.isLiked ? 'primary' : 'default'" round size="small" @click="toggleLike">
                <template #icon>
                  <NIcon :component="work.isLiked ? Heart : HeartOutline" />
                </template>
                {{ work.likeCount }}
              </NButton>
              <NButton :type="work.isFavorited ? 'warning' : 'default'" round size="small" @click="toggleFavorite">
                <template #icon>
                  <NIcon :component="work.isFavorited ? Star : StarOutline" />
                </template>
                {{ work.favoriteCount }}
              </NButton>
              <NButton text size="small" class="report-btn" @click="openReportModal">
                <template #icon>
                  <NIcon :component="FlagOutline" />
                </template>
                举报
              </NButton>
            </div>
          </div>

          <div class="work-description sao-card">
            <p>{{ formatDescription(work.description) }}</p>
          </div>

          <div class="related-section sao-card">
            <div class="section-head">
              <div>
                <h3 class="section-title">相关推荐</h3>
                <p class="section-tip text-secondary">读完这篇后，可以顺着相近标签或题材继续看。</p>
              </div>
            </div>

            <NSpin :show="relatedLoading">
              <div v-if="relatedWorks.length > 0" class="related-grid">
                <article
                  v-for="item in relatedWorks"
                  :key="item.id"
                  class="related-card"
                  @click="router.push(`/community/works/${item.id}`)"
                >
                  <NImage
                    v-if="item.coverImage"
                    :src="item.coverImage"
                    :alt="item.title"
                    object-fit="cover"
                    class="related-cover"
                    preview-disabled
                  />
                  <div class="related-body">
                    <h4 class="related-title">{{ item.title }}</h4>
                    <p class="related-desc">{{ formatDescription(item.description) }}</p>
                    <div class="related-meta text-secondary">
                      <span>{{ item.author.nickname }}</span>
                      <span>{{ item.likeCount }} 赞</span>
                    </div>
                  </div>
                </article>
              </div>
              <div v-else class="text-secondary related-empty">暂时没有更多相近作品。</div>
            </NSpin>
          </div>

          <div ref="commentsSectionRef" class="comments-section sao-card">
            <div class="comments-head">
              <h3 class="section-title">
                <NIcon :component="ChatbubbleOutline" :size="18" />
                评论 {{ commentsTotal }}
              </h3>
              <NSelect
                :value="commentSort"
                :options="commentSortOptions"
                size="small"
                class="comments-sort"
                @update:value="handleSortChange"
              />
            </div>

            <div v-if="authStore.isLoggedIn" class="comment-editor">
              <NInput
                v-model:value="commentText"
                type="textarea"
                placeholder="写下你的评论..."
                :autosize="{ minRows: 2, maxRows: 4 }"
              />
              <div class="comment-editor-actions">
                <span class="text-secondary editor-hint">发送成功后会自动回到最新评论位置。</span>
                <NButton
                  type="primary"
                  class="sao-btn-primary"
                  :disabled="!commentText.trim()"
                  @click="submitComment"
                >
                  <template #icon>
                    <NIcon :component="SendOutline" />
                  </template>
                  发送评论
                </NButton>
              </div>
            </div>
            <div v-else class="login-hint text-secondary">
              <router-link :to="{ name: 'Login', query: { redirect: $route.fullPath } }">登录</router-link>
              后即可发表评论和回复。
            </div>

            <NSpin v-if="commentsLoading" size="small" />
            <div v-else-if="comments.length === 0" class="no-comments text-secondary">还没有评论，欢迎成为第一个留言的人。</div>

            <div v-else class="comments-list">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-main">
                  <NAvatar v-if="comment.author.avatar" :src="comment.author.avatar" round :size="36" />
                  <div v-else class="comment-avatar-placeholder">{{ comment.author.nickname.charAt(0) }}</div>

                  <div class="comment-body">
                    <div class="comment-header">
                      <router-link :to="`/user/${comment.authorId}`" class="comment-author">{{ comment.author.nickname }}</router-link>
                      <span class="comment-date text-secondary">{{ formatDate(comment.createdAt) }}</span>
                    </div>
                    <p class="comment-text">{{ comment.content }}</p>

                    <div class="comment-actions">
                      <NButton text size="tiny" @click="reactComment(comment, 'LIKE')">
                        <template #icon><NIcon :component="ThumbsUpOutline" /></template>
                        {{ comment.likeCount || 0 }}
                      </NButton>
                      <NButton text size="tiny" @click="reactComment(comment, 'DISLIKE')">
                        <template #icon><NIcon :component="ThumbsDownOutline" /></template>
                        {{ comment.dislikeCount || 0 }}
                      </NButton>
                      <NButton
                        v-if="authStore.isLoggedIn"
                        text
                        size="tiny"
                        @click="replyActiveId = replyActiveId === comment.id ? null : comment.id"
                      >
                        回复
                      </NButton>
                      <NButton
                        v-if="canDeleteComment(comment)"
                        text
                        size="tiny"
                        type="error"
                        @click="deleteComment(comment.id)"
                      >
                        <template #icon><NIcon :component="TrashOutline" /></template>
                        删除
                      </NButton>
                    </div>

                    <div v-if="replyActiveId === comment.id" class="reply-editor">
                      <NInput
                        v-model:value="replyDrafts[comment.id]"
                        type="textarea"
                        placeholder="输入回复内容..."
                        :autosize="{ minRows: 2, maxRows: 4 }"
                      />
                      <div class="reply-editor-actions">
                        <NButton size="tiny" @click="replyActiveId = null">取消</NButton>
                        <NButton size="tiny" type="primary" @click="submitReply(comment.id)">发送回复</NButton>
                      </div>
                    </div>

                    <div v-if="comment.replies?.length" class="reply-list">
                      <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                        <div class="comment-header">
                          <router-link :to="`/user/${reply.authorId}`" class="comment-author">{{ reply.author.nickname }}</router-link>
                          <span class="comment-date text-secondary">{{ formatDate(reply.createdAt) }}</span>
                        </div>
                        <p class="reply-text">{{ reply.content }}</p>
                        <div class="comment-actions">
                          <NButton text size="tiny" @click="reactComment(reply, 'LIKE')">
                            <template #icon><NIcon :component="ThumbsUpOutline" /></template>
                            {{ reply.likeCount || 0 }}
                          </NButton>
                          <NButton text size="tiny" @click="reactComment(reply, 'DISLIKE')">
                            <template #icon><NIcon :component="ThumbsDownOutline" /></template>
                            {{ reply.dislikeCount || 0 }}
                          </NButton>
                          <NButton
                            v-if="canDeleteComment(reply)"
                            text
                            size="tiny"
                            type="error"
                            @click="deleteComment(reply.id)"
                          >
                            删除
                          </NButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="commentsTotalPages > 1" class="pagination-wrapper">
              <NPagination :page="commentsPage" :page-count="commentsTotalPages" @update:page="handleCommentsPageChange" />
            </div>
          </div>
        </div>

        <aside class="work-sidebar">
          <div class="author-card sao-card">
            <h3 class="section-title">作者信息</h3>
            <button type="button" class="author-info" @click="goToAuthorProfile">
              <NAvatar v-if="work.author.avatar" :src="work.author.avatar" round :size="56" />
              <div v-else class="author-avatar-large">{{ work.author.nickname.charAt(0) }}</div>
              <div class="author-copy">
                <strong>{{ work.author.nickname }}</strong>
                <span class="text-secondary">{{ work.author.bio || '这个作者还没有填写个人介绍。' }}</span>
              </div>
            </button>
          </div>

          <div class="sidebar-card sao-card">
            <h3 class="section-title">当前作品</h3>
            <div class="sidebar-meta">
              <span>类型</span>
              <strong>{{ typeLabels[work.type] || work.type }}</strong>
            </div>
            <div class="sidebar-meta">
              <span>点赞</span>
              <strong>{{ work.likeCount }}</strong>
            </div>
            <div class="sidebar-meta">
              <span>收藏</span>
              <strong>{{ work.favoriteCount }}</strong>
            </div>
            <div class="sidebar-meta">
              <span>评论</span>
              <strong>{{ commentsTotal }}</strong>
            </div>
          </div>
        </aside>
      </div>

      <NModal v-model:show="reportModalVisible" preset="card" title="举报作品" class="report-modal" :style="{ maxWidth: '520px' }">
        <div class="report-copy">
          <p class="text-secondary">举报内容仅管理员可见，我们不会向对方公开你的身份。</p>
          <NInput v-model:value="reportReason" placeholder="请填写举报原因（必填）" maxlength="200" />
          <NInput
            v-model:value="reportDescription"
            type="textarea"
            placeholder="补充说明（选填）"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </div>
        <template #footer>
          <div class="modal-footer">
            <NButton @click="reportModalVisible = false">取消</NButton>
            <NButton type="error" :loading="reportSubmitting" @click="submitReport">提交举报</NButton>
          </div>
        </template>
      </NModal>

      <div class="page-scroll-actions">
        <NButton circle class="scroll-action-btn" @click="scrollToTop">
          <template #icon><NIcon :component="ArrowUpOutline" /></template>
        </NButton>
        <NButton circle class="scroll-action-btn" @click="scrollToBottom">
          <template #icon><NIcon :component="ArrowDownOutline" /></template>
        </NButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.work-detail-page {
  padding: 24px 0;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.page-top {
  margin-bottom: 20px;
}

.back-btn {
  color: var(--sao-text-secondary);
}

.work-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: flex-start;
}

.work-content-area,
.work-display,
.related-section,
.comments-section {
  display: flex;
  flex-direction: column;
}

.work-content-area {
  gap: 16px;
}

.work-display,
.action-bar,
.work-description,
.related-section,
.comments-section,
.author-card,
.sidebar-card {
  :deep(.n-card__content) {
    padding: 20px;
  }
}

.work-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.work-title {
  color: var(--sao-text-primary);
  font-size: 28px;
  line-height: 1.4;
}

.work-meta,
.work-tags,
.comment-actions,
.reply-editor-actions,
.comment-editor-actions,
.action-buttons,
.related-meta,
.modal-footer {
  display: flex;
  align-items: center;
}

.work-meta,
.work-tags {
  flex-wrap: wrap;
  gap: 10px;
}

.tag-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--sao-accent);
  cursor: pointer;
}

.illustration-gallery {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gallery-image-wrap {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid var(--sao-border-color);
  background: rgba(255, 255, 255, 0.02);
}

.gallery-image {
  width: 100%;
  border-radius: 12px;
}

.work-rich-content {
  color: var(--sao-text-secondary);
  line-height: 1.95;

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin: 24px 0 12px;
    color: var(--sao-text-primary);
  }

  :deep(p) {
    margin-bottom: 16px;
  }

  :deep(img) {
    display: block;
    width: min(100%, 440px);
    max-width: 100%;
    margin: 18px auto;
    border-radius: 14px;
    cursor: zoom-in;
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.18);
  }

  :deep(blockquote) {
    margin: 16px 0;
    padding: 12px 16px;
    border-left: 3px solid var(--sao-accent);
    background: rgba(118, 227, 255, 0.05);
    border-radius: 0 10px 10px 0;
  }
}

.action-buttons {
  gap: 12px;
}

.report-btn {
  margin-left: auto;
  color: var(--sao-text-secondary);
}

.work-description p,
.section-tip,
.editor-hint,
.related-empty,
.login-hint,
.no-comments,
.comment-date,
.reply-text,
.report-copy p,
.author-copy span {
  color: var(--sao-text-secondary);
}

.section-head,
.comments-head,
.comment-header,
.sidebar-meta,
.related-body,
.author-copy {
  display: flex;
}

.section-head,
.comments-head,
.sidebar-meta {
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sao-text-primary);
  font-size: 17px;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.related-card {
  overflow: hidden;
  border: 1px solid var(--sao-border-color);
  border-radius: 16px;
  cursor: pointer;
}

.related-cover {
  width: 100%;
  height: 150px;
}

.related-body {
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}

.related-title {
  color: var(--sao-text-primary);
  font-size: 15px;
}

.related-desc {
  line-height: 1.7;
  font-size: 13px;
  color: var(--sao-text-secondary);
}

.related-meta {
  justify-content: space-between;
  font-size: 12px;
}

.comments-sort {
  width: 120px;
}

.comment-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
  margin-bottom: 20px;
}

.comment-editor-actions {
  justify-content: space-between;
  gap: 10px;
}

.comments-list {
  display: flex;
  flex-direction: column;
}

.comment-item {
  padding: 18px 0;
  border-bottom: 1px solid var(--sao-border-color);
}

.comment-item:last-child {
  border-bottom: 0;
}

.comment-main {
  display: flex;
  gap: 12px;
}

.comment-avatar-placeholder,
.author-avatar-large {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
  color: #fff;
  font-weight: 700;
}

.comment-avatar-placeholder {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  font-size: 14px;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header,
.comment-actions,
.reply-editor-actions {
  gap: 8px;
}

.comment-author {
  color: var(--sao-accent);
  font-size: 13px;
  font-weight: 600;
}

.comment-text,
.reply-text {
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--sao-text-primary);
}

.reply-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.reply-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-left: 12px;
  border-left: 2px solid var(--sao-border-color);
}

.reply-item {
  padding: 10px 12px;
  border: 1px solid var(--sao-border-color);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.work-sidebar {
  position: sticky;
  top: calc(var(--sao-header-height) + 24px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.author-avatar-large {
  width: 56px;
  height: 56px;
  font-size: 22px;
}

.author-copy {
  flex-direction: column;
  gap: 6px;
}

.author-copy strong {
  color: var(--sao-text-primary);
  font-size: 15px;
}

.sidebar-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sidebar-meta span {
  color: var(--sao-text-secondary);
}

.sidebar-meta strong {
  color: var(--sao-text-primary);
}

.report-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-footer {
  justify-content: flex-end;
  gap: 10px;
}

.page-scroll-actions {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scroll-action-btn {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(118, 227, 255, 0.18);
  background: rgba(8, 23, 38, 0.9);
  color: var(--sao-text-primary);
}

@media (max-width: 960px) {
  .work-main {
    grid-template-columns: 1fr;
  }

  .work-sidebar {
    position: static;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .work-title {
    font-size: 24px;
  }

  .comment-editor-actions,
  .comments-head,
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-scroll-actions {
    right: 14px;
    bottom: 16px;
  }
}
</style>
