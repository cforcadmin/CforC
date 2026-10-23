/**
 * Εβδομαδιαίο αντίγραφο ασφαλείας των αρχείων Google του OC.
 *
 * ΤΡΙΑ ΠΡΑΓΜΑΤΑ ΠΟΥ ΜΕΤΡΗΘΗΚΑΝ ΠΡΙΝ ΓΡΑΦΤΕΙ ΓΡΑΜΜΗ (23/10/2026):
 *
 * 1. Ο ΠΡΟΟΡΙΣΜΟΣ ΠΡΕΠΕΙ ΝΑ ΕΙΝΑΙ ΚΟΙΝΟΧΡΗΣΤΟΣ ΔΙΣΚΟΣ. Ένας λογαριασμός
 *    υπηρεσίας έχει ΜΗΔΕΝ δικό του χώρο (`limit 0.00 GB`). Σε απλό φάκελο
 *    «Ο δίσκος μου» το αντίγραφο ανήκει σε αυτόν που το έφτιαξε, άρα η πρώτη
 *    κιόλας αντιγραφή θα έσκαγε με `storageQuotaExceeded`. Σε Κοινόχρηστο
 *    δίσκο τα αρχεία ανήκουν στον ΔΙΣΚΟ. Δοκιμάστηκε με αληθινή αντιγραφή 3 KB.
 *
 * 2. ΤΟ ΣΒΗΣΙΜΟ ΓΙΝΕΤΑΙ ΜΕ ΚΑΔΟ, ΟΧΙ ΜΕ ΟΡΙΣΤΙΚΗ ΔΙΑΓΡΑΦΗ. Ο λογαριασμός
 *    είναι Συνεισφέρων: `canDelete=false`, `canTrash=true`. Αυτό ΕΙΝΑΙ η
 *    σωστή ρύθμιση και μένει: μια εργασία που τρέχει μόνη της κάθε βδομάδα
 *    δεν πρέπει να μπορεί να καταστρέψει τίποτα οριστικά. Ο κάδος του
 *    Κοινόχρηστου δίσκου αδειάζει μόνος του στις 30 μέρες — δηλαδή κάθε λάθος
 *    αυτού του αρχείου έχει έναν μήνα αναίρεσης.
 *
 * 3. ΤΑ ASSETS ΔΕΝ ΜΠΑΙΝΟΥΝ ΣΤΗΝ ΠΕΡΙΣΤΡΟΦΗ. Είναι 486 MB σε 83 αρχεία,
 *    αμετάβλητα από τον Αύγουστο. Έξι αντίγραφα θα ήταν 2,9 GB για να
 *    προστατευτεί κάτι που δεν αλλάζει. Παίρνουν ΕΝΑ κάτοπτρο που μόνο
 *    προσθέτει.
 *
 * Ο ΜΑΣΤΟΡΑΣ (MASTER) ΔΕΝ ΑΓΓΙΖΕΤΑΙ ΠΟΤΕ. Η περιστροφή κοιτάζει μόνο φακέλους
 * με το πρόθεμα των στιγμιοτύπων· ο MASTER έχει άλλο πρόθεμα και είναι
 * αόρατος σε αυτήν — όχι «εξαιρείται με έλεγχο», αλλά δεν μπαίνει καν στη λίστα.
 */
import { getAccessToken, SCOPES } from '@/lib/googleAuth'
import { LIBRARY_FOLDER_ID } from '@/lib/googleDrive'
import { AGENDA_DOC_ID } from '@/lib/googleDocs'
import { CONTRACTS_SHEET_ID } from '@/lib/contractsSheet'
import { COMMS_SHEET_ID } from '@/lib/commsSheet'
import { LIBRARY_SHEET_ID } from '@/lib/librarySheet'

/** Ο Κοινόχρηστος δίσκος των αντιγράφων. Χωρίς αυτόν δεν τρέχει τίποτα. */
export const BACKUP_FOLDER_ID = process.env.BACKUP_DRIVE_FOLDER_ID || '10Vlq8DfkTCnUKaq2K5H9asfrmqgRSf3X'

/** Τα δύο φύλλα που ως τώρα ζούσαν ΜΟΝΟ πίσω από Apps Script — το repo δεν
 *  ήξερε καν το id τους. Βρέθηκαν στις 23/10/2026 και μπαίνουν εδώ ώστε να
 *  μη χρειαστεί να ξαναβρεθούν. */
