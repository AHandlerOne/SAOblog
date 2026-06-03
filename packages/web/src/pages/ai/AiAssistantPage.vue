<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { AxiosError } from 'axios'
import {
  NAlert,
  NAvatar,
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NPopconfirm,
  NRadioButton,
  NRadioGroup,
  NSpin,
  NTag,
} from 'naive-ui'
import { SendOutline, TrashOutline } from '@vicons/ionicons5'
import { aiApi, type AiMessage, type AiMode } from '@/api/ai'
import { useAuthStore } from '@/stores/auth'

const ASUNA_AVATAR = '/images/characters/asuna.png'
const STORAGE_KEY_PREFIX = 'sao_ai_asuna_messages'
const MAX_MESSAGES = 40
const MAX_STORAGE_BYTES = 120 * 1024
const authStore = useAuthStore()

const defaultMessages: AiMessage[] = [
  {
    role: 'assistant',
    content: '我是 Asuna。你可以问我这个站里的剧情、角色、作品区功能，也可以让我帮你起标题、写简介、补标签或者做一段短创作。',
  },
]

const mode = ref<AiMode>('qa')
const loading = ref(false)
const error = ref('')
const draft = ref('')
const chatListRef = ref<HTMLElement | null>(null)
const storageStatus = ref('本地会话已启用')
const storageWarning = ref('')

const userAvatar = computed(() => authStore.user?.avatar || undefined)
const userName = computed(() => authStore.user?.nickname || '你')
const defaultUserAvatar = computed(() => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName.value)}`)
const userAvatarSrc = computed(() => userAvatar.value || defaultUserAvatar.value)
const storageKey = computed(() => (
  authStore.user?.id
    ? `${STORAGE_KEY_PREFIX}:${authStore.user.id}`
    : STORAGE_KEY_PREFIX
))
const messages = ref<AiMessage[]>(loadStoredMessages())

const storageUsage = computed(() => {
  const bytes = getMessagePayloadSize(messages.value)
  return `${formatBytes(bytes)} / ${formatBytes(MAX_STORAGE_BYTES)}`
})

const storageCount = computed(() => `${messages.value.length} / ${MAX_MESSAGES} 条`)

const suggestions = computed(() => mode.value === 'creative'
  ? [
      '帮我给一篇亚丝娜主题同人文起 5 个标题',
      '根据这个站的创作区风格，写一段作品简介',
      '帮我列一份 SAO 同人短篇的大纲，控制在 3 幕',
      '给角色向插画想几个标签和发布文案',
    ]
  : [
      '这个项目里有哪些主要页面和功能？',
      '亚丝娜在站内角色内容里大概是什么定位？',
      '社区作品区支持什么互动？',
      '如果我要发作品，流程应该怎么走？',
    ])

function getStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

function getMessagePayloadSize(value: AiMessage[]): number {
  const text = JSON.stringify(value)
  return typeof Blob === 'undefined'
    ? text.length
    : new Blob([text]).size
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.ceil(bytes / 1024)} KB`
}

function normalizeMessages(value: unknown): AiMessage[] {
  if (!Array.isArray(value)) return [...defaultMessages]

  const safeMessages = value
    .filter((item): item is AiMessage => (
      item
      && (item.role === 'user' || item.role === 'assistant')
      && typeof item.content === 'string'
      && item.content.trim().length > 0
    ))
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 8000),
    }))

  return safeMessages.length > 0
    ? safeMessages.slice(-MAX_MESSAGES)
    : [...defaultMessages]
}

function loadStoredMessages(): AiMessage[] {
  const storage = getStorage()
  if (!storage) return [...defaultMessages]

  try {
    const raw = storage.getItem(storageKey.value)
    if (!raw) return [...defaultMessages]

    const parsed = JSON.parse(raw) as { messages?: unknown }
    storageStatus.value = '已恢复上次本地会话'
    return normalizeMessages(parsed.messages)
  } catch {
    storage.removeItem(storageKey.value)
    storageStatus.value = '本地会话损坏，已重新开始'
    return [...defaultMessages]
  }
}

