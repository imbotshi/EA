// Gestionnaire de gestes multi-touch pour Voice Map
export class GestureManager {
  constructor(map, options = {}) {
    this.map = map
    this.options = {
      enablePinchZoom: true,
      enableRotation: true,
      enableDoubleTap: true,
      enableLongPress: true,
      ...options
    }
    
    this.touchStart = null
    this.touchEnd = null
    this.lastTap = 0
    this.longPressTimer = null
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    const mapContainer = this.map.getContainer()
    
    // Touch events
    mapContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    mapContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    mapContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    
    // Mouse events pour desktop
    mapContainer.addEventListener('mousedown', this.handleMouseDown.bind(this))
    mapContainer.addEventListener('mousemove', this.handleMouseMove.bind(this))
    mapContainer.addEventListener('mouseup', this.handleMouseUp.bind(this))
    
    // Double tap
    mapContainer.addEventListener('click', this.handleClick.bind(this))
  }
  
  handleTouchStart(e) {
    e.preventDefault()
    
    this.touchStart = {
      time: Date.now(),
      points: Array.from(e.touches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier
      }))
    }
    
    // Long press detection
    if (this.options.enableLongPress && e.touches.length === 1) {
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(e.touches[0])
      }, 500)
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault()
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    
    if (e.touches.length === 2 && this.options.enablePinchZoom) {
      this.handlePinchGesture(e)
    }
  }
  
  handleTouchEnd(e) {
    e.preventDefault()
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    
    this.touchEnd = {
      time: Date.now(),
      points: Array.from(e.changedTouches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier
      }))
    }
    
    // Swipe detection
    if (this.touchStart && this.touchEnd) {
      this.handleSwipeGesture()
    }
  }
  
  handlePinchGesture(e) {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    
    const currentDistance = this.getDistance(touch1, touch2)
    const currentCenter = this.getCenter(touch1, touch2)
    const currentAngle = this.getAngle(touch1, touch2)
    
    if (this.lastPinchData) {
      const scale = currentDistance / this.lastPinchData.distance
      const rotation = currentAngle - this.lastPinchData.angle
      
      // Appliquer le zoom
      const newZoom = this.map.getZoom() + Math.log2(scale)
      this.map.setZoom(Math.max(10, Math.min(20, newZoom)))
      
      // Appliquer la rotation si activée
      if (this.options.enableRotation) {
        const newBearing = this.map.getBearing() + rotation
        this.map.setBearing(newBearing)
      }
    }
    
    this.lastPinchData = {
      distance: currentDistance,
      center: currentCenter,
      angle: currentAngle
    }
  }
  
  handleSwipeGesture() {
    const startPoint = this.touchStart.points[0]
    const endPoint = this.touchEnd.points[0]
    
    const deltaX = endPoint.x - startPoint.x
    const deltaY = endPoint.y - startPoint.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = this.touchEnd.time - this.touchStart.time
    
    // Détecter le swipe si la distance est suffisante et la durée courte
    if (distance > 50 && duration < 300) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
      
      if (Math.abs(angle) < 45) {
        // Swipe horizontal
        this.handleHorizontalSwipe(deltaX > 0 ? 'right' : 'left')
      } else if (Math.abs(angle) > 135) {
        // Swipe horizontal inverse
        this.handleHorizontalSwipe(deltaX > 0 ? 'right' : 'left')
      } else if (angle > 45 && angle < 135) {
        // Swipe vertical
        this.handleVerticalSwipe(deltaY > 0 ? 'down' : 'up')
      }
    }
  }
  
  handleHorizontalSwipe(direction) {
    // Navigation entre les voice notes
    this.emit('swipe', { direction, type: 'horizontal' })
  }
  
  handleVerticalSwipe(direction) {
    // Changement de vue (carte/satellite)
    if (direction === 'up') {
      this.map.setPitch(Math.min(60, this.map.getPitch() + 15))
    } else {
      this.map.setPitch(Math.max(0, this.map.getPitch() - 15))
    }
  }
  
  handleLongPress(touch) {
    const point = this.map.project([touch.clientX, touch.clientY])
    const lngLat = this.map.unproject(point)
    
    this.emit('longpress', { lngLat, point })
  }
  
  handleClick(e) {
    const now = Date.now()
    const timeDiff = now - this.lastTap
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap détecté
      this.handleDoubleTap(e)
      this.lastTap = 0
    } else {
      this.lastTap = now
    }
  }
  
  handleDoubleTap(e) {
    // Zoom rapide sur le point de double tap
    const point = this.map.project([e.clientX, e.clientY])
    const lngLat = this.map.unproject(point)
    
    this.map.flyTo({
      center: lngLat,
      zoom: Math.min(20, this.map.getZoom() + 2),
      duration: 500
    })
  }
  
  // Utilitaires
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  getCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }
  
  getAngle(touch1, touch2) {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX)
  }
  
  // Émission d'événements
  emit(event, data) {
    const customEvent = new CustomEvent(`gesture:${event}`, { detail: data })
    this.map.getContainer().dispatchEvent(customEvent)
  }
  
  // Nettoyage
  destroy() {
    const mapContainer = this.map.getContainer()
    mapContainer.removeEventListener('touchstart', this.handleTouchStart)
    mapContainer.removeEventListener('touchmove', this.handleTouchMove)
    mapContainer.removeEventListener('touchend', this.handleTouchEnd)
    mapContainer.removeEventListener('click', this.handleClick)
  }
} 
export class GestureManager {
  constructor(map, options = {}) {
    this.map = map
    this.options = {
      enablePinchZoom: true,
      enableRotation: true,
      enableDoubleTap: true,
      enableLongPress: true,
      ...options
    }
    
    this.touchStart = null
    this.touchEnd = null
    this.lastTap = 0
    this.longPressTimer = null
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    const mapContainer = this.map.getContainer()
    
    // Touch events
    mapContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    mapContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    mapContainer.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    
    // Mouse events pour desktop
    mapContainer.addEventListener('mousedown', this.handleMouseDown.bind(this))
    mapContainer.addEventListener('mousemove', this.handleMouseMove.bind(this))
    mapContainer.addEventListener('mouseup', this.handleMouseUp.bind(this))
    
    // Double tap
    mapContainer.addEventListener('click', this.handleClick.bind(this))
  }
  
