import { toSenderTime, fillTagsForTest } from '@/lib/senderCampaigns'

/**
 * Ό,τι μπορεί να ελεγχθεί χωρίς δίκτυο. Οι κλήσεις προς τον Sender
 * ελέγχονται στη διαδρομή, με mock.
 */
describe('Ώρα προγραμματισμού', () => {
  it('γίνεται «Y-m-d H:i:s» χωρίς ζώνη ώρας', () => {
    // Ο Sender δεν δέχεται ISO· ένα «Z» θα ερμηνευόταν ως άλλη ώρα
    const out = toSenderTime(new Date(2026, 9, 15, 8, 5, 3).toISOString())
    expect(out).toBe('2026-10-15 08:05:03')
    expect(out).not.toContain('T')
    expect(out).not.toContain('Z')
  })

  it('μηδενικά μπροστά σε μονοψήφια', () => {
    expect(toSenderTime(new Date(2026, 0, 2, 3, 4, 5).toISOString())).toBe('2026-01-02 03:04:05')
  })

  it('άκυρη ημερομηνία επιστρέφει null αντί για σκουπίδια', () => {
    expect(toSenderTime('όχι ημερομηνία')).toBeNull()
    expect(toSenderTime('')).toBeNull()
  })
})

describe('Δοκιμαστική αποστολή', () => {
  it('γεμίζει τις ετικέτες του Sender με δείγματα', () => {
    // Ο Sender δεν έχει endpoint δοκιμής· η δοκιμή φεύγει από εμάς, οπότε οι
    // ετικέτες δεν θα γέμιζαν μόνες τους και ο συντάκτης θα έβλεπε άγκιστρα
    const out = fillTagsForTest('<p>Γεια σου {{ firstname }} {{ lastname }}</p>')
    expect(out).toBe('<p>Γεια σου Μαρία Παπαδοπούλου</p>')
  })

  it('ουδετεροποιεί τον σύνδεσμο απεγγραφής', () => {
    const out = fillTagsForTest('<a href="{{unsubscribe_link}}">{{unsubscribe_text}}</a>')
    expect(out).toBe('<a href="#">Απεγγραφή</a>')
    expect(out).not.toContain('{{')
  })

  it('δεν αγγίζει δικά μας πεδία που δεν υποστηρίζει ο Sender', () => {
    // Μένουν ορατά ώστε να φανεί το λάθος ΠΡΙΝ φύγει σε 400 ανθρώπους
    expect(fillTagsForTest('ΑΜ {{ΑΜ}}')).toBe('ΑΜ {{ΑΜ}}')
  })
})