function pruneMessagesForStorage(value: AiMessage[]): AiMessage[] {
  const pruned = normalizeMessages(value)

  while (pruned.length > 1 && getMessagePayloadSize(pruned) > MAX_STORAGE_BYTES) {
    pruned.shift()
  }

  return pruned
}

function persistMessages(): void {
  const storage = getStorage()
  if (!storage) return

  const pruned = pruneMessagesForStorage(messages.value)
  const wasPruned = pruned.length !== messages.value.length
  const payload = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    messages: pruned,
  })

  try {
    storage.setItem(storageKey.value, payload)
    if (wasPruned) {
      messages.value = pruned
      storageWarning.value = '已自动保留最近对话，避免超过浏览器本地存储。'
    } else {
      storageWarning.value = ''
    }
    storageStatus.value = `已保存到本地 ${new Date().toLocaleTimeString()}`
  } catch {
    const fallback = pruned.slice(-Math.max(8, Math.floor(MAX_MESSAGES / 2)))
    storage.setItem(storageKey.value, JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      messages: fallback,
    }))
    messages.value = fallback
    storageWarning.value = '本地存储空间不足，已只保留最近一部分对话。'
    storageStatus.value = '已压缩保存'
  }
}

function clearConversation(): void {
  const storage = getStorage()
  storage?.removeItem(storageKey.value)
  messages.value = [...defaultMessages]
  error.value = ''
  storageWarning.value = ''
  storageStatus.value = '已清空本地会话'
  void scrollToBottom()
}

function getAiErrorMessage(err: unknown): string {
  const axiosError = err as AxiosError<{ message?: string }>
  const status = axiosError.response?.status
  const serverMessage = axiosError.response?.data?.message

  if (status === 503) {
    return 'AI 助手还没有配置模型密钥。请在服务端环境变量里设置 OPENAI_API_KEY，然后重启后端服务。'
  }

  if (serverMessage) {
    return serverMessage
  }

  if (err instanceof Error) {
    return err.message
  }

  return 'AI 助手暂时不可用，请稍后再试。'
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = chatListRef.value
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }
}

async function sendMessage(preset?: string): Promise<void> {
  const content = (preset ?? draft.value).trim()
  if (!content || loading.value) return

  error.value = ''
  messages.value.push({ role: 'user', content })
  persistMessages()
  draft.value = ''
  loading.value = true
  await scrollToBottom()

  try {
    const response = await aiApi.chat({
      message: content,
      mode: mode.value,
    })

    messages.value.push({
      role: 'assistant',
      content: response.data.content,
    })
  } catch (err: unknown) {
    error.value = getAiErrorMessage(err)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，这次我还没有顺利接上模型服务。配置完成后，我就可以继续帮你处理站内问答和创作辅助。',
    })
  } finally {
    loading.value = false
    persistMessages()
    await scrollToBottom()
  }
}

watch(
  () => authStore.user?.id,
  () => {
    error.value = ''
    draft.value = ''
    storageWarning.value = ''
    storageStatus.value = authStore.user?.id ? '本地会话已启用' : '请登录后使用会话保存'
    messages.value = loadStoredMessages()
    void scrollToBottom()
  },
)
</script>

