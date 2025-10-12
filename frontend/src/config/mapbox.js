// Configuration Mapbox gratuite et fonctionnelle
export const MAPBOX_CONFIG = {
  // Token Mapbox public valide
  accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
  
  styles: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-v9'
  },
  
  default: {
    center: [11.5021, 3.8480], // Douala, Cameroun
    zoom: 14,
    pitch: 0, // Vue 2D pour commencer
    bearing: 0,
    antialias: true
  },
  
  zoom: { 
    min: 10, 
    max: 18 
  },
  
  animation: { 
    duration: 1000, 
    curve: 1.42, 
    easing: (t) => t * (2 - t) 
  }
}

// Initialisation Mapbox
export const initMapbox = () => {
  if (typeof mapboxgl === 'undefined') {
    console.warn('Mapbox GL JS non chargé')
    return false
  }
  return true
}

// Style basé sur l'heure
export const getTimeBasedStyle = () => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 18) {
    return MAPBOX_CONFIG.styles.streets // Jour
  } else {
    return MAPBOX_CONFIG.styles.dark // Nuit
  }
}

// Calcul de distance
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Génération de positions aléatoires
export const generateRandomPositions = (centerLat, centerLon, count, radiusKm) => {
  const positions = []
  for (let i = 0; i < count; i++) {
    const r = radiusKm * Math.sqrt(Math.random())
    const theta = Math.random() * 2 * Math.PI
    const lat = centerLat + (r * Math.cos(theta) / 111.32)
    const lon = centerLon + (r * Math.sin(theta) / (111.32 * Math.cos(centerLat * Math.PI / 180)))
    positions.push([lon, lat])
  }
  return positions
} 
export const MAPBOX_CONFIG = {
  // Token Mapbox public valide
  accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
  
  styles: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-v9'
  },
  
  default: {
    center: [11.5021, 3.8480], // Douala, Cameroun
    zoom: 14,
    pitch: 0, // Vue 2D pour commencer
    bearing: 0,
    antialias: true
  },
  
  zoom: { 
    min: 10, 
    max: 18 
  },
  
  animation: { 
    duration: 1000, 
    curve: 1.42, 
    easing: (t) => t * (2 - t) 
  }
}

// Initialisation Mapbox
export const initMapbox = () => {
  if (typeof mapboxgl === 'undefined') {
    console.warn('Mapbox GL JS non chargé')
    return false
  }
  return true
}

// Style basé sur l'heure
export const getTimeBasedStyle = () => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 18) {
    return MAPBOX_CONFIG.styles.streets // Jour
  } else {
    return MAPBOX_CONFIG.styles.dark // Nuit
  }
}

// Calcul de distance
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Génération de positions aléatoires
export const generateRandomPositions = (centerLat, centerLon, count, radiusKm) => {
  const positions = []
  for (let i = 0; i < count; i++) {
    const r = radiusKm * Math.sqrt(Math.random())
    const theta = Math.random() * 2 * Math.PI
    const lat = centerLat + (r * Math.cos(theta) / 111.32)
    const lon = centerLon + (r * Math.sin(theta) / (111.32 * Math.cos(centerLat * Math.PI / 180)))
    positions.push([lon, lat])
  }
  return positions
} 
