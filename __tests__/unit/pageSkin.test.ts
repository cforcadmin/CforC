/**
 * ΤΟ ΔΕΡΜΑ ΣΕΛΙΔΑΣ. Η ΟΛΗ ΔΥΣΚΟΛΙΑ ΕΙΝΑΙ ΟΤΙ ΤΟ ΙΔΙΟ HEX ΣΗΜΑΙΝΕΙ ΑΛΛΟ
 * ΠΡΑΓΜΑ ΑΝΑΛΟΓΑ ΜΕ ΤΟ ΠΟΥ ΖΕΙ.
 *
 * #2D2D2D είναι το κείμενο του άρθρου ΚΑΙ το φόντο του κουμπιού.
 * #FFFFFF είναι η κάρτα ΚΑΙ τα γράμματα μέσα σε εκείνο το κουμπί.
 * Ένα τυφλό replace δίνει, στο σκοτεινό θέμα, σκούρα γράμματα σε σκούρο κουμπί.
 */
import { toPageSkin } from '@/lib/pageSkin'
import { BRAND, campaignPageHtml } from '@/lib/campaignBlocks'

describe('toPageSkin', () => {
  it('το κείμενο του άρθρου γίνεται μεταβλητή, με εφεδρεία το αρχικό χρώμα', () => {
    const out = toPageSkin('<div style="color:#2D2D2D;font-size:16px;">Γεια</div>')
    expect(out).toContain('color:var(--cfc-ink,#2D2D2D)')
    expect(out).toContain('font-size:16px')
  })

  it('το φόντο της κάρτας γίνεται επιφάνεια', () => {
    expect(toPageSkin('<table style="background-color:#FFFFFF;">'))
      .toContain('background-color:var(--cfc-surface,#FFFFFF)')
  })

  /** Η καρδιά του πράγματος: ίδιο hex, άλλη σημασία, άλλη αντιμετώπιση */
  it('ΚΟΥΜΠΙ: το σκούρο φόντο και τα λευκά του γράμματα αντιστρέφονται ΜΑΖΙ', () => {
    const btn = '<td style="background-color:#2D2D2D;border-radius:999px;">'
      + '<a style="color:#FFFFFF;font-weight:bold;">Δες το</a></td>'
    const out = toPageSkin(btn)
    expect(out).toContain('background-color:var(--cfc-invert-bg,#2D2D2D)')
    expect(out).toContain('color:var(--cfc-invert-fg,#FFFFFF)')
    // ΔΕΝ πρέπει να έχει γίνει «κείμενο άρθρου»
    expect(out).not.toContain('--cfc-ink,#2D2D2D')
  })

  it('το λευκό ΜΕΣΑ σε κουμπί δεν γίνεται επιφάνεια', () => {
    const out = toPageSkin('<td style="background-color:#2D2D2D;"><span style="color:#FFFFFF;">x</span></td>')
    expect(out).not.toContain('--cfc-surface')
  })

  /** Η ταυτότητα είναι σταθερά — όπως το λογότυπο, δεν αλλάζει με το θέμα */
  it('ΚΟΡΑΛΙ: τίποτα μέσα σε επώνυμη ζώνη δεν αγγίζεται', () => {
    const band = `<td style="background-color:${BRAND.coral};">`
      + '<div style="color:#2D2D2D;">Τίτλος</div>'
      + '<div style="color:#FFFFFF;">CULTURE FOR CHANGE</div></td>'
    expect(toPageSkin(band)).toBe(band)
  })

  /**
   * Το κρεμ ΔΕΝ είναι ταυτότητα — είναι βαμμένο χαρτί. Αφημένο σταθερό,
   * γινόταν φωτεινό νησί μέσα στο σκοτεινό άρθρο.
   */
  it('ΚΡΕΜ: ακολουθεί το θέμα, μαζί με τα γράμματά του', () => {
    const band = `<td style="background-color:${BRAND.cream};"><p style="color:#2D2D2D;">x</p></td>`
    const out = toPageSkin(band)
    expect(out).toContain(`background-color:var(--cfc-tint,${BRAND.cream})`)
    expect(out).toContain('color:var(--cfc-ink,#2D2D2D)')
  })

  /** Μετά το κλείσιμο της ζώνης, το κείμενο ξαναγίνεται κανονικό κείμενο */
  it('η ζώνη τελειώνει εκεί που κλείνει το στοιχείο της', () => {
    const html = `<td style="background-color:${BRAND.coral};"><b style="color:#2D2D2D;">μέσα</b></td>`
      + '<td style="padding:0;"><b style="color:#2D2D2D;">έξω</b></td>'
    const out = toPageSkin(html)
    expect(out).toContain('<b style="color:#2D2D2D;">μέσα</b>')
    expect(out).toContain('color:var(--cfc-ink,#2D2D2D)')
    expect(out.match(/--cfc-ink,/g)).toHaveLength(1)
  })

  it('οι γραμμές και τα περιγράμματα ακολουθούν το θέμα', () => {
    expect(toPageSkin(`<td style="background-color:${BRAND.rule};">`))
      .toContain(`background-color:var(--cfc-line,${BRAND.rule})`)
    expect(toPageSkin(`<div style="border:1px solid ${BRAND.rule};">`))
      .toContain(`border:1px solid var(--cfc-line,${BRAND.rule})`)
  })

  it('μια εικόνα δεν ανοίγει περιοχή που δεν κλείνει ποτέ', () => {
    const html = `<td style="background-color:${BRAND.coral};"><img src="x.jpg" style="border:0;" /></td>`
      + '<p style="color:#2D2D2D;">μετά</p>'
    expect(toPageSkin(html)).toContain('color:var(--cfc-ink,#2D2D2D)')
  })

  it('αφήνει άθικτο ό,τι δεν έχει style', () => {
    const html = '<table><tr><td>κείμενο &amp; σύμβολα</td></tr></table>'
    expect(toPageSkin(html)).toBe(html)
  })

  it('δεν χάνει περιεχόμενο — το κείμενο επιβιώνει αυτούσιο', () => {
    const html = '<p style="color:#2D2D2D;">Ένα κείμενο με <a href="https://x.gr?a=1&b=2">σύνδεσμο</a></p>'
    expect(toPageSkin(html)).toContain('Ένα κείμενο με <a href="https://x.gr?a=1&b=2">σύνδεσμο</a>')
  })
})

describe('campaignPageHtml', () => {
  const blocks: any = [{ type: 'text', html: '<p>Το κείμενο</p>' }]

  it('δεν έχει κέλυφος εγγράφου ούτε υποσέλιδο — η σελίδα τα έχει ήδη', () => {
    const html = campaignPageHtml({ title: 'Τίτλος', blocks })
    expect(html).not.toContain('<!DOCTYPE')
    expect(html).not.toContain('<body')
    expect(html).not.toContain('unsubscribe')
    expect(html).toContain('Το κείμενο')
  })

  it('«none» αφήνει τη σελίδα να βάλει τη δική της επικεφαλίδα', () => {
    expect(campaignPageHtml({ title: 'Τίτλος', blocks, headerStyle: 'none' }))
      .not.toContain('Τίτλος')
  })

  it('και μετά το δέρμα, το άρθρο αλλάζει θέμα χωρίς να χάσει την ταυτότητα', () => {
    const out = toPageSkin(campaignPageHtml({ title: 'Τίτλος', blocks }))
    expect(out).toContain('--cfc-surface')          // η κάρτα ακολουθεί το θέμα
    expect(out).toContain(BRAND.coral)              // η κοραλί ζώνη μένει κοραλί
  })
})
