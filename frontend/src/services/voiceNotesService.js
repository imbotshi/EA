// Service de gestion des notes vocales
class VoiceNotesService {
  constructor() {
    this.storageKey = 'eclairia-voice-notes'
    this.notes = this.loadNotes()
  }

  // Obtenir une localisation approximative via l'adresse IP (ville/pays)
  async getIpApproxLocation() {
    // 1) ipapi.co (sans clé) puis 2) ipwho.is en secours
    try {
      const res = await fetch('https://ipapi.co/json/')
      if (res.ok) {
        const data = await res.json()
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return { latitude: data.latitude, longitude: data.longitude, source: 'ipapi' }
        }
      }
      throw new Error('ipapi.co did not return coords')
    } catch (_) {
      // Fallback ipwho.is
      const res2 = await fetch('https://ipwho.is/')
      if (!res2.ok) throw new Error('ipwho.is HTTP error')
      const d2 = await res2.json()
      if (d2 && d2.success && typeof d2.latitude === 'number' && typeof d2.longitude === 'number') {
        return { latitude: d2.latitude, longitude: d2.longitude, source: 'ipwho' }
      }
      throw new Error('ipwho.is did not return coords')
    }
  }

  // Charger les notes depuis le stockage local
  loadNotes() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Erreur lors du chargement des notes vocales:', error)
      return []
    }
  }

  // Sauvegarder les notes dans le stockage local
  saveNotes() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notes))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes vocales:', error)
    }
  }

  // Ajouter une nouvelle note vocale
  addNote(noteData) {
    const newNote = {
      id: Date.now().toString(),
      title: noteData.title || 'Note vocale',
      user: noteData.user || 'Utilisateur',
      coordinates: noteData.coordinates || [0, 0],
      duration: noteData.duration || '0:00',
      timestamp: new Date().toISOString().split('T')[0],
      description: noteData.description || '',
      audioBlob: noteData.audioBlob,
      audioUrl: noteData.audioUrl,
      category: noteData.category || 'Général',
      country: noteData.country || 'Inconnu',
      city: noteData.city || 'Inconnu'
    }

    this.notes.unshift(newNote) // Ajouter au début
    this.saveNotes()
    return newNote
  }

  // Obtenir toutes les notes
  getAllNotes() {
    return this.notes
  }

  // Obtenir une note par ID
  getNoteById(id) {
    return this.notes.find(note => note.id === id)
  }

  // Supprimer une note
  deleteNote(id) {
    const index = this.notes.findIndex(note => note.id === id)
    if (index !== -1) {
      const note = this.notes[index]
      // Libérer l'URL audio si elle existe
      if (note.audioUrl) {
        URL.revokeObjectURL(note.audioUrl)
      }
      this.notes.splice(index, 1)
      this.saveNotes()
      return true
    }
    return false
  }

  // Mettre à jour une note
  updateNote(id, updates) {
    const index = this.notes.findIndex(note => note.id === id)
    if (index !== -1) {
      this.notes[index] = { ...this.notes[index], ...updates }
      this.saveNotes()
      return this.notes[index]
    }
    return null
  }

  // Rechercher des notes
  searchNotes(query) {
    const searchTerm = query.toLowerCase()
    return this.notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.user.toLowerCase().includes(searchTerm) ||
      note.description.toLowerCase().includes(searchTerm) ||
      note.category.toLowerCase().includes(searchTerm)
    )
  }

  // Filtrer les notes par catégorie
  filterNotesByCategory(category) {
    if (!category) return this.notes
    return this.notes.filter(note => note.category === category)
  }

  // Filtrer les notes par pays
  filterNotesByCountry(country) {
    if (!country) return this.notes
    return this.notes.filter(note => note.country === country)
  }

  // Obtenir les statistiques des notes
  getNotesStats() {
    const total = this.notes.length
    const categories = {}
    const countries = {}
    let totalDuration = 0

    this.notes.forEach(note => {
      // Compter les catégories
      categories[note.category] = (categories[note.category] || 0) + 1
      
      // Compter les pays
      countries[note.country] = (countries[note.country] || 0) + 1
      
      // Calculer la durée totale
      const duration = this.parseDuration(note.duration)
      totalDuration += duration
    })

    return {
      total,
      categories,
      countries,
      totalDuration: this.formatDuration(totalDuration),
      averageDuration: this.formatDuration(totalDuration / total || 0)
    }
  }

  // Parser la durée (format "MM:SS")
  parseDuration(duration) {
    const parts = duration.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  // Formater la durée en secondes vers "MM:SS"
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Obtenir la position de l'utilisateur
  async getUserLocation() {
    if (!navigator.geolocation) {
      throw new Error('Géolocalisation non supportée')
    }

    const toCoords = (pos) => ({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })

    // 1) Tentative rapide: accepter une position récente/cachée (réseau)
    const quickTry = () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(toCoords(pos)),
        (err) => reject(err),
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 300000 // jusqu'à 5 min de cache
        }
      )
    })

    // 2) Tentative de repli plus longue
    const retryTry = () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(toCoords(pos)),
        (err) => reject(err),
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300000
        }
      )
    })

    try {
      return await quickTry()
    } catch (e1) {
      try {
        return await retryTry()
      } catch (e2) {
        // Propager la dernière erreur (souvent code 2 ou 3)
        throw e2
      }
    }
  }

  // Obtenir le nom de la ville à partir des coordonnées
  async getCityFromCoordinates(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      )
      const data = await response.json()
      
      if (data.address) {
        return {
          city: data.address.city || data.address.town || data.address.village || 'Inconnu',
          country: data.address.country || 'Inconnu'
        }
      }
      
      return { city: 'Inconnu', country: 'Inconnu' }
    } catch (error) {
      console.error('Erreur lors de la récupération de la ville:', error)
      return { city: 'Inconnu', country: 'Inconnu' }
    }
  }

  // Exporter les notes
  exportNotes() {
    const exportData = {
      notes: this.notes,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eclairia-voice-notes-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Importer des notes
  importNotes(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          
          if (data.notes && Array.isArray(data.notes)) {
            // Fusionner avec les notes existantes
            this.notes = [...this.notes, ...data.notes]
            this.saveNotes()
            resolve(data.notes.length)
          } else {
            reject(new Error('Format de fichier invalide'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
      reader.readAsText(file)
    })
  }

  // Nettoyer les notes orphelines
  cleanupOrphanedNotes() {
    const validNotes = this.notes.filter(note => {
      // Vérifier si l'audio existe encore
      if (note.audioUrl) {
        try {
          // Tenter d'accéder à l'URL
          const testUrl = new URL(note.audioUrl)
          return true
        } catch {
          return false
        }
      }
      return true
    })

    if (validNotes.length !== this.notes.length) {
      this.notes = validNotes
      this.saveNotes()
      return this.notes.length - validNotes.length
    }
    
    return 0
  }
}

// Créer et exporter une instance unique
export const voiceNotesService = new VoiceNotesService()

// Fonctions utilitaires exportées
export const {
  addNote,
  getAllNotes,
  getNoteById,
  deleteNote,
  updateNote,
  searchNotes,
  filterNotesByCategory,
  filterNotesByCountry,
  getNotesStats,
  getUserLocation,
  getIpApproxLocation,
  getCityFromCoordinates,
  exportNotes,
  importNotes,
  cleanupOrphanedNotes
} = voiceNotesService

