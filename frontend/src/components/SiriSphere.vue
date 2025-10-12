<template>
  <div class="sphere-container" 
       @click="handleSphereClick"
       @touchstart="handleTouchStart"
       @touchend="handleTouchEnd"
       @touchmove="handleTouchMove">
    <canvas ref="canvas" class="sphere-canvas"></canvas>
    
    <!-- Élément audio caché contrôlé par la sphère -->
    <audio 
      ref="audioElement"
      @loadstart="handleLoadStart"
      @canplay="handleCanPlay"
      @play="handlePlay"
      @pause="handlePause"
      @error="handleAudioError"
      crossorigin="anonymous"
      style="display: none;">
    </audio>
  </div>
  
  <!-- Station Header - Métadonnées de la radio sélectionnée -->
  <div v-if="currentStation" class="station-header">
    <!-- Logo/Drapeau du pays -->
    <div class="station-logo">
      <img :src="getCountryFlag(getStationCountry(currentStation))" :alt="`Drapeau ${getStationCountry(currentStation)}`" />
    </div>
    
    <!-- Informations de base -->
    <div class="station-info">
      <div class="station-main-info">
        <h1 class="station-name">{{ currentStation.name || 'Radio inconnue' }}</h1>
      </div>
      <div class="station-description-wrapper">
        <p 
          ref="descriptionText" 
          class="station-description" 
          :class="{ 'truncated': !isDescriptionExpanded }"
        >
          {{ getStationDescription(currentStation) }}
        </p>
        <button 
          v-if="shouldShowMoreButton" 
          @click="toggleDescription" 
          class="show-more-btn"
        >
          {{ isDescriptionExpanded ? 'Voir moins' : 'Voir plus' }}
        </button>
      </div>
      <div class="station-metadata">
        <div class="metadata-item">
          <img :src="getCountryFlag(getStationCountry(currentStation))" :alt="`Drapeau ${getStationCountry(currentStation)}`" class="flag-icon" />
          <span class="metadata-text">{{ getStationLanguage(currentStation) }}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-text">{{ getStationGenre(currentStation) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import * as THREE from 'three'
import { useRadio } from '../composables/useRadio.js'
import LiveIndicator from './LiveIndicator.vue'
import { performanceMonitor } from '../utils/performanceMonitor.js'
import { audioManager } from '../utils/audioManager.js'
import { lodManager } from '../utils/lodManager.js'
import { textureManager } from '../utils/textureManager.js'

const canvas = ref(null)
const audioElement = ref(null)
const descriptionText = ref(null)
const isDescriptionExpanded = ref(false)
const shouldShowMoreButton = ref(false)

// Utiliser le composable radio (logique copiée de radio-test)
const {
  stations,
  currentStation,
  validationResults,
  isPlaying,
  isLoading,
  volume,
  error,
  loadStations,
  validateAllStations,
  selectStation,
  playAudio,
  pauseAudio,
  setVolume,
  nextStation,
  previousStation,
  setupAudioEventListeners,
  logToResults
} = useRadio()

// État audio réactif (compatible avec l'ancien code)
const audioState = ref({
  get isPlaying() { return isPlaying.value },
  get currentStation() { return currentStation.value },
  get volume() { return volume.value },
  get isLoading() { return isLoading.value },
  get error() { return error.value }
})

// Indicateurs déplacés dans Home.vue

let scene, camera, renderer, sphere, material, analyser, dataArray
let sun // Directional light used to compute lightDir and visual consistency
let group // groupe pour gérer l'inclinaison et la rotation
let rotationSpeed = 0.001
let cloudOffset = 0.0
let animationId = null
// Variables d'état tactiles
let touchStartTime = 0
let initialTouchY = 0
let initialTouchX = 0
let swipeStartTime = 0
let lastTapTime = 0
let tapCount = 0

// Audio de roulette
let rouletteAudio = null
let rouletteAudioInterval = null

// Contrôle du volume par rotation
let volumeControlActive = false
let initialSphereRotation = 0
let volumeControlStartTime = 0

// Props pour recevoir les données et config planète
const props = defineProps({
  stations: {
    type: Array,
    default: () => []
  },
  currentStationId: {
    type: String,
    default: null
  },
  autoPlay: {
    type: Boolean,
    default: false
  },
  tiltDegrees: { // inclinaison de la planète
    type: Number,
    default: 23.5
  },
  enableDayCycle: { // cycle jour/nuit animé
    type: Boolean,
    default: true
  },
  dayCycleSpeed: { // vitesse du soleil
    type: Number,
    default: 0.025
  }
})

// Emits pour communiquer avec le parent
const emit = defineEmits([
  'play-started',
  'play-paused', 
  'station-changed',
  'audio-error',
  'loading-state',
  'volume-changed',
  'next-station',
  'previous-station',
  'double-tap',
  'double-tap-action'
])

// Vertex Shader (avec normales pour l'éclairage)
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float amplitude;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec3 newPosition = position + normal * amplitude * 0.3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

// Fragment Shader planète : textures (albedo/night/cloud) + atmo + fallback procédural
const fragmentShader = `
  uniform float time;
  uniform float audioState; // 0.0 = pause, 1.0 = play, 0.5 = loading, 0.3 = volume, 0.8 = special
  uniform float volume;     // 0..1
  uniform vec3  lightDir;   // direction lumière (espace vue)
  uniform float cloudOffset;// décalage nuages
  uniform float atmoStrength; // 0..1
  uniform vec3  atmoColor;
  uniform bool  useTextures;
  uniform sampler2D albedoMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudMap;
  varying vec2 vUv;
  varying vec3 vNormal;

  // Helper: palette de base selon état audio (fallback)
  vec3 basePalette(float a) {
    vec3 pauseColor = vec3(0.3, 0.3, 0.8);
    vec3 volumeColor = vec3(0.8, 0.2, 0.8);
    vec3 loadColor = vec3(1.0, 0.5, 0.0);
    vec3 specialColor = vec3(1.0, 0.8, 0.0);
    vec3 playColor = vec3(0.0, 1.0, 0.5);
    if (a < 0.15) return pauseColor;
    else if (a < 0.35) return volumeColor;
    else if (a < 0.65) return loadColor;
    else if (a < 0.85) return specialColor;
    else return playColor;
  }

  void main() {
    float ndl = max(dot(normalize(vNormal), normalize(lightDir)), 0.0);
    float day = smoothstep(0.0, 0.2, ndl);

    vec3 color;
    if (useTextures) {
      // Textures jour/nuit
      vec3 dayTex = texture2D(albedoMap, vUv).rgb;
      vec3 nightTex = texture2D(nightMap, vUv).rgb;
      color = mix(nightTex, dayTex, day);

      // Nuages via texture séparée (masque nuages en niveaux de gris)
      vec2 cuv = vec2(vUv.x + cloudOffset, vUv.y);
      float cloudMask = texture2D(cloudMap, cuv).r; // 0..1
      color = mix(color, vec3(1.0), cloudMask * day * 0.5);
    } else {
      // Fallback procédural (ancienne logique)
      vec3 baseColor = basePalette(audioState);
      vec3 dayColor = baseColor;
      vec3 nightColor = baseColor * vec3(0.10, 0.12, 0.20);
      color = mix(nightColor, dayColor, day);
      float bands = sin((vUv.y + cloudOffset) * 12.0) * 0.5 + 0.5;
      float clouds = smoothstep(0.55, 0.75, bands) * 0.35;
      color = mix(color, vec3(1.0), clouds * day * 0.6);
    }

    // Pulsation/intensité liée au volume
    float pulseSpeed = audioState > 0.75 ? 3.0 : (audioState > 0.25 ? 2.0 : 1.5);
    float pulse = 0.5 + 0.5 * sin(time * pulseSpeed);
    float intensity = 0.85 + pulse * (0.15 + volume * 0.25);
    color *= intensity;

    // Atmosphère type Fresnel sur les bords
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
    color = mix(color, atmoColor, fresnel * atmoStrength);

    gl_FragColor = vec4(color, 1.0);
  }
`

