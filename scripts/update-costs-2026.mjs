/**
 * ODB Fantasy 2026 — Cost Updater
 *
 * Fetches 2026 draft costs from 25KFantasy and updates the DB.
 *
 * Usage:
 *   node scripts/update-costs-2026.mjs
 *
 * Then: git add public/players-db.json && git commit -m "2026 costs" && git push && npm run deploy
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname   = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH  = path.join(__dirname, '..', 'public', 'players-db.json')

let chromiumLauncher
try {
  const pw = await import('playwright')
  chromiumLauncher = pw.chromium
} catch {
  console.error('❌  Playwright not installed. Run: npm install playwright && npx playwright install chromium')
  process.exit(1)
}

let db = {}
if (fs.existsSync(OUTPUT_PATH)) {
  db = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
  console.log(`📂 Loaded DB: ${Object.keys(db).length} players`)
}

console.log('\n💰  Fetching 2026 draft costs...\n')

const browser = await chromiumLauncher.launch({ headless: false }) // visible so you can see what's happening
const context  = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
})
const page = await context.newPage()

// Try both possible URLs for 2026 drafted players
const urls = [
  'https://www.25kfantasy.com/players/2026',
  'https://www.25kfantasy.com/players/',
]

let players2026 = []

for (const url of urls) {
  console.log(`Trying: ${url}`)
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(2000)

    // Debug: print page title and first 500 chars of visible text
    const title = await page.title()
    console.log(`  Title: ${title}`)

    // Try to find all player links with salary data
    const found = await page.evaluate(() => {
      const results = []
      // Strategy 1: table rows with player links
      const rows = [...document.querySelectorAll('table tr')]
      for (const row of rows) {
        const link = row.querySelector('a[href*="player-profile"]')
        if (!link) continue
        const href = link.getAttribute('href') || ''
        const slug = href.split('/player-profile/')[1]?.replace(/\//g, '') || ''
        const cells = [...row.querySelectorAll('td')].map(td => td.textContent.trim())
        // Find a cell that looks like a salary (number with decimals, e.g. "108.00" or "$108")
        const salaryCell = cells.find(c => /^\$?\d+(\.\d{1,2})?$/.test(c.replace(/,/g,'')))
        const salary = salaryCell ? parseFloat(salaryCell.replace(/[$,]/g, '')) : null
        if (slug && salary) results.push({ slug, name: link.textContent.trim(), salary })
      }

      // Strategy 2: any element with player link + nearby salary
      if (results.length === 0) {
        const links = [...document.querySelectorAll('a[href*="player-profile"]')]
        for (const link of links) {
          const href = link.getAttribute('href') || ''
          const slug = href.split('/player-profile/')[1]?.replace(/\//g, '') || ''
          // Look for salary in parent row or sibling elements
          const row = link.closest('tr')
          if (!row) continue
          const text = row.textContent
          const salaryMatch = text.match(/\$?(\d+\.\d{2})/)
          if (slug && salaryMatch) {
            results.push({ slug, name: link.textContent.trim(), salary: parseFloat(salaryMatch[1]) })
          }
        }
      }
      return results
    })

    console.log(`  Found ${found.length} players with salary data`)

    if (found.length > 0) {
      players2026 = found
      // Print first 5 for debug
      console.log('  Sample:')
      found.slice(0, 5).forEach(p => console.log(`    ${p.name} (${p.slug}) = $${p.salary}`))
      break
    }

    // If nothing found, dump visible text for debugging
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000))
    console.log('  Page text preview:', bodyText)

  } catch (e) {
    console.log(`  Error: ${e.message}`)
  }
}

await browser.close()

if (players2026.length === 0) {
  console.error('\n❌  No players found. The page may require login or have a different structure.')
  console.error('   Try visiting https://www.25kfantasy.com/players/ manually and')
  console.error('   use the Costs tab in the app to enter prices manually.')
  process.exit(1)
}

// Slug reverse map (site slug → our DB slug)
const SLUG_REVERSE_MAP = {
  "daniel-zack":      "dan-zack",
  "david-rheem":      "chino-rheem",
  "kristen-bicknell": "kristen-foxen",
  "dan-shak":         "daniel-shak",
  "mike-holtz":       "michael-holtz",
  "joseph-cada":      "joe-cada",
  "matthew-wantman":  "matt-wantman",
  "dan-sepiol":       "daniel-sepiol",
  "andrew-kelsall":   "andrew-aj-kelsall",
  "joao-simao":       "joao-simao-peres",
}

console.log(`\nUpdating DB with ${players2026.length} players...\n`)

let updated = 0
const notFound = []

for (const { name, slug: siteSlug, salary } of players2026) {
  const dbSlug = db[siteSlug] ? siteSlug : (SLUG_REVERSE_MAP[siteSlug] || null)

  if (!dbSlug || !db[dbSlug]) {
    notFound.push({ name, siteSlug, salary })
    continue
  }

  db[dbSlug].cost2026 = salary

  const hist = db[dbSlug].history || []
  const y2026 = hist.find(y => y.year === 2026)
  if (y2026) {
    y2026.cost = salary
    delete y2026.pending
  } else {
    hist.push({ year: 2026, pts: null, cost: salary, cashes: null, pending: true })
    hist.sort((a, b) => a.year - b.year)
    db[dbSlug].history = hist
  }

  console.log(`✓  ${name.padEnd(30)} $${salary}`)
  updated++
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(db, null, 2))

console.log(`\n${'─'.repeat(50)}`)
console.log(`✅  Updated ${updated} players`)

if (notFound.length) {
  console.log(`\n⚠️  Not found in DB (${notFound.length}):`)
  notFound.forEach(p => console.log(`   ${p.name} (${p.siteSlug}) = $${p.salary}`))
  console.log('\n   Add these manually via the Costs tab in the app.')
}

console.log(`\n📄  Next: git add public/players-db.json && git commit -m "2026 costs" && git push && npm run deploy\n`)
