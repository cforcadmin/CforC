import {
  guard, checkSecretsPresent, judgeDeployment, judgeCertificate, judgeStrapi,
  judgeUnarchived, worstOf, EXPECTED_SECRETS, ago,
} from '@/lib/ocHealth'

describe('Ζωτικά — κρίση κατάστασης', () => {
  it('ένας έλεγχος που ρίχνει ΔΕΝ ρίχνει την οθόνη', async () => {
    const r = await guard('x', 'Χ', async () => { throw new Error('έσκασε') })
    expect(r.state).toBe('unknown')
    expect(r.detail).toBe('έσκασε')
  })

  it('έλεγχος που κολλάει κόβεται στον χρόνο του', async () => {
    const r = await guard('x', 'Χ', () => new Promise(() => {}), 50)
    expect(r.state).toBe('unknown')
    expect(r.detail).toMatch(/δεν απάντησε/)
  })

  describe('deployment', () => {
    it('αποτυχημένη τελευταία απόπειρα = ΒΛΑΒΗ, ακόμη κι αν η παραγωγή σηκώνεται', () => {
      // 27/9/2026: επτά ώρες με μπλοκαρισμένα builds και κανένα σήμα
      const r = judgeDeployment({ state: 'ERROR', sha: 'abc1234def', createdAt: Date.now() - 3600_000 })
      expect(r.state).toBe('down')
      expect(r.detail).toContain('abc1234')
      expect(r.action).toBeTruthy()
    })

    it('READY = εντάξει', () => {
      expect(judgeDeployment({ state: 'READY', sha: 'abc1234def', createdAt: Date.now() }).state).toBe('ok')
    })

    it('BUILDING = προσοχή, όχι βλάβη', () => {
      expect(judgeDeployment({ state: 'BUILDING', sha: 'a', createdAt: Date.now() }).state).toBe('warn')
    })

    it('κανένα deployment = άγνωστο, όχι «εντάξει»', () => {
      expect(judgeDeployment(null).state).toBe('unknown')
    })
  })

  describe('πιστοποιητικό', () => {
    it('ληγμένο = βλάβη', () => expect(judgeCertificate(-1).state).toBe('down'))
    it('14 ημέρες = βλάβη', () => expect(judgeCertificate(14).state).toBe('down'))
    it('30 ημέρες = προσοχή', () => expect(judgeCertificate(30).state).toBe('warn'))
    it('60 ημέρες = εντάξει', () => expect(judgeCertificate(60).state).toBe('ok'))
    it('αδιάβαστο = άγνωστο, ΟΧΙ εντάξει', () => expect(judgeCertificate(null).state).toBe('unknown'))
  })

  describe('Strapi', () => {
    it('αργή απόκριση = προσοχή (ψυχρή εκκίνηση)', () => {
      expect(judgeStrapi(true, 12000).state).toBe('warn')
    })
    it('γρήγορη = εντάξει', () => expect(judgeStrapi(true, 300).state).toBe('ok'))
    it('δεν απαντά = βλάβη', () => expect(judgeStrapi(false, 9000).state).toBe('down'))
  })

  describe('μυστικά', () => {
    it('αναφέρει ΟΝΟΜΑΤΑ που λείπουν, ποτέ τιμές', () => {
      const env: Record<string, string> = {}
      for (const k of EXPECTED_SECRETS) env[k] = 'τιμή-μυστικού'
      delete env.JWT_SECRET
      const r = checkSecretsPresent(env)
      expect(r.state).toBe('down')
      expect(r.detail).toContain('JWT_SECRET')
      expect(r.detail).not.toContain('τιμή-μυστικού')
    })

    it('κενή συμβολοσειρά μετράει ως ΛΕΙΠΕΙ', () => {
      const env: Record<string, string> = {}
      for (const k of EXPECTED_SECRETS) env[k] = 'x'
      env.CRON_SECRET = '   '
      expect(checkSecretsPresent(env).detail).toContain('CRON_SECRET')
    })

    it('όλα παρόντα = εντάξει', () => {
      const env: Record<string, string> = {}
      for (const k of EXPECTED_SECRETS) env[k] = 'x'
      expect(checkSecretsPresent(env).state).toBe('ok')
    })
  })

  it('εξοδολόγια χωρίς φάκελο = προσοχή, με οδηγία', () => {
    expect(judgeUnarchived(0).state).toBe('ok')
    const r = judgeUnarchived(2)
    expect(r.state).toBe('warn')
    expect(r.action).toContain('Επανάληψη')
  })

  describe('συνολική κατάσταση', () => {
    const c = (state: any) => ({ key: 'k', label: 'l', state, detail: '' })
    it('μία βλάβη κυριαρχεί', () => {
      expect(worstOf([c('ok'), c('warn'), c('down')])).toBe('down')
    })
    it('το άγνωστο ΔΕΝ περνά για εντάξει', () => {
      expect(worstOf([c('ok'), c('unknown')])).toBe('unknown')
    })
    it('όλα εντάξει', () => expect(worstOf([c('ok'), c('ok')])).toBe('ok'))
  })

  it('η ηλικία διαβάζεται από άνθρωπο', () => {
    expect(ago(new Date(Date.now() - 5 * 60000).toISOString())).toBe('πριν 5 λεπτά')
    expect(ago(null)).toBe('ποτέ')
    expect(ago('όχι ημερομηνία')).toBe('ποτέ')
  })
})

