/**
 * Script to replace semicolons with commas in FieldsOfWork for all members
 *
 * Usage: node scripts/fix-fields-of-work.js
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Error: Missing STRAPI_URL or STRAPI_API_TOKEN')
  process.exit(1)
}

async function fixFieldsOfWork() {
  try {
    console.log('📥 Fetching all members...')

    const response = await fetch(`${STRAPI_URL}/api/members?pagination[limit]=1000`, {
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

    let updated = 0
    let skipped = 0
    let failed = 0

    for (const member of members) {
      const fieldsOfWork = member.FieldsOfWork
      const memberId = member.id
      const documentId = member.documentId
      const name = member.Name

      if (!memberId) {
        console.log(`⏭️  Skipping "${name}" - missing numeric id (required for REST updates). documentId: ${documentId || 'none'}`)
        failed++
        continue
      }

      // Skip if no FieldsOfWork or if it doesn't contain semicolons
      if (!fieldsOfWork || !fieldsOfWork.includes(';')) {
        console.log(`⏭️  Skipping "${name}" - no semicolons found`)
        skipped++
        continue
      }

      // Replace semicolons with commas
      const updatedFieldsOfWork = fieldsOfWork.replace(/;/g, ',')

      try {
        console.log(`🔄 Updating "${name}" (id: ${memberId}, documentId: ${documentId || 'none'})`)
        const updateResponse = await fetch(`${STRAPI_URL}/api/members/${memberId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              FieldsOfWork: updatedFieldsOfWork
            }
          })
        })

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error(`   ⚠️ Update failed with status ${updateResponse.status}: ${errorText}`)
          throw new Error('Failed to update member FieldsOfWork')
        }

        console.log(`✅ Updated "${name}": "${fieldsOfWork}" → "${updatedFieldsOfWork}"`)
        updated++
      } catch (error) {
        console.error(`❌ Failed to update "${name}":`, error.message)
        failed++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log('\n📊 Summary:')
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Total: ${members.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixFieldsOfWork()
