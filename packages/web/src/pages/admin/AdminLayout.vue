<script setup lang="ts">
import { ref, computed, h, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NLayout, NLayoutSider, NLayoutContent, NMenu, NIcon, NButton, NDrawer } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  GridOutline,
  DocumentTextOutline,
  CheckmarkCircleOutline,
  FlagOutline,
  PeopleOutline,
  ListOutline,
  HomeOutline,
  MenuOutline,
  CloseOutline,
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const isMobile = ref(false)
const mobileMenuVisible = ref(false)

const menuOptions: MenuOption[] = [
  {
    label: '仪表盘',
    key: 'AdminDashboard',
    icon: () => h(NIcon, null, { default: () => h(GridOutline) }),
  },
  {
    label: '内容管理',
    key: 'AdminContent',
    icon: () => h(NIcon, null, { default: () => h(DocumentTextOutline) }),
  },
  {
    label: '作品管理',
    key: 'AdminWorks',
    icon: () => h(NIcon, null, { default: () => h(ListOutline) }),
  },
  {
    label: '作品审核',
    key: 'AdminWorksReview',
    icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }),
  },
  {
    label: '举报管理',
    key: 'AdminReports',
    icon: () => h(NIcon, null, { default: () => h(FlagOutline) }),
  },
  {
    label: '用户管理',
    key: 'AdminUsers',
    icon: () => h(NIcon, null, { default: () => h(PeopleOutline) }),
  },
  {
    label: '章节管理',
    key: 'AdminChapters',
    icon: () => h(NIcon, null, { default: () => h(ListOutline) }),
  },
]

const activeKey = computed(() => {
  const name = route.name as string
  return menuOptions.find(opt => opt.key === name)?.key || 'AdminDashboard'
})

function handleMenuUpdate(key: string) {
  router.push({ name: key })
  mobileMenuVisible.value = false
}

function goHome() {
  router.push('/')
}

function syncViewport() {
  isMobile.value = window.innerWidth <= 992
  if (!isMobile.value) {
    mobileMenuVisible.value = false
  }
}

watch(() => route.fullPath, () => {
  mobileMenuVisible.value = false
})

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <NLayout :has-sider="!isMobile" class="admin-layout">
    <NLayoutSider
      v-if="!isMobile"
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="collapsed"
      show-trigger
      class="admin-sider"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sider-header">
        <div class="sider-logo">
          <span class="logo-text">SAO</span>
          <span v-if="!collapsed" class="logo-sub">Admin</span>
        </div>
      </div>
      <NMenu
        :options="menuOptions"
        :value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        @update:value="handleMenuUpdate"
      />
    </NLayoutSider>

    <NLayout class="admin-main">
      <NLayoutContent class="admin-content">
        <div class="content-wrapper">
          <div class="content-header">
            <div v-if="isMobile" class="mobile-header">
              <NButton quaternary circle @click="mobileMenuVisible = true">
                <template #icon>
                  <NIcon :component="MenuOutline" />
                </template>
              </NButton>
              <span class="mobile-header-title">管理后台</span>
              <NButton quaternary circle @click="goHome">
                <template #icon>
                  <NIcon :component="HomeOutline" />
                </template>
              </NButton>
            </div>

            <NButton v-else text class="back-home-btn" @click="goHome">
              <template #icon>
                <NIcon :component="HomeOutline" />
              </template>
              返回前台
            </NButton>
          </div>
          <router-view />
        </div>
      </NLayoutContent>
    </NLayout>
  </NLayout>

  <NDrawer
    v-model:show="mobileMenuVisible"
    placement="left"
    :width="280"
    :trap-focus="false"
  >
    <div class="mobile-drawer-content">
      <div class="mobile-drawer-top">
        <div class="sider-logo">
          <span class="logo-text">SAO</span>
          <span class="logo-sub">Admin</span>
        </div>
        <NButton quaternary circle @click="mobileMenuVisible = false">
          <template #icon>
            <NIcon :component="CloseOutline" />
          </template>
        </NButton>
      </div>
      <NMenu
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuUpdate"
      />
    </div>
  </NDrawer>
</template>

<style scoped lang="scss">
.admin-layout {
  min-height: 100vh;
}

.admin-sider {
  background: var(--sao-bg-secondary) !important;
  border-right: 1px solid var(--sao-border-color) !important;

  :deep(.n-layout-sider-scroll-container) {
    display: flex;
    flex-direction: column;
  }

  :deep(.n-menu) {
    background: transparent !important;

    .n-menu-item {
      color: var(--sao-text-secondary);
      margin: 4px 8px;
      border-radius: 10px;

      &:hover {
        color: var(--sao-text-primary);
        background: rgba(255, 255, 255, 0.05);
      }

      &.n-menu-item--selected {
        color: var(--sao-accent);
        background: rgba(0, 212, 255, 0.1) !important;

        &::before {
          background: transparent !important;
        }
      }
    }
  }

  :deep(.n-layout-sider-toggle) {
    color: var(--sao-text-secondary);
    background: var(--sao-bg-primary);

    &:hover {
      color: var(--sao-accent);
    }
  }
}

.sider-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--sao-border-color);
  margin-bottom: 8px;
}

.sider-logo {
  display: flex;
  align-items: baseline;
  gap: 4px;

  .logo-text {
    font-size: 22px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2px;
  }

  .logo-sub {
    font-size: 14px;
    font-weight: 400;
    color: var(--sao-text-secondary);
  }
}

.admin-main {
  background: var(--sao-bg-primary);
}

.admin-content {
  min-height: 100vh;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.content-header {
  margin-bottom: 24px;
}

.mobile-header {
  display: none;
}

.back-home-btn {
  color: var(--sao-text-secondary);
  font-size: 14px;

  &:hover {
    color: var(--sao-accent);
  }
}

.mobile-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 16px 12px;
  background: var(--sao-bg-secondary);

  :deep(.n-menu) {
    background: transparent;
  }
}

.mobile-drawer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

@media (max-width: 992px) {
  .content-wrapper {
    padding: 14px;
  }

  .content-header {
    margin-bottom: 16px;
  }

  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .mobile-header-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--sao-text-primary);
  }

  .content-wrapper {
    :deep(.n-input),
    :deep(.n-input-number),
    :deep(.n-select),
    :deep(.n-date-picker) {
      max-width: 100% !important;
    }
  }
}
</style>
