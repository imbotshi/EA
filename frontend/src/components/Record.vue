<template>
  <div class="record-bottom-sheet" :class="{ 'is-open': isOpen }">
    <div class="sheet-backdrop" @click="closeModal"></div>

    <div class="sheet-content">
      <!-- Top handle -->
      <div class="top-handle" 
           @touchstart="handleSheetTouchStart"
           @touchmove="handleSheetTouchMove"
           @touchend="handleSheetTouchEnd"
           @mousedown="handleSheetMouseDown"
           @mousemove="handleSheetMouseMove"
           @mouseup="handleSheetMouseUp">
        <div class="handle-bar"></div>
      </div>

      <!-- Header with glassmorphism effect -->
      <div class="header-section">
        <div class="control-bar">
          <!-- Navigation with swipe gestures -->
          <div class="nav-buttons">
            <div class="nav-button back" 
                 @click="navigateSegment('prev')" 
                 @touchstart="handleTouchStart" 
                 @touchend="handleTouchEnd"
                 :class="{ 'disabled': !canNavigate }"
                 :disabled="!canNavigate">
              <img src="/arrow-left.svg" alt="Précédent" width="20" height="20" />
            </div>
            <div class="nav-button forward" 
                 @click="navigateSegment('next')" 
                 @touchstart="handleTouchStart" 
                 @touchend="handleTouchEnd"
                 :class="{ 'disabled': !canNavigate }"
                 :disabled="!canNavigate">
              <img src="/arrow-right.svg" alt="Suivant" width="20" height="20" />
            </div>
          </div>

          <!-- Timer with iOS-style typography -->
          <div class="timer-container">
            <div class="timer-display">
              <span class="time-total">{{ formatTime(totalTime) }}</span>
              <span class="time-separator">:</span>
              <span class="time-current">{{ formatTime(currentTime) }}</span>
            </div>
          </div>

          <!-- Control actions with haptic feedback -->
          <div class="control-actions">
            <div class="action-button pause" 
                 @click="togglePlayPauseControl" 
                 @touchstart="handleHaptic"
                 :class="{ 'disabled': !canPlayPause }"
                 :disabled="!canPlayPause">
              <img 
                :src="currentIcon.src" 
                :alt="currentIcon.alt" 
                width="24" 
                height="24" 
                :class="currentIcon.class"
              />
            </div>
            

          </div>
        </div>

        <!-- WaveSurfer Waveform Container -->
        <div class="waveform-container">
          <div id="waveform" class="waveform"></div>

        </div>
      </div>

      <!-- Bottom controls with modern design -->
      <div class="bottom-section">
        <div class="action-buttons">
          <button class="action-btn delete" 
                  @click="deleteSelection" 
                  @touchstart="handleHaptic"
                  :class="{ 'disabled': !canDelete }"
                  :disabled="!canDelete">
            <img src="/delete.svg" alt="Supprimer" width="20" height="20" />
            <span>Effaçer</span>
          </button>

          <button class="action-btn record" 
                  @click="toggleRecording" 
                  @touchstart="handleHaptic"
                  :class="{ 'disabled': !canRecord, 'recording': isRecording }"
                  :disabled="!canRecord">
            <img src="/mic.svg" alt="Enregistrer" width="20" height="20" />
            <span>{{ recordButtonText }}</span>
          </button>

          <button class="action-btn share" 
                  @click="shareRecording" 
                  @touchstart="handleHaptic"
                  :class="{ 'disabled': !canShare || isUploading, 'loading': isUploading }"
                  :disabled="!canShare || isUploading">
            <template v-if="isUploading">
              <span class="spinner" aria-label="Chargement"></span>
            </template>
            <template v-else>
              <img src="/share.svg" alt="Partager" width="29" height="29" />
            </template>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Message Modal -->
    <div v-if="showError" class="error-modal">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ errorMessage }}</p>
        <button class="error-close" @click="showError = false">OK</button>
      </div>
    </div>

    <!-- Confirmation Modal for Recording in Progress -->
    <div v-if="showConfirmation" class="confirmation-modal">
      <div class="confirmation-content">
        <div class="confirmation-icon">🎤</div>
        <h3>Enregistrement en cours</h3>
        <p class="confirmation-message">Voulez-vous vraiment abandonner votre enregistrement en cours ?</p>
        <div class="confirmation-buttons">
          <button class="confirmation-btn cancel" @click="cancelClose">Continuer l'enregistrement</button>
          <button class="confirmation-btn confirm" @click="confirmClose">Abandonner l'enregistrement</button>
        </div>
      </div>
    </div>

    <!-- Toast System -->
    <div v-if="showToastFlag" class="toast-container">
      <div class="toast" :class="toastType">
        <div class="toast-icon">
          <span v-if="toastType === 'success'">✅</span>
          <span v-else-if="toastType === 'error'">❌</span>
          <span v-else>ℹ️</span>
        </div>
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </div>

    <!-- Tooltip -->
    <div v-if="showTooltip" class="tooltip" :style="tooltipPosition">
      {{ tooltipText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getUserLocation, getIpApproxLocation } from '../services/voiceNotesService.js'
import WaveSurfer from 'wavesurfer.js'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'

// Props

const props = defineProps({
  isOpen: Boolean
})

// Emits
const emit = defineEmits(['close', 'audio-uploaded'])

// WaveSurfer instances
let wavesurfer = null
let record = null
let lastRecordedBlob = null

// États de l'enregistrement
const recordingState = ref('ready') // 'ready', 'recording', 'paused', 'finished'
const isRecording = ref(false)
const isPaused = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const totalTime = ref(0)
const hasRecording = ref(false)
const errorMessage = ref('')
const showError = ref(false)

// Confirmation modal
const showConfirmation = ref(false)
const pendingClose = ref(false)

// Playback speed control


// UX/UI améliorations
const showTooltip = ref(false)
const tooltipText = ref('')
const tooltipPosition = ref({})
const showToastFlag = ref(false)
const toastMessage = ref('')
const toastType = ref('info')

// Upload state and router
const isUploading = ref(false)
const router = useRouter()

// Computed properties
const currentIcon = computed(() => {
  if (isPlaying.value) {
    return { src: '/pause-circle.svg', alt: 'Pause la lecture', class: '' }
  }
  
  if (isPaused.value && (recordingState.value === 'ready' || recordingState.value === 'paused' || recordingState.value === 'finished')) {
    return { src: '/next.svg', alt: 'Reprendre la lecture', class: '' }
  }
  
  if (recordingState.value === 'recording') {
    return { src: '/pause-circle.svg', alt: 'Pause', class: 'pulsing' }
  }
  
  if (recordingState.value === 'paused') {
    return { src: '/next.svg', alt: 'Reprendre l\'enregistrement', class: 'rotate-180' }
  }
  
  return { src: '/next.svg', alt: 'Écouter', class: '' }
})

const canNavigate = computed(() => {
  return recordingState.value === 'ready' || 
         recordingState.value === 'paused' || 
         recordingState.value === 'finished'
})

const canPlayPause = computed(() => {
  return recordingState.value === 'ready' || 
         recordingState.value === 'paused' || 
         recordingState.value === 'finished'
})

const canRecord = computed(() => {
  return true
})

const canDelete = computed(() => {
  return hasRecording.value || isRecording.value
})

const canShare = computed(() => {
  return recordingState.value === 'finished'
})

const recordButtonText = computed(() => {
  if (recordingState.value === 'ready') {
    return 'Enregistrer'
  } else if (recordingState.value === 'recording') {
    return 'Pause'
  } else if (recordingState.value === 'paused') {
    return 'Reprendre'
  } else if (recordingState.value === 'finished') {
    return 'Enregistrer'
  }
  return 'Enregistrer'
})

// Format time helper
function formatTime(seconds) {
  const roundedSeconds = Math.round(seconds * 100) / 100
  const mins = Math.floor(roundedSeconds / 60)
  const secs = Math.floor(roundedSeconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// WaveSurfer initialization
async function initWaveSurfer() {
  if (wavesurfer) {
    wavesurfer.destroy()
  }

  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#4C1D95',
    progressColor: '#8B5CF6',
    cursorColor: '#1E1B4B',
    barWidth: 3,
    barGap: 2,
    barRadius: 2,
    height: 100,
    responsive: true,
    normalize: true,
    interact: true
  })

  // Initialize Record plugin
  record = wavesurfer.registerPlugin(
    RecordPlugin.create({
      renderRecordedAudio: true,
      scrollingWaveform: false,
      continuousWaveform: true,
      continuousWaveformDuration: 45,
    })
  )

  // Record events
  record.on('record-start', () => {
    console.log('Recording started')
    isRecording.value = true
    recordingState.value = 'recording'
    currentTime.value = 0
    totalTime.value = 0
    hasRecording.value = true
    showToast('Enregistrement démarré ! Parlez maintenant pour capturer votre voix.', 'info')
  })

  record.on('record-end', (blob) => {
    console.log('Recording ended', blob)
    isRecording.value = false
    recordingState.value = 'finished'
    hasRecording.value = true
    
    // Create audio URL for playback
    const audioUrl = URL.createObjectURL(blob)
    lastRecordedBlob = blob
    wavesurfer.loadBlob(blob)
    
    showToast('Enregistrement terminé ! Votre voix a été enregistrée avec succès.', 'success')
  })

  record.on('record-progress', (time) => {
    currentTime.value = time / 1000 // Convert to seconds
    totalTime.value = Math.max(totalTime.value, currentTime.value)
  })

  // WaveSurfer events
  wavesurfer.on('play', () => {
    isPlaying.value = true
    isPaused.value = false
  })

  wavesurfer.on('pause', () => {
    isPlaying.value = false
    isPaused.value = true
  })

  wavesurfer.on('finish', () => {
    isPlaying.value = false
    isPaused.value = false
    currentTime.value = 0
  })

  wavesurfer.on('timeupdate', (time) => {
    if (isPlaying.value) {
      currentTime.value = time
    }
  })
}

// Recording functions
async function toggleRecording() {
  try {
    if (record.isRecording() || record.isPaused()) {
      record.stopRecording()
    } else {
      await record.startRecording()
    }
  } catch (error) {
    console.error('Recording error:', error)
    showError.value = true
    errorMessage.value = 'Erreur d\'accès au microphone. Veuillez autoriser l\'accès.'
  }
}

function togglePlayPauseControl() {
  if (!canPlayPause.value) return

  if (isPlaying.value) {
    wavesurfer.pause()
  } else {
    wavesurfer.play()
  }
}

// Navigation functions
function navigateSegment(direction) {
  if (!canNavigate.value) return
  
  const segmentDuration = 5
  
  if (direction === 'prev') {
    const newTime = Math.max(0, currentTime.value - segmentDuration)
    wavesurfer.setTime(newTime)
    showToast('Reculé de 5 secondes dans l\'enregistrement', 'info')
  } else if (direction === 'next') {
    const newTime = Math.min(totalTime.value, currentTime.value + segmentDuration)
    wavesurfer.setTime(newTime)
    showToast('Avancé de 5 secondes dans l\'enregistrement', 'info')
  }
}



// Action functions
function deleteSelection() {
  if (isRecording.value) {
    record.stopRecording()
  } else if (hasRecording.value) {
    wavesurfer.empty()
    hasRecording.value = false
    recordingState.value = 'ready'
    currentTime.value = 0
    totalTime.value = 0
    showToast('Enregistrement supprimé. Vous pouvez maintenant recommencer un nouvel enregistrement.', 'info')
  }
}

async function shareRecording() {
  if (recordingState.value !== 'finished' || !lastRecordedBlob || isUploading.value) return

  isUploading.value = true
  try {
    // 1) Try geolocation
    let lat = 0
    let lng = 0
    try {
      const pos = await getUserLocation()
      lat = pos.latitude
      lng = pos.longitude
    } catch (e) {
      console.warn('[Share] GPS failed, trying IP-based location:', e)
      // 2) Try IP-based approx location
      try {
        const ip = await getIpApproxLocation()
        lat = ip.latitude
        lng = ip.longitude
      } catch (e2) {
        console.warn('[Share] IP-based location failed, using Cameroon center:', e2)
        // 3) Fallback Cameroon center
        lat = 5.5
        lng = 12.5
      }
    }

    // Build payload
    const form = new FormData()
    form.append('file', lastRecordedBlob, `voice-${Date.now()}.webm`)
    form.append('title', 'Note vocale')
    form.append('user', 'Utilisateur')
    form.append('duration', String(Math.round(totalTime.value)))
    form.append('lat', String(lat))
    form.append('lng', String(lng))
    form.append('description', '')
    form.append('category', 'Général')

    const resp = await fetch('/api/audios', {
      method: 'POST',
      body: form
    })

    if (!resp.ok) throw new Error('Upload failed')
    const data = await resp.json()

    emit('audio-uploaded', data?.note || null)
    showToast('Enregistrement partagé avec succès ! Votre voix est maintenant disponible pour la communauté.', 'success')
    // Inform map to refresh and navigate to it
    try {
      window.dispatchEvent(new CustomEvent('audios-updated'))
    } catch {}
    await router.push('/')
  } catch (error) {
    console.error('Share error:', error)
    showToast('Erreur lors du partage. Veuillez réessayer dans quelques instants.', 'error')
  } finally {
    isUploading.value = false
  }
}

// Toast system
function showToast(message, type = 'info') {
  toastMessage.value = message
  toastType.value = type
  showToastFlag.value = true
  
  setTimeout(() => {
    showToastFlag.value = false
  }, 3000)
}

// Modal functions
function closeModal() {
  if (isRecording.value) {
    showConfirmation.value = true
    pendingClose.value = true
  } else {
    emit('close')
  }
}

function cancelClose() {
  showConfirmation.value = false
  pendingClose.value = false
}

function confirmClose() {
  if (isRecording.value) {
    record.stopRecording()
  }
  showConfirmation.value = false
  pendingClose.value = false
  emit('close')
}

// Touch and gesture handling
function handleHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(50)
  }
}

