<template>
  <div class="voice-map-container">
    <!-- Conteneur de contrôle audio fixe pour les radios -->
    <div v-if="currentStationId && isPlayingStation" class="audio-control-bar radio-control">
      <div class="audio-control-content">
        <!-- Logo/Drapeau du pays -->
        <div class="country-flag">
          <img :src="getCurrentStationFlag()" :alt="getCurrentStationCountry()" class="flag-image" />
        </div>
        
        <!-- Nom de la radio -->
        <div class="station-info">
          <h3 class="station-name">{{ getCurrentStationName() }}</h3>
          <p class="station-country">{{ getCurrentStationCountry() }}</p>
        </div>
        
        <!-- Bouton Play/Pause -->
        <button 
          @click="togglePlayPause" 
          class="play-pause-btn"
          :class="{ 'playing': isPlayingStation }"
        >
          <svg v-if="!isPlayingStation" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Conteneur de contrôle audio fixe pour les notes vocales -->
    <div v-if="currentVoiceNoteId && isPlayingVoiceNote" class="audio-control-bar voice-control">
      <div class="audio-control-content">
        <!-- Icône microphone par défaut -->
        <div class="voice-icon">
          <svg class="mic-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
        
        <!-- Titre fixe avec progression en bas -->
        <div class="voice-info">
          <h3 class="voice-title">Anonyme</h3>
          <div class="audio-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getVoiceProgress() + '%' }"></div>
            </div>
            <span class="time-display">{{ getCurrentTime() }} / {{ getTotalDuration() }}</span>
          </div>
        </div>
        
        <!-- Bouton Play/Pause -->
        <button 
          @click="toggleVoicePlayPause" 
          class="play-pause-btn voice-btn"
          :class="{ 'playing': isPlayingVoiceNote }"
        >
          <svg v-if="!isPlayingVoiceNote" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Carte Leaflet -->
    <div id="voice-map" class="map-container"></div>
    
    <!-- Audio Marker Dialog -->
    <AudioMarkerDialog 
      :show="showAudioDialog"
      :audioData="selectedAudioData || {}"
      :currentUserId="audioGeoService.getCurrentUserId()"
      @close="handleDialogClose"
      @delete="handleAudioDelete"
      @report="handleAudioReport"
    />

    <!-- Fallback: no voice notes -->
    <div v-if="voiceNotes.length === 0" class="no-voice-notes">
      Aucune note disponible
    </div>

    <!-- Boutons de contrôle d'affichage -->
    <div class="map-controls">
      <!-- Bouton toggle radios -->
      <button
        class="map-control-btn radio-toggle-btn"
        :class="{ active: showRadioStations }"
        @click="toggleRadioStations"
        :title="showRadioStations ? 'Masquer les radios' : 'Afficher les radios'"
        :aria-label="showRadioStations ? 'Masquer les radios' : 'Afficher les radios'"
        type="button"
      >
        <img src="/profile/radio-icon.png" alt="Radio" width="20" height="20" class="control-icon" />
      </button>

      <!-- Bouton toggle voix -->
      <button
        class="map-control-btn voice-toggle-btn"
        :class="{ active: showVoiceNotes }"
        @click="toggleVoiceNotes"
        :title="showVoiceNotes ? 'Masquer les notes vocales' : 'Afficher les notes vocales'"
        :aria-label="showVoiceNotes ? 'Masquer les notes vocales' : 'Afficher les notes vocales'"
        type="button"
      >
        <img src="/profile/default.png" alt="Voix" width="20" height="20" class="control-icon" />
      </button>

      <!-- Bouton GPS pour centrer la position -->
      <button
        class="gps-center-btn"
        :class="{ loading: isCentering }"
        @click="centerOnUserLocation"
        :disabled="isCentering"
        :title="'Centrer sur ma position'"
        aria-label="Centrer sur ma position"
        type="button"
      >
        <img src="/gps.svg" alt="GPS" width="24" height="24" class="gps-icon" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
// Leaflet core and CSS
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// Expose Leaflet globally for plugins that expect window.L
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.L = L
}

// Import new components and services for audio geolocation
import AudioMarkerDialog from './AudioMarkerDialog.vue'
import { useLongPress } from '../composables/useLongPress.js'
import { audioGeoService } from '../services/audioGeoService.js'

// Rafraîchir après upload externe
const handleAudiosUpdated = async () => {
  try {
    await loadVoiceNotesFromApi()
    updateMarkers()
  } catch {}
}
// Clustering for Leaflet markers
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { podcastsData } from '../data/radioStationsData.js'
import { getUserLocation, getIpApproxLocation, getCityFromCoordinates, addNote } from '../services/voiceNotesService.js'

// État des contrôles
const showRadioStations = ref(true)
const showPodcasts = ref(false)
const showVoiceNotes = ref(true)

// Références Leaflet
let map = null
let radioLayer = null
let podcastLayer = null
let voiceLayer = null
let radioCluster = null // cluster group for radio markers
let voiceCluster = null // cluster group for voice markers
let userMarker = null
let userLocationMarker = null // Curseur de position GPS en temps réel
let locationWatchId = null // ID du suivi GPS
const currentUserPosition = ref(null) // Position actuelle de l'utilisateur
const isCentering = ref(false) // Etat du bouton de centrage

// État de lecture des stations
const currentStationId = ref(null)
const isPlayingStation = ref(false)
const loadingStationId = ref(null)
const radioMarkersMap = new Map() // Stockage des marqueurs par ID

// État de lecture des notes vocales
const currentVoiceNoteId = ref(null)
const isPlayingVoiceNote = ref(false)
const loadingVoiceNoteId = ref(null)
const voiceMarkersMap = new Map() // Stockage des marqueurs vocaux par ID
const audioElements = new Map() // Stockage des éléments audio

// Variable pour l'audio en cours de lecture
let currentAudio = null

// État pour les fonctionnalités de géolocalisation audio
const showAudioDialog = ref(false)
const selectedAudioData = ref(null)
const userPositionMarker = ref(null)
const isTrackingPosition = ref(false)

// Events vers le parent pour gérer l'audio global
const emit = defineEmits(['play-station', 'pause-station'])

// Props pour recevoir les fonctions audio du parent
const props = defineProps({
  playRadioStation: {
    type: Function,
    default: null
  },
  pauseRadioStation: {
    type: Function,
    default: null
  },
  currentGlobalStation: {
    type: Object,
    default: null
  },
  isGlobalPlaying: {
    type: Boolean,
    default: false
  }
})

