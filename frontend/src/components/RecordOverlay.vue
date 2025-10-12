<template>
  <div v-if="show" class="record-overlay" @click="handleBackdropClick">
    <div class="overlay-content" @click.stop>
      <!-- Titre de la section -->
      <div class="overlay-header">
        <p class="overlay-subtitle">Dites-nous ce qui vous préoccupe...</p>
      </div>
      
      <!-- État d'enregistrement - Layout Vertical -->
      <div v-if="state === 'recording' || state === 'review' || state === 'idle'" class="recording-state-vertical">

         <!-- Mini-Map centrée -->
         <div class="mini-map-container">
          <div class="mini-map" :class="{ 'has-location': userLocation }">
            <div ref="mapContainer" class="leaflet-map"></div>
            <div class="map-overlay">
              <div class="location-text">{{ locationText || 'Localisation en cours...' }}</div>
            </div>
          </div>
        </div>

        <!-- Timer en haut -->
               <div class="holographic-timer-top" :class="timerStateClass">
          <div class="timer-text">{{ formatTime(recordingTime) }}</div>
        </div>
        
        <!-- Central-Orb Play/Pause -->
        <div class="central-orb-vertical">
          <div class="orb-core" :class="{ 'recording': isRecording, 'paused': !isRecording && recordingTime > 0 }" @click="toggleRecording">
            <div class="orb-inner">
              <div class="record-icon">
                <!-- Icône Play quand en pause -->
                <svg v-if="!isRecording && recordingTime > 0" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <!-- Icône Pause quand en cours d'enregistrement -->
                <svg v-else-if="isRecording" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                <!-- Icône Record par défaut -->
                <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Boutons d'action horizontaux -->
        <div class="action-buttons-horizontal">
          <button class="action-btn-h delete" @click="cancelRecording" :disabled="recordingTime === 0 && !isRecording" title="Effacer">
            <img src="/delete.svg" alt="Effacer" width="24" height="24">
          </button>
          
          <button class="action-btn-h play" @click="togglePlayback" :disabled="!audioUrl || isRecording" :title="isPlaying ? 'Pause' : 'Lire'">
            <svg v-if="isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          
          <button class="action-btn-h publish" @click="publishRecording" :disabled="recordingTime < 1 || isRecording || isPublishing" title="Publier">
            <img src="/share.svg" alt="Publier" width="24" height="24">
          </button>
        </div>
      </div>
      
      
      <!-- État: Publication réussie -->
      <div v-else-if="state === 'success'" class="success-state">
        <div class="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <h3>Note vocale publiée !</h3>
        <p>Votre message audio est maintenant visible sur la carte.</p>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const emit = defineEmits(['close', 'recording-published'])

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

// Computed pour show
const show = computed(() => props.isVisible)

// Computed pour state
const state = computed(() => recordingState.value)

// État de l'enregistrement
const recordingState = ref('recording') // 'recording', 'review', 'success'
const isRecording = ref(false)
const recordingTime = ref(0)
const isPlaying = ref(false)
const isPublishing = ref(false)
const userLocation = ref(null)
const locationText = ref('En cours...')
const mapImageUrl = ref('')
const audioLevel = ref(0)

// 🎤 VOICE SYSTEM - État initial
console.log('🎤 [VOICE SYSTEM] Initialisation RecordOverlay', {
  recordingState: recordingState.value,
  isRecording: isRecording.value,
  recordingTime: recordingTime.value,
  userLocation: userLocation.value
})

// Progress ring pour le bouton d'enregistrement
const progressOffset = computed(() => {
  const circumference = 2 * Math.PI * 65
  const progress = recordingTime.value / 60 // 60 secondes max
  return circumference - (progress * circumference)
})

// Variables pour la carte
const mapContainer = ref(null)
let map = null
let userMarker = null

// Enregistrement audio
let mediaRecorder = null
let stream = null
let audioChunks = []
let audioBlob = null
let audioUrl = null
let audioElement = null
let recordingTimer = null
let audioContext = null
let analyser = null
let dataArray = null

