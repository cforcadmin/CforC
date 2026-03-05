/**
 * Simulate what the activity detail page does client-side
 * Tests through the proxy endpoint at localhost:3000
 */
async function run() {
  const slug = 'S.i.ma kick off'
  console.log('Testing slug:', slug)
  console.log('')

  // Step 1: getActivityById - slug filter (new code path)
  const slugFilterUrl = `http://localhost:3000/api/strapi/activities?filters[Slug][$eq]=${encodeURIComponent(slug)}&populate=*`
  console.log('1. Slug filter URL:', slugFilterUrl)
  try {
    const r1 = await fetch(slugFilterUrl)
    console.log('   Status:', r1.status, r1.ok ? 'OK' : 'FAIL')
    const d1 = await r1.json()
    console.log('   Results:', d1.data ? d1.data.length : 'no data field')
    if (d1.data && d1.data.length > 0) {
      console.log('   Title:', d1.data[0].Title)
      console.log('   Has Description:', !!d1.data[0].Description)
      console.log('   Has Visuals:', !!d1.data[0].Visuals)
      console.log('   Visuals count:', d1.data[0].Visuals ? d1.data[0].Visuals.length : 0)
    }
  } catch (err) {
    console.log('   ERROR:', err.message)
  }

  console.log('')

  // Step 2: getActivities (for related activities)
  const activitiesUrl = 'http://localhost:3000/api/strapi/activities?populate=Visuals&pagination[limit]=1000'
  console.log('2. All activities URL:', activitiesUrl)
  try {
    const r2 = await fetch(activitiesUrl)
    console.log('   Status:', r2.status, r2.ok ? 'OK' : 'FAIL')
    const d2 = await r2.json()
    console.log('   Results:', d2.data ? d2.data.length : 'no data field')
  } catch (err) {
    console.log('   ERROR:', err.message)
  }
}

run().catch(err => console.error('Fatal:', err))
