/**
 * Script to set member profile images based on a CSV file with photo URLs.
 *
 * CSV is expected at: scripts/CforC_Members.csv
 * Example header (you can adjust column names below):
 *   Name,PhotoUrl
 *
 * Usage: node scripts/fix-member-images-from-csv.js
 */

require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

// --- Helpers copied from fix-member-images.js ---

// Upload image without linking (we'll link it manually)
async function uploadImage(imageUrl, memberName) {
  try {
    console.log(`   📥 Downloading image...`)

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    let extension = '.jpg'
    if (contentType.includes('png')) extension = '.png'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg'
    else if (contentType.includes('webp')) extension = '.webp'

    const filename = `${memberName.replace(/\s+/g, '_')}${extension}`
    const blob = new Blob([imageBuffer], { type: contentType })

    const formData = new FormData()
    formData.append('files', blob, filename)

    console.log(`   📤 Uploading to Strapi...`)

    const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      },
      body: formData
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`)
    }

    const result = await uploadResponse.json()
    console.log(`   ✅ Image uploaded! ID: ${result[0].id}`)
    return result[0].id

  } catch (error) {
    throw error
  }
}

async function fetchAllMembers() {
  console.log('📥 Fetching all members from Strapi...')

  const response = await fetch(`${STRAPI_URL}/api/members?populate=*&pagination[limit]=1000`, {
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch members: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  // Normalise members for both Strapi v4 (data[i].attributes.*) and
  // the older flat shape used in the original script.
  const members = (data.data || []).map(raw => {
    const attrs = raw.attributes || {}
    const name = attrs.Name || raw.Name || 'Unknown'
    return {
      raw,
      id: raw.id,
      documentId: raw.documentId || attrs.documentId || raw.id,
      name
    }
  })

  console.log(`✅ Found ${members.length} members`)
  return members
}

// Parse CSV into a map: normalisedName -> photoUrl
async function loadCsvPhotoMap() {
  const csvPath = path.join(__dirname, 'CforC_Members.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at ${csvPath}`)
    process.exit(1)
  }

  console.log(`📄 Reading CSV: ${csvPath}`)

  const fileStream = fs.createReadStream(csvPath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let header = null
  const photoMap = new Map()
  let delimiter = null

  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Auto-detect delimiter on the first non-empty line: prefer ';' when present,
    // otherwise default to ','.
    if (!delimiter) {
      delimiter = trimmed.includes(';') ? ';' : ','
    }

    const parts = trimmed.split(delimiter)

    if (!header) {
      header = parts.map(h => h.trim())
      continue
    }

    const row = {}
    header.forEach((key, idx) => {
      row[key] = (parts[idx] || '').trim()
    })

    // Explicitly support your column name "Profile Image" for the photo URL.
    // Name column guesses can be adjusted if needed.
    const name = row['Name'] || row['Full Name'] || row['MemberName']
    const photoUrl = row['Profile Image'] || row['PhotoUrl'] || row['Photo URL'] || row['ImageUrl']

    if (!name || !photoUrl) continue

    const normName = normaliseName(name)
    photoMap.set(normName, photoUrl)
  }

  console.log(`✅ Loaded ${photoMap.size} photo URLs from CSV`)
  return photoMap
}

function normaliseName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  try {
    const [members, photoMap] = await Promise.all([
      fetchAllMembers(),
      loadCsvPhotoMap()
    ])

    let fixed = 0
    let skipped = 0
    let failed = 0
    let noMatch = 0

    for (const member of members) {
      const { id: memberId, documentId, name, raw } = member

      if (!memberId) {
        console.log(`\n👤 Processing: ${name}`)
        console.error('   ❌ Failed: member is missing numeric id (required for REST updates)')
        console.error(`   ℹ️ documentId (for reference): ${documentId || 'none'}`)
        failed++
        continue
      }

      console.log(`\n👤 Processing: ${name} (id: ${memberId}, documentId: ${documentId || 'none'})`)

      const normName = normaliseName(name)
      const photoUrl = photoMap.get(normName)

      if (!photoUrl) {
        console.log('   ⏭️  No photo URL in CSV for this member - skipping')
        noMatch++
        continue
      }

      if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
        console.log(`   ⏭️  CSV photo URL is not http/https (${photoUrl}) - skipping`)
        skipped++
        continue
      }

      console.log(`   🔗 CSV photo URL: ${photoUrl}`)

      try {
        const uploadedImageId = await uploadImage(photoUrl, name)

        console.log('   🔗 Linking image to member...')

        const payload = {
          data: {
            Name: (raw.attributes && raw.attributes.Name) || raw.Name || name,
            Image: uploadedImageId
          }
        }

        const updateResponse = await fetch(`${STRAPI_URL}/api/members/${memberId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error(`   ⚠️ Update failed with status ${updateResponse.status}: ${errorText}`)
          throw new Error('Failed to update member image')
        }

        console.log(`   ✅ Successfully set image for ${name}`)
        fixed++

      } catch (error) {
        console.error('   ❌ Failed:', error.message)
        failed++
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Fixed (updated from CSV): ${fixed}`)
    console.log(`⏭️  Skipped (bad/relative URL): ${skipped}`)
    console.log(`⏭️  No CSV match: ${noMatch}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📊 Total members processed: ${members.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
