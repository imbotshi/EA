<template>
  <div class="voice-comment" :class="{ 'own-comment': isOwnComment }">
    <div class="comment-bubble">
      <!-- User Avatar -->
      <div class="user-avatar" v-if="!isOwnComment">
        <div 
          class="avatar-image"
          :style="{ backgroundImage: `url(${comment.userAvatar || '/icon-ios.svg'})` }"
          role="img"
          :aria-label="comment.userName"
        ></div>
      </div>
      
      <!-- Voice Note Content -->
      <div class="voice-note-container" @contextmenu="showDeleteOption" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
        <!-- Delete Button (only for own comments) -->
        <button v-if="isOwnComment && showDeleteBtn" class="delete-comment-btn" @click="deleteComment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
        
        <!-- Voice Waveform -->
        <div class="voice-waveform" @click="togglePlayback">
          <div class="waveform-bars">
            <div 
              v-for="(bar, index) in waveformBars" 
              :key="index"
              class="waveform-bar"
              :class="{ 'active': isPlaying && index <= currentBarIndex }"
              :style="{ height: `${bar}%` }"
            ></div>
          </div>
          
          <!-- Play/Pause Button -->
          <button class="voice-play-btn" @click.stop="togglePlayback">
            <svg v-if="!isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7z" :fill="isOwnComment ? '#FFFFFF' : '#FF4775'"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" :fill="isOwnComment ? '#FFFFFF' : '#FF4775'"/>
              <rect x="14" y="4" width="4" height="16" :fill="isOwnComment ? '#FFFFFF' : '#FF4775'"/>
            </svg>
          </button>
          
          <!-- Duration -->
          <span class="voice-duration">{{ formatDuration(comment.duration) }}</span>
        </div>
        
        <!-- Timestamp -->
        <div class="comment-timestamp">
          {{ formatTimestamp(comment.timestamp) }}
          <svg v-if="isOwnComment" width="12" height="12" viewBox="0 0 24 24" fill="none" class="read-status">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M16 6L7 17l-2-2" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- Hidden audio element -->
    <audio 
      ref="audioEl" 
      :src="comment.audioUrl" 
      @loadedmetadata="onAudioLoaded"
      @timeupdate="onTimeUpdate"
      @ended="onAudioEnded"
      style="display: none;"
    ></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  isOwnComment: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete-comment'])

// Audio playback state
const audioEl = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

// Delete functionality
const showDeleteBtn = ref(false)
const touchStartTime = ref(0)

// Waveform visualization
const waveformBars = ref([
  20, 45, 30, 60, 25, 80, 35, 55, 40, 70, 
  15, 50, 65, 30, 85, 20, 45, 75, 35, 60,
  25, 40, 55, 30, 70, 45, 20, 65, 50, 35
])

const currentBarIndex = computed(() => {
  if (duration.value === 0) return 0
  const progress = currentTime.value / duration.value
  return Math.floor(progress * waveformBars.value.length)
})

// Methods
const togglePlayback = () => {
  const audio = audioEl.value
  if (!audio) return

  if (isPlaying.value) {
    audio.pause()
  } else {
    // Reset to beginning if at end
    if (currentTime.value >= duration.value) {
      audio.currentTime = 0
    }
    audio.play().catch(console.error)
  }
}

const handleTouchStart = () => {
  if (!props.isOwnComment) return
  touchStartTime.value = Date.now()
}

const handleTouchEnd = () => {
  if (!props.isOwnComment) return
  const touchDuration = Date.now() - touchStartTime.value
  if (touchDuration > 500) { // Long press (500ms)
    showDeleteBtn.value = true
    setTimeout(() => {
      showDeleteBtn.value = false
    }, 3000) // Hide after 3 seconds
  }
}

const showDeleteOption = (event) => {
  if (!props.isOwnComment) return
  event.preventDefault()
  showDeleteBtn.value = !showDeleteBtn.value
  if (showDeleteBtn.value) {
    setTimeout(() => {
      showDeleteBtn.value = false
    }, 3000)
  }
}

const deleteComment = () => {
  emit('delete-comment', props.comment.id)
  showDeleteBtn.value = false
}

const onAudioLoaded = () => {
  duration.value = audioEl.value?.duration || props.comment.duration || 0
}

const onTimeUpdate = () => {
  currentTime.value = audioEl.value?.currentTime || 0
  // Force reactivity update for waveform
  if (isPlaying.value) {
    // Trigger computed property recalculation
    waveformBars.value = [...waveformBars.value]
  }
}

const onAudioEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`
  
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  })
}

// Audio event listeners
onMounted(() => {
  const audio = audioEl.value
  if (audio) {
    audio.addEventListener('play', () => { isPlaying.value = true })
    audio.addEventListener('pause', () => { isPlaying.value = false })
  }
})

onUnmounted(() => {
  const audio = audioEl.value
  if (audio) {
    audio.pause()
    audio.removeEventListener('play', () => {})
    audio.removeEventListener('pause', () => {})
  }
})
</script>

<style scoped>
.voice-comment {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-start;
}

.voice-comment.own-comment {
  justify-content: flex-end;
}

.comment-bubble {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 280px;
}

.own-comment .comment-bubble {
  gap: 0; /* Remove gap for own comments to hide avatar space */
}

.user-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-size: cover; /* ensures the SVG fills the circle */
  background-position: center;
  background-repeat: no-repeat;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.voice-note-container {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 12px 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  position: relative;
}

.own-comment .voice-note-container {
  background: linear-gradient(135deg, #FF4775 0%, #F10F47 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.delete-comment-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(220, 38, 127, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.delete-comment-btn:hover {
  background: rgba(220, 38, 127, 1);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(220, 38, 127, 0.4);
}

.voice-waveform {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 4px 0;
}

.waveform-bars {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 24px;
  flex: 1;
}

.waveform-bar {
  width: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  transition: all 0.2s ease;
  min-height: 4px;
}

.waveform-bar.active {
  background: rgba(255, 255, 255, 0.9);
  transform: scaleY(1.2);
}

.own-comment .waveform-bar {
  background: rgba(255, 255, 255, 0.5);
}

.own-comment .waveform-bar.active {
  background: rgba(255, 255, 255, 1);
}

.voice-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.voice-play-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.own-comment .voice-play-btn {
  background: rgba(255, 255, 255, 0.3);
}

.own-comment .voice-play-btn:hover {
  background: rgba(255, 255, 255, 0.4);
}

.voice-duration {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  min-width: 35px;
  text-align: right;
}

.comment-timestamp {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.read-status {
  color: rgba(255, 255, 255, 0.8);
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.voice-waveform:hover .waveform-bar {
  animation: pulse 1.5s ease-in-out infinite;
}

.voice-waveform:hover .waveform-bar:nth-child(odd) {
  animation-delay: 0.1s;
}

.voice-waveform:hover .waveform-bar:nth-child(even) {
  animation-delay: 0.2s;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .comment-bubble {
    max-width: 260px;
  }
  
  .voice-note-container {
    padding: 10px 14px;
  }
  
  .waveform-bars {
    height: 20px;
  }
  
  .voice-play-btn {
    width: 28px;
    height: 28px;
  }
}
</style>