export const REGISTRY_SHEET_ID = process.env.REGISTRY_SHEET_ID || '1T5DFs0acLy0n4pupGSK5SKaP1FwwauHtstN1-lPZA5U'
export const FINANCE_SHEET_ID = process.env.FINANCE_SHEET_ID || '1N239Kix5eSWqSneVOwgbjFHMqrN851i2V2LO7v7H-d8'

export const SNAPSHOT_PREFIX = 'ΣΤΙΓΜΙΟΤΥΠΟ'
export const MASTER_PREFIX = 'MASTER'
export const MIRROR_NAME = 'ΚΑΤΟΠΤΡΟ Assets_documents'
/** Πόσα στιγμιότυπα κρατάμε ΕΚΤΟΣ του MASTER. Το έκτο σβήνει το παλιότερο. */
export const KEEP_SNAPSHOTS = 5

export interface BackupItem { id: string; label: string; kind: 'file' | 'folder' }

/**
 * Ο κατάλογος. Αν προστεθεί αρχείο Google στο OC, μπαίνει ΕΔΩ — αλλιώς δεν
 * φυλάσσεται, και κανείς δεν το μαθαίνει μέχρι να το χρειαστεί.
 */
export const BACKUP_ITEMS: BackupItem[] = [
  { id: REGISTRY_SHEET_ID,  label: 'CforC Μητρώο',                       kind: 'file' },
  { id: FINANCE_SHEET_ID,   label: 'OC-ΕΣΟΔΑ ΕΞΟΔΑ',                     kind: 'file' },
  { id: AGENDA_DOC_ID,      label: 'Ημερήσια διάταξη & πρακτικά',        kind: 'file' },
  { id: CONTRACTS_SHEET_ID, label: 'Μητρώο Συμβάσεων & Πληρωμών',        kind: 'file' },
  { id: LIBRARY_SHEET_ID,   label: 'Λίστα περιεχομένων βιβλιοθήκης',     kind: 'file' },
  { id: COMMS_SHEET_ID,     label: 'GANTT Επικοινωνίας',                 kind: 'file' },
  { id: '1tP5RUg8nIBJgiDRC3J0A7mOZiNsJtiwU',             label: 'Συμμετοχή MeetUpCafé',        kind: 'file' },
  { id: '1z5K7ERtQUaJS81g90gPTx9nM__SItEuCwht158SoDyc',  label: 'Προτάσεις κινητικότητας',     kind: 'file' },
  { id: '1h5Pbmua2J1pcUZ1KiftufmaiVasCM-8T',             label: 'Απολογισμός δραστηριότητας',  kind: 'file' },
  { id: '1YLT-EJnUO5SLGe-l7Fh2sWaORTGEXzLb',             label: 'Newsletter μελών',            kind: 'file' },
  { id: '1noVKWOFnN0MdO3Tv_z6ad6P1HXwPAMhdB8ZUjh1KOP0',  label: 'Newsletter κοινού',           kind: 'file' },
  { id: '1tdpmHrksjuOE3DIe1rpkMzVfu1uz9M8ZquRyxh_Byjw',  label: 'Διορθώσεις & Προτάσεις',      kind: 'file' },
  { id: '1IP8B8DBDYRU5r-R2LlzMT_294FI7yh62',             label: 'Προϋπολογισμοί',              kind: 'folder' },
]

/** Το κάτοπτρο: μόνο προσθέτει, ποτέ δεν σβήνει. */
export const MIRROR_SOURCE_ID = LIBRARY_FOLDER_ID

const API = 'https://www.googleapis.com/drive/v3/files'
const ALL = 'supportsAllDrives=true&includeItemsFromAllDrives=true'

export interface DriveChild {
  id: string; name: string; mimeType: string
  modifiedTime?: string
  appProperties?: Record<string, string>
}

export const isFolder = (m: string) => m === 'application/vnd.google-apps.folder'

async function token(): Promise<string> {
  const t = await getAccessToken(SCOPES.driveWrite)
  if (!t) throw new Error('Δεν δόθηκε διακριτικό Google για εγγραφή στο Drive')
  return t
}

/** Όλα τα παιδιά ενός φακέλου, με σελιδοποίηση. Χωρίς το `ALL` γυρίζει ΚΕΝΟ
 *  με status 200 για μοιρασμένους φακέλους — μας το έχει κοστίσει ήδη. */
