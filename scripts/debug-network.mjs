/**
 * Network debugger — run this FIRST to see what requests fire when you pick a year.
 * Usage: node scripts/debug-network.mjs
 */
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
})
const page = await context.newPage()

// Log ALL network requests
page.on('request',  req  => console.log('REQ :', req.method(), req.url()))
page.on('response', async resp => {
  const url = resp.url()
  const ct  = resp.headers()['content-type'] || ''
  if (ct.includes('json') || url.includes('score') || url.includes('player') || url.includes('stat')) {
    try {
      const body = await resp.text()
      console.log('RESP:', resp.status(), url)
      console.log('     ', body.substring(0, 300))
    } catch {}
  }
})

const url = 'https://www.25kfantasy.com/players/player-profile/daniel-negreanu/'
console.log('Loading page...')
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
console.log('\n--- PAGE LOADED ---')
console.log('Selecting 2025...')

const select = page.locator('select').first()
await select.selectOption({ index: 1 })
await page.waitForTimeout(3000)

console.log('\n--- AFTER YEAR SELECT ---')

// Also dump the full visible text inside the scoring history section
const sectionText = await page.evaluate(() => {
  // Find the scoring history div
  const headers = [...document.querySelectorAll('h2, h3')]
  for (const h of headers) {
    if (h.textContent.includes('SCORING HISTORY') || h.textContent.includes('STATS')) {
      let el = h
      let text = ''
      for (let i = 0; i < 10; i++) {
        el = el.nextElementSibling
        if (!el) break
        text += el.outerHTML + '\n'
      }
      return text
    }
  }
  // Fallback: dump all tables
  return [...document.querySelectorAll('table')].map((t,i) => `TABLE ${i}:\n` + t.outerHTML).join('\n\n')
})

console.log('\n--- SECTION HTML ---')
console.log(sectionText.substring(0, 3000))

await browser.close()
