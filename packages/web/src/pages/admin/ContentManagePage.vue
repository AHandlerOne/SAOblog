<script setup lang="ts">
import { h, onBeforeUnmount, onMounted, ref } from 'vue'
import { cmsApi } from '@/api/cms'
import type { Arc, Character, NewsItem, Wallpaper } from '@/api/cms'
import { worksApi } from '@/api/works'
import {
  NButton,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NImage,
  NInput,
  NModal,
  NProgress,
  NSelect,
  NSpace,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  NUpload,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules, UploadFileInfo } from 'naive-ui'
import { AddOutline, CloudUploadOutline } from '@vicons/ionicons5'

const message = useMessage()
const activeTab = ref('arcs')

function createImageUploadState() {
  const files = ref<UploadFileInfo[]>([])
  const previewUrl = ref('')
  const uploadProgress = ref(0)
  const uploadError = ref('')

  function revokePreview() {
    if (previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
  }

  function setPreview(url = '') {
    revokePreview()
    previewUrl.value = url
  }

  function syncExisting(url = '') {
    files.value = url
      ? [{
          id: `existing-${url}`,
          name: url.split('/').pop() || 'image',
          status: 'finished',
          url,
        }]
      : []
    setPreview(url)
    uploadProgress.value = 0
    uploadError.value = ''
  }

  function handleChange(fileList: UploadFileInfo[]) {
    files.value = fileList.slice(-1)
    const selected = files.value[0]
    if (selected?.file instanceof File) {
      setPreview(URL.createObjectURL(selected.file))
    } else {
      setPreview(selected?.url || '')
    }
    uploadError.value = ''
  }

  function handleRemove({ file }: { file: UploadFileInfo }) {
    files.value = files.value.filter((item) => item.id !== file.id)
    const next = files.value[0]
    if (next?.file instanceof File) {
      setPreview(URL.createObjectURL(next.file))
    } else {
      setPreview(next?.url || '')
    }
    uploadProgress.value = 0
  }

  function getSelectedFile(): File | null {
    const file = files.value[0]
    return file?.file instanceof File ? file.file : null
  }

  function destroy() {
    revokePreview()
  }

  return {
    files,
    previewUrl,
    uploadProgress,
    uploadError,
    syncExisting,
    handleChange,
    handleRemove,
    getSelectedFile,
    destroy,
  }
}

function getPreviewSource(previewUrl: string, fallback: string) {
  return previewUrl || fallback || ''
}

async function waitForUploadReady(fileId: number): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const res = await worksApi.getUploadStatus(fileId)
    if (res.data.status === 'READY' && res.data.url) {
      return res.data.url
    }
    if (res.data.status === 'FAILED') {
      throw new Error('Image processing failed')
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Image processing timed out')
}

async function resolveImageUrl(
  uploadState: ReturnType<typeof createImageUploadState>,
  currentValue: string,
): Promise<string> {
  const file = uploadState.getSelectedFile()
  if (!file) {
    return currentValue.trim()
  }

  uploadState.uploadProgress.value = 0
  uploadState.uploadError.value = ''
  try {
    const upload = await worksApi.uploadImage(file, {
      retries: 3,
      onProgress: (progress) => {
        uploadState.uploadProgress.value = progress
      },
    })
    const url = await waitForUploadReady(upload.fileId)
    uploadState.syncExisting(url)
    return url
  } catch (error: any) {
    uploadState.uploadError.value = error?.message || 'Image upload failed'
    throw error
  } finally {
    uploadState.uploadProgress.value = 0
  }
}

const arcCoverUpload = createImageUploadState()
const charAvatarUpload = createImageUploadState()
const wpImageUpload = createImageUploadState()
const newsCoverUpload = createImageUploadState()

const arcs = ref<Arc[]>([])
const arcsLoading = ref(false)
const arcModalVisible = ref(false)
const arcEditing = ref<Arc | null>(null)
const arcFormRef = ref<FormInst | null>(null)
const arcForm = ref({
  name: '',
  nameJa: '',
  nameEn: '',
  synopsis: '',
  season: '',
  coverImage: '',
  sortOrder: 0,
})

const arcRules: FormRules = {
  name: [{ required: true, message: '请输入篇章标题', trigger: 'blur' }],
}

const arcColumns: DataTableColumns<Arc> = [
  { title: '标题', key: 'name', minWidth: 160 },
  { title: '英文名', key: 'nameEn', width: 140 },
  { title: '季度', key: 'season', width: 120 },
  { title: '排序', key: 'sortOrder', width: 80 },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (row: Arc) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openArcModal(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteArc(row.id) }, { default: () => '删除' }),
      ],
    }),
  },
]

