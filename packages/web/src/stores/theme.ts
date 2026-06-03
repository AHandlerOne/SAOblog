import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true)

  function toggleDark() {
    isDark.value = !isDark.value
  }

  function setDark(value: boolean) {
    isDark.value = value
  }

  return {
    isDark,
    toggleDark,
    setDark,
  }
})
