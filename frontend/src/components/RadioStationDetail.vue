<template>
  <div class="radio-station-detail">
    <!-- Comments Section (replaces episodes-section) -->
    <div class="comments-section">
      <div class="comments-header">
        <h3 class="comments-title">Commentaires vocaux</h3>
        <div class="comments-actions">
          <button class="toggle-comments-btn" @click="toggleComments" :aria-expanded="showComments">
          <svg v-if="showComments" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          </button>
        </div>
      </div>

      <div class="comments-content" v-if="showComments">
        <!-- Comments List -->
        <div class="comments-list" v-if="stationComments.length > 0">
          <VoiceComment
            v-for="comment in stationComments"
            :key="comment.id"
            :comment="comment"
            :is-own-comment="comment.isOwn"
            @delete-comment="deleteComment"
          />
        </div>

        <!-- Empty State -->
        <div v-else class="comments-empty">
          <p class="empty-text">Soyez le premier à commenter cette station</p>
        </div>

        <!-- Voice Comment Recorder -->
        <VoiceCommentRecorder @comment-sent="addComment" />

        <!-- Toasts -->
        <div v-if="uploadStatus" class="toast success">{{ uploadStatus }}</div>
        <div v-if="uploadError" class="toast error">{{ uploadError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, computed, onMounted, watch } from 'vue'
import VoiceComment from './VoiceComment.vue'
import VoiceCommentRecorder from './VoiceCommentRecorder.vue'
import StationLogo from './StationLogo.vue'
import { fetchRadioComments, uploadRadioComment } from '@/services/radioApi.js'

// Props pour recevoir les données de la station
const props = defineProps({
  station: {
    type: Object,
    default: null
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})

// Derive flag src from station with robust country mapping
function normalizeCountry(input = '') {
  return String(input)
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // strip accents
    .replace(/[^a-z\s\-]/g, '')
    .trim()
}

const COUNTRY_TO_ISO = {
  // DR Congo
  'rdc': 'cd', 'rep democratique du congo': 'cd', 'republique democratique du congo': 'cd', 'congo kinshasa': 'cd',
  // Congo-Brazzaville
  'congo brazzaville': 'cg', 'republique du congo': 'cg', 'congo': 'cg',
  // Central African Republic
  'rca': 'cf', 'republique centrafricaine': 'cf',
  // Cote d'Ivoire
  'cote divoire': 'ci', 'cote d ivoire': 'ci', "cote d’ivoire": 'ci', 'civ': 'ci',
  // Senegal
  'senegal': 'sn',
  // Cameroun
  'cameroun': 'cm', 'cameroon': 'cm',
  // Gabon
  'gabon': 'ga',
  // Burkina Faso
  'burkina faso': 'bf',
  // Niger
  'niger': 'ne',
  // Guinee
  'guinee': 'gn', 'guinea': 'gn',
  // Tchad
  'tchad': 'td', 'chad': 'td',
  // Rwanda
  'rwanda': 'rw',
  // Burundi
  'burundi': 'bi',
  // France (fallback for French content if ever labeled)
  'france': 'fr'
}

const stationFlagSrc = computed(() => {
  const s = props.station
  if (!s) return ''
  if (s.flagUrl) return s.flagUrl
  // explicit countryCode wins
  if (s.countryCode) return `/flags/${String(s.countryCode).toLowerCase()}.svg`
  // try country name mapping
  if (s.country) {
    const key = normalizeCountry(s.country)
    const iso = COUNTRY_TO_ISO[key]
    if (iso) return `/flags/${iso}.svg`
  }
  return ''
})

// Comments state (local to station detail)
const showComments = ref(true)
const stationComments = ref([])
const uploadStatus = ref('')
const uploadError = ref('')

async function loadComments() {
  if (!props.station?.id) {
    stationComments.value = []
    return
  }
  // Clear current to avoid leaking previous station's comments during fetch
  stationComments.value = []
  stationComments.value = await fetchRadioComments(props.station.id)
}

onMounted(loadComments)

// Watch only the station ID to handle cases where parent mutates the same object
watch(() => props.station?.id, () => {
  loadComments()
})

function toggleComments() {
  showComments.value = !showComments.value
}

async function addComment(payload) {
  // payload expected from VoiceCommentRecorder
  // Try to persist to server so audio is saved under /comments_audio
  try {
    const saved = await uploadRadioComment({
      stationId: props.station?.id,
      fileBlob: payload.audioBlob,
      duration: payload.duration
    })
    if (saved) {
      stationComments.value.push(saved)
      uploadError.value = ''
      uploadStatus.value = 'Commentaire envoyé ✔'
      setTimeout(() => { uploadStatus.value = '' }, 2000)
      // Optionally refresh from server to reflect canonical state
      // await loadComments()
      return
    }
  } catch (e) {
    console.warn('Upload radio comment failed, falling back to local display only:', e?.message || e)
    uploadStatus.value = ''
    uploadError.value = `Échec de l\'envoi: ${e?.message || 'inconnu'}`
    setTimeout(() => { uploadError.value = '' }, 3000)
  }
  // Fallback: local-only (not persisted). Use temporary URL from recorder
  const newId = (stationComments.value.at(-1)?.id || 0) + 1
  stationComments.value.push({ id: newId, isOwn: true, ...payload })
}

function deleteComment(id) {
  stationComments.value = stationComments.value.filter(c => c.id !== id)
}
</script>

<style scoped>
.radio-station-detail {
  width: 100%;
  max-width: 400px;
  border-radius: 20px;
  overflow: hidden;
  font-family: 'ABC Whyte', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Comments section */
.comments-section { margin-top: 24px; padding: 0 12px 12px 12px; }
.comments-header { display: flex; align-items: center; justify-content: space-between; }
.comments-title { color: #F1EDE1; font-size: 16px; font-weight: 700; margin: 0; }
.toggle-comments-btn { background: none; border: none; color: #F1EDE1; cursor: pointer; padding: 8px; border-radius: 8px; }
.comments-content { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
.comments-list { display: flex; flex-direction: column; gap: 10px; }
.comments-empty { color: rgba(241,237,225,0.8); display: grid; place-items: center; gap: 8px; padding: 16px; }
.empty-icon { opacity: 0.8; }

/* Responsive design */
@media (max-width: 480px) {
}

@media (max-width: 360px) {
}

</style>
