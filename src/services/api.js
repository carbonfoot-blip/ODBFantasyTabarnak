const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

/**
 * Fetches year-by-year stats for a player from 25KFantasy via Anthropic web search.
 * Returns parsed history, gameType, and buyIn arrays.
 */
export async function fetchPlayerHistory(slug, apiKey) {
  const url = `https://www.25kfantasy.com/players/player-profile/${slug}/`

  const prompt = `Visit this URL and extract ALL data from the player profile: ${url}

Extract:
1. All years in the "25KFANTASY SCORING HISTORY" dropdown, and for EACH year, find: year number, salary/cost, total score/points, cashes, pts/$ ratio.
2. The "25KFANTASY SCORING BY GAME TYPE" table: each game type name, total score, total cashes.
3. The "25KFANTASY SCORING BY BUY IN" table: each level name, total score, total cashes.
4. All-time stats: overall rank, total score, times drafted, total cashes, average salary.

Return ONLY valid JSON, no markdown, no explanation, exactly this shape:
{
  "allTimeRank": number,
  "allTimeScore": number,
  "timesDrafted": number,
  "totalCashes": number,
  "avgSalary": number,
  "history": [
    {"year": 2025, "cost": 108, "pts": 269, "cashes": 13},
    {"year": 2024, "cost": 132, "pts": 180, "cashes": 12}
  ],
  "gameType": [
    {"type": "Hold Em", "pts": 867, "cashes": 65}
  ],
  "buyIn": [
    {"level": "High Stakes ($10,000 - $24,999)", "pts": 1113, "cashes": 39}
  ]
}
Sort history newest-first. Only include years that have actual data.`

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  })

  const resp = await fetch(ANTHROPIC_API, { method: 'POST', headers, body })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${resp.status}`)
  }

  const data = await resp.json()
  const textContent = data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  // Extract JSON from response (may be wrapped in backticks)
  const jsonMatch = textContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No valid JSON returned from API')

  const parsed = JSON.parse(jsonMatch[0])

  // Sort history oldest-first for display
  if (parsed.history) {
    parsed.history.sort((a, b) => a.year - b.year)
  }

  return parsed
}

/**
 * Computes pts/$ ratio safely
 */
export function ptsPerDollar(pts, cost) {
  if (!pts || !cost || cost === 0) return null
  return pts / cost
}

/**
 * Computes 5-year rolling average points from history array.
 * Excludes pending years.
 */
export function rollingAvg(history, field = 'pts', years = 5) {
  if (!history || !history.length) return null
  const real = history.filter(y => !y.pending && y[field] != null)
  const recent = real.slice(-years)
  if (!recent.length) return null
  return recent.reduce((a, b) => a + (b[field] || 0), 0) / recent.length
}
