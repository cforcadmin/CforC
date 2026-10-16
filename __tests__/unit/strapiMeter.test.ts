import { bucketOf, record, snapshot, reset } from '@/lib/strapiMeter'

/**
 * Ο μετρητής ομαδοποιεί ανά ΕΙΔΟΣ κλήσης. Χωρίς αυτό, κάθε documentId και
 * κάθε σελίδα γίνεται δική της γραμμή και το μοτίβο κρύβεται μέσα σε
 * εκατοντάδες μοναδικά URL. (16/10/2026)
 */
describe('Μετρητής κλήσεων Strapi', () => {
  beforeEach(() => reset())

  it('ομαδοποιεί συλλογή, μονήρη εγγραφή και σελιδοποίηση', () => {
    expect(bucketOf('https://x.strapiapp.com/api/members?fields[0]=Name')).toBe('members')
    expect(bucketOf('https://x.strapiapp.com/api/members?pagination[start]=100')).toBe('members +σελίδες')
    expect(bucketOf('https://x.strapiapp.com/api/oc-campaigns/abc123')).toBe('oc-campaigns (ένα)')
    expect(bucketOf('https://x.strapiapp.com/_health')).toBe('_health')
    expect(bucketOf('https://unrelated.example.com/thing')).toBeNull()
  })

  it('μετράει πλήθος και μέσο χρόνο ανά είδος', () => {
    record('https://x.strapiapp.com/api/members?a=1', 100)
    record('https://x.strapiapp.com/api/members?a=2', 300)
    record('https://x.strapiapp.com/api/events', 50)
    const s = snapshot()
    expect(s.total).toBe(3)
    expect(s.rows[0]).toEqual({ key: 'members', count: 2, avgMs: 200 })
    expect(s.rows[1]).toEqual({ key: 'events', count: 1, avgMs: 50 })
  })

  it('ο μηδενισμός καθαρίζει τα πάντα — αλλιώς δεν μετριέται ΜΙΑ ενέργεια', () => {
    record('https://x.strapiapp.com/api/members', 10)
    reset()
    expect(snapshot().total).toBe(0)
  })
})
