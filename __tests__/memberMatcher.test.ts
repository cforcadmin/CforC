import { matchPayerToMembers, stripPatronymic } from '@/lib/memberMatcher'


describe('πατρώνυμο ΕΘΝΙΚΗΣ + απαίτηση δύο λέξεων (περιστατικό 16/8/2026)', () => {
  const members = [
    { docId: 'a', name: 'Γεωργία Γεωργίου', am: 15, email: 'g@example.com' },
    { docId: 'b', name: 'Κωνσταντίνα Γεωργίου', am: 14, email: 'k@example.com' },
    { docId: 'c', name: 'Χριστίνα Βλάχου', am: 10, email: 'c@example.com' },
    { docId: 'd', name: 'Ήρα-Ηλιάνα Παπαδοπούλου', am: 20, email: 'i@example.com' },
  ]

  it('ΔΕΝ προτείνει μέλος επειδή ταιριάζει το πατρώνυμο του πληρωτή', () => {
    const hits = matchPayerToMembers('VLACHOS                                 NIKOLAOS            GEORGIOS', members)
    expect(hits.map(h => h.name)).not.toContain('Γεωργία Γεωργίου')
    expect(hits.map(h => h.name)).not.toContain('Κωνσταντίνα Γεωργίου')
  })

  it('εξακολουθεί να βρίσκει το σωστό μέλος όταν ταιριάζουν όνομα ΚΑΙ επώνυμο', () => {
    const hits = matchPayerToMembers('GEORGIOU                                GEORGIA             IOANNIS', members)
    expect(hits[0]?.name).toBe('Γεωργία Γεωργίου')
  })

  it('το padded πατρώνυμο δεν εμποδίζει σωστό ταίριασμα (ΠΑΠΑΔΟΠΟΥΛΟΥ)', () => {
    const hits = matchPayerToMembers('PAPADOPOULOU                            IRA ILIANA          GAVRIIL', members)
    expect(hits[0]?.name).toBe('Ήρα-Ηλιάνα Παπαδοπούλου')
  })

  it('σκέτο επώνυμο δεν αρκεί για πρόταση', () => {
    const hits = matchPayerToMembers('VLACHOU', members)
    expect(hits).toHaveLength(0)
  })
})