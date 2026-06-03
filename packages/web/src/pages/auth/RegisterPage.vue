<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { NButton, NInput, NForm, NFormItem, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { PersonAddOutline, MailOutline, LockClosedOutline } from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 20, message: '昵称长度为2-20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少 8 位', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (!/[a-z]/.test(value)) return new Error('密码需包含小写字母')
        if (!/[A-Z]/.test(value)) return new Error('密码需包含大写字母')
        if (!/[0-9]/.test(value)) return new Error('密码需包含数字')
        return true
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (value !== formData.password) {
          return new Error('两次输入的密码不一致')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
}

async function handleRegister() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await authStore.register(formData.email, formData.password, formData.nickname)
    message.success('注册成功，请登录')
    router.push({ name: 'Login', query: { email: formData.email } })
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || '注册失败，请稍后重试'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-card sao-card sao-glow">
      <div class="register-header">
        <h2 class="sao-title">注册</h2>
        <p class="register-subtitle text-secondary">创建你的账户，加入 SAO 创作社区</p>
      </div>

      <NForm
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        :show-label="false"
        size="large"
      >
        <NFormItem path="email">
          <NInput
            v-model:value="formData.email"
            placeholder="邮箱地址"
            @keyup.enter="handleRegister"
          >
            <template #prefix>
              <NIcon :component="MailOutline" />
            </template>
          </NInput>
        </NFormItem>

        <NFormItem path="nickname">
          <NInput
            v-model:value="formData.nickname"
            placeholder="昵称"
            @keyup.enter="handleRegister"
          >
            <template #prefix>
              <NIcon :component="PersonAddOutline" />
            </template>
          </NInput>
        </NFormItem>

        <NFormItem path="password">
          <NInput
            v-model:value="formData.password"
            type="password"
            show-password-on="click"
            placeholder="密码（至少8位，含大小写字母和数字）"
            @keyup.enter="handleRegister"
          >
            <template #prefix>
              <NIcon :component="LockClosedOutline" />
            </template>
          </NInput>
        </NFormItem>

        <NFormItem path="confirmPassword">
          <NInput
            v-model:value="formData.confirmPassword"
            type="password"
            show-password-on="click"
            placeholder="确认密码"
            @keyup.enter="handleRegister"
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
          round
          class="sao-btn-primary"
          :loading="loading"
          @click="handleRegister"
        >
          <template #icon>
            <NIcon :component="PersonAddOutline" />
          </template>
          注册
        </NButton>
      </NForm>

      <div class="register-footer">
        <span class="text-secondary">已有账户？</span>
        <router-link to="/login" class="login-link">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - var(--sao-header-height) - 200px);
  padding: 24px 0;
}

.register-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;

  .register-subtitle {
    font-size: 14px;
    margin-top: 8px;
  }
}

.register-card {
  :deep(.n-input) {
    background: rgba(255, 255, 255, 0.06) !important;
    border: 1px solid var(--sao-border-color) !important;
    border-radius: 12px !important;

    .n-input__input-el {
      color: var(--sao-text-primary) !important;
    }

    .n-input__placeholder {
      color: var(--sao-text-secondary) !important;
    }

    &:focus-within {
      border-color: var(--sao-accent) !important;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.15);
    }
  }
}

.register-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;

  .login-link {
    color: var(--sao-accent);
    margin-left: 4px;
    font-weight: 500;

    &:hover {
      color: var(--sao-accent-secondary);
    }
  }
}
</style>
