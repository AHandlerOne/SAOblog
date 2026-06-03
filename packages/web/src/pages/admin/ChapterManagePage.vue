<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { cmsApi } from '@/api/cms'
import type { Arc, ArcChapter } from '@/api/cms'
import { NButton, NCard, NDataTable, NEmpty, NForm, NFormItem, NInput, NModal, NPagination, NSelect, NSpin, NSwitch, useMessage } from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'

const message = useMessage()

const arcs = ref<Arc[]>([])
const selectedArcId = ref<number | null>(null)

const loading = ref(false)
const currentPage = ref(1)
const pageSize = 10
const totalPages = ref(1)
const chapters = ref<ArcChapter[]>([])

const chapterModalVisible = ref(false)
const chapterEditing = ref<ArcChapter | null>(null)
const chapterFormRef = ref<FormInst | null>(null)
const chapterForm = ref({
  title: '',
  content: '',
  chapterNumber: 1,
  isSpoiler: false,
})

const chapterRules: FormRules = {
  title: [{ required: true, message: '请输入章节标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入章节内容', trigger: 'blur' }],
}

const arcOptions = computed(() => arcs.value.map(item => ({ label: item.name, value: item.id })))

const columns: DataTableColumns<ArcChapter> = [
  { title: '章节号', key: 'chapterNumber', width: 80 },
  { title: '标题', key: 'title', minWidth: 180 },
  {
    title: '剧透',
    key: 'isSpoiler',
    width: 80,
    render: row => (row.isSpoiler ? '是' : '否'),
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 140,
    render: row => formatDate(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: row => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', onClick: () => openModal(row) }, { default: () => '编辑' }),
      h(NButton, { size: 'small', type: 'error', onClick: () => removeChapter(row.id) }, { default: () => '删除' }),
    ]),
  },
]

async function fetchArcs() {
  const res = await cmsApi.getArcs({ pageSize: 100 })
  arcs.value = res.data
  const firstArc = arcs.value[0]
  if (!selectedArcId.value && firstArc) {
    selectedArcId.value = firstArc.id
  }
}

async function fetchChapters() {
  if (!selectedArcId.value) {
    chapters.value = []
    totalPages.value = 1
    return
  }
  loading.value = true
  try {
    const res = await cmsApi.getArcChapters(selectedArcId.value, {
      page: currentPage.value,
      pageSize,
      hideSpoilers: false,
    })
    chapters.value = res.data
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize))
  } catch {
    message.error('加载章节失败')
  } finally {
    loading.value = false
  }
}

function openModal(chapter?: ArcChapter) {
  chapterEditing.value = chapter || null
  if (chapter) {
    chapterForm.value = {
      title: chapter.title,
      content: chapter.content,
      chapterNumber: chapter.chapterNumber,
      isSpoiler: chapter.isSpoiler,
    }
  } else {
    chapterForm.value = {
      title: '',
      content: '',
      chapterNumber: 1,
      isSpoiler: false,
    }
  }
  chapterModalVisible.value = true
}

async function saveChapter() {
  if (!selectedArcId.value) {
    message.warning('请先选择篇章')
    return
  }
  try {
    await chapterFormRef.value?.validate()
  } catch {
    return
  }
  try {
    if (chapterEditing.value) {
      await cmsApi.updateArcChapter(selectedArcId.value, chapterEditing.value.id, chapterForm.value)
      message.success('更新成功')
    } else {
      await cmsApi.createArcChapter(selectedArcId.value, chapterForm.value)
      message.success('创建成功')
    }
    chapterModalVisible.value = false
    fetchChapters()
  } catch {
    message.error('保存失败')
  }
}

async function removeChapter(chapterId: number) {
  if (!selectedArcId.value) {
    return
  }
  try {
    await cmsApi.deleteArcChapter(selectedArcId.value, chapterId)
    message.success('删除成功')
    fetchChapters()
  } catch {
    message.error('删除失败')
  }
}

function handleArcChange() {
  currentPage.value = 1
  fetchChapters()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchChapters()
}

function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '-'
  }
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(async () => {
  await fetchArcs()
  await fetchChapters()
})
</script>

<template>
  <div class="chapter-manage-page">
    <div class="page-header">
      <h1 class="page-title">章节管理</h1>
      <div class="header-actions">
        <NSelect
          v-model:value="selectedArcId"
          :options="arcOptions"
          placeholder="选择篇章"
          style="width: 240px;"
          @update:value="handleArcChange"
        />
        <NButton type="primary" @click="openModal()">新增章节</NButton>
      </div>
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty
      v-else-if="!selectedArcId"
      description="暂无篇章，请先在内容管理里创建篇章"
      class="page-empty"
    />

    <NEmpty
      v-else-if="chapters.length === 0"
      description="当前篇章暂无章节"
      class="page-empty"
    />

    <template v-else>
      <NCard>
        <NDataTable
          :columns="columns"
          :data="chapters"
          :bordered="false"
          :single-line="false"
          size="small"
        />
      </NCard>
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
      </div>
    </template>

    <NModal v-model:show="chapterModalVisible" preset="card" :title="chapterEditing ? '编辑章节' : '新增章节'" :style="{ maxWidth: '720px' }">
      <NForm ref="chapterFormRef" :model="chapterForm" :rules="chapterRules" label-placement="top">
        <NFormItem label="章节标题" path="title">
          <NInput v-model:value="chapterForm.title" placeholder="输入章节标题" />
        </NFormItem>
        <NFormItem label="章节号">
          <NInput
            :value="String(chapterForm.chapterNumber)"
            @update:value="value => chapterForm.chapterNumber = Number(value) || 1"
          />
        </NFormItem>
        <NFormItem label="包含剧透">
          <NSwitch v-model:value="chapterForm.isSpoiler" />
        </NFormItem>
        <NFormItem label="章节正文" path="content">
          <NInput v-model:value="chapterForm.content" type="textarea" :autosize="{ minRows: 8 }" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div class="modal-footer">
          <NButton @click="chapterModalVisible = false">取消</NButton>
          <NButton type="primary" @click="saveChapter">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.chapter-manage-page {
  padding: 0;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-loading,
.page-empty {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
