// Gestionnaire de chargement progressif des textures pour optimiser la performance
import * as THREE from 'three'

export class TextureManager {
  constructor() {
    this.textureCache = new Map()
    this.loadingPromises = new Map()
    this.qualityLevels = ['low', 'medium', 'high']
    this.currentQuality = 'medium'
    this.loader = new THREE.TextureLoader()
    this.loader.setCrossOrigin('anonymous')
  }

  // Définir les URLs des textures par qualité (URLs existantes uniquement)
  getTextureUrls() {
    return {
      albedo: {
        low: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
        medium: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', 
        high: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
      },
      night: {
        low: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
        medium: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png',
        high: 'https://threejs.org/examples/textures/planets/earth_lights_2048.png'
      },
      clouds: {
        low: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
        medium: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
        high: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'
      }
    }
  }

  // Charger une texture avec fallback
  async loadTexture(type, quality = 'medium') {
    const cacheKey = `${type}_${quality}`
    
    // Retourner depuis le cache si disponible
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)
    }

    // Éviter les chargements multiples simultanés
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)
    }

    const urls = this.getTextureUrls()
    const textureUrls = urls[type]
    
    if (!textureUrls) {
      throw new Error(`Type de texture inconnu: ${type}`)
    }

    const loadPromise = this.loadTextureWithFallback(textureUrls, quality)
    this.loadingPromises.set(cacheKey, loadPromise)

    try {
      const texture = await loadPromise
      this.textureCache.set(cacheKey, texture)
      this.loadingPromises.delete(cacheKey)
      return texture
    } catch (error) {
      this.loadingPromises.delete(cacheKey)
      throw error
    }
  }

  // Charger une texture avec fallback sur qualités inférieures
  async loadTextureWithFallback(textureUrls, requestedQuality) {
    const qualityOrder = this.getQualityFallbackOrder(requestedQuality)
    
    for (const quality of qualityOrder) {
      const url = textureUrls[quality]
      if (!url) continue

      try {
        const texture = await this.loadSingleTexture(url)
        texture.colorSpace = THREE.SRGBColorSpace
        
        return texture
      } catch (error) {
        console.warn(`❌ Échec chargement texture ${quality}:`, error.message)
        continue
      }
    }
    
    throw new Error('Toutes les qualités de texture ont échoué')
  }

  // Charger une seule texture avec timeout
  loadSingleTexture(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout de chargement texture (10s)'))
      }, 10000)

      this.loader.load(
        url,
        (texture) => {
          clearTimeout(timeout)
          resolve(texture)
        },
        undefined,
        (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      )
    })
  }

  // Obtenir l'ordre de fallback des qualités
  getQualityFallbackOrder(requestedQuality) {
    const index = this.qualityLevels.indexOf(requestedQuality)
    if (index === -1) return ['medium', 'low']
    
    // Essayer la qualité demandée, puis descendre, puis monter
    const order = [requestedQuality]
    
    // Ajouter les qualités inférieures
    for (let i = index - 1; i >= 0; i--) {
      order.push(this.qualityLevels[i])
    }
    
    // Ajouter les qualités supérieures
    for (let i = index + 1; i < this.qualityLevels.length; i++) {
      order.push(this.qualityLevels[i])
    }
    
    return order
  }

  // Chargement progressif : commencer par basse qualité puis upgrader
  async loadProgressively(type, material, uniformName) {
    try {
      // 1. Charger d'abord la basse qualité
      const lowTexture = await this.loadTexture(type, 'low')
      material.uniforms[uniformName].value = lowTexture
      material.needsUpdate = true

      // 2. Upgrader vers medium si les performances le permettent
      setTimeout(async () => {
        try {
          const mediumTexture = await this.loadTexture(type, 'medium')
          material.uniforms[uniformName].value = mediumTexture
          material.needsUpdate = true

          // 3. Upgrader vers high si excellent performance
          setTimeout(async () => {
            try {
              if (this.shouldLoadHighQuality()) {
                const highTexture = await this.loadTexture(type, 'high')
                material.uniforms[uniformName].value = highTexture
                material.needsUpdate = true
              }
            } catch (error) {
            }
          }, 3000)

        } catch (error) {
        }
      }, 1500)

      return lowTexture

    } catch (error) {
      console.error(`❌ Échec chargement progressif ${type}:`, error.message)
      throw error
    }
  }

  // Déterminer si on peut charger la haute qualité
  shouldLoadHighQuality() {
    // Vérifier les performances
    const isMobile = window.innerWidth < 768
    if (isMobile) return false

    // Vérifier la mémoire disponible
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024
      if (memoryUsage > 150) return false // Plus de 150MB utilisés
    }

    // Vérifier la connexion
    if (navigator.connection) {
      const downlink = navigator.connection.downlink || 1
      if (downlink < 5) return false // Connexion lente
    }

    return true
  }

  // Charger toutes les textures de base
  async loadAllTextures(material, quality = 'medium') {
    try {
      
      const [albedo, night, clouds] = await Promise.all([
        this.loadTexture('albedo', quality),
        this.loadTexture('night', quality),
        this.loadTexture('clouds', quality)
      ])

      // Configurer les textures
      clouds.wrapS = clouds.wrapT = THREE.RepeatWrapping

      // Appliquer au matériau
      material.uniforms.albedoMap.value = albedo
      material.uniforms.nightMap.value = night
      material.uniforms.cloudMap.value = clouds
      material.uniforms.useTextures.value = true
      material.needsUpdate = true

      return { albedo, night, clouds }

    } catch (error) {
      console.error('❌ Échec chargement textures:', error.message)
      material.uniforms.useTextures.value = false
      throw error
    }
  }

  // Nettoyer le cache des textures
  clearCache() {
    this.textureCache.forEach(texture => {
      if (texture.dispose) texture.dispose()
    })
    this.textureCache.clear()
    this.loadingPromises.clear()
  }

  // Obtenir les statistiques du cache
  getCacheStats() {
    return {
      cachedTextures: this.textureCache.size,
      loadingTextures: this.loadingPromises.size,
      currentQuality: this.currentQuality,
      memoryEstimate: this.textureCache.size * 8 + 'MB' // Estimation grossière
    }
  }
}

// Instance globale
export const textureManager = new TextureManager()

// Nettoyage automatique
window.addEventListener('beforeunload', () => {
  textureManager.clearCache()
})
