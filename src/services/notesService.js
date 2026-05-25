/**
 * Shared scouting notes via jsonstorage.net
 * Free, no account needed, CORS-enabled, data persists permanently.
 *
 * Setup (one time — 10 seconds):
 *  Just click "Create storage" in the app — it auto-generates an ID.
 *  Share that ID with your partner. Done.
 */

const BASE = 'https://api.jsonstorage.net/v1/json'

// Free tier API key (public, rate-limited but sufficient for personal use)
const API_KEY = 'free'

export async function createStorage() {
  const resp = await fetch(`${BASE}?apiKey=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _created: new Date().toISOString() }),
  })
  if (!resp.ok) throw new Error(`Create failed: ${resp.status} ${await resp.text()}`)
  const data = await resp.json()
  // Returns { uri: "https://api.jsonstorage.net/v1/json/xxx/yyy" }
  // Extract the ID from the uri
  const parts = data.uri?.split('/') || []
  const id = parts.slice(-2).join('/')  // "userId/blobId"
  if (!id) throw new Error('No ID returned')
  return id
}

export async function fetchNotes(storageId) {
  if (!storageId) return {}
  const resp = await fetch(`${BASE}/${storageId}?apiKey=${API_KEY}`)
  if (resp.status === 404) return {}
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`)
  return await resp.json()
}

export async function saveNotes(storageId, notes) {
  if (!storageId) throw new Error('Missing storage ID')
  const resp = await fetch(`${BASE}/${storageId}?apiKey=${API_KEY}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notes),
  })
  if (!resp.ok) throw new Error(`Save failed: ${resp.status}`)
  return true
}