function initThreeJS() {
  // Scene
  scene = new THREE.Scene()

  // Camera
  const container = canvas.value.parentElement
  const aspect = container.clientWidth / container.clientHeight
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100)
  camera.position.z = 6 // Position ajustée pour la sphère de taille 1.8

  // Renderer
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvas.value,
    antialias: true,
    alpha: true
  })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setClearColor(0x000000, 0)

  // Groupe avec inclinaison (tilt) pour un effet planète
  group = new THREE.Group()
  group.rotation.x = THREE.MathUtils.degToRad(props.tiltDegrees)
  scene.add(group)

  // Sphere Geometry - Optimisé pour mobile
  const isMobile = container.clientWidth < 768
  const segments = isMobile ? 32 : 64 // 1K triangles mobile vs 4K desktop
  const geometry = new THREE.SphereGeometry(1.8, segments, segments)

  // Chargement optimisé des textures avec textureManager

  // DirectionalLight pour cohérence de scène (la direction est passée au shader)
  sun = new THREE.DirectionalLight(0xffffff, 0.6)
  sun.position.set(5, 2, 5)
  scene.add(sun)

  // Shader Material planète avec uniforms étendus
  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      time: { value: 0 },
      amplitude: { value: 0 },
      audioState: { value: 0.0 },
      volume: { value: 0.8 },
      lightDir: { value: new THREE.Vector3(0.5, 0.2, 1.0).normalize() },
      cloudOffset: { value: 0.0 },
      atmoStrength: { value: 0.2 },
      atmoColor: { value: new THREE.Color(0x66ccff) },
      rotationSpeed: { value: 0.0003 }, // Vitesse réduite
      dayCycleSpeed: { value: 0.2 },
      useTextures: { value: false },
      albedoMap: { value: null },
      nightMap: { value: null },
      cloudMap: { value: null }
    },
    side: THREE.DoubleSide,
    transparent: true
  })

  sphere = new THREE.Mesh(geometry, material)
  group.add(sphere)

  // Halo doux optionnel autour de la planète - Optimisé
  const glowSegments = isMobile ? 16 : 32
  const glowGeometry = new THREE.SphereGeometry(2.07, glowSegments, glowSegments)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x8a2be2,
    transparent: true,
    opacity: 0.12
  })
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  group.add(glow)

  // Particules flottantes - Drastiquement réduites
  const particleCount = isMobile ? 25 : 100 // Optimisé pour éviter la surchauffe
  const particlesGeometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)

  // Créer des particules dans un volume plus grand autour de la sphère
  for (let i = 0; i < particleCount * 3; i += 3) {
    // Position dans un cube de 20x20x20 autour de la sphère (plus grand pour la sphère plus grande)
    positions[i] = (Math.random() - 0.5) * 20     // X
    positions[i + 1] = (Math.random() - 0.5) * 20 // Y
    positions[i + 2] = (Math.random() - 0.5) * 20 // Z
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5, // Taille triplée (de 0.5 à 1.5)
    transparent: true,
    opacity: 1.0, // Opacité maximale
    sizeAttenuation: false, // Taille constante pour plus de visibilité
    blending: THREE.AdditiveBlending // Effet de lueur
  })
  const particles = new THREE.Points(particlesGeometry, particlesMaterial)
  
  // Positionner les particules autour de la sphère
  particles.position.set(0, 0, 0)
  group.add(particles) // Ajouter au groupe pour qu'elles tournent avec la sphère
  
  // Debug: vérifier que les particules sont créées
  console.log('✨ Particules créées:', {
    count: particleCount,
    size: particlesMaterial.size,
    opacity: particlesMaterial.opacity,
    position: particles.position,
    inScene: scene.children.includes(particles)
  })

  // Chargement progressif des textures avec textureManager
  ;(async () => {
    try {
      const quality = isMobile ? 'low' : 'medium'
      await textureManager.loadAllTextures(material, quality)
      console.log('✅ Textures SiriSphere chargées')
    } catch (e) {
      console.warn('SiriSphere textures failed to load, using procedural fallback:', e.message)
      material.uniforms.useTextures.value = false
    }
  })()
}



// Variables pour throttling FPS
let lastFrameTime = 0
const targetFPS = (window.innerWidth < 768) ? 30 : 60
const frameInterval = 1000 / targetFPS

function animate(time) {
  animationId = requestAnimationFrame(animate)
  
  // Throttling FPS pour mobile
  if (time - lastFrameTime < frameInterval) {
    return
  }
  lastFrameTime = time

  // Mise à jour LOD basée sur les performances
  const performanceMetrics = performanceMonitor.getMetrics()
  const glow = group?.children.find(child => child.material?.color?.getHex() === 0x8a2be2)
  const particles = scene.children.find(child => child.type === 'Points')
  
  lodManager.update(camera, sphere, glow, particles, material, performanceMetrics)

  // Rotation planète (groupe pour garder le tilt)
  if (group) {
    group.rotation.y += material.uniforms.rotationSpeed.value
  }
  scene.children.forEach(child => {
    if (child.type === 'Mesh' && child !== sphere) {
      child.rotation.y += 0.0005
    }
    if (child.type === 'Points') {
      // Debug réduit pour éviter le spam console
      
      // Animation des particules au rythme de l'audio
      const audioIntensity = isPlaying.value ? 1.0 : (isLoading.value ? 0.5 : 0.1)
      const danceSpeed = 0.001 + (audioIntensity * 0.002) // Vitesse plus rapide
      const danceAmplitude = audioIntensity * 0.05 // Amplitude plus grande
      
      // Rotation de base plus visible
      child.rotation.y += danceSpeed
      
      // Effet de danse avec oscillation plus prononcée
      const danceOffset = Math.sin(time * 0.003 * audioIntensity) * danceAmplitude
      child.rotation.x += danceOffset * 0.2
      child.rotation.z += danceOffset * 0.1
      
      // Changement de couleur selon l'intensité audio
      if (child.material) {
        const baseColor = new THREE.Color(0xffffff)
        const audioColor = new THREE.Color(0x00ff88)
        child.material.color.lerpColors(baseColor, audioColor, audioIntensity * 0.5)
        
        // Pulsation de la taille selon le volume (plus visible avec la nouvelle taille de base)
        const baseSize = 1.5 // Nouvelle taille de base
        const pulseSize = baseSize + (volume.value * 0.5) + (Math.sin(time * 0.008) * 0.3 * audioIntensity)
        child.material.size = Math.max(1.0, pulseSize) // Taille minimum garantie
        
        // Pulsation de l'opacité (plus visible)
        const baseOpacity = 1.0
        const pulseOpacity = baseOpacity + (volume.value * 0.3) + (Math.sin(time * 0.005) * 0.2 * audioIntensity)
        child.material.opacity = Math.min(1.0, Math.max(0.3, pulseOpacity)) // Opacité minimum garantie
      }
    }
  })

  // Update shader time
  material.uniforms.time.value = time * 0.001
  // Faire tourner la direction de la lumière pour un cycle jour/nuit
  if (props.enableDayCycle) {
    const t = time * 0.001 * props.dayCycleSpeed
    const lx = Math.cos(t)
    const ly = 0.2
    const lz = Math.sin(t)
    // Update shader uniform et position de la "lumière" de scène
    material.uniforms.lightDir.value.set(lx, ly, lz).normalize()
    const R = 6
    const px = lx * R, py = ly * R, pz = lz * R
    sun.position.set(px, py, pz)
  }
  // Animer les nuages
  cloudOffset += 0.0002 + volume.value * 0.00025
  material.uniforms.cloudOffset.value = cloudOffset

  // Mise à jour des uniforms audio
  updateShaderUniforms()

// Synchroniser l'animation CSS avec l'état audio
updateContainerAnimation()

  renderer.render(scene, camera)
}

