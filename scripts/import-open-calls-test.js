/**
 * TEST Script to import 2 open calls from cultureforchange.net to Strapi
 *
 * Usage: node scripts/import-open-calls-test.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

// Fetch open calls list
async function fetchOpenCallsList() {
  console.log('📥 Fetching open calls list from cultureforchange.net...\n')

  const response = await fetch('https://www.cultureforchange.net/open-calls')
  const html = await response.text()

  const openCalls = []

  // Find all open call containers - look for the pattern with carddate divs
  // Date pattern: <div class="carddate">DD</div><div class="carddate">/</div><div class="carddate">MM</div><div class="carddate">/</div><div class="carddate">YYYY</div>
  const dateRegex = /<div class="carddate">(\d{1,2})<\/div>\s*<div class="carddate">\/<\/div>\s*<div class="carddate">(\d{1,2})<\/div>\s*<div class="carddate">\/<\/div>\s*<div class="carddate">(\d{4})<\/div>/gi

  let match
  const dateMatches = []
  while ((match = dateRegex.exec(html)) !== null) {
    const day = match[1]
    const month = match[2]
    const year = match[3]
    const position = match.index
    dateMatches.push({ day, month, year, position })
  }

  console.log(`✅ Found ${dateMatches.length} date entries\n`)

  // For each date, extract the following h2, p, and link
  for (let i = 0; i < Math.min(2, dateMatches.length); i++) {
    const dateInfo = dateMatches[i]

    // Look backward from date to find the start of the <a> tag
    const beforeDate = html.substring(Math.max(0, dateInfo.position - 500), dateInfo.position)
    const linkMatch = beforeDate.match(/<a[^>]*href="([^"]*)"[^>]*target="_blank"[^>]*>(?!.*<a)/i)
    const link = linkMatch ? linkMatch[1] : null

    // Look forward from date to get the rest of the content
    const startPos = dateInfo.position
    const endPos = i < dateMatches.length - 1 ? dateMatches[i + 1].position : html.length
    const section = html.substring(startPos, endPos)

    // Extract title from h2 with class="listheading"
    const titleMatch = section.match(/<h2[^>]*class="[^"]*listheading[^"]*"[^>]*>(.*?)<\/h2>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : null

    // Extract description from p (first p tag after h2)
    const descMatch = section.match(/<\/h2>\s*<p[^>]*>(.*?)<\/p>/i)
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : null

    // Check for PRIORITY badge
    const hasPriority = section.includes('class="carddate">PRIORITY')

    if (title && description && link) {
      const date = `${dateInfo.year}-${dateInfo.month.padStart(2, '0')}-${dateInfo.day.padStart(2, '0')}`

      openCalls.push({
        title,
        description,
        link,
        date,
        priority: hasPriority
      })

      console.log(`Found: ${title}`)
      console.log(`  Date: ${date}`)
      console.log(`  Link: ${link}`)
      console.log(`  Priority: ${hasPriority}\n`)
    }
  }

  return openCalls.slice(0, 2) // Only return first 2 for testing
}

// Fetch a relevant image from the open call link
async function fetchImageFromLink(url, title) {
  try {
    console.log(`   📥 Fetching image from: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`)
    }

    const html = await response.text()

    // Look for Open Graph image
    let ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i)
    if (!ogImageMatch) {
      ogImageMatch = html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"[^>]*>/i)
    }

    if (ogImageMatch && ogImageMatch[1]) {
      console.log(`   ✅ Found OG image: ${ogImageMatch[1]}`)
      return ogImageMatch[1]
    }

    // Fallback: Look for first large image in content
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi
    let imgMatch
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const imgUrl = imgMatch[1]
      const fullUrl = imgUrl.startsWith('http') ? imgUrl :
                      imgUrl.startsWith('//') ? `https:${imgUrl}` :
                      new URL(imgUrl, url).href

      // Skip small images, icons, logos
      if (fullUrl.includes('.jpg') || fullUrl.includes('.png') || fullUrl.includes('.jpeg') || fullUrl.includes('.webp')) {
        if (!fullUrl.toLowerCase().includes('logo') &&
            !fullUrl.toLowerCase().includes('icon') &&
            !fullUrl.includes('pixel')) {
          console.log(`   ✅ Found fallback image: ${fullUrl}`)
          return fullUrl
        }
      }
    }

    console.log(`   ⚠️  No suitable image found`)
    return null

  } catch (error) {
    console.warn(`   ⚠️  Failed to fetch image from link: ${error.message}`)
    return null
  }
}

// Upload image from URL
async function uploadImage(imageUrl, openCallTitle) {
  try {
    console.log(`   📥 Downloading image: ${imageUrl}`)

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    let extension = '.jpg'
    if (contentType.includes('png')) extension = '.png'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg'
    else if (contentType.includes('webp')) extension = '.webp'

    const filename = `${openCallTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}_${Date.now()}${extension}`
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
    console.log(`   ✅ Image uploaded (ID: ${result[0].id})`)
    return result[0].id

  } catch (error) {
    console.warn(`   ⚠️  Failed to upload image: ${error.message}`)
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

// Create open call in Strapi
async function createOpenCall(openCallData) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📝 Creating: ${openCallData.title}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`   Deadline: ${openCallData.date}`)
  console.log(`   Link: ${openCallData.link}`)
  console.log(`   Priority: ${openCallData.priority}`)

  try {
    // Fetch and upload image from the open call link
    const imageUrl = await fetchImageFromLink(openCallData.link, openCallData.title)

    if (!imageUrl) {
      console.log(`   ⚠️  No image found, skipping open call`)
      return { success: false, reason: 'no image' }
    }

    const imageId = await uploadImage(imageUrl, openCallData.title)

    if (!imageId) {
      console.log(`   ⚠️  Failed to upload image, skipping open call`)
      return { success: false, reason: 'image upload failed' }
    }

    console.log(`   📤 Creating open call in Strapi...`)

    const openCallPayload = {
      data: {
        Title: openCallData.title,
        Description: textToBlocks(openCallData.description),
        Deadline: openCallData.date,
        Link: openCallData.link,
        Priority: openCallData.priority,
        Image: imageId,
        publishedAt: new Date().toISOString()
      }
    }

    const createResponse = await fetch(`${STRAPI_URL}/api/open-calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openCallPayload)
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Failed to create: ${createResponse.status} ${errorText}`)
    }

    const result = await createResponse.json()
    const resultId = result.data?.id || result.data?.documentId
    console.log(`   ✅ Open call created successfully! (ID: ${resultId})`)

    return { success: true, id: resultId }

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting TEST import (2 open calls only)...\n')

    const openCallsList = await fetchOpenCallsList()

    if (openCallsList.length === 0) {
      console.log('⚠️  No open calls found.')
      return
    }

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const openCall of openCallsList) {
      try {
        const result = await createOpenCall(openCall)

        if (result.success) {
          imported++
        } else if (result.reason === 'no image' || result.reason === 'image upload failed') {
          skipped++
        } else {
          failed++
        }

      } catch (error) {
        console.error(`   ❌ Failed to process: ${error.message}`)
        failed++
      }

      // Delay between open calls
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Imported: ${imported}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📊 Total: ${openCallsList.length}`)
    console.log('\n✨ Test import complete!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