export async function listChildren(tok: string, folderId: string): Promise<DriveChild[]> {
  const out: DriveChild[] = []
  let page: string | undefined
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
    const url = `${API}?q=${q}&fields=nextPageToken,files(id,name,mimeType,modifiedTime,appProperties)`
      + `&pageSize=1000&${ALL}${page ? `&pageToken=${page}` : ''}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` }, cache: 'no-store' })
    if (!r.ok) throw new Error(`Drive list ${folderId}: HTTP ${r.status}`)
    const j: any = await r.json()
    out.push(...(j.files || []))
    page = j.nextPageToken
  } while (page)
  return out
}

export async function createFolder(tok: string, name: string, parent: string): Promise<string> {
  const r = await fetch(`${API}?supportsAllDrives=true&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: [parent], mimeType: 'application/vnd.google-apps.folder' }),
  })
  const j: any = await r.json().catch(() => null)
  if (!r.ok || !j?.id) throw new Error(`Δεν φτιάχτηκε φάκελος «${name}»: ${j?.error?.message || `HTTP ${r.status}`}`)
  return j.id
}

export async function copyFile(
  tok: string, fileId: string, name: string, parent: string,
  appProperties?: Record<string, string>,
): Promise<string> {
  const r = await fetch(`${API}/${fileId}/copy?supportsAllDrives=true&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: [parent], ...(appProperties && { appProperties }) }),
  })
  const j: any = await r.json().catch(() => null)
  if (!r.ok || !j?.id) throw new Error(`${j?.error?.message || `HTTP ${r.status}`}`)
  return j.id
}