describe('Ομαδοποιημένος έλεγχος (αρχεία Google)', () => {
  const s = (key: string, label: string, state: any) => ({ key, label, state, detail: '' })

  it('η γραμμή παίρνει τη ΧΕΙΡΟΤΕΡΗ κατάσταση των αρχείων της', () => {
    const { summariseGroup } = require('@/lib/ocHealth')
    expect(summariseGroup([s('a', 'Α', 'ok'), s('b', 'Β', 'down')]).state).toBe('down')
    expect(summariseGroup([s('a', 'Α', 'ok'), s('b', 'Β', 'warn')]).state).toBe('warn')
    expect(summariseGroup([s('a', 'Α', 'ok'), s('b', 'Β', 'ok')]).state).toBe('ok')
  })

  it('ΟΝΟΜΑΤΙΖΕΙ τα προβληματικά — δεν χρειάζεται άνοιγμα για να μάθεις ποιο', () => {
    const { summariseGroup } = require('@/lib/ocHealth')
    const r = summariseGroup([
      s('finance', 'ΕΣΟΔΑ-ΕΞΟΔΑ', 'ok'),
      s('registry', 'CforC Μητρώο', 'down'),
      s('cal', 'Ημερολόγιο', 'ok'),
    ])
    expect(r.detail).toContain('2/3 εντάξει')
    expect(r.detail).toContain('CforC Μητρώο')
  })

  it('όλα καλά → σκέτος μετρητής χωρίς θόρυβο', () => {
    const { summariseGroup } = require('@/lib/ocHealth')
    expect(summariseGroup([s('a', 'Α', 'ok'), s('b', 'Β', 'ok')]).detail).toBe('2/2 εντάξει')
  })

  it('το «άγνωστο» μετράει ως πρόβλημα, όχι ως εντάξει', () => {
    const { summariseGroup } = require('@/lib/ocHealth')
    const r = summariseGroup([s('a', 'Α', 'ok'), s('b', 'Βήτα', 'unknown')])
    expect(r.state).toBe('unknown')
    expect(r.detail).toContain('Βήτα')
  })

  it('το αποσυρμένο MEMBERSHIP_WEBHOOK_SECRET δεν ζητείται πια', () => {
    const { EXPECTED_SECRETS } = require('@/lib/ocHealth')
    expect(EXPECTED_SECRETS).not.toContain('MEMBERSHIP_WEBHOOK_SECRET')
    expect(EXPECTED_SECRETS).toContain('SHEET_WEBAPP_URL')
  })
})

describe('Όρια χρόνου — προθεσμία απάντησης, όχι μέτρηση επίδοσης', () => {
  const { DEFAULT_CHECK_TIMEOUT_MS } = require('@/lib/ocHealth')

  /**
   * Το σφάλμα της 29/9/2026: το προεπιλεγμένο όριο ήταν 8s ενώ το judgeStrapi
   * έχει κλάδο για «απαντά αργά (12s) — πιθανή ψυχρή εκκίνηση». Ο κλάδος ήταν
   * νεκρός κώδικας: το όριο σκότωνε τον έλεγχο πρώτα και η οθόνη έλεγε
   * «Άγνωστο» για το πιο συνηθισμένο γεγονός της ημέρας.
   */
  it('το προεπιλεγμένο όριο αφήνει την ψυχρή εκκίνηση του Strapi να ΦΑΝΕΙ', () => {
    const coldStartMs = 12000
    expect(judgeStrapi(true, coldStartMs).state).toBe('warn')
    expect(DEFAULT_CHECK_TIMEOUT_MS).toBeGreaterThan(coldStartMs)
  })

  it('το όριο καλύπτει και τις ψυχρές εκκινήσεις του Strapi Cloud (10-30s δωρεάν πλάνο)', () => {
    expect(DEFAULT_CHECK_TIMEOUT_MS).toBeGreaterThanOrEqual(25000)
  })

  it('ένας αργός αλλά επιτυχής έλεγχος ΔΕΝ αποτυγχάνει', async () => {
    const r = await guard('x', 'Χ', async () => {
      await new Promise(res => setTimeout(res, 120))
      return { state: 'ok' as const, detail: 'άργησε αλλά απάντησε' }
    }, 400)
    expect(r.state).toBe('ok')
  })
})

