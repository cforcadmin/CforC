import { computeTotals, eventCap, countCoTravellers, MIDTERM_2026 } from '@/lib/expenseClaims'
const L = (amount: number) => ({ category: 'Ταξίδι', receiptType: '', description: '', date: '', dateEnd: '', amount, files: [] as any[] })
const run = (total: number, co: string[], advance = 0) => {
  const cap = eventCap(MIDTERM_2026.label, countCoTravellers(co))
  return computeTotals([L(total)] as any, advance, cap)
}
describe('Midterm 2026 — όριο κάλυψης', () => {
  it('μόνος, κάτω από το όριο → ακριβώς όσα ξόδεψε', () => expect(run(30, []).payable).toBe(30))
  it('μόνος, πάνω από το όριο → 40', () => expect(run(45, []).payable).toBe(40))
  it('Λάρισα 35 € → 35', () => expect(run(35, []).payable).toBe(35))
  it('προκαταβολή: 100 έξοδα, 30 προκαταβολή → 10', () => expect(run(100, [], 30).payable).toBe(10))
  it('δύο άτομα, 70 € → 70', () => expect(run(70, ['Α Β']).payable).toBe(70))
  it('δύο άτομα, 95 € → 80', () => expect(run(95, ['Α Β']).payable).toBe(80))
  it('τρία άτομα, 200 € → 120', () => expect(run(200, ['Α Β', 'Γ Δ']).payable).toBe(120))
  it('τέσσερα άτομα, 150 € → 150 (κάτω από 160)', () => expect(run(150, ['Α Β', 'Γ Δ', 'Ε Ζ']).payable).toBe(150))
  it('σημαία capped μόνο όταν κόβει', () => {
    expect(run(30, []).capped).toBe(false)
    expect(run(45, []).capped).toBe(true)
  })
  it('ΑΛΛΗ δράση: κανένα όριο', () => {
    const cap = eventCap('Γενική Συνέλευση', 0)
    expect(cap).toBeNull()
    expect(computeTotals([L(500)] as any, 0, cap).payable).toBe(500)
  })
})
