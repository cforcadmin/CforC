import { readFlag, writeFlag } from '@/lib/clientFlags'

/** Ελάχιστη αποθήκη· `blocked` προσομοιώνει private mode / αποκλεισμένα site data */
function store(blocked = false) {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => { if (blocked) throw new Error('blocked'); return data.has(k) ? data.get(k)! : null },
    setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); data.set(k, v) },
  }
}
function install(local: any, session: any) {
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'sessionStorage', { value: session, configurable: true, writable: true })
}

describe('σημαίες browser — «μία φορά» ακόμη και χωρίς μόνιμη αποθήκη', () => {
  it('γράφει και στις δύο αποθήκες', () => {
    const l = store(), s = store(); install(l, s)
    writeFlag('k', '1')
    expect(l.data.get('k')).toBe('1')
    expect(s.data.get('k')).toBe('1')
    expect(readFlag('k')).toBe('1')
  })

  it('όταν το localStorage είναι αποκλεισμένο, θυμάται μέσω sessionStorage', () => {
    const l = store(true), s = store(); install(l, s)
    writeFlag('cookieConsent', 'declined')
    expect(readFlag('cookieConsent')).toBe('declined')
    expect(s.data.get('cookieConsent')).toBe('declined')
  })

  it('όταν και οι δύο είναι αποκλεισμένες, δεν πετάει — επιστρέφει null', () => {
    install(store(true), store(true))
    expect(() => writeFlag('k', '1')).not.toThrow()
    expect(readFlag('k')).toBeNull()
  })

  it('άγνωστο κλειδί → null', () => {
    install(store(), store())
    expect(readFlag('δεν-υπάρχει')).toBeNull()
  })

  it('το localStorage προηγείται του sessionStorage', () => {
    const l = store(), s = store(); install(l, s)
    l.setItem('k', 'accepted'); s.setItem('k', 'declined')
    expect(readFlag('k')).toBe('accepted')
  })
})