async function fetchArcs() {
  arcsLoading.value = true
  try {
    const res = await cmsApi.getArcs({ pageSize: 100 })
    arcs.value = res.data
  } catch {
    message.error('加载篇章失败')
  } finally {
    arcsLoading.value = false
  }
}

function openArcModal(arc?: Arc) {
  arcEditing.value = arc || null
  if (arc) {
    arcForm.value = {
      name: arc.name,
      nameJa: arc.nameJa || '',
      nameEn: arc.nameEn || '',
      synopsis: arc.synopsis || '',
      season: arc.season || '',
      coverImage: arc.coverImage || '',
      sortOrder: arc.sortOrder || 0,
    }
    arcCoverUpload.syncExisting(arc.coverImage || '')
  } else {
    arcForm.value = {
      name: '',
      nameJa: '',
      nameEn: '',
      synopsis: '',
      season: '',
      coverImage: '',
      sortOrder: 0,
    }
    arcCoverUpload.syncExisting('')
  }
  arcModalVisible.value = true
}

async function saveArc() {
  try {
    await arcFormRef.value?.validate()
  } catch {
    return
  }

  try {
    arcForm.value.coverImage = await resolveImageUrl(arcCoverUpload, arcForm.value.coverImage)
    if (arcEditing.value) {
      await cmsApi.updateArc(arcEditing.value.id, arcForm.value)
      message.success('篇章已更新')
    } else {
      await cmsApi.createArc(arcForm.value)
      message.success('篇章已创建')
    }
    arcModalVisible.value = false
    await fetchArcs()
  } catch (error: any) {
    message.error(error?.message || '保存篇章失败')
  }
}

async function deleteArc(id: number) {
  try {
    await cmsApi.deleteArc(id)
    message.success('篇章已删除')
    await fetchArcs()
  } catch {
    message.error('删除篇章失败')
  }
}

const characters = ref<Character[]>([])
const charsLoading = ref(false)
const charModalVisible = ref(false)
const charEditing = ref<Character | null>(null)
const charFormRef = ref<FormInst | null>(null)
const charForm = ref({
  name: '',
  nameJa: '',
  nameEn: '',
  cv: '',
  description: '',
  avatar: '',
  weapon: '',
  affiliation: '',
})

const charRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

const charColumns: DataTableColumns<Character> = [
  { title: '名称', key: 'name', minWidth: 120 },
  { title: 'CV', key: 'cv', width: 140 },
  { title: '武器', key: 'weapon', width: 140 },
  { title: '阵营', key: 'affiliation', width: 140 },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (row: Character) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openCharModal(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteChar(row.id) }, { default: () => '删除' }),
      ],
    }),
  },
]

async function fetchCharacters() {
  charsLoading.value = true
  try {
    const res = await cmsApi.getCharacters({ pageSize: 100 })
    characters.value = res.data
  } catch {
    message.error('加载角色失败')
  } finally {
    charsLoading.value = false
  }
}

function openCharModal(char?: Character) {
  charEditing.value = char || null
  if (char) {
    charForm.value = {
      name: char.name,
      nameJa: char.nameJa || '',
      nameEn: char.nameEn || '',
      cv: char.cv || '',
      description: char.description || '',
      avatar: char.avatar || '',
      weapon: char.weapon || '',
      affiliation: char.affiliation || '',
    }
    charAvatarUpload.syncExisting(char.avatar || '')
  } else {
    charForm.value = {
      name: '',
      nameJa: '',
      nameEn: '',
      cv: '',
      description: '',
      avatar: '',
      weapon: '',
      affiliation: '',
    }
    charAvatarUpload.syncExisting('')
  }
  charModalVisible.value = true
}

