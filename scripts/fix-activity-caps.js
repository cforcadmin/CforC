/**
 * Fix remaining ALL CAPS activity titles in Strapi
 * Usage: node scripts/fix-activity-caps.js
 */
require('dotenv').config({ path: '.env.local' })

function toTitleCase(str) {
  if (!str) return str
  const letters = str.match(/\p{L}/gu) || []
  if (letters.length === 0) return str
  const upperCount = letters.filter(
    c => c === c.toLocaleUpperCase('el') && c !== c.toLocaleLowerCase('el')
  ).length
  const ratio = upperCount / letters.length
  if (ratio < 0.6) return str
  return str
    .toLocaleLowerCase('el')
    .replace(/(^|[\s\-\(\/"«|])\p{L}/gu, char => char.toLocaleUpperCase('el'))
}

async function run() {
  const res = await fetch(
    `${process.env.STRAPI_URL}/api/activities?fields[0]=Title&pagination[limit]=100`,
    { headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` } }
  )
  const data = await res.json()

  const allCaps = data.data.filter(a => {
    const letters = a.Title.match(/\p{L}/gu) || []
    if (letters.length === 0) return false
    const upper = letters.filter(c => c === c.toLocaleUpperCase('el') && c !== c.toLocaleLowerCase('el')).length
    return upper / letters.length > 0.6
  })

  console.log(`Found ${allCaps.length} ALL CAPS titles to fix\n`)

  for (const a of allCaps) {
    const newTitle = toTitleCase(a.Title)
    console.log(`  "${a.Title}"`)
    console.log(`→ "${newTitle}"`)

    const putRes = await fetch(`${process.env.STRAPI_URL}/api/activities/${a.documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: { Title: newTitle, ImageAltText: newTitle } })
    })

    if (putRes.ok) {
      console.log(`  ✅ Updated\n`)
    } else {
      console.log(`  ❌ Failed: ${putRes.status}\n`)
    }

    await new Promise(r => setTimeout(r, 1500))
  }
}

run().catch(err => { console.error(err); process.exit(1) })
