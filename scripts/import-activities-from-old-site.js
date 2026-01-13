/**
 * Script to import activities from cultureforchange.net to Strapi
 *
 * Usage: node scripts/import-activities-from-old-site.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

// Fetch activity list
async function fetchActivityList() {
  console.log('📥 Fetching activity list from cultureforchange.net...\n')

  const response = await fetch('https://www.cultureforchange.net/activities')
  const html = await response.text()

  const activities = []

  // Look for links containing /activities/
  const linkRegex = /href="(\/activities\/[^"]+)"/gi
  const links = []
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1])
  }

  const uniqueLinks = [...new Set(links)]

  for (const link of uniqueLinks) {
    activities.push({
      url: `https://www.cultureforchange.net${link}`
    })
  }

  console.log(`✅ Found ${activities.length} activities\n`)
  return activities
}

// Fetch full activity details from detail page
async function fetchActivityDetails(url) {
  console.log(`   📄 Fetching details from: ${url}`)

  const response = await fetch(url)
  const html = await response.text()

  // Extract title from h1.activitytitle
  const titleMatch = html.match(/<h1[^>]*class="[^"]*activitytitle[^"]*"[^>]*>(.*?)<\/h1>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Untitled Activity'

  // Extract date from <div>DD/MM/YYYY</div> pattern (before the activity content)
  const dateMatch = html.match(/<div[^>]*>(\d{1,2}\/\d{1,2}\/\d{4})<\/div>/i)
  let date = null
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Extract description from <p> tags inside customrichtext
  const descriptions = []

  // Find the richtext container
  const richtextMatch = html.match(/<div[^>]*class="[^"]*customrichtext[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*hiddenstyling/i)

  if (richtextMatch) {
    const richtextHtml = richtextMatch[1]

    // Extract all <p> tags
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
    let pMatch
    while ((pMatch = pRegex.exec(richtextHtml)) !== null) {
      const text = pMatch[1]
        .replace(/<strong>(.*?)<\/strong>/g, '$1')
        .replace(/<em>(.*?)<\/em>/g, '$1')
        .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()

      if (text && !text.includes('CULTURE FOR CHANGE')) {
        descriptions.push(text)
      }
    }
  }

  // Extract preview/hero image - it appears BEFORE the activitycontent div
  let previewImage = null

  // Find the position of activitycontent div
  const activityContentIndex = html.indexOf('class="activitycontent"')

  if (activityContentIndex !== -1) {
    // Get HTML before activitycontent
    const beforeContent = html.substring(0, activityContentIndex)

    // Find all images in this section
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi
    let imgMatch
    const beforeImages = []

    while ((imgMatch = imgRegex.exec(beforeContent)) !== null) {
      const imgUrl = imgMatch[1]
      const fullUrl = imgUrl.startsWith('http') ? imgUrl : `https:${imgUrl}`

      // Only consider images from CDN that are not logos
      if (fullUrl.includes('cdn.prod.website-files.com') &&
          (fullUrl.includes('.jpg') || fullUrl.includes('.png') || fullUrl.includes('.jpeg') || fullUrl.includes('.webp')) &&
          !fullUrl.toLowerCase().includes('logo')) {
        beforeImages.push(fullUrl)
      }
    }

    // The last image before activitycontent is typically the preview
    if (beforeImages.length > 0) {
      previewImage = beforeImages[beforeImages.length - 1]
    }
  }

  // Extract additional images from <figure> tags in the richtext content
  const contentImages = []

  if (richtextMatch) {
    const richtextHtml = richtextMatch[1]

    // Extract images from <figure> tags
    const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/gi
    let figureMatch
    while ((figureMatch = figureRegex.exec(richtextHtml)) !== null) {
      const figureHtml = figureMatch[1]
      const imgMatch = figureHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/i)

      if (imgMatch) {
        const imgUrl = imgMatch[1]
        const fullUrl = imgUrl.startsWith('http') ? imgUrl : `https:${imgUrl}`
        if (fullUrl.includes('cdn.prod.website-files.com') &&
            (fullUrl.includes('.jpg') || fullUrl.includes('.png') || fullUrl.includes('.jpeg') || fullUrl.includes('.webp'))) {
          contentImages.push(fullUrl)
        }
      }
    }
  }

  // Combine preview first, then content images (remove duplicates)
  const allImages = []
  if (previewImage) {
    allImages.push(previewImage)
  }
  contentImages.forEach(img => {
    if (!allImages.includes(img)) {
      allImages.push(img)
    }
  })

  console.log(`   📝 Title: ${title}`)
  console.log(`   📅 Date: ${date || 'Not found'}`)
  console.log(`   📄 Description length: ${descriptions.join('\n\n').length} chars`)
  console.log(`   🖼️  Preview image: ${previewImage ? 'Found' : 'Not found'}`)
  console.log(`   🖼️  Content images: ${contentImages.length}`)
  console.log(`   🖼️  Total images: ${allImages.length}`)

  return {
    title,
    date: date || new Date().toISOString().split('T')[0],
    description: descriptions.join('\n\n'),
    images: allImages
  }
}

// Upload image from URL
async function uploadImage(imageUrl, activityTitle) {
  try {
    console.log(`      📥 Downloading: ${imageUrl}`)

    // Handle relative URLs
    let fullUrl = imageUrl
    if (imageUrl.startsWith('/')) {
      fullUrl = `https://www.cultureforchange.net${imageUrl}`
    } else if (!imageUrl.startsWith('http')) {
      fullUrl = `https://www.cultureforchange.net/${imageUrl}`
    }

    const imageResponse = await fetch(fullUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    let extension = '.jpg'
    if (contentType.includes('png')) extension = '.png'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg'
    else if (contentType.includes('webp')) extension = '.webp'

    const filename = `${activityTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}${extension}`
    const blob = new Blob([imageBuffer], { type: contentType })

    const formData = new FormData()
    formData.append('files', blob, filename)

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
    console.log(`      ✅ Uploaded (ID: ${result[0].id})`)
    return result[0].id

  } catch (error) {
    console.warn(`      ⚠️  Failed to upload image: ${error.message}`)
    return null
  }
}

// Convert plain text description to Strapi blocks format
function textToBlocks(text) {
  if (!text) return []

  const paragraphs = text.split('\n\n').filter(p => p.trim())

  return paragraphs.map(para => ({
    type: 'paragraph',
    children: [{ type: 'text', text: para }]
  }))
}

// Create activity in Strapi
async function createActivity(activityData) {
  console.log(`\n📝 Processing: ${activityData.title}`)
  console.log(`   Date: ${activityData.date}`)
  console.log(`   Images: ${activityData.images.length}`)

  try {
    // Upload all images
    const imageIds = []
    for (const imageUrl of activityData.images) {
      const imageId = await uploadImage(imageUrl, activityData.title)
      if (imageId) {
        imageIds.push(imageId)
      }
    }

    if (imageIds.length === 0) {
      console.log(`   ⚠️  No images uploaded, skipping activity`)
      return { success: false, reason: 'no images' }
    }

    // Create activity
    console.log(`   📤 Creating activity in Strapi...`)

    const activityPayload = {
      data: {
        Title: activityData.title,
        Description: textToBlocks(activityData.description),
        Date: activityData.date,
        Visuals: imageIds,
        Category: 'Imported',
        Featured: false,
        publishedAt: new Date().toISOString() // Auto-publish
      }
    }

    const createResponse = await fetch(`${STRAPI_URL}/api/activities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityPayload)
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Failed to create: ${createResponse.status} ${errorText}`)
    }

    const result = await createResponse.json()
    console.log(`   ✅ Activity created (ID: ${result.data.id})`)

    return { success: true, id: result.data.id }

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting full activity import...\n')

    const activityList = await fetchActivityList()

    if (activityList.length === 0) {
      console.log('⚠️  No activities found.')
      return
    }

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const activityBasic of activityList) {
      try {
        const details = await fetchActivityDetails(activityBasic.url)

        const result = await createActivity(details)

        if (result.success) {
          imported++
        } else if (result.reason === 'no images') {
          skipped++
        } else {
          failed++
        }

      } catch (error) {
        console.error(`   ❌ Failed to process: ${error.message}`)
        failed++
      }

      // Delay between activities
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Imported: ${imported}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📊 Total: ${activityList.length}`)
    console.log('\n✨ Import complete!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
