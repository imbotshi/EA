// radioApi.js - API helpers for stations and proxy
// Centralizes API base detection and endpoints for the radio subsystem

/**
 * Return API base. Always same-origin so Vercel/Render rewrites/proxies work.
 * In dev, Vite proxy handles /api; in production, Vercel rewrites to Render.
 */
export function getApiBase() {
  if (typeof window === 'undefined') return ''
  // In Vite dev, always use same-origin so the proxy in vite.config.js handles /api and /proxy
  try {
    // import.meta.env is replaced by Vite; optional chaining guards SSR/static analysis
    if (import.meta?.env?.DEV) return ''
  } catch {}
  // In production, also use same-origin; Vercel will rewrite to Render backend
  return ''
}

/**
 * Fetch a snapshot of listeners counts for all stations (polling).
 * @returns {Promise<{ ts: number, listeners: Record<string, number> }|null>}
 */
export async function fetchListenersSnapshot() {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${API_BASE}/api/stations/listeners`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('[radioApi] listeners snapshot failed:', err?.message || err)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Subscribe to real-time listeners updates via SSE.
 * @param {(payload: { ts:number, listeners: Record<string, number>, type?: string })=>void} onUpdate
 * @returns {{ close: ()=>void }} unsubscribe handle
 */
export function subscribeListeners(onUpdate) {
  const API_BASE = getApiBase()
  const url = `${API_BASE}/api/stations/listeners/stream`
  const es = new EventSource(url)
  const handler = (evt) => {
    try {
      const data = JSON.parse(evt.data || '{}')
      if (data && data.listeners) onUpdate(data)
    } catch {}
  }
  es.addEventListener('listeners', handler)
  es.onerror = () => {
    // Let browser handle auto-reconnect; optional: log quietly
    // console.debug('[radioApi] SSE error (will auto-retry)')
  }
  return {
    close() {
      try { es.removeEventListener('listeners', handler) } catch {}
      try { es.close() } catch {}
    }
  }
}

/**
 * Get or create a stable machine ID stored in localStorage.
 * @returns {string}
 */
export function getOrCreateMachineId() {
  try {
    const KEY = 'eclairia_machine_id'
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = `ecm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
    return id
  } catch {
    // Fallback to ephemeral ID if storage disabled
    return `ecm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * Build a proxied URL for a stream.
 * @param {string} url - Original stream URL
 * @returns {string}
 */
export function proxyUrl(url) {
  const API_BASE = getApiBase()
  return `${API_BASE}/proxy?url=${encodeURIComponent(url)}`
}

/**
 * Fetch stations from /api/stations
 * @returns {Promise<Array>} stations
 */
export async function fetchStations() {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${API_BASE}/api/stations`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn(`[radioApi] stations offline or unreachable (${API_BASE || 'same-origin'}/api/stations):`, err?.message || err)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch comments for a specific radio station
 * @param {string} stationId - The ID of the station
 * @returns {Promise<Array>} comments for the station
 */
export async function fetchRadioComments(stationId) {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${API_BASE}/api/radio_comments`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const allComments = await res.json()
    return allComments[stationId] || []
  } catch (err) {
    console.warn(`[radioApi] comments offline or unreachable (${API_BASE || 'same-origin'}/api/radio_comments):`, err?.message || err)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Upload a voice comment for a specific radio station
 * @param {Object} params
 * @param {string} params.stationId
 * @param {Blob} params.fileBlob
 * @param {number} params.duration
 * @param {string} [params.userName]
 * @returns {Promise<Object|null>} saved comment entry or null on failure
 */
export async function uploadRadioComment({ stationId, fileBlob, duration, userName }) {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const form = new FormData()
    const filename = `comment-${Date.now()}.${(fileBlob?.type||'').includes('wav') ? 'wav' : (fileBlob?.type||'').includes('ogg') ? 'ogg' : (fileBlob?.type||'').includes('webm') ? 'webm' : 'dat'}`
    // Append the original Blob directly to avoid File constructor compatibility issues
    form.append('file', fileBlob, filename)
    form.append('stationId', stationId)
    // userName is determined server-side from header/IP; optional custom name can still be sent
    if (userName) form.append('userName', userName)
    if (Number.isFinite(duration)) form.append('duration', String(duration))

    const res = await fetch(`${API_BASE}/api/radio_comments`, {
      method: 'POST',
      body: form,
      headers: {
        'X-Client-Machine-Id': getOrCreateMachineId()
      },
      signal: controller.signal
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data?.comment || null
  } catch (err) {
    console.error('[radioApi] Failed to upload radio comment:', err?.message || err)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
