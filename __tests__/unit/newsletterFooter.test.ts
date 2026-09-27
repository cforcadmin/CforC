import {
  campaignEmailHtml, NEWSLETTER_FOOTERS, NEWSLETTER_FOOTER_DEFAULTS,
  normaliseNewsletterFooter, SOCIAL_ICONS,
} from '@/lib/campaignBlocks'

const render = (footer: any) => campaignEmailHtml({
  subject: 'Τεύχος', blocks: [{ type: 'text', html: '<p>σώμα</p>' }] as any, newsletterFooter: footer,
}).html

describe('Υποσέλιδο newsletter', () => {
  it('κάθε διάταξη δείχνει λογότυπο, δικαιώματα, σημείωμα, θυρίδα και απεγγραφή', () => {
    for (const f of NEWSLETTER_FOOTERS) {
      const html = render({ arrangement: f.id })
      expect(html).toContain('cforc_lockup')
      expect(html).toContain(NEWSLETTER_FOOTER_DEFAULTS.copyright)
      // Το σημείωμα GDPR δεν είναι διακόσμηση: αν λείψει, το τεύχος φεύγει χωρίς αυτό
      expect(html).toContain('δεν τα χρησιμοποιεί για άλλους σκοπούς')
      expect(html).toContain('mailto:hello@cultureforchange.net')
      expect(html).toContain('{{unsubscribe_link}}')
    }
  })

  it('η απεγγραφή μπαίνει ΜΙΑ φορά — όχι και από τη γραμμή των μηνυμάτων', () => {
    const html = campaignEmailHtml({
      subject: 'Τεύχος', blocks: [{ type: 'text', html: '<p>σώμα</p>' }] as any,
      unsubscribe: true, newsletterFooter: { arrangement: 'stack' },
    }).html
    expect(html.match(/\{\{unsubscribe_link\}\}/g)).toHaveLength(1)
  })

  it('χωρίς υποσέλιδο τεύχους μένει η κανονική υπογραφή', () => {
    const html = campaignEmailHtml({
      subject: 'Μήνυμα', blocks: [{ type: 'text', html: '<p>σώμα</p>' }] as any,
      signer: { name: 'Στέλλα', role: 'Επικοινωνία', email: 'communication@cultureforchange.net' },
    }).html
    expect(html).toContain('Στέλλα')
    expect(html).not.toContain('cforc_lockup')
  })

  it('τα κείμενα του συντάκτη περνούν στο γράμμα', () => {
    const html = render({
      arrangement: 'centred', copyright: 'Δικά μας δικαιώματα',
      notice: 'Δικό μας σημείωμα', email: 'media@cultureforchange.net',
      unsubscribeLead: 'Διαγραφή από τη λίστα',
    })
    expect(html).toContain('Δικά μας δικαιώματα')
    expect(html).toContain('Δικό μας σημείωμα')
    expect(html).toContain('mailto:media@cultureforchange.net')
    expect(html).toContain('Διαγραφή από τη λίστα')
  })

  it('τα κείμενα περνούν από escaping — δεν εισάγεται HTML', () => {
    const html = render({ arrangement: 'stack', copyright: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('κενός σύνδεσμος δικτύου δεν βγάζει σπασμένο εικονίδιο', () => {
    const html = render({
      arrangement: 'stack',
      socials: [{ network: 'Instagram', href: 'https://example.com/ig' }, { network: 'Facebook', href: '' }],
    })
    expect(html).toContain(SOCIAL_ICONS.Instagram!.onDark)
    expect(html).not.toContain(SOCIAL_ICONS.Facebook!.onDark)
  })

  it('άγνωστο δίκτυο πέφτει έξω αντί να ζητήσει εικονίδιο που δεν υπάρχει', () => {
    const f = normaliseNewsletterFooter({ socials: [{ network: 'Mastodon', href: 'https://example.com' }] })
    expect(f.socials).toHaveLength(0)
  })

  it('άγνωστη διάταξη πέφτει στην προεπιλογή αντί να αδειάσει το υποσέλιδο', () => {
    expect(normaliseNewsletterFooter({ arrangement: 'δεν-υπάρχει' as any }).arrangement)
      .toBe(NEWSLETTER_FOOTER_DEFAULTS.arrangement)
    expect(render({ arrangement: 'δεν-υπάρχει' })).toContain('cforc_lockup')
  })

  it('οι φωτεινές διατάξεις παίρνουν το σκούρο λογότυπο, οι σκούρες το λευκό', () => {
    expect(render({ arrangement: 'slim' })).toContain('cforc_lockup_dark')
    expect(render({ arrangement: 'dark' })).toContain('cforc_lockup_light')
    expect(render({ arrangement: 'stack' })).toContain('cforc_lockup_light')
  })
})
