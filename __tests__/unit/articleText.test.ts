/**
 * Η ΠΕΡΙΛΗΨΗ ΤΡΟΦΟΔΟΤΕΙ ΤΡΕΙΣ ΟΘΟΝΕΣ: πίσω όψη κάρτας, περιγραφή στο Google,
 * αναζήτηση. Μέχρι σήμερα έβγαινε ΠΑΝΤΑ από το πεδίο `blocks`. Μόλις ένα
 * άρθρο γραφτεί στον συνθέτη, εκείνο το πεδίο μένει άδειο — και οι τρεις θα
 * άδειαζαν σιωπηλά μαζί του.
 */
import { articleText, summaryOf } from '@/lib/articleText'

describe('articleText', () => {
  it('βγάζει το κείμενο από το HTML του άρθρου', () => {
    expect(articleText('<p>Ένα <strong>κείμενο</strong></p>')).toBe('Ένα κείμενο')
  })
  it('δεν αφήνει κώδικα ή στυλ να περάσει ως κείμενο', () => {
    expect(articleText('<style>p{color:red}</style><p>Μόνο αυτό</p>')).toBe('Μόνο αυτό')
    expect(articleText('<script>alert(1)</script><p>Μόνο αυτό</p>')).toBe('Μόνο αυτό')
  })
  it('ξεδιπλώνει οντότητες και μαζεύει τα κενά', () => {
    expect(articleText('<p>Α &amp; Β</p>\n\n<p>Γ&nbsp;Δ</p>')).toBe('Α & Β Γ Δ')
  })
  it('αντέχει το κενό', () => {
    expect(articleText(null)).toBe('')
    expect(articleText(undefined)).toBe('')
  })
})

describe('summaryOf', () => {
  it('η γραμμένη περίληψη κερδίζει — την έγραψε άνθρωπος', () => {
    expect(summaryOf('Η περίληψη', 'παλιό κείμενο', '<p>html</p>')).toBe('Η περίληψη')
  })
  it('χωρίς περίληψη, το παλιό κείμενο — ώστε ό,τι υπάρχει σήμερα να μην αλλάξει', () => {
    expect(summaryOf('', 'παλιό κείμενο', '<p>html</p>')).toBe('παλιό κείμενο')
  })
  it('τελευταία εφεδρεία το ίδιο το άρθρο, ποτέ κενό', () => {
    expect(summaryOf(null, null, '<p>Το άρθρο</p>')).toBe('Το άρθρο')
  })
  it('τα κενά δεν περνούν για περιεχόμενο', () => {
    expect(summaryOf('   ', '  ', '<p>Το άρθρο</p>')).toBe('Το άρθρο')
    expect(summaryOf('', '', '')).toBe('')
  })
})
