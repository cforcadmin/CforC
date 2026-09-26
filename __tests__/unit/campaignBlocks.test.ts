import {
  campaignEmailHtml, richText, renderCampaignBody, renderCampaignText, sanitizeInline,
  applyMergeFields, PRESETS, BLOCK_LABELS, BLOCK_VARIANTS, BRAND, type Block,
} from '@/lib/campaignBlocks'

/**
 * Το μπλοκ υπάρχει για να κάνει το εκτός ταυτότητας αποτέλεσμα ΑΔΥΝΑΤΟ.
 * Τα περισσότερα tests εδώ ελέγχουν ακριβώς αυτό: τι ΔΕΝ περνάει.
 */

describe('sanitizeInline — τι δεν περνάει', () => {
  it('κόβει script και style μαζί με το περιεχόμενό τους', () => {
    const out = sanitizeInline('Γεια<script>alert(1)</script><style>b{color:red}</style>')
    expect(out).toBe('Γεια')
  })

  it('κόβει κλάσεις, styles και χρώματα από επικόλληση Word', () => {
    const out = sanitizeInline('<p class="MsoNormal" style="font-family:Calibri;color:#ff0000">Κείμενο</p>')
    expect(out).toBe('<p>Κείμενο</p>')
    expect(out).not.toMatch(/Calibri|#ff0000|class=/)
  })

  it('κρατά μόνο τις έξι επιτρεπόμενες ετικέτες', () => {
    const out = sanitizeInline('<strong>α</strong><em>β</em><ul><li>γ</li></ul><h1>δ</h1><table><tr><td>ε</td></tr></table>')
    expect(out).toContain('<strong>α</strong>')
    expect(out).toContain('<li>γ</li>')
    expect(out).not.toMatch(/<h1>|<table>|<td>/)
  })

  it('μετατρέπει <b>/<i> σε <strong>/<em>', () => {
    expect(sanitizeInline('<b>α</b><i>β</i>')).toBe('<strong>α</strong><em>β</em>')
  })

  it('δέχεται μόνο απόλυτους συνδέσμους — javascript: πετιέται', () => {
    expect(sanitizeInline('<a href="javascript:alert(1)">κλικ</a>')).toBe('κλικ')
    expect(sanitizeInline('<a href="/relative">κλικ</a>')).toBe('κλικ')
    expect(sanitizeInline('<a href="https://ok.gr">κλικ</a>')).toContain('href="https://ok.gr"')
    expect(sanitizeInline('<a href="mailto:a@b.gr">κλικ</a>')).toContain('mailto:a@b.gr')
  })
})

describe('Απόδοση σε HTML email', () => {
  const blocks: Block[] = [
    { type: 'section', title: 'Νέα' },
    { type: 'text', html: 'Κείμενο <strong>έντονο</strong>.' },
    { type: 'button', label: 'Δες', href: 'https://x.gr', style: 'coral' },
  ]

  it('βγάζει πίνακες και inline styles — όχι flexbox ή κλάσεις διάταξης', () => {
    const { html } = campaignEmailHtml({ subject: 'Θέμα', blocks })
    expect(html).toContain('role="presentation"')
    expect(html).not.toMatch(/display:\s*flex|display:\s*grid/)
  })

  it('χρησιμοποιεί ΜΟΝΟ χρώματα της ταυτότητας', () => {
    const { html } = campaignEmailHtml({ subject: 'Θέμα', blocks })
    const used = new Set((html.match(/#[0-9A-Fa-f]{6}/g) || []).map(c => c.toUpperCase()))
    const allowed = new Set(Object.values(BRAND).map(c => c.toUpperCase()))
    expect([...used].filter(c => !allowed.has(c))).toEqual([])
  })

  it('το θέμα και το κείμενο περνούν από escaping', () => {
    const { html } = campaignEmailHtml({ subject: '<script>x</script>', blocks: [] })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('κάθε εικόνα έχει width και alt — αλλιώς σπάει στο Outlook', () => {
    const { html } = campaignEmailHtml({
      subject: 'Θ', blocks: [{ type: 'image', src: 'https://x.gr/a.jpg', alt: 'Περιγραφή' }],
    })
    expect(html).toMatch(/<img[^>]+width="\d+"/)
    expect(html).toContain('alt="Περιγραφή"')
  })

  it('το «Εικόνα + κείμενο» στοιβάζεται σε κινητό', () => {
    const { html } = campaignEmailHtml({
      subject: 'Θ', blocks: [{ type: 'imageText', src: 'https://x.gr/a.jpg', alt: 'α', html: 'β' }],
    })
    expect(html).toContain('class="stack"')
    expect(html).toContain('.stack{display:block !important;width:100% !important;}')
  })
})

describe('Πίνακας περιεχομένων', () => {
  it('χτίζεται από τις ενότητες, με αγκύρωση', () => {
    const blocks: Block[] = [
      { type: 'toc' },
      { type: 'section', title: 'Πρώτη' },
      { type: 'section', title: 'Δεύτερη' },
    ]
    const out = renderCampaignBody(blocks)
    expect(out).toContain('Πρώτη')
    expect(out).toContain('Δεύτερη')
    expect(out).toMatch(/href="#s1-/)
    expect(out).toMatch(/<a name="s1-/)
  })

  it('δεν εμφανίζεται με λιγότερες από δύο ενότητες', () => {
    expect(renderCampaignBody([{ type: 'toc' }, { type: 'section', title: 'Μόνη' }]))
      .not.toContain('ΣΕ ΑΥΤΟ ΤΟ ΤΕΥΧΟΣ')
  })
})

describe('Απλό κείμενο', () => {
  it('παράγεται από τα ίδια μπλοκ, χωρίς ετικέτες', () => {
    const text = renderCampaignText([
      { type: 'section', title: 'Νέα' },
      { type: 'text', html: 'Κείμενο <strong>έντονο</strong>.' },
      { type: 'button', label: 'Δες', href: 'https://x.gr' },
    ])
    expect(text).toContain('ΝΕΑ')
    expect(text).toContain('Κείμενο έντονο.')
    expect(text).toContain('Δες: https://x.gr')
    expect(text).not.toMatch(/<[a-z]/i)
  })
})

describe('Merge fields', () => {
  it('αντικαθιστά όσα ξέρει και αφήνει άθικτα όσα δεν ξέρει', () => {
    expect(applyMergeFields('Αγαπητή {{όνομα}}, ΑΜ {{ΑΜ}}, {{άγνωστο}}', { 'όνομα': 'Μαρία', 'ΑΜ': '34' }))
      .toBe('Αγαπητή Μαρία, ΑΜ 34, {{άγνωστο}}')
  })

  it('κάνει escape την τιμή — το όνομα δεν γίνεται HTML', () => {
    expect(applyMergeFields('{{όνομα}}', { 'όνομα': '<b>x</b>' })).toBe('&lt;b&gt;x&lt;/b&gt;')
  })
})

describe('Presets και παραλλαγές', () => {
  it('κάθε preset αποδίδεται χωρίς σφάλμα', () => {
    for (const p of PRESETS) {
      const { html } = campaignEmailHtml({ subject: p.label, blocks: p.blocks })
      expect(html).toContain('CULTURE FOR CHANGE')
    }
  })

  it('κάθε τύπος μπλοκ έχει ελληνική ετικέτα', () => {
    const types: Array<Block['type']> = ['section', 'text', 'image', 'imageText', 'card', 'person',
      'logos', 'button', 'box', 'divider', 'amounts', 'mono', 'toc']
    for (const t of types) expect(BLOCK_LABELS[t]).toBeTruthy()
  })

  it('οι παραλλαγές είναι ΚΛΕΙΣΤΕΣ λίστες — καμία ελεύθερη επιλογή χρώματος', () => {
    for (const v of Object.values(BLOCK_VARIANTS)) {
      expect(v!.options.length).toBeGreaterThan(1)
      for (const o of v!.options) expect(o.value).not.toMatch(/^#/)
    }
  })
})

describe('Αλλαγή γραμμής', () => {
  it('το Enter γίνεται <br> — αλλιώς τρεις γραμμές φτάνουν ως μία', () => {
    expect(richText('Αυτή είναι\nδεν ξέρω\nΤι λες τώρα'))
      .toBe('Αυτή είναι<br>δεν ξέρω<br>Τι λες τώρα')
  })

  it('δεν προσθέτει <br> γύρω από ετικέτες που ήδη αλλάζουν γραμμή', () => {
    expect(richText('<ul>\n<li>ένα</li>\n<li>δύο</li>\n</ul>'))
      .toBe('<ul><li>ένα</li><li>δύο</li></ul>')
  })

  it('φτάνει στο τελικό email', () => {
    const { html } = campaignEmailHtml({ subject: 'Θ', blocks: [{ type: 'text', html: 'α\nβ' }] })
    expect(html).toContain('α<br>β')
  })
})

describe('Κεφαλίδες', () => {
  const blocks: Block[] = [{ type: 'text', html: 'x' }]

  it('τέσσερις επιλογές, όλες με χρώματα της ταυτότητας', () => {
    const allowed = new Set(Object.values(BRAND).map(c => c.toUpperCase()))
    for (const h of ['coral', 'light', 'dark'] as const) {
      const { html } = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: h })
      const used = new Set((html.match(/#[0-9A-Fa-f]{6}/g) || []).map(c => c.toUpperCase()))
      expect([...used].filter(c => !allowed.has(c))).toEqual([])
    }
  })

  it('η σκούρα βάζει λευκό τίτλο σε ανθρακί, όχι το αντίστροφο', () => {
    const { html } = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: 'dark' })
    expect(html).toContain(`background-color:${BRAND.ink}`)
    expect(html).toContain(`color:${BRAND.white};font-weight:bold`)
  })

  it('η παραλλαγή με λογότυπο χρησιμοποιεί PNG — το SVG δεν αποδίδεται σε email', () => {
    const { html } = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: 'coral', headerLogo: true })
    expect(html).toContain('cforc_mark_light')
    expect(html).toContain('.png')
    // Τα περισσότερα γραμματοκιβώτια δεν αποδίδουν SVG
    expect(html).not.toContain('.svg')
    expect(html).toContain('alt="Culture for Change"')
  })

  it('το λογότυπο στοιβάζεται σε κινητό μαζί με τον τίτλο', () => {
    const { html } = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: 'coral', headerLogo: true })
    expect(html).toContain('class="stack"')
  })
})

describe('Το σήμα ακολουθεί το φόντο', () => {
  const blocks: Block[] = [{ type: 'text', html: 'x' }]

  it('λευκό σε σκούρα κεφαλίδα, ανθρακί σε ανοιχτή', () => {
    const dark = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: 'dark', headerLogo: true }).html
    const light = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: 'light', headerLogo: true }).html
    expect(dark).toContain('cforc_mark_light')
    expect(light).toContain('cforc_mark_dark')
  })

  it('το ίδιο στο υποσέλιδο, με το τικ', () => {
    const dark = campaignEmailHtml({ subject: 'Θ', blocks, footerLook: 'darkFull', footerLogo: true }).html
    const cream = campaignEmailHtml({ subject: 'Θ', blocks, footerLook: 'cream', footerLogo: true }).html
    expect(dark).toContain('cforc_mark_light')
    expect(cream).toContain('cforc_mark_dark')
  })

  it('χωρίς τικ δεν μπαίνει σήμα πουθενά', () => {
    const html = campaignEmailHtml({ subject: 'Θ', blocks, footerLook: 'coralFull' }).html
    expect(html).not.toContain('cforc_mark')
  })

  it('το σήμα είναι κάθετα κεντραρισμένο, όχι στην κορυφή', () => {
    const html = campaignEmailHtml({ subject: 'Θ', blocks, footerLook: 'dark', footerLogo: true }).html
    expect(html).not.toMatch(/width:64px;vertical-align:top/)
    expect(html).toContain('width:64px;vertical-align:middle')
  })

  it('η coral ζώνη κρατά χρώματα της ταυτότητας', () => {
    const allowed = new Set(Object.values(BRAND).map(c => c.toUpperCase()))
    for (const l of ['coral', 'coralFull'] as const) {
      const html = campaignEmailHtml({ subject: 'Θ', blocks, footerLook: l }).html
      const used = new Set((html.match(/#[0-9A-Fa-f]{6}/g) || []).map(c => c.toUpperCase()))
      expect([...used].filter(c => !allowed.has(c))).toEqual([])
    }
  })
})

describe('Επικεφαλίδες μέσα στο κείμενο', () => {
  it('h2 και h3 επιβιώνουν, με inline styles', () => {
    const out = richText('<h2>Τίτλος</h2><p>κείμενο</p><h3>Υπότιτλος</h3>')
    expect(out).toContain('<h2 style="')
    expect(out).toContain('font-size:22px')
    expect(out).toContain('<h3 style="')
    expect(out).toContain('font-size:18px')
  })

  it('το h1 εξακολουθεί να κόβεται — ο τίτλος του γράμματος είναι ήδη h1', () => {
    expect(richText('<h1>Μεγάλο</h1>')).toBe('Μεγάλο')
  })

  it('δεν προστίθεται <br> γύρω από επικεφαλίδες', () => {
    expect(richText('<h2>Α</h2>\n<p>Β</p>')).toBe(
      richText('<h2>Α</h2><p>Β</p>'))
  })

  it('οι επικεφαλίδες κρατούν χρώμα ταυτότητας', () => {
    expect(richText('<h2>Α</h2>')).toContain(BRAND.ink)
  })
})
