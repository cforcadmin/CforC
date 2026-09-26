import { NextRequest, NextResponse } from 'next/server'
import { drainCampaigns } from '@/lib/campaignDrain'

export const maxDuration = 300

/**
 * Η ημερήσια παρτίδα της ουράς. Όλη η λογική ζει στο lib/campaignDrain —
 * την ίδια καλεί και το OC αμέσως μετά το «Αποστολή», ώστε μια μικρή αποστολή
 * να μην περιμένει το πρωί. Κοινός κώδικας με import, όχι κλήση route σε route.
 */

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Το `!CRON_SECRET` ΔΕΝ είναι περιττό: χωρίς τη μεταβλητή η σύγκριση γίνεται
  // με «Bearer undefined» και περνά όποιος το στείλει.
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const started = Date.now()
    const r = await drainCampaigns()
    return NextResponse.json({
      success: true, ...r, seconds: Math.round((Date.now() - started) / 1000),
    })
  } catch (err) {
    console.error('[CAMPAIGN-DRAIN] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