/** Στον κάδο — ΟΧΙ οριστική διαγραφή. Βλ. σημείωση 2 στην κορυφή. */
export async function trashItem(tok: string, id: string): Promise<boolean> {
  const r = await fetch(`${API}/${id}?supportsAllDrives=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  })
  return r.ok
}

/** Αντιγράφει φάκελο ΜΕ τα περιεχόμενά του, αναδρομικά. Το Drive δεν έχει
 *  «αντιγραφή φακέλου» — γίνεται με το χέρι, αρχείο-αρχείο. */
async function copyTree(tok: string, srcId: string, name: string, parent: string): Promise<number> {
  const dest = await createFolder(tok, name, parent)
  let n = 0
  for (const child of await listChildren(tok, srcId)) {
    if (isFolder(child.mimeType)) n += await copyTree(tok, child.id, child.name, dest)
    else { await copyFile(tok, child.id, child.name, dest); n++ }
  }
  return n
}

/**
 * ΠΟΙΑ ΣΤΙΓΜΙΟΤΥΠΑ ΦΕΥΓΟΥΝ. Καθαρή συνάρτηση επίτηδες: είναι η μόνη απόφαση
 * εδώ μέσα που μπορεί να ΧΑΣΕΙ δεδομένα, και πρέπει να δοκιμάζεται χωρίς
 * δίκτυο, χωρίς Drive και χωρίς να περιμένουμε έξι βδομάδες.
 *
 * Ο MASTER δεν «εξαιρείται» — δεν περνάει καν το φίλτρο, γιατί έχει άλλο
 * πρόθεμα. Δεν υπάρχει μονοπάτι που να τον φτάνει.
 */
export function snapshotsToRotate<T extends { name: string; mimeType: string }>(
  children: T[], keep = KEEP_SNAPSHOTS,
): T[] {
  return children
    .filter(f => isFolder(f.mimeType) && f.name.startsWith(SNAPSHOT_PREFIX))
    .sort((a, b) => b.name.localeCompare(a.name))   // ISO ημερομηνία: νεότερο πρώτο
    .slice(keep)
}

export interface ItemResult { label: string; ok: boolean; detail: string }

export interface BackupReport {
  date: string
  snapshotFolder: string | null
  isMaster: boolean
  items: ItemResult[]
  mirror: { added: number; updated: number; total: number; errors: string[] }
  rotated: string[]
  ok: boolean
}

/**
 * ΜΙΑ εβδομαδιαία εκτέλεση.
 *
 * Κάθε αρχείο αναφέρεται ΞΕΧΩΡΙΣΤΑ: μια αποτυχία δεν κρύβεται πίσω από
 * πράσινη εκτέλεση, και ξέρεις ποιο ακριβώς να ξαναζητήσεις.
 */
export async function runBackup(today: string): Promise<BackupReport> {
  const tok = await token()
  const report: BackupReport = {
    date: today, snapshotFolder: null, isMaster: false, items: [],
    mirror: { added: 0, updated: 0, total: 0, errors: [] }, rotated: [], ok: true,
  }

  const root = await listChildren(tok, BACKUP_FOLDER_ID)

  // ── 1. MASTER: φτιάχνεται ΜΟΝΟ την πρώτη φορά και δεν ξαναγγίζεται ──
  const hasMaster = root.some(f => isFolder(f.mimeType) && f.name.startsWith(MASTER_PREFIX))
  report.isMaster = !hasMaster
  const folderName = hasMaster ? `${SNAPSHOT_PREFIX} ${today}` : `${MASTER_PREFIX} ${today}`

  // Ξανατρέξιμο την ίδια μέρα δεν φτιάχνει δεύτερο φάκελο.
  const existing = root.find(f => isFolder(f.mimeType) && f.name === folderName)
  const snapshot = existing?.id || await createFolder(tok, folderName, BACKUP_FOLDER_ID)
  report.snapshotFolder = folderName

  const already = existing ? new Set((await listChildren(tok, snapshot)).map(f => f.name)) : new Set<string>()

  // ── 2. Τα έγγραφα ──
  for (const item of BACKUP_ITEMS) {
    if (already.has(item.label)) { report.items.push({ label: item.label, ok: true, detail: 'υπήρχε ήδη' }); continue }
    try {
      if (item.kind === 'folder') {
        const n = await copyTree(tok, item.id, item.label, snapshot)
        report.items.push({ label: item.label, ok: true, detail: `${n} αρχεία` })
      } else {
        await copyFile(tok, item.id, item.label, snapshot)
        report.items.push({ label: item.label, ok: true, detail: 'αντιγράφηκε' })
      }
    } catch (err) {
      report.ok = false
      report.items.push({ label: item.label, ok: false, detail: err instanceof Error ? err.message : String(err) })
    }
  }

  // ── 3. Το κάτοπτρο των assets: προσθέτει, ΔΕΝ σβήνει ──
  try {
    const mirrorId = root.find(f => isFolder(f.mimeType) && f.name === MIRROR_NAME)?.id
      || await createFolder(tok, MIRROR_NAME, BACKUP_FOLDER_ID)
    const [src, dst] = await Promise.all([listChildren(tok, MIRROR_SOURCE_ID), listChildren(tok, mirrorId)])
    // Κλειδί η ΠΗΓΗ, όχι το όνομα: μετονομασία στην πηγή δεν γεννά διπλό.
    const seen = new Map(dst.filter(f => f.appProperties?.srcId).map(f => [f.appProperties!.srcId, f]))
    report.mirror.total = src.filter(f => !isFolder(f.mimeType)).length
    for (const f of src) {
      if (isFolder(f.mimeType)) continue
      const mine = seen.get(f.id)
      const props = { srcId: f.id, srcModified: f.modifiedTime || '' }
      try {
        if (!mine) { await copyFile(tok, f.id, f.name, mirrorId, props); report.mirror.added++ }
        else if (mine.appProperties?.srcModified !== f.modifiedTime) {
          // Το παλιό ΜΕΝΕΙ. Η νέα εκδοχή μπαίνει δίπλα, με ημερομηνία.
          await copyFile(tok, f.id, `${f.name} (${today})`, mirrorId, props)
          report.mirror.updated++
        }
      } catch (err) {
        report.mirror.errors.push(`${f.name}: ${err instanceof Error ? err.message : String(err)}`)
        report.ok = false
      }
    }
  } catch (err) {
    report.mirror.errors.push(err instanceof Error ? err.message : String(err))
    report.ok = false
  }

  // ── 4. Περιστροφή. Ο MASTER ΔΕΝ ΜΠΑΙΝΕΙ ΚΑΝ ΣΤΗ ΛΙΣΤΑ ──
  for (const old of snapshotsToRotate(await listChildren(tok, BACKUP_FOLDER_ID))) {
    if (await trashItem(tok, old.id)) report.rotated.push(old.name)
    else { report.ok = false; report.mirror.errors.push(`δεν μπήκε στον κάδο: ${old.name}`) }
  }

  return report
}
