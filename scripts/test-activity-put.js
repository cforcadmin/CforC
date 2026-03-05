/**
 * Test which ID format works for activity PUT
 */
require('dotenv').config({ path: '.env.local' })

async function run() {
  const STRAPI_URL = process.env.STRAPI_URL
  const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

  // Get first activity with both id and documentId
  const res = await fetch(
    `${STRAPI_URL}/api/activities?fields[0]=Title&pagination[limit]=1`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
  )
  const data = await res.json()
  const activity = data.data[0]
  console.log('Activity:', activity.Title)
  console.log('id:', activity.id)
  console.log('documentId:', activity.documentId)
  console.log('')

  // Test PUT with numeric id
  console.log('Testing PUT with numeric id...')
  const r1 = await fetch(`${STRAPI_URL}/api/activities/${activity.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: { Title: activity.Title } })
  })
  console.log(`  Status: ${r1.status}`)

  // Test PUT with documentId
  console.log('Testing PUT with documentId...')
  const r2 = await fetch(`${STRAPI_URL}/api/activities/${activity.documentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: { Title: activity.Title } })
  })
  console.log(`  Status: ${r2.status}`)

  if (r2.ok) {
    console.log('\n=> documentId works for activities PUT')
  } else if (r1.ok) {
    console.log('\n=> numeric id works for activities PUT')
  } else {
    console.log('\nNeither worked. r1:', await r1.text().catch(() => ''), 'r2:', await r2.text().catch(() => ''))
  }
}

run().catch(err => { console.error(err); process.exit(1) })
