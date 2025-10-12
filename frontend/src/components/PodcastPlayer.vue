<template>
  <div class="podcast-player">

    <!-- Audio Player Controls -->
    <div class="audio-player-bar" v-if="showAudioPlayer">
      <div class="player-content">
        <div class="song-data">
          <div class="thumbnail">
            <img 
              :src="currentPodcast.cover" 
              :alt="currentPodcast.title"
              class="thumbnail-image"
            />
          </div>
          <div class="song-info">
            <div class="song-title"><span class="marquee-text">{{ currentPodcast.title }}</span></div>
            <div class="song-artist">{{ currentPodcast.host }}</div>
          </div>
        </div>
        <div class="time-remaining">{{ currentPodcastRemainingTime }}</div>
        <div class="player-actions">
          <button 
            class="volume-button" 
            @click="toggleVolumeSlider" 
            @dblclick="toggleMute"
            :aria-label="isMuted ? 'Activer le son' : `Volume ${Math.round(volume * 100)}%`"
            :aria-pressed="showVolumeSlider"
          >
            <svg v-if="!isMuted" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" stroke-width="2" fill="none"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M1 1l22 22" stroke="white" stroke-width="2"/>
            </svg>
          </button>
          
          <!-- Volume Slider -->
          <div v-if="showVolumeSlider" class="volume-slider-container">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              v-model="volume" 
              @input="updateVolume" 
              class="volume-slider"
              :aria-label="`Volume: ${Math.round(volume * 100)}%`"
            />
            <div class="volume-percentage">
              {{ Math.round(volume * 100) }}%
            </div>
          </div>
          
          <button 
            class="pause-button" 
            @click="togglePlayPause"
            :aria-label="isAudioLoading ? 'Chargement…' : (isPlaying ? 'Mettre en pause' : 'Lire')"
            :aria-busy="isAudioLoading"
          >
            <div v-if="isAudioLoading" class="loading-spinner" aria-hidden="true"></div>
            <svg v-else-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7z" fill="white"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="4" height="16" fill="white"/>
              <rect x="14" y="4" width="4" height="16" fill="white"/>
            </svg>
          </button>
          
          <button 
            class="close-button" 
            @click="closePodcast"
            aria-label="Fermer le lecteur"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="main-content" :style="{ marginTop: showAudioPlayer ? '120px' : '0' }">
      
      <!-- Search Bar Section -->
      <div class="search-section">
        <div class="search-container">
          <div class="search-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="#F1EDE1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <input 
            v-model="searchQuery" 
            @input="handleSearch"
            type="text" 
            placeholder="Rechercher un podcast..." 
            class="search-input"
            aria-label="Rechercher un podcast"
            role="searchbox"
          />
          <button 
            v-if="searchQuery" 
            @click="clearSearch" 
            class="clear-search-btn"
            aria-label="Effacer la recherche"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#F1EDE1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Podcast Covers Section -->
      <div class="covers-section">
    <div class="covers-container">
          <div class="covers-scroll" 
               ref="coversScrollContainer"
               @touchstart="handleTouchStart"
               @touchmove="handleTouchMove"
               @touchend="handleTouchEnd"
          >
            <div 
              v-for="(podcast, index) in displayPodcasts" 
          :key="index"
          class="cover-item"
          :class="{ 
            'active': index === activePodcast, 
                'inactive': index !== activePodcast,
                'adjacent': Math.abs(index - activePodcast) === 1
          }"
          @click="selectPodcast(index)"
              @touchstart="startLongPress($event, podcast)"
              @touchend="endLongPress"
              @touchcancel="endLongPress"
        >
          <img 
            :src="podcast.cover" 
            :alt="podcast.title"
            class="cover-image"
            loading="lazy"
            @load="onImageLoad(podcast.id)"
          />

              <!-- Lazy Loading Icon -->
              <div class="lazy-loading-icon" v-if="!podcast.imageLoaded">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.3)" stroke-width="2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF4775" stroke-width="2" stroke-linecap="round">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="0 12 12;360 12 12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              </div>
              <span class="host-name">{{ podcast.host }}</span>
              <!-- Progress Percentage -->
              <div v-if="index === activePodcast" class="progress-percentage-cover">
                {{ Math.round(currentProgress) }}%
              </div>

              <!-- Bouton Favoris -->
              <button 
                @click.stop="toggleFavorite(podcast.id)"
                class="favorite-btn"
                :class="{ 'is-favorite': podcast.isFavorite }"
                :aria-label="podcast.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                :aria-pressed="podcast.isFavorite"
              >
                <svg v-if="podcast.isFavorite" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FFFFFF"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#F1EDE1" stroke-width="2" fill="none"/>
                </svg>
              </button>

              <!-- Bouton Play/Pause central -->
              <div v-if="index === activePodcast" class="play-pause-overlay">
                <button 
                  @click.stop="togglePlayPause"
                  class="play-pause-btn"
                  :class="{ 'playing': isPlaying, 'loading': isAudioLoading }"
                  :aria-label="isAudioLoading ? 'Chargement…' : (isPlaying ? 'Mettre en pause' : 'Lire')"
                  :aria-busy="isAudioLoading"
                  :disabled="isAudioLoading"
                >
                  <!-- Loading spinner -->
                  <svg v-if="isAudioLoading" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chargement">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF4775" stroke-width="2" stroke-linecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  <!-- Play / Pause icons -->
                  <svg v-else-if="!isPlaying" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v14l11-7z" fill="rgba(255, 255, 255, 0.9)"/>
                  </svg>
                  <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="4" width="4" height="16" fill="rgba(255, 255, 255, 0.9)"/>
                    <rect x="14" y="4" width="4" height="16" fill="rgba(255, 255, 255, 0.9)"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Points de Pagination -->
        <div class="pagination-dots">
          <div 
            v-for="(podcast, index) in displayPodcasts" 
            :key="index"
            class="pagination-dot"
            :class="{ 'active': index === activePodcast }"
            @click="selectPodcast(index)"
          ></div>
        </div>
        
        <!-- Progress Bar Section -->
        <div class="progress-section">
          <!-- Barre de progression principale -->
          <div class="progress-container">
            <div class="progress-track" @click="onProgressClick">
              <div class="progress-fill" :style="{ width: progressWidth }"></div>
              <div class="progress-handle" :style="{ left: handlePosition }"></div>
            </div>
          </div>
          
          <!-- Affichage du temps avec mini barre -->
          <div class="time-display">
            <div class="time-info">
              <span class="current-time">{{ currentPodcastCurrentTime }}</span>
              <div class="progress-mini">
                <div class="progress-mini-track"></div>
                <div class="progress-mini-fill" :style="{ width: progressWidth }"></div>
              </div>
              <span class="remaining-time">{{ currentPodcastRemainingTime }}</span>
            </div>
        </div>
      </div>
    </div>

    <!-- Podcast Info Section -->
    <div class="podcast-info-section">
      <div class="podcast-header">
        <img :src="currentPodcast.avatar" alt="Host" class="host-avatar" />
        <div class="podcast-details">
          <div class="podcast-title-row">
            <h2 class="podcast-title">{{ currentPodcast.title }}</h2>
          </div>
          <div class="podcast-meta">
            <span class="host-name">{{ currentPodcast.host }}</span>
            <span class="episode-date">{{ formatEpisodeDate(currentPodcast._published) }}</span>
          </div>
          <div class="podcast-description">
            <p class="episode-description">
              {{ displayedDescription }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Comments Section -->
    <div class="comments-section">
      <div class="comments-header">
        <h3 class="comments-title">
          Commentaires vocaux
        </h3>
        <div class="comments-actions">
          <button class="toggle-comments-btn" @click="toggleComments">
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
        <div class="comments-list" v-if="podcastComments.length > 0">
          <VoiceComment 
            v-for="comment in podcastComments" 
            :key="comment.id"
            :comment="comment"
            :is-own-comment="comment.isOwn"
            @delete-comment="deleteComment"
          />
        </div>
        
        <!-- Empty State -->
        <div v-else class="comments-empty">
          <p class="empty-text">Soyez le premier à commenter cet épisode</p>
        </div>
        
        <!-- Voice Comment Recorder -->
        <VoiceCommentRecorder @comment-sent="addComment" />

        <!-- Toasts -->
        <div v-if="uploadStatus" class="toast success">{{ uploadStatus }}</div>
        <div v-if="uploadError" class="toast error">{{ uploadError }}</div>
      </div>
    </div>

    <!-- Audio Player Controls -->
    <div class="audio-player-bar" v-if="showAudioPlayer">
      <div class="player-content">
        <div class="song-data">
          <div class="thumbnail">
            <img 
              :src="currentPodcast.cover" 
              :alt="currentPodcast.title"
              class="thumbnail-image"
            />
          </div>
          <div class="song-info">
            <div class="song-title"><span class="marquee-text">{{ currentPodcast.title }}</span></div>
            <div class="song-artist">{{ currentPodcast.host }}</div>
          </div>
        </div>
        <div class="time-remaining">{{ currentPodcastRemainingTime }}</div>
        <div class="player-actions">
          <button 
            class="volume-button" 
            @click="toggleVolumeSlider" 
            @dblclick="toggleMute"
            :aria-label="isMuted ? 'Activer le son' : `Volume ${Math.round(volume * 100)}%`"
            :aria-pressed="showVolumeSlider"
          >
            <svg v-if="!isMuted && volume > 0.5" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" stroke-width="2"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="white" stroke-width="2"/>
            </svg>
            <svg v-else-if="!isMuted && volume > 0" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" stroke-width="2"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M1 1l22 22" stroke="white" stroke-width="2"/>
            </svg>
          </button>
          
          <!-- Volume Slider -->
          <div v-if="showVolumeSlider" class="volume-slider-container">
            <div class="volume-slider">
              <input 
                type="range" 
                v-model="volume" 
                min="0" 
                max="1" 
                step="0.1"
                class="volume-range"
                @input="updateVolume"
              />
            </div>
          </div>
          
          <button 
            class="pause-button" 
            @click="togglePlayPause"
            :aria-label="isAudioLoading ? 'Chargement…' : (isPlaying ? 'Mettre en pause' : 'Lire')"
            :aria-busy="isAudioLoading"
            :disabled="isAudioLoading"
          >
            <!-- Loading spinner -->
            <svg v-if="isAudioLoading" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chargement">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#FF4775" stroke-width="2" stroke-linecap="round">
                <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
            <!-- Play / Pause icons -->
            <svg v-else-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7z" fill="white"/>
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="4" height="16" fill="white"/>
              <rect x="14" y="4" width="4" height="16" fill="white"/>
            </svg>
          </button>
          
          <button 
            class="close-button" 
            @click="closePodcast"
            aria-label="Fermer le lecteur"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>


    
    <!-- Share Modal -->
    <div 
      v-if="showShareModal" 
      class="share-modal-overlay" 
      @click="closeShareModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div class="share-modal" @click.stop>
        <div class="share-header">
          <h3 id="share-modal-title">Partager ce podcast</h3>
          <button 
            class="close-share-btn" 
            @click="closeShareModal"
            aria-label="Fermer le modal de partage"
          >✕</button>
        </div>
        <div class="share-options">
          <button class="share-option" @click="shareToWhatsApp" aria-label="Partager sur WhatsApp">
            <div class="share-icon whatsapp" aria-hidden="true">📱</div>
            <span>WhatsApp</span>
          </button>
          <button class="share-option" @click="shareToFacebook" aria-label="Partager sur Facebook">
            <div class="share-icon facebook" aria-hidden="true">📘</div>
            <span>Facebook</span>
          </button>
          <button class="share-option" @click="shareToTwitter" aria-label="Partager sur Twitter">
            <div class="share-icon twitter" aria-hidden="true">🐦</div>
            <span>Twitter</span>
          </button>
          <button class="share-option" @click="shareToInstagram" aria-label="Partager sur Instagram">
            <div class="share-icon instagram" aria-hidden="true">📸</div>
            <span>Instagram</span>
          </button>
          <button class="share-option" @click="copyLink" aria-label="Copier le lien">
            <div class="share-icon link" aria-hidden="true">🔗</div>
            <span>Copier le lien</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Hidden audio element for real playback -->
  <audio 
    ref="audioEl" 
    preload="none" 
    crossorigin="anonymous" 
    style="display: none;"
  ></audio>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { fetchPodcasts, fetchEpisodes, fetchPodcastComments, uploadPodcastComment } from '../services/podcastApi'
import { proxyUrl } from '../services/radioApi'
import VoiceComment from './VoiceComment.vue'
import VoiceCommentRecorder from './VoiceCommentRecorder.vue'

// Reactive data
const activePodcast = ref(0) // First podcast is active by default
const isPlaying = ref(true)
const currentProgress = ref(39) // Progress percentage
const searchQuery = ref('')
const filteredPodcasts = ref([])
const volume = ref(0.7)
const isMuted = ref(false)
const showVolumeSlider = ref(false)
const previousVolume = ref(0.7)
const showShareModal = ref(false)
const selectedPodcastForShare = ref(null)
const longPressTimer = ref(null)
const showAudioPlayer = ref(true) // Control audio player visibility
// Real audio element
const audioEl = ref(null)
// Loading state for audio (source loading/buffering)
const isAudioLoading = ref(false)
// Timeout guard for long buffering
let audioLoadTimeout = null
// Remote podcasts feeds (Option A): fetched list of podcast sources (RSS)
const remotePodcasts = ref([])
// Fetching states for RSS/episodes
const feedsLoading = ref(false)
const episodesLoading = ref(false)
const dataError = ref(null)

// Comments functionality
const showComments = ref(true)
const podcastComments = ref([])
const uploadStatus = ref('')
const uploadError = ref('')

// Map feeds (from /api/podcasts) to the local UI data model without changing UI
function mapFeedsToPodcasts(feeds = []) {
  // Default cover/avatar fallback
  const fallbackImg = '/profile/podcast-icon.png'
  // Produce stable items compatible with current UI
  return feeds.map((f, idx) => {
    // Derive a host label from RSS domain if possible
    let host = 'Podcast'
    try { host = new URL(f.rss).hostname.replace('www.', '') } catch (_) {}
    return {
      id: `feed-${f.id || idx}`,
      title: f.title || `Podcast ${idx + 1}`,
      host,
      description: f.rss || 'Flux RSS',
      cover: fallbackImg,
      avatar: fallbackImg,
      duration: 1800, // placeholder 30 min to keep UI behavior
      currentTime: 0,
      isFavorite: false,
      imageLoaded: false
    }
  })
}

// Map normalized episodes (from /api/podcasts/episodes) to the local UI model
function mapEpisodesToPodcasts(items = []) {
  const fallbackImg = '/profile/podcast-icon.png'
  return items
    .filter(it => it && it.episode)
    .map((it, idx) => {
      const ep = it.episode
      // Prefer episode author; fallback to feed author/title; last resort: domain
      let host = ep?.author || ep?.itunesAuthor || ep?.creator || ep?.owner || ep?.podcastAuthor || it.feedAuthor || it.feedTitle || 'Podcast'
      if (!host) {
        try { host = new URL(it.rss).hostname.replace('www.', '') } catch (_) {}
      }
      return {
        id: `episode-${it.feedId || idx}`,
        title: ep.title || (it.feedTitle ? `${it.feedTitle} - Episode` : 'Episode'),
        host,
        description: ep.description || it.feedTitle || 'Episode',
        cover: ep.image || fallbackImg,
        avatar: ep.image || fallbackImg,
        // Use duration if present; fallback to 30min for UI continuity
        duration: typeof ep.duration === 'number' ? ep.duration : 1800,
        currentTime: 0,
        isFavorite: false,
        imageLoaded: false,
        // Optional: keep reference for playback
        _audioUrl: ep.audioUrl || null,
        _published: ep.published || null
      }
    })
}

// Load feeds and episodes, map to UI
async function loadPodcastsData() {
  dataError.value = null
  feedsLoading.value = true
  try {
    const feeds = await fetchPodcasts()
    remotePodcasts.value = Array.isArray(feeds) ? feeds : []
  } catch (e) {
    dataError.value = e?.message || 'Erreur chargement des flux RSS'
  } finally {
    feedsLoading.value = false
  }

  episodesLoading.value = true
  try {
    const items = await fetchEpisodes()
    const mapped = mapEpisodesToPodcasts(items || [])
    if (mapped.length > 0) {
      podcasts.value = mapped
    } else if (remotePodcasts.value.length > 0) {
      // Fallback: display feeds without episodes
      podcasts.value = mapFeedsToPodcasts(remotePodcasts.value)
    }
    // Ensure active index is within bounds
    if (activePodcast.value >= podcasts.value.length) {
      activePodcast.value = 0
    }
    // Optionally preload first playable audio metadata
    await nextTick()
    if (hasAudio.value) {
      loadCurrentPodcastAudio(false)
    }
  } catch (e) {
    dataError.value = e?.message || 'Erreur chargement des épisodes'
  } finally {
    episodesLoading.value = false
  }
}

// Load comments for current podcast/episode
async function loadComments() {
  const pid = currentPodcast.value?.id
  if (!pid) {
    podcastComments.value = []
    return
  }
  podcastComments.value = []
  podcastComments.value = await fetchPodcastComments(pid)
}

function toggleComments() {
  showComments.value = !showComments.value
}

async function addComment(payload) {
  try {
    const saved = await uploadPodcastComment({
      podcastId: currentPodcast.value?.id,
      fileBlob: payload.audioBlob,
      duration: payload.duration
    })
    if (saved) {
      podcastComments.value.push(saved)
      uploadError.value = ''
      uploadStatus.value = 'Commentaire envoyé ✔'
      setTimeout(() => { uploadStatus.value = '' }, 2000)
      return
    }
  } catch (e) {
    uploadStatus.value = ''
    uploadError.value = `Échec de l'envoi: ${e?.message || 'inconnu'}`
    setTimeout(() => { uploadError.value = '' }, 3000)
  }
  // Fallback local-only
  const newId = (podcastComments.value.at(-1)?.id || 0) + 1
  podcastComments.value.push({ id: newId, isOwn: true, ...payload })
}

function deleteComment(id) {
  podcastComments.value = podcastComments.value.filter(c => c.id !== id)
}

onMounted(() => {
  loadPodcastsData()
  // also load comments for initial item after podcasts load completes
  // slight delay to ensure currentPodcast computed is valid
  setTimeout(loadComments, 0)
})

// Swipe variables
const touchStartX = ref(0)
const touchEndX = ref(0)
const isSwiping = ref(false)

// Mock podcast data
const podcasts = ref([
  {
    id: 1,
    title: "Veuillez patienter...",
    host: "Veuillez patienter...",
    description: "Veuillez patienter...",
    cover: "/profile/podcast-icon.png",
    avatar: "/profile/podcast-icon.png",
    duration: 1800, // 30 minutes en secondes
    currentTime: 0,
    isFavorite: false,
    imageLoaded: false
  },
  {
    id: 2,
    title: "Veuillez patienter...",
    host: "Veuillez patienter...", 
    description: "Veuillez patienter...",
    cover: "/profile/podcast-icon.png",
    avatar: "/profile/podcast-icon.png",
    duration: 2400, // 40 minutes en secondes
    currentTime: 0,
    isFavorite: true,
    imageLoaded: false
  },
  {
    id: 3,
    title: "Veuillez patienter...",
    host: "Veuillez patienter...",
    description: "Veuillez patienter...",
    cover: "/profile/podcast-icon.png",
    avatar: "/profile/podcast-icon.png",
    duration: 2100, // 35 minutes en secondes
    currentTime: 0,
    isFavorite: false,
    imageLoaded: false
  },
  {
    id: 4,
    title: "Veuillez patienter...",
    host: "Veuillez patienter...",
    description: "Veuillez patienter...",
    cover: "/profile/podcast-icon.png",
    avatar: "/profile/podcast-icon.png",
    duration: 2700, // 45 minutes en secondes
    currentTime: 0,
    isFavorite: false,
    imageLoaded: false
  }
])

// Computed properties
const currentPodcast = computed(() => {
  const podcastList = searchQuery.value ? filteredPodcasts.value : podcasts.value
  return podcastList[activePodcast.value] || podcastList[0]
})

// Description handling: truncate to 30 words with 'voir plus'
const showFullDescription = ref(false)

const rawDescription = computed(() => {
  return currentPodcast.value?.description || ''
})

function stripHtml(input) {
  if (!input) return ''
  // Basic HTML tag remover; descriptions from RSS often contain tags
  return String(input).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

const descriptionWords = computed(() => {
  const text = stripHtml(rawDescription.value)
  if (!text) return []
  return text.split(/\s+/)
})

const hasMoreDescription = computed(() => {
  return descriptionWords.value.length > 30 && !showFullDescription.value
})

const displayedDescription = computed(() => {
  const text = stripHtml(rawDescription.value)
  const words = descriptionWords.value
  if (showFullDescription.value || words.length <= 30) return text
  return words.slice(0, 30).join(' ') + '…'
})

function showMoreDescription() {
  showFullDescription.value = true
}

// Show "voir moins" when expanded and original text is longer than limit
const showSeeLess = computed(() => {
  return descriptionWords.value.length > 30 && showFullDescription.value
})

function showLessDescription() {
  showFullDescription.value = false
}

// Reset expanded state when switching podcast
watch(activePodcast, () => {
  showFullDescription.value = false
  // refresh comments when switching podcasts
  loadComments()
})

const progressWidth = computed(() => `${currentProgress.value}%`)

const handlePosition = computed(() => `${currentProgress.value - 2}%`)


// Whether the current podcast has a playable audio URL
const hasAudio = computed(() => {
  return !!(currentPodcast.value && currentPodcast.value._audioUrl)
})

function loadCurrentPodcastAudio(autoPlay = false) {
  const el = audioEl.value
  if (!el) return

  if (hasAudio.value) {
    try {
      // mark loading while we swap the source
      isAudioLoading.value = true
      // encourage browser to fetch data ahead of time
      el.preload = 'auto'
      el.src = proxyUrl(currentPodcast.value._audioUrl)
      el.load()
      // apply current volume/mute settings
      el.volume = Math.max(0, Math.min(1, volume.value))
      el.muted = isMuted.value
      if (autoPlay) {
        startAudioLoadingTimer()
        el.play().catch(() => {/* ignore */})
      }
    } catch (_) { /* ignore */ }
  } else {
    // No audio available -> ensure simulation handles progress
    stopAudioProgressBinding()
  }
}

function bindAudioEvents() {
  const el = audioEl.value
  if (!el) return
  // time updates
  el.addEventListener('timeupdate', onTimeUpdate)
  el.addEventListener('loadedmetadata', onLoadedMetadata)
  el.addEventListener('ended', onEnded)
  el.addEventListener('error', onAudioError)
  // loading/buffering lifecycle
  el.addEventListener('loadstart', onLoadStart)
  el.addEventListener('waiting', onWaiting)
  el.addEventListener('canplay', onCanPlay)
  el.addEventListener('canplaythrough', onCanPlay)
  el.addEventListener('playing', onPlaying)
  el.addEventListener('stalled', onWaiting)
}

function unbindAudioEvents() {
  const el = audioEl.value
  if (!el) return
  el.removeEventListener('timeupdate', onTimeUpdate)
  el.removeEventListener('loadedmetadata', onLoadedMetadata)
  el.removeEventListener('ended', onEnded)
  el.removeEventListener('error', onAudioError)
  el.removeEventListener('loadstart', onLoadStart)
  el.removeEventListener('waiting', onWaiting)
  el.removeEventListener('canplay', onCanPlay)
  el.removeEventListener('canplaythrough', onCanPlay)
  el.removeEventListener('playing', onPlaying)
  el.removeEventListener('stalled', onWaiting)
}

function stopAudioProgressBinding() {
  // No-op placeholder (kept for symmetry/future use)
}

function onTimeUpdate() {
  const el = audioEl.value
  if (!el) return
  const cp = currentPodcast.value
  if (!cp) return
  cp.currentTime = Math.floor(el.currentTime || 0)
  const dur = cp.duration || Math.floor(el.duration || 0) || 0
  currentProgress.value = dur > 0 ? (cp.currentTime / dur) * 100 : 0
}

function onLoadedMetadata() {
  const el = audioEl.value
  if (!el) return
  const cp = currentPodcast.value
  if (!cp) return
  const metaDur = Math.floor(el.duration || 0)
  if (metaDur && (!cp.duration || cp.duration < metaDur)) {
    cp.duration = metaDur
  }
}

function onEnded() {
  isPlaying.value = false
  currentProgress.value = 0
  const cp = currentPodcast.value
  if (cp) cp.currentTime = 0
  isAudioLoading.value = false
  clearAudioLoadingTimer()
}

function onAudioError() {
  console.warn('[Podcast] Audio error, fallback to simulation if needed')
  isAudioLoading.value = false
  clearAudioLoadingTimer()
}

// Loading/buffering handlers
function onLoadStart() {
  isAudioLoading.value = true
}
function onWaiting() {
  isAudioLoading.value = true
}
function onCanPlay() {
  isAudioLoading.value = false
  clearAudioLoadingTimer()
}
function onPlaying() {
  isAudioLoading.value = false
  clearAudioLoadingTimer()
}

function startAudioLoadingTimer() {
  clearAudioLoadingTimer()
  audioLoadTimeout = setTimeout(() => {
    // Guard against infinite spinner if CDN is extremely slow
    isAudioLoading.value = false
    // Optionally, try resuming play once if paused by buffering
    const el = audioEl.value
    if (el && isPlaying.value) {
      el.play().catch(() => {/* ignore retry */})
    }
  }, 8000) // 8s guard
}

function clearAudioLoadingTimer() {
  if (audioLoadTimeout) {
    clearTimeout(audioLoadTimeout)
    audioLoadTimeout = null
  }
}


// Computed for time formatting
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const currentPodcastDuration = computed(() => {
  return formatTime(currentPodcast.value?.duration || 0)
})

const currentPodcastCurrentTime = computed(() => {
  return formatTime(currentPodcast.value?.currentTime || 0)
})

const currentPodcastRemainingTime = computed(() => {
  const duration = currentPodcast.value?.duration || 0
  const currentTime = currentPodcast.value?.currentTime || 0
  const remaining = duration - currentTime
  return remaining > 0 ? `-${formatTime(remaining)}` : '0:00'
})

// Computed for display podcasts
const displayPodcasts = computed(() => {
  return searchQuery.value ? filteredPodcasts.value : podcasts.value
})

// Refs
const coversScrollContainer = ref(null)

// Methods
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    filteredPodcasts.value = []
    activePodcast.value = 0
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  filteredPodcasts.value = podcasts.value.filter(podcast => 
    podcast.title.toLowerCase().includes(query) ||
    podcast.host.toLowerCase().includes(query) ||
    podcast.description.toLowerCase().includes(query)
  )
  
  if (filteredPodcasts.value.length > 0) {
    activePodcast.value = 0
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  filteredPodcasts.value = []
  activePodcast.value = 0
}

const onImageLoad = (podcastId) => {
  const podcast = podcasts.value.find(p => p.id === podcastId)
  if (podcast) {
    podcast.imageLoaded = true
  }
}

const toggleFavorite = (podcastId) => {
  const podcast = podcasts.value.find(p => p.id === podcastId)
  if (podcast) {
    podcast.isFavorite = !podcast.isFavorite
    // Ici on pourrait sauvegarder dans localStorage ou envoyer à l'API
    console.log(`Podcast ${podcast.title} ${podcast.isFavorite ? 'ajouté aux' : 'retiré des'} favoris`)
  }
}

// Swipe handlers
const handleTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX
  isSwiping.value = false
}

const handleTouchMove = (event) => {
  if (!touchStartX.value) return
  
  touchEndX.value = event.touches[0].clientX
  const diffX = touchStartX.value - touchEndX.value
  
  if (Math.abs(diffX) > 10) {
    isSwiping.value = true
  }
}

const handleTouchEnd = () => {
  if (!isSwiping.value || !touchStartX.value || !touchEndX.value) {
    touchStartX.value = 0
    touchEndX.value = 0
    return
  }
  
  const diffX = touchStartX.value - touchEndX.value
  const threshold = 50
  
  if (Math.abs(diffX) > threshold) {
    if (diffX > 0 && activePodcast.value < displayPodcasts.value.length - 1) {
      // Swipe gauche - podcast suivant
      selectPodcast(activePodcast.value + 1)
    } else if (diffX < 0 && activePodcast.value > 0) {
      // Swipe droite - podcast précédent
      selectPodcast(activePodcast.value - 1)
    }
  }
  
  touchStartX.value = 0
  touchEndX.value = 0
  isSwiping.value = false
}

const toggleVolumeSlider = () => {
  showVolumeSlider.value = !showVolumeSlider.value
}

const toggleMute = () => {
  if (isMuted.value) {
    // Unmute
    isMuted.value = false
    volume.value = previousVolume.value
  } else {
    // Mute
    previousVolume.value = volume.value
    volume.value = 0
    isMuted.value = true
  }
  updateVolume()
}

const updateVolume = () => {
  const el = audioEl.value
  if (el) {
    el.volume = Math.max(0, Math.min(1, volume.value))
    el.muted = isMuted.value
  }
  if (volume.value > 0) {
    isMuted.value = false
  }
}

// Click-to-seek on main progress bar
function onProgressClick(event) {
  const cp = currentPodcast.value
  if (!cp) return
  const track = event.currentTarget
  if (!track) return
  const rect = track.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const ratio = Math.min(Math.max(clickX / rect.width, 0), 1)
  const targetSeconds = Math.floor((cp.duration || 0) * ratio)

  const el = audioEl.value
  if (hasAudio.value && el && Number.isFinite(targetSeconds)) {
    try {
      el.currentTime = targetSeconds
    } catch (_) { /* ignore */ }
  } else {
    // Simulation fallback
    cp.currentTime = targetSeconds
    currentProgress.value = ratio * 100
  }
}

const startLongPress = (event, podcast) => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
  }
  
  longPressTimer.value = setTimeout(() => {
    // Long press detected - show share modal
    selectedPodcastForShare.value = podcast
    showShareModal.value = true
    longPressTimer.value = null
  }, 800) // 800ms for long press
}

