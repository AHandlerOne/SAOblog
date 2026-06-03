<script setup lang="ts">
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { QuillEditor } from '@vueup/vue-quill'
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NRadio,
  NRadioGroup,
  NSpin,
  NTag,
  NUpload,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules, UploadFileInfo } from 'naive-ui'
import {
  CloudUploadOutline,
  CreateOutline,
  DocumentTextOutline,
  ImageOutline,
  AttachOutline,
} from '@vicons/ionicons5'
import { worksApi } from '@/api/works'
import type { CreateWorkData, Work } from '@/api/works'
import { useAuthStore } from '@/stores/auth'
import { renderSafeRichText } from '@/utils/content'

type WorkTypeView = 'illustration' | 'novel' | 'other'

type UploadChannel = {
  fileList: Ref<UploadFileInfo[]>
  sessionMap: Ref<Record<string, string>>
  progressMap: Ref<Record<string, number>>
  urlMap: Ref<Record<string, string>>
  errorText: Ref<string>
  syncing: Ref<boolean>
  taskMap: Map<string, Promise<void>>
  max: number
}

type QuillEditorInstance = InstanceType<typeof QuillEditor>
type QuillInstance = {
  focus: () => void
  getLength: () => number
  getSelection: (focus?: boolean) => { index: number; length: number } | null
  setSelection: (index: number, length: number, source?: string) => void
  deleteText: (index: number, length: number, source?: string) => void
  insertText: (index: number, text: string, source?: string) => void
  insertEmbed: (index: number, type: string, value: string, source?: string) => void
  getText: (index: number, length: number) => string
  clipboard: {
    dangerouslyPasteHTML: (index: number, html: string, source?: string) => void
  }
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const editorRef = ref<QuillEditorInstance | null>(null)
const quillInstance = ref<unknown>(null)
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const txtInputRef = ref<HTMLInputElement | null>(null)

const loading = ref(false)
const workLoading = ref(false)
const draftSaving = ref(false)
const currentWork = ref<Work | null>(null)
const attachmentUploading = ref(false)
const attachmentUploadProgress = ref(0)
const attachmentUploadName = ref('')
const importedTxtName = ref('')

const workType = ref<WorkTypeView>('illustration')
const formData = reactive({
  title: '',
  content: '',
  summary: '',
  tags: [] as string[],
})
const tagInput = ref('')
const editorToolbar = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block', 'link'],
  [{ align: [] }],
  ['clean'],
]

function createUploadChannel(max: number): UploadChannel {
  return {
    fileList: ref<UploadFileInfo[]>([]),
    sessionMap: ref<Record<string, string>>({}),
    progressMap: ref<Record<string, number>>({}),
    urlMap: ref<Record<string, string>>({}),
    errorText: ref(''),
    syncing: ref(false),
    taskMap: new Map<string, Promise<void>>(),
    max,
  }
}

const coverUpload = createUploadChannel(1)
const galleryUpload = createUploadChannel(20)

const isEditMode = computed(() => typeof route.query.workId === 'string' && route.query.workId.length > 0)
const editingWorkId = computed(() => (typeof route.query.workId === 'string' ? route.query.workId : ''))
const isIllustration = computed(() => workType.value === 'illustration')
const isNovel = computed(() => workType.value === 'novel')
const isDraftWork = computed(() => currentWork.value?.status === 'DRAFT')
const hasEditedBefore = computed(() => (currentWork.value?.editCount || 0) > 0)
const canSaveDraft = computed(() => !isEditMode.value || isDraftWork.value)
const pageTitle = computed(() => (isEditMode.value ? '编辑作品' : '发布作品'))
const submitButtonText = computed(() => (isEditMode.value ? '保存修改' : '提交作品'))
const renderedPreviewContent = computed(() => (
  hasMeaningfulEditorContent(formData.content)
    ? renderSafeRichText(formData.content)
    : ''
))
const editNoticeText = computed(() => {
  const count = currentWork.value?.editCount || 0
  if (count <= 0) return ''
  return `这篇作品已经编辑过 ${count} 次，本次保存后会继续记录新的编辑版本。`
})
const firstGalleryImageUrl = computed(() => getUploadedUrls(galleryUpload)[0] || '')
const coverResolvedUrl = computed(() => getUploadedUrls(coverUpload)[0] || firstGalleryImageUrl.value || '')
const galleryStatsText = computed(() => {
  const total = galleryUpload.fileList.value.length
  const uploading = galleryUpload.fileList.value.filter((item) => item.status === 'uploading').length
  const failed = galleryUpload.fileList.value.filter((item) => item.status === 'error').length
  const finished = galleryUpload.fileList.value.filter((item) => item.status === 'finished').length
  return { total, uploading, failed, finished }
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入作品标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度需要在 2 到 100 个字符之间', trigger: 'blur' },
  ],
  content: [
    {
      validator: (_rule: unknown, value: string) => {
        if (isIllustration.value) return true
        if (!hasMeaningfulEditorContent(value)) return new Error('请填写正文内容')
        return true
      },
      trigger: 'blur',
    },
  ],
}