function handleResize() {
  const container = canvas.value.parentElement
  const aspect = container.clientWidth / container.clientHeight
  
  camera.aspect = aspect
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

// === FONCTIONS AUDIO (LOGIQUE RADIO-TEST) ===

// Charger la station actuelle (utilise la logique radio-test)
function loadCurrentStation() {
  const station = stations.value.find(s => s.id === props.currentStationId)
  if (station) {
    selectStation(station)
    updateShaderUniforms()
    emit('station-changed', currentStation.value)
  }
}

// Lecture audio optimisée avec audioManager
async function playAudioRadio() {
  try {
    if (!currentStation.value) {
      throw new Error('Aucune station sélectionnée')
    }
    
    await audioManager.playStation(currentStation.value, audioElement.value)
    updateShaderUniforms()
    emit('play-started', currentStation.value)
  } catch (error) {
    updateShaderUniforms()
    emit('audio-error', error.message)
  }
}

// Pause audio (utilise la logique radio-test)
function pauseAudioRadio() {
  pauseAudio(audioElement.value)
  updateShaderUniforms()
  emit('play-paused')
}

// Synchroniser l'animation CSS avec l'état audio
function updateContainerAnimation() {
  if (!canvas.value?.parentElement) return
  
  const container = canvas.value.parentElement
  
  // Supprimer tous les attributs data-audio-*
  container.removeAttribute('data-audio-playing')
  container.removeAttribute('data-audio-loading')
  container.removeAttribute('data-audio-paused')
  
  // Ajouter l'attribut approprié selon l'état
  if (audioState.value.isPlaying) {
    container.setAttribute('data-audio-playing', 'true')
  } else if (audioState.value.isLoading) {
    container.setAttribute('data-audio-loading', 'true')
  } else {
    container.setAttribute('data-audio-paused', 'true')
  }
}

// Mettre à jour les uniforms des shaders
function updateShaderUniforms() {
  if (!material) return

  // État visuel selon l'état audio
  if (audioState.value.isPlaying) {
    material.uniforms.audioState.value = 1.0 // Vert actif
    material.uniforms.amplitude.value = 0.5
    rotationSpeed = 0.002
    if (material?.uniforms?.rotationSpeed) material.uniforms.rotationSpeed.value = rotationSpeed
    material.uniforms.atmoStrength.value = 0.45 + (audioState.value.volume * 0.35)
    material.uniforms.atmoColor.value.set(0x00ff88)
  } else if (audioState.value.isLoading) {
    material.uniforms.audioState.value = 0.5 // Orange loading
    material.uniforms.amplitude.value = 0.3
    rotationSpeed = 0.0015
    if (material?.uniforms?.rotationSpeed) material.uniforms.rotationSpeed.value = rotationSpeed
    material.uniforms.atmoStrength.value = 0.3
    material.uniforms.atmoColor.value.set(0xff8800)
  } else {
    material.uniforms.audioState.value = 0.0 // Bleu pause
    material.uniforms.amplitude.value = 0.1
    rotationSpeed = 0.001
    if (material?.uniforms?.rotationSpeed) material.uniforms.rotationSpeed.value = rotationSpeed
    material.uniforms.atmoStrength.value = 0.2
    material.uniforms.atmoColor.value.set(0x66ccff)
  }
  
  // Mettre à jour l'uniform volume
  material.uniforms.volume.value = audioState.value.volume
}

// === GESTIONNAIRES D'ÉVÉNEMENTS AUDIO (RADIO-TEST) ===
// Ces gestionnaires sont maintenant gérés par le composable useRadio
// mais on garde les émissions pour la compatibilité

function handleLoadStart() {
  updateShaderUniforms()
  updateContainerAnimation()
  emit('loading-state', true)
}

function handleCanPlay() {
  updateShaderUniforms()
  updateContainerAnimation()
  emit('loading-state', false)
}

function handlePlay() {
  updateShaderUniforms()
  updateContainerAnimation()
  emit('play-started', currentStation.value)
}

function handlePause() {
  updateShaderUniforms()
  updateContainerAnimation()
  emit('play-paused')
}

function handleAudioError(event) {
  updateShaderUniforms()
  emit('audio-error', 'Impossible de lire cette station')
  // Feedback visuel d'erreur (flash rouge court)
  if (material) {
    const prevColor = material.uniforms.atmoColor.value.clone()
    const prevStrength = material.uniforms.atmoStrength.value
    material.uniforms.atmoColor.value.set(0xff3355)
    material.uniforms.atmoStrength.value = Math.max(0.5, prevStrength)
    setTimeout(() => {
      if (material) {
        material.uniforms.atmoColor.value.copy(prevColor)
        material.uniforms.atmoStrength.value = prevStrength
      }
    }, 500)
  }
}

// === GESTIONNAIRES D'ÉVÉNEMENTS TACTILES ===

// Gestionnaire principal de clic (logique radio-test)
async function handleSphereClick() {
  console.log('🎯 Sphère cliquée')
  if (isLoading.value) {
    // Ignorer les clics pendant le chargement
    return
  }
  
  try {
    if (isPlaying.value) {
      pauseAudioRadio()
    } else {
      await playAudioRadio()
    }
  } catch (error) {
    console.error(`Erreur lors du clic: ${error.message}`)
  }
}

function handleTouchStart(event) {
  event.preventDefault()
  touchStartTime = Date.now()
  
  if (event.touches && event.touches[0]) {
    initialTouchY = event.touches[0].clientY
    initialTouchX = event.touches[0].clientX
    swipeStartTime = Date.now()
  }
  
  // Démarrer le contrôle du volume par rotation après 450ms (moins sensible)
  setTimeout(() => {
    if (Date.now() - touchStartTime >= 450) {
      volumeControlActive = true
      volumeControlStartTime = Date.now()
      
      // Sauvegarder la rotation initiale de la sphère
      if (group) {
        initialSphereRotation = group.rotation.x
      }
      
      console.log('🔊 Contrôle du volume par rotation activé')
      
      // Effet visuel pour indiquer l'activation du volume
      if (sphere) {
        sphere.scale.setScalar(1.1)
        // Changer la couleur pour indiquer le mode volume
        if (material) {
          material.uniforms.audioState.value = 0.3 // Couleur spéciale volume
        }
      }
    }
  }, 450)
}

// Gestionnaire de tap (simple/double)
function handleTapGesture() {
  const currentTime = Date.now()
  const timeSinceLastTap = currentTime - lastTapTime
  
  if (timeSinceLastTap < 300) {
    // Double tap détecté
    tapCount = 0
    lastTapTime = 0
    console.log('👆👆 Double tap - Action spéciale')
    emit('double-tap')
    
    // Action spéciale : basculer entre stations favorites
    handleDoubleTapAction()
  } else {
    // Premier tap ou tap simple
    tapCount = 1
    lastTapTime = currentTime
    
    // Attendre 300ms pour voir s'il y a un deuxième tap
    setTimeout(() => {
      if (tapCount === 1 && Date.now() - lastTapTime >= 300) {
        // Tap simple confirmé
        console.log('👆 Tap simple')
        handleSphereClick()
        tapCount = 0
        lastTapTime = 0
      }
    }, 300)
  }
}

// Action spéciale pour double tap
function handleDoubleTapAction() {
  console.log('✨ Double tap - Lancement de la recherche intelligente')
  
  // Effet visuel spectaculaire
  if (sphere) {
    // Animation de "flash" plus intense
    sphere.scale.setScalar(1.5)
    setTimeout(() => {
      if (sphere) sphere.scale.setScalar(1.0)
    }, 300)
  }
  
  // Changer temporairement la couleur pour un effet spécial
  if (material) {
    const originalState = material.uniforms.audioState.value
    material.uniforms.audioState.value = 0.9 // Couleur spéciale intense
    setTimeout(() => {
      if (material) material.uniforms.audioState.value = originalState
    }, 800)
  }
  
  // Lancer la recherche intelligente avec audio
  startIntelligentRadioSearch()
  
  // Effet de particules spécial
  scene.children.forEach(child => {
    if (child.type === 'Points' && child.material) {
      // Flash de particules
      child.material.size = 3.0 // Particules géantes temporairement
      child.material.color.setHex(0xffaa00) // Couleur dorée
      
      setTimeout(() => {
        if (child.material) {
          child.material.size = 1.5 // Retour à la normale
          child.material.color.setHex(0xffffff) // Retour au blanc
        }
    }, 500)
  }
  })
  
  // Émettre un événement pour informer le parent
  emit('double-tap-action', {
    action: 'intelligent-search',
    timestamp: Date.now()
  })
}

// Effet de roulette lors du changement de station
function triggerStationChangeEffect(direction) {
  if (!group || !sphere) return
  
  // Direction de la roulette : 1 = droite, -1 = gauche
  const spinDirection = direction === 'next' ? 1 : -1
  const spinDuration = 800 // 800ms pour l'effet de roulette
  
  // Sauvegarder la rotation actuelle
  const currentRotation = group.rotation.y
  
  // Calculer la rotation cible (2 tours complets + direction)
  const targetRotation = currentRotation + (Math.PI * 4 * spinDirection)
  
  // Animation de roulette fluide
  const startTime = Date.now()
  const animateSpin = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / spinDuration, 1)
    
    // Fonction d'easing pour un effet naturel
    const easeOut = 1 - Math.pow(1 - progress, 3)
    
    // Appliquer la rotation
    group.rotation.y = currentRotation + (targetRotation - currentRotation) * easeOut
    
    if (progress < 1) {
      requestAnimationFrame(animateSpin)
    } else {
      // Remettre la rotation normale après l'effet
      group.rotation.y = targetRotation
    }
  }
  
  // Démarrer l'animation
  animateSpin()
}



