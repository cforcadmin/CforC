/**
 * Script to fix member images by removing external URLs and uploading them properly
 *
 * Usage: node scripts/fix-member-images.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

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

// Update member with new image ID
async function updateMemberImage(documentId, imageId) {
  const updateResponse = await fetch(`${STRAPI_URL}/api/members/${documentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: {
        Image: [imageId]
      }
    })
  })

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json()
    throw new Error(`Failed to update member: ${JSON.stringify(errorData)}`)
  }

  return await updateResponse.json()
}

async function fixImages() {
  try {
    console.log('📥 Fetching all members...\n')

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
      // Name can live on attributes or directly on the object
      const name = attrs.Name || raw.Name || 'Unknown'
      // Image relation: v4 typically uses Image.data (single or multiple)
      const imageRelation = attrs.Image?.data ?? raw.Image
      return {
        raw,
        id: raw.id,
        documentId: raw.documentId || attrs.documentId || raw.id,
        name,
        imageRelation
      }
    })

    console.log(`✅ Found ${members.length} members\n`)

    let fixed = 0
    let skipped = 0
    let failed = 0

    for (const member of members) {
      const { id: memberId, documentId, name, imageRelation, raw } = member

      if (!memberId) {
        console.log(`\n👤 Processing: ${name}`)
        console.error('   ❌ Failed: member is missing numeric id (required for REST updates)')
        console.error(`   ℹ️ documentId (for reference): ${documentId || 'none'}`)
        failed++
        continue
      }

      console.log(`\n👤 Processing: ${name} (id: ${memberId}, documentId: ${documentId || 'none'})`)

      // Handle both single and multiple media relations
      if (!imageRelation || (Array.isArray(imageRelation) && imageRelation.length === 0) || (!Array.isArray(imageRelation) && !imageRelation.id && !imageRelation.url)) {
        console.log('   ⏭️  No image - skipping')
        skipped++
        continue
      }

      const firstImage = Array.isArray(imageRelation) ? imageRelation[0] : imageRelation
      const imageAttrs = firstImage.attributes || {}
      const imageUrl = imageAttrs.url || firstImage.url

      if (!imageUrl) {
        console.log('   ⏭️  Image has no URL - skipping')
        skipped++
        continue
      }

      // Check if it's an external URL (http/https) – if it's already a Strapi relative URL, skip
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        console.log('   ⏭️  Already using relative/Strapi URL - skipping')
        skipped++
        continue
      }

      console.log(`   🔗 External URL: ${imageUrl}`)

      try {
        // Upload the image (without linking)
        const uploadedImageId = await uploadImage(imageUrl, name)

        // Update the member record to use the new image.
        // For a profile image, we assume a single media relation, so we set Image to the new ID.
        console.log('   🔗 Linking image to member...')

        const payload = {
          data: {
            // Include Name to satisfy any lifecycle hooks expecting it
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

        console.log(`   ✅ Successfully fixed image for ${name}`)
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
    console.log(`✅ Fixed: ${fixed}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📊 Total: ${members.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixImages()