function normalizeEditorContent(value: string | null | undefined): string {
  const normalized = value?.trim() || ''
  if (!normalized) return ''
  return renderSafeRichText(normalized)
}

function extractEditorText(value: string | null | undefined): string {
  if (!value) return ''

  if (typeof window === 'undefined') {
    return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
  }

  const container = window.document.createElement('div')
  container.innerHTML = value
  return (container.textContent || '').replace(/\u00a0/g, ' ').trim()
}

function hasMeaningfulEditorContent(value: string | null | undefined): boolean {
  return extractEditorText(value).length > 0
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function convertPlainTextToRichHtml(value: string): string {
  return value
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function withStatus(
  fileInfo: UploadFileInfo,
  status: NonNullable<UploadFileInfo['status']>,
  extra: Partial<UploadFileInfo> = {},
): UploadFileInfo {
  return {
    ...fileInfo,
    ...extra,
    status,
  }
}

function buildExistingFiles(urls: string[], prefix: string): UploadFileInfo[] {
  return urls.map((url, index) => ({
    id: `${prefix}-${index}`,
    name: `${prefix}-${index + 1}`,
    status: 'finished',
    url,
  }))
}

function resetUploadChannel(channel: UploadChannel) {
  channel.fileList.value = []
  channel.sessionMap.value = {}
  channel.progressMap.value = {}
  channel.urlMap.value = {}
  channel.errorText.value = ''
  channel.taskMap.clear()
}

function syncExistingUploadChannel(channel: UploadChannel, urls: string[], prefix: string) {
  resetUploadChannel(channel)
  channel.fileList.value = buildExistingFiles(urls, prefix)
}

function resetForm() {
  workType.value = 'illustration'
  formData.title = ''
  formData.content = ''
  formData.summary = ''
  formData.tags.splice(0, formData.tags.length)
  tagInput.value = ''
  attachmentUploadName.value = ''
  attachmentUploadProgress.value = 0
  importedTxtName.value = ''
  resetUploadChannel(coverUpload)
  resetUploadChannel(galleryUpload)
}

async function loadEditingWork() {
  if (!isEditMode.value || !editingWorkId.value) {
    currentWork.value = null
    resetForm()
    return
  }

  workLoading.value = true
  try {
    const res = await worksApi.getWork(editingWorkId.value)
    if (res.data.author.id !== authStore.user?.id) {
      message.error('只能编辑自己的作品')
      router.replace('/creator?tab=published')
      return
    }

    currentWork.value = res.data
    workType.value = String(res.data.type).toLowerCase() as WorkTypeView
    formData.title = res.data.title || ''
    formData.content = normalizeEditorContent(res.data.content)
    formData.summary = res.data.description || ''
    formData.tags.splice(0, formData.tags.length, ...(res.data.tags || []))
    importedTxtName.value = ''

    syncExistingUploadChannel(coverUpload, res.data.coverImage ? [res.data.coverImage] : [], 'cover')
    const imageUrls = (res.data.images || [])
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => item.imageUrl)
    syncExistingUploadChannel(galleryUpload, imageUrls, 'gallery')
  } catch (error: any) {
    message.error(error?.response?.data?.message || '加载作品失败')
    router.replace('/creator?tab=published')
  } finally {
    workLoading.value = false
  }
}

async function initPage() {
  if (!authStore.isLoggedIn) {
    message.warning('请先登录')
    router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }

  if (!authStore.user) {
    await authStore.fetchMe()
  }

  await loadEditingWork()
}

function handleTagInput() {
  const tag = tagInput.value.trim()
  if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
    formData.tags.push(tag)
    tagInput.value = ''
  }
}

