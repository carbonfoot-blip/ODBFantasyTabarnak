/**
 * Shared scouting notes via JSONBin.io
 * Free tier: unlimited reads/writes, data persists permanently.
 *
 * Setup (one time):
 *  1. Go to https://jsonbin.io and create a free account
 *  2. Go to API Keys → Create Access Key  (copy it)
 *  3. Click "New Bin" → paste {} → Save (copy the Bin ID from the URL)
 *  4. Paste both into the app's Settings tab when prompted
 *
 * Both you and your partner use the SAME Bin ID + API Key.
 * Notes are keyed by player slug.
 */

const BASE = 'https://api.jsonbin.io/v3/b'

export async function fetchNotes(binId, apiKey) {
  if (!binId || !apiKey) return {}
  const resp = await fetch(`${BASE}/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  })
  if (!resp.ok) throw new Error(`JSONBin fetch failed: ${resp.status}`)
  const data = await resp.json()
  return data.record || {}
}

export async function saveNotes(binId, apiKey, notes) {
  if (!binId || !apiKey) throw new Error('Missing JSONBin credentials')
  const resp = await fetch(`${BASE}/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
    },
    body: JSON.stringify(notes),
  })
  if (!resp.ok) throw new Error(`JSONBin save failed: ${resp.status}`)
  return await resp.json()
}
