// Gestionnaire audio optimisé pour éviter la surchauffe
export class AudioManager {
  constructor() {
    this.activeStreams = new Map()
    this.maxConcurrentStreams = 1
    this.connectionQuality = 'auto'
    this.retryAttempts = new Map()
    this.maxRetries = 3
    this.retryDelay = 2000
  }

  // Détecter la qualité de connexion
  detectConnectionQuality() {
    if (!navigator.connection) return 'medium'
    
    const connection = navigator.connection
    const downlink = connection.downlink || 1
    
    if (downlink > 10) return 'high'
    if (downlink > 2) return 'medium'
    return 'low'
  }

  // Obtenir une URL proxifiée pour éviter CORS
  getProxiedUrl(url) {
    // Utiliser le même système que radioApi.js
    const API_BASE = this.getApiBase()
    
    // Nettoyer l'URL pour éviter le double encodage
    let cleanUrl = url
    try {
      // Décoder si l'URL est déjà encodée
      if (url.includes('%')) {
        cleanUrl = decodeURIComponent(url)
      }
    } catch (e) {
      // Si le décodage échoue, utiliser l'URL originale
      cleanUrl = url
    }
    
    return `${API_BASE}/proxy?url=${encodeURIComponent(cleanUrl)}`
  }

  // Détecter la base API (copié de radioApi.js)
  getApiBase() {
    if (typeof window === 'undefined') return ''
    const port = window.location?.port || ''
    const host = window.location?.hostname || 'localhost'
    
    try {
      if (import.meta?.env?.DEV) return ''
    } catch {}
    
    if (port === '3001') return ''
    return `http://${host}:3001`
  }

  // Obtenir l'URL adaptative selon la qualité
  getAdaptiveUrl(station, quality = null) {
    const detectedQuality = quality || this.detectConnectionQuality()
    
    // Si la station a plusieurs qualités disponibles
    if (station.streams && typeof station.streams === 'object') {
      if (detectedQuality === 'low' && station.streams.low) {
        return station.streams.low
      }
      if (detectedQuality === 'medium' && station.streams.medium) {
        return station.streams.medium
      }
      if (station.streams.high) {
        return station.streams.high
      }
    }
    
    // Fallback sur l'URL principale - support multiple formats
    return station.url || station.stream_url || station.stream
  }

  // Arrêter tous les flux actifs
  stopAllStreams() {
    this.activeStreams.forEach((audioElement, streamId) => {
      try {
        audioElement.pause()
        audioElement.src = ''
        audioElement.load()
      } catch (error) {
        console.warn(`Erreur lors de l'arrêt du flux ${streamId}:`, error)
      }
    })
    this.activeStreams.clear()
    this.retryAttempts.clear()
  }

  // Créer un nouveau flux audio
  async createStream(station, audioElement) {
    const streamId = station.id || station.name
    
    // Vérifier la limite de flux concurrent
    if (this.activeStreams.size >= this.maxConcurrentStreams) {
      this.stopAllStreams()
    }

    try {
      // Obtenir l'URL adaptative
      const streamUrl = this.getAdaptiveUrl(station)
      
      if (!streamUrl) {
        throw new Error('Aucune URL de flux disponible')
      }

      // Configurer l'élément audio avec proxy pour éviter CORS
      // Utiliser le proxy pour toutes les URLs externes sauf celles déjà locales
      const needsProxy = !streamUrl.startsWith('http://localhost') && 
                        !streamUrl.startsWith('http://127.0.0.1') &&
                        !streamUrl.startsWith('/');
      const proxiedUrl = needsProxy ? this.getProxiedUrl(streamUrl) : streamUrl
      
      audioElement.src = proxiedUrl
      audioElement.crossOrigin = 'anonymous'
      audioElement.preload = 'none' // Économiser la bande passante
      
      // Timeout pour éviter les blocages
      const loadTimeout = setTimeout(() => {
        throw new Error('Timeout de chargement (15s)')
      }, 15000)

      // Attendre que l'audio soit prêt
      await new Promise((resolve, reject) => {
        const handleCanPlay = () => {
          clearTimeout(loadTimeout)
          audioElement.removeEventListener('canplay', handleCanPlay)
          audioElement.removeEventListener('error', handleError)
          resolve()
        }

        const handleError = (event) => {
          clearTimeout(loadTimeout)
          audioElement.removeEventListener('canplay', handleCanPlay)
          audioElement.removeEventListener('error', handleError)
          
          // Diagnostic détaillé de l'erreur
          const audioError = event.target?.error
          let errorDetail = 'Flux indisponible'
          
          if (audioError) {
            switch (audioError.code) {
              case 1: errorDetail = 'Chargement abandonné'; break
              case 2: errorDetail = 'Erreur réseau'; break
              case 3: errorDetail = 'Format non supporté'; break
              case 4: errorDetail = 'Source non trouvée'; break
              default: errorDetail = `Code erreur ${audioError.code}`
            }
          }
          
          console.error(`🔍 Détail erreur audio:`, {
            code: audioError?.code,
            message: audioError?.message,
            src: audioElement.src,
            readyState: audioElement.readyState,
            networkState: audioElement.networkState
          })
          
          reject(new Error(`Erreur de chargement: ${errorDetail}`))
        }

        audioElement.addEventListener('canplay', handleCanPlay)
        audioElement.addEventListener('error', handleError)
        audioElement.load()
      })

      // Enregistrer le flux actif
      this.activeStreams.set(streamId, audioElement)
      this.retryAttempts.delete(streamId) // Reset des tentatives
      
      return audioElement

    } catch (error) {
      console.error(`❌ Erreur création flux ${streamId}:`, error.message)
      
      // Gestion des tentatives de retry
      const attempts = this.retryAttempts.get(streamId) || 0
      if (attempts < this.maxRetries) {
        this.retryAttempts.set(streamId, attempts + 1)
        
        // Retry avec délai exponentiel
        const delay = this.retryDelay * Math.pow(2, attempts)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return this.createStream(station, audioElement)
      } else {
        this.retryAttempts.delete(streamId)
        throw error
      }
    }
  }

  // Jouer une station
  async playStation(station, audioElement) {
    try {
      const stream = await this.createStream(station, audioElement)
      await stream.play()
      
      return stream
      
    } catch (error) {
      console.error(`❌ Impossible de jouer ${station.name}:`, error.message)
      throw error
    }
  }

  // Arrêter une station spécifique
  stopStation(stationId) {
    const audioElement = this.activeStreams.get(stationId)
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      this.activeStreams.delete(stationId)
    }
  }

  // Obtenir les statistiques des flux
  getStreamStats() {
    return {
      activeStreams: this.activeStreams.size,
      maxStreams: this.maxConcurrentStreams,
      connectionQuality: this.detectConnectionQuality(),
      retryingStreams: this.retryAttempts.size
    }
  }

  // Nettoyer toutes les ressources
  dispose() {
    this.stopAllStreams()
  }
}

// Instance globale
export const audioManager = new AudioManager()

// Nettoyage automatique au déchargement de la page
window.addEventListener('beforeunload', () => {
  audioManager.dispose()
})
