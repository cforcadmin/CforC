/**
 * Test script to update a single member's FieldsOfWork
 */

require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function testUpdate() {
  try {
    // First, get a member with semicolons
    console.log('📥 Fetching members...')
    const response = await fetch(`${STRAPI_URL}/api/members?pagination[limit]=5`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    })

    const data = await response.json()
    const member = data.data.find(m => m.FieldsOfWork && m.FieldsOfWork.includes(';'))

    if (!member) {
      console.log('No member with semicolons found')
      return
    }

    console.log(`\n📝 Testing update on: ${member.Name}`)
    console.log(`   Current FieldsOfWork: "${member.FieldsOfWork}"`)
    console.log(`   ID: ${member.id}`)
    console.log(`   Document ID: ${member.documentId}`)

    const updatedFieldsOfWork = member.FieldsOfWork.replace(/;/g, ',')
    console.log(`   New FieldsOfWork: "${updatedFieldsOfWork}"`)

    // Try to update
    console.log(`\n🔄 Attempting update...`)
    const updateResponse = await fetch(`${STRAPI_URL}/api/members/${member.id}`, {
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

    console.log(`   Response status: ${updateResponse.status}`)

    const result = await updateResponse.json()
    console.log(`   Response:`, JSON.stringify(result, null, 2))

    if (updateResponse.ok) {
      console.log('\n✅ Update successful!')
    } else {
      console.log('\n❌ Update failed')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testUpdate()