<template>
  <div class="ai-page">
    <aside class="ai-sidebar">
      <div class="sidebar-scroll">
        <section class="sidebar-section">
          <div class="assistant-card">
            <NAvatar :size="56" round :src="ASUNA_AVATAR">A</NAvatar>
            <div>
              <h1>Asuna 助手</h1>
              <p>站内问答与创作辅助</p>
            </div>
          </div>
        </section>

        <section class="sidebar-section storage-panel">
          <div class="storage-head">
            <h2>会话保存</h2>
            <NTag :bordered="false" type="success">本地</NTag>
          </div>
          <p class="storage-status">{{ storageStatus }}</p>
          <div class="storage-meta">
            <span>{{ storageCount }}</span>
            <span>{{ storageUsage }}</span>
          </div>
          <p v-if="storageWarning" class="storage-warning">{{ storageWarning }}</p>
          <NPopconfirm
            positive-text="清空"
            negative-text="取消"
            @positive-click="clearConversation"
          >
            <template #trigger>
              <NButton secondary type="error" size="small" class="clear-button">
                清空会话
                <template #icon>
                  <NIcon :component="TrashOutline" />
                </template>
              </NButton>
            </template>
            本地保存的对话会被删除，当前窗口也会重新开始。
          </NPopconfirm>
        </section>

        <section class="sidebar-section">
          <h2>模式</h2>
          <NRadioGroup v-model:value="mode" name="ai-mode">
            <NRadioButton value="qa">站内问答</NRadioButton>
            <NRadioButton value="creative">创作辅助</NRadioButton>
          </NRadioGroup>
        </section>

        <section class="sidebar-section">
          <h2>建议提问</h2>
          <div class="suggestion-list">
            <button
              v-for="item in suggestions"
              :key="item"
              type="button"
              class="suggestion-chip"
              :disabled="loading"
              @click="sendMessage(item)"
            >
              {{ item }}
            </button>
          </div>
        </section>

        <section class="sidebar-section">
          <h2>能力边界</h2>
          <div class="tag-list">
            <NTag :bordered="false" type="info">剧情与角色</NTag>
            <NTag :bordered="false" type="info">站内功能</NTag>
            <NTag :bordered="false" type="success">标题简介</NTag>
            <NTag :bordered="false" type="success">轻量创作</NTag>
            <NTag :bordered="false" type="warning">仅限本项目</NTag>
          </div>
        </section>
      </div>
    </aside>

    <main class="chat-shell">
      <header class="chat-header">
        <div>
          <h2>{{ mode === 'qa' ? '站内问答' : '创作辅助' }}</h2>
          <p>Asuna 会把回答收束在 SAO Blog 的项目范围内。</p>
        </div>
        <NTag :bordered="false" type="info">Asuna</NTag>
      </header>

      <NAlert
        v-if="error"
        type="error"
        title="请求失败"
        :show-icon="false"
        class="chat-alert"
      >
        {{ error }}
      </NAlert>

      <div ref="chatListRef" class="chat-list">
        <template v-if="messages.length > 0">
          <article
            v-for="(message, index) in messages"
            :key="`${message.role}-${index}`"
            class="chat-message"
            :class="message.role"
          >
            <img
              v-if="message.role === 'assistant'"
              :src="ASUNA_AVATAR"
              alt="Asuna"
              class="message-avatar"
            >
            <img
              v-else
              :src="userAvatarSrc"
              :alt="userName"
              class="message-avatar"
            >

            <div class="message-stack">
              <div class="message-name">
                {{ message.role === 'assistant' ? 'Asuna' : userName }}
              </div>
              <div class="message-bubble">
                {{ message.content }}
              </div>
            </div>
          </article>

          <article v-if="loading" class="chat-message assistant">
            <img :src="ASUNA_AVATAR" alt="Asuna" class="message-avatar">
            <div class="message-stack">
              <div class="message-name">Asuna</div>
              <div class="message-bubble typing-bubble">
                <NSpin size="small" />
                <span>正在整理回答...</span>
              </div>
            </div>
          </article>
        </template>
        <NEmpty v-else description="还没有开始对话" />
      </div>

      <footer class="composer">
        <NInput
          v-model:value="draft"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 5 }"
          placeholder="问站内功能、角色剧情，或者直接让我帮你写标题、简介和短创作。"
          :disabled="loading"
          @keydown.ctrl.enter.prevent="sendMessage()"
        />
        <div class="composer-actions">
          <span>Ctrl + Enter 发送</span>
          <NButton
            type="primary"
            class="send-button"
            :disabled="loading || !draft.trim()"
            @click="sendMessage()"
          >
            发送
            <template #icon>
              <NIcon :component="SendOutline" />
            </template>
          </NButton>
        </div>
      </footer>
    </main>
  </div>
