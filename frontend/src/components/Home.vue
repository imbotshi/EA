<template>
  <div class="home-container">
    <!-- Header Component -->
    <AppHeader @tab-change="handleTabChange" />
    
    <!-- Main Content -->
    <main class="main-content">
      <!-- Radio Tab Content -->
      <div v-if="currentTab === 'Radio'" class="content-box">
        <!-- Live Status Indicator -->
        <div class="live-indicator-container">
          <LiveIndicator 
            :state="isLoading ? 'loading' : (isPlaying ? 'live' : 'paused')" 
            :announce="true"
            class="mb-4"
          />
          <!-- Indicators moved from SiriSphere: listeners (left) and volume (right) -->
          <div class="station-indicators">
            <div class="indicator left" title="Auditeurs en direct">
              <span class="dot live" aria-hidden="true"></span>
              <span class="indicator-text">{{ liveListenersDisplay }}</span>
            </div>
            <div class="indicator right" title="Volume">
              <span class="indicator-text">{{ volumePercent }}%</span>
            </div>
          </div>
        </div>

        <!-- Siri-like Sphere Visualizer (source unique de l'état radio) -->
        <SiriSphere 
          ref="siriSphere"
          @play-started="handlePlayStarted"
          @play-paused="handlePlayPaused"
          @audio-error="handleAudioError"
          @loading-state="handleLoadingState"
          @volume-changed="handleVolumeChanged"
          @next-station="handleNextStation"
          @previous-station="handlePreviousStation"
          @station-changed="s => (currentStation.value = s)"
          @double-tap="handleDoubleTap"
        />
        
        <!-- Radio Station Detail - Design Figma -->
        <RadioStationDetail
          :station="currentStation"
          :is-playing="isPlaying"
          :key="currentStation?.id || 'no-station'"
        />
      </div>
      
      <!-- Podcast Tab Content -->
      <div v-else-if="currentTab === 'Podcast'" class="podcast-tab-container">
        <PodcastPlayer />
      </div>
      
      <!-- Mon village Tab Content -->
      <div v-else-if="currentTab === 'Mon village'" class="voice-tab-container">
        <VoiceMapOpenStreet 
          :playRadioStation="handlePlayRadioFromMap"
          :pauseRadioStation="handlePauseRadioFromMap"
          :currentGlobalStation="currentStation"
          :isGlobalPlaying="isPlaying"
        />
      </div>
      
      <!-- Audio Player - Outside the card with 12px gap -->
      <!-- <div class="audio-player-container">
        <AudioPlayer @delete="handleDeleteAudio" />
      </div> -->
    </main>
    
    <!-- Floating Action Button -->
    <FloatingActionButton 
      v-if="currentTab !== 'Podcast' && currentTab !== 'Radio'"
      @click="openRecordOverlay"
    />
    
    <!-- Record Overlay -->
    <RecordOverlay 
      :is-visible="showRecordOverlay"
      @close="closeRecordOverlay"
      @recording-published="handleRecordingPublished"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRadio } from '../composables/useRadio.js'
import AppHeader from './AppHeader.vue'
import RadioStationDetail from './RadioStationDetail.vue'
import PodcastPlayer from './PodcastPlayer.vue'
import SiriSphere from './SiriSphere.vue'
import AudioPlayer from './AudioPlayer.vue'
import FloatingActionButton from './FloatingActionButton.vue'
import TooltipSystem from './TooltipSystem.vue'
import LiveIndicator from './LiveIndicator.vue'
import VoiceMapOpenStreet from './VoiceMapOpenStreet.vue'
import RecordOverlay from './RecordOverlay.vue'

// Emits
const emit = defineEmits(['open-record'])

// Référence vers SiriSphere pour accéder à l'élément audio
const siriSphere = ref(null)

// Utiliser le composable radio pour la gestion audio
const {
  currentStation: radioCurrentStation,
  isPlaying: radioIsPlaying,
  isLoading: radioIsLoading,
  selectStation,
  playAudio,
  pauseAudio
} = useRadio()

// État UI local synchronisé via les événements de SiriSphere
const currentStation = radioCurrentStation
const isPlaying = radioIsPlaying
const isLoading = radioIsLoading
const volumeLevel = ref(0)
const isRecording = ref(false)
const showRecordOverlay = ref(false)