function removeTag(tag: string) {
  const index = formData.tags.indexOf(tag)
  if (index !== -1) {
    formData.tags.splice(index, 1)
  }
}

function getUploadFileKey(fileInfo: UploadFileInfo): string | null {
  if (!(fileInfo.file instanceof File)) {
    return null
  }
  return `${fileInfo.file.name}-${fileInfo.file.size}-${fileInfo.file.lastModified}`
}

function replaceFileList(channel: UploadChannel, nextFiles: UploadFileInfo[]) {
  channel.syncing.value = true
  channel.fileList.value = nextFiles
  nextTick(() => {
    channel.syncing.value = false
  })
}

function updateFileByKey(channel: UploadChannel, targetKey: string, updater: (file: UploadFileInfo) => UploadFileInfo) {
  replaceFileList(
    channel,
    channel.fileList.value.map((fileInfo) => {
      const key = getUploadFileKey(fileInfo)
      if (key !== targetKey) return fileInfo
      return updater(fileInfo)
    }),
  )
}

function getUploadedUrls(channel: UploadChannel): string[] {
  return channel.fileList.value
    .filter((fileInfo) => typeof fileInfo.url === 'string' && fileInfo.url.length > 0 && fileInfo.status === 'finished')
    .map((fileInfo) => fileInfo.url as string)
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

  throw new Error('图片处理超时，请稍后重试')
}

async function resolveUploadedFileUrl(upload: { fileId: number; url?: string }): Promise<string> {
  if (upload.url) {
    return upload.url
  }

  return waitForUploadReady(upload.fileId)
}

async function startUpload(channel: UploadChannel, fileInfo: UploadFileInfo) {
  const key = getUploadFileKey(fileInfo)
  if (!key || channel.taskMap.has(key) || channel.urlMap.value[key]) {
    return
  }

  updateFileByKey(channel, key, (current) => ({
    ...current,
    status: 'uploading',
    percentage: Math.round((channel.progressMap.value[key] || 0) * 100),
  }))

  const task = (async () => {
    try {
      const upload = await worksApi.uploadImage(fileInfo.file as File, {
        uploadId: channel.sessionMap.value[key],
        retries: 3,
        onProgress: (progress) => {
          channel.progressMap.value[key] = progress
          updateFileByKey(channel, key, (current) => ({
            ...current,
            status: 'uploading',
            percentage: Math.round(progress * 100),
          }))
        },
      })
      channel.sessionMap.value[key] = upload.uploadId

      const finalUrl = await resolveUploadedFileUrl(upload)
      channel.urlMap.value[key] = finalUrl

      updateFileByKey(channel, key, (current) => ({
        ...current,
        status: 'finished',
        url: finalUrl,
        percentage: 100,
      }))
    } catch (error: any) {
      const messageText = error?.response?.data?.message || error?.message || '上传失败，请重试'
      channel.errorText.value = messageText
      updateFileByKey(channel, key, (current) => ({
        ...current,
        status: 'error',
        percentage: 0,
      }))
    } finally {
      channel.taskMap.delete(key)
    }
  })()

  channel.taskMap.set(key, task)
  await task
}

function syncUploadedUrlMap(channel: UploadChannel, fileList: UploadFileInfo[]) {
  const nextMap: Record<string, string> = {}
  for (const fileInfo of fileList) {
    const key = getUploadFileKey(fileInfo)
    if (!key || typeof fileInfo.url !== 'string' || fileInfo.status !== 'finished') continue
    nextMap[key] = fileInfo.url
  }
  channel.urlMap.value = nextMap
}

