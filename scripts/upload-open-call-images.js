require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

const FOLDER = path.join(require('os').homedir(), 'Downloads/ToUpload')

async function main() {
  // First, fetch ALL open calls to build id -> documentId mapping
  console.log('Fetching all open calls to build ID mapping...')
  const allRes = await fetch(`${STRAPI_URL}/api/open-calls?populate=Image&pagination[limit]=100`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const allData = await allRes.json()
  const allCalls = allData.data || []
  const callMap = {}
  allCalls.forEach(c => { callMap[c.id] = c })
  console.log(`Loaded ${allCalls.length} open calls\n`)

  const files = fs.readdirSync(FOLDER).filter(f => /^\d+\.(jpg|jpeg|png|webp)$/i.test(f))
  console.log(`Found ${files.length} images to upload\n`)

  for (const file of files) {
    const id = parseInt(path.basename(file, path.extname(file)))
    const filePath = path.join(FOLDER, file)
    const ext = path.extname(file).toLowerCase()
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
    const mime = mimeMap[ext] || 'image/png'

    console.log(`--- Processing ID ${id} (${file}) ---`)

    const call = callMap[id]
    if (!call) {
      console.log(`  ERROR: No open call found with id ${id}`)
      continue
    }
    const documentId = call.documentId
    const title = call.Title
    console.log(`  Title: ${title}`)
    console.log(`  DocumentId: ${documentId}`)

    // 2. Upload new image to Strapi media library
    const fileBuffer = fs.readFileSync(filePath)
    const blob = new Blob([fileBuffer], { type: mime })

    const formData = new FormData()
    formData.append('files', blob, file)

    const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: formData,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.log(`  ERROR uploading: ${errText}`)
      continue
    }

    const uploaded = await uploadRes.json()
    const newImageId = uploaded[0].id
    console.log(`  Uploaded new image: ID ${newImageId} (${uploaded[0].name})`)

    // 3. Update open call to use new image (Strapi v5 uses documentId for PUT)
    // Need to include required fields - fetch current data for ImageAltText
    const altText = call.ImageAltText || call.Title

    const updateRes = await fetch(`${STRAPI_URL}/api/open-calls/${documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          Image: newImageId,
          ImageAltText: altText,
        },
      }),
    })

    if (!updateRes.ok) {
      const errText = await updateRes.text()
      console.log(`  ERROR updating open call: ${errText}`)
      continue
    }

    console.log(`  Updated open call ${id} with new image\n`)
  }

  console.log('Done!')
}

main().catch(console.error)