// Fonction pour déclencher la lecture via le système global
const playRadioStation = async (station) => {
  if (props.playRadioStation) {
    // Utiliser la fonction fournie par le parent
    await props.playRadioStation(station)
  } else {
    // Fallback : émettre l'événement vers le parent
    emit('play-station', station)
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

// Fonction pour nettoyer l'état de lecture de tous les marqueurs
const clearAllPlayingStates = () => {
  // Parcourir tous les marqueurs radio et désactiver leur état de lecture
  radioStations.value.forEach(station => {
    const marker = getRadioMarkerById(station.id)
    if (marker) {
      setMarkerPlayingState(marker, false)
    }
  })
}

// Fonction pour mettre en pause la radio
const handlePauseRadio = (station) => {
  const marker = getRadioMarkerById(station.id)
  
  // Désactiver l'état de lecture du marqueur
  if (marker) {
    setMarkerPlayingState(marker, false)
  }
  
  // Mettre à jour l'état local
  currentStationId.value = null
  isPlayingStation.value = false
  
  // Appeler la fonction de pause du parent
  if (props.pauseRadioStation) {
    props.pauseRadioStation()
  } else {
    emit('pause-station')
  }
  
  console.log('🔇 Radio en pause:', station.name)
}

// === FONCTIONS POUR LE CONTENEUR DE CONTRÔLE AUDIO ===

// Obtenir la station actuellement active
const getCurrentStation = () => {
  return radioStations.value.find(station => station.id === currentStationId.value)
}

// Obtenir le nom de la station active
const getCurrentStationName = () => {
  const station = getCurrentStation()
  return station ? station.name : 'Radio'
}

// Obtenir le pays de la station active
const getCurrentStationCountry = () => {
  const station = getCurrentStation()
  return station ? station.country : 'Inconnu'
}

// Obtenir le drapeau du pays de la station active
const getCurrentStationFlag = () => {
  const station = getCurrentStation()
  if (!station || !station.country) return '/flags/africa.svg'
  
  // Mapping des pays vers les drapeaux (fichiers SVG dans /public/flags/)
  const countryFlags = {
    'République Démocratique du Congo': '/flags/cd.svg',
    'RDC': '/flags/cd.svg',
    'Congo': '/flags/cd.svg',
    'Sénégal': '/flags/sn.svg',
    'France': '/flags/fr.svg',
    'Royaume-Uni': '/flags/gb.svg',
    'UK': '/flags/gb.svg',
    'Cameroun': '/flags/cm.svg',
    'Côte d\'Ivoire': '/flags/ci.svg',
    'Mali': '/flags/ml.svg',
    'Burkina Faso': '/flags/bf.svg',
    'Niger': '/flags/ne.svg',
    'Tchad': '/flags/td.svg',
    'Gabon': '/flags/ga.svg'
  }
  
  return countryFlags[station.country] || '/flags/africa.svg'
}

// Toggle Play/Pause depuis le conteneur de contrôle radio
const togglePlayPause = () => {
  const station = getCurrentStation()
  if (!station) return
  
  if (isPlayingStation.value) {
    handlePauseRadio(station)
  } else {
    handleRadioClick(station)
  }
}

// === FONCTIONS POUR LE CONTENEUR DE CONTRÔLE VOCAL ===

// Obtenir la note vocale actuellement active
const getCurrentVoiceNote = () => {
  return voiceNotes.value.find(note => note.id === currentVoiceNoteId.value)
}

// Obtenir le titre de la note vocale active
const getCurrentVoiceNoteTitle = () => {
  const note = getCurrentVoiceNote()
  return note ? note.title : 'Note vocale'
}

// Obtenir l'utilisateur de la note vocale active
const getCurrentVoiceNoteUser = () => {
  const note = getCurrentVoiceNote()
  return note ? note.user : 'Utilisateur'
}

// Obtenir la catégorie de la note vocale active
const getCurrentVoiceNoteCategory = () => {
  const note = getCurrentVoiceNote()
  return note ? note.category : 'Général'
}

// Obtenir l'avatar de l'utilisateur de la note vocale active
const getCurrentVoiceNoteAvatar = () => {
  const note = getCurrentVoiceNote()
  if (!note || !note.user) return '/profile/default.png'
  
  // Mapping des utilisateurs vers leurs avatars
  const userAvatars = {
    'Éclaireur': '/profile/eclaireur.png',
    'Utilisateur': '/profile/default.png',
    'Admin': '/profile/admin.png'
  }
  
  return userAvatars[note.user] || '/profile/default.png'
}

// État de progression audio
const currentTime = ref(0)
const totalDuration = ref(0)

// Obtenir la progression en pourcentage
const getVoiceProgress = () => {
  if (totalDuration.value === 0) return 0
  return Math.round((currentTime.value / totalDuration.value) * 100)
}

// Formater le temps en mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Obtenir le temps actuel formaté
const getCurrentTime = () => {
  return formatTime(currentTime.value)
}

// Obtenir la durée totale formatée
const getTotalDuration = () => {
  return formatTime(totalDuration.value)
}

// Toggle Play/Pause depuis le conteneur de contrôle vocal
const toggleVoicePlayPause = () => {
  console.log('🔄 [VOICE MAP] Toggle voice play/pause demandé')
  const note = getCurrentVoiceNote()
  if (!note) {
    console.log('❌ [VOICE MAP] Aucune note vocale active')
    return
  }
  
  console.log('📊 [VOICE MAP] État actuel:', {
    isPlaying: isPlayingVoiceNote.value,
    currentNoteId: currentVoiceNoteId.value,
    noteId: note.id
  })
  
  if (isPlayingVoiceNote.value) {
    console.log('⏸️ [VOICE MAP] Demande de pause')
    handlePauseVoiceNote(note)
  } else {
    console.log('▶️ [VOICE MAP] Demande de lecture')
    handleVoiceNoteClick(note)
  }
}

// Observateurs et intervalles globaux pour cleanup correct
let tilesObserver = null
let labelsObserver = null
let labelsPeriodicCheck = null
let labelsDetectionInterval = null

// Utiliser les données importées
const radioStations = ref([])
const podcasts = ref(podcastsData)
const voiceNotes = ref([]) // Sera rempli par le service

// État de la recherche et des filtres
const searchQuery = ref('')
const selectedCountry = ref('')
const selectedGenre = ref('')

// État de l'enregistrement
const isRecording = ref(false)
const recordingTime = ref(0)
let recordingInterval = null

// Charger les notes vocales depuis l'API backend (audios.json)
const loadVoiceNotesFromApi = async () => {
  console.log('🗺️ [VOICE MAP] Chargement des notes vocales depuis l\'API...')
  try {
    const notes = await audioGeoService.fetchAudioNotes()
    console.log('✅ [VOICE MAP] Chargé', notes.length, 'notes vocales')
    console.log('📍 [VOICE MAP] Détails des notes:', notes.map(n => ({
      id: n.id,
      title: n.title,
      user: n.user,
      coordinates: n.coordinates,
      lat: n.lat,
      lng: n.lng
    })))
    voiceNotes.value = notes
  } catch (error) {
    console.error('❌ [VOICE MAP] Échec chargement notes vocales:', error)
    voiceNotes.value = []
  }
}

// Gestion du clic sur une note vocale avec animations cosmiques et lecture audio réelle
const handleVoiceNoteClick = (note) => {
  console.log('🎵 [VOICE MAP] Clic sur note vocale:', {
    id: note.id,
    title: note.title,
    audioUrl: note.audioUrl,
    user: note.user
  })
  
  // Stop any currently playing audio
  if (currentAudio) {
    console.log('⏹️ [VOICE MAP] Arrêt audio en cours')
    currentAudio.pause()
    currentAudio = null
    isPlayingVoiceNote.value = false
    currentVoiceNoteId.value = null
  }
  
  // Create and play new audio
  console.log('▶️ [VOICE MAP] Lecture audio:', note.audioUrl)
  currentAudio = new Audio(note.audioUrl)
  
  // Set up event handlers
  currentAudio.onloadedmetadata = () => {
    totalDuration.value = currentAudio.duration
    console.log('📏 [VOICE MAP] Durée audio chargée:', totalDuration.value + 's')
  }
  
  currentAudio.ontimeupdate = () => {
    currentTime.value = currentAudio.currentTime
  }
  
  currentAudio.onended = () => {
    console.log('🏁 [VOICE MAP] Lecture audio terminée')
    isPlayingVoiceNote.value = false
    currentVoiceNoteId.value = null
    currentTime.value = 0
    currentAudio = null
  }
  
  currentAudio.onerror = (error) => {
    console.error('❌ [VOICE MAP] Erreur audio:', error)
    alert('Erreur lors de la lecture audio')
    isPlayingVoiceNote.value = false
    currentVoiceNoteId.value = null
    currentAudio = null
  }
  
  // Start playing
  currentAudio.play().then(() => {
    console.log('✅ [VOICE MAP] Lecture audio démarrée')
    isPlayingVoiceNote.value = true
    currentVoiceNoteId.value = note.id
  }).catch(error => {
    console.error('❌ [VOICE MAP] Erreur lecture audio:', error)
    alert('Erreur lors de la lecture audio')
  })
  
  // Animate marker
  const marker = voiceMarkersMap.get(note.id)
  if (marker) {
    console.log('✨ [VOICE MAP] Animation du marqueur')
    createCosmicRippleAnimationVoice(note)
  }
}

// Gestion du clic sur une station radio avec animations cosmiques et lecture audio réelle
const handleRadioClick = async (station) => {
  if (!map) return
  
  // Vérifier si cette station est déjà en cours de lecture
  if (currentStationId.value === station.id && isPlayingStation.value) {
    // Station en cours : mettre en pause
    handlePauseRadio(station)
    return
  }
  
  // 0. Arrêter l'audio vocal s'il joue
  if (isPlayingVoiceNote.value) {
    const currentNote = getCurrentVoiceNote()
    if (currentNote) {
      handlePauseVoiceNote(currentNote)
    }
  }
  
  // 1. Nettoyer l'état de lecture de tous les autres marqueurs
  clearAllPlayingStates()
  
  // 1. Créer l'animation d'onde cosmique (ripple)
  createCosmicRippleAnimation(station)
  
  // 2. Activer l'animation de chargement sur le marqueur
  const marker = getRadioMarkerById(station.id)
  if (marker) {
    setMarkerLoadingState(marker, true)
  }
  
  try {
    // 3. Déclencher la lecture audio réelle via le système global
    await playRadioStation(station)
    
    // 4. Succès : désactiver le chargement et activer l'état de lecture
    if (marker) {
      setMarkerLoadingState(marker, false)
      setMarkerPlayingState(marker, true)
    }
    
    // 5. Mettre à jour l'état local
    currentStationId.value = station.id
    isPlayingStation.value = true
    
  } catch (error) {
    // 6. Erreur : désactiver le chargement et afficher l'erreur
    if (marker) {
      setMarkerLoadingState(marker, false)
    }
    console.error('Erreur de lecture radio:', error)
  }
  
  // 7. Recentrer la carte
  map.setView(station.coordinates, map.getZoom(), { animate: true })
}

// Fonctions utilitaires pour les animations des marqueurs vocaux
const getVoiceMarkerById = (noteId) => {
  return voiceMarkersMap.get(noteId) || null
}

const setVoiceMarkerLoadingState = (marker, isLoading) => {
  const element = marker.getElement()
  if (!element) return
  
  const markerDiv = element.querySelector('.ecl-marker')
  if (!markerDiv) return
  
  if (isLoading) {
    markerDiv.classList.add('is-loading')
    loadingVoiceNoteId.value = marker._voiceNoteId
  } else {
    markerDiv.classList.remove('is-loading')
    loadingVoiceNoteId.value = null
  }
}

const setVoiceMarkerPlayingState = (marker, isPlaying) => {
  const element = marker.getElement()
  if (!element) return
  
  const markerDiv = element.querySelector('.ecl-marker')
  if (!markerDiv) return
  
  if (isPlaying) {
    markerDiv.classList.add('is-playing')
  } else {
    markerDiv.classList.remove('is-playing')
  }
}

const createCosmicRippleAnimationVoice = (note) => {
  if (!map) return
  
  // Récupérer le marqueur pour obtenir sa position exacte
  const marker = getVoiceMarkerById(note.id)
  if (!marker) return
  
  const markerElement = marker.getElement()
  if (!markerElement) return
  
  // Créer 3 ondes cosmiques concentriques bleues directement sur le marqueur
  for (let i = 0; i < 3; i++) {
    const ripple = document.createElement('div')
    ripple.className = 'cosmic-ripple-voice'
    ripple.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 28px;
      height: 28px;
      border: 2px solid #4f48ec;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      animation: cosmicRippleVoice 2s ease-out ${i * 0.3}s forwards;
      transform: translate(-50%, -50%);
    `
    
    // Ajouter directement au marqueur au lieu du conteneur de carte
    markerElement.appendChild(ripple)
    
    // Nettoyer après l'animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 2000 + (i * 300))
  }
}

// Fonction pour nettoyer l'état de lecture de tous les marqueurs vocaux
const clearAllVoicePlayingStates = () => {
  // Parcourir tous les marqueurs vocaux et désactiver leur état de lecture
  voiceNotes.value.forEach(note => {
    const marker = getVoiceMarkerById(note.id)
    if (marker) {
      setVoiceMarkerPlayingState(marker, false)
    }
  })
}

// Fonction pour mettre en pause la note vocale
const handlePauseVoiceNote = (note) => {
  console.log('⏸️ [VOICE MAP] Pause demandée pour note:', note.id)
  
  const marker = getVoiceMarkerById(note.id)
  
  // Désactiver l'état de lecture du marqueur
  if (marker) {
    setVoiceMarkerPlayingState(marker, false)
  }
  
  // Arrêter l'audio principal (currentAudio)
  if (currentAudio) {
    console.log('⏹️ [VOICE MAP] Arrêt currentAudio')
    currentAudio.pause()
    // Ne pas remettre à 0 pour permettre la reprise
  }
  
  // Arrêter l'audio dans audioElements (fallback)
  const audio = audioElements.get(note.id)
  if (audio) {
    console.log('⏹️ [VOICE MAP] Arrêt audioElements audio')
    audio.pause()
  }
  
  // Mettre à jour l'état local
  currentVoiceNoteId.value = null
  isPlayingVoiceNote.value = false
  
  console.log('✅ [VOICE MAP] Note vocale mise en pause:', note.title)
}

// Fonction pour jouer une note vocale
const playVoiceNote = async (note) => {
  return new Promise((resolve, reject) => {
    // Arrêter toute autre lecture en cours
    audioElements.forEach((audio, id) => {
      if (id !== note.id) {
        audio.pause()
        audio.currentTime = 0
      }
    })
    
    // Créer ou récupérer l'élément audio
    let audio = audioElements.get(note.id)
    if (!audio) {
      audio = new Audio()
      audio.src = note.audioUrl || `/api/audios/${note.id}`
      audio.preload = 'metadata'
      audioElements.set(note.id, audio)
    }
    
    // Gérer les événements audio
    const handleCanPlay = () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      totalDuration.value = audio.duration || parseInt(note.duration) || 0
      resolve()
    }
    
    const handleError = (error) => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      reject(error)
    }
    
    const handleTimeUpdate = () => {
      currentTime.value = audio.currentTime
    }
    
    const handleEnded = () => {
      // Quand l'audio se termine, arrêter l'état de lecture
      currentVoiceNoteId.value = null
      isPlayingVoiceNote.value = false
      currentTime.value = 0
      const marker = getVoiceMarkerById(note.id)
      if (marker) {
        setVoiceMarkerPlayingState(marker, false)
      }
    }
    
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    
    // Démarrer la lecture
    audio.play().catch(reject)
  })
}

// Fonctions utilitaires pour les animations des marqueurs radio
const getRadioMarkerById = (stationId) => {
  return radioMarkersMap.get(stationId) || null
}

const setMarkerLoadingState = (marker, isLoading) => {
  const element = marker.getElement()
  if (!element) return
  
  const markerDiv = element.querySelector('.ecl-marker')
  if (!markerDiv) return
  
  if (isLoading) {
    markerDiv.classList.add('is-loading')
    loadingStationId.value = marker._stationId
  } else {
    markerDiv.classList.remove('is-loading')
    loadingStationId.value = null
  }
}

const setMarkerPlayingState = (marker, isPlaying) => {
  const element = marker.getElement()
  if (!element) return
  
  const markerDiv = element.querySelector('.ecl-marker')
  if (!markerDiv) return
  
  if (isPlaying) {
    markerDiv.classList.add('is-playing')
  } else {
    markerDiv.classList.remove('is-playing')
  }
}

const createCosmicRippleAnimation = (station) => {
  if (!map) return
  
  // Récupérer le marqueur pour obtenir sa position exacte
  const marker = getRadioMarkerById(station.id)
  if (!marker) return
  
  const markerElement = marker.getElement()
  if (!markerElement) return
  
  // Créer 3 ondes cosmiques concentriques directement sur le marqueur
  for (let i = 0; i < 3; i++) {
    const ripple = document.createElement('div')
    ripple.className = 'cosmic-ripple'
    ripple.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 28px;
      height: 28px;
      border: 2px solid #0ff131;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      animation: cosmicRipple 2s ease-out ${i * 0.3}s forwards;
      transform: translate(-50%, -50%);
    `
    
    // Ajouter directement au marqueur au lieu du conteneur de carte
    markerElement.appendChild(ripple)
    
    // Nettoyer après l'animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 2000 + (i * 300))
  }
}

// Coordonnées approximatives (lat, lng) pour les villes présentes dans stations.json
// Permet de placer 1 station par ville sur la carte "Mon village"
const cityCoordinates = {
  'Kinshasa': [-4.4419, 15.2663],
  'Goma': [-1.6585, 29.2200],
  'Dakar': [14.7167, -17.4677],
  'Abidjan': [5.3480, -4.0030],
  'Ouagadougou': [12.3714, -1.5197],
  'Niamey': [13.5120, -2.1120],
  'Conakry': [9.6412, -13.5784],
  'Douala': [4.0511, 9.7679],
  'Yaoundé': [3.8480, 11.5021],
  'Libreville': [0.3901, 9.4544],
  'Brazzaville': [-4.2634, 15.2429],
  'Bangui': [4.3947, 18.5582],
  "N'Djamena": [12.1348, 15.0557],
  'Kigali': [-1.9706, 30.1044],
  'Bujumbura': [-3.3614, 29.3599]
}

// Charger les stations depuis l'API backend et leur associer des coordonnées de ville
const loadStationsFromApi = async () => {
  try {
    const res = await fetch('/api/stations')
    if (!res.ok) throw new Error('Stations fetch failed')
    const data = await res.json()
    // Enrichir avec coordinates si city connue
    const enriched = data
      .map(s => ({
        ...s,
        coordinates: cityCoordinates[s.city] || null
      }))
      .filter(s => Array.isArray(s.coordinates))
    radioStations.value = enriched
    updateMarkers()
  } catch (e) {
    // Silencieux pour ne pas bloquer l'UI
    radioStations.value = []
  }
}

// Setup long press for audio markers
const setupLongPressForMarker = (marker, audioData) => {
  const markerElement = marker.getElement()
  if (!markerElement) return
  
  const { bindEvents } = useLongPress((event) => {
    event.preventDefault()
    event.stopPropagation()
    
    // Show context dialog
    selectedAudioData.value = audioData
    showAudioDialog.value = true
  }, {
    duration: 1500, // 1.5 seconds as per user story
    preventDefault: true
  })
  
  bindEvents(markerElement)
}

// Handle dialog close
const handleDialogClose = () => {
  showAudioDialog.value = false
  selectedAudioData.value = null
}

// Handle audio deletion
const handleAudioDelete = async (audioData) => {
  try {
    await audioGeoService.deleteAudio(audioData.id)
    
    // Remove from local state immediately
    voiceNotes.value = voiceNotes.value.filter(note => note.id !== audioData.id)
    
    // Update markers
    updateMarkers()
    
    // Close dialog
    handleDialogClose()
    
    console.log('Audio deleted successfully:', audioData.id)
  } catch (error) {
    console.error('Error deleting audio:', error)
    alert('Erreur lors de la suppression. Veuillez réessayer.')
  }
}

// Handle audio reporting
const handleAudioReport = async (audioData) => {
  try {
    await audioGeoService.reportAudio(audioData.id, 'inappropriate')
    
    // Close dialog
    handleDialogClose()
    
    alert('Signalement envoyé avec succès.')
    console.log('Audio reported successfully:', audioData.id)
  } catch (error) {
    console.error('Error reporting audio:', error)
    alert('Erreur lors du signalement. Veuillez réessayer.')
  }
}

// Start GPS tracking for real-time position updates
const startGPSTracking = () => {
  if (isTrackingPosition.value) return
  
  const success = audioGeoService.startGPSTracking()
  if (success) {
    isTrackingPosition.value = true
    
    // Subscribe to position updates
    const unsubscribe = audioGeoService.onPositionUpdate((position) => {
      updateUserPositionMarker(position)
      
      // Update position of user's own audio notes (if any)
      updateOwnAudioPositions(position)
    })
    
    // Store unsubscribe function for cleanup
    map._gpsUnsubscribe = unsubscribe
    
    console.log('GPS tracking started')
  }
}

// Stop GPS tracking
const stopGPSTracking = () => {
  if (!isTrackingPosition.value) return
  
  audioGeoService.stopGPSTracking()
  isTrackingPosition.value = false
  
  // Cleanup subscription
  if (map && map._gpsUnsubscribe) {
    map._gpsUnsubscribe()
    delete map._gpsUnsubscribe
  }
  
  // Remove user position marker
  if (userPositionMarker.value && map) {
    map.removeLayer(userPositionMarker.value)
    userPositionMarker.value = null
  }
  
  console.log('GPS tracking stopped')
}

// Update user position marker on map
const updateUserPositionMarker = (position) => {
  if (!map) return
  
  // Remove existing marker
  if (userPositionMarker.value) {
    map.removeLayer(userPositionMarker.value)
  }
  
  // Create new user position marker
  const userIcon = L.divIcon({
    className: 'user-position-marker',
    html: '<div class="user-dot-realtime"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
  
  userPositionMarker.value = L.marker([position.lat, position.lng], { 
    icon: userIcon,
    zIndexOffset: 1000 // Keep on top
  }).addTo(map)
}

// Update positions of user's own audio notes
const updateOwnAudioPositions = async (position) => {
  try {
    const ownAudios = voiceNotes.value.filter(note => 
      audioGeoService.isOwnAudio(note)
    )
    
    for (const audio of ownAudios) {
      // Update position on server
      await audioGeoService.updateAudioPosition(audio.id, position)
      
      // Update local coordinates
      audio.lat = position.lat
      audio.lng = position.lng
      audio.coordinates = [position.lat, position.lng]
      
      // Update marker position on map
      const marker = voiceMarkersMap.get(audio.id)
      if (marker) {
        marker.setLatLng([position.lat, position.lng])
      }
    }
  } catch (error) {
    console.error('Error updating audio positions:', error)
  }
}

// Enforce one audio per user constraint
const enforceOneAudioPerUser = async () => {
  try {
    await audioGeoService.enforceOneAudioPerUser()
    // Reload audio notes after cleanup
    await loadVoiceNotesFromApi()
  } catch (error) {
    console.error('Error enforcing one audio per user:', error)
  }
}

// Démarrer l'enregistrement
const startRecording = async () => {
  try {
    // Arrêter tout audio en cours avant l'enregistrement
    if (isPlayingStation.value) {
      const currentStation = getCurrentStation()
      if (currentStation) {
        handlePauseRadio(currentStation)
      }
    }
    
    if (isPlayingVoiceNote.value) {
      const currentNote = getCurrentVoiceNote()
      if (currentNote) {
        handlePauseVoiceNote(currentNote)
      }
    }
    
    // Enforce one audio per user before recording
    await enforceOneAudioPerUser()
    
    // Demander la permission d'accès au microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    isRecording.value = true
    recordingTime.value = 0
    
    // Démarrer le chronomètre
    recordingInterval = setInterval(() => {
      recordingTime.value++
    }, 1000)
    
    // Créer un MediaRecorder
    const mediaRecorder = new MediaRecorder(stream)
    const audioChunks = []
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      
      try {
        // Upload using the audio geo service
        await audioGeoService.uploadAudio(audioBlob, {
          title: `Note vocale ${new Date().toLocaleTimeString()}`,
          user: 'Éclaireur',
          duration: recordingTime.value,
          description: 'Note vocale géolocalisée',
          category: 'Général'
        })
        
        // Recharger depuis l'API puis remettre les marqueurs
        await loadVoiceNotesFromApi()
        updateMarkers()
        
        // Afficher un message de succès
        alert(`Note vocale enregistrée avec succès ! (${formatRecordingTime(recordingTime.value)})`)
        
      } catch (error) {
        console.error('Error uploading audio:', error)
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.')
      }
      
      // Nettoyer
      stream.getTracks().forEach(track => track.stop())
      isRecording.value = false
      recordingTime.value = 0
      if (recordingInterval) {
        clearInterval(recordingInterval)
        recordingInterval = null
      }
    }
    
    // Démarrer l'enregistrement
    mediaRecorder.start()
    
    // Arrêter automatiquement après 60 secondes
    setTimeout(() => {
      if (isRecording.value) {
        mediaRecorder.stop()
      }
    }, 60000)
    
  } catch (error) {
    console.error('Error starting recording:', error)
    alert('Erreur lors du démarrage de l\'enregistrement.')
  }
}

// Formater le temps d'enregistrement
const formatRecordingTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Fonction de filtrage
const applyFilters = () => {
  const filteredRadioStations = radioStationsData.filter(station => {
    const matchesSearch = station.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          station.city.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          station.country.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          station.genre.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          station.language.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCountry = selectedCountry.value === '' || station.country.toLowerCase() === selectedCountry.value.toLowerCase()
    const matchesGenre = selectedGenre.value === '' || station.genre.toLowerCase() === selectedGenre.value.toLowerCase()

    return matchesSearch && matchesCountry && matchesGenre
  })
  radioStations.value = filteredRadioStations

  const filteredPodcasts = podcastsData.filter(podcast => {
    const matchesSearch = podcast.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          podcast.author.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          podcast.category.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCountry = selectedCountry.value === '' || podcast.country?.toLowerCase() === selectedCountry.value.toLowerCase()
    const matchesGenre = selectedGenre.value === '' || podcast.category.toLowerCase() === selectedGenre.value.toLowerCase()

    return matchesSearch && matchesCountry && matchesGenre
  })
  podcasts.value = filteredPodcasts

  const filteredVoiceNotes = voiceNotes.value.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          note.user.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          note.description.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCountry = selectedCountry.value === '' || note.country?.toLowerCase() === selectedCountry.value.toLowerCase()
    const matchesGenre = selectedGenre.value === '' || note.category?.toLowerCase() === selectedGenre.value.toLowerCase()

    return matchesSearch && matchesCountry && matchesGenre
  })
  voiceNotes.value = filteredVoiceNotes
}

// Fonction de recherche
const handleSearch = () => {
  applyFilters()
}

// Fonction de nettoyage de la recherche
const clearSearch = () => {
  searchQuery.value = ''
  applyFilters()
}

// Initialisation de la carte
const initMap = () => {
  // Vérifier si Leaflet est disponible
  if (typeof L === 'undefined') {
    return
  }

  // Créer la carte avec zoom libre (approche/éloignement sans restriction)
  map = L.map('voice-map', {
    center: [5.5, 12.5], // Centre initial Cameroun
    zoom: 7, // Niveau initial (modifiable ensuite)
    zoomControl: true,
    attributionControl: false,
    minZoom: 2, // Autoriser un zoom arrière large
    maxZoom: 20, // Autoriser un zoom avant détaillé
    scrollWheelZoom: true, // Activer la molette
    doubleClickZoom: true, // Activer double-clic
    boxZoom: true, // Activer zoom avec boîte
    keyboard: true, // Activer contrôles clavier
    dragging: true // Déplacement de la carte
  })

  // Ajouter la couche OpenStreetMap avec style personnalisé
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors',
    maxZoom: 20
  }).addTo(map)

  // Appliquer le style personnalisé à la carte
  applyCustomMapStyle()

  // Créer les couches de marqueurs  // Couches pour les différentes catégories
  radioLayer = L.layerGroup().addTo(map)
  podcastLayer = L.layerGroup().addTo(map)
  voiceLayer = L.layerGroup().addTo(map)

  // Groupe de cluster pour les stations radio
  radioCluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 12,
    maxClusterRadius: 50,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount()
      return L.divIcon({
        html: `<div><span>${count}</span></div>`,
        className: 'marker-cluster ecl-cluster-radio',
        iconSize: L.point(40, 40)
      })
    }
  })
  map.addLayer(radioCluster)

  // Groupe de cluster pour les notes vocales
  voiceCluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    spiderfyOnEveryZoom: true,
    zoomToBoundsOnClick: true,
    chunkedLoading: true,
    disableClusteringAtZoom: 18,
    maxClusterRadius: 70,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount()
      return L.divIcon({
        html: `<div><span>${count}</span></div>`,
        className: 'marker-cluster ecl-cluster-voice',
        iconSize: L.point(40, 40)
      })
    }
  })
  map.addLayer(voiceCluster)

  // Ajouter les couches à la carte
  map.addLayer(radioLayer)
  map.addLayer(podcastLayer)
  map.addLayer(voiceLayer)
 

  // Contrôles supprimés pour une carte plus épurée
  // L.control.zoom({
  //   position: 'bottomright'
  // }).addTo(map)

  // addCustomScaleControl()

  // Événements de déplacement pour maintenir le style
  map.on('moveend', () => {
    applyCustomMapStyle()
    // Forcer le style des labels après le déplacement
    setTimeout(() => {
      applyLabelsStylePRD()
    }, 1000)
  })

  // Écouter l'événement de chargement des tuiles
  map.on('tileload', () => {
    // Appliquer le style des labels après le chargement des tuiles
    setTimeout(() => {
      applyLabelsStylePRD()
    }, 500)
  })

  // Écouter l'événement de fin de chargement des tuiles
  map.on('tileloadend', () => {
    // Appliquer le style des labels après le chargement complet
    setTimeout(() => {
      applyLabelsStylePRD()
    }, 1000)
  })
}

