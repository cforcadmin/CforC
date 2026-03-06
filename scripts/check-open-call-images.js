require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

async function main() {
  const res = await fetch(
    `${STRAPI_URL}/api/open-calls?populate=Image&pagination[limit]=100&sort=Deadline:desc`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  )
  const json = await res.json()
  const calls = json.data || []

  console.log(`Total open calls: ${calls.length}\n`)

  // List all with image filename, dimensions, and URL
  calls.forEach(c => {
    const img = c.Image
    const name = img ? img.name : 'NO IMAGE'
    const w = img ? img.width : '-'
    const h = img ? img.height : '-'
    const url = img ? img.url : ''
    console.log(`ID: ${c.id} | ${c.Title}`)
    console.log(`  Deadline: ${c.Deadline}`)
    console.log(`  Link: ${c.Link || 'N/A'}`)
    console.log(`  Image: ${name} (${w}x${h})`)
    console.log(`  URL: ${url}`)
    console.log()
  })
}

main().catch(console.error)