const endLongPress = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

const closeShareModal = () => {
  showShareModal.value = false
  selectedPodcastForShare.value = null
}

const shareToWhatsApp = () => {
  const text = `Écoutez "${selectedPodcastForShare.value.title}" sur Eclairia Voice !`
  const url = `https://eclairia.voice/podcast/${selectedPodcastForShare.value.id}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`)
  closeShareModal()
}

const shareToFacebook = () => {
  const url = `https://eclairia.voice/podcast/${selectedPodcastForShare.value.id}`
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
  closeShareModal()
}

const shareToTwitter = () => {
  const text = `Écoutez "${selectedPodcastForShare.value.title}" sur Eclairia Voice !`
  const url = `https://eclairia.voice/podcast/${selectedPodcastForShare.value.id}`
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
  closeShareModal()
}

const shareToInstagram = () => {
  // Instagram ne supporte pas le partage direct via URL
  // On copie le lien dans le presse-papiers
  copyLink()
}

const copyLink = () => {
  const url = `https://eclairia.voice/podcast/${selectedPodcastForShare.value.id}`
  navigator.clipboard.writeText(url).then(() => {
    console.log('Lien copié dans le presse-papiers')
    // Ici on pourrait afficher une notification
  })
  closeShareModal()
}

const openShareModal = () => {
  selectedPodcastForShare.value = currentPodcast.value
  showShareModal.value = true
}

const formatEpisodeDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}



const selectPodcast = async (index) => {
  activePodcast.value = index
  await nextTick()
  scrollToActivePodcast()
  
  // Ouvrir l'audio player si il était fermé
  if (!showAudioPlayer.value) {
    showAudioPlayer.value = true
  }
  
  // Charger la source audio si disponible et éventuellement démarrer la lecture
  if (hasAudio.value) {
    loadCurrentPodcastAudio(isPlaying.value)
  } else if (isPlaying.value) {
    // Pas d'audio : continuer la simulation
    startProgressSimulation()
  }
}

const scrollToActivePodcast = () => {
  if (coversScrollContainer.value) {
    const container = coversScrollContainer.value
    const activeElement = container.children[activePodcast.value]
    if (activeElement) {
      const scrollLeft = activeElement.offsetLeft - container.offsetWidth / 2 + activeElement.offsetWidth / 2
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }
}

const togglePlayPause = () => {
  isPlaying.value = !isPlaying.value
  const el = audioEl.value

  if (hasAudio.value && el) {
    if (isPlaying.value) {
      // Ensure correct source loaded
      if (!el.src) loadCurrentPodcastAudio(false)
      // indicate we may be waiting for buffer
      isAudioLoading.value = true
      startAudioLoadingTimer()
      el.play().catch(() => { /* ignore play rejection (e.g., user gesture) */ })
    } else {
      el.pause()
    }
    return
  }

  // Fallback: no audio available -> simulate
  if (isPlaying.value) {
    startProgressSimulation()
  } else {
    stopProgressSimulation()
  }
}

// Simulation de progression pour la démo
let progressInterval = null

const startProgressSimulation = () => {
  if (progressInterval) return
  
  progressInterval = setInterval(() => {
    const currentPodcastData = currentPodcast.value
    if (!currentPodcastData) return
    
    if (currentPodcastData.currentTime < currentPodcastData.duration) {
      // Incrémenter le temps actuel
      currentPodcastData.currentTime += 1
      
      // Mettre à jour la progression basée sur le temps réel
      currentProgress.value = (currentPodcastData.currentTime / currentPodcastData.duration) * 100
    } else {
      // Podcast terminé, reset
      currentPodcastData.currentTime = 0
      currentProgress.value = 0
    }
  }, 1000) // 1 seconde = 1 seconde de progression
}

const stopProgressSimulation = () => {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

const closePodcast = () => {
  // Logic to close/minimize podcast player
  showAudioPlayer.value = false
  console.log('Closing podcast player')
}

// Lifecycle
onMounted(async () => {
  // Bind audio events once
  bindAudioEvents()
  // Load feeds + episodes to replace mock data with real RSS content
  await loadPodcastsData()
})

onUnmounted(() => {
  unbindAudioEvents()
  clearAudioLoadingTimer()
  stopProgressSimulation()
})
 
</script>

<style scoped>
.podcast-player {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 50%, #2d4a8a 100%);
  color: white;
  font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header Section */
.podcast-header-section {
  padding: 32px 24px 20px 24px;
  background: linear-gradient(135deg, rgba(255, 71, 117, 0.1) 0%, rgba(241, 15, 71, 0.05) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
}

.header-content {
  text-align: center;
}

.section-title {
  font-size: 32px;
  font-weight: 800;
  color: #FFFFFF;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  letter-spacing: -0.8px;
}

.section-subtitle {
  font-size: 16px;
  font-weight: 400;
  color: rgba(241, 237, 225, 0.8);
  margin: 0;
  letter-spacing: -0.2px;
}

/* Main Content Container */
.main-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 152px); /* Subtract header and audio player height */
  overflow-y: auto;
  padding-bottom: 20px;
}

/* Search Section */
.search-section {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px 20px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-container:focus-within {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: rgba(241, 237, 225, 0.8);
  transition: color 0.2s ease;
}

.search-container:focus-within .search-icon {
  color: #F1EDE1;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #F1EDE1;
  font-size: 16px;
  font-weight: 400;
  outline: none;
  letter-spacing: -0.2px;
}

.search-input::placeholder {
  color: rgba(241, 237, 225, 0.5);
  font-weight: 400;
}

.clear-search-btn {
  background: none;
  border: none;
  color: #F1EDE1;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}



/* Progress Section */
.progress-section {
  margin: 24px 0;
  padding: 0 4px;
}

.progress-container {
  margin-bottom: 16px;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-track:hover {
  background: rgba(255, 255, 255, 0.15);
  height: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF4775 0%, #F10F47 100%);
  border-radius: 3px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px rgba(255, 71, 117, 0.4);
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: #FFFFFF;
  border: 3px solid #FF4775;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

.progress-handle:hover {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* Time Display */
.time-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.current-time,
.remaining-time {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.3px;
  min-width: 45px;
  text-align: center;
}

.progress-percentage {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Mini Progress Bar */
.progress-mini {
  flex: 1;
  height: 3px;
  position: relative;
  background: rgba(255, 255, 255, 1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-mini-track {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 1);
  border-radius: 2px;
}

.progress-mini-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF4775 0%, #F10F47 100%);
  border-radius: 2px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px rgba(255, 71, 117, 0.3);
}

/* Podcast Covers Section */
.covers-section {
  flex-shrink: 0;
  padding: 0 24px;
}

.covers-container {
  height: 320px;
  position: relative;
  overflow: hidden;
}

.covers-scroll {
  display: flex;
  gap: 24px;
  height: 100%;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 48px;
  align-items: center;
}

.covers-scroll::-webkit-scrollbar {
  display: none;
}

.cover-item {
  flex-shrink: 0;
  width: 220px;
  height: 280px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.cover-item.inactive {
  opacity: 0.3;
  transform: scale(0.88);
  filter: brightness(0.7);
}

.cover-item.inactive:nth-child(odd) {
  transform: rotate(-3deg) scale(0.88);
}

.cover-item.inactive:nth-child(even) {
  transform: rotate(3deg) scale(0.88);
}

.cover-item.inactive:last-child {
  transform: rotate(5deg) scale(0.88);
}

.cover-item.active {
  opacity: 1;
  transform: scale(1);
  z-index: 2;
  filter: brightness(1);
  border: 3px solid #FF4775 !important;
  border-radius: 32px !important;
  outline: none !important;
  box-shadow: 0 0 20px rgba(255, 71, 117, 0.4) !important;
}

.cover-item.adjacent {
  opacity: 0.7;
  transform: scale(0.92);
  z-index: 1;
  filter: brightness(0.85);
}

.cover-item.adjacent:hover {
  opacity: 0.9;
  transform: scale(0.96);
  filter: brightness(0.95);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 32px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.cover-item.active .cover-image {
  border: none;
}



/* Bouton Favoris */
.favorite-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  backdrop-filter: blur(10px);
}

.favorite-btn:hover,
.favorite-btn:focus {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
  outline: 2px solid #FF4775;
  outline-offset: 2px;
}

.favorite-btn.is-favorite {
  background: rgba(220, 38, 127, 0.95);
  border: 2px solid #DC267F;
  box-shadow: 0 2px 12px rgba(220, 38, 127, 0.4);
}

.favorite-btn.is-favorite:hover {
  background: rgba(220, 38, 127, 1);
  border: 2px solid #BE185D;
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(220, 38, 127, 0.6);
}

/* Progress Percentage Cover */
.progress-percentage-cover {
  position: absolute;
  top: 12px;
  left: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 10px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
  letter-spacing: -0.2px;
}

/* Lazy Loading Icon */
.lazy-loading-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  padding: 16px;
  backdrop-filter: blur(10px);
}



/* Bouton Play/Pause central */
.play-pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 5;
  border-radius: 34px;
}

.cover-item.active:hover .play-pause-overlay {
  opacity: 1;
}

.play-pause-btn {
  background: rgba(255, 71, 117, 0.9);
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(255, 71, 117, 0.4);
}

.play-pause-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 71, 117, 1);
  box-shadow: 0 6px 25px rgba(255, 71, 117, 0.6);
}

.play-pause-btn.playing {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.4);
}

.play-pause-btn.playing:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 6px 25px rgba(255, 255, 255, 0.6);
}

.play-pause-btn.playing svg rect {
  fill: rgba(255, 71, 117, 0.9);
}

.play-pause-btn.playing:hover svg rect {
  fill: rgba(255, 71, 117, 1);
}



/* Points de Pagination */
.pagination-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
}

.pagination-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pagination-dot:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.3);
}