// Roulette continue pendant la recherche intelligente
let intelligentSearchInterval = null
let searchSpinDirection = 1

// Initialiser l'audio de roulette
function initRouletteAudio() {
  try {
    rouletteAudio = new Audio('/audio/clock-ticking.mp3')
    rouletteAudio.volume = 0.3 // Volume modéré
    rouletteAudio.loop = false // Pas de boucle automatique
    console.log('🎵 Audio de roulette initialisé')
  } catch (error) {
    console.warn('Impossible d\'initialiser l\'audio de roulette:', error)
  }
}

// Démarrer l'audio de roulette
function startRouletteAudio() {
  if (!rouletteAudio) return
  
  try {
    // Jouer l'audio en boucle pour un effet continu
    rouletteAudio.currentTime = 0
    rouletteAudio.play()
    
    // Créer un intervalle pour rejouer l'audio toutes les 2 secondes
    rouletteAudioInterval = setInterval(() => {
      if (rouletteAudio && !rouletteAudio.paused) {
        rouletteAudio.currentTime = 0
        rouletteAudio.play()
      }
    }, 2000)
    
    console.log('🎵 Audio de roulette démarré')
  } catch (error) {
    console.warn('Impossible de jouer l\'audio de roulette:', error)
  }
}

// Arrêter l'audio de roulette
function stopRouletteAudio() {
  if (rouletteAudio) {
    rouletteAudio.pause()
    rouletteAudio.currentTime = 0
  }
  
  if (rouletteAudioInterval) {
    clearInterval(rouletteAudioInterval)
    rouletteAudioInterval = null
  }
  
  console.log('🎵 Audio de roulette arrêté')
}

function startIntelligentSearchRoulette() {
  if (intelligentSearchInterval) return
  
  // Démarrer la roulette continue
  intelligentSearchInterval = setInterval(() => {
    if (group) {
      // Rotation continue dans la direction actuelle
      group.rotation.y += 0.02 * searchSpinDirection
      
      // Changer de direction toutes les 2 secondes pour un effet hypnotique
      if (Date.now() % 4000 < 100) {
        searchSpinDirection *= -1
      }
    }
  }, 16) // 60 FPS
  
  // Démarrer l'audio de roulette
  startRouletteAudio()
  
  // Effet visuel spécial pour la recherche
  if (material) {
    material.uniforms.audioState.value = 0.6 // Couleur spéciale recherche
    material.uniforms.atmoStrength.value = 0.8
    material.uniforms.atmoColor.value.set(0xffaa00) // Orange recherche
  }
}

function stopIntelligentSearchRoulette() {
  if (intelligentSearchInterval) {
    clearInterval(intelligentSearchInterval)
    intelligentSearchInterval = null
  }
  
  // Arrêter l'audio de roulette
  stopRouletteAudio()
  
  // Remettre les couleurs normales
  if (material) {
  updateShaderUniforms()
  }
}

// Fonction pour récupérer le drapeau d'un pays
function getCountryFlag(country) {
  const countryFlags = {
    'Cameroun': '/flags/cm.svg',
    'Congo': '/flags/cg.svg',
    'RDC': '/flags/cd.svg',
    'Sénégal': '/flags/sn.svg',
    'Gabon': '/flags/ga.svg',
    'Tchad': '/flags/td.svg',
    'République Centrafricaine': '/flags/cf.svg',
    'Guinée Équatoriale': '/flags/gq.svg',
    'Nigeria': '/flags/ng.svg',
    'Togo': '/flags/tg.svg',
    'Bénin': '/flags/bj.svg',
    'Mali': '/flags/ml.svg',
    'Burkina Faso': '/flags/bf.svg',
    'Niger': '/flags/ne.svg',
    'Côte d\'Ivoire': '/flags/ci.svg',
    'Ghana': '/flags/gh.svg',
    'Liberia': '/flags/lr.svg',
    'Sierra Leone': '/flags/sl.svg',
    'Guinée': '/flags/gn.svg',
    'Guinée-Bissau': '/flags/gw.svg',
    'Cap-Vert': '/flags/cv.svg',
    'Mauritanie': '/flags/mr.svg',
    'Algérie': '/flags/dz.svg',
    'Tunisie': '/flags/tn.svg',
    'Maroc': '/flags/ma.svg',
    'Égypte': '/flags/eg.svg',
    'Soudan': '/flags/sd.svg',
    'Éthiopie': '/flags/et.svg',
    'Kenya': '/flags/ke.svg',
    'Tanzanie': '/flags/tz.svg',
    'Ouganda': '/flags/ug.svg',
    'Rwanda': '/flags/rw.svg',
    'Burundi': '/flags/bi.svg',
    'Zambie': '/flags/zm.svg',
    'Zimbabwe': '/flags/zw.svg',
    'Afrique du Sud': '/flags/za.svg',
    'Namibie': '/flags/na.svg',
    'Botswana': '/flags/bw.svg',
    'Angola': '/flags/ao.svg',
    'Mozambique': '/flags/mz.svg',
    'Madagascar': '/flags/mg.svg',
    'Comores': '/flags/km.svg',
    'Seychelles': '/flags/sc.svg',
    'Maurice': '/flags/mu.svg'
  }
  
  return countryFlags[country] || '/flags/africa.svg' // Drapeau par défaut
}

