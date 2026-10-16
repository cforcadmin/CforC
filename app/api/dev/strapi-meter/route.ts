import { NextResponse } from 'next/server'
import { snapshot, reset } from '@/lib/strapiMeter'

/**
 * Η μέτρηση των κλήσεων προς το Strapi — ΜΟΝΟ στην ανάπτυξη.
 *
 * GET    → τι μετρήθηκε ως τώρα, ανά είδος κλήσης
 * DELETE → μηδενίζει, για να μετρηθεί μια συγκεκριμένη ενέργεια καθαρά
 *
 * Στην παραγωγή απαντά 404: δεν υπάρχει λόγος να μαθαίνει ο κόσμος πόσο
 * κοστίζει κάθε οθόνη μας, και ο μετρητής δεν τρέχει καν εκεί.
 */
const guard = () => process.env.NODE_ENV === 'production'

export async function GET() {
  if (guard()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(snapshot())
}

export async function DELETE() {
  if (guard()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  reset()
  return NextResponse.json({ ok: true })
}