describe('Προγραμματισμένες εργασίες', () => {
  const { judgeCronJob } = require('@/lib/ocHealth')
  const HOUR = 3_600_000
  const now = new Date('2026-09-29T12:00:00Z')
  const ago = (h: number) => new Date(now.getTime() - h * HOUR).toISOString()

  it('έτρεξε στην ώρα της και λέει ΤΙ έκανε', () => {
    const r = judgeCronJob('Υπενθυμίσεις', { Outcome: 'ok', StartedAt: ago(3), Summary: '4 email' }, 0, now)
    expect(r.state).toBe('ok')
    expect(r.detail).toContain('4 email')
  })

  it('«έτρεξε χωρίς να έχει δουλειά» ΔΕΝ μοιάζει με «δεν έτρεξε»', () => {
    const idle = judgeCronJob('Χ', { Outcome: 'ok', StartedAt: ago(3), Summary: 'καμία εκκρεμότητα' }, 0, now)
    // Η προθεσμία είναι ΜΕΤΑ το ξεκίνημα του ημερολογίου, άρα η απουσία μετράει
    const missing = judgeCronJob('Χ', null, 5 * HOUR, now, {
      dueAt: new Date(now.getTime() - 5 * HOUR),
      loggingSince: new Date(now.getTime() - 30 * HOUR),
    })
    expect(idle.state).toBe('ok')
    expect(missing.state).toBe('down')
    expect(missing.detail).toContain('καμία εκτέλεση')
  })

  it('σφάλμα = βλάβη, με το μήνυμα ορατό', () => {
    const r = judgeCronJob('Χ', { Outcome: 'error', StartedAt: ago(2), ErrorText: 'Strapi 502' }, 0, now)
    expect(r.state).toBe('down')
    expect(r.detail).toContain('Strapi 502')
  })

  it('ξεκίνησε και δεν τελείωσε ποτέ = βλάβη, ΞΕΧΩΡΙΣΤΗ από το σφάλμα', () => {
    const r = judgeCronJob('Χ', { Outcome: 'running', StartedAt: ago(4) }, 0, now)
    expect(r.state).toBe('down')
    expect(r.detail).toMatch(/δεν τελείωσε/)
  })

  it('τρέχει ΑΥΤΗ ΤΗ ΣΤΙΓΜΗ = εντάξει, όχι κολλημένο', () => {
    const r = judgeCronJob('Χ', { Outcome: 'running', StartedAt: new Date(now.getTime() - 20_000).toISOString() }, 0, now)
    expect(r.state).toBe('ok')
  })

  it('πέρασε η προθεσμία παρότι η προηγούμενη πέτυχε = βλάβη', () => {
    const r = judgeCronJob('Χ', { Outcome: 'ok', StartedAt: ago(50) }, 26 * HOUR, now)
    expect(r.state).toBe('down')
    expect(r.detail).toMatch(/αργεί/)
    expect(r.action).toBeTruthy()
  })

  /**
   * Η ΠΡΩΤΗ ΜΕΡΑ. Το προηγούμενο τεστ εδώ περνούσε `overdue = 0` μαζί με
   * `lastRun = null` — συνδυασμός που ΔΕΝ συμβαίνει ποτέ στην πραγματικότητα,
   * γιατί μια εργασία χωρίς εγγραφή έχει πάντα περάσει την προθεσμία της.
   * Περνούσε λοιπόν, ενώ στην παραγωγή και οι έξι εργασίες βγήκαν κόκκινες
   * (29/9/2026). Ίδιο λάθος με το όριο των 8s: κλάδος που τον επιβεβαιώνει
   * τεστ το οποίο δεν μπορεί να συμβεί.
   */
  describe('όταν το ημερολόγιο μόλις ξεκίνησε', () => {
    const loggingSince = new Date('2026-09-29T10:45:00Z')

    it('προθεσμία ΠΡΙΝ την πρώτη καταγραφή → άγνωστο, όχι βλάβη', () => {
      const dueAt = new Date('2026-09-29T08:00:00Z')   // έτρεξε, απλώς δεν το γράφαμε
      const r = judgeCronJob('Χ', null, 5 * HOUR, now, { dueAt, loggingSince })
      expect(r.state).toBe('unknown')
      expect(r.detail).toMatch(/δεν καταγραφόταν/)
    })

    it('μηνιαία εργασία με προθεσμία δύο εβδομάδες πριν → άγνωστο', () => {
      // «Συγχρονισμός απεγγραφών — αργεί 411h» ήταν ακριβώς αυτό
      const dueAt = new Date('2026-09-12T06:00:00Z')
      expect(judgeCronJob('Χ', null, 411 * HOUR, now, { dueAt, loggingSince }).state).toBe('unknown')
    })

    it('προθεσμία ΜΕΤΑ την πρώτη καταγραφή και καμία εγγραφή → ΒΛΑΒΗ στ\' αλήθεια', () => {
      const dueAt = new Date('2026-09-29T11:00:00Z')   // μετά το ξεκίνημα του ημερολογίου
      const r = judgeCronJob('Χ', null, 2 * HOUR, now, { dueAt, loggingSince })
      expect(r.state).toBe('down')
      expect(r.action).toBeTruthy()
    })

    it('τελείως άδειο ημερολόγιο → άγνωστο για όλα', () => {
      const r = judgeCronJob('Χ', null, 99 * HOUR, now, { dueAt: new Date('2026-09-01T09:00:00Z'), loggingSince: null })
      expect(r.state).toBe('unknown')
      expect(r.detail).toMatch(/μόλις ξεκίνησε/)
    })
  })
})
