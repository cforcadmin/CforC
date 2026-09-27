import { moveUp, moveDown, moveToBottom, moveGroupTo } from '@/lib/blockOrder'

const L = ['a', 'b', 'c', 'd', 'e']

describe('Μετακίνηση ενός μπλοκ', () => {
  it('πάνω και κάτω', () => {
    expect(moveUp(L, [2]).items).toEqual(['a', 'c', 'b', 'd', 'e'])
    expect(moveDown(L, [2]).items).toEqual(['a', 'b', 'd', 'c', 'e'])
  })

  it('η επιλογή ακολουθεί το στοιχείο', () => {
    expect(moveUp(L, [2]).selection).toEqual([1])
    expect(moveDown(L, [2]).selection).toEqual([3])
  })

  it('στα όρια δεν συμβαίνει τίποτα', () => {
    expect(moveUp(L, [0]).items).toEqual(L)
    expect(moveDown(L, [4]).items).toEqual(L)
  })
})

describe('Πολλαπλή επιλογή', () => {
  it('γειτονικά κινούνται μαζί', () => {
    expect(moveUp(L, [2, 3]).items).toEqual(['a', 'c', 'd', 'b', 'e'])
    expect(moveDown(L, [1, 2]).items).toEqual(['a', 'd', 'b', 'c', 'e'])
  })

  it('με κενά κρατούν τις αποστάσεις τους', () => {
    expect(moveUp(L, [1, 3]).items).toEqual(['b', 'a', 'd', 'c', 'e'])
  })

  it('μπλοκάρει αν ΕΝΑ από τα επιλεγμένα είναι στο όριο', () => {
    // Αλλιώς η ομάδα θα «κατέρρεε» πάνω στο πρώτο στοιχείο
    expect(moveUp(L, [0, 2]).items).toEqual(L)
    expect(moveDown(L, [2, 4]).items).toEqual(L)
  })
})

describe('Στο τέλος όλων', () => {
  it('ένα στοιχείο πάει τελευταίο', () => {
    const r = moveToBottom(L, [1])
    expect(r.items).toEqual(['a', 'c', 'd', 'e', 'b'])
    expect(r.selection).toEqual([4])
  })

  it('πολλά κρατούν τη σειρά τους', () => {
    expect(moveToBottom(L, [0, 2]).items).toEqual(['b', 'd', 'e', 'a', 'c'])
  })

  it('ό,τι είναι ήδη τελευταίο δεν αλλάζει', () => {
    expect(moveToBottom(L, [4]).items).toEqual(L)
  })
})

describe('Σύρσιμο ομάδας', () => {
  it('μεταφέρει προς τα πάνω', () => {
    expect(moveGroupTo(L, [3, 4], 1).items).toEqual(['a', 'd', 'e', 'b', 'c'])
  })

  it('μεταφέρει προς τα κάτω — ο στόχος μετατοπίζεται σωστά', () => {
    // Αφαιρώντας στοιχεία από πάνω, η θέση-στόχος ανεβαίνει· χωρίς αυτό η
    // ομάδα προσγειωνόταν μία θέση πιο κάτω απ' όσο έδειχνε ο δείκτης
    expect(moveGroupTo(L, [0, 1], 3).items).toEqual(['c', 'a', 'b', 'd', 'e'])
  })

  it('στο τέλος', () => {
    expect(moveGroupTo(L, [0], 5).items).toEqual(['b', 'c', 'd', 'e', 'a'])
  })

  it('κενή επιλογή δεν πειράζει τίποτα', () => {
    expect(moveGroupTo(L, [], 2).items).toEqual(L)
    expect(moveToBottom(L, []).items).toEqual(L)
  })

  it('αγνοεί άκυρους δείκτες', () => {
    expect(moveUp(L, [99, 2]).items).toEqual(['a', 'c', 'b', 'd', 'e'])
  })
})
