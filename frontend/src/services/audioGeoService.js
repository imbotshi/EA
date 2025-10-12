// Service for managing geolocated audio notes
class AudioGeoService {
  constructor() {
    this.currentUserId = 'current-user' // Should be set from auth system
    this.watchId = null
    this.currentPosition = null
    this.updateInterval = 3000 // 3 seconds as per user story
    this.positionUpdateCallbacks = []
  }

  // Set current user ID (should be called after authentication)
  setCurrentUserId(userId) {
    this.currentUserId = userId
  }

  // Get current user ID
  getCurrentUserId() {
    return this.currentUserId
  }

  // Check if audio belongs to current user
  isOwnAudio(audioData) {
    return audioData.userId === this.currentUserId || 
           audioData.user === 'Éclaireur' || 
           audioData.user === 'Utilisateur'
  }

  // Start GPS tracking for real-time position updates
  startGPSTracking() {
    if (this.watchId !== null) {
      console.log(' [GPS SERVICE] Tracking déjà actif')
      return
    }
    
    if (!navigator.geolocation) {
      console.error(' [GPS SERVICE] Géolocalisation non supportée')
      return
    }
    
    console.log(' [GPS SERVICE] Démarrage tracking GPS...')
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        }
        
        console.log(' [GPS SERVICE] Nouvelle position:', {
          lat: newPosition.lat.toFixed(6),
          lng: newPosition.lng.toFixed(6),
          accuracy: newPosition.accuracy + 'm'
        })
        
        this.currentPosition = newPosition
        
        // Notify callbacks
        console.log(' [GPS SERVICE] Notification à', this.positionUpdateCallbacks.length, 'callbacks')
        this.positionUpdateCallbacks.forEach(callback => {
          try {
            callback(newPosition)
          } catch (error) {
            console.error(' [GPS SERVICE] Erreur callback position:', error)
          }
        })
      },
      (error) => {
        console.error(' [GPS SERVICE] Erreur tracking GPS:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: this.updateInterval
      }
    )
  }

  // Stop GPS tracking
  stopGPSTracking() {
    if (this.watchId !== null) {
      console.log(' [GPS SERVICE] Arrêt tracking GPS...')
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      this.currentPosition = null
      console.log(' [GPS SERVICE] Tracking GPS arrêté')
    }
  }

  // Subscribe to position updates
  onPositionUpdate(callback) {
    this.positionUpdateCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.positionUpdateCallbacks.indexOf(callback)
      if (index > -1) {
        this.positionUpdateCallbacks.splice(index, 1)
      }
    }
  }

  // Get current position (one-time)
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          }
          this.currentPosition = pos
          resolve(pos)
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      )
    })
  }

  // Upload audio with geolocation
  async uploadAudio(audioBlob, metadata) {
    console.log(' [AUDIO SERVICE] Début upload audio:', {
      blobSize: audioBlob.size,
      metadata: metadata
    })
    
    try {
      // Enforce one audio per user - delete existing audio first
      console.log(' [AUDIO SERVICE] Suppression audio existant pour userId:', metadata.userId || this.currentUserId)
      await this.deleteUserAudio(metadata.userId || this.currentUserId)
      
      const formData = new FormData()
      formData.append('file', audioBlob, `voice-${Date.now()}.webm`)
      formData.append('title', metadata.title || 'Note vocale')
      formData.append('user', metadata.user || 'Utilisateur')
      formData.append('userId', metadata.userId || this.currentUserId)
      formData.append('duration', String(metadata.duration || 0))
      formData.append('lat', String(metadata.lat || 0))
      formData.append('lng', String(metadata.lng || 0))
      formData.append('description', metadata.description || '')
      formData.append('category', metadata.category || 'Général')
      
      console.log(' [AUDIO SERVICE] Envoi vers /api/audios...')
      const response = await fetch('/api/audios', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(' [AUDIO SERVICE] Erreur HTTP:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      console.log(' [AUDIO SERVICE] Upload réussi:', result)
      
      // Refresh audio notes after successful upload
      console.log(' [AUDIO SERVICE] Rafraîchissement des notes...')
      await this.fetchAudioNotes()
      
      return result
    } catch (error) {
      console.error(' [AUDIO SERVICE] Erreur upload:', error)
      throw error
    }
  }

  // Delete audio (instant removal)
  async deleteAudio(audioId) {
    console.log(' [AUDIO SERVICE] Suppression audio ID:', audioId)
    try {
      const response = await fetch(`/api/audios/${audioId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        console.error(' [AUDIO SERVICE] Erreur suppression:', response.status)
        throw new Error(`Delete failed: ${response.status}`)
      }
      
      console.log(' [AUDIO SERVICE] Audio supprimé avec succès')
      
      // Refresh audio notes after deletion
      console.log(' [AUDIO SERVICE] Rafraîchissement après suppression...')
      await this.fetchAudioNotes()
      
      return true
    } catch (error) {
      console.error(' [AUDIO SERVICE] Erreur suppression audio:', error)
      throw error
    }
  }

  // Report audio
  async reportAudio(audioId, reason = 'inappropriate') {
    try {
      const reportData = {
        audioId,
        reporterId: this.currentUserId,
        reason,
        timestamp: Date.now()
      }

      const response = await fetch('/api/audios/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) {
        throw new Error(`Report failed: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error reporting audio:', error)
      throw error
    }
  }

  // Fetch all audio notes
  async fetchAudioNotes() {
    console.log(' [AUDIO SERVICE] Récupération des notes audio...')
    try {
      const response = await fetch('/api/audios')
      
      if (!response.ok) {
        console.error(' [AUDIO SERVICE] Erreur fetch:', response.status)
        throw new Error(`Fetch failed: ${response.status}`)
      }
      
      const data = await response.json()
      const notes = Array.isArray(data) ? data : []
      console.log(' [AUDIO SERVICE] Notes récupérées:', notes.length, 'notes')
      
      return notes
    } catch (error) {
      console.error(' [AUDIO SERVICE] Erreur fetch notes:', error)
      return []
    }
  }

  // Update audio position (for real-time tracking)
  async updateAudioPosition(audioId, position) {
    try {
      const response = await fetch(`/api/audios/${audioId}/position`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lat: position.lat,
          lng: position.lng,
          timestamp: position.timestamp
        })
      })

      if (!response.ok) {
        throw new Error(`Position update failed: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Error updating audio position:', error)
      throw error
    }
  }

  // Check if user has only one active audio (constraint from user story)
  async enforceOneAudioPerUser() {
    try {
      const audios = await this.fetchAudioNotes()
      const userAudios = audios.filter(audio => this.isOwnAudio(audio))
      
      // If user has more than one audio, delete the oldest ones
      if (userAudios.length > 1) {
        const sortedAudios = userAudios.sort((a, b) => 
          new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0)
        )
        
        // Keep only the newest one, delete the rest
        const audiosToDelete = sortedAudios.slice(1)
        
        for (const audio of audiosToDelete) {
          await this.deleteAudio(audio.id)
        }
        
        console.log(`Enforced one audio per user: deleted ${audiosToDelete.length} old audios`)
      }
      
      return true
    } catch (error) {
      console.error('Error enforcing one audio per user:', error)
      return false
    }
  }

  // Get distance between two coordinates (in meters)
  getDistance(pos1, pos2) {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI / 180
    const φ2 = pos2.lat * Math.PI / 180
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  // Cleanup resources
  destroy() {
    this.stopGPSTracking()
    this.positionUpdateCallbacks = []
    this.currentPosition = null
  }
}

// Create singleton instance
export const audioGeoService = new AudioGeoService()

// Export class for testing
export { AudioGeoService }
