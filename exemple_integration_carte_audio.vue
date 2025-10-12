<template>
  <div class="app-container">
    <!-- Autres composants... -->
    
    <!-- Carte avec connexion audio -->
    <VoiceMapOpenStreet 
      :playRadioStation="handlePlayRadioFromMap"
      :pauseRadioStation="handlePauseRadioFromMap"
      :currentGlobalStation="currentStation"
      :isGlobalPlaying="isPlaying"
      @play-station="handlePlayStationEvent"
      @pause-station="handlePauseStationEvent"
    />
    
    <!-- SiriSphere ou autre lecteur audio -->
    <SiriSphere 
      ref="siriSphere"
      @play-started="handlePlayStarted"
      @play-paused="handlePlayPaused"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import VoiceMapOpenStreet from './VoiceMapOpenStreet.vue'
import SiriSphere from './SiriSphere.vue'
import { useRadio } from '../composables/useRadio.js'

// Utiliser le composable radio
const {
  currentStation,
  isPlaying,
  isLoading,
  selectStation,
  playAudio,
  pauseAudio
} = useRadio()

const siriSphere = ref(null)

// Fonction appelée quand on clique sur un marqueur radio
const handlePlayRadioFromMap = async (station) => {
  try {
    // 1. Sélectionner la station
    selectStation(station)
    
    // 2. Déclencher la lecture via SiriSphere
    if (siriSphere.value?.audioElement) {
      await playAudio(siriSphere.value.audioElement)
    }
  } catch (error) {
    console.error('Erreur de lecture depuis la carte:', error)
    throw error // Propager l'erreur pour que la carte puisse la gérer
  }
}

const handlePauseRadioFromMap = () => {
  if (siriSphere.value?.audioElement) {
    pauseAudio(siriSphere.value.audioElement)
  }
}

// Événements de fallback si les props ne sont pas utilisées
const handlePlayStationEvent = (station) => {
  handlePlayRadioFromMap(station)
}

const handlePauseStationEvent = () => {
  handlePauseRadioFromMap()
}

// Événements du lecteur audio
const handlePlayStarted = () => {
  console.log('Lecture démarrée depuis SiriSphere')
}

const handlePlayPaused = () => {
  console.log('Lecture en pause depuis SiriSphere')
}
</script>