// Contrôle d'échelle supprimé pour une carte plus épurée
// const addCustomScaleControl = () => {
//   const scaleControl = L.control.scale({
//     position: 'bottomleft',
//     metric: true,
//     imperial: false,
//     maxWidth: 200
//   })
//   scaleControl.addTo(map)
// }

// Appliquer le style personnalisé à la carte selon le PRD (pastel/beige amélioré)
const applyCustomMapStyle = () => {
  if (!map) return

  // Créer un style CSS personnalisé pour la carte selon le PRD
  const customStyle = document.createElement('style')
  customStyle.textContent = `
    /* Style PRD : couleurs pastel/beige avec contours doux et effets subtils */
    .leaflet-container {
      background: linear-gradient(135deg, #F5F5DC 0%, #D2B48C 50%, #BC8F8F 100%) !important;
      box-shadow: inset 0 0 50px rgba(210, 180, 140, 0.3) !important;
    }
    
    .leaflet-tile-pane {
      filter: hue-rotate(30deg) saturate(0.7) brightness(1.1) contrast(0.9) !important;
      /* Effet de brouillard supprimé */
    }
    
    .leaflet-tile {
      filter: hue-rotate(15deg) saturate(0.8) brightness(1.1) contrast(0.9) !important;
      transition: all 0.2s ease !important;
      border-radius: 1px !important;
    }
    
    .leaflet-tile:hover {
      filter: hue-rotate(15deg) saturate(0.9) brightness(1.15) contrast(0.95) !important;
      transform: scale(1.01) !important;
      box-shadow: 0 2px 10px rgba(210, 180, 140, 0.2) !important;
    }
    
    /* Overlay pastel/beige supprimé pour éliminer le brouillard */
    
    /* Effet de profondeur supprimé pour éliminer le brouillard */
  `
  
  // Supprimer l'ancien style s'il existe
  const oldStyle = document.getElementById('eclairia-custom-style')
  if (oldStyle) {
    oldStyle.remove()
  }
  
  customStyle.id = 'eclairia-custom-style'
  document.head.appendChild(customStyle)

  // Overlay supprimé pour éliminer le brouillard

  // Filtres réduits pour éliminer le brouillard
  const tiles = document.querySelectorAll('.leaflet-tile')
  tiles.forEach(tile => {
    tile.style.filter = 'hue-rotate(15deg) saturate(0.8) brightness(1.1) contrast(0.9)'
    tile.style.borderRadius = '1px'
    tile.style.transition = 'all 0.2s ease'
  })

  // Observer les changements de tuiles pour appliquer le style
  if (tilesObserver) {
    try { tilesObserver.disconnect() } catch {}
  }
  tilesObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('leaflet-tile')) {
            node.style.filter = 'hue-rotate(15deg) saturate(0.8) brightness(1.1) contrast(0.9)'
            node.style.borderRadius = '1px'
            node.style.transition = 'all 0.2s ease'
          }
        })
      }
    })
  })

  tilesObserver.observe(document.body, {
    childList: true,
    subtree: true
  })

  // Appliquer le style aux labels SVG avec un délai et une surveillance continue
  setTimeout(() => {
    applyLabelsStylePRD()
    // Surveiller les changements de labels en continu
    startLabelMonitoring()
    
    // Ajouter les effets magiques
    addMagicalParticles()
  }, 2000)
}

// Fonction robuste pour styliser les labels selon le PRD
const applyLabelsStylePRD = () => {
  // Rechercher tous les éléments texte dans la carte
  const allTextElements = document.querySelectorAll('text, .leaflet-container text, svg text')
  
  // Appliquer le style PRD à chaque label
  allTextElements.forEach((element, index) => {
    try {
      const text = element.textContent.trim()
      if (!text || text.length < 2) return
      
      // Définir la couleur selon le type de label
      let labelColor = '#F1EDE1' // Couleur par défaut (beige clair)
      
      if (text.length > 10) {
        labelColor = '#E6B8AF' // Couleur pour les noms longs (beige foncé)
      } else if (text.length > 5) {
        labelColor = '#D4A574' // Couleur pour les noms moyens (beige moyen)
      }
      
      // Appliquer les styles PRD
      element.setAttribute('fill', labelColor)
      element.setAttribute('stroke', '#09174C')
      element.setAttribute('stroke-width', '0.5')
      element.setAttribute('font-family', 'Figtree, sans-serif')
      element.setAttribute('font-weight', '600')
      element.setAttribute('font-size', '12px')
      element.setAttribute('text-anchor', 'middle')
      element.setAttribute('dominant-baseline', 'middle')
      
      // Marquer comme stylisé
      element.setAttribute('data-eclairia-styled', 'true')
      
    } catch (error) {
      // Gérer les erreurs silencieusement
    }
  })
  
  // Compter les labels stylisés
  const styledLabels = document.querySelectorAll('[data-eclairia-styled="true"]')
  
  // Si aucun label stylisé, essayer une approche alternative
  if (styledLabels.length === 0) {
    tryAlternativeLabelStyling()
  }
}