async function saveChar() {
  try {
    await charFormRef.value?.validate()
  } catch {
    return
  }

  try {
    charForm.value.avatar = await resolveImageUrl(charAvatarUpload, charForm.value.avatar)
    if (!charForm.value.avatar) {
      message.error('请上传角色头像或填写头像 URL')
      return
    }
    if (charEditing.value) {
      await cmsApi.updateCharacter(charEditing.value.id, charForm.value)
      message.success('角色已更新')
    } else {
      await cmsApi.createCharacter(charForm.value)
      message.success('角色已创建')
    }
    charModalVisible.value = false
    await fetchCharacters()
  } catch (error: any) {
    message.error(error?.message || '保存角色失败')
  }
}

async function deleteChar(id: number) {
  try {
    await cmsApi.deleteCharacter(id)
    message.success('角色已删除')
    await fetchCharacters()
  } catch {
    message.error('删除角色失败')
  }
}

const wallpapers = ref<Wallpaper[]>([])
const wpLoading = ref(false)
const wpModalVisible = ref(false)
const wpEditing = ref<Wallpaper | null>(null)
const wpFormRef = ref<FormInst | null>(null)
const wpForm = ref({
  title: '',
  imageUrl: '',
  characterId: undefined as number | undefined,
  arcId: undefined as number | undefined,
  resolution: '',
  sourceUrl: '',
  tags: [] as string[],
})

const wpRules: FormRules = {
  title: [{ required: true, message: '请输入壁纸标题', trigger: 'blur' }],
}

const wpColumns: DataTableColumns<Wallpaper> = [
  { title: '标题', key: 'title', minWidth: 180 },
  { title: '角色', key: 'character', width: 120, render: (row: Wallpaper) => row.character?.name || '-' },
  { title: '篇章', key: 'arc', width: 140, render: (row: Wallpaper) => row.arc?.name || '-' },
  { title: '分辨率', key: 'resolution', width: 120 },
  { title: '来源', key: 'sourceUrl', width: 180, render: (row: Wallpaper) => row.sourceUrl || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (row: Wallpaper) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openWpModal(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteWp(row.id) }, { default: () => '删除' }),
      ],
    }),
  },
]

async function fetchWallpapers() {
  wpLoading.value = true
  try {
    const res = await cmsApi.getWallpapers({ pageSize: 100 })
    wallpapers.value = res.data
  } catch {
    message.error('加载壁纸失败')
  } finally {
    wpLoading.value = false
  }
}

function openWpModal(wp?: Wallpaper) {
  wpEditing.value = wp || null
  if (wp) {
    wpForm.value = {
      title: wp.title,
      imageUrl: wp.imageUrl,
      characterId: wp.character?.id,
      arcId: wp.arc?.id,
      resolution: wp.resolution || '',
      sourceUrl: wp.sourceUrl || '',
      tags: wp.tags || [],
    }
    wpImageUpload.syncExisting(wp.imageUrl || '')
  } else {
    wpForm.value = {
      title: '',
      imageUrl: '',
      characterId: undefined,
      arcId: undefined,
      resolution: '',
      sourceUrl: '',
      tags: [],
    }
    wpImageUpload.syncExisting('')
  }
  wpModalVisible.value = true
}

async function saveWp() {
  try {
    await wpFormRef.value?.validate()
  } catch {
    return
  }

  try {
    wpForm.value.imageUrl = await resolveImageUrl(wpImageUpload, wpForm.value.imageUrl)
    if (!wpForm.value.imageUrl) {
      message.error('请上传壁纸图片或填写图片 URL')
      return
    }
    if (wpEditing.value) {
      await cmsApi.updateWallpaper(wpEditing.value.id, wpForm.value)
      message.success('壁纸已更新')
    } else {
      await cmsApi.createWallpaper(wpForm.value)
      message.success('壁纸已创建')
    }
    wpModalVisible.value = false
    await fetchWallpapers()
  } catch (error: any) {
    message.error(error?.message || '保存壁纸失败')
  }
}

