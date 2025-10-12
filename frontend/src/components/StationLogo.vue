<template>
  <div class="station-logo" :style="{ width: size + 'px', height: size + 'px' }">
    <div v-if="!loaded" class="logo-skeleton" aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF4775" stroke-width="2" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
    <img
      v-if="src"
      :src="src"
      :alt="alt || 'Station logo'"
      :width="size"
      :height="size"
      decoding="async"
      loading="lazy"
      @load="onLoad"
      @error="onError"
      :class="['logo-img', { 'is-hidden': !loaded }]"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  size: { type: Number, default: 40 }
})

const loaded = ref(false)

function onLoad() {
  loaded.value = true
}

function onError() {
  // keep skeleton, avoid breaking layout
  loaded.value = false
}

watch(() => props.src, () => {
  loaded.value = false
})
</script>

<style scoped>
.station-logo {
  position: relative;
  display: inline-block;
}
.logo-skeleton {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.logo-img {
  display: block;
  border-radius: 6px;
}
.logo-img.is-hidden {
  opacity: 0;
}
</style>
