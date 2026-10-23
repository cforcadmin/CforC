import { NextRequest, NextResponse } from 'next/server'
import { athensToday } from '@/lib/events'
import { recordRun, triggerOf, type RunNote } from '@/lib/ocRunLog'
import { runBackup, BACKUP_ITEMS, KEEP_SNAPSHOTS } from '@/lib/driveBackup'

/**
 * Το εβδομαδιαίο αντίγραφο των αρχείων Google του OC.
 *
 * 300s γιατί η ΠΡΩΤΗ εκτέλεση αντιγράφει και τα 83 αρχεία των assets (486 MB)
 * μαζί με τα έγγραφα. Αν παρ' όλα αυτά κοπεί στη μέση, ΔΕΝ χάλασε τίποτα: το
 * κάτοπτρο ξαναμετράει κάθε φορά τι λείπει, οπότε μια δεύτερη εκτέλεση το
 * τελειώνει. Οι επόμενες βδομάδες αντιγράφουν μόνο τα 13 έγγραφα.
 */
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET

function authorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) return true
  return !!request.headers.get('x-vercel-cron')
}

async function runJob(request: NextRequest, log: RunNote) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 401 })
  }

  const today = athensToday()
  try {
    const r = await runBackup(today)
    const failed = r.items.filter(i => !i.ok)

    log.note(r.isMaster ? `MASTER ${today} (πρώτη εκτέλεση)` : String(r.snapshotFolder))
    log.note(`έγγραφα ${r.items.length - failed.length}/${BACKUP_ITEMS.length}`)
    log.note(r.mirror.added || r.mirror.updated
      ? `κάτοπτρο +${r.mirror.added} νέα, ${r.mirror.updated} ενημερώσεις (σύνολο ${r.mirror.total})`
      : `κάτοπτρο αμετάβλητο (${r.mirror.total})`)
    if (r.rotated.length) log.note(`στον κάδο: ${r.rotated.join(', ')}`)
    if (failed.length) log.note(`ΑΠΕΤΥΧΑΝ: ${failed.map(f => `${f.label} (${f.detail})`).join(' · ')}`)
    if (r.mirror.errors.length) log.note(`σφάλματα κατόπτρου: ${r.mirror.errors.slice(0, 5).join(' · ')}`)

    return NextResponse.json({ ...r, keep: KEEP_SNAPSHOTS }, { status: r.ok ? 200 : 500 })
  } catch (err) {
    /**
     * Το σφάλμα γίνεται 500 ΚΑΙ σημείωση· δεν ξαναρίχνεται, ώστε το μήνυμα να
     * φτάσει στα Ζωτικά αντί να χαθεί σε αρχείο καταγραφής που δεν διαβάζει κανείς.
     */
    const msg = err instanceof Error ? err.message : String(err)
    log.note(`ΣΦΑΛΜΑ: ${msg}`)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return recordRun('/api/cron/drive-backup', log => runJob(request, log), { trigger: triggerOf(request) })
}