async function deleteWp(id: number) {
  try {
    await cmsApi.deleteWallpaper(id)
    message.success('壁纸已删除')
    await fetchWallpapers()
  } catch {
    message.error('删除壁纸失败')
  }
}

const newsItems = ref<NewsItem[]>([])
const newsLoading = ref(false)
const newsModalVisible = ref(false)
const newsEditing = ref<NewsItem | null>(null)
const newsFormRef = ref<FormInst | null>(null)
const newsForm = ref({
  title: '',
  content: '',
  summary: '',
  coverImage: '',
  source: '',
  category: '',
  tags: [] as string[],
})
const newsTagInput = ref('')

const newsCategoryOptions = [
  { label: '动画', value: 'ANIME' },
  { label: '电影', value: 'MOVIE' },
  { label: '游戏', value: 'GAME' },
  { label: '作者', value: 'AUTHOR' },
  { label: '周边', value: 'MERCHANDISE' },
  { label: '其他', value: 'OTHER' },
]

const newsRules: FormRules = {
  title: [{ required: true, message: '请输入资讯标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入资讯正文', trigger: 'blur' }],
}

const newsColumns: DataTableColumns<NewsItem> = [
  { title: '标题', key: 'title', minWidth: 220 },
  { title: '分类', key: 'category', width: 120, render: (row: NewsItem) => row.category || '-' },
  { title: '来源', key: 'source', width: 120, render: (row: NewsItem) => row.source || '-' },
  {
    title: '发布时间',
    key: 'publishedAt',
    width: 160,
    render: (row: NewsItem) => {
      if (!row.publishedAt) return '-'
      const date = new Date(row.publishedAt)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (row: NewsItem) => h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, { size: 'small', onClick: () => openNewsModal(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', onClick: () => deleteNews(row.id) }, { default: () => '删除' }),
      ],
    }),
  },
]

async function fetchNews() {
  newsLoading.value = true
  try {
    const res = await cmsApi.getNews({ pageSize: 100 })
    newsItems.value = res.data
  } catch {
    message.error('加载资讯失败')
  } finally {
    newsLoading.value = false
  }
}

function openNewsModal(news?: NewsItem) {
  newsEditing.value = news || null
  if (news) {
    newsForm.value = {
      title: news.title,
      content: news.content,
      summary: news.summary || '',
      coverImage: news.coverImage || '',
      source: news.source || '',
      category: news.category || '',
      tags: news.tags || [],
    }
    newsCoverUpload.syncExisting(news.coverImage || '')
  } else {
    newsForm.value = {
      title: '',
      content: '',
      summary: '',
      coverImage: '',
      source: '',
      category: '',
      tags: [],
    }
    newsCoverUpload.syncExisting('')
  }
  newsTagInput.value = ''
  newsModalVisible.value = true
}

function handleNewsTagInput() {
  const tag = newsTagInput.value.trim()
  if (tag && !newsForm.value.tags.includes(tag)) {
    newsForm.value.tags.push(tag)
  }
  newsTagInput.value = ''
}

function removeNewsTag(tag: string) {
  newsForm.value.tags = newsForm.value.tags.filter((item) => item !== tag)
}

async function saveNews() {
  try {
    await newsFormRef.value?.validate()
  } catch {
    return
  }

  try {
    newsForm.value.coverImage = await resolveImageUrl(newsCoverUpload, newsForm.value.coverImage)
    if (newsEditing.value) {
      await cmsApi.updateNews(newsEditing.value.id, newsForm.value)
      message.success('资讯已更新')
    } else {
      await cmsApi.createNews(newsForm.value)
      message.success('资讯已创建')
    }
    newsModalVisible.value = false
    await fetchNews()
  } catch (error: any) {
    message.error(error?.message || '保存资讯失败')
  }
}

