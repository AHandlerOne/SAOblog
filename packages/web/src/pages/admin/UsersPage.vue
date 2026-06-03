<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NInput,
  NModal,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { adminApi } from '@/api/admin'
import type { AdminUser } from '@/api/admin'

const message = useMessage()
const dialog = useDialog()

const users = ref<AdminUser[]>([])
const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 20
const searchQuery = ref('')

const roleOptions = [
  { label: '普通用户', value: 'USER' },
  { label: '版主', value: 'MODERATOR' },
  { label: '管理员', value: 'ADMIN' },
]

const changeRoleModalVisible = ref(false)
const changeRoleUserId = ref('')
const changeRoleNickname = ref('')
const newRole = ref('')

onMounted(() => {
  fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  try {
    const params: { page: number; pageSize: number; search?: string } = {
      page: currentPage.value,
      pageSize,
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    const res = await adminApi.getUsers(params)
    users.value = res.data
    totalPages.value = Math.ceil(res.total / pageSize)
  } catch (error) {
    console.error('Failed to load users:', error)
    message.error('加载用户失败')
  } finally {
    loading.value = false
  }
}

async function handleBan(userId: string, nickname: string) {
  dialog.warning({
    title: '封禁用户',
    content: `确认封禁用户“${nickname}”吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      const reason = window.prompt('请输入封禁原因', '违规内容')
      if (reason === null) return

      try {
        await adminApi.banUser(userId, reason || '违规内容')
        message.success('用户已封禁')
        await fetchUsers()
      } catch {
        message.error('操作失败，请稍后重试')
      }
    },
  })
}

async function handleUnban(userId: string, nickname: string) {
  dialog.info({
    title: '解除封禁',
    content: `确认解除用户“${nickname}”的封禁吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminApi.unbanUser(userId)
        message.success('用户已解除封禁')
        await fetchUsers()
      } catch {
        message.error('操作失败，请稍后重试')
      }
    },
  })
}

async function handleResetProfile(userId: string, nickname: string) {
  dialog.warning({
    title: '重置资料',
    content: `确认将“${nickname}”的名称重置为 momo，并清空头像吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminApi.resetUserProfile(userId)
        message.success('资料已重置')
        await fetchUsers()
      } catch {
        message.error('操作失败，请稍后重试')
      }
    },
  })
}

function openChangeRoleModal(user: AdminUser) {
  changeRoleUserId.value = user.id
  changeRoleNickname.value = user.nickname
  newRole.value = user.role
  changeRoleModalVisible.value = true
}

async function handleChangeRole() {
  try {
    await adminApi.changeUserRole(changeRoleUserId.value, newRole.value)
    message.success('角色已更新')
    changeRoleModalVisible.value = false
    await fetchUsers()
  } catch {
    message.error('操作失败，请稍后重试')
  }
}

async function handleToggleAiAccess(user: AdminUser) {
  try {
    await adminApi.updateUserAiAccess(user.id, !user.aiAccess)
    message.success(user.aiAccess ? 'AI 权限已关闭' : 'AI 权限已开通')
    await fetchUsers()
  } catch {
    message.error('AI 权限更新失败，请稍后重试')
  }
}

const columns: DataTableColumns<AdminUser> = [
  {
    title: '邮箱',
    key: 'email',
    ellipsis: { tooltip: true },
    minWidth: 220,
  },
  {
    title: '名称',
    key: 'nickname',
    width: 140,
  },
  {
    title: '角色',
    key: 'role',
    width: 110,
    render: (row) => {
      const roleMap: Record<string, { label: string; type: 'default' | 'warning' | 'error' }> = {
        ADMIN: { label: '管理员', type: 'error' },
        MODERATOR: { label: '版主', type: 'warning' },
        USER: { label: '普通用户', type: 'default' },
      }
      const role = roleMap[row.role] || { label: row.role, type: 'default' as const }
      return h(NTag, { size: 'small', type: role.type, bordered: false }, { default: () => role.label })
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => {
      const statusMap: Record<string, { label: string; type: 'success' | 'error' | 'default' }> = {
        ACTIVE: { label: '正常', type: 'success' },
        BANNED: { label: '封禁', type: 'error' },
      }
      const status = statusMap[row.status] || { label: row.status, type: 'default' as const }
      return h(NTag, { size: 'small', type: status.type, bordered: false }, { default: () => status.label })
    },
  },
  {
    title: 'AI 权限',
    key: 'aiAccess',
    width: 100,
    render: (row) => {
      const enabled = row.aiAccess || row.role === 'ADMIN' || row.role === 'MODERATOR'
      return h(
        NTag,
        { size: 'small', type: enabled ? 'success' : 'default', bordered: false },
        { default: () => (enabled ? '已开通' : '未开通') },
      )
    },
  },
  {
    title: '作品数',
    key: 'worksCount',
    width: 90,
  },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 140,
    render: (row) => formatDate(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 430,
    fixed: 'right',
    render: (row) => {
      const actions: any[] = []

      if (row.status === 'ACTIVE') {
        actions.push(
          h(NButton, {
            size: 'small',
            type: 'error',
            onClick: () => handleBan(row.id, row.nickname),
          }, { default: () => '封禁' }),
        )
      } else {
        actions.push(
          h(NButton, {
            size: 'small',
            type: 'success',
            onClick: () => handleUnban(row.id, row.nickname),
          }, { default: () => '解封' }),
        )
      }

      actions.push(
        h(NButton, {
          size: 'small',
          onClick: () => handleResetProfile(row.id, row.nickname),
        }, { default: () => '重置名称头像' }),
        h(NButton, {
          size: 'small',
          type: row.aiAccess ? 'warning' : 'primary',
          disabled: row.role === 'ADMIN' || row.role === 'MODERATOR',
          onClick: () => handleToggleAiAccess(row),
        }, { default: () => (row.aiAccess ? '关闭 AI' : '开通 AI') }),
        h(NButton, {
          size: 'small',
          onClick: () => openChangeRoleModal(row),
        }, { default: () => '修改角色' }),
      )

      return h(NSpace, { size: 'small' }, { default: () => actions })
    },
  },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function handleSearch() {
  currentPage.value = 1
  fetchUsers()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchUsers()
}
</script>

<template>
  <div class="users-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc text-secondary">支持封禁、解封、修改角色，以及一键重置用户名称和头像。</p>
      </div>
      <NInput
        v-model:value="searchQuery"
        placeholder="搜索邮箱或名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
    </div>

    <NSpin v-if="loading" class="page-loading" />

    <NEmpty v-else-if="users.length === 0" description="没有找到用户" class="page-empty" />

    <template v-else>
      <NCard>
        <NDataTable
          :columns="columns"
          :data="users"
          :bordered="false"
          :single-line="false"
          :scroll-x="1100"
          size="small"
        />
      </NCard>
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <NPagination :page="currentPage" :page-count="totalPages" @update:page="handlePageChange" />
      </div>
    </template>

    <NModal
      v-model:show="changeRoleModalVisible"
      preset="card"
      title="修改角色"
      :style="{ maxWidth: '420px' }"
    >
      <p class="role-hint text-secondary">正在修改用户“{{ changeRoleNickname }}”的角色。</p>
      <NSelect v-model:value="newRole" :options="roleOptions" />
      <template #footer>
        <div class="modal-footer">
          <NButton @click="changeRoleModalVisible = false">取消</NButton>
          <NButton type="primary" @click="handleChangeRole">确认修改</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--sao-text-primary);
}

.page-desc {
  margin: 0;
  font-size: 14px;
}

.search-input {
  width: 260px;
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

.role-hint {
  margin-bottom: 12px;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }
}
</style>
