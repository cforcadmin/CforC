const jwt = require('jsonwebtoken')
const crypto = require('crypto')
require('dotenv').config({ path: '.env.local' })

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const JWT_SECRET = process.env.JWT_SECRET

// Your token from the email
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJJZCI6IjExNCIsImVtYWlsIjoiY29udGFjdEB5b3J5b3NzdHlsLmNvbSIsInR5cGUiOiJtYWdpYy1saW5rIiwiaWF0IjoxNzY0ODgzMTk0LCJleHAiOjE3NjQ5MDQ3OTR9.RegySd1GP3r6epBRRRhWf6NfyGA90J0Byx0Y_MCE-r0'

console.log('🔍 Testing Token Verification\n')
console.log('Token:', token)
console.log('')

// Step 1: Verify JWT
console.log('Step 1: Verifying JWT token...')
try {
  const decoded = jwt.verify(token, JWT_SECRET)
  console.log('✅ JWT verification successful')
  console.log('Decoded:', JSON.stringify(decoded, null, 2))
  console.log('')

  // Step 2: Hash the token
  console.log('Step 2: Hashing token for database lookup...')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  console.log('TokenHash:', tokenHash)
  console.log('')

  // Step 3: Query Strapi
  console.log('Step 3: Querying Strapi for auth-token...')
  const queryUrl = `${STRAPI_URL}/api/auth-tokens?filters[email][$eq]=${encodeURIComponent(decoded.email)}&filters[tokenHash][$eq]=${tokenHash}&filters[tokenType][$eq]=magic-link`
  console.log('Query URL:', queryUrl)
  console.log('')

  fetch(queryUrl, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_API_TOKEN}`
    }
  })
  .then(res => {
    console.log('Strapi Response Status:', res.status)
    return res.json()
  })
  .then(data => {
    console.log('Strapi Response Data:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    if (!data.data || data.data.length === 0) {
      console.log('❌ NO MATCHING TOKEN FOUND IN DATABASE')
      console.log('')
      console.log('Let me check what tokens exist for this email...')

      // Query without tokenHash filter to see what exists
      return fetch(`${STRAPI_URL}/api/auth-tokens?filters[email][$eq]=${encodeURIComponent(decoded.email)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`
        }
      })
      .then(res => res.json())
      .then(allTokens => {
        console.log('All tokens for this email:')
        console.log(JSON.stringify(allTokens, null, 2))
      })
    } else {
      console.log('✅ Token found in database!')
      const authToken = data.data[0]
      console.log('Auth Token:', JSON.stringify(authToken, null, 2))

      // Check expiry
      const expiryDate = new Date(authToken.attributes?.tokenExpiry || authToken.tokenExpiry)
      const now = new Date()
      console.log('')
      console.log('Token Expiry:', expiryDate)
      console.log('Current Time:', now)
      console.log('Is Expired:', expiryDate < now)
    }
  })
  .catch(err => {
    console.error('❌ Strapi query failed:', err)
  })

} catch (error) {
  console.error('❌ JWT verification failed:', error.message)
}