function handleUploadChange(channel: UploadChannel, fileList: UploadFileInfo[]) {
  if (channel.syncing.value) return

  channel.errorText.value = ''

  const limitedList = channel.max === 1 ? fileList.slice(-1) : fileList.slice(0, channel.max)
  const normalizedList = limitedList.map((fileInfo) => {
    const key = getUploadFileKey(fileInfo)
    if (!key) return fileInfo

    const uploadedUrl = channel.urlMap.value[key]
    if (uploadedUrl) {
      return withStatus(fileInfo, 'finished', {
        url: uploadedUrl,
        percentage: 100,
      })
    }

    return withStatus(fileInfo, fileInfo.status === 'error' ? 'error' : 'pending')
  })

  replaceFileList(channel, normalizedList)
  syncUploadedUrlMap(channel, normalizedList)

  for (const fileInfo of normalizedList) {
    if (!(fileInfo.file instanceof File)) continue
    const key = getUploadFileKey(fileInfo)
    if (!key || channel.urlMap.value[key]) continue
    void startUpload(channel, fileInfo)
  }
}

function handleUploadRemove(channel: UploadChannel, file: UploadFileInfo) {
  channel.fileList.value = channel.fileList.value.filter((item) => item.id !== file.id)
  const key = getUploadFileKey(file)
  if (!key) return

  delete channel.sessionMap.value[key]
  delete channel.progressMap.value[key]
  delete channel.urlMap.value[key]
}

function estimateDraftSizeBytes(): number {
  const textBytes = new TextEncoder().encode(
    `${formData.title}\n${formData.summary}\n${formData.content}\n${formData.tags.join(',')}`,
  ).length
  const uploadUrls = Array.from(new Set([
    ...getUploadedUrls(coverUpload),
    ...getUploadedUrls(galleryUpload),
  ]))
  const uploadBytes = uploadUrls.reduce((total, url) => total + new TextEncoder().encode(url).length, 0)
  return textBytes + uploadBytes
}

function buildDraftPayload() {
  const imageUrls = getUploadedUrls(galleryUpload)
  const coverImage = coverResolvedUrl.value || undefined
  return {
    id: editingWorkId.value || undefined,
    type: workType.value.toUpperCase() as CreateWorkData['type'],
    title: formData.title.trim() || '未命名草稿',
    description: formData.summary || undefined,
    summary: formData.summary || undefined,
    content: formData.content || undefined,
    tags: formData.tags.length > 0 ? [...formData.tags] : undefined,
    coverImage,
    images: imageUrls,
    draftSizeBytes: estimateDraftSizeBytes(),
  }
}

async function saveDraft(manual = false) {
  if (!manual || !canSaveDraft.value || draftSaving.value) return

  const hasAnyContent = Boolean(
    formData.title.trim()
      || formData.summary.trim()
      || hasMeaningfulEditorContent(formData.content)
      || formData.tags.length > 0
      || coverUpload.fileList.value.length > 0
      || galleryUpload.fileList.value.length > 0,
  )
  if (!hasAnyContent) return

  draftSaving.value = true
  try {
    const payload = buildDraftPayload()
    if (payload.draftSizeBytes > 500 * 1024 * 1024) {
      message.error('单条草稿不能超过 500MB')
      return
    }

    const res = await worksApi.saveDraft(payload)
    currentWork.value = res.data
    if (!editingWorkId.value) {
      await router.replace({
        name: 'WorkCreate',
        query: { workId: res.data.id },
      })
    }
    if (manual) {
      message.success('草稿已保存')
    }
  } catch (error: any) {
    if (manual) {
      message.error(error?.response?.data?.message || '草稿保存失败')
    }
  } finally {
    draftSaving.value = false
  }
}

function hasPendingUploads(channel: UploadChannel): boolean {
  return channel.fileList.value.some((item) => item.status === 'uploading' || item.status === 'pending')
}

function hasFailedUploads(channel: UploadChannel): boolean {
  return channel.fileList.value.some((item) => item.status === 'error')
}

function ensureUploadsReady(): boolean {
  if (hasPendingUploads(coverUpload) || hasPendingUploads(galleryUpload)) {
    message.warning('图片仍在上传或处理，请稍等完成后再提交')
    return false
  }

  if (hasFailedUploads(coverUpload)) {
    message.warning('封面上传失败，请删除后重新上传')
    return false
  }

  if (hasFailedUploads(galleryUpload)) {
    message.warning('作品图片里有上传失败的文件，请处理后再提交')
    return false
  }

  if (isIllustration.value && galleryUpload.fileList.value.length === 0) {
    message.warning('插画作品至少需要上传一张作品图')
    return false
  }

  return true
}

