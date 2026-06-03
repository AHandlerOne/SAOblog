<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NForm, NFormItem, NIcon, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { LockClosedOutline, LogInOutline, MailOutline } from '@vicons/ionicons5'
import LoginSuccessTransition from '@/components/auth/LoginSuccessTransition.vue'
import { useAuthStore } from '@/stores/auth'

const LOGIN_INTRO_SEEN_KEY = 'sao_login_intro_seen'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const showSuccessTransition = ref(false)

const formData = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
  password: '',
})

const timeoutNotice = computed(() => route.query.reason === 'timeout' || route.query.reason === 'expired')
const redirectTarget = computed(() => {
  if (typeof route.query.redirect === 'string' && route.query.redirect) {
    return route.query.redirect
  }
  return '/home'
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ],
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await authStore.login(formData.email, formData.password)
    const shouldShowTransition = !localStorage.getItem(LOGIN_INTRO_SEEN_KEY)
    localStorage.setItem(LOGIN_INTRO_SEEN_KEY, '1')

    if (shouldShowTransition) {
      showSuccessTransition.value = true
      return
    }

    await router.replace(redirectTarget.value)
  } catch (error: any) {
    message.error(error?.response?.data?.message || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleTransitionFinished() {
  showSuccessTransition.value = false
  await router.replace(redirectTarget.value)
}
</script>

<template>
  <div class="login-page">
    <div class="login-card sao-card">
      <div class="login-header">
        <h1 class="page-title">登录</h1>
        <p class="page-desc text-secondary">登录后可发布作品、保存草稿、评论互动和管理个人内容。</p>
      </div>

      <NAlert v-if="timeoutNotice" type="warning" :show-icon="false" class="timeout-alert">
        你已超过 1 小时未操作，请重新登录。
      </NAlert>

      <NForm
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="top"
      >
        <NFormItem label="邮箱" path="email">
          <NInput
            v-model:value="formData.email"
            placeholder="请输入邮箱地址"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <NIcon :component="MailOutline" />
            </template>
          </NInput>
        </NFormItem>

        <NFormItem label="密码" path="password">
          <NInput
            v-model:value="formData.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <NIcon :component="LockClosedOutline" />
            </template>
          </NInput>
        </NFormItem>

        <NButton
          type="primary"
          block
          size="large"
          class="sao-btn-primary"
          :loading="loading"
          @click="handleLogin"
        >
          <template #icon>
            <NIcon :component="LogInOutline" />
          </template>
          登录
        </NButton>
      </NForm>

      <div class="login-footer">
        <span class="text-secondary">还没有账号？</span>
        <router-link to="/register" class="register-link">立即注册</router-link>
      </div>
    </div>

    <LoginSuccessTransition :show="showSuccessTransition" @finished="handleTransitionFinished" />
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: calc(100vh - var(--sao-header-height) - 180px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.login-header {
  margin-bottom: 24px;
  text-align: center;
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

.timeout-alert {
  margin-bottom: 16px;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
}

.register-link {
  margin-left: 4px;
}
</style>
