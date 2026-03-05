/**
 * Retry uploading the thumbnail for Τσούμπρη Τζέννυ's 2nd project
 * Usage: node scripts/fix-tsoumpri-thumbnail.js
 */
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const WEBFLOW_API_KEY = 'b0ee3cdeef0fbb691c2e715f5f49ffb970207abd22e73807e5a2e74768a67dd2'
const WEBFLOW_PROJECTS_COLLECTION = '63f4d59f308dec655d86bf35'

async function main() {
  // 1. Get the thumbnail URL from Webflow
  console.log('1. Finding project in Webflow...')
  const res = await fetch(
    `https://api.webflow.com/v2/collections/${WEBFLOW_PROJECTS_COLLECTION}/items?limit=100&offset=0`,
    { headers: { Authorization: `Bearer ${WEBFLOW_API_KEY}` } }
  )
  const data = await res.json()
  const project = data.items.find(i => (i.fieldData.name || '').includes('ΕΙΚΟΝΕΣ'))

  if (!project) {
    console.error('Project not found')
    process.exit(1)
  }

  const thumbUrl = project.fieldData.thumbnail?.url
  console.log(`   Project: "${project.fieldData.name}"`)
  console.log(`   Thumbnail URL: ${thumbUrl}`)

  if (!thumbUrl) {
    console.log('No thumbnail URL found - nothing to do')
    return
  }

  // 2. Download image
  console.log('\n2. Downloading image...')
  const imgRes = await fetch(thumbUrl)
  if (!imgRes.ok) {
    console.error(`Download failed: ${imgRes.status}`)
    process.exit(1)
  }
  const buf = await imgRes.arrayBuffer()
  const ct = imgRes.headers.get('content-type') || 'image/jpeg'
  console.log(`   Downloaded: ${buf.byteLength} bytes (${ct})`)

  // 3. Upload to Strapi
  console.log('\n3. Uploading to Strapi...')
  const blob = new Blob([buf], { type: ct })
  const formData = new FormData()
  formData.append('files', blob, 'tsoumpri_project2_thumb.jpg')

  const upRes = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
    body: formData
  })

  if (!upRes.ok) {
    console.error(`Upload failed: ${upRes.status} ${await upRes.text()}`)
    process.exit(1)
  }

  const result = await upRes.json()
  const imageId = result[0].id
  console.log(`   Uploaded successfully (id: ${imageId})`)

  // 4. Get member and existing pictures
  console.log('\n4. Finding member in Strapi...')
  const mRes = await fetch(
    `${STRAPI_URL}/api/members?filters[Name][$containsi]=Τσούμπρη&fields[0]=Name&populate[Project2Pictures][fields][0]=id`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
  )
  const mData = await mRes.json()
  const member = mData.data[0]
  console.log(`   Member: "${member.Name}" (id: ${member.id})`)

  const existingPicIds = (member.Project2Pictures || []).map(p => p.id)
  console.log(`   Existing Project2Pictures: [${existingPicIds.join(', ')}]`)

  // 5. Update: prepend thumbnail
  const allPics = [imageId, ...existingPicIds]
  console.log(`\n5. Updating Project2Pictures to: [${allPics.join(', ')}]`)

  const putRes = await fetch(`${STRAPI_URL}/api/members/${member.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: { Project2Pictures: allPics } })
  })

  if (!putRes.ok) {
    console.error(`PUT failed: ${putRes.status} ${await putRes.text()}`)
    process.exit(1)
  }

  console.log('   Success! Thumbnail added to Project2Pictures')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