// Indicators state
const volumePercent = computed(() => {
  const v = Number(volumeLevel.value || 0)
  return Math.max(0, Math.min(100, Math.round(v * 100)))
})

const liveListenersDisplay = computed(() => {
  const n = currentStation.value?.listeners
  if (typeof n !== 'number' || n < 0) return '0'
  if (n >= 10000) return Math.round(n / 1000) + 'k'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
})

// Tab state
const currentTab = ref('Mon village')

// Reactive state
const showTooltip = ref(false)
const tooltipText = ref('')
const tooltipPosition = ref({})

// Animation management
let animationId = null

// Lifecycle hooks
onMounted(async () => {
  initializeAnimations()
})

onUnmounted(() => {
  cleanupAnimations()
})

// Methods
function initializeAnimations() {
  startVisualizerAnimation()
}

function cleanupAnimations() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
}

function startVisualizerAnimation() {
  const animate = () => {
    // Animation logic here
    animationId = requestAnimationFrame(animate)
  }
  animate()
}

function showTooltipFor(element, text) {
  const rect = element.getBoundingClientRect()
  tooltipPosition.value = {
    left: rect.left + rect.width / 2 + 'px',
    top: rect.top - 40 + 'px'
  }
  tooltipText.value = text
  showTooltip.value = true
  
  setTimeout(() => {
    showTooltip.value = false
  }, 3000)
}

function handleDeleteAudio() {
  // Logique pour supprimer l'audio
  console.log('Audio supprimé')
}

function openRecordModal() {
  // Fonction laissée vide pour référence
  // Le comportement sera géré par le composant parent
}

// === GESTIONNAIRES D'ÉVÉNEMENTS RADIO ===

function handlePlayStarted(station) {
  currentStation.value = station || currentStation.value
  isPlaying.value = true
  isLoading.value = false
  console.log(`▶️ Lecture démarrée: ${currentStation.value?.name}`)
  showTooltipFor(document.querySelector('.sphere-container'), `🎵 ${currentStation.value?.name}`)
}

function handlePlayPaused() {
  isPlaying.value = false
  isLoading.value = false
  console.log('⏸️ Lecture en pause')
  showTooltipFor(document.querySelector('.sphere-container'), '⏸️ En pause')
}

function handleAudioError(error) {
  isPlaying.value = false
  isLoading.value = false
  console.error(`❌ Erreur audio: ${error}`)
  showTooltipFor(document.querySelector('.sphere-container'), `❌ ${error}`)
}

function handleLoadingState(isLoadingState) {
  isLoading.value = !!isLoadingState
  if (isLoading.value) {
    console.log('🔄 Chargement de la station...')
    showTooltipFor(document.querySelector('.sphere-container'), '🔄 Connexion...')
  }
}

function handleVolumeChanged(newVolume) {
  const volumePercent = Math.round(newVolume * 100)
  console.log(`🔊 Volume: ${volumePercent}%`)
  showTooltipFor(document.querySelector('.sphere-container'), `🔊 ${volumePercent}%`)
  volumeLevel.value = Number(newVolume) || 0
}

function handleNextStation() {
  console.log('➡️ Station suivante')
  showTooltipFor(document.querySelector('.sphere-container'), `➡️ ${currentStation.value?.name}`)
}

function handlePreviousStation() {
  console.log('⬅️ Station précédente')
  showTooltipFor(document.querySelector('.sphere-container'), `⬅️ ${currentStation.value?.name}`)
}

function handleDoubleTap() {
  console.log('✨ Mode spécial activé')
  showTooltipFor(document.querySelector('.sphere-container'), '✨ Mode spécial')
}

function handleTabChange(tab) {
  currentTab.value = tab
  console.log('Onglet sélectionné:', tab)
}

// === GESTIONNAIRES D'ÉVÉNEMENTS RECORD OVERLAY ===

function openRecordOverlay() {
  showRecordOverlay.value = true
}

function closeRecordOverlay() {
  showRecordOverlay.value = false
}

function handleRecordingPublished() {
  // Émettre un événement global pour rafraîchir la carte
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('audios-updated'))
  }
}

// === GESTIONNAIRES AUDIO POUR LA CARTE ===

// Élément audio global pour la carte (indépendant de SiriSphere)
let globalAudioElement = null