.pagination-dot.active {
  background: #FF4775;
  transform: scale(1.4);
  box-shadow: 0 0 16px rgba(255, 71, 117, 0.4);
}



/* Podcast Info Section */
.podcast-info-section {
  flex-shrink: 0;
  padding: 0 32px 32px 32px;
  margin-bottom: 32px;
}

.podcast-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.host-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.podcast-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.podcast-description {
  margin-top: 8px;
}

.podcast-title-row {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;
}

.podcast-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.episode-date {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 400;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.see-more {
  color: #FF4775;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
  margin-left: 4px;
  transition: color 0.2s ease;
}

.see-more:hover {
  color: #F10F47;
}

.podcast-title {
  color: #FFFFFF;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  letter-spacing: -0.6px;
}

.host-name {
  color: rgba(241, 237, 225, 0.8);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.episode-description {
  color: rgba(245, 245, 245, 0.9);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: -0.3px;
  margin: 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.podcast-duration {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.duration-icon {
  font-size: 14px;
  opacity: 0.8;
}

.duration-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.2px;
}

.podcast-metadata {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.metadata-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}





/* Audio Player Bar */
.audio-player-bar {
  position: fixed;
  top: 120px;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(90deg, #FF4775, #F10F47);
  box-shadow: 0 4px 24px rgba(255, 71, 117, 0.4);
  padding: 16px 24px;
  z-index: 999;
  border-radius: 8px;
  margin: 0 16px;
  width: calc(100% - 32px);
}

.player-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.song-data {
  display: flex;
  align-items: center;
  gap: 16px;
}

.thumbnail {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  object-fit: cover;
}

.song-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.song-title {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.3px;
  max-width: 100px; /* prevent overflow in the bar */
  overflow: hidden;
  white-space: nowrap;
  position: relative;
}

.song-title .marquee-text {
  display: inline-block;
  padding-left: 100%;
  /* Only animate when text is wider than container */
  animation: marquee 10s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.song-artist {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.time-remaining {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.player-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 0;
  position: relative;
}

.volume-button {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.volume-button:hover,
.volume-button:focus {
  opacity: 0.8;
  outline: 2px solid #FF4775;
  outline-offset: 2px;
}

.volume-slider-container {
  position: absolute;
  left: 50px;
  top: -70px;
  background: rgba(9, 23, 76, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 16px;
  z-index: 100;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.volume-slider {
  width: 110px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-range {
  width: 140px;
  height: 120px;
  transform: rotate(-90deg);
  transform-origin: center;
  background: transparent;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.volume-range::-webkit-slider-track {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  height: 6px;
}

.volume-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: #FF4775;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(255, 71, 117, 0.5);
}

/* Firefox */
.volume-range::-moz-range-track {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  height: 6px;
}
.volume-range::-moz-range-thumb {
  background: #FF4775;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(255, 71, 117, 0.5);
}

.volume-range:focus {
  outline: none;
}
.volume-range:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 6px rgba(255, 71, 117, 0.25);
}
.volume-range:hover::-webkit-slider-thumb {
  transform: scale(1.05);
}

.pause-button,
.close-button {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.pause-button:hover,
.pause-button:focus,
.close-button:hover,
.close-button:focus {
  opacity: 0.8;
  outline: 2px solid #FF4775;
  outline-offset: 2px;
}

/* Share Modal */
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.share-modal {
  width: 90%;
  max-width: 320px;
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 100%);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.share-header h3 {
  color: #F1EDE1;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-share-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #F1EDE1;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-share-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.share-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.share-option:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.share-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.share-icon.whatsapp {
  background: #25D366;
}

.share-icon.facebook {
  background: #1877F2;
}

.share-icon.twitter {
  background: #1DA1F2;
}

.share-icon.instagram {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
}

.share-icon.link {
  background: #FF4775;
}

.share-option span {
  color: #F1EDE1;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Comments Section */
.comments-section {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0 24px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin-bottom: 20px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.comments-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  margin: 0;
  letter-spacing: -0.3px;
}

.toggle-comments-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-comments-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.1);
}

.comments-content {
  padding: 0 24px 20px 24px;
  max-height: 300px;
  overflow-y: auto;
}

.comments-list {
  margin-bottom: 16px;
}

.comments-empty {
  text-align: center;
  padding: 32px 16px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.2px;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .main-content {
    height: calc(100vh - 140px);
  }

  .podcast-header-section {
    padding: 24px 20px 16px 20px;
  }

  .section-title {
    font-size: 28px;
  }

  .section-subtitle {
    font-size: 14px;
  }

  .search-section {
    padding: 16px 20px;
  }

  .progress-section {
    padding: 0 20px;
  }

  .covers-scroll {
    padding: 0 24px;
  }

  .cover-item {
    width: 200px;
    height: 250px;
  }

  .podcast-info-section {
    padding: 0 24px 24px 24px;
  }

  .podcast-title {
    font-size: 20px;
  }

  .episode-description {
    font-size: 14px;
  }

  .comments-section {
    margin: 0 20px;
  }

  .comments-header {
    padding: 16px 20px 12px 20px;
  }

  .comments-content {
    padding: 0 20px 16px 20px;
  }

  .podcast-actions {
    gap: 6px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
  }
}

@media (max-width: 360px) {
  .podcast-header-section {
    padding: 20px 16px 12px 16px;
  }

  .section-title {
    font-size: 24px;
  }

  .section-subtitle {
    font-size: 13px;
  }

  .covers-scroll {
    padding: 0 20px;
  }

  .cover-item {
    width: 180px;
    height: 230px;
  }

  .podcast-info-section {
    padding: 0 20px 20px 20px;
  }

  .host-avatar {
    width: 40px;
    height: 40px;
  }

  .podcast-title {
    font-size: 18px;
  }

  .episode-description {
    font-size: 13px;
  }

  .comments-section {
    margin: 0 16px;
  }

  .comments-header {
    padding: 14px 16px 10px 16px;
  }

  .comments-content {
    padding: 0 16px 14px 16px;
  }

  .comments-title {
    font-size: 16px;
  }
}


</style>
