import { infoDocFor, MIDTERM_INFO_A, MEMBERS_ONLY_SECTIONS } from '@/lib/eventInfoDoc'
import { renderCampaignBody } from '@/lib/campaignBlocks'

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