// Fonction alternative pour styliser les labels
const tryAlternativeLabelStyling = () => {
  // Rechercher dans tous les éléments de la carte
  const allElements = document.querySelectorAll('.leaflet-container *')
  
  let labelsFound = 0
  
  allElements.forEach(element => {
    try {
      if (element.tagName === 'TEXT' || element.classList.contains('leaflet-text')) {
        const text = element.textContent.trim()
        if (text && text.length > 1) {
          // Appliquer le style alternatif
          element.style.fill = '#F1EDE1'
          element.style.stroke = '#09174C'
          element.style.strokeWidth = '0.5px'
          element.style.fontFamily = 'Figtree, sans-serif'
          element.style.fontWeight = '600'
          element.style.fontSize = '12px'
          
          labelsFound++
        }
      }
    } catch (error) {
      // Gérer les erreurs silencieusement
    }
  })
}

// Fonction pour importer et appliquer la police Figtree
const importAndApplyFigtreeFont = () => {
  // Créer le lien vers Google Fonts
  const fontLink = document.createElement('link')
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap'
  fontLink.rel = 'stylesheet'
  document.head.appendChild(fontLink)
  
  // Créer les styles CSS globaux pour Figtree
  const figtreeStyles = document.createElement('style')
  figtreeStyles.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap');
    
    .leaflet-container text,
    .leaflet-container .leaflet-text,
    .leaflet-container svg text {
      font-family: 'Figtree', sans-serif !important;
      font-weight: 600 !important;
      fill: #F1EDE1 !important;
      stroke: #09174C !important;
      stroke-width: 0.5px !important;
      font-size: 12px !important;
      text-anchor: middle !important;
      dominant-baseline: middle !important;
    }
  `
  document.head.appendChild(figtreeStyles)
}

// Fonction pour styliser les éléments de texte
const styleLabelsWithFigtree = () => {
  // Rechercher tous les éléments texte
  const textElements = document.querySelectorAll('text, .leaflet-container text, svg text')
  
  let styledCount = 0
  
  textElements.forEach((element, index) => {
    try {
      const text = element.textContent.trim()
      if (!text || text.length < 2) return
      
      // Appliquer le style Figtree
      element.setAttribute('fill', '#F1EDE1')
      element.setAttribute('stroke', '#09174C')
      element.setAttribute('stroke-width', '0.5')
      element.setAttribute('font-family', 'Figtree, sans-serif')
      element.setAttribute('font-weight', '600')
      element.setAttribute('font-size', '12px')
      
      styledCount++
      
    } catch (error) {
      // Gérer les erreurs silencieusement
    }
  })
  
  // Si aucun label stylisé, essayer une approche alternative
  if (styledCount === 0) {
    forceLabelStyling()
  }
}

// Fonction pour forcer le style des labels
const forceLabelStyling = () => {
  try {
    // Rechercher tous les SVG dans la carte
    const allSvgs = document.querySelectorAll('.leaflet-container svg')
    
    allSvgs.forEach((svg, svgIndex) => {
      const texts = svg.querySelectorAll('text')
      
      texts.forEach(text => {
        try {
          const textContent = text.textContent.trim()
          if (textContent && textContent.length > 1) {
            // Forcer le style avec setProperty
            text.style.setProperty('fill', '#F1EDE1', 'important')
            text.style.setProperty('stroke', '#09174C', 'important')
            text.style.setProperty('stroke-width', '0.5px', 'important')
            text.style.setProperty('font-family', 'Figtree, sans-serif', 'important')
            text.style.setProperty('font-weight', '600', 'important')
            text.style.setProperty('font-size', '12px', 'important')
          }
        } catch (error) {
          // Gérer les erreurs silencieusement
        }
      })
    })
  } catch (error) {
    // Gérer les erreurs silencieusement
  }
}

// Surveiller les changements de labels en continu
const startLabelMonitoring = () => {
  // Créer/Remplacer l'observateur de mutations
  if (labelsObserver) {
    try { labelsObserver.disconnect() } catch {}
  }
  labelsObserver = new MutationObserver((mutations) => {
    let newLabelsFound = false
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Vérifier si c'est un nouveau label
          if (node.tagName === 'TEXT' || node.classList.contains('leaflet-text')) {
            newLabelsFound = true
          }
          
          // Vérifier les enfants
          const textElements = node.querySelectorAll('text')
          textElements.forEach(text => {
            if (text.textContent.trim().length > 1) {
              newLabelsFound = true
            }
          })
        }
      })
    })
    
    // Si de nouveaux labels sont trouvés, appliquer le style PRD
    if (newLabelsFound) {
      applyLabelsStylePRD()
    }
  })
  
  // Observer le conteneur de la carte
  const mapContainer = document.querySelector('.leaflet-container')
  if (mapContainer) {
    labelsObserver.observe(mapContainer, {
      childList: true,
      subtree: true
    })
  }
  
  // Vérification périodique
  if (labelsPeriodicCheck) {
    try { clearInterval(labelsPeriodicCheck) } catch {}
  }
  labelsPeriodicCheck = setInterval(() => {
    applyLabelsStylePRD()
  }, 2000)
}

// Fonction pour détecter activement les labels
const startActiveLabelDetection = () => {
  // Vérification initiale
  applyLabelsStylePRD()
  
  // Vérification périodique
  if (labelsDetectionInterval) {
    try { clearInterval(labelsDetectionInterval) } catch {}
  }
  labelsDetectionInterval = setInterval(() => {
    applyLabelsStylePRD()
  }, 1000)
}

// Mise à jour des marqueurs
const updateMarkers = () => {
  console.log('🔄 [VOICE MAP] Mise à jour des marqueurs...')
  console.log('📊 [VOICE MAP] État actuel:', {
    radioStations: radioStations.value.length,
    voiceNotes: voiceNotes.value.length,
    showRadioStations: showRadioStations.value,
    showVoiceNotes: showVoiceNotes.value
  })
  
  radioLayer.clearLayers()
  if (radioCluster) radioCluster.clearLayers()
  voiceLayer.clearLayers()
  if (voiceCluster) voiceCluster.clearLayers()

  radioMarkersMap.clear()
  voiceMarkersMap.clear()

  if (showRadioStations.value) {
    console.log('📻 [VOICE MAP] Ajout de', radioStations.value.length, 'stations radio')
    radioStations.value.forEach(station => {
      const marker = L.marker(station.coordinates, {
        icon: createCustomIcon('radio', station.name),
        interactive: true
      })
      marker._stationId = station.id
      radioMarkersMap.set(station.id, marker)
      marker.on('click', () => handleRadioClick(station))
      if (radioCluster) radioCluster.addLayer(marker)
      else radioLayer.addLayer(marker)
    })
  }

  if (showVoiceNotes.value) {
    console.log('🎤 [VOICE MAP] Ajout de', voiceNotes.value.length, 'notes vocales')
    let validNotes = 0
    let invalidNotes = 0
    
    voiceNotes.value.forEach(note => {
      const coords = Array.isArray(note.coordinates) && note.coordinates.length === 2
        ? note.coordinates
        : (typeof note.lat === 'number' && typeof note.lng === 'number' ? [note.lat, note.lng] : null)
      
      if (!coords || isNaN(coords[0]) || isNaN(coords[1])) {
        console.warn('⚠️ [VOICE MAP] Coordonnées invalides pour note:', note.id, coords)
        invalidNotes++
        return
      }

      console.log('📍 [VOICE MAP] Ajout marqueur pour note:', {
        id: note.id,
        title: note.title,
        coords: coords
      })
      
      const marker = L.marker(coords, {
        icon: createCustomIcon('voice', note.title),
        interactive: true
      })
      marker._voiceNoteId = note.id
      voiceMarkersMap.set(note.id, marker)
      marker.on('click', () => handleVoiceNoteClick(note))
      setupLongPressForMarker(marker, note)
      if (voiceCluster) voiceCluster.addLayer(marker)
      else voiceLayer.addLayer(marker)
      validNotes++
      if (voiceCluster) {
        voiceCluster.addLayer(marker)
      } else {
        voiceLayer.addLayer(marker)
      }
    })
  }
}

// Créer des icônes personnalisées selon le PRD (version animée, non agressive)
const createCustomIcon = (type, title, isActive = false, isPlaying = false) => {
  const iconSize = [40, 40]
  const iconAnchor = [20, 40]
  const popupAnchor = [0, -40]

  let imgUrl = ''
  let typeClass = ''

  switch (type) {
    case 'radio':
      // Icône radio + overlay Play/Pause si actif
      imgUrl = '/profile/radio-icon.png'
      typeClass = 'marker--radio'
      break
    case 'podcast':
      imgUrl = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#F5F5DC" opacity="0.95"/>
          <circle cx="20" cy="20" r="16" fill="none" stroke="#D2B48C" stroke-width="1.5"/>
          <rect x="15" y="18" width="2" height="8" fill="#FF8C00"/>
          <rect x="18" y="16" width="2" height="10" fill="#FF8C00"/>
          <rect x="21" y="20" width="2" height="6" fill="#FF8C00"/>
          <rect x="24" y="14" width="2" height="12" fill="#FF8C00"/>
          <path d="M 16 28 L 24 28 L 23 32 L 17 32 Z" fill="#FF8C00" opacity="0.8"/>
        </svg>
      `)
      typeClass = 'marker--podcast'
      break
    case 'voice':
      // Utiliser l'icône default.png depuis public/profile
      imgUrl = '/profile/default.png'
      typeClass = 'marker--voice'
      break
  }

  const overlay = (type === 'radio' && isActive)
    ? `<div class="ecl-marker__overlay ${isPlaying ? 'is-pause' : 'is-play'}">${isPlaying ? '❚❚' : '▶'}</div>`
    : ''

  const html = `
    <div class="ecl-marker ${typeClass} ${(type === 'radio' || type === 'voice') ? 'anim-breathe' : ''} ${isActive ? 'is-active' : ''}">
      <div class="ecl-marker__halo anim-halo"></div>
      <img class="ecl-marker__img" src="${imgUrl}" alt="${type}" />
      ${overlay}
    </div>
  `

  return L.divIcon({
    html,
    className: 'ecl-marker-container',
    iconSize,
    iconAnchor,
    popupAnchor
  })
}

// Contrôles
const toggleRadioStations = () => {
  showRadioStations.value = !showRadioStations.value
  updateMarkers()
}

const togglePodcasts = () => {
  showPodcasts.value = !showPodcasts.value
  updateMarkers()
}

const toggleVoiceNotes = () => {
  showVoiceNotes.value = !showVoiceNotes.value
  updateMarkers()
}

const locateUser = async () => {
  try {
    const position = await getUserLocation()
    const { latitude, longitude } = position
    
    // Créer l'avatar utilisateur avec halo pulsant selon le PRD
    createUserAvatar([latitude, longitude])
    
    // Centrer la carte sur l'utilisateur
    map.setView([latitude, longitude], 7)
    
    // Obtenir le nom de la ville
    try {
      const locationInfo = await getCityFromCoordinates(latitude, longitude)
      // Le popup est déjà configuré dans createUserAvatar
    } catch (error) {
      console.log('Impossible d\'obtenir les informations de localisation')
    }
    
  } catch (error) {
    // GPS indisponible: tenter une localisation approximative via IP
    try {
      const approx = await getIpApproxLocation()
      const { latitude, longitude } = approx
      createUserAvatar([latitude, longitude])
      map.setView([latitude, longitude], 7)
    } catch (_) {
      // Ultime fallback: Cameroun
      const cameroonCenter = [5.5, 12.5]
      createUserAvatar(cameroonCenter)
      map.setView(cameroonCenter, 7)
    }
  }
}
const resetView = () => {
  const cameroonCenter = [5.5, 12.5] // Centre du Cameroun
  map.setView(cameroonCenter, 7) // Zoom pour vue d'ensemble du Cameroun

  // Créer l'avatar utilisateur au centre du Cameroun
  createUserAvatar(cameroonCenter)
}

// Surveiller les changements d'état
watch([showRadioStations, showPodcasts, showVoiceNotes], () => {
  updateMarkers()
})

// Lifecycle
onMounted(async () => {
  // Charger les notes vocales depuis l'API backend
  await loadVoiceNotesFromApi()
  // Écouter l'événement global pour rafraîchir
  if (typeof window !== 'undefined') {
    try { window.addEventListener('audios-updated', handleAudiosUpdated) } catch {}
  }

  // Charger Leaflet depuis CDN si pas déjà chargé
  if (typeof L === 'undefined') {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      // Charger aussi le CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      // Initialiser la carte après chargement
      setTimeout(async () => {
        initMap()
        loadStationsFromApi()
        await loadVoiceNotesFromApi()
        // Placer l'avatar utilisateur par défaut au centre du Cameroun
        const cameroonCenter = [5.5, 12.5]
        createUserAvatar(cameroonCenter)
        // Démarrer le suivi GPS en temps réel
        startRealTimeLocationTracking()
      }, 100)
    }
    document.head.appendChild(script)
  } else {
    initMap()
    // Placer l'avatar utilisateur par défaut au centre du Cameroun
    const cameroonCenter = [5.5, 12.5]
    createUserAvatar(cameroonCenter)
    // Charger les stations depuis l'API et placer les marqueurs radio
    loadStationsFromApi()
    // Charger les notes vocales depuis l'API et placer les marqueurs voice
    await loadVoiceNotesFromApi()
    // Démarrer le suivi GPS en temps réel
    startRealTimeLocationTracking()
  }

  // Initialisation terminée
})

onUnmounted(() => {
  // Arrêter le suivi GPS
  stopRealTimeLocationTracking()

  // Nettoyages des observateurs/intervals
  try { tilesObserver && tilesObserver.disconnect() } catch {}
  try { labelsObserver && labelsObserver.disconnect() } catch {}
  try { labelsPeriodicCheck && clearInterval(labelsPeriodicCheck) } catch {}
  try { labelsDetectionInterval && clearInterval(labelsDetectionInterval) } catch {}

  // Retirer l'écouteur global
  try { window.removeEventListener('audios-updated', handleAudiosUpdated) } catch {}

  // Nettoyer les éléments audio
  audioElements.forEach(audio => {
    audio.pause()
    audio.src = ''
  })
  audioElements.clear()

  // Nettoyer le marker utilisateur
  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }
  if (map) {
    map.remove()
  }
})

// Fonctions globales pour les popups
window.playStation = (stationId) => {
  // Ici vous pouvez implémenter la logique de lecture
}

