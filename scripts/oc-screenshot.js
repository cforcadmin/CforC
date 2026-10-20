/**
 * ΣΤΙΓΜΙΟΤΥΠΟ ΤΟΥ OC — ΧΩΡΙΣ ΝΑ ΧΡΕΙΑΖΕΤΑΙ ΝΑ ΑΝΟΙΞΕΙ ΚΑΝΕΙΣ ΤΗ ΣΕΛΙΔΑ.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: το /oc θέλει σύνδεση, οπότε κάθε οπτική αλλαγή εκεί έμενε
 * αόρατη και διορθωνόταν μόνο αφού έστελνε ο Γιώργος στιγμιότυπο. Δύο σφάλματα
 * που έπιασε αμέσως μόλις στήθηκε (20/10/2026): πλακίδια με ανοιχτά γράμματα σε
 * ανοιχτό φόντο στο σκοτεινό θέμα, και ημερομηνία μια μέρα πίσω.
 *
 * ΜΟΝΟ ΤΟΠΙΚΑ: φτιάχνει διακριτικό συνεδρίας με το JWT_SECRET του .env.local
 * για μέλος της τρέχουσας Ομάδας Συντονισμού και το βάζει ως cookie στο
 * localhost. Δεν τυπώνει ποτέ το διακριτικό και δεν αγγίζει την παραγωγή.
 *
 * ΧΡΗΣΗ (ο dev server πρέπει να τρέχει):
 *   NODE_PATH="$PWD/node_modules" node --env-file=.env.local \
 *     scripts/oc-screenshot.js <έξοδος.png> [#ενότητα] [πλάτος] [ύψος]
 *
 * Σημαίες περιβάλλοντος: DARK=1 σκοτεινό θέμα · OPEN_NEW=1 ανοίγει τον
 * συνθέτη άρθρου · FILL=1 συμπληρώνει δοκιμαστικά πεδία και ετικέτες.
 */
const { chromium } = require('playwright-core')
const jwt = require('jsonwebtoken')

const [, , out, hash, width = '1680', height = '1700'] = process.argv

;(async () => {
  const U = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
  const T = process.env.STRAPI_API_TOKEN
  const url = U + '/api/coordination-teams?filters[IsCurrent][$eq]=true&populate=*'
  const j = await (await fetch(url, { headers: { Authorization: 'Bearer ' + T } })).json()
  const row = (j && j.data || [])[0]
  if (!row) { console.error('ΔΕΝ ΒΡΕΘΗΚΕ τρέχουσα ομάδα συντονισμού'); process.exit(2) }

  const order = ['Comms', 'Media', 'Admin', 'IT']
  let who = null, seat = null
  for (const f of order) {
    const m = Array.isArray(row[f]) ? row[f][0] : row[f]
    if (m && m.documentId) { who = m; seat = f; break }
  }
  if (!who) { console.error('καμία έδρα με μέλος. Πεδία:', Object.keys(row).join(', ')); process.exit(2) }
  console.log('έδρα:', seat, '| μέλος:', who.Name || '(χωρίς όνομα)')

  const token = jwt.sign(
    { memberId: who.documentId, email: who.Email || 'board@cultureforchange.net', type: 'session' },
    process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1d' })

  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({ viewport: { width: +width, height: +height } })
  await ctx.addCookies([
    { name: 'session', value: token, domain: 'localhost', path: '/' },
    { name: 'oc-last-seat', value: seat.toLowerCase(), domain: 'localhost', path: '/' },
  ])
  if (process.env.DARK) {
    await ctx.addInitScript(() => {
      try { localStorage.setItem('theme', 'dark') } catch {}
      document.documentElement.classList.add('dark')
    })
  }
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 140)) })
  await page.goto('http://localhost:3000/oc' + (hash || ''), { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(3000)
  console.log('url:', page.url())
  const tab = page.locator('button', { hasText: /^Νέα$/ }).first()
  console.log('καρτέλες:', await page.locator('button', { hasText: /^(Νέα|Έργα|Καταχωρήσεις)$/ }).count())
  await tab.scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)

  if (process.env.OPEN_NEW) {
    /* ΑΚΡΙΒΗΣ τίτλος: το «+ Νέο» μόνο του πιάνει και το «+ Νέο γεγονός» του
       ημερολογίου, που είναι ψηλότερα στη σελίδα. */
    const btn = page.getByRole('button', { name: '+ Νέο άρθρο', exact: true })
    await btn.scrollIntoViewIfNeeded()
    await btn.click()
    await page.waitForTimeout(2500)
    await page.getByText('Στοιχεία κάρτας').first().scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, -120)
    await page.waitForTimeout(600)

    if (process.env.FILL) {
      const panel = page.locator('section', { hasText: 'Στοιχεία κάρτας' }).first()
      await panel.locator('input[type="text"]').first().fill('Το CforC στο Bridge Makers Athens')
      await panel.locator('input[type="date"]').first().fill('2026-11-14')
      // Κατηγορία
      await panel.locator('input[type="text"]').nth(2).fill('Δράσεις')
      // ΕΤΙΚΕΤΕΣ: κόμμα κλείνει τη μία, Enter την άλλη
      const panelPlaceholders = await panel.locator('input').evaluateAll(
        els => els.map(e => `${e.type}:${e.placeholder}`))
      console.log('πεδία πίνακα:', JSON.stringify(panelPlaceholders))
      const tags = panel.locator('input[type="text"]').nth(3)
      await tags.click()
      await tags.type('δικτύωση,')
      await page.waitForTimeout(250)
      await tags.type('Αθήνα')
      await tags.press('Enter')
      await page.waitForTimeout(250)
      await tags.type('ENCC')
      await tags.press('Enter')
      await page.waitForTimeout(400)
      console.log('φυσαλίδες ετικετών:', await page.locator('span', { hasText: /^(δικτύωση|Αθήνα|ENCC)$/ }).count())

      await page.getByRole('button', { name: 'Παράγραφος', exact: true }).first().click()
      await page.waitForTimeout(900)
      await page.getByText('Στοιχεία κάρτας').first().scrollIntoViewIfNeeded()
      await page.mouse.wheel(0, -120)
      await page.waitForTimeout(1800)
    }
  }
  await page.screenshot({ path: out, fullPage: false })
  await browser.close()
})().catch(e => { console.error('ΣΦΑΛΜΑ:', e.message); process.exit(1) })
