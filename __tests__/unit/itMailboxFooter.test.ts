import { campaignEmailHtml, FOOTER_STYLES, FOOTER_LOOKS } from '@/lib/campaignBlocks'

/**
 * Η ρήτρα εμπιστευτικότητας του it@ δεν είναι επιλογή της οθόνης — είναι
 * ιδιότητα της θυρίδας. Όποιο στυλ και όποια εμφάνιση κι αν διαλέξει ο
 * συντάκτης, το γράμμα φεύγει με τη ρήτρα. (16/10/2026)
 */
const render = (email: string, footerStyle: any, footerLook: any) => campaignEmailHtml({
  subject: 'Δοκιμή', blocks: [{ type: 'text', html: '<p>σώμα</p>' }] as any,
  signer: { name: 'Γιώργος Στυλ', role: 'IT', email },
  footerStyle, footerLook,
}).html

const CLAUSE = 'This email may contain confidential information'
const LINK = '/email-confidentiality-disclaimer'

describe('Το υποσέλιδο της θυρίδας it@', () => {
  it('το τηλέφωνο μπαίνει σε ΚΑΘΕ υπογραφή — και πατιέται', () => {
    for (const st of FOOTER_STYLES) {
      const html = render('it@cultureforchange.net', st.id, 'cream')
      expect(html).toContain('tel:+306906601429')
      expect(html).toContain('+30 690 660 1429')
      expect(html).toContain('WhatsApp, Viber')
    }
  })

  it('καμία άλλη θυρίδα δεν δίνει τηλέφωνο', () => {
    for (const box of ['hello@cultureforchange.net', 'communication@cultureforchange.net']) {
      expect(render(box, 'signature', 'cream')).not.toContain('tel:+30')
    }
  })

  it('φαίνεται σε ΚΑΘΕ συνδυασμό υπογραφής και εμφάνισης', () => {
    for (const s of FOOTER_STYLES) {
      for (const l of FOOTER_LOOKS) {
        const html = render('it@cultureforchange.net', s.id, l.id)
        expect(html).toContain(CLAUSE)
        expect(html).toContain(LINK)
      }
    }
  })

  it('ΔΕΝ μπαίνει στις άλλες θυρίδες', () => {
    for (const box of ['hello@cultureforchange.net', 'finance@cultureforchange.net',
      'communication@cultureforchange.net', 'community@cultureforchange.net']) {
      expect(render(box, 'signature', 'cream')).not.toContain(CLAUSE)
    }
  })

  it('ο σύνδεσμος δεν δείχνει ΠΟΤΕ σε μηχάνημα ανάπτυξης', () => {
    const html = render('it@cultureforchange.net', 'detailed', 'darkFull')
    expect(html).toMatch(/https:\/\/[^"]*\/email-confidentiality-disclaimer/)
    expect(html).not.toMatch(/localhost|127\.0\.0\.1/)
  })
})