async function clearAndRedirect(target: string, successText: string) {
  resetForm()
  currentWork.value = null
  message.success(successText)
  await router.push(target)
}

function getReturnTab(): string {
  const status = currentWork.value?.status || 'PUBLISHED'
  return String(status).toLowerCase()
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  if (!ensureUploadsReady()) {
    return
  }

  loading.value = true
  try {
    const imageUrls = getUploadedUrls(galleryUpload)
    const submitData: Partial<CreateWorkData> = {
      title: formData.title.trim(),
      content: hasMeaningfulEditorContent(formData.content) ? formData.content : undefined,
      description: formData.summary.trim() || undefined,
      summary: formData.summary.trim() || undefined,
      tags: formData.tags.length > 0 ? [...formData.tags] : undefined,
      coverImage: coverResolvedUrl.value || undefined,
    }

    if (!isEditMode.value) {
      submitData.type = workType.value.toUpperCase() as CreateWorkData['type']
    }

    if (isIllustration.value) {
      submitData.images = imageUrls
      submitData.coverImage = coverResolvedUrl.value || imageUrls[0]
    }

    if (isEditMode.value) {
      if (!editingWorkId.value) {
        throw new Error('缺少作品编号')
      }

      await worksApi.updateWork(editingWorkId.value, submitData)
      if (isDraftWork.value) {
        await worksApi.submitDraft(editingWorkId.value)
        await clearAndRedirect('/creator?tab=pending', '草稿已提交，等待审核')
      } else {
        await clearAndRedirect(`/creator?tab=${getReturnTab()}`, '作品已更新')
      }
      return
    }

    await worksApi.createWork(submitData as CreateWorkData)
    await clearAndRedirect('/creator?tab=pending', '作品已提交，等待审核')
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message || '提交失败，请稍后重试'
    message.error(errorMsg)
  } finally {
    loading.value = false
  }
}

function getQuillInstance(): QuillInstance | null {
  return (quillInstance.value || editorRef.value?.getQuill?.() || null) as QuillInstance | null
}

function handleEditorReady() {
  quillInstance.value = editorRef.value?.getQuill?.() || null
}

function focusEditor(selectionStart?: number, selectionEnd?: number) {
  nextTick(() => {
    const quill = getQuillInstance()
    if (!quill) {
      editorRef.value?.focus?.()
      return
    }

    quill.focus()

    if (typeof selectionStart === 'number') {
      const length = typeof selectionEnd === 'number'
        ? Math.max(0, selectionEnd - selectionStart)
        : 0
      quill.setSelection(selectionStart, length, 'silent')
      return
    }

    const caret = Math.max(0, quill.getLength() - 1)
    quill.setSelection(caret, 0, 'silent')
  })
}

function insertHtmlIntoEditor(html: string) {
  const quill = getQuillInstance()
  if (!quill) {
    formData.content = `${formData.content}${html}`
    return
  }

  const selection = quill.getSelection(true)
  const index = selection?.index ?? Math.max(0, quill.getLength() - 1)
  const length = selection?.length ?? 0
  if (length > 0) {
    quill.deleteText(index, length, 'user')
  }
  quill.clipboard.dangerouslyPasteHTML(index, html, 'user')
  quill.focus()
}

function insertImageIntoEditor(url: string) {
  const quill = getQuillInstance()
  if (!quill) {
    insertHtmlIntoEditor(`<p><img src="${escapeHtml(url)}"></p>`)
    return
  }

  const selection = quill.getSelection(true)
  const index = selection?.index ?? Math.max(0, quill.getLength() - 1)
  const length = selection?.length ?? 0

  if (length > 0) {
    quill.deleteText(index, length, 'user')
  }

  let cursor = index
  if (cursor > 0 && quill.getText(cursor - 1, 1) !== '\n') {
    quill.insertText(cursor, '\n', 'user')
    cursor += 1
  }

  quill.insertEmbed(cursor, 'image', url, 'user')
  cursor += 1
  quill.insertText(cursor, '\n', 'user')
  quill.setSelection(cursor + 1, 0, 'silent')
  quill.focus()
}

