require('dotenv').config({ path: '.env.local' })
async function run() {
  const res = await fetch(process.env.STRAPI_URL + '/api/activities?fields[0]=Title&pagination[limit]=100&sort=Title:asc', {
    headers: { Authorization: 'Bearer ' + process.env.STRAPI_API_TOKEN }
  })
  const data = await res.json()
  console.log('Total activities:', data.meta.pagination.total)
  const allCaps = data.data.filter(a => {
    const letters = a.Title.match(/\p{L}/gu) || []
    if (letters.length === 0) return false
    const upper = letters.filter(c => c === c.toLocaleUpperCase('el') && c !== c.toLocaleLowerCase('el')).length
    return upper / letters.length > 0.6
  })
  if (allCaps.length > 0) {
    console.log('\nStill ALL CAPS (' + allCaps.length + '):')
    for (const a of allCaps) console.log('  id:', a.id, '|', a.Title)
  } else {
    console.log('\nNo ALL CAPS titles remaining')
  }
}
run()
