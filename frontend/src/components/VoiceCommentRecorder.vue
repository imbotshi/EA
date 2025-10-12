<template>
  <div class="voice-recorder">
    <div class="recorder-container" :class="{ 'recording': isRecording }">
      <!-- Capability Warning -->
      <div v-if="!isSupported" class="recorder-warning" role="alert">
        L'enregistrement n'est pas supporté sur ce navigateur/appareil. Veuillez utiliser un navigateur récent (Chrome, Edge, Safari iOS 14+) et une page en HTTPS.
      </div>
      <!-- Record Button -->
      <button 
        class="record-btn"
        :class="{ 'recording': isRecording, 'has-recording': hasRecording }"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @touchstart.prevent.stop="handleTouchStart"
        @touchend.prevent.stop="handleTouchEnd"
        @touchcancel="handleTouchCancel"
        @mouseleave="handleMouseLeave"
        @click="handleClick"
        @contextmenu.prevent
        type="button"
        :disabled="isProcessing"
      >
        <svg v-if="!isRecording && !hasRecording" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor"/>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M12 18v4M8 22h8" stroke="currentColor" stroke-width="2"/>
        </svg>
        
        <svg v-else-if="isRecording" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
        </svg>
        
        <svg v-else-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M8 5v14l11-7z" fill="currentColor"/>
        </svg>
        
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
        </svg>
      </button>
      
      <!-- Recording Indicator -->
      <div v-if="isRecording" class="recording-indicator">
        <div class="recording-pulse"></div>
        <span class="recording-time">{{ formatTime(recordingTime) }}</span>
      </div>
      
      <!-- Send/Cancel Actions -->
      <div v-if="hasRecording && !isRecording" class="recording-actions">
        <button class="action-btn cancel-btn" @click="cancelRecording">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        
        <button class="action-btn send-btn" @click="sendRecording" :disabled="isProcessing">
          <svg v-if="!isProcessing" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <div v-else class="loading-spinner"></div>
        </button>
      </div>
      
      <!-- Recording Hint -->
      <div v-if="!isRecording && !hasRecording" class="recording-hint">
        Maintenez pour enregistrer
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['comment-sent'])

// Recording state
const isRecording = ref(false)
const hasRecording = ref(false)
const isProcessing = ref(false)
const recordingTime = ref(0)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const recordingTimer = ref(null)
const isSupported = ref(true)
const supportError = ref('')

// Audio recording setup
let stream = null

// Audio playback state
const isPlaying = ref(false)
const audioElement = ref(null)

const startRecording = async () => {
  if (isRecording.value || hasRecording.value) return
  
  try {
    // Capability checks
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia non disponible (permissions ou contexte non sécurisé)')
    }
    if (typeof window.MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder non supporté par ce navigateur')
    }

    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []
    
    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data)
    }
    
    mediaRecorder.value.onstop = () => {
      const preferredType = mediaRecorder.value?.mimeType || audioChunks.value[0]?.type || 'audio/webm'
      const audioBlob = new Blob(audioChunks.value, { type: preferredType })
      const audioUrl = URL.createObjectURL(audioBlob)
      hasRecording.value = true
      // Store the recording for later use
      window.currentRecording = { blob: audioBlob, url: audioUrl }
    }
    
    mediaRecorder.value.start()
    isRecording.value = true
    recordingTime.value = 0
    
    // Start timer
    recordingTimer.value = setInterval(() => {
      recordingTime.value += 1
    }, 1000)
    
  } catch (error) {
    console.error('Error accessing microphone:', error)
    const msg = String(error?.message || error)
    supportError.value = msg
    isSupported.value = false
  }
}

const playRecording = () => {
  if (!window.currentRecording?.url) return
  
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value = null
  }
  
  audioElement.value = new Audio(window.currentRecording.url)
  audioElement.value.play()
  isPlaying.value = true
  
  audioElement.value.onended = () => {
    isPlaying.value = false
    audioElement.value = null
  }
}

const stopPlayback = () => {
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value = null
  }
  isPlaying.value = false
}

// Event handlers
const handleMouseDown = (e) => {
  if (hasRecording.value) return
  startRecording()
}