function handleTouchStart(event) {
  handleHaptic()
}

function handleTouchEnd(event) {
  // Handle touch end if needed
}

// Bottom sheet drag handling
function handleSheetTouchStart(event) {
  // Implementation for sheet dragging
}

function handleSheetTouchMove(event) {
  // Implementation for sheet dragging
}

function handleSheetTouchEnd(event) {
  // Implementation for sheet dragging
}

function handleSheetMouseDown(event) {
  // Implementation for sheet dragging
}

function handleSheetMouseMove(event) {
  // Implementation for sheet dragging
}

function handleSheetMouseUp(event) {
  // Implementation for sheet dragging
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  await initWaveSurfer()
})

onUnmounted(() => {
  if (wavesurfer) {
    wavesurfer.destroy()
  }
})
</script>

<style scoped>
.record-bottom-sheet {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.record-bottom-sheet.is-open {
  opacity: 1;
  visibility: visible;
}

.sheet-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(9, 23, 76, 0.8);
  backdrop-filter: blur(8px);
}

.sheet-content {
  position: relative;
  width: 100%;
  max-width: 402px;
  height: auto;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 32px 32px 0 0;
  overflow: hidden;
  padding: 0;
  transform: translateY(100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
}

@media (max-width: 640px) {
  .sheet-content {
    height: auto;
    max-width: 100%;
  }
}

.record-bottom-sheet.is-open .sheet-content {
  transform: translateY(0);
}

.top-handle {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  cursor: grab;
  user-select: none;
}

.top-handle:active {
  cursor: grabbing;
}

.handle-bar {
  width: 60px;
  height: 6px;
  background: #d0d0d0;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.handle-bar:hover {
  background: #c0c0c0;
  transform: scaleX(1.1);
}

.header-section {
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.control-bar {
  width: 100%;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.control-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}

.nav-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.nav-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.nav-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.nav-button:active {
  transform: scale(0.95);
}

.nav-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-button.disabled:hover {
  transform: none;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.timer-container {
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.time-total {
  opacity: 0.7;
}

.time-separator {
  opacity: 0.5;
}

.time-current {
  font-weight: 700;
}



.control-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}



/* Rotation pour les icônes */
.rotate-180 {
  transform: rotate(180deg);
}

.action-button {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}



.action-button.pause {
  background: rgba(255, 71, 117, 0.9);
  box-shadow: 0 4px 16px rgba(255, 71, 117, 0.4);
}

.action-button:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-button.pause:hover {
  background: rgba(255, 71, 117, 1);
  box-shadow: 0 6px 20px rgba(255, 71, 117, 0.6);
}

.action-button:active {
  transform: scale(0.95);
}

.action-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.action-button.disabled:hover {
  transform: none;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.lane-info {
  width: 100%;
  max-width: 271px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.lane-number {
  color: #868276;
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 124%;
}

.lane-text {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;
}

.lane-text span {
  color: #1B170B;
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 124%;
}



/* Bottom Section */
.bottom-section {
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 1);
}

.action-btn:active {
  transform: translateY(0);
}

.action-btn.delete {
  background: rgba(255, 71, 117, 0.1);
  border-color: rgba(255, 71, 117, 0.2);
}

.action-btn.delete:hover {
  background: rgba(255, 71, 117, 0.15);
}

.action-btn.record {
  background: rgba(17, 197, 77, 0.1);
  border-color: rgba(17, 197, 77, 0.2);
}

.action-btn.record:hover {
  background: rgba(17, 197, 77, 0.15);
}

.action-btn.share {
  background: linear-gradient(135deg, #FF4775, #E63946);
  border: none;
  box-shadow: 
    0 4px 20px rgba(255, 71, 117, 0.4),
    0 8px 30px rgba(255, 71, 117, 0.2);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.share:hover {
  transform: scale(1.1);
  box-shadow: 
    0 6px 25px rgba(255, 71, 117, 0.5),
    0 12px 40px rgba(255, 71, 117, 0.3);
}

.action-btn.share:active {
  transform: scale(0.95);
}

.action-btn.share img {
  filter: brightness(0) invert(1); /* Rend l'icône blanche */
  display: block;
  margin: 0;
  flex-shrink: 0;
}

/* Loading state for share button */
.action-btn.share.loading {
  opacity: 0.85;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255,255,255,0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}



.action-btn span {
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
}



.action-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.action-btn.disabled:hover {
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
}





/* Audio Level Container - Disabled */
/* .audio-level-container {
  margin-top: 16px;
  padding: 0 20px;
}

.level-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 40px;
  justify-content: center;
}

.level-bar {
  width: 3px;
  background: linear-gradient(180deg, #11C54D, #00FF88);
  border-radius: 2px;
  animation: levelPulse 0.5s ease-in-out infinite;
  min-height: 4px;
}

@keyframes levelPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
} */

/* Pulsing animation */
.pulsing {
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Tutorial Modal */
.tutorial-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(9, 23, 76, 0.9);
  backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.tutorial-content {
  background: white;
  border-radius: 24px;
  padding: 32px 24px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(9, 23, 76, 0.3);
  animation: slideUp 0.3s ease;
}

.tutorial-step {
  animation: fadeInStep 0.3s ease;
}

.tutorial-step .step-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  animation: bounce 2s ease-in-out infinite;
}

.tutorial-step h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #09174C;
  margin-bottom: 12px;
}

.tutorial-step p {
  color: #868276;
  line-height: 1.5;
  font-size: 1rem;
}

.tutorial-footer {
  margin-top: 24px;
}

.tutorial-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #FF4775;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tutorial-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 71, 117, 0.3);
}

/* Tooltip */
.tooltip {
  position: fixed;
  background: #09174C;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 4000;
  pointer-events: none;
  transform: translateX(-50%);
  animation: fadeIn 0.2s ease;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #09174C;
}

/* Toast System */
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5000;
  animation: slideDown 0.3s ease;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.toast.success {
  border-left: 4px solid #11C54D;
}

.toast.error {
  border-left: 4px solid #FF4775;
}

.toast.info {
  border-left: 4px solid #667eea;
}

.toast-icon {
  font-size: 18px;
}

.toast-message {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInStep {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .control-bar {
    border: 2px solid #F1EDE1;
  }
  
  .nav-button {
    border: 2px solid #F1EDE1;
  }
  
  .action-button {
    border: 2px solid #F1EDE1;
  }
  
  .control-btn {
    border: 2px solid #868276;
  }
}

/* Error modal styles */
.error-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(9, 23, 76, 0.8);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.error-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 300px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.error-message {
  color: #1B170B;
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.error-close {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #FF4775;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.error-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 71, 117, 0.3);
}

/* Confirmation modal styles */
.confirmation-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(9, 23, 76, 0.8);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.confirmation-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.confirmation-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.confirmation-content h3 {
  color: #1B170B;
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.confirmation-message {
  color: #868276;
  font-family: 'Figtree', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.confirmation-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirmation-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.confirmation-btn.cancel {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.confirmation-btn.cancel:hover {
  background: rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.confirmation-btn.confirm {
  background: #FF4775;
  color: white;
}

.confirmation-btn.confirm:hover {
  background: #e6395c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 71, 117, 0.3);
}

/* WaveSurfer Waveform Container */
.waveform-container {
  margin-top: 20px;
  padding: 0 20px;
  position: relative;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.waveform {
  width: 100%;
  height: 100px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}



/* Recording state styles */
.action-btn.recording {
  background: rgba(255, 71, 117, 0.9) !important;
  color: white !important;
  animation: recordingPulse 1s ease-in-out infinite;
}

.action-btn.recording span {
  color: white !important;
}

@keyframes recordingPulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(255, 71, 117, 0.7);
  }
  50% { 
    box-shadow: 0 0 0 10px rgba(255, 71, 117, 0);
  }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .waveform-container {
    padding: 0 16px;
  }
  
  .waveform {
    height: 80px;
  }
  

}

/* High contrast mode */
@media (prefers-contrast: high) {
  .waveform {
    border: 2px solid #F1EDE1;
  }
}

.hidden {
  display: none;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .action-btn.recording {
    animation: none;
  }
  
  .pulsing {
    animation: none;
  }
}
</style>