async function deleteNews(id: number) {
  try {
    await cmsApi.deleteNews(id)
    message.success('资讯已删除')
    await fetchNews()
  } catch {
    message.error('删除资讯失败')
  }
}

onMounted(() => {
  void fetchArcs()
  void fetchCharacters()
  void fetchWallpapers()
  void fetchNews()
})

onBeforeUnmount(() => {
  arcCoverUpload.destroy()
  charAvatarUpload.destroy()
  wpImageUpload.destroy()
  newsCoverUpload.destroy()
})
</script>

<template>
  <div class="content-manage-page">
    <div class="page-header">
      <h1 class="page-title">内容管理</h1>
    </div>

    <NTabs v-model:value="activeTab" type="line" class="content-tabs">
      <NTabPane name="arcs" tab="篇章">
        <div class="tab-header">
          <NButton type="primary" size="small" @click="openArcModal()">
            <template #icon>
              <NIcon :component="AddOutline" />
            </template>
            新增篇章
          </NButton>
        </div>
        <NSpin v-if="arcsLoading" class="page-loading" size="small" />
        <NEmpty v-else-if="arcs.length === 0" description="暂无篇章" />
        <NDataTable v-else :columns="arcColumns" :data="arcs" :bordered="false" size="small" class="data-table" />
      </NTabPane>

      <NTabPane name="characters" tab="角色">
        <div class="tab-header">
          <NButton type="primary" size="small" @click="openCharModal()">
            <template #icon>
              <NIcon :component="AddOutline" />
            </template>
            新增角色
          </NButton>
        </div>
        <NSpin v-if="charsLoading" class="page-loading" size="small" />
        <NEmpty v-else-if="characters.length === 0" description="暂无角色" />
        <NDataTable
          v-else
          :columns="charColumns"
          :data="characters"
          :bordered="false"
          :scroll-x="720"
          size="small"
          class="data-table"
        />
      </NTabPane>

      <NTabPane name="wallpapers" tab="壁纸">
        <div class="tab-header">
          <NButton type="primary" size="small" @click="openWpModal()">
            <template #icon>
              <NIcon :component="AddOutline" />
            </template>
            新增壁纸
          </NButton>
        </div>
        <NSpin v-if="wpLoading" class="page-loading" size="small" />
        <NEmpty v-else-if="wallpapers.length === 0" description="暂无壁纸" />
        <NDataTable
          v-else
          :columns="wpColumns"
          :data="wallpapers"
          :bordered="false"
          :scroll-x="760"
          size="small"
          class="data-table"
        />
      </NTabPane>

      <NTabPane name="news" tab="资讯">
        <div class="tab-header">
          <NButton type="primary" size="small" @click="openNewsModal()">
            <template #icon>
              <NIcon :component="AddOutline" />
            </template>
            新增资讯
          </NButton>
        </div>
        <NSpin v-if="newsLoading" class="page-loading" size="small" />
        <NEmpty v-else-if="newsItems.length === 0" description="暂无资讯" />
        <NDataTable
          v-else
          :columns="newsColumns"
          :data="newsItems"
          :bordered="false"
          :scroll-x="820"
          size="small"
          class="data-table"
        />
      </NTabPane>
    </NTabs>

    <NModal
      v-model:show="arcModalVisible"
      preset="card"
      :title="arcEditing ? '编辑篇章' : '新增篇章'"
      :style="{ maxWidth: '640px', width: '92vw' }"
    >
      <NForm ref="arcFormRef" :model="arcForm" :rules="arcRules" label-placement="top">
        <NFormItem label="标题" path="name">
          <NInput v-model:value="arcForm.name" placeholder="请输入篇章标题" />
        </NFormItem>
        <NFormItem label="日文名">
          <NInput v-model:value="arcForm.nameJa" placeholder="请输入日文名" />
        </NFormItem>
        <NFormItem label="英文名">
          <NInput v-model:value="arcForm.nameEn" placeholder="Enter English title" />
        </NFormItem>
        <NFormItem label="季度">
          <NInput v-model:value="arcForm.season" placeholder="例如：SAO Alicization" />
        </NFormItem>
        <NFormItem label="排序">
          <NInput
            :value="String(arcForm.sortOrder)"
            placeholder="0"
            @update:value="(value) => { arcForm.sortOrder = Number(value) || 0 }"
          />
        </NFormItem>
        <NFormItem label="剧情简介">
          <NInput
            v-model:value="arcForm.synopsis"
            type="textarea"
            placeholder="请输入篇章简介"
            :autosize="{ minRows: 4 }"
          />
        </NFormItem>
        <NFormItem label="封面图 URL">
          <div class="image-upload-field">
            <div v-if="getPreviewSource(arcCoverUpload.previewUrl.value, arcForm.coverImage)" class="image-preview">
              <NImage
                :src="getPreviewSource(arcCoverUpload.previewUrl.value, arcForm.coverImage)"
                class="preview-image"
                object-fit="cover"
                preview-disabled
              />
            </div>
            <NUpload
              :file-list="arcCoverUpload.files.value"
              :max="1"
              accept="image/*"
              list-type="image-card"
              @update:file-list="arcCoverUpload.handleChange"
              @remove="arcCoverUpload.handleRemove"
            >
              <div class="upload-trigger">
                <NIcon :size="20" :component="CloudUploadOutline" />
                <span>Upload cover</span>
              </div>
            </NUpload>
            <p class="upload-hint text-secondary">Upload an image file or keep using a remote URL.</p>
            <NInput v-model:value="arcForm.coverImage" placeholder="https://..." />
            <NProgress
              v-if="arcCoverUpload.uploadProgress.value > 0"
              type="line"
              :percentage="Math.round(arcCoverUpload.uploadProgress.value * 100)"
              :height="8"
            />
            <p v-if="arcCoverUpload.uploadError.value" class="upload-error">{{ arcCoverUpload.uploadError.value }}</p>
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="arcModalVisible = false">取消</NButton>
          <NButton type="primary" @click="saveArc">保存</NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="charModalVisible"
      preset="card"
      :title="charEditing ? '编辑角色' : '新增角色'"
      :style="{ maxWidth: '640px', width: '92vw' }"
    >
      <NForm ref="charFormRef" :model="charForm" :rules="charRules" label-placement="top">
        <NFormItem label="名称" path="name">
          <NInput v-model:value="charForm.name" placeholder="请输入角色名称" />
        </NFormItem>
        <NFormItem label="日文名">
          <NInput v-model:value="charForm.nameJa" placeholder="请输入日文名" />
        </NFormItem>
        <NFormItem label="英文名">
          <NInput v-model:value="charForm.nameEn" placeholder="Enter English name" />
        </NFormItem>
        <NFormItem label="CV">
          <NInput v-model:value="charForm.cv" placeholder="请输入声优" />
        </NFormItem>
        <NFormItem label="武器">
          <NInput v-model:value="charForm.weapon" placeholder="请输入角色武器" />
        </NFormItem>
        <NFormItem label="阵营">
          <NInput v-model:value="charForm.affiliation" placeholder="请输入所属阵营" />
        </NFormItem>
        <NFormItem label="角色描述">
          <NInput
            v-model:value="charForm.description"
            type="textarea"
            placeholder="请输入角色描述"
            :autosize="{ minRows: 4 }"
          />
        </NFormItem>
        <NFormItem label="头像 URL">
          <div class="image-upload-field">
            <div v-if="getPreviewSource(charAvatarUpload.previewUrl.value, charForm.avatar)" class="image-preview avatar-preview-box">
              <NImage
                :src="getPreviewSource(charAvatarUpload.previewUrl.value, charForm.avatar)"
                class="preview-image"
                object-fit="cover"
                preview-disabled
              />
            </div>
            <NUpload
              :file-list="charAvatarUpload.files.value"
              :max="1"
              accept="image/*"
              list-type="image-card"
              @update:file-list="charAvatarUpload.handleChange"
              @remove="charAvatarUpload.handleRemove"
            >
              <div class="upload-trigger">
                <NIcon :size="20" :component="CloudUploadOutline" />
                <span>Upload avatar</span>
              </div>
            </NUpload>
            <p class="upload-hint text-secondary">Use JPG or PNG. Square images work best.</p>
            <NInput v-model:value="charForm.avatar" placeholder="https://..." />
            <NProgress
              v-if="charAvatarUpload.uploadProgress.value > 0"
              type="line"
              :percentage="Math.round(charAvatarUpload.uploadProgress.value * 100)"
              :height="8"
            />
            <p v-if="charAvatarUpload.uploadError.value" class="upload-error">{{ charAvatarUpload.uploadError.value }}</p>
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="charModalVisible = false">取消</NButton>
          <NButton type="primary" @click="saveChar">保存</NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="wpModalVisible"
      preset="card"
      :title="wpEditing ? '编辑壁纸' : '新增壁纸'"
      :style="{ maxWidth: '640px', width: '92vw' }"
    >
      <NForm ref="wpFormRef" :model="wpForm" :rules="wpRules" label-placement="top">
        <NFormItem label="标题" path="title">
          <NInput v-model:value="wpForm.title" placeholder="请输入壁纸标题" />
        </NFormItem>
        <NFormItem label="图片 URL" path="imageUrl">
          <div class="image-upload-field">
            <div v-if="getPreviewSource(wpImageUpload.previewUrl.value, wpForm.imageUrl)" class="image-preview">
              <NImage
                :src="getPreviewSource(wpImageUpload.previewUrl.value, wpForm.imageUrl)"
                class="preview-image"
                object-fit="cover"
                preview-disabled
              />
            </div>
            <NUpload
              :file-list="wpImageUpload.files.value"
              :max="1"
              accept="image/*"
              list-type="image-card"
              @update:file-list="wpImageUpload.handleChange"
              @remove="wpImageUpload.handleRemove"
            >
              <div class="upload-trigger">
                <NIcon :size="20" :component="CloudUploadOutline" />
                <span>Upload wallpaper</span>
              </div>
            </NUpload>
            <p class="upload-hint text-secondary">Use a high-resolution image that matches the resolution field.</p>
            <NInput v-model:value="wpForm.imageUrl" placeholder="https://..." />
            <NProgress
              v-if="wpImageUpload.uploadProgress.value > 0"
              type="line"
              :percentage="Math.round(wpImageUpload.uploadProgress.value * 100)"
              :height="8"
            />
            <p v-if="wpImageUpload.uploadError.value" class="upload-error">{{ wpImageUpload.uploadError.value }}</p>
          </div>
        </NFormItem>
        <NFormItem label="绑定角色">
          <NSelect
            v-model:value="wpForm.characterId"
            :options="characters.map((item) => ({ label: item.name, value: item.id }))"
            placeholder="可选"
            clearable
          />
        </NFormItem>
        <NFormItem label="绑定篇章">
          <NSelect
            v-model:value="wpForm.arcId"
            :options="arcs.map((item) => ({ label: item.name, value: item.id }))"
            placeholder="可选"
            clearable
          />
        </NFormItem>
        <NFormItem label="分辨率">
          <NInput v-model:value="wpForm.resolution" placeholder="1920x1080" />
        </NFormItem>
        <NFormItem label="来源 URL">
          <NInput v-model:value="wpForm.sourceUrl" placeholder="请输入来源地址" />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="wpModalVisible = false">取消</NButton>
          <NButton type="primary" @click="saveWp">保存</NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="newsModalVisible"
      preset="card"
      :title="newsEditing ? '编辑资讯' : '新增资讯'"
      :style="{ maxWidth: '760px', width: '92vw' }"
    >
      <NForm ref="newsFormRef" :model="newsForm" :rules="newsRules" label-placement="top">
        <NFormItem label="标题" path="title">
          <NInput v-model:value="newsForm.title" placeholder="请输入资讯标题" />
        </NFormItem>
        <NFormItem label="分类">
          <NSelect v-model:value="newsForm.category" :options="newsCategoryOptions" placeholder="请选择分类" />
        </NFormItem>
        <NFormItem label="来源">
          <NInput v-model:value="newsForm.source" placeholder="请输入来源" />
        </NFormItem>
        <NFormItem label="封面图 URL">
          <div class="image-upload-field">
            <div v-if="getPreviewSource(newsCoverUpload.previewUrl.value, newsForm.coverImage)" class="image-preview">
              <NImage
                :src="getPreviewSource(newsCoverUpload.previewUrl.value, newsForm.coverImage)"
                class="preview-image"
                object-fit="cover"
                preview-disabled
              />
            </div>
            <NUpload
              :file-list="newsCoverUpload.files.value"
              :max="1"
              accept="image/*"
              list-type="image-card"
              @update:file-list="newsCoverUpload.handleChange"
              @remove="newsCoverUpload.handleRemove"
            >
              <div class="upload-trigger">
                <NIcon :size="20" :component="CloudUploadOutline" />
                <span>Upload cover</span>
              </div>
            </NUpload>
            <p class="upload-hint text-secondary">This image is used in the news list and detail page.</p>
            <NInput v-model:value="newsForm.coverImage" placeholder="https://..." />
            <NProgress
              v-if="newsCoverUpload.uploadProgress.value > 0"
              type="line"
              :percentage="Math.round(newsCoverUpload.uploadProgress.value * 100)"
              :height="8"
            />
            <p v-if="newsCoverUpload.uploadError.value" class="upload-error">{{ newsCoverUpload.uploadError.value }}</p>
          </div>
        </NFormItem>
        <NFormItem label="摘要">
          <NInput
            v-model:value="newsForm.summary"
            type="textarea"
            placeholder="请输入摘要"
            :autosize="{ minRows: 2 }"
          />
        </NFormItem>
        <NFormItem label="正文" path="content">
          <NInput
            v-model:value="newsForm.content"
            type="textarea"
            placeholder="请输入正文内容"
            :autosize="{ minRows: 8 }"
          />
        </NFormItem>
        <NFormItem label="标签">
          <div class="tags-section">
            <NInput
              v-model:value="newsTagInput"
              placeholder="输入标签后按回车"
              size="small"
              @keyup.enter="handleNewsTagInput"
            />
            <div v-if="newsForm.tags.length > 0" class="tags-list">
              <NTag v-for="tag in newsForm.tags" :key="tag" closable size="small" @close="removeNewsTag(tag)">
                {{ tag }}
              </NTag>
            </div>
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="modal-footer">
          <NButton @click="newsModalVisible = false">取消</NButton>
          <NButton type="primary" @click="saveNews">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.content-manage-page {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.content-tabs {
  :deep(.n-tabs-tab) {
    color: var(--sao-text-secondary);

    &.n-tabs-tab--active {
      color: var(--sao-accent);
    }
  }

  :deep(.n-tabs-pane-wrapper) {
    padding-top: 16px;
  }
}

.tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.page-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.data-table {
  :deep(.n-data-table) {
    --n-text-color: var(--sao-text-primary);
    --n-th-text-color: var(--sao-text-secondary);
    --n-td-text-color: var(--sao-text-primary);
    --n-border-color: var(--sao-border-color);
    --n-td-color: var(--sao-card-bg);
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.tags-section {
  width: 100%;
}

.tags-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.image-upload-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-preview {
  width: 100%;
  max-width: 360px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--sao-border-color);
  background: var(--sao-card-bg);
}

.avatar-preview-box {
  max-width: 180px;
  aspect-ratio: 1 / 1;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.upload-trigger {
  min-width: 160px;
  min-height: 96px;
  border: 1px dashed var(--sao-border-color);
  border-radius: 12px;
  background: var(--sao-card-bg);
  color: var(--sao-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.upload-hint {
  margin: -2px 0 0;
  font-size: 12px;
}

.upload-error {
  margin: 0;
  font-size: 12px;
  color: var(--sao-danger);
}
</style>
