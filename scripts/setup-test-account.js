/**
 * Create (or reset) a hidden test member + auth-token in Strapi.
 * The member has HideProfile: true so it never appears on the website.
 *
 * Usage:  node scripts/setup-test-account.js
 *
 * Test credentials (also written to __tests__/helpers/testAccount.ts):
 *   Email:    e2e-test@cultureforchange.net
 *   Password: TestPass1!
 */

require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const bcrypt = require('bcrypt')

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const TEST_EMAIL = 'e2e-test@cultureforchange.net'
const TEST_PASSWORD = 'TestPass1!'
const TEST_NAME = 'E2E Test Account'

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
}

async function main() {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    console.error('Missing STRAPI_URL or STRAPI_API_TOKEN in .env.local')
    process.exit(1)
  }

  // 1. Check if test member already exists
  console.log('Checking for existing test member...')
  const findRes = await fetch(
    `${STRAPI_URL}/api/members?filters[Email][$eq]=${encodeURIComponent(TEST_EMAIL)}`,
    { headers }
  )
  const findData = await findRes.json()

  let memberId
  let memberDocumentId

  if (findData.data && findData.data.length > 0) {
    const existing = findData.data[0]
    memberId = existing.id
    memberDocumentId = existing.documentId
    console.log(`Found existing test member: id=${memberId}, documentId=${memberDocumentId}`)

    // Ensure HideProfile is true
    await fetch(`${STRAPI_URL}/api/members/${memberDocumentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        data: {
          HideProfile: true,
          Name: TEST_NAME,
        },
      }),
    })
    console.log('Updated member — HideProfile: true')
  } else {
    // Create new member
    console.log('Creating test member...')
    const createRes = await fetch(`${STRAPI_URL}/api/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          Name: TEST_NAME,
          Email: TEST_EMAIL,
          HideProfile: true,
          City: 'Test City',
          Province: 'Αττική',
          FieldsOfWork: 'Φωτογραφία',
          Bio: [{ type: 'paragraph', children: [{ type: 'text', text: 'E2E test account' }] }],
          ProfileImageAltText: '',
        },
      }),
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('Failed to create member:', errorText)
      process.exit(1)
    }

    const createData = await createRes.json()
    memberId = createData.data.id
    memberDocumentId = createData.data.documentId
    console.log(`Created test member: id=${memberId}, documentId=${memberDocumentId}`)
  }

  // 2. Hash the password
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10)

  // 3. Check if auth-token exists for this email
  console.log('Setting up auth-token...')
  const authFindRes = await fetch(
    `${STRAPI_URL}/api/auth-tokens?filters[email][$eq]=${encodeURIComponent(TEST_EMAIL)}`,
    { headers }
  )
  const authFindData = await authFindRes.json()

  if (authFindData.data && authFindData.data.length > 0) {
    const authToken = authFindData.data[0]
    await fetch(`${STRAPI_URL}/api/auth-tokens/${authToken.documentId || authToken.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        data: {
          passwordHash,
          tokenHash: null,
          tokenExpiry: null,
          tokenType: null,
        },
      }),
    })
    console.log('Updated existing auth-token with new password hash')
  } else {
    const createAuthRes = await fetch(`${STRAPI_URL}/api/auth-tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          email: TEST_EMAIL,
          passwordHash,
        },
      }),
    })

    if (!createAuthRes.ok) {
      const errorText = await createAuthRes.text()
      console.error('Failed to create auth-token:', errorText)
      process.exit(1)
    }
    console.log('Created auth-token with password hash')
  }

  console.log('\n✅ Test account ready!')
  console.log(`   Email:    ${TEST_EMAIL}`)
  console.log(`   Password: ${TEST_PASSWORD}`)
  console.log(`   Member:   id=${memberId}, documentId=${memberDocumentId}`)
  console.log('   HideProfile: true (invisible on website)\n')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
