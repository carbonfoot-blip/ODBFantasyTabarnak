/**
 * Shared scouting notes via GitHub Gist
 * 
 * You already have a GitHub account — no new signup needed!
 * 
 * Setup (one time):
 *  1. Go to: https://github.com/settings/tokens/new
 *  2. Note name: "ODB Fantasy Notes"
 *  3. Expiration: "No expiration"
 *  4. Scopes: check only "gist"
 *  5. Click "Generate token" → copy it
 *  6. Paste the token in the app — it auto-creates the Gist for you
 * 
 * Share the Gist ID (shown in the app) with your partner.
 * Your partner needs their OWN token (same steps) to save notes,
 * OR you can share your token with them directly (simpler for draft night).
 */

const GITHUB_API = 'https://api.github.com'

export async function createGist(token) {
  const resp = await fetch(`${GITHUB_API}/gists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      description: 'ODB Fantasy 2026 — Scouting Notes',
      public: false,
      files: {
        'odb-notes.json': { content: JSON.stringify({}) }
      }
    })
  })
  if (!resp.ok) throw new Error(`GitHub error: ${resp.status} — check your token has "gist" scope`)
  const data = await resp.json()
  return data.id
}

export async function fetchNotes(gistId, token) {
  if (!gistId) return {}
  const headers = token
    ? { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    : { 'X-GitHub-Api-Version': '2022-11-28' }
  const resp = await fetch(`${GITHUB_API}/gists/${gistId}`, { headers })
  if (resp.status === 404) return {}
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`)
  const data = await resp.json()
  const content = data.files?.['odb-notes.json']?.content
  if (!content) return {}
  return JSON.parse(content)
}

export async function saveNotes(gistId, token, notes) {
  if (!gistId) throw new Error('Missing Gist ID')
  if (!token)  throw new Error('Missing GitHub token')
  const resp = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      files: {
        'odb-notes.json': { content: JSON.stringify(notes) }
      }
    })
  })
  if (!resp.ok) throw new Error(`Save failed: ${resp.status}`)
  return true
}