// Fonction pour récupérer la description d'une radio
function getStationDescription(station) {
  const stationDescriptions = {
    // Cameroun
    'Radio Bonne Nouvelle FM': 'Radio chrétienne évangélique basée à Douala, diffusant des programmes spirituels, de la musique gospel et des émissions d\'inspiration. Fondée en 1995, elle est reconnue pour sa qualité de diffusion et son engagement communautaire.',
    'Balla Radio': 'Station de radio communautaire de Bafia, spécialisée dans la promotion de la culture locale et la diffusion d\'informations régionales. Elle joue un rôle important dans le développement local et la cohésion sociale.',
    'RVC Radio': 'Radio de la Vallée du Cameroun, basée à Yaoundé, diffusant un mélange de musique traditionnelle, d\'actualités locales et de programmes culturels. Elle valorise le patrimoine culturel camerounais.',
    'Radio Yaoundé': 'Radio de la capitale camerounaise, diffusant des informations nationales, de la musique moderne et des programmes culturels. Elle est la voix de la jeunesse urbaine de Yaoundé.',
    'Radio Douala': 'Station de radio portuaire de Douala, spécialisée dans la musique urbaine, les actualités économiques et les émissions de divertissement. Elle reflète le dynamisme de la capitale économique.',
    
    // RDC
    'Top Congo FM': 'Station de radio populaire de Kinshasa, diffusant de la musique congolaise moderne, des émissions d\'actualité et des programmes de divertissement. Elle est reconnue pour sa qualité musicale et son dynamisme.',
    'Radio Okapi': 'Radio de la Mission des Nations Unies en RDC, diffusant des informations de paix, de démocratie et de développement. Elle joue un rôle crucial dans la stabilisation du pays.',
    'Radio Digital Congo': 'Station de radio numérique de Kinshasa, spécialisée dans la musique urbaine et les nouvelles technologies. Elle est à la pointe de l\'innovation radiophonique en RDC.',
    'Radio Kinshasa': 'Radio de la capitale congolaise, diffusant un mélange de musique traditionnelle, d\'actualités locales et de programmes culturels. Elle valorise le patrimoine culturel de la RDC.',
    'Radio Lubumbashi': 'Station de radio du Katanga, spécialisée dans la musique traditionnelle et les informations régionales. Elle joue un rôle important dans la cohésion sociale du sud-est du pays.',
    
    // Sénégal
    'Rewmi FM': 'Radio de référence de Dakar, diffusant des informations politiques, économiques et sociales. Elle est reconnue pour son indépendance éditoriale et la qualité de ses analyses.',
    'Radio Dakar City': 'Station de radio urbaine de Dakar, spécialisée dans la musique moderne et les tendances culturelles. Elle reflète le dynamisme de la capitale sénégalaise.',
    'H24 Senegal': 'Radio d\'information continue de Dakar, diffusant des actualités 24h/24 et des analyses en temps réel. Elle est la référence de l\'information au Sénégal.',
    'Radio Urum-Bi': 'Station de radio communautaire de Dakar, promouvant la culture wolof et les traditions locales. Elle joue un rôle important dans la préservation du patrimoine culturel.',
    'Radio Saint-Louis': 'Radio de la ville historique de Saint-Louis, diffusant de la musique traditionnelle et des programmes culturels. Elle valorise le patrimoine historique de cette ancienne capitale.',
    
    // Gabon
    'Radio Gabon': 'Radio nationale du Gabon, diffusant des informations officielles, de la musique traditionnelle et des programmes culturels. Elle est la voix officielle du pays.',
    'Radio Libreville': 'Station de radio de la capitale gabonaise, spécialisée dans la musique moderne et les émissions de divertissement. Elle reflète le dynamisme culturel de Libreville.',
    
    // Tchad
    'Radio Tchad': 'Radio nationale du Tchad, diffusant des informations locales, de la musique traditionnelle et des programmes éducatifs. Elle joue un rôle important dans l\'unité nationale.',
    'Radio N\'Djamena': 'Station de radio de la capitale tchadienne, diffusant un mélange de musique traditionnelle et moderne. Elle contribue à la diversité culturelle du pays.',
    
    // République Centrafricaine
    'Radio Centrafrique': 'Radio nationale de la RCA, diffusant des informations de paix et de réconciliation. Elle contribue à la stabilisation du pays après les conflits.',
    'Radio Bangui': 'Station de radio de la capitale centrafricaine, spécialisée dans la musique traditionnelle et les programmes de développement. Elle joue un rôle crucial dans la reconstruction nationale.',
    
    // Guinée Équatoriale
    'Radio Malabo': 'Radio de la capitale équatoguinéenne, diffusant un mélange de musique traditionnelle et moderne. Elle reflète la diversité culturelle du pays.',
    'Radio Bata': 'Station de radio de la ville portuaire de Bata, diffusant de la musique urbaine et des informations locales. Elle contribue au dynamisme culturel de la région continentale.',
    
    // Nigeria
    'Radio Lagos': 'Station de radio de la capitale économique du Nigeria, diffusant de la musique afrobeat, des actualités économiques et des programmes culturels. Elle reflète le dynamisme de Lagos.',
    'Radio Abuja': 'Radio de la capitale fédérale du Nigeria, diffusant des informations nationales et des programmes de développement. Elle joue un rôle important dans l\'unité nationale.',
    
    // Ghana
    'Radio Accra': 'Station de radio de la capitale ghanéenne, spécialisée dans la musique highlife, les actualités politiques et les programmes culturels. Elle valorise le patrimoine culturel du Ghana.',
    'Radio Kumasi': 'Radio de la ville historique de Kumasi, diffusant de la musique traditionnelle ashanti et des programmes culturels. Elle contribue à la préservation des traditions ancestrales.'
  }
  
  // Retourner la description spécifique ou une description générique
  return stationDescriptions[station.name] || 
    `Station de radio basée à ${getStationCity(station)}, diffusant de la musique ${getStationGenre(station)} et des programmes culturels. Elle contribue à la diversité radiophonique du continent africain et reflète la richesse culturelle de sa région.`
}

// Fonction pour extraire le pays d'une station
function getStationCountry(station) {
  if (station.country) return station.country
  
  // Détection automatique basée sur le nom ou la ville
  const stationName = station.name?.toLowerCase() || ''
  const stationCity = station.city?.toLowerCase() || ''
  
  if (stationName.includes('cameroun') || stationCity.includes('yaoundé') || stationCity.includes('douala') || stationCity.includes('bafia')) {
    return 'Cameroun'
  }
  if (stationName.includes('congo') || stationCity.includes('kinshasa') || stationCity.includes('lubumbashi')) {
    return 'RDC'
  }
  if (stationName.includes('sénégal') || stationCity.includes('dakar') || stationCity.includes('saint-louis')) {
    return 'Sénégal'
  }
  if (stationName.includes('gabon') || stationCity.includes('libreville')) {
    return 'Gabon'
  }
  if (stationName.includes('tchad') || stationCity.includes('n\'djamena')) {
    return 'Tchad'
  }
  if (stationName.includes('centrafrique') || stationCity.includes('bangui')) {
    return 'République Centrafricaine'
  }
  if (stationName.includes('équatoriale') || stationCity.includes('malabo') || stationCity.includes('bata')) {
    return 'Guinée Équatoriale'
  }
  if (stationName.includes('nigeria') || stationCity.includes('lagos') || stationCity.includes('abuja')) {
    return 'Nigeria'
  }
  if (stationName.includes('ghana') || stationCity.includes('accra') || stationCity.includes('kumasi')) {
    return 'Ghana'
  }
  
  return 'Afrique'
}

