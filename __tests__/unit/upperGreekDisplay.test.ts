import { upperGreek } from '@/lib/campaignBlocks'
it('τα ελληνικά κεφαλαία ΔΕΝ κρατούν τόνο', () => {
  expect(upperGreek('Η ιδιότητά σου')).toBe('Η ΙΔΙΟΤΗΤΑ ΣΟΥ')
  expect(upperGreek('Τα στοιχεία σου')).toBe('ΤΑ ΣΤΟΙΧΕΙΑ ΣΟΥ')
  expect(upperGreek('Θέματα και σχόλια')).toBe('ΘΕΜΑΤΑ ΚΑΙ ΣΧΟΛΙΑ')
  expect(upperGreek('Γίνεται τώρα')).toBe('ΓΙΝΕΤΑΙ ΤΩΡΑ')
})