window.playPodcast = (podcastId) => {
  // Ici vous pouvez implémenter la logique de lecture
}

window.playVoiceNote = (noteId) => {
  const audioElement = document.getElementById(`audio-${noteId}`)
  if (audioElement) {
    audioElement.play()
  }
}

// Suivi GPS en temps réel avec curseur de navigation personnalisé
const startRealTimeLocationTracking = () => {
  if (!navigator.geolocation) return
  
  locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      currentUserPosition.value = [latitude, longitude]
      
      // Mettre à jour le curseur GPS
      updateUserLocationMarker([latitude, longitude])
    },
    (error) => {
      // Gérer les erreurs silencieusement
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  )
}

// Arrêter le suivi GPS
const stopRealTimeLocationTracking = () => {
  if (locationWatchId) {
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = null
  }
}

// Créer ou mettre à jour le curseur de navigation GPS: point minimal + halo
const updateUserLocationMarker = (coordinates) => {
  if (!map) return
  
  // Supprimer l'ancien curseur s'il existe
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker)
  }
  
  // Marqueur avec location.svg et halo animé
  const gpsIcon = L.divIcon({
    className: 'gps-location-marker',
    html: `
      <div class="gps-circle-container">
        <div class="gps-circle-beat"></div>
        <div class="gps-circle-inner">
          <img src="/location.svg" alt="GPS" class="gps-location-icon" />
        </div>
      </div>
    `,
    iconSize: [90, 90],
    iconAnchor: [45, 45],
    popupAnchor: [0, -45]
  })
  
  // Créer le nouveau marqueur GPS (non interactif, sans popup)
  userLocationMarker = L.marker(coordinates, {
    icon: gpsIcon,
    zIndexOffset: 1000,
    interactive: false
  }).addTo(map)
}

// Fonction pour centrer la carte sur la position de l'utilisateur (one-shot, sans animation)
const centerOnUserLocation = async () => {
  if (!map) return
  if (isCentering.value) return
  isCentering.value = true
  try {
    console.debug('[GPS] Center button clicked')
    let coords = currentUserPosition.value
    if (!coords) {
      const position = await getUserLocation()
      coords = [position.latitude, position.longitude]
      currentUserPosition.value = coords
      updateUserLocationMarker(coords)
    }

    // Vue nationale, instantanée, sans animation
    map.setView(coords, 17, { animate: false })

    // Micro-pulsation visuelle unique
    const el = userLocationMarker?.getElement?.()
    if (el) {
      el.classList.add('pulse-once')
      setTimeout(() => el.classList.remove('pulse-once'), 600)
    }
  } catch (e) {
    console.warn('[GPS] Échec de récupération de la position:', e)
    // Essayer d'abord une localisation approximative via IP
    try {
      const approx = await getIpApproxLocation()
      const ipCoords = [approx.latitude, approx.longitude]
      map.setView(ipCoords, 7, { animate: false })
      updateUserLocationMarker(ipCoords)
      currentUserPosition.value = ipCoords
    } catch (_) {
      // Fallback de fond: recentrer sur le Cameroun et afficher/mettre à jour le marqueur
      const fallback = [5.5, 12.5]
      map.setView(fallback, 7, { animate: false })
      updateUserLocationMarker(fallback)
      currentUserPosition.value = fallback
    }
  } finally {
    isCentering.value = false
  }
}

// Fonction pour jouer la voix de l'utilisateur avec effet de stroke qui se décremente
window.playUserVoice = () => {
  // Simuler un audio (remplacez par votre vraie logique audio)
  const audioUrl = 'https://example.com/user-voice.mp3' // URL de votre audio
  
  // Créer un élément audio temporaire
  const audio = new Audio(audioUrl)
  audio.volume = 0.8
  
  // Démarrer la lecture
  audio.play().then(() => {
    // Créer l'effet de stroke qui se décremente autour de l'avatar
    createStrokeEffect()
    
    // Fermer le popup après le début de la lecture
    setTimeout(() => {
      if (userAvatar) {
        userAvatar.closePopup()
      }
    }, 500)
    
  }).catch(error => {
    // Gérer les erreurs silencieusement
  })
}

// Créer l'effet de stroke qui se décremente autour de l'avatar
const createStrokeEffect = () => {
  if (!userAvatar || !map) return
  
  const avatarElement = userAvatar.getElement()
  if (!avatarElement) return
  
  // Créer plusieurs cercles de stroke qui se décremente
  for (let i = 0; i < 3; i++) {
    const strokeCircle = document.createElement('div')
    strokeCircle.className = 'avatar-stroke-effect'
    strokeCircle.style.cssText = `
      position: absolute;
      border: 3px solid #F10F47;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2001;
      animation: strokeDecrement 2s ease-out ${i * 0.2}s forwards;
    `
    
    // Positionner le stroke sur l'avatar
    const avatarRect = avatarElement.getBoundingClientRect()
    const mapRect = map.getContainer().getBoundingClientRect()
    
    const size = 80 + (i * 20) // Taille croissante pour chaque stroke
    strokeCircle.style.width = `${size}px`
    strokeCircle.style.height = `${size}px`
    strokeCircle.style.left = `${avatarRect.left - mapRect.left - (size - avatarRect.width) / 2}px`
    strokeCircle.style.top = `${avatarRect.top - mapRect.top - (size - avatarRect.height) / 2}px`
    
    // Ajouter au conteneur de la carte
    map.getContainer().appendChild(strokeCircle)
    
    // Nettoyer après l'animation
    setTimeout(() => {
      if (strokeCircle.parentNode) {
        strokeCircle.parentNode.removeChild(strokeCircle)
      }
    }, 2000 + (i * 200))
  }
}

window.shareVoiceNote = async (noteId) => {
  try {
    const note = voiceNotes.value.find(n => n.id === noteId)
    if (note && note.audioUrl) {
      if (navigator.share) {
        await navigator.share({
          title: note.title,
          text: note.description || 'Note vocale partagée depuis Eclairia',
          url: note.audioUrl
        })
      } else {
        // Fallback pour les navigateurs qui ne supportent pas l'API Share
        const link = document.createElement('a')
        link.href = note.audioUrl
        link.download = `${note.title}.wav`
        link.click()
      }
    }
  } catch (error) {
    // Gérer les erreurs silencieusement
  }
}

// Fonctions pour les boutons du popup utilisateur Figma
window.centerOnUser = () => {
  console.log('🎯 Centrage sur l\'utilisateur')
  if (userAvatar && map) {
    const latLng = userAvatar.getLatLng()
    map.setView([latLng.lat, latLng.lng], 18, {
      animate: true,
      duration: 1
    })

    // Effet visuel de zoom
    if (userActivityZone) {
      userActivityZone.setStyle({
        color: '#FFD700',
        fillColor: '#FF8C00',
        fillOpacity: 0.5
      })

      setTimeout(() => {
        userActivityZone.setStyle({
          color: '#FF6B6B',
          fillColor: '#FF8C00',
          fillOpacity: 0.3
        })
  }, 2000)
}

    // Fermer le popup après action
    setTimeout(() => {
      map.closePopup()
    }, 1500)
  }
}

window.toggleListening = () => {
  console.log('🎵 Basculement du mode écoute')

  // Simuler l'activation/désactivation du mode écoute
  const isListening = localStorage.getItem('eclairia-listening-mode') === 'true'
  const newState = !isListening

  localStorage.setItem('eclairia-listening-mode', newState.toString())

  if (newState) {
    // Activer le mode écoute
    alert('🎵 Mode Écoute activé ! Vous recevrez des recommandations basées sur votre position.')

    // Effet visuel sur la zone d'activité
    if (userActivityZone) {
      userActivityZone.setStyle({
        color: '#1DB954',
        fillColor: '#11C54D',
        fillOpacity: 0.4
      })
    }
  } else {
    // Désactiver le mode écoute
    alert('🔇 Mode Écoute désactivé.')

    // Remettre les couleurs par défaut
    if (userActivityZone) {
      userActivityZone.setStyle({
        color: '#FF6B6B',
        fillColor: '#FF8C00',
        fillOpacity: 0.3
      })
    }
  }

  // Fermer le popup après action
  setTimeout(() => {
    map.closePopup()
  }, 500)
}

window.sharePosition = () => {
  console.log('📤 Partage de la position')

  if (userAvatar) {
    const latLng = userAvatar.getLatLng()
    const shareText = `🎵 Je découvre de la musique sur Eclairia depuis Douala, Cameroun ! 📍 ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`

    if (navigator.share) {
      navigator.share({
        title: 'Ma position sur Eclairia',
        text: shareText,
        url: window.location.href
      }).catch(() => {
  // Gérer les erreurs silencieusement
})
    } else {
      // Fallback : copier dans le presse-papiers
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('📋 Position copiée dans le presse-papiers !')
        }).catch(() => {
          alert('❌ Impossible de copier la position')
        })
      } else {
        // Fallback ultime
        const textArea = document.createElement('textarea')
        textArea.value = shareText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('📋 Position copiée !')
      }
    }

    // Fermer le popup après action
    setTimeout(() => {
      map.closePopup()
    }, 500)
  }
}

// Avatar utilisateur avec halo pulsant selon le PRD
let userAvatar = null
let userActivityZone = null

// Créer l'avatar utilisateur avec halo pulsant selon le design Figma
const createUserAvatar = (coordinates) => {
  // Supprimer l'ancien avatar s'il existe
  if (userAvatar) {
    map.removeLayer(userAvatar)
  }

  // Calculer la taille de l'avatar selon le zoom (adaptatif)
  const currentZoom = map.getZoom()
  let avatarSize, imageSize
  
  if (currentZoom <= 6) { // Vue nationale
    avatarSize = [100, 100]
    imageSize = 100
  } else if (currentZoom <= 8) { // Vue régionale
    avatarSize = [90, 90]
    imageSize = 90
  } else if (currentZoom <= 10) { // Vue départementale
    avatarSize = [80, 80]
    imageSize = 80
  } else if (currentZoom <= 12) { // Vue ville
    avatarSize = [70, 70]
    imageSize = 70
  } else if (currentZoom <= 14) { // Vue quartier
    avatarSize = [60, 60]
    imageSize = 60
  } else { // Vue locale
    avatarSize = [50, 50]
    imageSize = 50
  }

  // Créer l'avatar avec le design Figma pixel-perfect et adaptatif (non interactif)
  userAvatar = L.marker(coordinates, {
    icon: L.divIcon({
      className: 'user-avatar-marker-figma',
      html: `
        <div class="user-profile-avatar-figma" style="width: ${avatarSize[0]}px; height: ${avatarSize[1]}px;"></div>
      `,
      iconSize: avatarSize,
      iconAnchor: [Math.floor(avatarSize[0] / 2), Math.floor(avatarSize[1] / 2)]
    }),
    interactive: false
  }).addTo(map)
  
  // Créer la zone d'activité avec couleurs pastel douces et meilleure animation
  createUserActivityZone(coordinates)
  
  // Aucun popup associé au clic (profil supprimé)

  // Écouter les événements de zoom pour adapter la taille
  map.on('zoomend', () => {
    if (userAvatar) {
      updateAvatarSize()
    }
  })
}

// Mettre à jour la taille de l'avatar selon le zoom
const updateAvatarSize = () => {
  if (!userAvatar || !map) return
  
  const currentZoom = map.getZoom()
  let newAvatarSize, newImageSize
  
  if (currentZoom <= 6) {
    newAvatarSize = [100, 100]
    newImageSize = 100
  } else if (currentZoom <= 8) {
    newAvatarSize = [90, 90]
    newImageSize = 90
  } else if (currentZoom <= 10) {
    newAvatarSize = [80, 80]
    newImageSize = 80
  } else if (currentZoom <= 12) {
    newAvatarSize = [70, 70]
    newImageSize = 70
  } else if (currentZoom <= 14) {
    newAvatarSize = [60, 60]
    newImageSize = 60
  } else {
    newAvatarSize = [50, 50]
    newImageSize = 50
  }

  // Mettre à jour l'icône avec la nouvelle taille
  const newIcon = L.divIcon({
    className: 'user-avatar-marker-figma',
    html: `
      <div class="user-profile-avatar-figma" style="width: ${newAvatarSize[0]}px; height: ${newAvatarSize[1]}px;"></div>
    `,
    iconSize: newAvatarSize,
    iconAnchor: [Math.floor(newAvatarSize[0] / 2), Math.floor(newAvatarSize[1] / 2)]
  })
  
  userAvatar.setIcon(newIcon)
}

// Créer la zone d'activité avec couleurs pastel douces et meilleure animation
const createUserActivityZone = (coordinates) => {
  // Supprimer l'ancienne zone s'il existe
  if (userActivityZone) {
    map.removeLayer(userActivityZone)
  }
  
  // Rayon adaptable au zoom (plus grand au zoom arrière)
  const currentZoom = map.getZoom()
  const radius = Math.max(80, 250 - (currentZoom * 8)) // 80m à 250m selon le zoom
  
  userActivityZone = L.circle(coordinates, {
    radius: radius,
    color: '#E6B8AF', // Couleur pastel douce (rose pâle)
    fillColor: '#F4CCCC', // Remplissage pastel très doux (rose très pâle)
    fillOpacity: 0.2, // Réduit de 0.4 à 0.2
    weight: 2, // Réduit de 3 à 2
    className: 'user-activity-zone-pastel',
    interactive: false
  }).addTo(map)
  
  // Mettre à jour la zone lors du zoom
  map.on('zoomend', () => {
    if (userActivityZone && userAvatar) {
      const newRadius = Math.max(80, 250 - (map.getZoom() * 8))
      userActivityZone.setRadius(newRadius)
    }
  })
}