function insertUploadedImage(url: string, _label: string) {
  if (!url) {
    message.warning('请先上传对应图片')
    return
  }
  insertImageIntoEditor(url)
}

function insertAttachmentLink(url: string, fileName: string) {
  const linkText = fileName.trim() || '附件'
  insertHtmlIntoEditor(
    `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">附件：${escapeHtml(linkText)}</a></p>`,
  )
}

function openAttachmentPicker() {
  if (attachmentInputRef.value) {
    attachmentInputRef.value.value = ''
  }
  attachmentInputRef.value?.click()
}

async function handleAttachmentImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  attachmentUploading.value = true
  attachmentUploadProgress.value = 0
  attachmentUploadName.value = file.name

  try {
    const upload = await worksApi.uploadImage(file, {
      retries: 3,
      onProgress: (progress) => {
        attachmentUploadProgress.value = progress
      },
    })
    const finalUrl = await resolveUploadedFileUrl(upload)

    if (file.type.startsWith('image/')) {
      insertImageIntoEditor(finalUrl)
    } else {
      insertAttachmentLink(finalUrl, file.name)
    }

    focusEditor()
    message.success('附件已插入正文')
  } catch (error: any) {
    message.error(error?.response?.data?.message || error?.message || '附件上传失败')
  } finally {
    attachmentUploading.value = false
    attachmentUploadProgress.value = 0
    input.value = ''
  }
}

function openTxtPicker() {
  if (txtInputRef.value) {
    txtInputRef.value.value = ''
  }
  txtInputRef.value?.click()
}

async function decodeTxtFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const encodings = ['utf-8', 'gb18030', 'gbk']

  for (const encoding of encodings) {
    try {
      return new TextDecoder(encoding as string, { fatal: true })
        .decode(buffer)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
    } catch {
      continue
    }
  }

  return new TextDecoder().decode(buffer).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

async function handleTxtImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const decodedText = (await decodeTxtFile(file)).trim()
    if (!decodedText) {
      message.warning('TXT 文件内容为空')
      return
    }

    const richHtml = convertPlainTextToRichHtml(decodedText)

    if (hasMeaningfulEditorContent(formData.content)) {
      const shouldReplace = window.confirm('检测到当前正文已经有内容。点击“确定”覆盖，点击“取消”将内容追加到末尾。')
      formData.content = shouldReplace
        ? richHtml
        : `${formData.content}${richHtml}`
    } else {
      formData.content = richHtml
    }

    importedTxtName.value = file.name
    focusEditor()
    message.success('TXT 内容已导入')
  } catch {
    message.error('TXT 解析失败，请确认文件编码或内容是否正常')
  } finally {
    input.value = ''
  }
}

onMounted(async () => {
  await initPage()
})

onBeforeUnmount(() => {
  quillInstance.value = null
})

watch(
  () => route.query.workId,
  async () => {
    if (!authStore.isLoggedIn) return
    await loadEditingWork()
  },
)
</script>