</template>

<style scoped lang="scss">
.ai-page {
  --ai-panel-height: min(760px, calc(100vh - var(--sao-header-height) - 112px));
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 20px;
  height: var(--ai-panel-height);
  min-height: 560px;
  overflow: hidden;
}

.ai-sidebar,
.chat-shell {
  min-height: 0;
  height: 100%;
}

.ai-sidebar {
  min-width: 0;
  overflow: hidden;
}

.sidebar-scroll {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sidebar-section {
  min-width: 0;
}

.sidebar-section h2 {
  margin-bottom: 12px;
  font-size: 15px;
  color: var(--sao-text-primary);
}

.assistant-card,
.storage-panel {
  padding: 18px;
  border: 1px solid var(--sao-border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.assistant-card {
  display: flex;
  align-items: center;
  gap: 14px;
}

.assistant-card h1 {
  margin-bottom: 4px;
  font-size: 22px;
}

.assistant-card p,
.chat-header p,
.composer-actions,
.message-name,
.storage-status,
.storage-meta {
  color: var(--sao-text-secondary);
}

.storage-head,
.storage-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.storage-head h2 {
  margin-bottom: 0;
}

.storage-status {
  margin-top: 12px;
  font-size: 13px;
}

.storage-meta {
  margin-top: 10px;
  font-size: 12px;
}

.storage-warning {
  margin-top: 10px;
  color: #f5c97b;
  font-size: 12px;
  line-height: 1.6;
}

.clear-button {
  width: 100%;
  margin-top: 14px;
}

.suggestion-list,
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.suggestion-chip {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--sao-border-color);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--sao-text-primary);
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}

.suggestion-chip:hover:not(:disabled) {
  border-color: rgba(0, 212, 255, 0.35);
  background: rgba(0, 212, 255, 0.08);
}

.suggestion-chip:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.chat-shell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--sao-border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--sao-border-color);
  background: rgba(22, 33, 62, 0.86);
}

.chat-header h2 {
  margin-bottom: 4px;
  font-size: 20px;
}

.chat-alert {
  flex: 0 0 auto;
  margin: 14px 16px 0;
}

.chat-list {
  flex: 1 1 auto;
  min-height: 0;
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scroll-behavior: smooth;
}

.chat-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 86%;
}

.chat-message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.message-stack {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-message.user .message-stack {
  align-items: flex-end;
}

.message-name {
  font-size: 12px;
}

.message-bubble {
  max-width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border-top-left-radius: 4px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--sao-text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-message.user .message-bubble {
  border-top-left-radius: 12px;
  border-top-right-radius: 4px;
  background: rgba(0, 212, 255, 0.14);
  border-color: rgba(0, 212, 255, 0.22);
}

.typing-bubble {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--sao-text-secondary);
}

.composer {
  flex: 0 0 auto;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 16px;
  border-top: 1px solid var(--sao-border-color);
  background: rgba(22, 33, 62, 0.98);
}

.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.send-button {
  min-width: 96px;
}

@media (max-width: 960px) {
  .ai-page {
    --ai-panel-height: auto;
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .ai-sidebar {
    height: auto;
    overflow: visible;
  }

  .sidebar-scroll {
    height: auto;
    overflow: visible;
    padding-right: 0;
  }

  .chat-shell {
    height: min(720px, calc(100vh - var(--sao-header-height) - 80px));
    min-height: 560px;
  }
}

@media (max-width: 768px) {
  .ai-page {
    gap: 18px;
  }

  .chat-shell {
    height: calc(100vh - var(--sao-header-height) - 72px);
    min-height: 560px;
  }

  .chat-header,
  .chat-list {
    padding-left: 14px;
    padding-right: 14px;
  }

  .chat-message {
    max-width: 96%;
  }

  .composer-actions {
    align-items: stretch;
  }
}
</style>