// Ajouter des effets de particules lumineuses flottantes (version allégée)
const addMagicalParticles = () => {
  // Créer un conteneur pour les particules
  const particlesContainer = document.createElement('div')
  particlesContainer.className = 'magical-particles-container'
  particlesContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1000;
    overflow: hidden;
  `
  
  document.querySelector('.voice-map-container').appendChild(particlesContainer)
  
  // Créer seulement 3 particules subtiles au lieu de 15
  for (let i = 0; i < 3; i++) {
    createParticle(particlesContainer, i)
  }
}

// Créer une particule individuelle (version allégée)
const createParticle = (container, index) => {
  const particle = document.createElement('div')
  particle.className = 'magical-particle'
  
  // Propriétés simplifiées
  const size = 2
  const startX = 20 + (index * 30)
  const startY = 20 + (index * 20)
  const duration = 15 + (index * 5)
  
  // Couleur unique et subtile
  const color = '#FFD700'
  
  particle.style.cssText = `
    position: absolute;
    width: ${size}px;
    border-radius: 50%;
    opacity: 0.3;
    box-shadow: 0 0 4px ${color};
    animation: particleFloat ${duration}s ease-in-out infinite;
    left: ${startX}%;
    top: ${startY}%;
  `
  
  container.appendChild(particle)
}

// Ajouter des effets de lumière ambiante (version allégée)
// const addAmbientLighting = () => {
//   const ambientLight = document.createElement('div')
//   ambientLight.className = 'ambient-light'
//   ambientLight.style.cssText = `
//     position: absolute;
//     top: 0;
//     left: 0;
//     right: 0;
//     bottom: 0;
//     background: radial-gradient(circle at 50% 50%, rgba(245, 245, 220, 0.05) 0%, transparent 70%);
//     pointer-events: none;
//     z-index: 999;
//     animation: ambientGlow 10s ease-in-out infinite;
//   `
//   
//   document.querySelector('.voice-map-container').appendChild(ambientLight)
// }


</script>

<style scoped>
.voice-map-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 100%);
  border-radius: 1rem;
  overflow: hidden;
}

/* Contrôles de la carte */
.map-controls {
  position: absolute;
    bottom: 20%;
    right: 10%;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Contrôles des POI selon le PRD */
.poi-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.poi-btn {
  padding: 10px 16px;
  border: 2px solid #D2B48C;
  border-radius: 12px;
  background: linear-gradient(135deg, #F5F5DC 0%, #D2B48C 100%);
  color: #8B4513;
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(210, 180, 140, 0.2);
}

.poi-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(210, 180, 140, 0.3);
  border-color: #8B4513;
}

.poi-btn.active {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8C00 100%);
  color: white;
  border-color: #FF6B6B;
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.poi-btn.primary {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: #F5F5DC;
  border-color: #8B4513;
}

.poi-btn.primary:hover {
  background: linear-gradient(135deg, #A0522D 0%, #CD853F 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
}

/* Conteneur de la carte */
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(9, 23, 76, 0.3);
}

@media (max-width: 640px) {
  .map-container {
    display: flex;
    flex-direction: column;
  }
}

/* Styles personnalisés pour la carte Leaflet selon le PRD (pastel/beige amélioré) */
:global(.leaflet-container) {
  background: linear-gradient(135deg, #F5F5DC 0%, #D2B48C 50%, #BC8F8F 100%) !important;
  font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: inset 0 0 50px rgba(210, 180, 140, 0.3) !important;
  border-radius: 1rem !important;
}

:global(.leaflet-tile-pane) {
  filter: hue-rotate(30deg) saturate(0.7) brightness(1.1) contrast(0.9) !important;
  backdrop-filter: blur(1px) !important;
}

:global(.leaflet-tile) {
  filter: hue-rotate(30deg) saturate(0.6) brightness(1.2) contrast(0.8) !important;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border-radius: 2px !important;
}

:global(.leaflet-tile:hover) {
  filter: hue-rotate(30deg) saturate(0.8) brightness(1.3) contrast(0.9) !important;
  transform: scale(1.02) !important;
  box-shadow: 0 4px 20px rgba(210, 180, 140, 0.4) !important;
}

/* Contrôles de zoom supprimés pour une carte plus épurée */
/* :global(.leaflet-control-zoom) {
  border: none !important;
  box-shadow: 0 4px 20px rgba(9, 23, 76, 0.3) !important;
}

:global(.leaflet-control-zoom a) {
  background: rgba(9, 23, 76, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #F1EDE1 !important;
  backdrop-filter: blur(10px) !important;
  font-weight: 600 !important;
  transition: all 0.3s ease !important;
  width: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 18px !important;
}

:global(.leaflet-control-zoom a:hover) {
  background: rgba(255, 71, 117, 0.8) !important;
  border-color: #FF4775 !important;
  transform: scale(1.05) !important;
  box-shadow: 0 4px 15px rgba(255, 71, 117, 0.4) !important;
}

:global(.leaflet-control-zoom a:active) {
  transform: scale(0.95) !important;
} */

/* Attribution personnalisée */
:global(.leaflet-control-attribution) {
  background: rgba(9, 23, 76, 0.8) !important;
  color: #F1EDE1 !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px) !important;
  font-size: 11px !important;
  padding: 4px 8px !important;
}

:global(.leaflet-control-attribution a) {
  color: #FF4775 !important;
  text-decoration: none !important;
}

:global(.leaflet-control-attribution a:hover) {
  color: #F10F47 !important;
  text-decoration: underline !important;
}

/* Contrôle d'échelle supprimé pour une carte plus épurée */
/* :global(.leaflet-control-scale) {
  background: rgba(9, 76, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #F1EDE1 !important;
  backdrop-filter: blur(10px) !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 20px rgba(9, 23, 76, 0.3) !important;
}

:global(.leaflet-control-scale-line) {
  border: 2px solid #FFFFFF !important;
  border-top: none !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
  text-shadow: 1px 1px 2px rgba(9, 23, 76, 0.8) !important;
  background: rgba(9, 23, 76, 0.8) !important;
  padding: 2px 6px !important;
} */

/* Labels SVG personnalisés selon le PRD (Figtree + couleurs pastel/beige) */
:global(.leaflet-pane svg text) {
  font-family: 'Figtree', sans-serif !important;
  fill: #8B4513 !important;
  stroke: #F5F5DC !important;
  stroke-width: 1.5px !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  text-shadow: 1px 1px 2px rgba(139, 69, 19, 0.3) !important;
  paint-order: stroke fill !important;
  dominant-baseline: middle !important;
  text-anchor: middle !important;
}

/* Overlay pastel/beige sur la carte selon le PRD */
:global(.leaflet-overlay-pane::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(245, 245, 220, 0.3) 0%, 
    rgba(210, 180, 140, 0.2) 50%, 
    rgba(188, 143, 143, 0.1) 100%);
  pointer-events: none;
  z-index: 1000;
  border-radius: 1rem;
}

/* Animation d'entrée pour la carte */
.map-container {
  animation: mapFadeIn 0.8s ease-out;
}

@keyframes mapFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Effet de brillance sur la carte */
.map-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, 
    transparent 0%, 
    rgba(255, 255, 255, 0.05) 50%, 
    transparent 100%);
  pointer-events: none;
  z-index: 1001;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0;
    transform: translateX(-100%);
  }
  50% {
    opacity: 1;
    transform: translateX(100%);
  }
}

/* Styles pour l'avatar utilisateur avec halo pulsant selon le PRD */
:global(.user-avatar-marker) {
  background: transparent !important;
  border: none !important;
}

.user-avatar-container {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-halo {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(138, 43, 226, 0.6) 0%, rgba(30, 144, 255, 0.4) 50%, transparent 100%);
  animation: haloPulse 2s ease-in-out infinite;
  z-index: 1;
}

@keyframes haloPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
  opacity: 0.8;
  }
}

.user-avatar-image {
  position: relative;
  z-index: 3;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  background: #F5F5DC;
  border: 2px solid #FF6B6B;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-border {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  border: 2px solid #FF6B6B;
  z-index: 2;
  animation: borderGlow 2s ease-in-out infinite;
}

@keyframes borderGlow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
  }
}

/* Zone d'activité utilisateur */
.user-activity-zone {
  animation: zonePulse 3s ease-in-out infinite;
}

@keyframes zonePulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.5;
  }
}

/* Styles pour les marqueurs magiques selon le PRD */
:global(.radio-marker-magical),
:global(.podcast-marker-magical),
:global(.voice-marker-magical) {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: markerFloat 3s ease-in-out infinite;
}

:global(.radio-marker-magical:hover),
:global(.podcast-marker-magical:hover),
:global(.voice-marker-magical:hover) {
  transform: scale(1.15) translateY(-5px);
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
  animation: markerPulse 0.6s ease-in-out;
}

