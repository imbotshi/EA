<template>
  <div class="home-container">
    <!-- Header Component -->
    <AppHeader />
    
    <!-- Main Content -->
    <main class="main-content">
      <!-- Mon village Content (Always visible) -->
      <div class="voice-tab-container">
        <VoiceMapOpenStreet 
          :playRadioStation="handlePlayRadioFromMap"
          :pauseRadioStation="handlePauseRadioFromMap"
          :currentGlobalStation="currentStation"
          :isGlobalPlaying="isPlaying"
        />
      </div>
    </main>
    
    <!-- Floating Action Button -->
    <FloatingActionButton 
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
import FloatingActionButton from './FloatingActionButton.vue'
import VoiceMapOpenStreet from './VoiceMapOpenStreet.vue'
import RecordOverlay from './RecordOverlay.vue'

// Emits
const emit = defineEmits(['open-record'])

// Utiliser le composable radio pour la gestion audio
const {
  currentStation: radioCurrentStation,
  isPlaying: radioIsPlaying,
  isLoading: radioIsLoading,
  selectStation,
  playAudio,
  pauseAudio
} = useRadio()

// État UI local synchronisé
const currentStation = radioCurrentStation
const isPlaying = radioIsPlaying
const isLoading = radioIsLoading
const showRecordOverlay = ref(false)

// Lifecycle hooks
onMounted(async () => {
  // Any initialization if needed
})

onUnmounted(() => {
  // Cleanup if needed
})

// Methods

function openRecordModal() {
  // Fonction laissée vide pour référence
  // Le comportement sera géré par le composant parent
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

// Élément audio global pour la carte
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
}

  .voice-tab-container {
    margin: -1rem;
    padding: 0;
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
</style>