<template>
  <div class="create-work-page">
    <div class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-desc text-secondary">
        所有类型都支持独立上传封面；正文支持基础富文本工具栏和实时预览；小说还可以直接导入 TXT 提升录入速度。
      </p>
    </div>

    <NSpin :show="workLoading">
      <div class="sao-card page-card">
        <NAlert v-if="isEditMode && hasEditedBefore" type="warning" :show-icon="false" class="edit-alert">
          {{ editNoticeText }}
        </NAlert>

        <div class="type-section">
          <div class="section-title">作品类型</div>
          <NRadioGroup v-model:value="workType" :disabled="isEditMode">
            <div class="type-options">
              <NRadio value="illustration">插画</NRadio>
              <NRadio value="novel">小说</NRadio>
              <NRadio value="other">其他</NRadio>
            </div>
          </NRadioGroup>
        </div>

        <NForm ref="formRef" :model="formData" :rules="rules" label-placement="top">
          <NFormItem label="标题" path="title">
            <NInput
              v-model:value="formData.title"
              placeholder="请输入作品标题"
              maxlength="100"
              show-count
            />
          </NFormItem>

          <NFormItem label="简介">
            <NInput
              v-model:value="formData.summary"
              type="textarea"
              placeholder="用一两句话说明这篇作品想表达什么"
              :autosize="{ minRows: 2, maxRows: 4 }"
              maxlength="300"
              show-count
            />
          </NFormItem>

          <NFormItem label="标签" path="tags">
            <div class="tags-section">
              <NInput
                v-model:value="tagInput"
                placeholder="输入标签后按回车添加"
                @keyup.enter="handleTagInput"
              />
              <div v-if="formData.tags.length > 0" class="tags-list">
                <NTag
                  v-for="tag in formData.tags"
                  :key="tag"
                  closable
                  size="small"
                  @close="removeTag(tag)"
                >
                  {{ tag }}
                </NTag>
              </div>
            </div>
          </NFormItem>

          <NFormItem label="封面图">
            <div class="upload-panel">
              <div class="upload-panel-head">
                <div>
                  <strong>所有作品类型都支持独立封面</strong>
                  <p class="text-secondary">如果不上传独立封面，插画类型会默认使用第一张作品图作为封面。</p>
                </div>
              </div>

              <NUpload
                :file-list="coverUpload.fileList.value"
                :max="1"
                accept="image/*"
                list-type="image-card"
                @update:file-list="(files) => handleUploadChange(coverUpload, files)"
                @remove="({ file }) => handleUploadRemove(coverUpload, file)"
              >
                <div class="upload-trigger upload-trigger-small">
                  <NIcon :size="24" :component="ImageOutline" />
                  <span>上传封面</span>
                </div>
              </NUpload>

              <p v-if="coverUpload.errorText.value" class="upload-error">{{ coverUpload.errorText.value }}</p>
            </div>
          </NFormItem>

          <NFormItem v-if="isIllustration" label="作品图片">
            <div class="upload-panel">
              <div class="upload-panel-head">
                <div>
                  <strong>最多上传 20 张作品图</strong>
                  <p class="text-secondary">选择后会立刻开始上传和处理，正式提交时不会再额外等待图片上传。</p>
                </div>
                <div class="upload-summary text-secondary">
                  <span>共 {{ galleryStatsText.total }} 张</span>
                  <span v-if="galleryStatsText.uploading > 0">上传中 {{ galleryStatsText.uploading }}</span>
                  <span v-if="galleryStatsText.finished > 0">已完成 {{ galleryStatsText.finished }}</span>
                  <span v-if="galleryStatsText.failed > 0" class="text-danger">失败 {{ galleryStatsText.failed }}</span>
                </div>
              </div>

              <NUpload
                :file-list="galleryUpload.fileList.value"
                :max="20"
                multiple
                accept="image/*"
                list-type="image-card"
                @update:file-list="(files) => handleUploadChange(galleryUpload, files)"
                @remove="({ file }) => handleUploadRemove(galleryUpload, file)"
              >
                <div class="upload-trigger">
                  <NIcon :size="28" :component="CloudUploadOutline" />
                  <span>选择作品图片</span>
                </div>
              </NUpload>

              <p v-if="galleryUpload.errorText.value" class="upload-error">{{ galleryUpload.errorText.value }}</p>
            </div>
          </NFormItem>

          <NFormItem label="正文内容" path="content">
            <div class="editor-panel">
              <div class="editor-tools">
                <div class="tool-group">
                  <span class="tool-caption text-secondary">请在下方富文本框输入正文内容</span>
                </div>
                <div class="tool-group">
                  <NButton size="small" quaternary :loading="attachmentUploading" @click="openAttachmentPicker">
                    <template #icon>
                      <NIcon :component="AttachOutline" />
                    </template>
                    插入附件
                  </NButton>
                  <NButton v-if="isNovel" size="small" quaternary @click="openTxtPicker">
                    <template #icon>
                      <NIcon :component="DocumentTextOutline" />
                    </template>
                    导入 TXT
                  </NButton>
                </div>
              </div>

              <input
                v-if="isNovel"
                ref="txtInputRef"
                type="file"
                accept=".txt,text/plain"
                class="hidden-input"
                @change="handleTxtImport"
              />

              <div v-if="isNovel" class="editor-import-tip text-secondary">
                <span>TXT 导入适合先把正文快速带进来，再继续排版。</span>
                <span v-if="importedTxtName">最近导入：{{ importedTxtName }}</span>
              </div>

              <input
                ref="attachmentInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.md,.pdf,.doc,.docx"
                class="hidden-input"
                @change="handleAttachmentImport"
              />

              <div class="editor-import-tip text-secondary">
                <span>支持图片、GIF、视频、音频、TXT、Markdown、PDF、Word 附件；图片会直接插入正文，其它文件会插入下载链接。</span>
                <span v-if="attachmentUploading">正在上传：{{ attachmentUploadName }} · {{ Math.round(attachmentUploadProgress * 100) }}%</span>
                <span v-else-if="attachmentUploadName">最近插入：{{ attachmentUploadName }}</span>
              </div>

              <QuillEditor
                ref="editorRef"
                v-model:content="formData.content"
                content-type="html"
                theme="snow"
                :toolbar="editorToolbar"
                class="rich-editor"
                placeholder="在这里编辑正文，支持富文本排版与实时预览。"
                @ready="handleEditorReady"
              />

              <div v-if="renderedPreviewContent" class="preview-section">
                <div class="preview-title">实时预览</div>
                <div class="preview-content" v-html="renderedPreviewContent"></div>
              </div>
            </div>
          </NFormItem>

          <NFormItem>
            <div class="form-actions">
              <NButton @click="router.back()">取消</NButton>
              <NButton :loading="draftSaving" :disabled="!canSaveDraft" @click="saveDraft(true)">
                保存草稿
              </NButton>
              <NButton type="primary" class="sao-btn-primary" :loading="loading" @click="handleSubmit">
                <template #icon>
                  <NIcon :component="CreateOutline" />
                </template>
                {{ submitButtonText }}
              </NButton>
            </div>
          </NFormItem>
        </NForm>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
