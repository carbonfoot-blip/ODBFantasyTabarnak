/**
 * Fix a single player in the DB — useful for players that failed scraping.
 *
 * Usage:
 *   node scripts/fix-player.mjs <slug> [correct-slug]
 *
 * Examples:
 *   node scripts/fix-player.mjs chino-rheem
 *   node scripts/fix-player.mjs chino-rheem chino-rheem-2
 *
 * If the player's profile URL is different from the slug in players.js,
 * provide the correct slug as the second argument.
 *
 * Find the correct slug by going to 25kfantasy.com/players/player-database
 * and clicking the player's name — the URL will show the correct slug.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH  = path.join(__dirname, '..', 'public', 'players-db.json')

const targetSlug   = process.argv[2]
const correctSlug  = process.argv[3] || process.argv[2]

if (!targetSlug) {
  console.error('Usage: node scripts/fix-player.mjs <slug> [correct-slug]')
  process.exit(1)
}

// Load player list to find the player's name
const { PLAYERS } = await import('../src/data/players.js').catch(() => {
  // Fallback: read from scrape.mjs player list
  return { PLAYERS: [] }
})

// Load DB
let db = {}
if (fs.existsSync(OUTPUT_PATH)) {
  db = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
}

// Find player info
const existing = db[targetSlug]
const name = existing?.name || targetSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
const rank = existing?.rank || 999
const allTimeScore = existing?.allTimeScore || 0

console.log(`\n🔧 Fixing: ${name}`)
console.log(`   Target slug  : ${targetSlug}`)
console.log(`   Profile slug : ${correctSlug}`)
console.log(`   URL: https://www.25kfantasy.com/players/player-profile/${correctSlug}/\n`)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function parseNum(s) {
  if (s == null) return null
  const n = parseFloat(String(s).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function parsePage(html, name) {
  const allTimeMatch = html.match(
    /(\d+)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*\((\d{4})\)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*\((\d{4})\)/
  )
  let allTimeRank=null,allTimeScore=null,timesDrafted=null,totalCashes=null
  let avgSalary=null,highestSalary=null,highestSalaryYear=null,lowestSalary=null,lowestSalaryYear=null
  if (allTimeMatch) {
    allTimeRank=parseNum(allTimeMatch[1]); allTimeScore=parseNum(allTimeMatch[2])
    timesDrafted=parseNum(allTimeMatch[3]); totalCashes=parseNum(allTimeMatch[4])
    avgSalary=parseNum(allTimeMatch[5]); highestSalary=parseNum(allTimeMatch[6])
    highestSalaryYear=parseNum(allTimeMatch[7]); lowestSalary=parseNum(allTimeMatch[8])
    lowestSalaryYear=parseNum(allTimeMatch[9])
  }
  const yearMatches = [...html.matchAll(/(\d{4})\s+Results/g)]
  const years = [...new Set(yearMatches.map(m => parseInt(m[1])))].sort((a,b)=>a-b)
  const gameType = []
  const gtSection = html.match(/SCORING BY GAME TYPE[\s\S]*?(?=SCORING BY BUY|<\/section|<\/div>)/i)?.[0] || ''
  const gtRowRe = /<tr[^>]*>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi
  let m
  while ((m = gtRowRe.exec(gtSection)) !== null) {
    const type = m[1].trim()
    if (type && !type.toLowerCase().includes('game type')) gameType.push({ type, pts: parseNum(m[2]), cashes: parseNum(m[3]) })
  }
  const buyIn = []
  const biSection = html.match(/SCORING BY BUY IN[\s\S]*?(?=<\/section|<\/div>|$)/i)?.[0] || ''
  const biRowRe = /<tr[^>]*>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/gi
  while ((m = biRowRe.exec(biSection)) !== null) {
    const level = m[1].trim()
    if (level && !level.toLowerCase().includes('buy')) buyIn.push({ level, pts: parseNum(m[2]), cashes: parseNum(m[3]) })
  }
  return { allTimeRank, allTimeScore, timesDrafted, totalCashes, avgSalary, highestSalary, highestSalaryYear, lowestSalary, lowestSalaryYear, years, gameType, buyIn }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
})
const page = await context.newPage()

try {
  const profileUrl = `https://www.25kfantasy.com/players/player-profile/${correctSlug}/`
  await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 })

  const finalUrl = page.url()
  console.log('Final URL:', finalUrl)

  const pageData = await page.evaluate(() => {
    const playerIdEl = document.querySelector('#player-id')
    const selectEl   = document.querySelector('#player-history-by-year')
    const csrfToken  = (typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : null)
    const playerId   = playerIdEl?.value || null
    const years      = selectEl
      ? [...selectEl.querySelectorAll('option')]
          .map(o => ({ value: o.value, text: o.textContent.trim() }))
          .filter(o => o.value && o.value !== '0')
      : []
    return { csrfToken, playerId, years }
  })

  console.log('player_id:', pageData.playerId)
  console.log('CSRF token:', pageData.csrfToken ? '✓ found' : '✗ missing')
  console.log('Years:', pageData.years.map(y => y.text).join(', '))

  if (!pageData.playerId) {
    console.error('\n❌ No player_id found. The slug is probably wrong.')
    console.error('   Visit the 25KFantasy player database and click on this player.')
    console.error('   Copy the slug from the URL (the part after /player-profile/)')
    console.error('   Then run: node scripts/fix-player.mjs', targetSlug, '<correct-slug>')
    process.exit(1)
  }

  const html = await page.content()
  const base = parsePage(html, name)

  const history = []
  for (const { value: yearValue, text } of pageData.years) {
    const yearMatch = text.match(/(\d{4})/)
    if (!yearMatch) continue
    const year = parseInt(yearMatch[1])
    process.stdout.write(`  Year ${year}... `)

    try {
      const resp = await page.evaluate(async ({ yearValue, playerId, csrfToken }) => {
        const r = await fetch('/process/player-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ year: yearValue, player_id: playerId }),
        })
        return { status: r.status, body: await r.text() }
      }, { yearValue, playerId: pageData.playerId, csrfToken: pageData.csrfToken })

      const json = JSON.parse(resp.body)
      const tableHtml = json.data?.results || ''
      const rowMatch = tableHtml.match(/<tr[^>]*>[\s\S]*?<td[^>]*>\s*\d+\s*<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>/)
      if (rowMatch) {
        const entry = { year, pts: parseNum(rowMatch[1]), cost: parseNum(rowMatch[2]), cashes: parseNum(rowMatch[3]) }
        history.push(entry)
        console.log(`✓ pts=${entry.pts} cost=${entry.cost} cashes=${entry.cashes}`)
      } else {
        // Try numeric extraction fallback
        const nums = [...tableHtml.matchAll(/<td[^>]*>\s*([\d.]+)\s*<\/td>/g)].map(m => parseNum(m[1]))
        if (nums.length >= 5) {
          const entry = { year, pts: nums[2], cost: nums[3], cashes: nums[4] }
          history.push(entry)
          console.log(`✓ (fallback) pts=${entry.pts} cost=${entry.cost} cashes=${entry.cashes}`)
        } else {
          history.push({ year, pts: null, cost: null, cashes: null })
          console.log('✗ no data')
        }
      }
    } catch (e) {
      history.push({ year, pts: null, cost: null, cashes: null })
      console.log(`✗ error: ${e.message}`)
    }
    await sleep(300)
  }

  history.sort((a, b) => a.year - b.year)

  // Save to DB under the original targetSlug
  db[targetSlug] = {
    name, slug: targetSlug, rank, allTimeScore,
    ...base, history,
    scrapedAt: new Date().toISOString(),
    fixedSlug: correctSlug !== targetSlug ? correctSlug : undefined,
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(db, null, 2))

  console.log(`\n✅ Saved ${name} to DB (${history.filter(y=>y.pts).length} years with data)`)
  console.log('   Run: npm run build && npm run deploy')

} catch (e) {
  console.error('\n❌ Error:', e.message)
} finally {
  await browser.close()
}
