<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as ThreeModule from 'three'

const THREE: any = ThreeModule

const props = withDefaults(defineProps<{
  show: boolean
}>(), {
  show: false,
})

const emit = defineEmits<{
  (e: 'finished'): void
}>()

const container = ref<HTMLElement | null>(null)
const loadingOpacity = ref(1)

let scene: any
let camera: any
let renderer: any
let particles: any[] = []
let particleCount = 100
let tunnelRadius = 20
let tunnelDepth = 500
let speed = 2.5
let isAnimating = false
let animationId: number | null = null
let bgColor = new THREE.Color(0x000000)
let canRecycleParticles = true
let finishedEmitted = false

function initThree(): void {
  if (!container.value) return

  container.value.innerHTML = ''

  scene = new THREE.Scene()
  scene.background = bgColor

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 0

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  container.value.appendChild(renderer.domElement)

  createParticles()
  animate()

  setTimeout(() => {
    canRecycleParticles = false
  }, 6000)
}

function createParticles(): void {
  const group = new THREE.Group()
  scene.add(group)

  for (let i = 0; i < particleCount; i++) {
    const width = Math.random() * 3
    const height = Math.random() * 8 + 18
    const depth = Math.random() * 3

    const geometry = new THREE.BoxGeometry(width, height, depth)

    const color = new THREE.Color(
      Math.random() * 0.5 + 0,
      Math.random() * 0.5 + 0,
      Math.random() * 0.5 + 0.2,
    )

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    })

    const particle = new THREE.Mesh(geometry, material)

    const radius = tunnelRadius
    const angle = Math.random() * Math.PI * 2
    const zPos = Math.random() * tunnelDepth - tunnelDepth / 1.5

    particle.position.x = Math.cos(angle) * radius
    particle.position.y = Math.sin(angle) * radius
    particle.position.z = zPos
    particle.rotation.x = Math.PI / 2
    particle.userData = {
      initialZ: zPos,
      rotationSpeedX: Math.random() * 0.02 - 0.01,
      rotationSpeedY: Math.random() * 0.02 - 0.01,
      rotationSpeedZ: Math.random() * 0.02 - 0.01,
    }

    group.add(particle)
    particles.push(particle)
  }
}

function animate(): void {
  if (!isAnimating) return

  animationId = requestAnimationFrame(animate)

  const width = window.innerWidth
  const height = window.innerHeight
  let allOut = true

  particles.forEach((particle) => {
    particle.position.z += speed

    if (particle.position.z > 0) {
      if (canRecycleParticles) {
        particle.position.z = -tunnelDepth / 2
        allOut = false
      }
    } else {
      allOut = false
    }
  })

  camera.position.x = Math.sin(Date.now() * 0.001) * 0.2
  camera.position.y = Math.cos(Date.now() * 0.0013) * 0.2

  if (bgColor.r < 0.99) {
    bgColor.r += 0.005
    bgColor.g += 0.005
    bgColor.b += 0.005
    scene.background = bgColor
  }

  renderer.render(scene, camera)

  if (!canRecycleParticles && allOut) {
    isAnimating = false
    loadingOpacity.value = 0
    if (animationId) cancelAnimationFrame(animationId)
    scene.background = new THREE.Color(0x000000)
    renderer.render(scene, camera)
    if (!finishedEmitted) {
      finishedEmitted = true
      emit('finished')
    }
  }
}

function onWindowResize(): void {
  if (!camera || !renderer) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function startAnimation(): void {
  if (isAnimating || !props.show) return
  isAnimating = true
  finishedEmitted = false
  loadingOpacity.value = 1
  canRecycleParticles = true
  particleCount = 100
  tunnelRadius = 20
  tunnelDepth = 500
  speed = 2.5
  bgColor = new THREE.Color(0x000000)
  particles = []
  nextTick(() => {
    initThree()
  })
}

function stopAnimation(): void {
  isAnimating = false
  if (animationId) cancelAnimationFrame(animationId)
  animationId = null
  if (renderer) {
    renderer.dispose()
  }
  particles = []
}

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      startAnimation()
      return
    }
    stopAnimation()
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
  stopAnimation()
})

defineExpose({
  startAnimation,
  stopAnimation,
})
</script>

<template>
  <div v-if="show" class="login-page">
    <div ref="container" class="three-container"></div>
    <div class="loading-text" :style="{ opacity: loadingOpacity }">
      <!-- loading... -->
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  z-index: 3000;
}

.three-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.loading-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: #000;
  opacity: 0.8;
  z-index: 5;
  transition: opacity 1s ease-in-out;
}
</style>
