/**
 * Strapi response-shape integration tests.
 *
 * These hit a real Strapi instance to verify the response shapes the app
 * depends on don't drift between versions. Run before/after a Strapi
 * upgrade to confirm compatibility.
 *
 * Run: npm run test:integration
 *
 * Required env vars (loaded from .env.local):
 *   - STRAPI_URL or NEXT_PUBLIC_STRAPI_URL
 *   - STRAPI_API_TOKEN or NEXT_PUBLIC_STRAPI_API_TOKEN
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.NEXT_PUBLIC_STRAPI_API_TOKEN

const HAS_STRAPI = Boolean(STRAPI_URL && STRAPI_TOKEN && !STRAPI_URL.includes('localhost:1337'))

const itIfStrapi = HAS_STRAPI ? it : it.skip
const describeIfStrapi = HAS_STRAPI ? describe : describe.skip

async function strapiGet(endpoint: string) {
  const url = `${STRAPI_URL}/api${endpoint}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
  expect(res.ok).toBe(true)
  return res.json()
}

beforeAll(() => {
  if (!HAS_STRAPI) {
    // eslint-disable-next-line no-console
    console.warn('[integration] STRAPI_URL/STRAPI_API_TOKEN not configured — skipping Strapi shape tests')
  }
})

describeIfStrapi('Strapi response shapes', () => {
  describe('Activities', () => {
    let activities: any[]

    itIfStrapi('GET /activities returns flat data array (v5 shape)', async () => {
      const json = await strapiGet('/activities?populate=Visuals&pagination[limit]=5')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.meta?.pagination).toBeDefined()
      activities = json.data
    })

    itIfStrapi('activity items have flat fields (no v4 attributes wrapper)', () => {
      if (!activities?.length) return
      const a = activities[0]
      expect(a.id).toBeDefined()
      expect(a.documentId).toBeDefined()
      expect(a).not.toHaveProperty('attributes')
      // App relies on these being directly on the object:
      expect(typeof a.Title === 'string' || a.Title === null).toBe(true)
    })

    itIfStrapi('populated Visuals has url + formats when present', () => {
      if (!activities?.length) return
      const withVisuals = activities.find((a: any) =>
        Array.isArray(a.Visuals) ? a.Visuals.length : a.Visuals?.url
      )
      if (!withVisuals) return
      const v = Array.isArray(withVisuals.Visuals) ? withVisuals.Visuals[0] : withVisuals.Visuals
      expect(v.url).toBeDefined()
      // formats may be absent for very small images, but if present should be an object
      if (v.formats) expect(typeof v.formats).toBe('object')
    })

    itIfStrapi('filter by Slug returns matching item', async () => {
      if (!activities?.length) return
      const slug = activities.find((a: any) => a.Slug)?.Slug
      if (!slug) return
      const json = await strapiGet(`/activities?filters[Slug][$eq]=${encodeURIComponent(slug)}`)
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0].Slug).toBe(slug)
    })
  })

  describe('Members', () => {
    let members: any[]

    itIfStrapi('GET /members?populate=* returns flat data array', async () => {
      const json = await strapiGet('/members?populate=*&pagination[limit]=5')
      expect(Array.isArray(json.data)).toBe(true)
      members = json.data
    })

    itIfStrapi('member items have flat fields and core scalars', () => {
      if (!members?.length) return
      const m = members[0]
      expect(m.id).toBeDefined()
      expect(m.documentId).toBeDefined()
      expect(m).not.toHaveProperty('attributes')
      expect(typeof m.Name === 'string' || m.Name === null).toBe(true)
      expect(typeof m.Email === 'string' || m.Email === null).toBe(true)
    })

    itIfStrapi('member responses must NOT leak passwordHash', () => {
      if (!members?.length) return
      for (const m of members) {
        expect(m.passwordHash).toBeUndefined()
      }
    })

    itIfStrapi('filter by Email[$eq] returns single matching member', async () => {
      if (!members?.length) return
      const email = members.find((m: any) => m.Email)?.Email
      if (!email) return
      const json = await strapiGet(`/members?filters[Email][$eq]=${encodeURIComponent(email)}`)
      expect(json.data.length).toBeGreaterThan(0)
      expect(json.data[0].Email).toBe(email)
    })

    itIfStrapi('GET /members/:documentId?populate=* returns single member', async () => {
      if (!members?.length) return
      const docId = members[0].documentId
      const json = await strapiGet(`/members/${docId}?populate=*`)
      expect(json.data).toBeDefined()
      expect(json.data.documentId).toBe(docId)
    })
  })

  describe('Open Calls', () => {
    itIfStrapi('GET /open-calls?populate=Image returns array', async () => {
      const json = await strapiGet('/open-calls?populate=Image&pagination[limit]=5')
      expect(Array.isArray(json.data)).toBe(true)
      if (json.data.length) {
        const o = json.data[0]
        expect(o.documentId).toBeDefined()
        expect(o).not.toHaveProperty('attributes')
      }
    })
  })

  describe('Newsletters', () => {
    itIfStrapi('GET /newsletters sorted by Date desc returns array', async () => {
      const json = await strapiGet('/newsletters?populate=Image&pagination[limit]=5&sort=Date:desc')
      expect(Array.isArray(json.data)).toBe(true)
    })
  })

  describe('Projects', () => {
    itIfStrapi('nested populate for projects returns relations', async () => {
      const json = await strapiGet(
        '/projects?populate[cover_image]=true&populate[partners][populate]=logo&populate[external_links]=true&pagination[limit]=3&sort=sort_order:asc'
      )
      expect(Array.isArray(json.data)).toBe(true)
      if (json.data.length) {
        const p = json.data[0]
        expect(p.documentId).toBeDefined()
        // partners is a relation — should be array (possibly empty) when populated
        expect(Array.isArray(p.partners)).toBe(true)
      }
    })
  })

  describe('Working Groups', () => {
    itIfStrapi('multi-relation populate works', async () => {
      const json = await strapiGet(
        '/working-groups?populate[Image]=true&populate[Coordinator][populate]=Image&populate[Members][populate]=Image&pagination[limit]=3'
      )
      expect(Array.isArray(json.data)).toBe(true)
      if (json.data.length) {
        const wg = json.data[0]
        expect(wg.documentId).toBeDefined()
        // Members should be an array when populated (may be empty)
        expect(Array.isArray(wg.Members)).toBe(true)
      }
    })
  })

  describe('Single types', () => {
    itIfStrapi('GET /hero-section?populate=* returns single object data', async () => {
      const json = await strapiGet('/hero-section?populate=*')
      // Single types return data as object, not array
      expect(json.data).toBeDefined()
      expect(Array.isArray(json.data)).toBe(false)
    })
  })

  describe('Pagination meta', () => {
    itIfStrapi('pagination[limit] is honored and meta is returned', async () => {
      const json = await strapiGet('/members?pagination[limit]=2')
      expect(json.data.length).toBeLessThanOrEqual(2)
      expect(json.meta?.pagination?.pageSize).toBeDefined()
    })
  })
})
