import {
  resolveSeatContext, maySeatAct, canWearSeats, parseSeatMode,
  seatRefusalMessage, attributionFor, effectiveSeat, isActingAsOtherSeat,
} from '@/lib/ocSeatMode'
import type { OcSeat } from '@/lib/ocRoles'

const IT: OcSeat[] = ['it']
const IT_FIN: OcSeat[] = ['it', 'financer']
const COMMS: OcSeat[] = ['comms']

describe('canWearSeats', () => {
  it('μόνο το IT φοράει άλλες έδρες', () => {
    expect(canWearSeats(IT)).toBe(true)
    expect(canWearSeats(IT_FIN)).toBe(true)
    expect(canWearSeats(COMMS)).toBe(false)
    expect(canWearSeats([])).toBe(false)
  })
})

describe('parseSeatMode', () => {
  it('διαβάζει «έδρα:κατάσταση»', () => {
    expect(parseSeatMode('financer:view')).toEqual({ seat: 'financer', mode: 'view' })
    expect(parseSeatMode('comms:act')).toEqual({ seat: 'comms', mode: 'act' })
  })
  it.each(['', 'financer', 'financer:', ':view', 'financer:delete', 'a:view', '../../etc:view'])(
    'απορρίπτει σκουπίδια: %s', raw => expect(parseSeatMode(raw)).toBeNull())
})

describe('resolveSeatContext', () => {
  it('χωρίς φορεμένη έδρα: η δική του', () => {
    const c = resolveSeatContext(IT_FIN, 'financer', null)
    expect(c).toMatchObject({ activeSeat: 'financer', wearing: null, mode: 'own' })
  })
  it('μία μόνο έδρα: επιλέγεται μόνη της', () => {
    expect(resolveSeatContext(COMMS, null, null).activeSeat).toBe('comms')
  })

  it('IT σε προεπισκόπηση άλλης έδρας', () => {
    const c = resolveSeatContext(IT, 'it', 'financer:view')
    expect(c).toMatchObject({ activeSeat: 'financer', wearing: 'financer', mode: 'view' })
  })
  it('IT ενεργώντας ως άλλη έδρα', () => {
    expect(resolveSeatContext(IT, 'it', 'comms:act').mode).toBe('act')
  })

  /* ΤΟ ΦΡΑΓΜΑ: πλαστό cookie από έδρα που ΔΕΝ είναι IT δεν ισχύει ποτέ */
  it('μη-IT δεν φοράει τίποτα, ό,τι κι αν λέει το cookie', () => {
    const c = resolveSeatContext(COMMS, 'comms', 'financer:act')
    expect(c).toMatchObject({ activeSeat: 'comms', wearing: null, mode: 'own' })
  })
  it('έδρα που ήδη κατέχει δεν «φοριέται» — είναι δική του', () => {
    const c = resolveSeatContext(IT_FIN, 'it', 'financer:view')
    expect(c.wearing).toBeNull()
    expect(c.mode).toBe('own')
  })
})

describe('maySeatAct', () => {
  it('δική του έδρα: ναι', () => {
    expect(maySeatAct(resolveSeatContext(IT_FIN, 'financer', null), 'financer')).toBe(true)
  })
  /* Η προεπισκόπηση ΔΕΝ εκτελεί — αυτό είναι όλο της το νόημα */
  it('προεπισκόπηση: ΟΧΙ', () => {
    expect(maySeatAct(resolveSeatContext(IT, 'it', 'financer:view'), 'financer')).toBe(false)
  })
  it('ενεργώ ως: ναι', () => {
    expect(maySeatAct(resolveSeatContext(IT, 'it', 'financer:act'), 'financer')).toBe(true)
  })
  it('άλλη έδρα από τη ζητούμενη: όχι', () => {
    expect(maySeatAct(resolveSeatContext(IT, 'it', 'comms:act'), 'financer')).toBe(false)
  })
})