// Classe dynamique pour le timer
const timerStateClass = computed(() => {
  if (isRecording.value) {
    return 'is-recording';
  }
  if (!isRecording.value && recordingTime.value > 0) {
    return 'is-paused';
  }
  return 'is-idle';
});

const recordingHint = computed(() => {
  if (recordingTime.value < 5) return 'Parlez maintenant...'
  if (recordingTime.value < 30) return 'Continuez à parler...'
  if (recordingTime.value < 50) return 'Bientôt la fin...'
  return 'Arrêt automatique dans ' + (60 - recordingTime.value) + 's'
})

// Obtenir la géolocalisation
const getUserLocation = async () => {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000
      })
    })
    
    userLocation.value = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }
    
    // Mettre à jour la carte avec la position réelle
    updateMapPosition(position.coords.latitude, position.coords.longitude)
    
    // Générer l'URL de la carte statique avec MapBox (meilleure qualité)
    const zoom = 14
    const width = 300
    const height = 200
    // Pas d'image externe, utiliser le gradient par défaut
    mapImageUrl.value = ''
    console.log('Position obtenue:', position.coords.latitude, position.coords.longitude)
    
    // Géocodage inversé pour obtenir l'adresse
    try {
      // Utiliser Nominatim (OpenStreetMap) - gratuit et sans clé API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=fr&addressdetails=1`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data && data.address) {
          const address = data.address
          
          // Extraire quartier et ville depuis Nominatim
          const neighbourhood = address.neighbourhood || address.suburb || address.quarter || address.district
          const city = address.city || address.town || address.village || address.municipality
          const state = address.state || address.region
          const country = address.country
          
          if (neighbourhood && city) {
            locationText.value = `${neighbourhood}, ${city}`
          } else if (city && state) {
            locationText.value = `${city}, ${state}`
          } else if (city) {
            locationText.value = `${city}, ${country || 'Cameroun'}`
          } else if (state) {
            locationText.value = `${state}, ${country || 'Cameroun'}`
          } else {
            locationText.value = `${country || 'Cameroun'}`
          }
        } else {
          locationText.value = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
        }
      } else {
        // Fallback avec coordonnées
        locationText.value = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
      }
    } catch (geocodeError) {
      console.warn('Erreur de géocodage:', geocodeError)
      // Fallback avec coordonnées
      locationText.value = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
    }
    
  } catch (error) {
    console.warn('Erreur de géolocalisation:', error)
    // Fallback: utiliser une position par défaut (centre du Cameroun) - CORRIGER les noms des propriétés
    userLocation.value = { lat: 3.848, lng: 11.502 }
    locationText.value = 'Yaoundé, Cameroun'
    
    // Mettre à jour la carte avec la position par défaut
    updateMapPosition(3.848, 11.502)
    
    console.log('📍 Fallback vers Yaoundé avec coordonnées:', userLocation.value)
  }
}

