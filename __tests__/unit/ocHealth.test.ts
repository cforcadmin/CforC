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
