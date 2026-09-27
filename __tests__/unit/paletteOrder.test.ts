import { mergePaletteOrder, movePaletteChip } from '@/lib/blockOrder'

describe('Σειρά παλέτας', () => {
  const ALL = ['section', 'text', 'image', 'card']

  it('η αποθηκευμένη σειρά ισχύει', () => {
    expect(mergePaletteOrder(['card', 'image', 'text', 'section'], ALL))
      .toEqual(['card', 'image', 'text', 'section'])
  })

  it('στοιχείο που προστέθηκε αργότερα μπαίνει στο τέλος — ποτέ δεν χάνεται', () => {
    expect(mergePaletteOrder(['card', 'text'], ALL)).toEqual(['card', 'text', 'section', 'image'])
  })

  it('στοιχείο που καταργήθηκε πέφτει έξω', () => {
    expect(mergePaletteOrder(['δεν-υπάρχει', 'card'], ALL)).toEqual(['card', 'section', 'text', 'image'])
  })

  it('διπλοεγγραφή δεν διπλασιάζει chip', () => {
    const out = mergePaletteOrder(['card', 'card'], ALL)
    expect(out.filter(t => t === 'card')).toHaveLength(1)
    expect([...new Set(out)]).toHaveLength(ALL.length)
  })

  it('κενή αποθηκευμένη σειρά αφήνει τη φυσική', () => {
    expect(mergePaletteOrder([], ALL)).toEqual(ALL)
  })

  it('το chip πάει πριν από τον στόχο, προς τα πίσω και προς τα εμπρός', () => {
    expect(movePaletteChip(ALL, 'card', 'text')).toEqual(['section', 'card', 'text', 'image'])
    expect(movePaletteChip(ALL, 'section', 'card')).toEqual(['text', 'image', 'section', 'card'])
  })

  it('πάνω στον εαυτό του ή σε άγνωστο στόχο δεν αλλάζει τίποτα', () => {
    expect(movePaletteChip(ALL, 'card', 'card')).toEqual(ALL)
    expect(movePaletteChip(ALL, 'card', 'άγνωστο')).toEqual(ALL)
  })
})