.create-work-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 12px 0 24px;
}

.page-card {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.page-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
}

.edit-alert {
  margin-bottom: -4px;
}

.type-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title,
.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--sao-text-primary);
}

.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}

.tags-section,
.upload-panel,
.editor-panel {
  width: 100%;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.upload-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;

  strong {
    display: block;
    margin-bottom: 6px;
    color: var(--sao-text-primary);
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

.upload-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
}

:deep(.n-upload) {
  width: 100%;
}

:deep(.n-upload-trigger) {
  width: 100%;
}

.upload-trigger {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--sao-border-color);
  border-radius: 12px;
}

.upload-trigger-small {
  min-height: 96px;
}

.upload-error,
.editor-import-tip {
  font-size: 12px;
}

.upload-error {
  color: var(--sao-danger);
}

.editor-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-tools {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  border: 1px solid var(--sao-border-color);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
}

.tool-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-caption {
  font-size: 13px;
  line-height: 1.6;
}

.editor-import-tip {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.6;
}

.hidden-input {
  display: none;
}

.rich-editor {
  width: 100%;
  border: 1px solid var(--sao-border-color);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}

.rich-editor :deep(.ql-toolbar.ql-snow) {
  border: none;
  border-bottom: 1px solid var(--sao-border-color);
  background: rgba(255, 255, 255, 0.02);
}

.rich-editor :deep(.ql-container.ql-snow) {
  border: none;
  min-height: 320px;
}

.rich-editor :deep(.ql-editor) {
  min-height: 320px;
  color: var(--sao-text-primary);
  font-size: 14px;
  line-height: 1.85;
}

.rich-editor :deep(.ql-editor.ql-blank::before) {
  color: var(--sao-text-secondary);
  font-style: normal;
}

.preview-section {
  padding-top: 16px;
  border-top: 1px solid var(--sao-border-color);
}

.preview-title {
  margin-bottom: 10px;
}

.preview-content {
  max-height: 560px;
  overflow: auto;
  padding-right: 8px;
  font-size: 14px;
  line-height: 1.95;
  color: var(--sao-text-secondary);

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin: 16px 0 8px;
    color: var(--sao-text-primary);
  }

  :deep(p) {
    margin-bottom: 12px;
  }

  :deep(img) {
    max-width: min(100%, 520px);
    display: block;
    margin: 16px auto;
    border-radius: 12px;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

@media (max-width: 768px) {
  .upload-panel-head,
  .editor-tools,
  .editor-import-tip,
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .preview-content {
    max-height: 360px;
  }
}
</style>