const handleMouseUp = (e) => {
  if (hasRecording.value) return
  stopRecording()
}

const handleTouchStart = (e) => {
  if (hasRecording.value) return
  e.preventDefault()
  e.stopPropagation()
  startRecording()
}

const handleTouchEnd = (e) => {
  if (hasRecording.value) return
  e.preventDefault()
  e.stopPropagation()
  stopRecording()
}

const handleTouchCancel = (e) => {
  if (hasRecording.value) return
  e.preventDefault()
  stopRecording()
}

const handleMouseLeave = (e) => {
  if (hasRecording.value) return
  stopRecording()
}

const handleClick = (e) => {
  if (!hasRecording.value) return
  
  if (isPlaying.value) {
    stopPlayback()
  } else {
    playRecording()
  }
}

const stopRecording = () => {
  if (!isRecording.value) return
  
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop()
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  
  isRecording.value = false
  
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value)
    recordingTimer.value = null
  }
}

const handleCancelEvent = () => {
  if (isRecording.value || hasRecording.value) {
    cancelRecording()
  }
}

const cancelRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  
  isRecording.value = false
  hasRecording.value = false
  clearInterval(recordingTimer.value)
  recordingTimer.value = null
  recordingTime.value = 0
  audioChunks.value = []
  
  // Notify parent that recording was cancelled
  emit('cancelled')
}

const sendRecording = async () => {
  if (!hasRecording.value || isProcessing.value) return
  
  isProcessing.value = true
  
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create comment object with proper audio URL
    const comment = {
      id: Date.now(),
      userName: 'Vous',
      userAvatar: '/icon-ios.svg',
      audioUrl: window.currentRecording?.url,
      audioBlob: window.currentRecording?.blob,
      duration: recordingTime.value,
      timestamp: new Date().toISOString(),
      isOwn: true
    }
    
    emit('comment-sent', comment)
    
    // Reset state
    hasRecording.value = false
    recordingTime.value = 0
    audioChunks.value = []
    
  } catch (error) {
    console.error('Error sending recording:', error)
  } finally {
    isProcessing.value = false
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  // Add event listener for cancel-recording event
  window.addEventListener('cancel-recording', handleCancelEvent)
})

onUnmounted(() => {
  // Remove event listener
  window.removeEventListener('cancel-recording', handleCancelEvent)
  
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value)
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  stopPlayback()
})
</script>

<style scoped>
.voice-recorder {
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.recorder-warning {
  background: rgba(255, 170, 0, 0.12);
  color: #FFAA00;
  border: 1px solid rgba(255, 170, 0, 0.4);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 12px;
  margin-bottom: 8px;
}

.recorder-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
}

.record-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  /* Mobile touch improvements */
  touch-action: manipulation; /* prevents double-tap zoom */
  -webkit-tap-highlight-color: transparent; /* remove tap highlight iOS */
  user-select: none;
  -webkit-user-select: none;
}

.record-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.record-btn.recording {
  background: #FF4775;
  color: white;
  animation: recordingPulse 1.5s ease-in-out infinite;
  border-color: rgba(255, 255, 255, 0.4);
}

.record-btn.has-recording {
  background: #FF4775;
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 71, 117, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 71, 117, 0.3);
}

.recording-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FF4775;
  animation: pulse 1s ease-in-out infinite;
}

.recording-time {
  font-size: 14px;
  font-weight: 600;
  color: #FF4775;
  min-width: 40px;
}

.recording-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.1);
}

.send-btn {
  background: #FF4775;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.send-btn:hover:not(:disabled) {
  background: #F10F47;
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(255, 71, 117, 0.4);
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.recording-hint {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.8);
  padding: 6px 12px;
  border-radius: 12px;
  white-space: nowrap;
  pointer-events: none;
  backdrop-filter: blur(10px);
}

/* Animations */
@keyframes recordingPulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 71, 117, 0.7);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(255, 71, 117, 0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .record-btn {
    width: 44px;
    height: 44px;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
  }
  
  .recording-hint {
    font-size: 11px;
    top: -32px;
  }
}
</style>
