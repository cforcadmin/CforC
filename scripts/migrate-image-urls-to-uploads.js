/**
 * Script to migrate external image URLs to Strapi uploads
 * Downloads images from URLs and uploads them properly to Strapi
 *
 * Usage: node scripts/migrate-image-urls-to-uploads.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

// Upload image from URL to Strapi
async function uploadImageToStrapi(imageUrl, memberId, memberName) {
  if (!imageUrl || imageUrl === '') {
    return null
  }

  try {
    console.log(`   📥 Downloading image from: ${imageUrl}`)

    // Download image from URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Determine file extension from content type or URL
    let extension = '.jpg'
    if (contentType.includes('png')) extension = '.png'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg'
    else if (contentType.includes('webp')) extension = '.webp'
    else if (contentType.includes('gif')) extension = '.gif'
    else {
      const urlPath = new URL(imageUrl).pathname
      const urlExt = urlPath.substring(urlPath.lastIndexOf('.'))
      if (urlExt && urlExt.length < 6) extension = urlExt
    }

    const filename = `${memberName.replace(/\s+/g, '_')}${extension}`
    const blob = new Blob([imageBuffer], { type: contentType })

    // Create form data
    const formData = new FormData()
    formData.append('files', blob, filename)
    formData.append('ref', 'api::member.member')
    formData.append('refId', memberId.toString())
    formData.append('field', 'Image')

    console.log(`   📤 Uploading to Strapi as: ${filename}`)

    // Upload to Strapi
    const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      },
      body: formData
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`)
    }

    const result = await uploadResponse.json()
    console.log(`   ✅ Image uploaded successfully!`)
    return result

  } catch (error) {
    console.warn(`   ⚠️  Image upload failed: ${error.message}`)
    return null
  }
}

async function migrateImages() {
  try {
    console.log('📥 Fetching all members...\n')

    const response = await fetch(`${STRAPI_URL}/api/members?populate=Image&pagination[limit]=1000`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch members: ${response.statusText}`)
    }

    const data = await response.json()
    const members = data.data

    console.log(`✅ Found ${members.length} members\n`)

    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const member of members) {
      const name = member.Name
      const memberId = member.id
      const image = member.Image

      console.log(`\n👤 Processing: ${name} (ID: ${memberId})`)

      // Check if member has an image
      if (!image || image.length === 0) {
        console.log(`   ⏭️  No image found - skipping`)
        skipped++
        continue
      }

      const imageUrl = image[0].url

      // Check if it's an external URL (not already uploaded to Strapi)
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        console.log(`   ⏭️  Image already in Strapi - skipping`)
        skipped++
        continue
      }

      // Check if it's already a Strapi upload (contains /uploads/)
      if (imageUrl.includes('/uploads/')) {
        console.log(`   ⏭️  Image already uploaded to Strapi - skipping`)
        skipped++
        continue
      }

      console.log(`   🔗 External URL detected: ${imageUrl}`)

      try {
        // Upload image to Strapi
        const uploadedImage = await uploadImageToStrapi(imageUrl, memberId, name)

        if (uploadedImage && uploadedImage.length > 0) {
          // Verify the image was linked
          console.log(`   ✓ Image ID: ${uploadedImage[0].id}`)
          migrated++
          console.log(`   🎉 Migration successful for ${name}`)
        } else {
          console.log(`   ⚠️  Upload returned but no image data`)
          failed++
        }
      } catch (error) {
        console.error(`   ❌ Failed to migrate image for ${name}:`, error.message)
        failed++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Successfully migrated: ${migrated}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📊 Total: ${members.length}`)
    console.log('\n✨ Image migration complete!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

migrateImages()
