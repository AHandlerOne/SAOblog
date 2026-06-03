<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const footerLinks = [
  {
    title: '浏览',
    links: [
      { name: '剧情介绍', path: '/story' },
      { name: '人物图鉴', path: '/characters' },
      { name: '壁纸画廊', path: '/gallery' },
      { name: '官方企划', path: '/news' },
    ],
  },
  {
    title: '社区',
    links: [
      { name: '作品广场', path: '/community/works' },
      { name: '发布作品', path: '/community/create' },
    ],
  },
  {
    title: '关于',
    links: [
      { name: '登录', path: '/login' },
      { name: '注册', path: '/register' },
    ],
  },
]
</script>

<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="footer-top">
        <!-- Brand -->
        <div class="footer-brand">
          <div class="footer-logo">
            <span class="logo-text">SAO</span>
            <span class="logo-sub">Blog</span>
          </div>
          <p class="footer-description">
            刀剑神域创作博客 -- 一个属于SAO粉丝的创作分享平台
          </p>
        </div>

        <!-- Link Columns -->
        <div
          v-for="group in footerLinks"
          :key="group.title"
          class="footer-links-group"
        >
          <h4 class="footer-group-title">{{ group.title }}</h4>
          <ul class="footer-links">
            <li v-for="link in group.links" :key="link.path">
              <router-link :to="link.path" class="footer-link">
                {{ link.name }}
              </router-link>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-divider"></div>

      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} SAO Blog. All rights reserved.</p>
        <p class="footer-notice">本站为粉丝创作平台，与SAO官方无关</p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  background: var(--sao-bg-secondary);
  border-top: 1px solid var(--sao-border-color);
  padding: 48px 0 24px;
  margin-top: 60px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-top {
  display: flex;
  gap: 60px;
  flex-wrap: wrap;
}

.footer-brand {
  flex: 1;
  min-width: 240px;

  .footer-logo {
    margin-bottom: 12px;

    .logo-text {
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, var(--sao-accent), var(--sao-accent-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo-sub {
      font-size: 14px;
      font-weight: 400;
      color: var(--sao-text-secondary);
      margin-left: 4px;
    }
  }

  .footer-description {
    color: var(--sao-text-secondary);
    font-size: 13px;
    line-height: 1.8;
    max-width: 280px;
  }
}

.footer-links-group {
  .footer-group-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--sao-text-primary);
    margin-bottom: 16px;
  }

  .footer-links {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      margin-bottom: 10px;
    }

    .footer-link {
      color: var(--sao-text-secondary);
      font-size: 13px;
      transition: color 0.3s ease;

      &:hover {
        color: var(--sao-accent);
      }
    }
  }
}

.footer-divider {
  height: 1px;
  background: var(--sao-border-color);
  margin: 36px 0 20px;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  p {
    color: var(--sao-text-secondary);
    font-size: 12px;
  }

  .footer-notice {
    opacity: 0.7;
  }
}

@media (max-width: 768px) {
  .footer-top {
    flex-direction: column;
    gap: 32px;
  }

  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }
}
</style>
