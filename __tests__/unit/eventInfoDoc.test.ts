import { infoDocFor, MIDTERM_INFO_A, MEMBERS_ONLY_SECTIONS } from '@/lib/eventInfoDoc'
import { renderCampaignBody, renderDocumentHtml } from '@/lib/campaignBlocks'

const titles = (blocks: typeof MIDTERM_INFO_A) =>
  blocks.filter(b => b.type === 'section').map(b => (b as any).title)

describe('infoDocFor', () => {
  it('το μέλος παίρνει ΤΟ ΠΛΗΡΕΣ έγγραφο, το ίδιο αντικείμενο', () => {
    expect(infoDocFor(true)).toBe(MIDTERM_INFO_A)
  })

  it('ο μη-μέλος δεν παίρνει τις δύο ενότητες των μελών', () => {
    const b = titles(infoDocFor(false))
    for (const s of MEMBERS_ONLY_SECTIONS) expect(b).not.toContain(s)
  })

  it('κρατά ΟΛΕΣ τις υπόλοιπες ενότητες, με τη σειρά τους', () => {
    const kept = titles(infoDocFor(false))
    const expected = titles(MIDTERM_INFO_A).filter(t => !MEMBERS_ONLY_SECTIONS.includes(t as any))
    expect(kept).toEqual(expected)
  })

  /* Ο κανόνας είναι «η επικεφαλίδα ΚΑΙ ό,τι κρέμεται από αυτήν»: αν έφευγε
     μόνο η επικεφαλίδα, οι παράγραφοι του open call θα έμεναν ορφανές και
     ορατές σε όποιον δεν τις δικαιούται. */
  it('φεύγουν και τα μπλοκ ΜΕΣΑ στις ενότητες, όχι μόνο οι τίτλοι', () => {
    const html = renderCampaignBody(infoDocFor(false))
    expect(html).not.toMatch(/ανοιχτή πρόσκληση|Κατευθείαν στη φόρμα συμμετοχής/i)
    expect(html).not.toMatch(/διαμορφώνεται συλλογικά/)
    expect(html).not.toMatch(/23 Οκτωβρίου 2026<\/strong>\.?\s*<\/td>\s*<\/tr>\s*<\/table>\s*$/)
  })

  it('το έγγραφο Β είναι ΓΝΗΣΙΩΣ μικρότερο — δεν είναι αντίγραφο', () => {
    expect(infoDocFor(false).length).toBeLessThan(MIDTERM_INFO_A.length)
  })

  /* Ό,τι αφορά ΟΛΟΥΣ μένει και στις δύο εκδόσεις */
  it.each([
    ['το πρόγραμμα', /Goethe-Institut Thessaloniki/],
    ['η μετακίνηση', /50% του κόστους εισιτηρίου ΚΤΕΛ/],
    ['η διαμονή', /2 διανυκτερεύσεις/],
    ['τα γεύματα', /Goethe-Institut καλύπτεται/],
    ['η προθεσμία', /23 Οκτωβρίου 2026/],
    ['η επικοινωνία', /hello@cultureforchange\.net/],
  ])('%s υπάρχει και στις δύο εκδόσεις', (_label, re) => {
    expect(renderCampaignBody(infoDocFor(true))).toMatch(re)
    expect(renderCampaignBody(infoDocFor(false))).toMatch(re)
  })

  it('και οι δύο εκδόσεις παράγουν HTML, όχι κενό', () => {
    for (const m of [true, false]) {
      expect(renderCampaignBody(infoDocFor(m)).length).toBeGreaterThan(500)
    }
  })
})

/* Η σελίδα φοράει την ΙΔΙΑ κεφαλίδα και υπογραφή με τα email — όχι αντίγραφο */
describe('renderDocumentHtml', () => {
  const doc = (isMember: boolean) =>
    renderDocumentHtml({ title: 'Midterm — Πληροφορίες', blocks: infoDocFor(isMember) })

  it('βάζει κεφαλίδα με τον τίτλο', () => {
    expect(doc(true)).toContain('Midterm — Πληροφορίες')
  })
  it('βάζει υπογραφή του δικτύου', () => {
    expect(doc(true)).toMatch(/Culture for Change/)
  })
  it('το σώμα παραμένει ΜΕΣΑ στο έγγραφο', () => {
    expect(doc(true)).toContain('Goethe-Institut Thessaloniki')
  })
  /* Η κεφαλίδα δεν πρέπει να ξαναφέρει τις ενότητες των μελών στο Β */
  it('το έγγραφο Β δεν αποκτά ενότητες μελών από το περιτύλιγμα', () => {
    expect(doc(false)).not.toContain('OPEN CALL')
    expect(doc(false)).not.toContain('ΔΙΑΜΟΡΦΩΣΗ ΑΤΖΕΝΤΑΣ')
  })
})

/* Τα πεδία του agenda ΔΙΑΦΕΥΓΟΥΝ μόνα τους: ένα γραμμένο &amp; έβγαινε
   αυτούσιο στην οθόνη (2/10/2026). */
describe('διπλό escaping', () => {
  it('κανένα &amp; δεν φτάνει στον αναγνώστη', () => {
    for (const m of [true, false]) {
      expect(renderCampaignBody(infoDocFor(m))).not.toContain('&amp;amp;')
      expect(renderCampaignBody(infoDocFor(m))).not.toMatch(/Stories &amp;amp;/)
    }
  })
  it('το «&» των τίτλων φαίνεται ως σύμβολο', () => {
    const html = renderCampaignBody(infoDocFor(true))
    expect(html).toMatch(/Stories &amp; Experiences/)
  })
})
