// Debug script — dumps what the page looks like after selecting a year
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
})
const page = await context.newPage()

const slug = 'daniel-negreanu'
const url = `https://www.25kfantasy.com/players/player-profile/${slug}/`
console.log('Loading', url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

// List all selects and their options
const selects = await page.locator('select').all()
console.log(`\nFound ${selects.length} select(s)`)

for (let si = 0; si < selects.length; si++) {
  const opts = await selects[si].locator('option').all()
  console.log(`\nSelect #${si} — ${opts.length} options:`)
  for (const opt of opts) {
    const val = await opt.getAttribute('value')
    const txt = await opt.textContent()
    console.log(`  value="${val}" text="${txt?.trim()}"`)
  }
}

// Select the first real year option (index 1)
const select = page.locator('select').first()
const opts = await select.locator('option').all()
if (opts.length > 1) {
  const val = await opts[1].getAttribute('value')
  const txt = await opts[1].textContent()
  console.log(`\nSelecting option 1: value="${val}" text="${txt?.trim()}"`)
  await select.selectOption({ index: 1 })
  await page.waitForTimeout(3000)

  // Dump all table HTML
  const tables = await page.locator('table').all()
  console.log(`\nFound ${tables.length} table(s) after selection:`)
  for (let ti = 0; ti < tables.length; ti++) {
    const html = await tables[ti].innerHTML()
    console.log(`\n--- TABLE ${ti} ---`)
    console.log(html.substring(0, 1500))
  }

  // Also dump any div that appeared with scoring info
  const scored = await page.evaluate(() => {
    const divs = [...document.querySelectorAll('div, section')]
    return divs
      .filter(d => d.textContent.includes('Score') || d.textContent.includes('Salary') || d.textContent.includes('Cashes'))
      .map(d => ({ tag: d.tagName, class: d.className, text: d.textContent.trim().substring(0, 300) }))
      .slice(0, 5)
  })
  console.log('\nDivs with Score/Salary/Cashes:')
  console.dir(scored, { depth: null })
}

await browser.close()