describe('attributionFor — ό,τι γίνεται, φαίνεται ποιος το έκανε', () => {
  it('ενεργώντας ως άλλη έδρα, το όνομα κουβαλά την αλήθεια', () => {
    const ctx = resolveSeatContext(IT, 'it', 'financer:act')
    expect(attributionFor(ctx, 'Γιώργος Στυλ', 'Ταμίας')).toBe('Γιώργος Στυλ (IT ως Ταμίας)')
  })
  it('στη δική του έδρα, σκέτο το όνομα', () => {
    const ctx = resolveSeatContext(IT_FIN, 'financer', null)
    expect(attributionFor(ctx, 'Γιώργος Στυλ', 'Ταμίας')).toBe('Γιώργος Στυλ')
  })
})

describe('seatRefusalMessage', () => {
  it('στην προεπισκόπηση λέει ΠΩΣ να προχωρήσει', () => {
    const ctx = resolveSeatContext(IT, 'it', 'financer:view')
    expect(seatRefusalMessage(ctx, 'financer', 'Ταμίας')).toMatch(/Ενεργώ ως Ταμίας/)
  })
})

/* Η έδρα ΤΩΝ ΕΝΕΡΓΕΙΩΝ — διαφέρει από αυτήν της οθόνης, επίτηδες */
describe('effectiveSeat', () => {

  it('δική του έδρα: η ίδια', () => {
    expect(effectiveSeat(IT_FIN, 'financer', null)).toBe('financer')
  })
  it('μία μόνο έδρα, χωρίς cookie', () => {
    expect(effectiveSeat(COMMS, null, null)).toBe('comms')
  })

  /* ΤΟ ΚΡΙΣΙΜΟ: στην προεπισκόπηση οι ενέργειες κρίνονται με τη ΔΙΚΗ του */
  it('προεπισκόπηση: επιστρέφει τη ΔΙΚΗ του, ώστε να απορρίπτονται οι ξένες', () => {
    expect(effectiveSeat(IT, 'it', 'financer:view')).toBe('it')
  })
  it('ενεργώ ως: επιστρέφει τη ΦΟΡΕΜΕΝΗ', () => {
    expect(effectiveSeat(IT, 'it', 'financer:act')).toBe('financer')
  })

  /* Το φράγμα του πλαστού cookie μένει */
  it('μη-IT με cookie «act»: αγνοείται', () => {
    expect(effectiveSeat(COMMS, 'comms', 'financer:act')).toBe('comms')
  })
  it('κακοσχηματισμένο cookie: αγνοείται', () => {
    expect(effectiveSeat(IT, 'it', 'financer:delete')).toBe('it')
  })
  it('χωρίς έδρες: null', () => {
    expect(effectiveSeat([], null, null)).toBeNull()
  })
})

/**
 * Η εξαίρεση της απόδειξης. Ο αριθμός παίρνεται από ακολουθία και δεν
 * γυρίζει πίσω — δύο πόρτες τον βγάζουν (/api/oc/receipts και το «Πληρώθηκε»
 * στο /api/oc/applications/payment) και οι δύο ρωτούν ΑΥΤΟ.
 */
describe('isActingAsOtherSeat', () => {
  it('«ενεργώ ως» ξένη έδρα: ναι', () => {
    expect(isActingAsOtherSeat(IT, 'it', 'financer:act')).toBe(true)
  })
  it('προεπισκόπηση: όχι — εκεί απορρίπτει ήδη το φράγμα του Ταμία', () => {
    expect(isActingAsOtherSeat(IT, 'it', 'financer:view')).toBe(false)
  })
  it('η ΔΙΚΗ σου έδρα δεν είναι «φορεμένη», ακόμη κι αν το cookie λέει act', () => {
    expect(isActingAsOtherSeat(['it', 'financer'], 'financer', 'financer:act')).toBe(false)
  })
  it('καμία φορεμένη έδρα: όχι', () => {
    expect(isActingAsOtherSeat(IT_FIN, 'financer', null)).toBe(false)
  })
  it('μη-IT με πλαστό cookie: όχι — δεν φόρεσε ποτέ τίποτα', () => {
    expect(isActingAsOtherSeat(COMMS, 'comms', 'financer:act')).toBe(false)
  })
})