// Fonction pour extraire la langue d'une station
function getStationLanguage(station) {
  if (station.language) return station.language
  
  const country = getStationCountry(station)
  const languages = {
    'Cameroun': 'Français, Anglais',
    'RDC': 'Français, Lingala',
    'Sénégal': 'Français, Wolof',
    'Gabon': 'Français',
    'Tchad': 'Français, Arabe',
    'République Centrafricaine': 'Français, Sango',
    'Guinée Équatoriale': 'Espagnol, Français',
    'Nigeria': 'Anglais, Yoruba',
    'Ghana': 'Anglais, Twi'
  }
  
  return languages[country] || 'Français'
}

// Fonction pour extraire le genre d'une station
function getStationGenre(station) {
  if (station.genre) return station.genre
  
  const stationName = station.name?.toLowerCase() || ''
  
  if (stationName.includes('gospel') || stationName.includes('bonne nouvelle')) {
    return 'Gospel/Religieux'
  }
  if (stationName.includes('news') || stationName.includes('info') || stationName.includes('h24')) {
    return 'Information'
  }
  if (stationName.includes('city') || stationName.includes('urbain')) {
    return 'Musique Urbaine'
  }
  if (stationName.includes('tradition') || stationName.includes('culture')) {
    return 'Musique Traditionnelle'
  }
  if (stationName.includes('digital') || stationName.includes('tech')) {
    return 'Musique Moderne'
  }
  
  return 'Général'
}

// Fonction pour extraire la ville d'une station
function getStationCity(station) {
  if (station.city) return station.city
  
  const stationName = station.name?.toLowerCase() || ''
  
  if (stationName.includes('douala')) return 'Douala'
  if (stationName.includes('yaoundé') || stationName.includes('yaounde')) return 'Yaoundé'
  if (stationName.includes('kinshasa')) return 'Kinshasa'
  if (stationName.includes('dakar')) return 'Dakar'
  if (stationName.includes('libreville')) return 'Libreville'
  if (stationName.includes('malabo')) return 'Malabo'
  if (stationName.includes('lagos')) return 'Lagos'
  if (stationName.includes('accra')) return 'Accra'
  
  return 'Ville inconnue'
}

// Fonction pour évaluer la qualité du signal
function getStationQuality(station) {
  // Simulation de la qualité basée sur la disponibilité
  if (station.url && station.url.includes('http')) {
    return 'Excellente'
  }
  if (station.favicon) {
    return 'Bonne'
  }
  if (station.name) {
    return 'Moyenne'
  }
  return 'Faible'
}



// Fonction pour obtenir le pourcentage de qualité du signal
function getSignalQualityPercentage(station) {
  if (station.url && station.url.includes('http')) {
    return 95
  }
  if (station.favicon) {
    return 80
  }
  if (station.name) {
    return 60
  }
  return 30
}





// Fonction pour afficher plus d'informations sur la station
function showStationInfo(station) {
  const info = `
🎵 ${station.name}
📍 ${getStationCity(station)}
🌍 ${getStationCountry(station)}
🗣️ ${getStationLanguage(station)}
🎼 ${getStationGenre(station)}
📡 ${getStationQuality(station)}
📝 ${getStationDescription(station)}
  `.trim()
  
  // Créer une modal personnalisée au lieu d'un alert
  showCustomModal(info, station.name)
}

