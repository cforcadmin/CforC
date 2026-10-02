/**
 * Το «δεν την έχω» έχει ΔΥΟ αιτίες, και μόνο η μία είναι 404.
 *
 * Πριν, και οι δύο κατέληγαν σε «αυτή η σελίδα δεν υπάρχει»: μια ψυχρή
 * εκκίνηση του Strapi έλεγε στον επισκέπτη ότι η δράση δεν υπάρχει.
 */
const notFoundError = new Error('NEXT_NOT_FOUND')

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => { throw notFoundError }),
}))

const getEventBySlug = jest.fn()
jest.mock('@/lib/strapi', () => ({ getEventBySlug: (...a: any[]) => getEventBySlug(...a) }))

import { loadEvent, loadEventForMetadata } from '@/lib/loadEvent'
import { notFound } from 'next/navigation'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { (console.error as jest.Mock).mockRestore?.() })

describe('loadEvent', () => {
  it('επιστρέφει τη δράση όταν υπάρχει', async () => {
    const ev = { Slug: 'midterm-2026', Title: 'Midterm' }
    getEventBySlug.mockResolvedValue(ev)
    await expect(loadEvent('midterm-2026')).resolves.toBe(ev)
    expect(notFound).not.toHaveBeenCalled()
  })

  it('ΔΕΝ υπάρχει τέτοια δράση → 404', async () => {
    getEventBySlug.mockResolvedValue(null)
    await expect(loadEvent('φάντασμα')).rejects.toBe(notFoundError)
    expect(notFound).toHaveBeenCalledTimes(1)
  })

  /* ΤΟ ΚΡΙΣΙΜΟ: αποτυχία δικτύου ΔΕΝ είναι «δεν υπάρχει» */
  it('αποτυχία του Strapi ΔΕΝ γίνεται 404 — ανεβαίνει', async () => {
    const boom = new Error('fetch failed')
    getEventBySlug.mockRejectedValue(boom)
    await expect(loadEvent('midterm-2026')).rejects.toBe(boom)
    expect(notFound).not.toHaveBeenCalled()
  })

  it('η αποτυχία καταγράφεται, για να βρεθεί μετά', async () => {
    getEventBySlug.mockRejectedValue(new Error('timeout'))
    await expect(loadEvent('midterm-2026')).rejects.toThrow('timeout')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('loadEventForMetadata', () => {
  it('δίνει τη δράση όταν υπάρχει', async () => {
    getEventBySlug.mockResolvedValue({ Title: 'Midterm' })
    await expect(loadEventForMetadata('x')).resolves.toEqual({ Title: 'Midterm' })
  })

  /* Εδώ η σιωπή ΕΙΝΑΙ σωστή: ένας τίτλος που λείπει δεν ρίχνει σελίδα */
  it('σε αποτυχία δίνει null αντί να ρίξει τη σελίδα', async () => {
    getEventBySlug.mockRejectedValue(new Error('fetch failed'))
    await expect(loadEventForMetadata('x')).resolves.toBeNull()
  })
  it('ούτε 404 καλεί', async () => {
    getEventBySlug.mockRejectedValue(new Error('fetch failed'))
    await loadEventForMetadata('x')
    expect(notFound).not.toHaveBeenCalled()
  })
})
