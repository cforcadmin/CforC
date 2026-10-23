import { snapshotsToRotate, SNAPSHOT_PREFIX, MASTER_PREFIX, MIRROR_NAME, KEEP_SNAPSHOTS, BACKUP_ITEMS } from '@/lib/driveBackup'

/**
 * Η ΑΠΑΙΤΗΣΗ: «ένα master αντίγραφο, και τα τελευταία πέντε· το έκτο σβήνει
 * το παλιότερο αλλά ΠΟΤΕ το master».
 *
 * Το κόστος ενός λάθους εδώ δεν είναι σφάλμα στην οθόνη — είναι το μοναδικό
 * αμετάβλητο αντίγραφο στον κάδο, και κανείς δεν το μαθαίνει μέχρι να το
 * χρειαστεί.
 */
const FOLDER = 'application/vnd.google-apps.folder'
const snap = (d: string) => ({ name: `${SNAPSHOT_PREFIX} ${d}`, mimeType: FOLDER })

describe('snapshotsToRotate', () => {
  it('δεν σβήνει τίποτα όσο είναι ως πέντε', () => {
    const five = ['2026-01-04','2026-01-11','2026-01-18','2026-01-25','2026-02-01'].map(snap)
    expect(snapshotsToRotate(five)).toEqual([])
  })

  it('το έκτο σβήνει ΤΟ ΠΑΛΙΟΤΕΡΟ, ένα μόνο', () => {
    const six = ['2026-01-04','2026-01-11','2026-01-18','2026-01-25','2026-02-01','2026-02-08'].map(snap)
    const out = snapshotsToRotate(six)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe(`${SNAPSHOT_PREFIX} 2026-01-04`)
  })

  /** ΤΟ ΚΡΙΣΙΜΟ. Αν αυτό σπάσει, χάνεται το μόνο αντίγραφο που δεν ξαναγίνεται. */
  it('ΠΟΤΕ δεν αγγίζει τον MASTER, ούτε με δέκα στιγμιότυπα', () => {
    const many = Array.from({ length: 10 }, (_, i) => snap(`2026-03-${String(i + 1).padStart(2, '0')}`))
    const all = [{ name: `${MASTER_PREFIX} 2026-01-01`, mimeType: FOLDER }, ...many]
    const out = snapshotsToRotate(all)
    expect(out).toHaveLength(5)
    expect(out.some(f => f.name.startsWith(MASTER_PREFIX))).toBe(false)
  })

  /** Ο MASTER μπαίνει με ημερομηνία ΠΑΛΙΟΤΕΡΗ απ' όλα — το δελεαστικό λάθος
   *  θα ήταν «ταξινόμησε όλους τους φακέλους και κόψε τον τελευταίο». */
  it('ο MASTER αγνοείται ακόμη κι όταν είναι ο παλιότερος φάκελος', () => {
    const all = [
      { name: `${MASTER_PREFIX} 2020-01-01`, mimeType: FOLDER },
      ...['2026-01-04','2026-01-11','2026-01-18','2026-01-25','2026-02-01','2026-02-08'].map(snap),
    ]
    expect(snapshotsToRotate(all).map(f => f.name)).toEqual([`${SNAPSHOT_PREFIX} 2026-01-04`])
  })

  it('το κάτοπτρο δεν είναι στιγμιότυπο και δεν περιστρέφεται ΠΟΤΕ', () => {
    const all = [
      { name: MIRROR_NAME, mimeType: FOLDER },
      ...Array.from({ length: 9 }, (_, i) => snap(`2026-04-0${i + 1}`)),
    ]
    expect(snapshotsToRotate(all).some(f => f.name === MIRROR_NAME)).toBe(false)
  })

  it('αγνοεί ό,τι δεν είναι φάκελος', () => {
    const all = [
      { name: `${SNAPSHOT_PREFIX} 2026-01-04`, mimeType: 'application/pdf' },
      ...['2026-01-11','2026-01-18','2026-01-25','2026-02-01','2026-02-08'].map(snap),
    ]
    expect(snapshotsToRotate(all)).toEqual([])
  })
})

describe('ο κατάλογος', () => {
  it('κρατά πέντε στιγμιότυπα εκτός του MASTER', () => expect(KEEP_SNAPSHOTS).toBe(5))

  it('δεν έχει διπλό id — ένα αρχείο δύο φορές θα ήταν σιωπηλή σπατάλη', () => {
    const ids = BACKUP_ITEMS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('κάθε εγγραφή έχει id και ελληνική ετικέτα', () => {
    for (const i of BACKUP_ITEMS) {
      expect(i.id).toMatch(/^[0-9A-Za-z_-]{20,}$/)
      expect(i.label.trim().length).toBeGreaterThan(0)
    }
  })
})