  handleTouchStart(e) {
    e.preventDefault()
    
    this.touchStart = {
      time: Date.now(),
      points: Array.from(e.touches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier
      }))
    }
    
    // Long press detection
    if (this.options.enableLongPress && e.touches.length === 1) {
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(e.touches[0])
      }, 500)
    }
  }
  
  handleTouchMove(e) {
    e.preventDefault()
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    
    if (e.touches.length === 2 && this.options.enablePinchZoom) {
      this.handlePinchGesture(e)
    }
  }
  
  handleTouchEnd(e) {
    e.preventDefault()
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    
    this.touchEnd = {
      time: Date.now(),
      points: Array.from(e.changedTouches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier
      }))
    }
    
    // Swipe detection
    if (this.touchStart && this.touchEnd) {
      this.handleSwipeGesture()
    }
  }
  
  handlePinchGesture(e) {
    const touch1 = e.touches[0]
    const touch2 = e.touches[1]
    
    const currentDistance = this.getDistance(touch1, touch2)
    const currentCenter = this.getCenter(touch1, touch2)
    const currentAngle = this.getAngle(touch1, touch2)
    
    if (this.lastPinchData) {
      const scale = currentDistance / this.lastPinchData.distance
      const rotation = currentAngle - this.lastPinchData.angle
      
      // Appliquer le zoom
      const newZoom = this.map.getZoom() + Math.log2(scale)
      this.map.setZoom(Math.max(10, Math.min(20, newZoom)))
      
      // Appliquer la rotation si activée
      if (this.options.enableRotation) {
        const newBearing = this.map.getBearing() + rotation
        this.map.setBearing(newBearing)
      }
    }
    
    this.lastPinchData = {
      distance: currentDistance,
      center: currentCenter,
      angle: currentAngle
    }
  }
  
  handleSwipeGesture() {
    const startPoint = this.touchStart.points[0]
    const endPoint = this.touchEnd.points[0]
    
    const deltaX = endPoint.x - startPoint.x
    const deltaY = endPoint.y - startPoint.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = this.touchEnd.time - this.touchStart.time
    
    // Détecter le swipe si la distance est suffisante et la durée courte
    if (distance > 50 && duration < 300) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
      
      if (Math.abs(angle) < 45) {
        // Swipe horizontal
        this.handleHorizontalSwipe(deltaX > 0 ? 'right' : 'left')
      } else if (Math.abs(angle) > 135) {
        // Swipe horizontal inverse
        this.handleHorizontalSwipe(deltaX > 0 ? 'right' : 'left')
      } else if (angle > 45 && angle < 135) {
        // Swipe vertical
        this.handleVerticalSwipe(deltaY > 0 ? 'down' : 'up')
      }
    }
  }
  
  handleHorizontalSwipe(direction) {
    // Navigation entre les voice notes
    this.emit('swipe', { direction, type: 'horizontal' })
  }
  
  handleVerticalSwipe(direction) {
    // Changement de vue (carte/satellite)
    if (direction === 'up') {
      this.map.setPitch(Math.min(60, this.map.getPitch() + 15))
    } else {
      this.map.setPitch(Math.max(0, this.map.getPitch() - 15))
    }
  }
  
  handleLongPress(touch) {
    const point = this.map.project([touch.clientX, touch.clientY])
    const lngLat = this.map.unproject(point)
    
    this.emit('longpress', { lngLat, point })
  }
  
  handleClick(e) {
    const now = Date.now()
    const timeDiff = now - this.lastTap
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap détecté
      this.handleDoubleTap(e)
      this.lastTap = 0
    } else {
      this.lastTap = now
    }
  }
  
  handleDoubleTap(e) {
    // Zoom rapide sur le point de double tap
    const point = this.map.project([e.clientX, e.clientY])
    const lngLat = this.map.unproject(point)
    
    this.map.flyTo({
      center: lngLat,
      zoom: Math.min(20, this.map.getZoom() + 2),
      duration: 500
    })
  }
  
  // Utilitaires
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  getCenter(touch1, touch2) {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }
  
  getAngle(touch1, touch2) {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX)
  }
  
  // Émission d'événements
  emit(event, data) {
    const customEvent = new CustomEvent(`gesture:${event}`, { detail: data })
    this.map.getContainer().dispatchEvent(customEvent)
  }
  
  // Nettoyage
  destroy() {
    const mapContainer = this.map.getContainer()
    mapContainer.removeEventListener('touchstart', this.handleTouchStart)
    mapContainer.removeEventListener('touchmove', this.handleTouchMove)
    mapContainer.removeEventListener('touchend', this.handleTouchEnd)
    mapContainer.removeEventListener('click', this.handleClick)
  }
} 
