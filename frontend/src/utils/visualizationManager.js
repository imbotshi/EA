// Gestionnaire de visualisations avancées pour Voice Map
export class VisualizationManager {
  constructor(map) {
    this.map = map
    this.heatmapLayer = null
    this.clusterLayer = null
    this.particleSystem = null
  }
  
  // Créer une heatmap des voice notes
  createHeatmap(voiceNotes) {
    if (this.heatmapLayer) {
      this.map.removeLayer('heatmap')
      this.map.removeSource('heatmap')
    }
    
    const heatmapData = voiceNotes.map(note => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: note.position
      },
      properties: {
        value: this.calculateDensity(note.position, voiceNotes)
      }
    }))
    
    this.map.addSource('heatmap', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: heatmapData
      }
    })
    
    this.map.addLayer({
      id: 'heatmap',
      type: 'heatmap',
      source: 'heatmap',
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          0, 0,
          10, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33, 102, 172, 0)',
          0.2, 'rgb(103, 169, 207)',
          0.4, 'rgb(209, 229, 240)',
          0.6, 'rgb(253, 219, 199)',
          0.8, 'rgb(239, 138, 98)',
          1, 'rgb(178, 24, 43)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          9, 20
        ],
        'heatmap-opacity': 0.8
      }
    })
    
    this.heatmapLayer = 'heatmap'
  }
  
  // Créer des clusters intelligents
  createClusters(voiceNotes, zoom) {
    const clusterRadius = this.getClusterRadius(zoom)
    const clusters = this.clusterPoints(voiceNotes, clusterRadius)
    
    // Supprimer les clusters existants
    if (this.clusterLayer) {
      this.map.removeLayer('clusters')
      this.map.removeSource('clusters')
    }
    
    const clusterData = clusters.map(cluster => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: cluster.center
      },
      properties: {
        cluster: true,
        cluster_id: cluster.id,
        point_count: cluster.points.length,
        points: cluster.points
      }
    }))
    
    this.map.addSource('clusters', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: clusterData
      }
    })
    
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'clusters',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    })
    
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'clusters',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    })
    
    this.clusterLayer = 'clusters'
  }
  
  // Système de particules pour l'activité
  createParticleSystem(voiceNotes) {
    if (this.particleSystem) {
      this.particleSystem.dispose()
    }
    
    // Créer des particules flottantes autour des voice notes
    const particles = voiceNotes.map(note => ({
      position: note.position,
      color: note.color,
      size: Math.random() * 0.5 + 0.5,
      speed: Math.random() * 0.02 + 0.01
    }))
    
    this.particleSystem = new ParticleSystem(particles)
    this.particleSystem.start()
  }
  
  // Calculer la densité pour la heatmap
  calculateDensity(position, voiceNotes) {
    const radius = 0.01 // Rayon de recherche
    let count = 0
    
    voiceNotes.forEach(note => {
      const distance = this.getDistance(position, note.position)
      if (distance < radius) {
        count++
      }
    })
    
    return count
  }
  
  // Obtenir le rayon de cluster selon le zoom
  getClusterRadius(zoom) {
    return Math.max(50, 200 - zoom * 10)
  }
  
  // Algorithme de clustering
  clusterPoints(points, radius) {
    const clusters = []
    
    points.forEach(point => {
      let addedToCluster = false
      
      for (let cluster of clusters) {
        const distance = this.getDistance(cluster.center, point.position)
        if (distance <= radius) {
          cluster.points.push(point)
          cluster.center = this.calculateCenter(cluster.points)
          addedToCluster = true
          break
        }
      }
      
      if (!addedToCluster) {
        clusters.push({
          id: clusters.length,
          center: point.position,
          points: [point]
        })
      }
    })
    
    return clusters
  }
  
  // Calculer le centre d'un cluster
  calculateCenter(points) {
    const sumLng = points.reduce((sum, point) => sum + point.position[0], 0)
    const sumLat = points.reduce((sum, point) => sum + point.position[1], 0)
    
    return [sumLng / points.length, sumLat / points.length]
  }
  
  // Calculer la distance entre deux points
  getDistance(pos1, pos2) {
    const R = 6371 // Rayon de la Terre en km
    const dLat = (pos2[1] - pos1[1]) * Math.PI / 180
    const dLon = (pos2[0] - pos1[0]) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pos1[1] * Math.PI / 180) * Math.cos(pos2[1] * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  
  // Mettre à jour les visualisations
  updateVisualizations(voiceNotes, zoom) {
    this.createHeatmap(voiceNotes)
    this.createClusters(voiceNotes, zoom)
    this.createParticleSystem(voiceNotes)
  }
  
  // Nettoyer les visualisations
  clear() {
    if (this.heatmapLayer) {
      this.map.removeLayer('heatmap')
      this.map.removeSource('heatmap')
      this.heatmapLayer = null
    }
    
    if (this.clusterLayer) {
      this.map.removeLayer('clusters')
      this.map.removeLayer('cluster-count')
      this.map.removeSource('clusters')
      this.clusterLayer = null
    }
    
    if (this.particleSystem) {
      this.particleSystem.dispose()
      this.particleSystem = null
    }
  }
}

// Système de particules simple
class ParticleSystem {
  constructor(particles) {
    this.particles = particles
    this.isRunning = false
  }
  
  start() {
    this.isRunning = true
    this.animate()
  }
  
  stop() {
    this.isRunning = false
  }
  
  animate() {
    if (!this.isRunning) return
    
    // Animer les particules
    this.particles.forEach(particle => {
      particle.position[1] += particle.speed
      if (particle.position[1] > 1) {
        particle.position[1] = 0
      }
    })
    
    requestAnimationFrame(() => this.animate())
  }
  
  dispose() {
    this.stop()
  }
}
