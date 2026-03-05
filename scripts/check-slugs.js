require('dotenv').config({ path: '.env.local' })
async function run() {
  const res = await fetch(process.env.STRAPI_URL + '/api/activities?fields[0]=Title&fields[1]=Slug&pagination[limit]=100&sort=id:asc', {
    headers: { Authorization: 'Bearer ' + process.env.STRAPI_API_TOKEN }
  })
  const data = await res.json()
  const missing = data.data.filter(a => !a.Slug)
  console.log('Total:', data.data.length)
  console.log('Missing slug:', missing.length)
  for (const a of missing) {
    console.log('  id:', a.id, '| docId:', a.documentId, '| Title:', a.Title)
  }
  if (missing.length === 0) {
    console.log('\nAll activities have slugs.')
  }
}
run()