// Méthodes pour les particules
const getParticleStyle = (index) => {
  const angle = (index * 360) / 50
  const distance = 100 + Math.random() * 200
  const size = 2 + Math.random() * 4
  const duration = 10 + Math.random() * 20
  
  return {
    left: `${50 + Math.cos(angle * Math.PI / 180) * distance}px`,
    top: `${50 + Math.sin(angle * Math.PI / 180) * distance}px`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${Math.random() * 5}s`
  }
}

const getReactiveParticleStyle = (index) => {
  const angle = (index * 360) / 12
  const baseDistance = 120
  const size = 3 + Math.random() * 3
  
  return {
    '--angle': `${angle}deg`,
    '--distance': `${baseDistance}px`,
    '--size': `${size}px`,
    '--duration': `${2 + Math.random() * 2}s`,
    animationDelay: `${index * 0.1}s`
  }
}


// Démarrer l'enregistrement automatiquement
const startRecording = async () => {
  if (isRecording.value) return
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    console.log('✅ [VOICE SYSTEM] Microphone accessible')
    
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
        console.log('📊 [VOICE SYSTEM] Chunk audio reçu:', event.data.size, 'bytes')
      }
    }
    
    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      audioUrl = URL.createObjectURL(audioBlob)
      console.log('🎵 [VOICE SYSTEM] Enregistrement terminé:', {
        blobSize: audioBlob.size,
        duration: recordingTime.value,
        audioUrl: audioUrl
      })
    }
    
    mediaRecorder.start()
    isRecording.value = true
    console.log('🔴 [VOICE SYSTEM] Enregistrement démarré')
    
    // Démarrer le timer
    recordingTimer = setInterval(() => {
      recordingTime.value++
      if (recordingTime.value % 5 === 0) {
        console.log('⏱️ [VOICE SYSTEM] Durée:', recordingTime.value, 's')
      }
    }, 1000)
    
    // Configuration de l'analyseur audio pour les niveaux
    setupAudioAnalyzer()
    
  } catch (error) {
    console.error('❌ [VOICE SYSTEM] Erreur microphone:', error)
    alert('Impossible d\'accéder au microphone. Veuillez vérifier les permissions.')
  }
}

// Toggle Play/Pause pour l'enregistrement
const toggleRecording = () => {
  console.log('🔄 [VOICE SYSTEM] Toggle enregistrement:', {
    currentState: isRecording.value ? 'recording' : 'stopped',
    duration: recordingTime.value
  })
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

// Mettre en pause l'enregistrement
const pauseRecording = () => {
  if (!isRecording.value) return
  
  isRecording.value = false
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause()
  }
  
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

// Reprendre l'enregistrement
const resumeRecording = () => {
  if (isRecording.value) return
  
  isRecording.value = true
  
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume()
  }
  
  // Redémarrer le timer
  recordingTimer = setInterval(() => {
    recordingTime.value++
    
    // Analyser le niveau audio
    if (analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      audioLevel.value = Math.floor(average / 32)
    }
    
    // Arrêt automatique à 60 secondes
    if (recordingTime.value >= 60) {
      stopRecording()
    }
  }, 100)
}

// Arrêter complètement l'enregistrement
const stopRecording = () => {
  console.log('⏹️ [VOICE SYSTEM] Arrêt enregistrement demandé')
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
    
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
    
    recordingState.value = 'review'
    console.log('📝 [VOICE SYSTEM] État changé vers review:', {
      duration: recordingTime.value,
      hasAudioBlob: !!audioBlob
    })
  }
}

// Annuler l'enregistrement
const cancelRecording = () => {
  isRecording.value = false
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
  
  // Nettoyer le contexte audio
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  
  // Réinitialiser l'état sans fermer l'overlay
  recordingTime.value = 0
  recordingState.value = 'idle'
  audioLevel.value = 0
  
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl)
    audioUrl = null
  }
  
  // Réinitialiser les variables globales
  mediaRecorder = null
  stream = null
  audioBlob = null
  analyser = null
  dataArray = null
}


// Lecture/pause de l'audio
const togglePlayback = () => {
  console.log('▶️ [VOICE SYSTEM] Toggle playback:', {
    hasAudioUrl: !!audioUrl,
    isCurrentlyPlaying: isPlaying.value
  })
  
  if (!audioUrl) {
    console.log('❌ [VOICE SYSTEM] Pas d\'audio à lire')
    return
  }
  
  if (isPlaying.value) {
    if (audioElement) {
      audioElement.pause()
      isPlaying.value = false
      console.log('⏸️ [VOICE SYSTEM] Lecture mise en pause')
    }
  } else {
    if (audioElement) {
      audioElement.pause()
    }
    
    audioElement = new Audio(audioUrl)
    audioElement.play()
    isPlaying.value = true
    console.log('▶️ [VOICE SYSTEM] Lecture démarrée')
    
    audioElement.onended = () => {
      isPlaying.value = false
      audioElement = null
      console.log('🏁 [VOICE SYSTEM] Lecture terminée')
    }
  }
}

// Publier l'enregistrement
const publishRecording = async () => {
  console.log('🔴 Bouton Publier cliqué!')
  console.log('📊 État actuel:', {
    audioBlob: !!audioBlob,
    userLocation: !!userLocation.value,
    isPublishing: isPublishing.value,
    recordingTime: recordingTime.value,
    isRecording: isRecording.value
  })
  
  if (!audioBlob || !userLocation.value || isPublishing.value) {
    console.log('❌ Conditions non remplies pour publier')
    return
  }
  
  isPublishing.value = true
  
  try {
    // Créer le FormData pour l'upload
    const formData = new FormData()
    formData.append('file', audioBlob, `voice-${Date.now()}.webm`)
    formData.append('title', `Note vocale ${new Date().toLocaleTimeString()}`)
    formData.append('user', 'Éclaireur')
    formData.append('userId', 'current-user')
    formData.append('duration', String(recordingTime.value))
    
    // Corriger l'accès aux coordonnées - utiliser lat/lng au lieu de latitude/longitude
    const lat = userLocation.value.lat || userLocation.value.latitude || 3.848
    const lng = userLocation.value.lng || userLocation.value.longitude || 11.502
    
    formData.append('lat', String(lat))
    formData.append('lng', String(lng))
    formData.append('description', 'Note vocale enregistrée depuis Mon Village')
    formData.append('category', 'Général')
    
    console.log('📤 Upload audio avec coordonnées:', { lat, lng, duration: recordingTime.value })
    
    const response = await fetch('/api/audios', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ Upload réussi:', result)
    
    // Animation de succès
    recordingState.value = 'success'
    
    // Émettre l'événement pour rafraîchir la carte
    emit('recording-published')
    
    // Fermer automatiquement après 3 secondes
    setTimeout(() => {
      closeOverlay()
    }, 3000)
    
  } catch (error) {
    console.error('💥 Erreur lors de la publication:', error)
    alert(`Erreur lors de la publication: ${error.message}`)
  } finally {
    isPublishing.value = false
  }
}

// Fermer l'overlay
const closeOverlay = () => {
  // Nettoyer les ressources
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl)
  }
  
  if (audioElement) {
    audioElement.pause()
    audioElement = null
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  
  if (recordingTimer) {
    clearInterval(recordingTimer)
  }
  
  // Réinitialiser l'état
  recordingState.value = 'recording'
  isRecording.value = false
  isPlaying.value = false
  recordingTime.value = 0
  
  emit('close')
}


// Clic sur l'overlay (fermer)
const handleBackdropClick = () => {
  if (!isRecording.value) {
    closeOverlay()
  }
}

// Formater le temps
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Démarrage instantané quand l'overlay s'ouvre
// Désactivé le démarrage automatique de l'enregistrement
// watch(() => props.isVisible, (newVal) => {
//   if (newVal && !isRecording.value) {
//     // Démarrer l'enregistrement instantanément
//     startRecording()
//   }
// })

// Initialiser la carte
const initMap = () => {
  if (!mapContainer.value || map) return
  
  // Coordonnées par défaut (Yaoundé, Cameroun)
  const defaultLat = 3.848
  const defaultLng = 11.502
  
  // Créer la carte
  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false
  }).setView([defaultLat, defaultLng], 13)
  
  // Ajouter les tuiles OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map)
  
  // Ajouter le marqueur utilisateur
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: '<div class="user-dot-map"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
  
  userMarker = L.marker([defaultLat, defaultLng], { icon: userIcon }).addTo(map)
}

// Mettre à jour la position sur la carte
const updateMapPosition = (lat, lng) => {
  if (map && userMarker) {
    map.setView([lat, lng], 15)
    userMarker.setLatLng([lat, lng])
  }
}

onMounted(() => {
  // Initialiser la carte après le montage
  nextTick(() => {
    initMap()
  })
})

// Nettoyage
onUnmounted(() => {
  closeOverlay()
})
</script>

<style scoped>
/* Base styles - Interface Spatial Premium */
.record-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, #0a0a23 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(30px);
  overflow: hidden;
}

/* Header Section */
.overlay-header {
  text-align: center;
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.overlay-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-weight: 900;
  letter-spacing: 0.02em;
}

/* Layout Vertical - Recording State */
.recording-state-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

/* Holographic Timer Top - Design System Eclairia */
.holographic-timer-top {
  position: relative;
  text-align: center;
  margin-top: 2rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 71, 117, 0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 71, 117, 0.2);
}

.holographic-timer-top .map-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 8px 12px;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.location-text {
  font-size: 0.75rem;
  color: #FFFFFF;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.025em;
}

.holographic-timer-top .timer-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: #FF4775;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  user-select: none;
  position: relative;
}

.holographic-timer-top.is-recording .timer-text::before,
.holographic-timer-top.is-idle .timer-text::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -12px;
  width: 8px;
  height: 8px;
  background: #FF4775;
  border-radius: 50%;
  transform: translateY(-50%);
  box-shadow: 0 0 0 0 #FF4775;
  animation: timerPulse-red 1.8s infinite;
}

@keyframes timerPulse-red {
  0% { box-shadow: 0 0 0 0 rgba(255, 71, 117, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(255, 71, 117, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 71, 117, 0); }
}

/* Styles pour l'état en pause (doré) */
.holographic-timer-top.is-paused {
  background: rgba(255, 215, 0, 0.12);
  border-color: rgba(255, 215, 0, 0.2);
}

.holographic-timer-top.is-paused .timer-text {
  color: #FFD700;
}

.holographic-timer-top.is-paused .timer-text::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -12px;
  width: 8px;
  height: 8px;
  background: #FFD700;
  border-radius: 50%;
  transform: translateY(-50%);
  box-shadow: 0 0 0 0 #FFD700;
  animation: timerPulse-gold 2.2s infinite;
}

@keyframes timerPulse-gold {
  0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
}

/* Mini-Map Container */
.mini-map-container {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.mini-map {
  width: 200px;
  height: 120px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.mini-map.has-location {
  background: linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a2b5c 100%);
  border-color: rgba(0, 255, 136, 0.3);
}

.map-background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg, 
    rgba(26, 43, 92, 0.3) 0%, 
    rgba(45, 74, 138, 0.2) 100%
  );
  backdrop-filter: blur(1px);
  z-index: 1;
}

.user-position {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
}

.user-marker {
  background: none !important;
  border: none !important;
}

.user-dot-map {
  width: 12px;
  height: 12px;
  background: #00FF88;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
  animation: userDotPulse 2s infinite;
}

.position-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30px;
  height: 30px;
  border: 2px solid rgba(0, 255, 136, 0.4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: positionRipple 3s ease-out infinite;
}

.map-overlay {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
}

.location-text {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

/* Central Orb Vertical */
.central-orb-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1rem 0;
}


.level-bars-horizontal {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 40px;
}

.level-bar-h {
  width: 4px;
  background: rgba(0, 212, 255, 0.3);
  border-radius: 2px;
  transition: all 0.2s ease;
  min-height: 8px;
}

.level-bar-h.active {
  background: linear-gradient(to top, #00D4FF, #FF4775);
  box-shadow: 
    0 0 10px rgba(0, 212, 255, 0.8),
    0 0 20px rgba(0, 212, 255, 0.4);
  animation: levelPulse 0.3s ease-in-out;
  transform: scaleY(calc(1 + var(--intensity) * 0.5));
}

.level-bar-h.silence {
  background: rgba(255, 255, 255, 0.1);
  animation: silenceFade 2s ease-in-out infinite;
}

/* Particules réactives à la voix */
.voice-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  width: 100px;
  height: 100px;
}

.voice-particle {
  position: absolute;
  width: var(--particle-size);
  height: var(--particle-size);
  background: var(--particle-color);
  border-radius: 50%;
  animation: particleFloat var(--particle-delay) linear infinite;
  opacity: 0.8;
}

@keyframes particleFloat {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 1;
  }
  50% {
    transform: translate(calc(var(--random-x, 0) * 50px), calc(var(--random-y, 0) * 50px)) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translate(calc(var(--random-x, 0) * 100px), calc(var(--random-y, 0) * 100px)) scale(0);
    opacity: 0;
  }
}

@keyframes silenceFade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.1; }
}

/* Hint Vertical */
.recording-hint-vertical {
  text-align: center;
  margin: 1rem 0;
}




/* Action Buttons Horizontal */
.action-buttons-horizontal {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  padding-top: 24px;
  width: 100%;
}

.action-btn-h {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.action-btn-h:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
}

.action-btn-h.delete {
  border-color: rgba(2, 27, 70, 0.4);
  background: rgba(2, 27, 70, 0.9)
}

.action-btn-h.delete:hover:not(:disabled) {
  border-color: rgba(255, 71, 117, 0.6);
  background: rgba(255, 71, 117, 0.3);
  box-shadow: 0 8px 25px rgba(255, 71, 117, 0.3);
}

.action-btn-h.play {
  border-color: rgba(2, 27, 70, 0.4);
  background: rgba(2, 27, 70, 0.9)
}

.action-btn-h.play:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(246, 244, 244, 0.3);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
}

.action-btn-h.publish {
  background: linear-gradient(135deg, #FF4775, #E63946);
  box-shadow: 0 4px 20px rgba(255, 71, 117, 0.4), 0 8px 30px rgba(255, 71, 117, 0.2);
  border: none;
}

.action-btn-h.publish:hover:not(:disabled) {
  background: linear-gradient(135deg, #FF5C8A, #FF1A36);
  box-shadow: 0 8px 30px rgba(255, 92, 138, 0.5), 0 12px 40px rgba(255, 26, 54, 0.3);
  transform: translateY(-2px);
}

.action-btn-h:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.action-btn-h img {
  filter: brightness(0) invert(1);
  transition: filter 0.3s ease;
}

.action-btn-h.delete img {
  filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
}

.action-btn-h.play img {
  filter: brightness(0) saturate(100%) invert(50%) sepia(96%) saturate(3207%) hue-rotate(184deg) brightness(104%) contrast(106%);
}


/* Animations */
@keyframes userDotPulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.2);
    opacity: 0.8;
  }
}

@keyframes positionRipple {
  0% {
    width: 12px;
    height: 12px;
    opacity: 1;
  }
  100% {
    width: 60px;
    height: 60px;
    opacity: 0;
  }
}

/* Anneaux de progression multiples */
.progress-rings {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.ring-outer, .ring-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.progress-circle {
  transition: stroke-dashoffset 0.3s ease;
  filter: drop-shadow(0 0 10px currentColor);
}

.secondary-ring {
  animation: ringRotate 8s linear infinite;
}

@keyframes ringRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Ondes sonores 3D */
.sound-waves-3d {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.wave-3d {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 300px;
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: wave3DExpand 3s ease-out infinite;
}

@keyframes wave3DExpand {
  0% {
    width: 200px;
    height: 200px;
    opacity: 1;
    border-width: 3px;
  }
  100% {
    width: 600px;
    height: 600px;
    opacity: 0;
    border-width: 1px;
  }
}

/* Particules réactives */
.reactive-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.reactive-particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, transparent 70%);
  border-radius: 50%;
  transform-origin: center;
  animation: reactiveOrbit var(--duration) linear infinite;
}

@keyframes reactiveOrbit {
  0% {
    transform: rotate(var(--angle)) translateX(var(--distance)) rotate(calc(-1 * var(--angle)));
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--angle) + 360deg)) translateX(var(--distance)) rotate(calc(-1 * (var(--angle) + 360deg)));
    opacity: 0.8;
  }
}

/* Timer holographique */
.holographic-timer {
  position: relative;
  margin: 2rem 0;
}

.timer-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 80px;
  background: radial-gradient(ellipse, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  animation: timerGlow 2s ease-in-out infinite;
  filter: blur(20px);
}

.timer-text {
  font-size: 3rem;
  font-weight: 300;
  color: #FFD700;
  text-shadow: 
    0 0 20px rgba(255, 215, 0, 0.8),
    0 0 40px rgba(255, 215, 0, 0.4);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.1em;
  position: relative;
  z-index: 2;
}


/* Indicateur de niveau audio futuriste */
.futuristic-audio-level {
  margin: 2rem 0;
}

.level-container {
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 3px;
  height: 60px;
  margin-bottom: 1rem;
}

.level-bar-futuristic {
  width: 4px;
  background: linear-gradient(to top, rgba(0, 212, 255, 0.3), rgba(0, 212, 255, 0.1));
  border-radius: 2px;
  transition: all 0.2s ease;
  position: relative;
}

.level-bar-futuristic.active {
  background: linear-gradient(to top, #00D4FF, #FF4775);
  box-shadow: 
    0 0 10px rgba(0, 212, 255, 0.8),
    0 0 20px rgba(0, 212, 255, 0.4);
  animation: levelPulse 0.3s ease-in-out;
}

.level-label {
  font-size: 0.7rem;
  color: rgba(0, 212, 255, 0.8);
  letter-spacing: 0.2em;
  font-weight: 600;
}

@keyframes levelPulse {
  0% { transform: scaleY(1); }
  50% { transform: scaleY(1.2); }
  100% { transform: scaleY(1); }
}

/* Hint premium */
.recording-hint-premium {
  position: relative;
  margin-top: 2rem;
}

.hint-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 40px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translate(-50%, -50%);
  filter: blur(10px);
  animation: hintScan 3s ease-in-out infinite;
}

@keyframes hintScan {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

/* Orbe central avec effet de distorsion */
.central-orb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
}

.orb-core {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 71, 117, 0.8), rgba(255, 215, 0, 0.6), rgba(0, 212, 255, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 0 50px rgba(255, 71, 117, 0.4),
    inset 0 0 50px rgba(255, 255, 255, 0.1);
}

.orb-core.recording {
  background: radial-gradient(circle, #FF4775 0%, #FF6B47 100%);
  box-shadow: 
    0 0 30px rgba(255, 71, 117, 0.8),
    0 0 60px rgba(255, 71, 117, 0.4),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  animation: recordingPulse 1.5s ease-in-out infinite;
}

.orb-core.paused {
  background: radial-gradient(circle, #FFD700 0%, #FFA500 100%);
  box-shadow: 
    0 0 30px rgba(255, 215, 0, 0.8),
    0 0 60px rgba(255, 215, 0, 0.4),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  animation: pausedPulse 2s ease-in-out infinite;
}

@keyframes pausedPulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.05); opacity: 1; }
}

.orb-inner {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.record-icon {
  color: #fff;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
}

@keyframes orbPulse {
  0%, 100% { 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.05);
    filter: brightness(1.2);
  }
}

.record-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(9, 23, 76, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
}

.overlay-content {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(30px);
  border-radius: 3rem;
  padding: 4rem;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  max-width: 600px;
  text-align: center;
  box-shadow: 
    0 30px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: #F1EDE1;
  position: relative;
  overflow: hidden;
}


@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* État d'enregistrement */
.recording-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  position: relative;
}

.recording-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.pulse-circle.ready {
  background: rgba(255, 71, 117, 0.15);
  border: 3px solid rgba(255, 71, 117, 0.3);
}

.pulse-circle.ready:hover {
  transform: scale(1.05);
  background: rgba(255, 71, 117, 0.25);
  border-color: rgba(255, 71, 117, 0.5);
}

.pulse-circle.ready:active {
  transform: scale(0.95);
}

.pulse-circle.pulse-active {
  animation: recordPulse 1.5s ease-in-out infinite;
  background: #FF4775;
  border-color: rgba(255, 255, 255, 0.4);
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-svg {
  width: 100%;
  height: 100%;
}

.progress-ring-circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 3;
}

.progress-ring-circle {
  fill: none;
  stroke: #FF4775;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 408;
  stroke-dashoffset: 408;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-ring-circle.recording {
  stroke: #FFD700;
  animation: progressGlow 2s ease-in-out infinite;
}

.inner-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F1EDE1;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.inner-circle.recording {
  background: rgba(255, 215, 0, 0.2);
  color: #FFD700;
}

.mic-icon, .stop-icon {
  transition: all 0.3s ease;
}

.touch-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 71, 117, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.pulse-circle.ready:active .touch-ripple {
  animation: rippleEffect 0.6s ease-out;
}

.recording-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 300px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1rem;
  transition: all 0.3s ease;
}

.option-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.option-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 71, 117, 0.2);
  border-radius: 50%;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-text strong {
  color: #F1EDE1;
  font-size: 0.95rem;
}

.option-text span {
  color: rgba(241, 237, 225, 0.7);
  font-size: 0.8rem;
}

/* État d'enregistrement */
.recording-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
  position: relative;
}

.recording-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recording-waves {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.wave {
  position: absolute;
  border: 2px solid rgba(255, 71, 117, 0.3);
  border-radius: 50%;
  animation: waveExpand 2s ease-out infinite;
}

.wave-1 {
  width: 160px;
  height: 160px;
  margin: -80px 0 0 -80px;
  animation-delay: 0s;
}

.wave-2 {
  width: 200px;
  height: 200px;
  margin: -100px 0 0 -100px;
  animation-delay: 0.5s;
}

.wave-3 {
  width: 240px;
  height: 240px;
  margin: -120px 0 0 -120px;
  animation-delay: 1s;
}

.recording-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.recording-timer {
  font-size: 3rem;
  font-weight: 700;
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  animation: timerPulse 1s ease-in-out infinite;
}

.recording-hint {
  font-size: 1rem;
  opacity: 0.9;
  color: rgba(255, 215, 0, 0.8);
  animation: fadeInOut 2s ease-in-out infinite;
}

.recording-level-indicator {
  margin-top: 0.5rem;
}

.level-bars {
  display: flex;
  gap: 4px;
  align-items: end;
  justify-content: center;
}

.level-bar {
  width: 4px;
  height: 8px;
  background: rgba(255, 215, 0, 0.3);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.level-bar.active {
  height: 20px;
  background: #FFD700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.cancel-btn {
  position: absolute;
  top: -2rem;
  right: -2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #F1EDE1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
  border-color: rgba(255, 71, 117, 0.5);
}

.cancel-btn-content {
  position: relative;
  z-index: 2;
}

/* État de pré-visualisation */
.preview-state {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-header h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.8;
  justify-content: center;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.play-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #FF4775;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.play-btn:hover {
  background: #F10F47;
  transform: scale(1.05);
}

.audio-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.audio-duration {
  font-size: 0.9rem;
  font-weight: 600;
}

.audio-waveform {
  display: flex;
  align-items: end;
  gap: 2px;
  height: 20px;
}

.waveform-bar {
  width: 3px;
  background: rgba(255, 71, 117, 0.6);
  border-radius: 2px;
  min-height: 4px;
  transition: all 0.3s ease;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.action-btn {
  padding: 1rem 2rem;
  border-radius: 1.5rem;
  border: none;
  font-weight: 600;
  cursor: pointer;
  min-width: 140px;
  min-height: 56px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.btn-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: all 0.6s ease;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #F1EDE1;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.action-btn.secondary .btn-ripple {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.action-btn.secondary:active .btn-ripple {
  width: 300px;
  height: 300px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #FF4775, #F10F47);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  position: relative;
}

.action-btn.primary .btn-ripple {
  background: rgba(255, 255, 255, 0.3);
}

.action-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #F10F47, #E60039);
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(255, 71, 117, 0.4);
}

.action-btn.primary:active .btn-ripple {
  width: 300px;
  height: 300px;
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shine 3s ease-in-out infinite;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* État de succès */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #22C55E;
  animation: successPulse 2s ease-in-out infinite;
}

.success-state h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.success-state p {
  margin: 0;
  opacity: 0.8;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Animations */
@keyframes recordPulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 71, 117, 0.7);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(255, 71, 117, 0);
  }
}

@keyframes successPulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(34, 197, 94, 0);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes rippleEffect {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}

@keyframes waveExpand {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes timerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes progressGlow {
  0%, 100% { 
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
  }
  50% { 
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
  }
}

@keyframes shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.waveform-bar {
  transition: all 0.3s ease;
}

.waveform-bar.active {
  background: #FF4775;
  animation: waveformPulse 0.5s ease-in-out;
}

@keyframes waveformPulse {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}

.play-btn-inner {
  position: relative;
  z-index: 2;
}

.play-btn-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: all 0.6s ease;
}

.play-btn:active .play-btn-ripple {
  width: 100px;
  height: 100px;
}

/* Responsive */
@media (max-width: 480px) {
  .record-overlay {
    padding: 1rem;
  }
  
  .overlay-content {
    padding: 2rem;
  }
  
  .pulse-circle {
    width: 100px;
    height: 100px;
  }
  
  .inner-circle {
    width: 70px;
    height: 70px;
  }
  
  .recording-timer {
    font-size: 1.5rem;
  }
  
  .preview-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>
