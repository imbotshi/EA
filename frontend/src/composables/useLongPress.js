import { ref, onMounted, onUnmounted } from 'vue'

export function useLongPress(callback, options = {}) {
  const {
    duration = 1500, // 1.5 seconds as per user story
    preventDefault = true
  } = options

  const isPressed = ref(false)
  const pressTimer = ref(null)
  const element = ref(null)

  const startPress = (event) => {
    if (preventDefault) {
      event.preventDefault()
    }
    
    isPressed.value = true
    
    // Clear any existing timer
    if (pressTimer.value) {
      clearTimeout(pressTimer.value)
    }
    
    // Start the long press timer
    pressTimer.value = setTimeout(() => {
      if (isPressed.value) {
        callback(event)
        isPressed.value = false
      }
    }, duration)
  }

  const endPress = (event) => {
    isPressed.value = false
    
    if (pressTimer.value) {
      clearTimeout(pressTimer.value)
      pressTimer.value = null
    }
  }

  const cancelPress = () => {
    isPressed.value = false
    
    if (pressTimer.value) {
      clearTimeout(pressTimer.value)
      pressTimer.value = null
    }
  }

  const bindEvents = (el) => {
    if (!el) return
    
    element.value = el
    
    // Mouse events
    el.addEventListener('mousedown', startPress)
    el.addEventListener('mouseup', endPress)
    el.addEventListener('mouseleave', cancelPress)
    
    // Touch events for mobile
    el.addEventListener('touchstart', startPress, { passive: false })
    el.addEventListener('touchend', endPress)
    el.addEventListener('touchcancel', cancelPress)
    el.addEventListener('touchmove', cancelPress)
    
    // Context menu prevention during long press
    el.addEventListener('contextmenu', (e) => {
      if (isPressed.value) {
        e.preventDefault()
      }
    })
  }

  const unbindEvents = (el) => {
    if (!el) return
    
    // Mouse events
    el.removeEventListener('mousedown', startPress)
    el.removeEventListener('mouseup', endPress)
    el.removeEventListener('mouseleave', cancelPress)
    
    // Touch events
    el.removeEventListener('touchstart', startPress)
    el.removeEventListener('touchend', endPress)
    el.removeEventListener('touchcancel', cancelPress)
    el.removeEventListener('touchmove', cancelPress)
    el.removeEventListener('contextmenu', cancelPress)
  }

  onUnmounted(() => {
    if (element.value) {
      unbindEvents(element.value)
    }
    cancelPress()
  })

  return {
    isPressed,
    bindEvents,
    unbindEvents,
    cancelPress
  }
}

// Vue directive for easy usage
export const vLongPress = {
  mounted(el, binding) {
    const callback = binding.value
    const options = binding.modifiers || {}
    
    if (typeof callback !== 'function') {
      console.warn('v-long-press directive expects a function as value')
      return
    }
    
    const { bindEvents, unbindEvents } = useLongPress(callback, {
      duration: options.duration || 1500,
      preventDefault: options.prevent !== false
    })
    
    bindEvents(el)
    
    // Store unbind function for cleanup
    el._longPressUnbind = () => unbindEvents(el)
  },
  
  unmounted(el) {
    if (el._longPressUnbind) {
      el._longPressUnbind()
    }
  }
}
