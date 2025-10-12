// Moniteur de performance temps réel pour Eclairia
export class PerformanceMonitor {
  constructor() {
    this.frameCount = 0
    this.startTime = performance.now()
    this.lastFrameTime = 0
    this.fps = 0
    this.isLowPerformance = false
    this.callbacks = new Set()
    this.isRunning = false
    
    // Métriques de performance
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memory: 0,
      gpu: 0,
      temperature: 'normal'
    }
  }
  
  // Démarrer le monitoring
  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.monitor()
  }
  
  // Arrêter le monitoring
  stop() {
    this.isRunning = false
  }
  
  // Boucle de monitoring principal
  monitor() {
    if (!this.isRunning) return
    
    const now = performance.now()
    this.frameCount++
    
    // Calculer FPS toutes les secondes
    if (now - this.startTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.startTime))
      this.metrics.fps = this.fps
      this.metrics.frameTime = now - this.lastFrameTime
      
      // Détecter les performances dégradées
      this.checkPerformance()
      
      // Réinitialiser les compteurs
      this.frameCount = 0
      this.startTime = now
      
      // Notifier les callbacks
      this.notifyCallbacks()
    }
    
    this.lastFrameTime = now
    requestAnimationFrame(() => this.monitor())
  }
  
  // Vérifier les performances et déclencher les optimisations
  checkPerformance() {
    const isMobile = window.innerWidth < 768
    const targetFPS = isMobile ? 25 : 50
    
    if (this.fps < targetFPS && !this.isLowPerformance) {
      this.isLowPerformance = true
      this.metrics.temperature = 'hot'
      // Logs réduits pour éviter le spam console
      console.warn('🔥 Performance dégradée! FPS:', this.fps)
      this.triggerLowPerformanceMode()
    } else if (this.fps > targetFPS + 10 && this.isLowPerformance) {
      this.isLowPerformance = false
      this.metrics.temperature = 'normal'
      // Log unique de restauration
      this.triggerNormalPerformanceMode()
    }
    
    // Mesurer la mémoire si disponible
    if (performance.memory) {
      this.metrics.memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
      
      // Alerte mémoire
      if (this.metrics.memory > 100) {
        console.warn('⚠️ Consommation mémoire élevée:', this.metrics.memory, 'MB')
      }
    }
  }
  
  // Déclencher le mode basse performance
  triggerLowPerformanceMode() {
    
    // Émettre un événement global
    window.dispatchEvent(new CustomEvent('performance:low', {
      detail: { metrics: this.metrics }
    }))
    
    // Optimisations automatiques
    this.applyLowPerformanceOptimizations()
  }
  
  // Déclencher le mode performance normale
  triggerNormalPerformanceMode() {
    
    window.dispatchEvent(new CustomEvent('performance:normal', {
      detail: { metrics: this.metrics }
    }))
  }
  
  // Appliquer les optimisations automatiques
  applyLowPerformanceOptimizations() {
    // Réduire la qualité des particules
    const particleEvent = new CustomEvent('performance:reduce-particles')
    window.dispatchEvent(particleEvent)
    
    // Réduire la qualité des shaders
    const shaderEvent = new CustomEvent('performance:reduce-shaders')
    window.dispatchEvent(shaderEvent)
    
    // Limiter les animations
    const animationEvent = new CustomEvent('performance:limit-animations')
    window.dispatchEvent(animationEvent)
  }
  
  // Ajouter un callback pour les métriques
  onMetricsUpdate(callback) {
    this.callbacks.add(callback)
  }
  
  // Supprimer un callback
  removeCallback(callback) {
    this.callbacks.delete(callback)
  }
  
  // Notifier tous les callbacks
  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics)
      } catch (error) {
        console.error('Erreur dans callback performance:', error)
      }
    })
  }
  
  // Obtenir les métriques actuelles
  getMetrics() {
    return { ...this.metrics }
  }
  
  // Obtenir un rapport de performance
  getReport() {
    const isMobile = window.innerWidth < 768
    const device = isMobile ? 'Mobile' : 'Desktop'
    
    return {
      device,
      fps: this.metrics.fps,
      frameTime: this.metrics.frameTime.toFixed(2) + 'ms',
      memory: this.metrics.memory + 'MB',
      temperature: this.metrics.temperature,
      isLowPerformance: this.isLowPerformance,
      timestamp: new Date().toISOString()
    }
  }
  
  // Logger les métriques dans la console
  logMetrics() {
    const report = this.getReport()
    console.table(report)
  }
}

// Instance globale
export const performanceMonitor = new PerformanceMonitor()

// Auto-démarrage uniquement si explicitement demandé
// Commenté pour éviter les logs excessifs en console
// if (process.env.NODE_ENV === 'development') {
//   performanceMonitor.start()
//   
//   // Log des métriques toutes les 5 secondes en dev
//   setInterval(() => {
//     performanceMonitor.logMetrics()
//   }, 5000)
// }
