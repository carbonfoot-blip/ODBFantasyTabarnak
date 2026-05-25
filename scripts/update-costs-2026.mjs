/**
 * ODB Fantasy 2026 — Cost Updater
 *
 * Fetches the 2026 drafted players page and updates the DB
 * with each player's 2026 salary/cost.
 *
 * Usage (run AFTER the draft tonight):
 *   node scripts/update-costs-2026.mjs
 *
 * Output: updates public/players-db.json in place
 * Then: npm run build && npm run deploy
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH  = path.join(__dirname, '..', 'public', 'players-db.json')

// Check Playwright is installed
let chromiumLauncher
try {
  const pw = await import('playwright')
  chromiumLauncher = pw.chromium
} catch {
  console.error('❌  Playwright not installed.')
  console.error('    Run: npm install playwright && npx playwright install chromium')
  process.exit(1)
}

// Load DB
let db = {}
if (fs.existsSync(OUTPUT_PATH)) {
  db = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
  console.log(`📂 Loaded DB: ${Object.keys(db).length} players`)
} else {
  console.error('❌  players-db.json not found. Run the scraper first.')
  process.exit(1)
}

console.log('\n💰  Fetching 2026 draft costs from 25KFantasy...\n')

const browser = await chromiumLauncher.launch({ headless: true })
const context  = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
})
const page = await context.newPage()

// Fetch the 2026 drafted players page
await page.goto('https://www.25kfantasy.com/players/', { waitUntil: 'networkidle', timeout: 30000 })

// Extract all player rows: name, slug, salary
const players2026 = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table tbody tr')]
  return rows.map(row => {
    const cells = [...row.querySelectorAll('td')]
    if (cells.length < 4) return null
    const link    = row.querySelector('a[href*="player-profile"]')
    if (!link) return null
    const href    = link.getAttribute('href') || ''
    const slug    = href.split('/player-profile/')[1]?.replace(/\//g, '') || ''
    const name    = link.textContent.trim()
    const salary  = parseFloat(cells.find(td => td.textContent.match(/^\d+\.\d{2}$/))?.textContent)
    return { name, slug, salary }
  }).filter(r => r && r.slug && !isNaN(r.salary))
})

await browser.close()

console.log(`Found ${players2026.length} players with 2026 costs\n`)

// Slug reverse map — real site slug → our DB slug
// (for players whose site slug differs from our code slug)
const SLUG_REVERSE_MAP = {
  "daniel-zack":     "dan-zack",
  "david-rheem":     "chino-rheem",
  "kristen-bicknell": "kristen-foxen",
  "dan-shak":        "daniel-shak",
  "mike-holtz":      "michael-holtz",
  "joseph-cada":     "joe-cada",
  "matthew-wantman": "matt-wantman",
  "dan-sepiol":      "daniel-sepiol",
  "andrew-kelsall":  "andrew-aj-kelsall",
  "joao-simao":      "joao-simao-peres",
}

let updated = 0
let notFound = []

for (const { name, slug: siteSlug, salary } of players2026) {
  // Find DB slug — try direct match first, then reverse map
  const dbSlug = db[siteSlug]
    ? siteSlug
    : SLUG_REVERSE_MAP[siteSlug] || null

  if (!dbSlug || !db[dbSlug]) {
    notFound.push({ name, siteSlug, salary })
    continue
  }

  // Set cost2026 field
  db[dbSlug].cost2026 = salary

  // Also add/update the 2026 entry in history (pending, no pts yet)
  const hist = db[dbSlug].history || []
  const y2026 = hist.find(y => y.year === 2026)
  if (y2026) {
    y2026.cost = salary
  } else {
    hist.push({ year: 2026, pts: null, cost: salary, cashes: null, pending: true })
    hist.sort((a, b) => a.year - b.year)
    db[dbSlug].history = hist
  }

  console.log(`✓  ${name.padEnd(30)} $${salary}`)
  updated++
}

// Save
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(db, null, 2))

console.log(`\n${'─'.repeat(50)}`)
console.log(`✅  Updated costs for ${updated} players`)

if (notFound.length) {
  console.log(`\n⚠️  Players not matched in DB (${notFound.length}):`)
  notFound.forEach(p => {
    console.log(`   ${p.name} (site slug: ${p.siteSlug}, cost: $${p.salary})`)
  })
  console.log('\n   These are likely new players not in our database yet.')
  console.log('   Use the DB Editor tab in the app to add them manually.')
}

console.log(`\n📄  DB saved → public/players-db.json`)
console.log(`   Next: git add public/players-db.json && git commit -m "2026 costs" && git push && npm run deploy\n`)
