import {
  campaignEmailHtml, richText, renderCampaignBody, renderCampaignText, sanitizeInline,
  applyMergeFields, PRESETS, BLOCK_LABELS, BLOCK_VARIANTS, BRAND, type Block,
  TOC_DEFAULT_TITLE, visibleBlocks, INNER_WIDTH, PREVIEW_DESKTOP_WIDTH,
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
    expect(out).toMatch(/<a id="s1-/)
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

  it('το λογότυπο ΔΕΝ στοιβάζεται σε κινητό — μένει δίπλα στον τίτλο', () => {
    // Αυτός ο έλεγχος ζητούσε κάποτε το αντίθετο. Η υπόθεση ήταν λάθος: στο
    // τηλέφωνο το σήμα έπεφτε κάτω από τον τίτλο και το γράμμα δεν έμοιαζε
    // καθόλου με την προεπισκόπηση (αναφέρθηκε 26/9/26 με φωτογραφία).
    const { html } = campaignEmailHtml({ subject: 'Θ', blocks, headerStyle: 'coral', headerLogo: true })
    expect(html).toMatch(/<td class="logocell" width="88"/)
    expect(html).not.toMatch(/class="stack"[^>]*width="88"/)
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

describe('Πρόσωπο — πλευρά φωτογραφίας', () => {
  const person = (side?: 'left' | 'right'): Block => ({
    type: 'person', name: 'Μαρία Κ', role: 'Αρχιτέκτονας',
    src: 'https://x.gr/p.jpg', alt: 'Μαρία', html: 'Βιογραφικό', side,
  })

  it('αριστερά είναι η προεπιλογή — φωτογραφία πριν το κείμενο', () => {
    const html = campaignEmailHtml({ subject: 'Θ', blocks: [person()] }).html
    expect(html.indexOf('p.jpg')).toBeLessThan(html.indexOf('Μαρία Κ<'))
  })

  it('δεξιά: το κείμενο πρώτα, η φωτογραφία μετά', () => {
    const html = campaignEmailHtml({ subject: 'Θ', blocks: [person('right')] }).html
    expect(html.indexOf('Μαρία Κ<')).toBeLessThan(html.indexOf('p.jpg'))
  })

  it('χωρίς φωτογραφία δεν μένει κενή στήλη', () => {
    const html = campaignEmailHtml({
      subject: 'Θ', blocks: [{ type: 'person', name: 'Χωρίς', html: 'κείμενο', side: 'right' }],
    }).html
    expect(html).not.toContain('width:120px')
  })

  it('στοιβάζεται σε κινητό, όπως το «Εικόνα + κείμενο»', () => {
    expect(campaignEmailHtml({ subject: 'Θ', blocks: [person('right')] }).html).toContain('class="stack"')
  })
})

describe('Πίνακας περιεχομένων', () => {
  const withSections: Block[] = [
    { type: 'toc' },
    { type: 'section', title: 'Πρώτη ενότητα' },
    { type: 'text', html: 'α' },
    { type: 'section', title: 'Δεύτερη ενότητα' },
  ]

  it('κάθε ενότητα έχει ΚΑΙ id ΚΑΙ name — το σκέτο name είναι παρωχημένο', () => {
    const html = campaignEmailHtml({ subject: 'Θ', blocks: withSections }).html
    expect(html).toMatch(/<a id="s1-[^"]*" name="s1-[^"]*">/)
  })

  it('ο σύνδεσμος δείχνει στην άγκυρα που υπάρχει', () => {
    const html = campaignEmailHtml({ subject: 'Θ', blocks: withSections }).html
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1])
    expect(hrefs.length).toBe(2)
    for (const h of hrefs) expect(html).toContain(`id="${h}"`)
  })

  it('λειτουργεί όπου κι αν μπει ο πίνακας — λίστα ίδια', () => {
    const top = campaignEmailHtml({ subject: 'Θ', blocks: withSections }).html
    const bottom = campaignEmailHtml({
      subject: 'Θ', blocks: [...withSections.slice(1), { type: 'toc' }],
    }).html
    const names = (h: string) => [...h.matchAll(/→ <a href="#[^"]+"[^>]*>([^<]+)</g)].map(m => m[1])
    expect(names(top)).toEqual(['Πρώτη ενότητα', 'Δεύτερη ενότητα'])
    expect(names(bottom)).toEqual(names(top))
  })
})

describe('Το γράμμα σε στενή οθόνη', () => {
  const render = (o: any = {}) => campaignEmailHtml({
    subject: 'COMMUNITY',
    blocks: [{ type: 'text', html: '<p>Σου υπενθυμίζουμε ότι…</p>' } as any],
    headerStyle: 'dark', headerLogo: true,
    footerStyle: 'signature', footerLogo: true,
    ...o,
  }).html

  it('η κάρτα συρρικνώνεται — δεν μένει καρφωμένη στα 600px', () => {
    // Με `width:600px` το γράμμα ΞΕΧΕΙΛΙΖΕ σε στενό παράθυρο και κοβόταν
    // δεξιά· ο Gmail το έκρυβε ζουμάροντας, η προεπισκόπηση όχι.
    const outer = render().match(/<table[^>]*width="\d+"[^>]*background-color[^>]*>/)![0]
    expect(outer).toContain('width:100%')
    expect(outer).toContain(`max-width:${INNER_WIDTH + 96}px`)
    expect(outer).not.toContain('style="width:600px')
    // Το attribute μένει: ο Outlook αγνοεί το max-width και χρειάζεται αριθμό
    expect(outer).toContain(`width="${INNER_WIDTH + 96}"`)
  })

  it('το σήμα της κεφαλίδας ΔΕΝ πέφτει κάτω από τον τίτλο', () => {
    // Το .stack έριχνε το λογότυπο σε δική του γραμμή στο κινητό, οπότε το
    // γράμμα φαινόταν εντελώς αλλιώς απ' ό,τι στην προεπισκόπηση.
    const html = render()
    expect(html).toMatch(/<td class="logocell" width="88"/)
    expect(html).not.toMatch(/class="stack"[^>]*width="88"/)
  })

  it('ούτε το σήμα της υπογραφής — αδελφό στοιχείο, ίδια συμπεριφορά', () => {
    const html = render()
    expect(html).toMatch(/<td class="markcell" width="64"/)
    expect(html).not.toMatch(/class="stack"[^>]*width="64"/)
  })

  it('τα σήματα μικραίνουν σε στενή οθόνη αντί να στοιβαχτούν', () => {
    const html = render()
    expect(html).toMatch(/\.logoimg\{width:56px !important/)
    expect(html).toMatch(/\.markimg\{width:44px !important/)
  })

  it('το ΠΕΡΙΕΧΟΜΕΝΟ εξακολουθεί να στοιβάζεται — εκεί χρειάζεται', () => {
    // Φωτογραφία 200px δίπλα σε κείμενο ΠΡΕΠΕΙ να πέσει από κάτω στο κινητό
    const html = render({ blocks: [{ type: 'imageText', src: 'https://x/y.png', html: '<p>κ</p>' } as any] })
    expect(html).toMatch(/class="stack"[^>]*width="200"/)
    expect(html).toContain('.stack{display:block !important;width:100% !important;}')
  })
})

describe('Πίνακας περιεχομένων — τίτλος', () => {
  const withToc = (toc: any) => campaignEmailHtml({
    subject: 'Θ',
    blocks: [toc, { type: 'section', title: 'Πρώτη' }, { type: 'section', title: 'Δεύτερη' }] as any,
  }).html

  it('χωρίς τίτλο χρησιμοποιεί την προεπιλογή', () => {
    expect(withToc({ type: 'toc' })).toContain('ΣΕ ΑΥΤΟ ΤΟ ΤΕΥΧΟΣ')
  })

  it('ο συντάκτης μπορεί να τον μετονομάσει', () => {
    const html = withToc({ type: 'toc', title: 'Τι θα βρεις εδώ' })
    expect(html).toContain('ΤΙ ΘΑ ΒΡΕΙΣ ΕΔΩ')
    expect(html).not.toContain('ΣΕ ΑΥΤΟ ΤΟ ΤΕΥΧΟΣ')
  })

  it('ο τίτλος κεφαλαιοποιείται ΧΩΡΙΣ τόνους, όπως κάθε άλλη επικεφαλίδα', () => {
    // «Νέα» → «ΝΈΑ» με σκέτο toUpperCase· η ελληνική κεφαλαιοποίηση ρίχνει τόνους
    const html = withToc({ type: 'toc', title: 'Νέα και δράσεις' })
    expect(html).toContain('ΝΕΑ ΚΑΙ ΔΡΑΣΕΙΣ')
    expect(html).not.toContain('ΝΈΑ')
  })

  it('η προεπιλογή είναι μία — ίδια στο lib και στην οθόνη', () => {
    expect(TOC_DEFAULT_TITLE).toBe('Σε αυτό το τεύχος')
    expect(withToc({ type: 'toc', title: TOC_DEFAULT_TITLE })).toContain('ΣΕ ΑΥΤΟ ΤΟ ΤΕΥΧΟΣ')
  })
})

describe('Γραμμή απεγγραφής', () => {
  const render = (o: any = {}) => campaignEmailHtml({
    subject: 'Τεύχος', blocks: [{ type: 'text', html: '<p>κ</p>' }] as any, ...o,
  }).html

  it('ΔΕΝ μπαίνει στα μηνύματα του γραφείου', () => {
    // Μια «απεγγραφή» σε απόδειξη ή έγκριση θα υπονοούσε ότι μπορείς να μην
    // τη λάβεις — τα μηνύματα του OC είναι επίσημη αλληλογραφία.
    const html = render()
    expect(html).not.toContain('unsubscribe')
  })

  it('μπαίνει στα newsletter', () => {
    const html = render({ unsubscribe: true })
    expect(html).toContain('{{unsubscribe_link}}')
    expect(html).toContain('{{unsubscribe_text}}')
  })

  it('οι ετικέτες μένουν ΑΚΕΡΑΙΕΣ — τις γεμίζει ο Sender', () => {
    // Αν τις κωδικοποιούσαμε, ο σύνδεσμος θα έφτανε σπασμένος στον παραλήπτη
    const html = render({ unsubscribe: true })
    expect(html).toContain('href="{{unsubscribe_link}}"')
    expect(html).not.toContain('%7B%7B')
    expect(html).not.toContain('&#123;')
  })

  it('λέει ΓΙΑΤΙ το λαμβάνει κανείς — απαίτηση, όχι διακόσμηση', () => {
    expect(render({ unsubscribe: true })).toContain('εγγράφηκες στο newsletter')
  })
})

describe('Νέα μπλοκ', () => {
  const r = (b: any) => campaignEmailHtml({ subject: 'Θ', blocks: [b] as any }).html
  const t = (b: any) => renderCampaignText([b] as any)

  it('Χαιρετισμός: κείμενο με αέρα από πάνω', () => {
    expect(r({ type: 'greeting', html: '<p>Αγαπητή {{όνομα}},</p>' })).toContain('Αγαπητή {{όνομα}}')
  })

  it('Κενό: τρία μεγέθη, κανένα κείμενο', () => {
    expect(r({ type: 'spacer', size: 'small' })).toContain('height="12"')
    expect(r({ type: 'spacer', size: 'medium' })).toContain('height="28"')
    expect(r({ type: 'spacer', size: 'large' })).toContain('height="48"')
    expect(t({ type: 'spacer', size: 'large' })).toBe('')
  })

  it('Απόσπασμα: πλάγια, με απόδοση', () => {
    const h = r({ type: 'quote', html: '<p>Κάτι σημαντικό</p>', who: 'Μαρία Κ.' })
    expect(h).toContain('font-style:italic')
    expect(h).toContain('Μαρία Κ.')
    expect(t({ type: 'quote', html: '<p>Κάτι</p>', who: 'Μαρία' })).toBe('«Κάτι»\n— Μαρία')
  })

  it('Αριθμοί: στοιβάζονται σε στενή οθόνη', () => {
    const h = r({ type: 'stats', items: [{ value: '139', label: 'μέλη' }, { value: '12', label: 'δράσεις' }] })
    expect(h).toContain('139')
    expect(h).toMatch(/class="stack"/)
    expect(t({ type: 'stats', items: [{ value: '139', label: 'μέλη' }] })).toBe('139 μέλη')
  })

  it('Ατζέντα: ημερομηνία, τίτλος, τόπος — και σύνδεσμος προαιρετικά', () => {
    const h = r({ type: 'agenda', rows: [{ date: '12 Οκτ', title: 'Συνέλευση', place: 'Αθήνα', href: 'https://x.gr' }] })
    expect(h).toContain('Συνέλευση')
    expect(h).toContain('Αθήνα')
    expect(h).toContain('https://x.gr')
    // Η ημερομηνία κεφαλαιοποιείται ΧΩΡΙΣ τόνους, όπως κάθε άλλη επικεφαλίδα
    expect(r({ type: 'agenda', rows: [{ date: 'Ιούνιος', title: 'Τ' }] })).toContain('ΙΟΥΝΙΟΣ')
  })

  it('Πλέγμα: σπάει σε σειρές, δεν στριμώχνει τα πάντα σε μία', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ title: `Τ${i}`, html: '<p>κ</p>' }))
    const h = r({ type: 'grid', cols: '2', items })
    // 5 κελιά σε δυάδες → 3 σειρές
    expect((h.match(/<tr>/g) || []).length).toBeGreaterThanOrEqual(3)
    expect(h).toContain('Τ4')
  })

  it('Κοινωνικά δίκτυα: ΚΕΙΜΕΝΟ, όχι εικονίδια', () => {
    // Τα εικονίδια θα ήταν εικόνες που τα γραμματοκιβώτια μπλοκάρουν
    const h = r({ type: 'social', items: [{ network: 'Facebook', href: 'https://fb.com/x' }] })
    expect(h).toContain('Facebook')
    expect(h).not.toContain('<img')
  })

  it('άδεια επαναλαμβανόμενα μπλοκ δεν αφήνουν κενά κουτιά', () => {
    // renderCampaignBody, όχι campaignEmailHtml: το δεύτερο τυλίγει πάντα
    // ολόκληρο έγγραφο, άρα δεν είναι ποτέ κενό
    for (const b of [
      { type: 'stats', items: [] }, { type: 'agenda', rows: [] },
      { type: 'grid', items: [] }, { type: 'social', items: [] },
    ]) expect(renderCampaignBody([b] as any).trim()).toBe('')
  })

  it('όλα τα μπλοκ έχουν ελληνική ετικέτα', () => {
    for (const k of ['greeting', 'grid', 'agenda', 'quote', 'stats', 'social', 'spacer']) {
      expect(BLOCK_LABELS[k as keyof typeof BLOCK_LABELS]).toBeTruthy()
    }
  })
})

describe('Κορυφή του τεύχους', () => {
  const body = (b: any) => renderCampaignBody([b] as any)

  it('η λωρίδα δείχνει στο ΔΙΚΟ μας αρχείο, με τοποθετητή για το URL', () => {
    // Όχι φιλοξενούμενη σελίδα του Sender: ίδια ταυτότητα, δική μας
    // διεύθυνση, και επιβιώνει αν αλλάξουμε πάροχο
    const h = body({ type: 'browserView', tone: 'white' })
    expect(h).toContain('{{ARCHIVE_URL}}')
    expect(h).toContain('Δες το στον browser')
  })

  it('η λωρίδα έχει τέσσερα χρώματα', () => {
    expect(body({ type: 'browserView', tone: 'dark' })).toContain(BRAND.ink)
    expect(body({ type: 'browserView', tone: 'coral' })).toContain(BRAND.coral)
    expect(body({ type: 'browserView', tone: 'cream' })).toContain(BRAND.cream)
    expect(body({ type: 'browserView', tone: 'white' })).toContain(BRAND.white)
  })

  it('η κεφαλίδα έχει πέντε διατάξεις και όλες αποδίδουν τον τίτλο', () => {
    for (const layout of ['textTop', 'imageTop', 'imageLeft', 'imageRight', 'minimal']) {
      const h = body({ type: 'masthead', layout, title: 'Σεπτέμβριος 2026', eyebrow: 'Community Journal' })
      expect(h).toContain('ΣΕΠΤΕΜΒΡΙΟΣ 2026')
      expect(h).toContain('COMMUNITY JOURNAL')
    }
  })

  it('διάταξη και χρώμα είναι ΑΝΕΞΑΡΤΗΤΑ', () => {
    // Παλιά ένα «style» τα έδενε μαζί: «σκούρα με εικόνα πρώτα» ήταν αδύνατο
    const h = body({ type: 'masthead', layout: 'imageTop', tone: 'dark', title: 'Τ', src: 'https://x/y.jpg' })
    expect(h).toContain(BRAND.ink)
    expect(h.indexOf('<img')).toBeLessThan(h.indexOf('Τ</div>') >= 0 ? h.indexOf('Τ</div>') : h.length)
  })

  it('τέσσερα χρώματα ζώνης', () => {
    expect(body({ type: 'masthead', tone: 'coral', title: 'Τ' })).toContain(BRAND.coral)
    expect(body({ type: 'masthead', tone: 'dark', title: 'Τ' })).toContain(BRAND.ink)
    expect(body({ type: 'masthead', tone: 'cream', title: 'Τ' })).toContain(BRAND.cream)
    expect(body({ type: 'masthead', tone: 'white', title: 'Τ' })).toContain(BRAND.white)
  })

  it('η φωτογραφία μπαίνει ή βγαίνει με διακόπτη', () => {
    const on = { type: 'masthead', title: 'Τ', src: 'https://x/y.jpg', withImage: true }
    expect(body(on)).toContain('<img')
    expect(body({ ...on, withImage: false })).not.toContain('<img')
  })

  it('τρία μεγέθη φωτογραφίας δίνουν τρία πλάτη', () => {
    const w = (imageSize: string) => {
      const h = body({ type: 'masthead', title: 'Τ', src: 'https://x/y.jpg', imageSize })
      return Number(h.match(/width="(\d+)"/)![1])
    }
    expect(w('small')).toBeLessThan(w('medium'))
    expect(w('medium')).toBeLessThan(w('large'))
    expect(w('large')).toBe(INNER_WIDTH)
  })

  it('η φωτογραφία έχει αέρα από τον τίτλο — δεν κολλά στο χείλος', () => {
    // Κολλημένη στη ζώνη έμοιαζε με λάθος στοίχιση
    const h = body({ type: 'masthead', layout: 'textTop', title: 'Τ', src: 'https://x/y.jpg' })
    expect(h).toMatch(/height:22px/)
  })

  it('«φωτογραφία πάνω» βάζει την εικόνα ΠΡΙΝ τον τίτλο', () => {
    const h = body({ type: 'masthead', layout: 'imageTop', title: 'Τίτλος', src: 'https://x/y.jpg' })
    expect(h.indexOf('<img')).toBeLessThan(h.indexOf('ΤΙΤΛΟΣ'))
  })

  it('«φωτογραφία αριστερά/δεξιά» στοιβάζονται σε στενή οθόνη', () => {
    for (const layout of ['imageLeft', 'imageRight']) {
      const h = body({ type: 'masthead', layout, title: 'Τ', src: 'https://x/y.jpg' })
      expect(h).toContain('class="stack"')
    }
  })
})

describe('Κλικ στην προεπισκόπηση', () => {
  const blocks = [
    { type: 'section', title: 'Πρώτη' },
    { type: 'text', html: '<p>κείμενο</p>' },
    { type: 'button', label: 'Πάτα', href: 'https://x.gr' },
  ] as any[]

  it('η σήμανση μπαίνει ΜΟΝΟ όταν ζητηθεί', () => {
    // Στο γράμμα που φεύγει είναι άχρηστα bytes σε κάθε παραλήπτη
    expect(renderCampaignBody(blocks)).not.toContain('data-b=')
    expect(renderCampaignBody(blocks, true)).toContain('data-b=')
  })

  it('κάθε μπλοκ παίρνει τη ΔΙΚΗ του θέση', () => {
    const h = renderCampaignBody(blocks, true)
    for (let i = 0; i < blocks.length; i++) expect(h).toContain(`data-b="${i}"`)
  })

  it('το σενάριο επιλογής μπαίνει μόνο στην προεπισκόπηση', () => {
    const plain = campaignEmailHtml({ subject: 'Θ', blocks }).html
    const preview = campaignEmailHtml({ subject: 'Θ', blocks, annotate: true }).html
    expect(plain).not.toContain('oc-preview')
    expect(preview).toContain('oc-preview')
    expect(preview).toContain('postMessage')
  })

  it('το σταλμένο γράμμα δεν κουβαλά ούτε σενάριο ούτε σήμανση', () => {
    const sent = campaignEmailHtml({ subject: 'Θ', blocks, unsubscribe: true }).html
    expect(sent).not.toContain('<script')
    expect(sent).not.toContain('data-b=')
  })
})

describe('Εμφανίσεις παραγράφου', () => {
  const body = (b: any) => renderCampaignBody([b] as any)
  const P = (tone?: string) => ({ type: 'text', html: '<p>κείμενο</p>', ...(tone ? { tone } : {}) })

  it('πέντε επιλογές στη λίστα', () => {
    expect(BLOCK_VARIANTS.text!.options.map(o => o.value))
      .toEqual(['normal', 'soft', 'cream', 'coral', 'dark'])
  })

  it('κανονικό και δευτερεύον μένουν σκέτο κείμενο', () => {
    expect(body(P())).not.toContain('background-color')
    expect(body(P('soft'))).not.toContain('background-color')
  })

  it('οι τρεις ζώνες βάφουν φόντο ΚΑΙ γράμματα', () => {
    expect(body(P('cream'))).toContain(BRAND.cream)
    expect(body(P('coral'))).toContain(BRAND.coral)
    const dark = body(P('dark'))
    expect(dark).toContain(BRAND.ink)
    // Λευκά γράμματα σε σκούρο: το χρώμα δεν το διαλέγει ο συντάκτης
    expect(dark).toContain(`color:${BRAND.white}`)
  })

  it('οι σύνδεσμοι μέσα σε σκούρη ζώνη αλλάζουν χρώμα', () => {
    // Αλλιώς coralDeep πάνω σε ανθρακί = αδιάβαστο
    const h = body({ type: 'text', tone: 'dark', html: '<p><a href="https://x.gr">δες</a></p>' })
    expect(h).toContain(`color:${BRAND.white};text-decoration:underline`)
    expect(h).not.toContain(`color:${BRAND.coralDeep};text-decoration:underline`)
  })

  it('ισχύει και στα απλά μηνύματα, όχι μόνο στα newsletter', () => {
    // Ίδιο μπλοκ, ίδια απόδοση — δεν υπάρχει χωριστός συνθέτης
    const sent = campaignEmailHtml({ subject: 'Θ', blocks: [P('cream')] as any }).html
    expect(sent).toContain(BRAND.cream)
  })
})

describe('Μέγεθος φωτογραφίας κεφαλίδας', () => {
  const w = (imageSize: string, layout = 'textTop') => {
    const h = renderCampaignBody([{ type: 'masthead', layout, title: 'Τ', src: 'https://x/y.jpg', imageSize } as any])
    return Number(h.match(/<table[^>]*width="(\d+)"[^>]*align="center"/)![1])
  }

  it('το πλάτος μπαίνει σε ΠΙΝΑΚΑ, όχι σε max-width', () => {
    // Ο Outlook αγνοεί το max-width: εκεί κάθε μέγεθος έβγαινε ίδιο, σε
    // πλήρες πλάτος. Ο πίνακας με σταθερό width τον σέβονται όλοι.
    const h = renderCampaignBody([{ type: 'masthead', title: 'Τ', src: 'https://x/y.jpg', imageSize: 'small' } as any])
    const small = Math.round(INNER_WIDTH * 0.62)
    expect(h).toMatch(new RegExp(`<table[^>]*width="${small}"[^>]*style="width:${small}px`))
  })

  it('τα τρία μεγέθη δίνουν τρία διαφορετικά πλάτη', () => {
    // Παράγονται από το πλάτος της κάρτας — όχι μαγικοί αριθμοί που
    // σαπίζουν με την πρώτη αλλαγή πλάτους
    expect(w('small')).toBe(Math.round(INNER_WIDTH * 0.62))
    expect(w('medium')).toBe(Math.round(INNER_WIDTH * 0.82))
    expect(w('large')).toBe(INNER_WIDTH)
  })

  it('ισχύει και όταν η φωτογραφία είναι πάνω από τον τίτλο', () => {
    expect(w('small', 'imageTop')).toBeLessThan(w('large', 'imageTop'))
  })
})

describe('Επικεφαλίδα ενότητας', () => {
  const body = (b: any) => renderCampaignBody([{ type: 'section', title: 'CforC Updates', ...b }] as any)

  it('μοντέρνα εξ ορισμού — ζώνη με στρογγυλεμένες γωνίες', () => {
    const h = body({})
    expect(h).toContain('border-radius:14px')
    expect(h).toContain(BRAND.coral)
    expect(h).toContain('CforC Updates')
  })

  it('επτά εμφανίσεις: πέντε πλήρους πλάτους, δύο ένθετες', () => {
    const opts = BLOCK_VARIANTS.section!.options.map(o => o.value)
    expect(opts).toHaveLength(7)
    for (const v of ['coral', 'dark', 'cream', 'tint', 'outline']) {
      expect(body({ look: v })).toContain('width="100%"')
    }
    for (const v of ['pill', 'pillOutline']) {
      expect(body({ look: v })).not.toContain('width="100%"')
    }
  })

  it('το σήμα μπαίνει, βγαίνει και αλλάζει πλευρά', () => {
    expect(body({ logo: true })).toContain('<img')
    expect(body({ logo: false })).not.toContain('<img')
    const left = body({ logo: true, logoSide: 'left' })
    const right = body({ logo: true, logoSide: 'right' })
    expect(left.indexOf('<img')).toBeLessThan(left.indexOf('CforC Updates'))
    expect(right.indexOf('<img')).toBeGreaterThan(right.indexOf('CforC Updates'))
  })

  it('το σήμα ταιριάζει με το φόντο — ποτέ σκούρο πάνω σε σκούρο', () => {
    // Ο συντάκτης διαλέγει εμφάνιση, όχι χρώματα
    expect(body({ look: 'dark', logo: true })).toContain('cforc_mark_light')
    expect(body({ look: 'cream', logo: true })).toContain('cforc_mark_dark')
    expect(body({ look: 'tint', logo: true })).toContain('cforc_mark_dark')
  })

  it('η κλασική κρατά τη λιτή μορφή με τη γραμμή', () => {
    const h = body({ variant: 'classic' })
    expect(h).toContain('border-top:2px solid')
    expect(h).not.toContain('border-radius:14px')
    // …και κεφαλαία χωρίς τόνους, όπως πάντα
    expect(body({ variant: 'classic', title: 'Νέα' })).toContain('ΝΕΑ')
  })

  it('η άγκυρα μένει — ο πίνακας περιεχομένων δείχνει σε αυτήν', () => {
    for (const variant of ['modern', 'classic']) {
      expect(body({ variant })).toMatch(/<a id="s0-/)
    }
  })
})

describe('Κενές γραμμές και στοίχιση', () => {
  it('η κενή παράγραφος πιάνει χώρο αντί να εξαφανίζεται', () => {
    // Ο επεξεργαστής δίνει «<p></p>» σε άδειο Enter· χωρίς περιεχόμενο δεν
    // φτιάχνει γραμμή, οπότε το κενό που ζήτησε ο συντάκτης χανόταν
    expect(richText('<p>Ένα</p><p></p><p>Δύο</p>')).toBe('<p>Ένα</p><p>&nbsp;</p><p>Δύο</p>')
  })

  it('…και όταν ο επεξεργαστής βάζει <br> μέσα της', () => {
    expect(richText('<p><br></p>')).toBe('<p>&nbsp;</p>')
    expect(richText('<p><br /></p>')).toBe('<p>&nbsp;</p>')
  })

  it('παράγραφος ΜΕ περιεχόμενο δεν πειράζεται', () => {
    expect(richText('<p>Κείμενο</p>')).toBe('<p>Κείμενο</p>')
  })

  it('και οι τέσσερις στοιχίσεις επιβιώνουν', () => {
    for (const a of ['left', 'center', 'right', 'justify']) {
      expect(richText(`<p style="text-align: ${a}">Κ</p>`)).toBe(`<p style="text-align:${a};">Κ</p>`)
    }
  })

  it('η στοίχιση δουλεύει και σε επικεφαλίδες', () => {
    expect(richText('<h2 style="text-align:center">Τ</h2>')).toContain('text-align:center;')
  })

  it('ΜΟΝΟ η στοίχιση περνά — τίποτε άλλο από το style', () => {
    // Αλλιώς ο καθένας θα έβαζε αυθαίρετο CSS μέσα στο γράμμα
    const out = richText('<p style="color:red;font-size:40px;text-align:right">Χ</p>')
    expect(out).toBe('<p style="text-align:right;">Χ</p>')
    expect(out).not.toContain('color:red')
  })

  it('άγνωστη τιμή στοίχισης αγνοείται', () => {
    expect(richText('<p style="text-align:inherit">Χ</p>')).toBe('<p>Χ</p>')
  })
})

describe('Κύλιση προεπισκόπησης', () => {
  it('το πλαίσιο αναφέρει πού βρίσκεται', () => {
    // Δεν μπορούμε να το διαβάσουμε απ' έξω: τρέχει με allow-scripts ΧΩΡΙΣ
    // allow-same-origin, οπότε μας το λέει το ίδιο
    const h = campaignEmailHtml({ subject: 'Θ', blocks: [{ type: 'text', html: '<p>κ</p>' }] as any, annotate: true }).html
    expect(h).toContain("addEventListener('scroll'")
    expect(h).toContain('scroll: window.scrollY')
  })

  it('το σταλμένο γράμμα δεν παρακολουθεί τίποτα', () => {
    const sent = campaignEmailHtml({ subject: 'Θ', blocks: [{ type: 'text', html: '<p>κ</p>' }] as any }).html
    expect(sent).not.toContain('addEventListener')
    expect(sent).not.toContain('postMessage')
  })
})

describe('Εικόνα — μέγεθος, στοίχιση, ζώνη', () => {
  const body = (b: any) => renderCampaignBody([{ type: 'image', src: 'https://x/y.jpg', alt: 'φ', ...b }] as any)
  const width = (b: any) => Number(body(b).match(/<table[^>]*width="(\d+)"/)?.[1] ?? 0)

  it('τέσσερα μεγέθη, από πλήρες πλάτος ως μικρή', () => {
    expect(body({ size: 'full' })).not.toMatch(/<table[^>]*width="\d+"/)
    expect(width({ size: 'large' })).toBe(420)
    expect(width({ size: 'medium' })).toBe(300)
    expect(width({ size: 'small' })).toBe(200)
  })

  it('το παλιό «inset» εξακολουθεί να δουλεύει', () => {
    // Καμία υπάρχουσα καμπάνια δεν χαλάει επειδή άλλαξαν οι επιλογές
    expect(width({ size: 'inset' })).toBe(300)
  })

  it('τρεις στοιχίσεις, με πίνακα και align — όχι margin:auto', () => {
    // Το margin:auto δεν κεντράρει σε γραμματοκιβώτιο
    for (const a of ['left', 'center', 'right']) {
      expect(body({ size: 'medium', align: a })).toContain(`align="${a}"`)
    }
  })

  it('η ζώνη πιάνει όλο το πλάτος και βάφει το φόντο', () => {
    expect(body({ band: 'coral' })).toContain(`background-color:${BRAND.coral}`)
    expect(body({ band: 'dark' })).toContain(`background-color:${BRAND.ink}`)
    expect(body({ band: 'cream' })).toContain(`background-color:${BRAND.cream}`)
    expect(body({ band: 'tint' })).toContain(`background-color:${BRAND.coralTint}`)
  })

  it('χωρίς ζώνη δεν μπαίνει φόντο', () => {
    expect(body({ band: 'none' })).not.toContain('background-color')
    expect(body({})).not.toContain('background-color')
  })

  it('ζώνη και μέγεθος συνδυάζονται ελεύθερα', () => {
    const h = body({ band: 'dark', size: 'small', align: 'right' })
    expect(h).toContain(BRAND.ink)
    expect(h).toContain('width="200"')
    expect(h).toContain('align="right"')
  })
})

describe('Μονόστοιχο κουτί', () => {
  const body = (b: any) => renderCampaignBody([{ type: 'mono', label: 'IBAN', value: 'GR12 3456', ...b }] as any)

  it('επτά εμφανίσεις, ίδιο λεξιλόγιο με την επικεφαλίδα ενότητας', () => {
    // Δύο συστήματα χρωμάτων στο ίδιο γράμμα μοιάζουν με δύο έντυπα
    expect(BLOCK_VARIANTS.mono!.options.map(o => o.value))
      .toEqual(BLOCK_VARIANTS.section!.options.map(o => o.value).sort((a, b) =>
        BLOCK_VARIANTS.mono!.options.findIndex(x => x.value === a) -
        BLOCK_VARIANTS.mono!.options.findIndex(x => x.value === b)))
    expect(BLOCK_VARIANTS.mono!.options).toHaveLength(7)
  })

  it('πέντε πλήρους πλάτους, δύο ένθετες', () => {
    for (const v of ['cream', 'coral', 'dark', 'tint', 'outline']) {
      expect(body({ look: v })).toContain('width="100%"')
    }
    for (const v of ['pill', 'pillOutline']) {
      expect(body({ look: v })).not.toContain('width="100%"')
    }
  })

  it('τα γράμματα ταιριάζουν με το φόντο', () => {
    expect(body({ look: 'dark' })).toContain(`color:${BRAND.white}`)
    expect(body({ look: 'cream' })).toContain(`color:${BRAND.ink}`)
  })

  it('η τιμή μένει μονόστοιχη και σπάει σε μεγάλα μήκη', () => {
    // Ένα IBAN πρέπει να χωρά σε στενή οθόνη χωρίς οριζόντια κύλιση
    const h = body({})
    expect(h).toContain('Courier New')
    expect(h).toContain('word-break:break-all')
  })

  it('χωρίς ετικέτα δεν αφήνει κενή γραμμή', () => {
    expect(body({ label: '' })).not.toContain('letter-spacing:1px')
  })
})

describe('Εικόνα + κείμενο', () => {
  const body = (b: any) => renderCampaignBody([
    { type: 'imageText', src: 'https://x/y.jpg', alt: 'φ', html: '<p>κείμενο</p>', ...b },
  ] as any)

  it('τρία μεγέθη φωτογραφίας', () => {
    expect(body({ size: 'small' })).toContain('width="140"')
    expect(body({ size: 'medium' })).toContain('width="200"')
    expect(body({ size: 'large' })).toContain('width="280"')
  })

  it('η φωτογραφία αλλάζει πλευρά', () => {
    const l = body({ side: 'left' }), r = body({ side: 'right' })
    expect(l.indexOf('<img')).toBeLessThan(l.indexOf('κείμενο'))
    expect(r.indexOf('<img')).toBeGreaterThan(r.indexOf('κείμενο'))
  })

  it('το κείμενο ευθυγραμμίζεται πάνω ή στο κέντρο', () => {
    expect(body({ valign: 'top' })).toContain('vertical-align:top')
    expect(body({ valign: 'middle' })).toContain('vertical-align:middle')
  })

  it('η ζώνη βάφει φόντο ΚΑΙ γράμματα', () => {
    const d = body({ band: 'dark' })
    expect(d).toContain(`background-color:${BRAND.ink}`)
    expect(d).toContain(`color:${BRAND.white}`)
    expect(body({ band: 'coral' })).toContain(`background-color:${BRAND.coral}`)
  })

  it('οι σύνδεσμοι μέσα σε σκούρη ζώνη γίνονται αναγνώσιμοι', () => {
    const h = body({ band: 'dark', html: '<p><a href="https://x.gr">δες</a></p>' })
    expect(h).toContain(`color:${BRAND.white};text-decoration:underline`)
  })

  it('χωρίς ζώνη μένει όπως ήταν', () => {
    expect(body({})).not.toContain('background-color')
  })

  it('στοιβάζεται πάντα σε στενή οθόνη', () => {
    // Φωτογραφία δίπλα σε κείμενο ΠΡΕΠΕΙ να πέσει από κάτω στο κινητό
    for (const band of ['none', 'dark']) expect(body({ band })).toContain('class="stack"')
  })
})

describe('Απόκρυψη στοιχείου', () => {
  const two = [
    { type: 'text', html: '<p>ορατό</p>' },
    { type: 'text', html: '<p>κρυφό</p>', hidden: true },
  ] as any[]

  it('το κρυφό δεν αποδίδεται στο γράμμα', () => {
    const h = renderCampaignBody(two)
    expect(h).toContain('ορατό')
    expect(h).not.toContain('κρυφό')
  })

  it('…ούτε στο απλό κείμενο', () => {
    const t = renderCampaignText(two)
    expect(t).toContain('ορατό')
    expect(t).not.toContain('κρυφό')
  })

  it('…ούτε στο σταλμένο γράμμα — όχι μόνο στην προεπισκόπηση', () => {
    // Αλλιώς θα ενέκρινες ό,τι βλέπεις και θα έφευγε κάτι άλλο
    const sent = campaignEmailHtml({ subject: 'Θ', blocks: two }).html
    expect(sent).not.toContain('κρυφό')
  })

  it('η κρυφή ενότητα φεύγει και από τον πίνακα περιεχομένων', () => {
    const h = renderCampaignBody([
      { type: 'toc' },
      { type: 'section', title: 'Ορατή' },
      { type: 'section', title: 'Κρυμμένη', hidden: true },
      { type: 'section', title: 'Τρίτη' },
    ] as any)
    expect(h).toContain('Ορατή')
    expect(h).not.toContain('Κρυμμένη')
  })

  it('οι θέσεις ΔΕΝ μετατοπίζονται — το κλικ δείχνει στο σωστό μπλοκ', () => {
    // Αν φιλτράραμε πριν τη σήμανση, το κλικ θα άνοιγε λάθος στοιχείο
    const h = renderCampaignBody([
      { type: 'text', html: '<p>ένα</p>' },
      { type: 'text', html: '<p>δύο</p>', hidden: true },
      { type: 'text', html: '<p>τρία</p>' },
    ] as any, true)
    expect(h).toContain('data-b="0"')
    expect(h).toContain('data-b="2"')
    expect(h).not.toContain('data-b="1"')
  })

  it('visibleBlocks κρατά μόνο ό,τι φεύγει', () => {
    expect(visibleBlocks(two)).toHaveLength(1)
    expect(visibleBlocks([])).toEqual([])
  })
})

describe('Μπλοκ χωρίς φωτογραφία', () => {
  it('η σκέτη Εικόνα δεν αποδίδει τίποτα', () => {
    // Ένα <img src=""> ζωγραφίζει σπασμένο στρογγυλεμένο πλαίσιο
    expect(renderCampaignBody([{ type: 'image', src: '', alt: '' }] as any).trim()).toBe('')
  })

  it('Εικόνα + Κείμενο κρατά τη στήλη κενή, χωρίς <img>', () => {
    // Το μπλοκ χρησιμεύει και σκέτο: σπρώχνει κείμενο στη μία πλευρά
    const h = renderCampaignBody([
      { type: 'imageText', src: '', alt: '', html: '<p>μόνο κείμενο</p>', size: 'medium' },
    ] as any)
    expect(h).not.toContain('<img')
    expect(h).toContain('μόνο κείμενο')
    expect(h).toContain('width="200"')
  })

  it('η πλευρά εξακολουθεί να μετράει χωρίς φωτογραφία', () => {
    const left = renderCampaignBody([{ type: 'imageText', src: '', html: '<p>κ</p>', side: 'left' }] as any)
    const right = renderCampaignBody([{ type: 'imageText', src: '', html: '<p>κ</p>', side: 'right' }] as any)
    expect(left.indexOf('&nbsp;')).toBeLessThan(left.indexOf('κ<'))
    expect(right.indexOf('κ<')).toBeLessThan(right.lastIndexOf('&nbsp;'))
  })

  it('με φωτογραφία τίποτα δεν αλλάζει', () => {
    const h = renderCampaignBody([{ type: 'imageText', src: 'https://x/y.jpg', alt: 'φ', html: '<p>κ</p>' }] as any)
    expect(h).toContain('<img')
  })
})

describe('Πλάτος κάρτας', () => {
  const doc = campaignEmailHtml({ subject: 'Θ', blocks: [{ type: 'text', html: '<p>κ</p>' }] as any }).html

  it('640px — μέσα στον κανόνα 600–640 για email', () => {
    // Πάνω από 640 ο Outlook των Windows (μηχανή του Word) γίνεται απρόβλεπτος
    expect(doc).toContain('width="640"')
    expect(doc).toContain('max-width:640px')
  })

  it('το πλάτος μένει ρευστό — δεν καρφώνεται σε 640', () => {
    expect(doc).toContain('width:100%;max-width:640px')
  })

  it('το σημείο θραύσης είναι ΚΑΤΩ από το πλάτος που χρειάζεται η κάρτα', () => {
    /**
     * Η κάρτα θέλει 640 + 12px περιθώριο εκατέρωθεν = 664. Το όριο πρέπει να
     * είναι 663: στα 664 στοίβαζε ενώ ακόμη χωρούσε.
     *
     * Και ΠΡΕΠΕΙ να είναι μικρότερο από το πλάτος του πλαισίου
     * προεπισκόπησης (680) — όταν συνέπεσαν, η προεπισκόπηση έδειχνε τα
     * πάντα στοιβαγμένα στον υπολογιστή.
     */
    const bp = Number(doc.match(/max-width:(\d+)px\)\{/)![1])
    const needed = INNER_WIDTH + 96 + 24
    expect(bp).toBe(needed - 1)
    expect(bp).toBeLessThan(PREVIEW_DESKTOP_WIDTH)
  })

  it('τα εσωτερικά πλάτη παράγονται από το πλάτος της κάρτας', () => {
    // Αλλιώς μια αλλαγή εδώ αφήνει εικόνες κολλημένες στο παλιό μέγεθος
    const full = renderCampaignBody([{ type: 'image', src: 'https://x/y.jpg', alt: 'φ', size: 'full' }] as any)
    expect(full).toContain('width="544"')   // 640 − 96 περιθώρια
  })
})

describe('Πλοήγηση συνθέτη ⇄ προεπισκόπησης', () => {
  const doc = campaignEmailHtml({
    subject: 'Θ', annotate: true,
    blocks: [{ type: 'text', html: '<p>α</p>' }, { type: 'text', html: '<p>β</p>' }] as any,
  }).html

  it('η προεπισκόπηση ακούει εντολή «πήγαινε σε αυτό το μπλοκ»', () => {
    expect(doc).toContain("d.source !== 'oc-editor'")
    expect(doc).toContain('scrollIntoView')
  })

  it('…και δείχνει ποιο βρήκε, πριν σβήσει η ένδειξη', () => {
    expect(doc).toContain("el.style.outline = '3px solid #FF8B6A'")
  })

  it('η διαδρομή είναι αμφίδρομη στο ίδιο σενάριο', () => {
    // Κλικ στην προεπισκόπηση → μπλοκ, και κλικ στο μπλοκ → προεπισκόπηση
    expect(doc).toContain("source: 'oc-preview'")
    expect(doc).toContain("d.source !== 'oc-editor'")
  })

  it('τίποτα από αυτά δεν φεύγει στο γράμμα', () => {
    const sent = campaignEmailHtml({ subject: 'Θ', blocks: [{ type: 'text', html: '<p>α</p>' }] as any }).html
    expect(sent).not.toContain('oc-editor')
    expect(sent).not.toContain('scrollIntoView')
  })
})
