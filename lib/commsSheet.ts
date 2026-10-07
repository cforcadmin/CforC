/**
 * ΤΟ ΦΥΛΛΟ ΤΗΣ ΕΠΙΚΟΙΝΩΝΙΑΣ — GANTT και καταγραφή δημοσιεύσεων.
 *
 * Δύο καρτέλες, δύο εντελώς διαφορετικά πράγματα:
 *
 *  · «Comms_reporting» — επίπεδος πίνακας: μία γραμμή ανά δημοσίευση, με
 *    αριθμούς (Reach, Engagement) που συμπληρώνονται ΜΕΡΕΣ μετά. Γι' αυτό
 *    χρειάζεται διόρθωση, όχι μόνο προσθήκη.
 *
 *  · «GANTT_Comms_CforC» — πλέγμα: γραμμή ανά δράση/κανάλι, στήλη ανά ΜΕΡΑ.
 *    Οι μέρες ζουν στη γραμμή 2 («Δευ 16/02») και ο μήνας στη γραμμή 1.
 *
 * ΤΟ ΦΥΛΛΟ ΕΙΝΑΙ Η ΠΗΓΗ ΑΛΗΘΕΙΑΣ, ΟΧΙ ΑΝΤΙΓΡΑΦΟ. Άνθρωποι το δουλεύουν με
 * το χέρι την ίδια ώρα που το δουλεύει η οθόνη — γι' αυτό καμία ενέργεια
 * δεν βασίζεται σε αριθμό γραμμής που θυμήθηκε ο browser: η διαγραφή και η
 * διόρθωση ΞΑΝΑΔΙΑΒΑΖΟΥΝ και επιβεβαιώνουν το περιεχόμενο πρώτα. Αν κάποιος
 * πρόσθεσε γραμμή στο ενδιάμεσο, σταματάμε αντί να σβήσουμε τη διπλανή.
 */
import { getAccessToken, SCOPES } from '@/lib/googleAuth'

export const COMMS_SHEET_ID =
  process.env.COMMS_SHEET_ID || '1X8HZ5MkS48PZJ7LNwRvqh0xHz-Xa2M19bTZSTyYAZRc'

export const REPORTING_TAB = 'Comms_reporting'
export const GANTT_TAB = 'GANTT_Comms_CforC'

/** Οι δέκα στήλες του Comms_reporting, στη σειρά του φύλλου (A→J) */
export const REPORTING_COLUMNS = [
  'date', 'channels', 'contentTypes', 'title', 'link',
  'reach', 'engagement', 'opened', 'uniqueClicks', 'notes',
] as const
export type ReportingField = typeof REPORTING_COLUMNS[number]

export const REPORTING_LABELS: Record<ReportingField, string> = {
  date: 'Ημερομηνία',
  channels: 'Κανάλι',
  contentTypes: 'Είδος',
  title: 'Τίτλος / Θέμα',
  link: 'Σύνδεσμος',
  reach: 'Reach',
  engagement: 'Engagement',
  opened: 'Opened',
  uniqueClicks: 'Unique clicks',
  notes: 'Σημειώσεις',
}

export type ReportingRow = Record<ReportingField, string> & {
  /** Η γραμμή στο ΦΥΛΛΟ (1-based). Δεν είναι ταυτότητα — είναι θέση. */
  rowNumber: number
}

export interface GanttData {
  /** Ετικέτες γραμμών (στήλη A, από τη γραμμή 3 και κάτω) */
  rows: Array<{ rowNumber: number; label: string }>
  /** Μία ανά στήλη ημέρας */
  days: Array<{ col: number; colLetter: string; month: string; label: string }>
  /** cells[rowNumber][col] = περιεχόμενο */
  cells: Record<number, Record<number, string>>
}

const GREEK_MONTHS = [
  'ΙΑΝΟΥΑΡΙΟΣ', 'ΦΕΒΡΟΥΑΡΙΟΣ', 'ΜΑΡΤΙΟΣ', 'ΑΠΡΙΛΙΟΣ', 'ΜΑΪΟΣ', 'ΙΟΥΝΙΟΣ',
  'ΙΟΥΛΙΟΣ', 'ΑΥΓΟΥΣΤΟΣ', 'ΣΕΠΤΕΜΒΡΙΟΣ', 'ΟΚΤΩΒΡΙΟΣ', 'ΝΟΕΜΒΡΙΟΣ', 'ΔΕΚΕΜΒΡΙΟΣ',
]

