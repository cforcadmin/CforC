import { finalPaymentNoticeEmailHtml, approvedLegacyEmailHtml } from '@/lib/ocEmails'

const DEADLINE = 'Τρίτη 29 Σεπτεμβρίου 2026'
const mail = () => finalPaymentNoticeEmailHtml('Μίνα', 'https://example.test/claim/abc', DEADLINE)

describe('Τελευταία ειδοποίηση πληρωμής', () => {
  it('δεν αναφέρει πουθενά προθεσμία 30 ημερών', () => {
    expect(mail().html).not.toMatch(/30 ημερ/)
  })

  it('ανακοινώνει τη συγκεκριμένη ημερομηνία, και στο θέμα', () => {
    const m = mail()
    expect(m.html).toContain(DEADLINE)
    expect(m.subject).toBe(`Εκκρεμεί η εγγραφή σου — προθεσμία ${DEADLINE}`)
  })

  it('είναι συνέχεια προηγούμενης επικοινωνίας, όχι ανακοίνωση έγκρισης', () => {
    const html = mail().html
    expect(html).toContain('Σε συνέχεια της προηγούμενης επικοινωνίας')
    expect(html).not.toContain('ΤΟ ΑΙΤΗΜΑ ΕΓΓΡΑΦΗΣ ΣΟΥ ΕΓΚΡΙΘΗΚΕ')
    expect(html).toContain('ΕΚΚΡΕΜΕΙ Η ΕΓΓΡΑΦΗ ΣΟΥ')
  })

  it('προειδοποιεί για διαγραφή και νέα αίτηση από την αρχή', () => {
    const html = mail().html
    expect(html).toContain('διαγράφουμε όλα τα προσωπικά σου στοιχεία')
    expect(html).toContain('νέα αίτηση από την αρχή')
  })

  it('κρατά ποσά, IBAN και το κουμπί δήλωσης πληρωμής', () => {
    const html = mail().html
    expect(html).toContain('45,00 €')
    expect(html).toContain('GR7101401420142002320005140')
    expect(html).toContain('https://example.test/claim/abc')
  })

  it('κρατά το αίτημα για φωτογραφία και ΑΦΜ, χωρίς βιογραφικό', () => {
    const html = mail().html
    expect(html).toContain('ΧΡΕΙΑΖΟΜΑΣΤΕ ΑΚΟΜΗ ΔΥΟ ΠΡΑΓΜΑΤΑ')
    // Βιογραφικό ΔΕΝ ζητάμε — το έχουν ήδη δώσει στην αίτηση
    expect(html).not.toContain('Βιογραφικό για το προφίλ σου')
  })

  it('ΔΕΝ πειράζει το πρότυπο των νέων εγκρίσεων', () => {
    const legacy = approvedLegacyEmailHtml('Μίνα', 'https://example.test/claim/abc')
    expect(legacy.subject).toBe('Έγκριση αιτήματος εγγραφής — Culture for Change')
    expect(legacy.html).toContain('ΤΟ ΑΙΤΗΜΑ ΕΓΓΡΑΦΗΣ ΣΟΥ ΕΓΚΡΙΘΗΚΕ')
    expect(legacy.html).toMatch(/30 ημερ/)
  })

  it('το κουτί κάθεται ΑΜΕΣΩΣ κάτω από το κουμπί, πριν την παράγραφο της πλατφόρμας', () => {
    for (const html of [mail().html, approvedLegacyEmailHtml('Μίνα', 'https://example.test/c').html]) {
      const button = html.indexOf('Έκανα την κατάθεση')
      const box = html.indexOf('ΧΡΕΙΑΖΟΜΑΣΤΕ ΑΚΟΜΗ ΔΥΟ ΠΡΑΓΜΑΤΑ')
      const after = html.indexOf('Στην <a href="https://cultureforchange.net"')
      expect(button).toBeGreaterThan(-1)
      expect(box).toBeGreaterThan(button)
      expect(box).toBeLessThan(after)
    }
  })
})
