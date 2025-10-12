// Gestionnaire LOD (Level of Detail) pour optimiser la géométrie selon la distance
import * as THREE from 'three'

export class LODManager {
  constructor() {
    this.lodLevels = new Map()
    this.currentLOD = 'high'
    this.lastUpdateTime = 0
    this.updateInterval = 100 // Vérifier le LOD toutes les 100ms
  }

  // Définir les niveaux de LOD
  setupLODLevels() {
    const isMobile = window.innerWidth < 768
    
    this.lodLevels.set('low', {
      sphereSegments: isMobile ? 16 : 24,
      glowSegments: isMobile ? 8 : 16,
      particleCount: isMobile ? 10 : 25,
      textureSize: 512,
      animationQuality: 'low'
    })
    
    this.lodLevels.set('medium', {
      sphereSegments: isMobile ? 24 : 32,
      glowSegments: isMobile ? 12 : 24,
      particleCount: isMobile ? 15 : 50,
      textureSize: 1024,
      animationQuality: 'medium'
    })
    
    this.lodLevels.set('high', {
      sphereSegments: isMobile ? 32 : 64,
      glowSegments: isMobile ? 16 : 32,
      particleCount: isMobile ? 25 : 100,
      textureSize: 2048,
      animationQuality: 'high'
    })
  }

  // Calculer le niveau LOD basé sur la distance et les performances
  calculateLOD(camera, sphere, performanceMetrics) {
    if (!camera || !sphere) return 'medium'
    
    const distance = camera.position.distanceTo(sphere.position)
    const fps = performanceMetrics?.fps || 60
    const isMobile = window.innerWidth < 768
    
    // Facteurs de décision LOD
    let lodScore = 0
    
    // Distance (plus c'est loin, moins de détails)
    if (distance > 15) lodScore -= 2
    else if (distance > 8) lodScore -= 1
    else if (distance < 4) lodScore += 1
    
    // Performance (FPS bas = LOD bas)
    if (fps < 20) lodScore -= 3
    else if (fps < 30) lodScore -= 2
    else if (fps < 45) lodScore -= 1
    else if (fps > 55) lodScore += 1
    
    // Device (mobile = LOD plus conservateur)
    if (isMobile) lodScore -= 1
    
    // Température (surchauffe = LOD bas)
    if (performanceMetrics?.temperature === 'hot') lodScore -= 2
    
    // Déterminer le niveau LOD
    if (lodScore <= -3) return 'low'
    if (lodScore <= 0) return 'medium'
    return 'high'
  }

  // Mettre à jour la géométrie selon le LOD
  updateGeometry(sphere, glow, newLOD) {
    if (this.currentLOD === newLOD) return false
    
    const lodConfig = this.lodLevels.get(newLOD)
    if (!lodConfig) return false
    
    try {
      // Mettre à jour la sphère principale
      if (sphere && sphere.geometry) {
        const oldGeometry = sphere.geometry
        const newGeometry = new THREE.SphereGeometry(
          1.8, 
          lodConfig.sphereSegments, 
          lodConfig.sphereSegments
        )
        sphere.geometry = newGeometry
        oldGeometry.dispose()
      }
      
      // Mettre à jour le halo
      if (glow && glow.geometry) {
        const oldGlowGeometry = glow.geometry
        const newGlowGeometry = new THREE.SphereGeometry(
          2.07, 
          lodConfig.glowSegments, 
          lodConfig.glowSegments
        )
        glow.geometry = newGlowGeometry
        oldGlowGeometry.dispose()
      }
      
      this.currentLOD = newLOD
      return true
      
    } catch (error) {
      console.error('Erreur mise à jour LOD:', error)
      return false
    }
  }

  // Mettre à jour les particules selon le LOD
  updateParticles(particleSystem, newLOD) {
    const lodConfig = this.lodLevels.get(newLOD)
    if (!lodConfig || !particleSystem) return
    
    try {
      const targetCount = lodConfig.particleCount
      const currentCount = particleSystem.geometry.attributes.position.count
      
      if (currentCount !== targetCount) {
        // Créer une nouvelle géométrie de particules
        const newGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(targetCount * 3)
        
        for (let i = 0; i < targetCount * 3; i += 3) {
          positions[i] = (Math.random() - 0.5) * 20
          positions[i + 1] = (Math.random() - 0.5) * 20
          positions[i + 2] = (Math.random() - 0.5) * 20
        }
        
        newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        // Remplacer l'ancienne géométrie
        const oldGeometry = particleSystem.geometry
        particleSystem.geometry = newGeometry
        oldGeometry.dispose()
        
      }
    } catch (error) {
      console.error('Erreur mise à jour particules LOD:', error)
    }
  }

  // Ajuster la qualité des animations selon le LOD
  updateAnimationQuality(material, newLOD) {
    const lodConfig = this.lodLevels.get(newLOD)
    if (!lodConfig || !material) return
    
    switch (lodConfig.animationQuality) {
      case 'low':
        // Réduire la complexité des shaders
        if (material.uniforms) {
          material.uniforms.rotationSpeed.value *= 0.5
          material.uniforms.atmoStrength.value *= 0.7
        }
        break
        
      case 'medium':
        // Qualité normale
        if (material.uniforms) {
          material.uniforms.rotationSpeed.value = 0.001
          material.uniforms.atmoStrength.value = 0.3
        }
        break
        
      case 'high':
        // Qualité maximale
        if (material.uniforms) {
          material.uniforms.rotationSpeed.value = 0.002
          material.uniforms.atmoStrength.value = 0.45
        }
        break
    }
  }

  // Mise à jour complète du LOD
  update(camera, sphere, glow, particleSystem, material, performanceMetrics) {
    const now = performance.now()
    if (now - this.lastUpdateTime < this.updateInterval) return
    
    const newLOD = this.calculateLOD(camera, sphere, performanceMetrics)
    
    if (newLOD !== this.currentLOD) {
      // Mettre à jour tous les éléments
      this.updateGeometry(sphere, glow, newLOD)
      this.updateParticles(particleSystem, newLOD)
      this.updateAnimationQuality(material, newLOD)
      
      // Émettre un événement pour informer les autres composants
      window.dispatchEvent(new CustomEvent('lod:changed', {
        detail: { 
          oldLOD: this.currentLOD, 
          newLOD: newLOD,
          config: this.lodLevels.get(newLOD)
        }
      }))
    }
    
    this.lastUpdateTime = now
  }

  // Forcer un niveau LOD spécifique
  forceLOD(level) {
    if (this.lodLevels.has(level)) {
      this.currentLOD = level
    }
  }

  // Obtenir les statistiques LOD
  getStats() {
    const config = this.lodLevels.get(this.currentLOD)
    return {
      currentLOD: this.currentLOD,
      sphereSegments: config?.sphereSegments || 0,
      particleCount: config?.particleCount || 0,
      textureSize: config?.textureSize || 0,
      triangleCount: config ? config.sphereSegments * config.sphereSegments * 2 : 0
    }
  }
}

// Instance globale
export const lodManager = new LODManager()

// Initialiser les niveaux LOD au chargement
lodManager.setupLODLevels()

// Réinitialiser les niveaux LOD lors du redimensionnement
window.addEventListener('resize', () => {
  lodManager.setupLODLevels()
})
