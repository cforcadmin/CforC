import { NextRequest, NextResponse } from 'next/server'
import { syncUnsubscribes } from '@/lib/newsletterUnsubscribes'

export const maxDuration = 300

/**
 * Μηνιαίος συγχρονισμός απεγγραφών — ο Sender είναι η πηγή αλήθειας.
 *
 * Τρέχει στις 12 κάθε μήνα, πριν από την αποστολή του newsletter, ώστε να μη
 * φύγει γράμμα σε κανέναν που έχει ζητήσει να φύγει. Όλη η λογική ζει στο
 * lib/newsletterUnsubscribes — κοινός κώδικας με import, όχι κλήση route σε
 * route.
 *
 * `?dry=1` δείχνει τι ΘΑ έσβηνε χωρίς να σβήσει τίποτα.
 */

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Το `!CRON_SECRET` ΔΕΝ είναι περιττό: χωρίς τη μεταβλητή η σύγκριση γίνεται
  // με «Bearer undefined» και περνά όποιος το στείλει.
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const dryRun = request.nextUrl.searchParams.get('dry') === '1'
    const started = Date.now()
    const r = await syncUnsubscribes({ dryRun })
    if (!r.ok) console.error('[UNSUB-SYNC] σταμάτησε:', r.stopped)
    return NextResponse.json({ ...r, dryRun, seconds: Math.round((Date.now() - started) / 1000) })
  } catch (err) {
    console.error('[UNSUB-SYNC] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
