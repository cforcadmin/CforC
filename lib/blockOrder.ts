/**
 * Μετακίνηση μπλοκ, ενός ή πολλών μαζί.
 *
 * Καθαρές συναρτήσεις πάνω σε πίνακες: η αναδιάταξη με πολλαπλή επιλογή έχει
 * αρκετές γωνίες (κενά στην επιλογή, όρια, θέση-στόχος που μετακινείται όταν
 * βγάλεις στοιχεία από πάνω της) ώστε να μην αξίζει να ζει μέσα σε component.
 */

export interface Reorder<T> { items: T[]; selection: number[] }

const sortedUnique = (idx: number[], len: number) =>
  [...new Set(idx)].filter(i => i >= 0 && i < len).sort((a, b) => a - b)

/** Ένα βήμα πάνω. Μπλοκάρει αν το πρώτο επιλεγμένο είναι ήδη στην κορυφή. */
export function moveUp<T>(items: T[], selection: number[]): Reorder<T> {
  const sel = sortedUnique(selection, items.length)
  if (!sel.length || sel[0] === 0) return { items, selection: sel }
  const next = [...items]
  // Ανιόντα: το καθένα ανταλλάσσει με το από πάνω του, οπότε μια ομάδα με
  // κενά κρατά τις σχετικές αποστάσεις της
  for (const i of sel) { const t = next[i - 1]; next[i - 1] = next[i]; next[i] = t }
  return { items: next, selection: sel.map(i => i - 1) }
}

/** Ένα βήμα κάτω. */
export function moveDown<T>(items: T[], selection: number[]): Reorder<T> {
  const sel = sortedUnique(selection, items.length)
  if (!sel.length || sel[sel.length - 1] === items.length - 1) return { items, selection: sel }
  const next = [...items]
  for (const i of [...sel].reverse()) { const t = next[i + 1]; next[i + 1] = next[i]; next[i] = t }
  return { items: next, selection: sel.map(i => i + 1) }
}

/**
 * Στο τέλος όλων.
 *
 * Χρήσιμο κυρίως μετά από διπλασιασμό: το αντίγραφο γεννιέται δίπλα στο
 * πρωτότυπο, και συνήθως το θέλεις στο τέλος χωρίς να κυλήσεις ως εκεί.
 */
export function moveToBottom<T>(items: T[], selection: number[]): Reorder<T> {
  const sel = sortedUnique(selection, items.length)
  if (!sel.length) return { items, selection: sel }
  const moving = sel.map(i => items[i])
  const rest = items.filter((_, i) => !sel.includes(i))
  const next = [...rest, ...moving]
  return { items: next, selection: moving.map((_, n) => rest.length + n) }
}

/**
 * Σύρσιμο ομάδας σε θέση.
 *
 * ΠΡΟΣΟΧΗ στη θέση-στόχο: όταν αφαιρείς στοιχεία που βρίσκονταν ΠΑΝΩ από
 * αυτήν, η θέση μετατοπίζεται προς τα πάνω. Γι' αυτό μετράμε πόσα ΜΗ
 * μετακινούμενα υπάρχουν πριν από τον στόχο, αντί να χρησιμοποιήσουμε τον
 * αρχικό δείκτη.
 */
export function moveGroupTo<T>(items: T[], selection: number[], target: number): Reorder<T> {
  const sel = sortedUnique(selection, items.length)
  if (!sel.length) return { items, selection: sel }
  const moving = sel.map(i => items[i])
  const rest = items.filter((_, i) => !sel.includes(i))
  const before = items.slice(0, Math.max(0, Math.min(target, items.length)))
    .filter((_, i) => !sel.includes(i)).length
  const next = [...rest.slice(0, before), ...moving, ...rest.slice(before)]
  return { items: next, selection: moving.map((_, n) => before + n) }
}
