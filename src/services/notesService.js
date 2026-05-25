/**
 * Shared scouting notes via JSONBlob.com
 * 100% free, no account required, data persists permanently.
 *
 * Setup (one time — takes 30 seconds):
 *  1. Open your browser and go to: https://jsonblob.com/api/jsonBlob
 *     with a POST request — OR just click "Create Blob" in the app below.
 *  2. You get back a URL like: https://jsonblob.com/api/jsonBlob/1234567890
 *     The ID is the number at the end (e.g. 1234567890)
 *  3. Share that ID with your partner — no API key needed!
 *
 * Both you and your partner use the SAME Blob ID. That's it.
 */

const BASE = 'https://jsonblob.com/api/jsonBlob'

export async function createBlob() {
  const resp = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ _created: new Date().toISOString() }),
  })
  if (!resp.ok) throw new Error(`Create failed: ${resp.status}`)
  // The blob ID is in the Location header or the URL
  const location = resp.headers.get('Location') || ''
  const id = location.split('/').pop()
  if (!id) throw new Error('Could not extract blob ID from response')
  return id
}

export async function fetchNotes(blobId) {
  if (!blobId) return {}
  const resp = await fetch(`${BASE}/${blobId}`, {
    headers: { 'Accept': 'application/json' }
  })
  if (resp.status === 404) return {}
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`)
  const data = await resp.json()
  return data || {}
}

export async function saveNotes(blobId, notes) {
  if (!blobId) throw new Error('Missing Blob ID')
  const resp = await fetch(`${BASE}/${blobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(notes),
  })
  if (!resp.ok) throw new Error(`Save failed: ${resp.status}`)
  return true
}