// Fonction appelée quand on clique sur un marqueur radio de la carte
async function handlePlayRadioFromMap(station) {
  try {
    // 1. Sélectionner la station
    selectStation(station)
    
    // 2. Créer ou utiliser l'élément audio global
    if (!globalAudioElement) {
      globalAudioElement = document.createElement('audio')
      globalAudioElement.crossOrigin = 'anonymous'
      globalAudioElement.volume = 0.8
      
      // Ajouter les event listeners
      globalAudioElement.addEventListener('play', () => {
        isPlaying.value = true
        isLoading.value = false
      })
      
      globalAudioElement.addEventListener('pause', () => {
        isPlaying.value = false
      })
      
      globalAudioElement.addEventListener('loadstart', () => {
        isLoading.value = true
      })
      
      globalAudioElement.addEventListener('canplay', () => {
        isLoading.value = false
      })
      
      globalAudioElement.addEventListener('error', (e) => {
        isPlaying.value = false
        isLoading.value = false
        console.error('Erreur audio:', e)
      })
    }
    
    // 3. Déclencher la lecture avec l'élément audio global
    await playAudio(globalAudioElement)
    
  } catch (error) {
    console.error('Erreur de lecture depuis la carte:', error)
    throw error
  }
}

function handlePauseRadioFromMap() {
  if (globalAudioElement) {
    pauseAudio(globalAudioElement)
  }
}

</script>

<style scoped>
/* Live Indicator Container */
.live-indicator-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 1rem;
  margin-bottom: 1rem;
  position: relative;
}

/* Header-like indicators now hosted in Home */
.station-indicators {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none; /* passive overlay */
}

.indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #FFFFFF;
  font-family: 'ABC Whyte', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  line-height: 1;
  background: rgba(255,255,255,0.06);
  padding: 6px 10px;
  border-radius: 999px;
  backdrop-filter: blur(6px);
}
.indicator .indicator-text { opacity: 0.95; }
.indicator.left { justify-content: flex-start; margin-left: 8px; }
.indicator.right { justify-content: flex-end; margin-right: 8px; }

.dot.live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FF4775;
  box-shadow: 0 0 0 0 #FF4775;
  animation: pulse 1.8s infinite;
}

/* Main Container */
.home-container {
  min-height: 100vh;
  height: 100vh;
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 50%, #2d4a8a 100%);
  color: #F1EDE1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2rem;
  min-height: 0;
  margin-top: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

/* Custom scrollbar for Webkit browsers */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

/* Special padding for podcast tab */
.podcast-tab-container ~ .main-content {
  padding: 0;
  margin-top: 0;
}

/* Content Box */
.content-box {
  border-radius: 1.5rem;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Audio Player Container */
.audio-player-container {
  margin-top: 12px;
  width: 100%;
  max-width: 400px;
  display: flex;
  justify-content: center;
}

/* Responsive Design */
@media (max-width: 480px) {
  .home-container {
    height: 100vh;
    min-height: 100vh;
  }
  
  .main-content {
    flex: 1;
    padding: 0;
    justify-content: flex-start;
    margin-top: 0;
  }
  
  .voice-tab-container {
    margin: -1rem;
    padding: 0;
  }
  
  .content-box {
    padding: 1.5rem;
  }
}

  
  .voice-tab-container {
    margin: -1rem;
    padding: 0;
  }
/* Podcast Content Styles */
.podcast-content {
  text-align: center;
  padding: 2rem 1rem;
}

.podcast-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

.podcast-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #F1EDE1;
}

.podcast-description {
  color: #868276;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* Podcast Tab Container */
.podcast-tab-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  width: 100%;
  height: 100%;
  margin: -2rem -1rem;
  padding: 0;
  min-height: calc(100vh - 120px);
}

/* Voice Tab Container */
.voice-tab-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  width: 120%;
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Voice Content Styles */
.voice-content {
  text-align: center;
  padding: 2rem 1rem;
}

.voice-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

.voice-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #F1EDE1;
}

.voice-description {
  color: #868276;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* Coming Soon Badge */
.coming-soon {
  display: inline-block;
  background: linear-gradient(135deg, #FF4775, #F10F47);
  padding: 0.5rem 1.5rem;
  border-radius: 2rem;
  box-shadow: 0 4px 12px rgba(255, 71, 117, 0.3);
}

.coming-soon-text {
  color: #F1EDE1;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Animations */
@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.1);
    opacity: 0.8;
  }
}
</style>
