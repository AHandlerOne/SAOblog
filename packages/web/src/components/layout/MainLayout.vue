<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
</script>

<template>
  <div class="main-layout">
    <AppHeader />
    <main class="main-content">
      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding-top: 24px;
  padding-bottom: 24px;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
}

@media (max-width: 768px) {
  .main-content {
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .content-wrapper {
    padding: 0 14px;
  }
}
</style>