const api = (path: string) => `https://sheets.googleapis.com/v4/spreadsheets/${COMMS_SHEET_ID}${path}`

export function commsSheetConfigured(): boolean {
  return !!COMMS_SHEET_ID
}

/** A, B, … Z, AA, AB … — το φύλλο έχει 123 στήλες, περνάει το Z */
export function colLetter(index1: number): string {
  let n = index1, out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

async function token(): Promise<string> {
  const t = await getAccessToken(SCOPES.sheetsWrite)
  if (!t) throw new Error('Δεν πάρθηκε token για το Google')
  return t
}

async function values(t: string, a1: string): Promise<string[][]> {
  const r = await fetch(api(`/values/${encodeURIComponent(a1)}`),
    { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
  if (!r.ok) throw new Error(`ανάγνωση ${r.status}`)
  return (await r.json())?.values || []
}

/**
 * Το gid της καρτέλας δεν γράφεται σταθερά πουθενά: διαβάζεται από τα
 * μεταδεδομένα. Ένα σταθερό gid είναι σωστό μέχρι να φτιάξει κάποιος
 * αντίγραφο του φύλλου, και τότε σβήνει γραμμές σε λάθος καρτέλα.
 */
async function tabId(t: string, title: string): Promise<number> {
  const r = await fetch(api('?fields=sheets(properties(sheetId,title))'),
    { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
  if (!r.ok) throw new Error(`μεταδεδομένα ${r.status}`)
  const found = ((await r.json())?.sheets || [])
    .find((s: any) => s?.properties?.title === title)
  if (!found) throw new Error(`δεν βρέθηκε η καρτέλα «${title}»`)
  return found.properties.sheetId
}

// ── Comms_reporting ──────────────────────────────────────────────────────

const toRow = (cells: string[], rowNumber: number): ReportingRow => {
  const out: any = { rowNumber }
  REPORTING_COLUMNS.forEach((key, i) => { out[key] = String(cells[i] ?? '').trim() })
  return out as ReportingRow
}

const toCells = (row: Partial<Record<ReportingField, string>>): string[] =>
  REPORTING_COLUMNS.map(key => String(row[key] ?? ''))

/** Όλες οι καταχωρήσεις, νεότερη πρώτη στην οθόνη — η σειρά του φύλλου μένει ως έχει. */
export async function readReporting(): Promise<ReportingRow[]> {
  const t = await token()
  const rows = await values(t, `${REPORTING_TAB}!A2:J1000`)
  return rows
    .map((cells, i) => toRow(cells, i + 2))
    // Κενές γραμμές στο τέλος του εύρους δεν είναι καταχωρήσεις
    .filter(r => r.date || r.title || r.channels)
}

export async function appendReporting(row: Partial<Record<ReportingField, string>>): Promise<number> {
  const t = await token()
  const existing = await readReporting()
  const nextRow = existing.length ? Math.max(...existing.map(r => r.rowNumber)) + 1 : 2
  const r = await fetch(
    api(`/values/${encodeURIComponent(`${REPORTING_TAB}!A${nextRow}:J${nextRow}`)}?valueInputOption=USER_ENTERED`),
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [toCells(row)] }),
    })
  if (!r.ok) throw new Error(`εγγραφή ${r.status}`)
  return nextRow
}

/**
 * Διόρθωση γραμμής — με ΕΠΙΒΕΒΑΙΩΣΗ του περιεχομένου πρώτα.
 *
 * `expect` είναι ό,τι έδειχνε η οθόνη όταν πατήθηκε η επεξεργασία. Αν στο
 * ενδιάμεσο κάποιος πρόσθεσε ή πέταξε γραμμή στο φύλλο, η θέση έχει μετακινηθεί
 * και θα γράφαμε πάνω σε ξένη καταχώρηση.
 */
export async function updateReporting(
  rowNumber: number,
  row: Partial<Record<ReportingField, string>>,
  expect: { date: string; title: string },
): Promise<void> {
  const t = await token()
  const current = await values(t, `${REPORTING_TAB}!A${rowNumber}:J${rowNumber}`)
  const now = toRow(current[0] || [], rowNumber)
  if (now.date !== expect.date || now.title !== expect.title) {
    throw new Error('Η γραμμή άλλαξε στο φύλλο στο μεταξύ — ανανέωσε και ξαναδοκίμασε')
  }
  const r = await fetch(
    api(`/values/${encodeURIComponent(`${REPORTING_TAB}!A${rowNumber}:J${rowNumber}`)}?valueInputOption=USER_ENTERED`),
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [toCells({ ...now, ...row })] }),
    })
  if (!r.ok) throw new Error(`εγγραφή ${r.status}`)
}

