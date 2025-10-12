// podcastApi.js - API helpers for podcasts
// Mirrors radioApi.js pattern to keep architecture consistent

import { getApiBase, getOrCreateMachineId } from './radioApi'

/**
 * Fetch podcasts from /api/podcasts
 * @returns {Promise<Array>} podcasts
 */
export async function fetchPodcasts() {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${API_BASE}/api/podcasts`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn(`[podcastApi] podcasts offline or unreachable (${API_BASE || 'same-origin'}/api/podcasts):`, err?.message || err)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch comments for a specific podcast
 * @param {string} podcastId - The ID of the podcast/episode key used client-side
 * @returns {Promise<Array>} comments for the podcast
 */
export async function fetchPodcastComments(podcastId) {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${API_BASE}/api/podcast_comments`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const all = await res.json()
    return all[podcastId] || []
  } catch (err) {
    console.warn(`[podcastApi] comments offline or unreachable (${API_BASE || 'same-origin'}/api/podcast_comments):`, err?.message || err)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Upload a voice comment for a specific podcast
 * @param {Object} params
 * @param {string} params.podcastId
 * @param {Blob} params.fileBlob
 * @param {number} params.duration
 * @param {string} [params.userName]
 * @returns {Promise<Object|null>} saved comment entry or null on failure
 */
export async function uploadPodcastComment({ podcastId, fileBlob, duration, userName }) {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const form = new FormData()
    const filename = `comment-${Date.now()}.${(fileBlob?.type||'').includes('wav') ? 'wav' : (fileBlob?.type||'').includes('ogg') ? 'ogg' : (fileBlob?.type||'').includes('webm') ? 'webm' : 'dat'}`
    form.append('file', fileBlob, filename)
    form.append('podcastId', podcastId)
    if (userName) form.append('userName', userName)
    if (Number.isFinite(duration)) form.append('duration', String(duration))

    const res = await fetch(`${API_BASE}/api/podcast_comments`, {
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
    console.error('[podcastApi] Failed to upload podcast comment:', err?.message || err)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch normalized latest episodes for each feed from /api/podcasts/episodes
 * @returns {Promise<Array>} episodes per feed [{ feedId, feedTitle, rss, episode, error? }]
 */
export async function fetchEpisodes() {
  const API_BASE = getApiBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${API_BASE}/api/podcasts/episodes`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn(`[podcastApi] episodes offline or unreachable (${API_BASE || 'same-origin'}/api/podcasts/episodes):`, err?.message || err)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}