/* Animation de flottement pour les marqueurs */
@keyframes markerFloat {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* Animation de pulsation au survol */
@keyframes markerPulse {
  0% {
    transform: scale(1.15) translateY(-5px);
  }
  50% {
    transform: scale(1.2) translateY(-8px);
  }
  100% {
    transform: scale(1.15) translateY(-5px);
  }
}

/* Effet de brillance cosmique sur hover */
:global(.ecl-marker--radio:hover) {
  filter: drop-shadow(0 0 15px rgba(75, 241, 15, 0.8));
}

/* Animation d'apparition des ondes cosmiques */
:global(.cosmic-ripple) {
  box-shadow: 0 0 10px rgba(53, 241, 15, 0.5);
}

/* === CONTENEUR DE CONTRÔLE AUDIO FIXE === */
.audio-control-bar {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: linear-gradient(135deg, rgba(9, 23, 76, 0.95) 0%, rgba(26, 43, 92, 0.95) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 50px;
  padding: 12px 20px;
  box-shadow: 
    0 8px 32px rgba(9, 23, 76, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: auto;
  max-width: 260px;
  animation: slideDownBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.audio-control-bar:hover {
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 
    0 12px 40px rgba(9, 23, 76, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

@keyframes slideDownBounce {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-30px) scale(0.9);
  }
  60% {
    opacity: 1;
    transform: translateX(-50%) translateY(2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(241, 15, 71, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(241, 15, 71, 0);
  }
}


.audio-control-content {
  display: flex;
  align-items: center;
  gap: 22px;
  color: white;
  justify-content: space-between;
}

.audio-control-content::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -12px;
  right: -12px;
  bottom: -8px;
  background: linear-gradient(45deg, transparent, rgba(241, 15, 71, 0.1), transparent);
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.audio-control-bar:hover .audio-control-content::before {
  opacity: 1;
}

/* === CONTRÔLES VOCAUX === */
.voice-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(79, 72, 236, 0.2);
  border-radius: 50%;
  border: 2px solid rgba(79, 72, 236, 0.5);
}

.mic-icon {
  width: 18px;
  height: 18px;
  color: #4f48ec;
}

/* Drapeau du pays */
.country-flag {
  flex-shrink: 0;
}

.flag-image {
  width: 32px;
  height: 24px;
  border-radius: 6px;
  object-fit: cover;
  border: 2px solid rgba(241, 237, 225, 0.4);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.country-flag:hover .flag-image {
  transform: scale(1.05);
  border-color: rgba(241, 15, 71, 0.6);
  box-shadow: 
    0 6px 12px rgba(0, 0, 0, 0.3),
    0 0 0 2px rgba(241, 15, 71, 0.2);
}

/* Informations de la station */
.station-info {
  flex: 1;
  min-width: 0;
  max-width: 140px;
}

.station-name {
  color: #F1EDE1;
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Figtree', sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.station-country {
  color: rgba(241, 237, 225, 0.8);
  font-size: 11px;
  margin: 1px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Figtree', sans-serif;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  line-height: 1.1;
}

/* Bouton Play/Pause */
.play-pause-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F10F47 0%, #FF4775 100%);
  border: none;
  color: #F1EDE1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(241, 15, 71, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.play-pause-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.play-pause-btn:hover::before {
  transform: translateX(100%);
}

.play-pause-btn:hover {
  transform: scale(1.08);
  box-shadow: 
    0 8px 20px rgba(241, 15, 71, 0.5),
    0 4px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.play-pause-btn:active {
  transform: scale(0.96);
  transition: transform 0.1s ease;
}

.play-pause-btn.playing {
  background: linear-gradient(135deg, #FF4775 0%, #F10F47 100%);
  animation: pulseGlow 2s infinite;
}

.play-pause-btn.playing:hover {
  box-shadow: 
    0 8px 20px rgba(255, 71, 117, 0.6),
    0 4px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.play-icon,
.pause-icon {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  transition: all 0.2s ease;
}

.play-icon {
  margin-left: 2px; /* Centrer visuellement l'icône play */
}

.play-pause-btn:hover .play-icon,
.play-pause-btn:hover .pause-icon {
  transform: scale(1.1);
}

/* Responsive design */
@media (max-width: 768px) {
  .voice-map-container {
    height: 100vh;
  }
  
  .map-container {
    height: 100vh;
  }
  
  .audio-control-bar {
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 240px;
    padding: 10px 16px;
  }
  
  .audio-control-content {
    gap: 18px;
  }
  
  .station-info {
    max-width: 120px;
  }
  
  .station-name {
    font-size: 13px;
  }
  
  .station-country {
    font-size: 10px;
  }
  
  .voice-icon {
    width: 28px;
    height: 28px;
  }
  
  .mic-icon {
    width: 16px;
    height: 16px;
  }
  
  .flag-image {
    width: 28px;
    height: 21px;
  }
  
  .play-pause-btn {
    width: 40px;
    height: 40px;
  }
  
  .play-icon,
  .pause-icon {
    width: 16px;
    height: 16px;
  }
}

/* Contrôles */
.map-control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(9, 23, 76, 0.85) 0%, rgba(26, 43, 92, 0.85) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(241, 237, 225, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 
    0 4px 16px rgba(9, 23, 76, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
}

/* Effet shimmer pour les boutons */
.map-control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.map-control-btn:hover::before {
  transform: translateX(100%);
}

/* État actif des boutons de contrôle */
.map-control-btn.active {
  background: linear-gradient(135deg, #F10F47 0%, #FF4775 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #F1EDE1;
  box-shadow: 
    0 6px 20px rgba(241, 15, 71, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: activeGlow 2s ease-in-out infinite;
}

@keyframes activeGlow {
  0%, 100% {
    box-shadow: 
      0 6px 20px rgba(241, 15, 71, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 8px 25px rgba(241, 15, 71, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

@keyframes radioActiveGlow {
  0%, 100% {
    box-shadow: 
      0 6px 20px rgba(61, 212, 6, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 8px 25px rgba(61, 212, 6, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

@keyframes voiceActiveGlow {
  0%, 100% {
    box-shadow: 
      0 6px 20px rgba(79, 72, 236, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 8px 25px rgba(79, 72, 236, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

/* Hover des boutons de contrôle */
.map-control-btn:hover {
  transform: translateY(-2px) scale(1.05);
  background: linear-gradient(135deg, rgba(9, 23, 76, 0.95) 0%, rgba(26, 43, 92, 0.95) 100%);
  border-color: rgba(241, 15, 71, 0.4);
  color: #F1EDE1;
  box-shadow: 
    0 8px 24px rgba(9, 23, 76, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.map-control-btn.active:hover {
  background: linear-gradient(135deg, #FF4775 0%, #F10F47 100%);
  transform: translateY(-3px) scale(1.08);
  box-shadow: 
    0 10px 30px rgba(241, 15, 71, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Icônes des boutons de contrôle */
.control-icon {
  transition: all 0.3s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  width: 20px;
  height: 20px;
}

.map-control-btn:hover .control-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.map-control-btn.active .control-icon {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
}

/* Styles spécifiques pour les boutons radio et voice */
.radio-toggle-btn.active {
  background: linear-gradient(135deg, #3dd406 0%, #3dd406 100%);
  box-shadow: 
    0 6px 20px rgba(61, 212, 6, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: radioActiveGlow 2s ease-in-out infinite;
}

.radio-toggle-btn.active:hover {
  background: linear-gradient(135deg, #3dd406 0%, #3dd406 100%);
  box-shadow: 
    0 10px 30px rgba(6, 182, 212, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.voice-toggle-btn.active {
  background: linear-gradient(135deg, #000A2E 0%, #000A2E 100%);
  box-shadow: 
    0 6px 20px rgba(236, 72, 153, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.voice-toggle-btn.active:hover {
  background: linear-gradient(135deg, #000A2E 0%, #000A2E 100%);
  box-shadow: 
    0 10px 30px rgba(236, 72, 153, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Bouton GPS (plus grand) */
.gps-center-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(9, 23, 76, 0.9);
  color: #F1EDE1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(9, 23, 76, 0.3);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
}

@media (max-width: 640px) {
  .gps-center-btn {
    width: 44px;
    height: 44px;
  }
}

.gps-center-btn:hover:not(:disabled),
.gps-center-btn:focus-visible:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(241, 15, 71, 0.35);
  background: linear-gradient(135deg, #000A2E 0%, #000A2E 100%);
  color: white;
  border-color: transparent;
  opacity: 1;
}

.gps-center-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
  box-shadow: 0 2px 10px rgba(241, 15, 71, 0.35);
}

.gps-center-btn:disabled {
  background: transparent;
  border-color: rgba(156, 163, 175, 0.4);
  color: #9CA3AF;
  cursor: not-allowed;
  opacity: 0.35;
  transform: none;
  box-shadow: none;
}

.gps-center-btn .gps-icon {
  transition: transform 0.3s ease;
}

.gps-center-btn:hover:not(:disabled) .gps-icon {
  transform: scale(1.1);
}

/* Loading state for GPS button */
.gps-center-btn.loading {
  opacity: 0.85;
  cursor: default;
}

.gps-center-btn.loading .gps-icon {
  animation: ecl-spin 1s linear infinite;
}

@keyframes ecl-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* pas d'animation continue sur le bouton GPS */

/* Marqueur GPS minimaliste (point + halo) */
:global(.gps-location-marker .gps-dot-wrapper) {
  position: relative;
  width: 24px;
  height: 24px;
}

:global(.gps-location-marker .gps-dot-halo) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(241, 15, 71, 0.5);
  background: rgba(241, 15, 71, 0.18);
}

:global(.gps-location-marker .gps-dot-core) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #F10F47;
  border: 2px solid #fff;
}

/* Micro-pulsation unique quand on centre */
:global(.pulse-once .gps-circle-beat) {
  animation: pulseOnce 0.6s ease-out 1;
}

@keyframes pulseOnce {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.9; }
  70% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.3; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
}

@keyframes gpsPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(241, 15, 71, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(241, 15, 71, 0.5);
  }
}

/* Curseur GPS avec cercle vert et animation de battement */
.gps-location-marker {
  background: transparent !important;
  border: none !important;
}

.gps-circle-container {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gps-circle-beat {
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.1) 70%, transparent 100%);
  animation: gpsBeat 2s ease-in-out infinite;
  z-index: 1;
  box-shadow: 0 0 12px rgba(17, 197, 77, 0.35);
}

.gps-circle-inner {
  position: relative;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.45);
  border: 3px solid rgba(255, 255, 255, 0.85);
  z-index: 2;
  animation: gpsInnerPulse 2s ease-in-out infinite;
}

.gps-location-icon {
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
}

@keyframes gpsBeat {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.15;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@keyframes gpsInnerPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.6);
  }
}

/* Responsive pour l'avatar Figma */
@media (max-width: 768px) {
  :global(.user-profile-avatar-figma) {
    transform: scale(0.9);
  }

  :global(.blur-effect-blue-figma) {
    filter: blur(10px);
  }

  :global(.blur-effect-gradient-figma) {
    filter: blur(10px);
  }
}

@media (max-width: 480px) {
  :global(.user-profile-avatar-figma) {
    transform: scale(0.8);
  }

  :global(.blur-effect-blue-figma) {
    filter: blur(8px);
  }

  :global(.blur-effect-gradient-figma) {
    filter: blur(8px);
  }
}

/* Styles pour le popup utilisateur Figma */
:global(.user-popup-container-figma .leaflet-popup-content-wrapper) {
  background: linear-gradient(135deg, #F5F5DC 0%, #D2B48C 100%) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
  border: 2px solid #F10F47 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

:global(.user-popup-container-figma .leaflet-popup-tip) {
  background: #F5F5DC !important;
  border: 2px solid #F10F47 !important;
  border-top: none !important;
  border-right: none !important;
}

:global(.user-popup-figma) {
  font-family: 'Figtree', sans-serif;
  margin: 0;
  padding: 0;
  min-width: 280px;
}

:global(.user-popup-header-figma) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: #F5F5DC;
  border-bottom: 2px solid #F10F47;
}

:global(.user-avatar-small) {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #F10F47;
  flex-shrink: 0;
}

:global(.user-avatar-small img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:global(.user-info h3) {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #F5F5DC;
}

:global(.user-status-figma) {
  font-size: 12px;
  color: #D2B48C;
  font-weight: 500;
}

:global(.user-popup-content-figma) {
  padding: 16px;
}

:global(.info-row) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #8B4513;
}

:global(.info-row .icon) {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

:global(.info-row:last-child) {
  margin-bottom: 0;
}

:global(.user-popup-actions-figma) {
  padding: 12px 16px 16px 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid #D2B48C;
  background: rgba(245, 245, 220, 0.5);
}

:global(.action-btn-figma) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-family: 'Figtree', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 80px;
  justify-content: center;
}

:global(.action-btn-figma.primary) {
  background: linear-gradient(135deg, #F10F47 0%, #FF4775 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(241, 15, 71, 0.3);
}

:global(.action-btn-figma.primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 15, 71, 0.4);
}

:global(.action-btn-figma.secondary) {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: #F5F5DC;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

:global(.action-btn-figma.secondary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
}

:global(.action-btn-figma.tertiary) {
  background: linear-gradient(135deg, #D2B48C 0%, #BC8F8F 100%);
  color: #8B4513;
  box-shadow: 0 4px 12px rgba(210, 180, 140, 0.3);
}

:global(.action-btn-figma.tertiary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(210, 180, 140, 0.4);
}

:global(.btn-icon) {
  font-size: 14px;
}

/* Effet de stroke qui se décremente */
.avatar-stroke-effect {
  position: absolute;
  pointer-events: none;
  z-index: 2001;
}

@keyframes strokeDecrement {
  0% {
    transform: scale(0.8);
    opacity: 1;
    border-width: 3px;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
    border-width: 2px;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
    border-width: 1px;
  }
}

/* Animation de la zone d'activité pastel */
@keyframes zonePulsePastel {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(1.01);
  }
}

/* Curseur de navigation GPS avec l'icône location.svg (90x90px) */

/* Popup de position GPS */
:global(.location-popup-container .leaflet-popup-content-wrapper) {
  background: linear-gradient(135deg, #F5F5DC 0%, #D2B48C 100%) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
  border: 2px solid #E6B8AF !important;
  padding: 0 !important;
}

:global(.location-popup-container .leaflet-popup-tip) {
  background: #F5F5DC !important;
  border: 2px solid #E6B8AF !important;
  border-top: none !important;
  border-right: none !important;
}

:global(.location-popup) {
  font-family: 'Figtree', sans-serif;
  margin: 0;
  padding: 16px;
  min-width: 200px;
}

:global(.location-header) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #E6B8AF;
}

:global(.location-icon) {
  font-size: 16px;
}

:global(.location-title) {
  font-size: 14px;
  font-weight: 600;
  color: #8B4513;
}

:global(.location-details) {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

:global(.location-coord) {
  font-size: 12px;
  color: #A0522D;
  font-family: 'Courier New', monospace;
}

:global(.location-time) {
  font-size: 11px;
  color: #CD853F;
  font-style: italic;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(230, 184, 175, 0.3);
}

/* Conteneur des contrôles de carte */
.map-controls {
  position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 124px);
    right: calc(env(safe-area-inset-right, 0px) + 20px);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    /* gap: 12px; */
    align-items: center;
    pointer-events: none;
}

/* Styles communs pour les boutons de contrôle */
.map-control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(9, 23, 76, 0.85) 0%, rgba(26, 43, 92, 0.85) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(241, 237, 225, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 
    0 4px 16px rgba(9, 23, 76, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
}

/* Effet shimmer pour les boutons */
.map-control-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.map-control-btn:hover::before {
  transform: translateX(100%);
}

/* État actif des boutons de contrôle */
.map-control-btn.active {
  background: linear-gradient(135deg, #F10F47 0%, #FF4775 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #F1EDE1;
  box-shadow: 
    0 6px 20px rgba(241, 15, 71, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: activeGlow 2s ease-in-out infinite;
}

@keyframes activeGlow {
  0%, 100% {
    box-shadow: 
      0 6px 20px rgba(241, 15, 71, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 8px 25px rgba(241, 15, 71, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

@keyframes radioActiveGlow {
  0%, 100% {
    box-shadow: 
      0 6px 20px rgba(61, 212, 6, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 8px 25px rgba(61, 212, 6, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

@keyframes voiceActiveGlow {
  0%, 100% {
    box-shadow: 
      0 6px 20px rgba(79, 72, 236, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 
      0 8px 25px rgba(79, 72, 236, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

/* Hover des boutons de contrôle */
.map-control-btn:hover {
  transform: translateY(-2px) scale(1.05);
  background: linear-gradient(135deg, rgba(9, 23, 76, 0.95) 0%, rgba(26, 43, 92, 0.95) 100%);
  border-color: rgba(241, 15, 71, 0.4);
  color: #F1EDE1;
  box-shadow: 
    0 8px 24px rgba(9, 23, 76, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.map-control-btn.active:hover {
  background: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);
  transform: translateY(-3px) scale(1.08);
  box-shadow: 
    0 10px 30px rgba(80, 78, 79, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Icônes des boutons de contrôle */
.control-icon {
  transition: all 0.3s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  width: 20px;
  height: 20px;
}

.map-control-btn:hover .control-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.map-control-btn.active .control-icon {
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
}

/* Styles spécifiques pour les boutons radio et voice */
.radio-toggle-btn.active {
  background: linear-gradient(135deg, #3dd406 0%, #3dd406 100%);
  box-shadow: 
    0 6px 20px rgba(61, 212, 6, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: radioActiveGlow 2s ease-in-out infinite;
}

.radio-toggle-btn.active:hover {
  background: linear-gradient(135deg, #3dd406 0%, #3dd406 100%);
  box-shadow: 
    0 10px 30px rgba(6, 182, 212, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.voice-toggle-btn.active {
  background: linear-gradient(135deg, #4f48ec 0%, #5727db 100%);
  box-shadow: 
    0 6px 20px rgba(79, 72, 236, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: voiceActiveGlow 2s ease-in-out infinite;
}

.voice-toggle-btn.active:hover {
  background: linear-gradient(135deg, #2733db 0%, #6518be 100%);
  box-shadow: 
    0 10px 30px rgba(79, 72, 236, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Bouton GPS (plus grand) */
.gps-center-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(9, 23, 76, 0.9);
  color: #F1EDE1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(9, 23, 76, 0.3);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
}

@media (max-width: 640px) {
  .gps-center-btn {
    width: 44px;
    height: 44px;
  }
}

.gps-center-btn:hover:not(:disabled),
.gps-center-btn:focus-visible:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(241, 15, 71, 0.35);
  background: linear-gradient(135deg, #000A2E 0%, #000A2E 100%);
  color: white;
  border-color: transparent;
  opacity: 1;
}

.gps-center-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
  box-shadow: 0 2px 10px rgba(241, 15, 71, 0.35);
}

.gps-center-btn:disabled {
  background: transparent;
  border-color: rgba(156, 163, 175, 0.4);
  color: #9CA3AF;
  cursor: not-allowed;
  opacity: 0.35;
  transform: none;
  box-shadow: none;
}

.gps-center-btn .gps-icon {
  transition: transform 0.3s ease;
}

.gps-center-btn:hover:not(:disabled) .gps-icon {
  transform: scale(1.1);
}

/* Loading state for GPS button */
.gps-center-btn.loading {
  opacity: 0.85;
  cursor: default;
}

.gps-center-btn.loading .gps-icon {
  animation: ecl-spin 1s linear infinite;
}

@keyframes ecl-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* pas d'animation continue sur le bouton GPS */

/* Marqueur GPS minimaliste (point + halo) */
:global(.gps-location-marker .gps-dot-wrapper) {
  position: relative;
  width: 24px;
  height: 24px;
}

:global(.gps-location-marker .gps-dot-halo) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(241, 15, 71, 0.5);
  background: rgba(241, 15, 71, 0.18);
}

:global(.gps-location-marker .gps-dot-core) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #F10F47;
  border: 2px solid #fff;
}

/* Micro-pulsation unique quand on centre */
:global(.pulse-once .gps-circle-beat) {
  animation: pulseOnce 0.6s ease-out 1;
}

@keyframes pulseOnce {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.9; }
  70% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.3; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
}

@keyframes gpsPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(241, 15, 71, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(241, 15, 71, 0.5);
  }
}

/* Curseur GPS avec cercle vert et animation de battement */
.gps-location-marker {
  background: transparent !important;
  border: none !important;
}

.gps-circle-container {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gps-circle-beat {
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.1) 70%, transparent 100%);
  animation: gpsBeat 2s ease-in-out infinite;
  z-index: 1;
  box-shadow: 0 0 12px rgba(17, 197, 77, 0.35);
}

.gps-circle-inner {
  position: relative;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.45);
  border: 3px solid rgba(255, 255, 255, 0.85);
  z-index: 2;
  animation: gpsInnerPulse 2s ease-in-out infinite;
}

.gps-location-icon {
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
}

@keyframes gpsBeat {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.15;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@keyframes gpsInnerPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.6);
  }
}

/* Responsive pour l'avatar Figma */
@media (max-width: 768px) {
  :global(.user-profile-avatar-figma) {
    transform: scale(0.9);
  }

  :global(.blur-effect-blue-figma) {
    filter: blur(10px);
  }

  :global(.blur-effect-gradient-figma) {
    filter: blur(10px);
  }
}

@media (max-width: 480px) {
  :global(.user-profile-avatar-figma) {
    transform: scale(0.8);
  }

  :global(.blur-effect-blue-figma) {
    filter: blur(8px);
  }

  :global(.blur-effect-gradient-figma) {
    filter: blur(8px);
  }
}

/* Styles pour le popup utilisateur Figma */
:global(.user-popup-container-figma .leaflet-popup-content-wrapper) {
  background: linear-gradient(135deg, #F5F5DC 0%, #D2B48C 100%) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
  border: 2px solid #F10F47 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

:global(.user-popup-container-figma .leaflet-popup-tip) {
  background: #F5F5DC !important;
  border: 2px solid #F10F47 !important;
  border-top: none !important;
  border-right: none !important;
}

:global(.user-popup-figma) {
  font-family: 'Figtree', sans-serif;
  margin: 0;
  padding: 0;
  min-width: 280px;
}

:global(.user-popup-header-figma) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: #F5F5DC;
  border-bottom: 2px solid #F10F47;
}

:global(.user-avatar-small) {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #F10F47;
  flex-shrink: 0;
}

:global(.user-avatar-small img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:global(.user-info h3) {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #F5F5DC;
}

:global(.user-status-figma) {
  font-size: 12px;
  color: #D2B48C;
  font-weight: 500;
}

:global(.user-popup-content-figma) {
  padding: 16px;
}

:global(.info-row) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #8B4513;
}

:global(.info-row .icon) {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

:global(.info-row:last-child) {
  margin-bottom: 0;
}

:global(.user-popup-actions-figma) {
  padding: 12px 16px 16px 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid #D2B48C;
  background: rgba(245, 245, 220, 0.5);
}

:global(.action-btn-figma) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-family: 'Figtree', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 80px;
  justify-content: center;
}

:global(.action-btn-figma.primary) {
  background: linear-gradient(135deg, #F10F47 0%, #FF4775 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(241, 15, 71, 0.3);
}

:global(.action-btn-figma.primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(241, 15, 71, 0.4);
}

:global(.action-btn-figma.secondary) {
  background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
  color: #F5F5DC;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

:global(.action-btn-figma.secondary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
}

:global(.action-btn-figma.tertiary) {
  background: linear-gradient(135deg, #D2B48C 0%, #BC8F8F 100%);
  color: #8B4513;
  box-shadow: 0 4px 12px rgba(210, 180, 140, 0.3);
}

:global(.action-btn-figma.tertiary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(210, 180, 140, 0.4);
}

:global(.btn-icon) {
  font-size: 14px;
}

/* ==========================
   Curseur GPS (halo pulsant)
   ========================== */
:global(.gps-location-marker) {
  /* Leaflet applique la taille via iconSize; ici on peut ajuster le z-index si besoin */
  z-index: 1000;
}

:global(.gps-location-marker .gps-circle-container) {
  position: relative;
  width: 90px;
  height: 90px;
}

:global(.gps-location-marker .gps-circle-beat) {
  position: absolute;
  left: 0;
  top: 0;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(17, 197, 77, 0.25); /* vert eclairia translucide */
  animation: gpsPulse 2s ease-out infinite;
  box-shadow: 0 0 12px rgba(17, 197, 77, 0.35);
}

:global(.gps-location-marker .gps-circle-inner) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #11C54D; /* vert eclairia */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(17, 197, 77, 0.45);
  border: 3px solid rgba(255, 255, 255, 0.85);
}

:global(.gps-location-marker .gps-location-icon) {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
}

@keyframes gpsPulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  70% { transform: scale(1.15); opacity: 0.15; }
  100% { transform: scale(1.25); opacity: 0; }
}

/* ==========================
   Marqueurs animés (subtils)
   ========================== */
:global(.ecl-marker-container) {
  /* container Leaflet divIcon */
  pointer-events: auto;
}

:global(.ecl-marker) {
  position: relative;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform-origin: center bottom;
  will-change: transform, opacity;
}

:global(.ecl-marker__img) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* Halo doux animé */
:global(.ecl-marker__halo) {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 70%);
  opacity: 0.0; /* invisible par défaut, animé par .anim-halo */
  pointer-events: none;
}

/* Couleurs de halo par type (très subtiles) */
:global(.marker--radio) .ecl-marker__halo { background: radial-gradient(circle, rgba(255,107,107,0.16) 0%, rgba(255,107,107,0.0) 65%); }
:global(.marker--podcast) .ecl-marker__halo { background: radial-gradient(circle, rgba(255,140,0,0.16) 0%, rgba(255,140,0,0.0) 65%); }
:global(.marker--voice) .ecl-marker__halo { background: radial-gradient(circle, rgba(29,185,84,0.16) 0%, rgba(29,185,84,0.0) 65%); }
:global(.marker--eclaireur) .ecl-marker__halo { background: radial-gradient(circle, rgba(241,15,71,0.12) 0%, rgba(241,15,71,0.0) 65%); }

/* Animation: respiration douce */
@keyframes eclBreathe {
  0%, 100% { transform: translateY(0) scale(1.0); }
  50% { transform: translateY(-3px) scale(1.06); }
}

/* Animation: halo (opacité lente) */
@keyframes eclHalo {
  0%, 100% { opacity: 0.08; transform: scale(0.98); }
  50% { opacity: 0.32; transform: scale(1.04); }
}

/* Appliquer les animations (très lentes) */
:global(.anim-breathe) { animation: eclBreathe 3s ease-in-out infinite; will-change: transform; }
:global(.anim-halo) { animation: eclHalo 10s ease-in-out infinite; }

/* Hover/focus: léger feedback */
:global(.ecl-marker:hover),
:global(.ecl-marker:focus-visible) {
  transform: translateY(-2px) scale(1.05);
}

/* Accessibilité: réduire le mouvement si demandé */
@media (prefers-reduced-motion: reduce) {
  :global(.anim-breathe),
  :global(.anim-halo) { animation: none !important; }
}

/* Village Header Section */
.village-header-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem 1.5rem 1.5rem;
  position: relative;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #F1EDE1;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: 1.1rem;
  color: rgba(241, 237, 225, 0.8);
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.01em;
}

/* Responsive Design */
@media (max-width: 768px) {
  .village-header-section {
    padding: 1.5rem 1rem 1rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .section-subtitle {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .village-header-section {
    padding: 1rem 0.75rem 0.75rem;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .section-subtitle {
    font-size: 0.9rem;
  }
}

/* Overlay Play/Pause centré sur le marqueur radio actif */
.ecl-marker.is-active {
  position: relative;
}
.ecl-marker__overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #09174C;
  background: #F1EDE1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  pointer-events: none; /* l'icône n'intercepte pas le clic, c'est le marqueur qui le reçoit */
}
.ecl-marker__overlay.is-play { /* play triangle un peu décalé */
  padding-left: 2px;
}

/* Hover & cursor affordance for markers */
.ecl-marker-container { cursor: pointer; }
.ecl-marker {
  transition: transform 160ms ease, filter 160ms ease;
}
.ecl-marker:hover {
  transform: scale(1.06);
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
}

/* Custom cluster style: yellow bubble with green number */
:global(.ecl-cluster-radio) {
  background: transparent; /* container */
}
:global(.ecl-cluster-radio) div {
  background: radial-gradient(circle at 30% 30%, #FFE88A 0%, #FFD54F 60%, #F6C445 100%);
  border: 2px solid #C79A00; /* darker yellow border */
  color: #1DB954; /* default text color just in case */
  box-shadow: 0 6px 16px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.6);
}
:global(.ecl-cluster-radio) span {
  color: #1DB954; /* green count */
  font-weight: 800;
  text-shadow: 0 1px 0 rgba(255,255,255,0.35);
}
:global(.ecl-cluster-radio):hover div {
  filter: brightness(1.05) saturate(1.05);
}

/* ==========================
   Animations cosmiques pour les marqueurs radio
   ========================== */

/* Animation d'onde cosmique (ripple) */
@keyframes cosmicRipple {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
    border-width: 3px;
  }
  50% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0.6;
    border-width: 2px;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
    border-width: 1px;
  }
}

/* Animation de chargement (spinner) à l'intérieur du marqueur */
@keyframes radioSpinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Animation de pulsation circulaire pour l'état de lecture */
@keyframes radioPulseCircle {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* États des marqueurs radio */
:global(.ecl-marker.is-loading) {
  position: relative;
}

:global(.ecl-marker.is-loading::before) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border: 2px solid #f4ec09;
  border-top: 2px solid #0ff131;
  border-radius: 50%;
  animation: radioSpinner 1s linear infinite;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(10, 169, 15, 0.3);
}

:global(.ecl-marker.is-playing) {
  position: relative;
}

:global(.ecl-marker.is-playing::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 2px solid #00ff03;
  border-radius: 50%;
  animation: radioPulseCircle 1.5s ease-out infinite;
  pointer-events: none;
  z-index: 5;
}

:global(.ecl-marker.is-playing .ecl-marker__img) {
  border: 3px solid #00ff03;
  box-shadow: 0 0 20px rgba(15, 241, 22, 0.403);
}

/* Effet de brillance cosmique sur hover */
:global(.ecl-marker--radio:hover) {
  filter: drop-shadow(0 0 15px rgba(75, 241, 15, 0.8));
}

/* Animation d'apparition des ondes cosmiques */
:global(.cosmic-ripple) {
  box-shadow: 0 0 10px rgba(53, 241, 15, 0.5);
}

/* ==========================
   Animations cosmiques pour les marqueurs vocaux (BLEU)
   ========================== */

/* Animation d'onde cosmique bleue (ripple) pour les notes vocales */
@keyframes cosmicRippleVoice {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
    border-width: 3px;
  }
  50% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0.6;
    border-width: 2px;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
    border-width: 1px;
  }
}

/* Animation de chargement (spinner) à l'intérieur du marqueur vocal */
@keyframes voiceSpinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Animation de pulsation circulaire bleue pour l'état de lecture vocal */
@keyframes voicePulseCircle {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* États des marqueurs vocaux */
:global(.ecl-marker.is-loading.marker--voice::before) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border: 2px solid #a855f7;
  border-top: 2px solid #4f48ec;
  border-radius: 50%;
  animation: voiceSpinner 1s linear infinite;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(79, 72, 236, 0.3);
}

:global(.ecl-marker.is-playing.marker--voice::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 2px solid #4f48ec;
  border-radius: 50%;
  animation: voicePulseCircle 1.5s ease-out infinite;
  pointer-events: none;
  z-index: 5;
}

:global(.ecl-marker.is-playing.marker--voice .ecl-marker__img) {
  border: 3px solid #4f48ec;
  box-shadow: 0 0 20px rgba(79, 72, 236, 0.5);
}

/* Effet de brillance cosmique bleue sur hover */
:global(.ecl-marker--voice:hover) {
  transform: scale(1.1);
  filter: brightness(1.2) saturate(1.3);
}

/* User position marker styles */
:global(.user-position-marker) {
  background: none !important;
  border: none !important;
}

:global(.user-dot-realtime) {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 
    0 0 20px rgba(0, 255, 136, 0.8),
    0 0 40px rgba(0, 212, 255, 0.4),
    inset 0 0 10px rgba(255, 255, 255, 0.3);
  animation: userPositionPulse 2s ease-in-out infinite;
  position: relative;
}

:global(.user-dot-realtime::before) {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border: 2px solid rgba(0, 255, 136, 0.3);
  border-radius: 50%;
  animation: userPositionRipple 3s ease-out infinite;
}

@keyframes userPositionPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

@keyframes userPositionRipple {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* Long press feedback styles */
:global(.ecl-marker.long-press-active) {
  animation: longPressScale 1.5s ease-in-out;
  transform-origin: center;
}

@keyframes longPressScale {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Dialog overlay improvements */
:global(.dialog-overlay) {
  backdrop-filter: blur(12px);
  background: rgba(0, 0, 0, 0.75);
}

/* Enhanced marker hover effects for better UX */
:global(.ecl-marker:hover) {
  filter: drop-shadow(0 0 15px rgba(79, 72, 236, 0.8));
}

/* Animation d'apparition des ondes cosmiques bleues */
:global(.cosmic-ripple-voice) {
  box-shadow: 0 0 10px rgba(79, 72, 236, 0.5);
}

/* Couleur de halo spécifique pour les marqueurs vocaux */
:global(.marker--voice .ecl-marker__halo) {
  background: radial-gradient(circle, rgba(79, 72, 236, 0.16) 0%, rgba(79, 72, 236, 0.0) 65%);
}

</style>