// Fonction pour afficher une modal personnalisée
function showCustomModal(content, title) {
  // Supprimer l'ancienne modal si elle existe
  const existingModal = document.querySelector('.station-info-modal')
  if (existingModal) {
    existingModal.remove()
  }
  
  // Créer la modal
  const modal = document.createElement('div')
  modal.className = 'station-info-modal'
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.station-info-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${content}</pre>
        </div>
      </div>
    </div>
  `
  
  // Ajouter au DOM
  document.body.appendChild(modal)
  
  // Animation d'apparition
  setTimeout(() => {
    modal.classList.add('show')
  }, 10)
  
  // Fermer en cliquant sur l'overlay
  modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      modal.remove()
    }
  })
}

// Recherche intelligente de radio disponible
async function startIntelligentRadioSearch() {
  console.log('🔍 Démarrage de la recherche intelligente...')
  
  // Démarrer la roulette de recherche
  startIntelligentSearchRoulette()
  
  try {
    // Simuler une recherche de radio disponible
    const searchDuration = 3000 + Math.random() * 2000 // 3-5 secondes
    
    await new Promise(resolve => setTimeout(resolve, searchDuration))
    
    // Trouver une radio disponible
    const availableStations = stations.value.filter(station => 
      station.status === 'available' || !station.status
    )
    
    if (availableStations.length > 0) {
      // Sélectionner une radio aléatoire
      const randomStation = availableStations[Math.floor(Math.random() * availableStations.length)]
      
      // Arrêter la roulette de recherche
      stopIntelligentSearchRoulette()
      
      // Effet de connexion réussie
      if (material) {
        material.uniforms.audioState.value = 1.0
        material.uniforms.atmoColor.value.set(0x00ff88)
        material.uniforms.atmoStrength.value = 1.0
        
        // Flash de succès
        setTimeout(() => {
          if (material) updateShaderUniforms()
        }, 500)
      }
      
      // Sélectionner et lancer la radio
      selectStation(randomStation)
      await playAudioRadio()
      
      console.log(`🎵 Radio connectée : ${randomStation.name}`)
      emit('station-changed', randomStation)
      
    } else {
      throw new Error('Aucune radio disponible')
    }
    
  } catch (error) {
    console.error('❌ Recherche intelligente échouée:', error)
    
    // Arrêter la roulette de recherche
    stopIntelligentSearchRoulette()
    
    // Effet d'échec
    if (material) {
      material.uniforms.audioState.value = 0.0
      material.uniforms.atmoColor.value.set(0xff3355)
      material.uniforms.atmoStrength.value = 0.8
      
      // Flash d'échec
      setTimeout(() => {
        if (material) updateShaderUniforms()
      }, 500)
    }
  }
}

// Gestionnaire de contrôle volume par roulette haut/bas




function handleTouchEnd(event) {
  event.preventDefault()
  
  const touchDuration = Date.now() - touchStartTime
  
  // Si le contrôle du volume était actif, le désactiver
  if (volumeControlActive) {
    volumeControlActive = false
  
  // Remettre la taille et couleur normales
  if (sphere) {
    sphere.scale.setScalar(1.0)
  }
  
  // Remettre la couleur selon l'état audio
    if (material) {
  updateShaderUniforms()
    }
    
    console.log('🔊 Contrôle du volume par rotation désactivé')
    return
  }
  
  // Détecter les swipes horizontaux
  if (event.changedTouches && event.changedTouches[0]) {
    const finalTouchX = event.changedTouches[0].clientX
    const swipeDistance = finalTouchX - initialTouchX
    const swipeTime = Date.now() - swipeStartTime
    
    // Swipe détecté si distance > 50px et temps < 300ms
    if (Math.abs(swipeDistance) > 50 && swipeTime < 300) {
      if (swipeDistance > 0) {
        console.log('➡️ Swipe droite - Station suivante')
        // Déclencher l'effet de roulette vers la droite
        triggerStationChangeEffect('next')
        nextStation(audioElement.value)
        emit('next-station')
        emit('station-changed', currentStation.value)
      } else {
        console.log('⬅️ Swipe gauche - Station précédente')
        // Déclencher l'effet de roulette vers la gauche
        triggerStationChangeEffect('previous')
        previousStation(audioElement.value)
        emit('previous-station')
        emit('station-changed', currentStation.value)
      }
    } else if (touchDuration < 500) {
      // Tap rapide - détecter double tap
      handleTapGesture()
    }
  }
  
  // Reset des variables
  touchStartTime = 0
  initialTouchY = 0
  initialTouchX = 0
  swipeStartTime = 0
  // Note: lastTapTime et tapCount ne sont pas reset ici pour le double tap
}

// Contrôle du volume par rotation de la sphère
function handleVolumeRotation(deltaRotation) {
  if (!group || !material) return
  
  // Sensibilité du contrôle (rotation en radians)
  const sensitivity = 1.8 // Plus grand = moins sensible
  
  // Calculer le changement de volume basé sur la rotation
  let volumeChange = deltaRotation / sensitivity
  // Limiter l'incrément par mouvement pour éviter les sauts
  const MAX_STEP = 0.04
  if (volumeChange > MAX_STEP) volumeChange = MAX_STEP
  if (volumeChange < -MAX_STEP) volumeChange = -MAX_STEP
  
  // Obtenir le volume actuel
  const currentVolume = volume.value || 0.8
  const newVolume = Math.max(0, Math.min(1, currentVolume + volumeChange))
  
  // Appliquer le nouveau volume
  volume.value = newVolume
  if (audioElement.value) {
    audioElement.value.volume = newVolume
  }
  
  // Feedback visuel du volume via l'amplitude
  material.uniforms.amplitude.value = 0.2 + (newVolume * 0.4) // 0.2 à 0.6
  
  // Effet de roulette pour le volume
  triggerVolumeRouletteEffect(deltaRotation > 0 ? 'up' : 'down')
  
  // Émettre l'événement de changement de volume
  emit('volume-changed', newVolume)
  
  console.log(`🔊 Volume ajusté: ${Math.round(newVolume * 100)}%`)
}

// Effet de roulette pour le contrôle du volume
function triggerVolumeRouletteEffect(direction) {
  if (!group || !sphere) return
  
  // Direction de la roulette : 1 = haut (volume +), -1 = bas (volume -)
  const spinDirection = direction === 'up' ? 1 : -1
  const spinDuration = 400 // 400ms pour l'effet de volume (rapide)
  
  // Sauvegarder la rotation actuelle
  const currentRotation = group.rotation.x
  
  // Calculer la rotation cible (1/2 tour + direction)
  const targetRotation = currentRotation + (Math.PI * spinDirection)
  
  // Animation de roulette fluide
  const startTime = Date.now()
  const animateSpin = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / spinDuration, 1)
    
    // Fonction d'easing pour un effet naturel
    const easeOut = 1 - Math.pow(1 - progress, 3)
    
    // Appliquer la rotation sur l'axe X (haut/bas)
    group.rotation.x = currentRotation + (targetRotation - currentRotation) * easeOut
    
    if (progress < 1) {
      requestAnimationFrame(animateSpin)
    } else {
      // Remettre la rotation normale après l'effet
      group.rotation.x = targetRotation
    }
  }
  
  // Démarrer l'animation
  animateSpin()
}

// Watcher pour les changements de station (logique radio-test)
watch(() => props.currentStationId, (newStationId) => {
  if (newStationId && stations.value.length > 0) {
    loadCurrentStation()
  }
})

watch(() => props.stations, (newStations) => {
  if (newStations.length > 0 && props.currentStationId) {
    loadCurrentStation()
  }
})

const checkTextOverflow = () => {
  nextTick(() => {
    if (descriptionText.value) {
      shouldShowMoreButton.value = 
        descriptionText.value.scrollHeight > descriptionText.value.clientHeight ||
        descriptionText.value.scrollWidth > descriptionText.value.clientWidth
    }
  })
}

const toggleDescription = () => {
  isDescriptionExpanded.value = !isDescriptionExpanded.value
}

onMounted(async () => {
  // Check text overflow after content is loaded
  const checkInterval = setInterval(() => {
    if (descriptionText.value) {
      checkTextOverflow()
      clearInterval(checkInterval)
    }
  }, 500)
  console.log('🚀 SiriSphere monté - Initialisation...')
  
  // Initialiser Three.js
  initThreeJS()
  
  // Initialiser l'audio de roulette
  initRouletteAudio()
  
  // Démarrer l'animation
  animate()
  
  // Gestionnaire de redimensionnement
  window.addEventListener('resize', handleResize)
  
  // Configurer les événements audio
  if (audioElement.value) {
    setupAudioEventListeners(audioElement.value)
  }
  
  // Charger les stations depuis l'API radio-test
  try {
    await loadStations()
    console.log(`✅ ${stations.value.length} stations chargées depuis radio-test`)
    
    // Valider toutes les stations (optionnel)
    if (stations.value.length > 0) {
      console.log('🔍 Validation des stations en arrière-plan...')
      validateAllStations().then(() => {
        console.log('✅ Validation des stations terminée')
      })
    }
    
    // Lancer automatiquement la recherche intelligente au démarrage
    console.log('🔍 Lancement automatique de la recherche intelligente au démarrage...')
    startIntelligentRadioSearch()
    
    // Nettoyer la recherche intelligente après 3 secondes
    setTimeout(() => {
      console.log('🧹 Nettoyage de la recherche intelligente automatique')
      stopIntelligentSearchRoulette()
    }, 3000)
    
    // Charger la station initiale si spécifiée
    if (props.currentStationId) {
      loadCurrentStation()
    } else if (stations.value.length > 0) {
      // Sélectionner la première station par défaut
      selectStation(stations.value[0])
      console.log(`🎵 Station par défaut: ${stations.value[0].name}`)
    }
    
  } catch (error) {
    console.error(`❌ Erreur de chargement des stations: ${error.message}`)
  }
  
  // Gestionnaires d'événements tactiles
  const container = canvas.value.parentElement
  container.addEventListener('touchstart', handleTouchStart, { passive: false })
  container.addEventListener('touchend', handleTouchEnd, { passive: false })
  container.addEventListener('click', handleTapGesture)
  
  console.log('✅ SiriSphere initialisé avec recherche intelligente automatique et audio de roulette')
})

// Add resize observer for responsive text overflow check
let resizeObserver = null

onMounted(() => {
  resizeObserver = new ResizeObserver(checkTextOverflow)
  if (descriptionText.value) {
    resizeObserver.observe(descriptionText.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  // Nettoyer les animations
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  // Nettoyer les événements
  window.removeEventListener('resize', handleResize)
  
  // Arrêter la recherche intelligente
  stopIntelligentSearchRoulette()
  
  // Nettoyer l'audio de roulette
  stopRouletteAudio()
  
  // Désactiver le contrôle du volume
  volumeControlActive = false
  
  // Arrêter l'audio
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.src = ''
  }
  
  // Nettoyer Three.js
  if (renderer) {
    renderer.dispose()
  }
  if (material) {
    material.dispose()
  }
  
  console.log('🧹 Composant SiriSphere démonté - Tous les listeners, audio et contrôles nettoyés')
})

// Gestionnaire de mouvement tactile pour le contrôle du volume
function handleTouchMove(event) {
  if (!volumeControlActive || !event.touches || !event.touches[0]) return
  
  event.preventDefault()
  
  if (event.touches && event.touches[0]) {
    const currentY = event.touches[0].clientY
    const deltaY = initialTouchY - currentY // Inversé : haut = augmenter
    
    // Vérifier que le mouvement est principalement vertical
    const currentX = event.touches[0].clientX
    const deltaX = Math.abs(currentX - initialTouchX)
    const deltaYAbs = Math.abs(deltaY)
    
    // Si le mouvement horizontal est plus important que vertical, ignorer
    if (deltaX > deltaYAbs * 1.5) {
      return
    }
    // Zone morte pour éviter les micro-ajustements involontaires
    if (deltaYAbs < 12) {
      return
    }
    
    // Convertir le mouvement vertical en rotation de la sphère
    const rotationSensitivity = 0.004 // Plus petit = moins sensible
    const deltaRotation = deltaY * rotationSensitivity
    
    // Appliquer la rotation à la sphère
    if (group) {
      group.rotation.x = initialSphereRotation + deltaRotation
    }
    
    // Contrôler le volume basé sur la rotation
    handleVolumeRotation(deltaRotation)
  }
}
</script>

<style scoped>
.sphere-container {
  width: 250px;
  height: 250px;
  position: relative;
  margin: 2rem auto;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: cosmic-pulse 3s ease-in-out infinite;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sphere-container:hover {
  transform: scale(1.05);
  animation-play-state: paused;
}

.sphere-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  border: 2px solid rgba(138, 43, 226, 0.3);
  border-radius: 50%;
  animation: ripple-expand 2s ease-out infinite;
  pointer-events: none;
  animation-play-state: running;
}

/* Synchroniser l'animation avec l'audio */
.sphere-container[data-audio-playing="true"]::before {
  animation: ripple-expand 0.8s ease-out infinite;
}

.sphere-container[data-audio-loading="true"]::before {
  animation: ripple-expand 1.2s ease-out infinite;
}

.sphere-container[data-audio-paused="true"]::before {
  animation: ripple-expand 3s ease-out infinite;
}

.sphere-container::after {
  content: '';
  position: absolute;
  top: -40px;
  left: -40px;
  right: -40px;
  bottom: -40px;
  border: 1px solid rgba(255, 20, 147, 0.2);
  border-radius: 50%;
  animation: ripple-expand 2s ease-out infinite 0.5s;
  pointer-events: none;
}

.sphere-canvas {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50%;
}

.audio-prompt {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.audio-btn {
  padding: 12px 24px;
  font-size: 16px;
  background: rgba(30, 30, 30, 0.9);
  color: white;
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.audio-btn:hover {
  background: rgba(50, 50, 50, 0.9);
  transform: scale(1.05);
}

/* Responsive */
@media (max-width: 480px) {
  .sphere-container {
    width: 200px;
    height: 200px;
  }
}

/* ==========================
   Station Header - Métadonnées (Design Pixel Perfect)
   ========================== */
.station-header {
  padding: 46px 16px 0 16px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  min-height: 218px;
  margin-bottom: 6px;
  width: 100%;
  max-width: 400px;
  border-radius: 20px;
  overflow: hidden;
  font-family: 'ABC Whyte', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin-left: auto;
  margin-right: auto;
  position: relative; /* allow absolute indicators */
}

.station-logo {
  width: 51px;
  height: 51px;
  border-radius: 50%;
  background: #F10F47;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.station-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.station-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.station-main-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.station-name {
  color: #FFFFFF;
  font-family: 'ABC Whyte', sans-serif;
  font-size: 23px;
  font-weight: 400;
  line-height: 1.2;
  margin: 0;
}

.live-indicator {
  color: #FFFFFF;
  font-family: 'ABC Whyte', sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.2;
  flex-shrink: 0;
}

.station-description-wrapper {
  position: relative;
  width: 100%;
}

.station-description {
  color: #F5F5F5;
  font-family: 'Figtree', sans-serif;
  font-size: 16px;
  margin: 0;
  transition: max-height 0.3s ease;
}

.station-description.truncated {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-clamp: 3; /* standard property for compatibility */
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Header indicators */
.station-indicators {
  position: absolute;
  top: 12px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none; /* passive overlay */
}

.indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #F1EDE1;
  font-size: 12px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 4px 8px;
  border-radius: 999px;
  backdrop-filter: blur(6px);
}
.indicator .indicator-text { opacity: 0.95; }
.indicator.left { justify-content: flex-start; }
.indicator.right { justify-content: flex-end; }

.dot.live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
  box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7);
  animation: pulse 1.6s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(255, 59, 48, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
}

.show-more-btn {
  background: none;
  border: none;
  color: #4FC3F7;
  font-family: 'Figtree', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
  transition: color 0.2s ease;
}

.show-more-btn:hover {
  color: #81D4FA;
  text-decoration: underline;
}

.station-metadata {
  display: flex;
  padding: 10px 0;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flag-icon {
  width: 12px;
  height: 8px;
  border-radius: 2px;
  object-fit: cover;
}

.metadata-text {
  color: #FFFFFF;
  font-family: 'Figtree', sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0px;
}

/* Animations d'apparition */
.station-header {
  animation: slideInUp 0.6s ease-out;
  transform-origin: bottom center;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Animation des métadonnées */
.metadata-item {
  animation: fadeInScale 0.4s ease-out;
  animation-fill-mode: both;
}

.metadata-item:nth-child(1) { animation-delay: 0.1s; }
.metadata-item:nth-child(2) { animation-delay: 0.2s; }
.metadata-item:nth-child(3) { animation-delay: 0.3s; }
.metadata-item:nth-child(4) { animation-delay: 0.4s; }

/* Barre de qualité du signal */
.signal-quality-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin: 1rem 0;
  overflow: hidden;
  position: relative;
}

.quality-indicator {
  height: 100%;
  background: linear-gradient(90deg, #00FF88 0%, #FFD700 50%, #FF6B6B 100%);
  border-radius: 3px;
  transition: width 0.8s ease-out;
  position: relative;
}

.quality-indicator::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}

/* Actions rapides */
.station-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(241, 237, 225, 0.9);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.action-btn:active {
  transform: translateY(0);
}



.action-icon {
  font-size: 1.1rem;
}

.action-text {
  font-weight: 600;
}

/* Animation des boutons d'action */
.action-btn {
  animation: buttonSlideIn 0.6s ease-out;
  animation-fill-mode: both;
}

.action-btn:nth-child(1) { animation-delay: 0.6s; }

/* Modal d'information personnalisée */
.station-info-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.station-info-modal.show {
  opacity: 1;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal-content {
  background: linear-gradient(135deg, rgba(9, 23, 76, 0.95) 0%, rgba(26, 43, 92, 0.95) 100%);
  border-radius: 20px;
  padding: 0;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  transform: scale(0.9);
  transition: transform 0.3s ease;
}

.station-info-modal.show .modal-content {
  transform: scale(1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  color: #F1EDE1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  color: rgba(241, 237, 225, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #F1EDE1;
}

.modal-body {
  padding: 1.5rem;
  color: rgba(241, 237, 225, 0.9);
  line-height: 1.6;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-body pre {
  color: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Responsive pour la modal */
@media (max-width: 480px) {
  .modal-content {
    max-width: 95vw;
    margin: 0 0.5rem;
  }
  
  .modal-header {
    padding: 1rem 1rem 0.75rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
}

@keyframes buttonSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Animation du logo */
.station-logo {
  animation: logoBounce 0.8s ease-out;
}

@keyframes logoBounce {
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

/* Animation du nom de la station */
.station-name {
  animation: textSlideIn 0.6s ease-out 0.2s both;
}

@keyframes textSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Animation de l'indicateur en direct */
.live-indicator {
  animation: pulseIn 0.8s ease-out 0.4s both;
}

@keyframes pulseIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive pour station-header */
@media (max-width: 480px) {
  .station-header {
    padding: 30px 12px 0 12px;
    min-height: 180px;
  }
  
  .station-logo {
    width: 45px;
    height: 45px;
  }
  
  .station-name {
    font-size: 20px;
  }
  
  .station-description {
    font-size: 14px;
    max-width: 100%;
  }
  
  .show-more-btn {
    font-size: 13px;
  }
}
</style>