/** Διαγραφή γραμμής — ίδια επιβεβαίωση, και σβήνει ΤΗ ΓΡΑΜΜΗ, όχι τα κελιά. */
export async function deleteReporting(
  rowNumber: number,
  expect: { date: string; title: string },
): Promise<void> {
  const t = await token()
  const current = await values(t, `${REPORTING_TAB}!A${rowNumber}:J${rowNumber}`)
  const now = toRow(current[0] || [], rowNumber)
  if (now.date !== expect.date || now.title !== expect.title) {
    throw new Error('Η γραμμή άλλαξε στο φύλλο στο μεταξύ — ανανέωσε και ξαναδοκίμασε')
  }
  const sheetId = await tabId(t, REPORTING_TAB)
  const r = await fetch(api(':batchUpdate'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
        },
      }],
    }),
  })
  if (!r.ok) throw new Error(`διαγραφή ${r.status}`)
}

// ── GANTT ────────────────────────────────────────────────────────────────

/**
 * Το πλέγμα, όπως είναι. Γραμμή 1 = μήνας, γραμμή 2 = μέρα, από τη 3 τα
 * δεδομένα. Ο μήνας γράφεται ΜΙΑ φορά πάνω από την πρώτη του στήλη και
 * μετά είναι κενός — οπότε «κρατιέται» μέχρι να αλλάξει.
 */
export async function readGantt(): Promise<GanttData> {
  const t = await token()
  const grid = await values(t, `${GANTT_TAB}!A1:DZ40`)
  const monthRow = grid[0] || []
  const dayRow = grid[1] || []

  /**
   * Ο ΜΗΝΑΣ ΒΓΑΙΝΕΙ ΑΠΟ ΤΗΝ ΙΔΙΑ ΤΗΝ ΗΜΕΡΟΜΗΝΙΑ, όχι από τη γραμμή 1.
   *
   * Η γραμμή 1 γράφει τον μήνα ΜΙΑ φορά και μετά τον αφήνει κενό, οπότε μια
   * «μεταφορά της τελευταίας τιμής» μοιάζει σωστή — και δεν είναι: το φύλλο
   * έχει στήλες μέχρι «Τετ 17/06» ενώ η γραμμή 1 σταματά στον ΑΠΡΙΛΙΟ, άρα
   * Μάιος και Ιούνιος κατέληγαν κάτω από την καρτέλα «ΑΠΡΙΛΙΟΣ» (μετρημένο
   * 7/10/2026 στο πραγματικό φύλλο). Η ετικέτα «Δευ 16/02» λέει τον μήνα της
   * μόνη της· η γραμμή 1 μένει μόνο ως εφεδρεία.
   */
  const days: GanttData['days'] = []
  let carried = ''
  for (let i = 1; i < dayRow.length; i++) {
    if (String(monthRow[i] ?? '').trim()) carried = String(monthRow[i]).trim()
    const label = String(dayRow[i] ?? '').trim()
    if (!label) continue
    const m = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(label)
    const monthNo = m ? Number(m[2]) : 0
    const month = monthNo >= 1 && monthNo <= 12 ? GREEK_MONTHS[monthNo - 1] : carried
    days.push({ col: i + 1, colLetter: colLetter(i + 1), month, label })
  }

  const rows: GanttData['rows'] = []
  const cells: GanttData['cells'] = {}
  for (let r = 2; r < grid.length; r++) {
    const label = String(grid[r]?.[0] ?? '').trim()
    if (!label) continue
    const rowNumber = r + 1
    rows.push({ rowNumber, label })
    cells[rowNumber] = {}
    for (const d of days) {
      const v = String(grid[r]?.[d.col - 1] ?? '').trim()
      if (v) cells[rowNumber][d.col] = v
    }
  }
  return { rows, days, cells }
}

/** Ένα κελί τη φορά — όση ακρίβεια έχει και η επεξεργασία στην οθόνη. */
export async function updateGanttCell(rowNumber: number, col: number, value: string): Promise<void> {
  const t = await token()
  const a1 = `${GANTT_TAB}!${colLetter(col)}${rowNumber}`
  const r = await fetch(api(`/values/${encodeURIComponent(a1)}?valueInputOption=USER_ENTERED`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[value]] }),
  })
  if (!r.ok) throw new Error(`εγγραφή ${r.status}`)
}
