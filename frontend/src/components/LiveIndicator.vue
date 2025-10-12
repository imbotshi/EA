<template>
  <div
    class="live-indicator"
    :class="stateClass"
    role="status"
    :aria-live="announce ? 'assertive' : 'off'"
    :title="title || computedTitle"
  >
    <span class="dot" aria-hidden="true"></span>
    <span class="label">{{ label }}</span>
    <span class="bars" aria-hidden="true" :class="{ active: isAnimated }">
      <span class="bar bar1"></span>
      <span class="bar bar2"></span>
      <span class="bar bar3"></span>
    </span>
  </div>
  </template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 'live' | 'loading' | 'paused'
  state: { type: String, default: 'live' },
  title: { type: String, default: '' },
  announce: { type: Boolean, default: false }
})

const label = computed(() => {
  if (props.state === 'loading') return 'CHARGEMENT'
  if (props.state === 'paused') return 'EN PAUSE'
  return 'EN DIRECT'
})

const isAnimated = computed(() => props.state === 'live' || props.state === 'loading')

const stateClass = computed(() => `state-${props.state}`)

const computedTitle = computed(() => {
  if (props.state === 'loading') return 'Chargement du flux'
  if (props.state === 'paused') return 'Lecture en pause'
  return 'Diffusion en direct'
})
</script>

<style scoped>
.live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.04em;
}

/* States */
.state-live { background: rgba(255, 71, 117, 0.12); color: #FF4775; }
.state-loading { background: rgba(255, 170, 0, 0.12); color: #FFAA00; }
.state-paused { background: rgba(200, 200, 200, 0.12); color: #C8C8C8; }

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 currentColor;
  animation: pulse 1.8s infinite;
  opacity: 0.95;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 currentColor; }
  70% { box-shadow: 0 0 0 10px rgba(255,255,255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255,255,255, 0); }
}
.label { user-select: none; }
.bars { display: inline-flex; align-items: end; gap: 2px; height: 10px; opacity: 0.6; }
.bars .bar { width: 2px; background: currentColor; display: inline-block; border-radius: 1px; }
.bars .bar1 { height: 6px; }
.bars .bar2 { height: 9px; }
.bars .bar3 { height: 5px; }

/* Animate levels only when active */
.bars.active .bar1 { animation: level 1s infinite ease-in-out; animation-delay: 0s; }
.bars.active .bar2 { animation: level 1s infinite ease-in-out; animation-delay: 0.2s; }
.bars.active .bar3 { animation: level 1s infinite ease-in-out; animation-delay: 0.4s; }

@keyframes level {
  0%, 100% { transform: scaleY(0.6); opacity: 0.7; }
  50% { transform: scaleY(1); opacity: 1; }
}
</style>
