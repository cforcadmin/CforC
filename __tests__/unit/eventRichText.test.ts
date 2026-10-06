import { descriptionHtml, hasDescription, looksLikeHtml } from '@/lib/eventRichText'

describe('looksLikeHtml', () => {
  it('βρίσκει ετικέτες', () => {
    expect(looksLikeHtml('<p>γεια</p>')).toBe(true)
    expect(looksLikeHtml('κάτι με <strong>έντονα</strong>')).toBe(true)
  })
  it('δεν μπερδεύεται με μαθηματικά ή εισαγωγικά', () => {
    expect(looksLikeHtml('5 < 7 και 9 > 3')).toBe(false)
    expect(looksLikeHtml('Δράση 2026 — Θεσσαλονίκη')).toBe(false)
  })
  it('κενό δεν είναι HTML', () => {
    expect(looksLikeHtml('')).toBe(false)
    expect(looksLikeHtml(null)).toBe(false)
  })
})

/**
 * Η ΣΥΜΒΑΤΟΤΗΤΑ: οι υπάρχουσες περιγραφές είναι απλό κείμενο και πρέπει να
 * φαίνονται ΙΔΙΕΣ μετά την αλλαγή — όχι «σχεδόν ίδιες».
 */
describe('παλιό απλό κείμενο', () => {
  it('μία παράγραφος', () => {
    expect(descriptionHtml('Καλώς ήρθατε.')).toBe('<p>Καλώς ήρθατε.</p>')
  })
  it('κενή γραμμή χωρίζει παραγράφους', () => {
    expect(descriptionHtml('Πρώτη.\n\nΔεύτερη.')).toBe('<p>Πρώτη.</p><p>Δεύτερη.</p>')
  })
  it('μονή αλλαγή γραμμής γίνεται <br>, όπως το whitespace-pre-line', () => {
    expect(descriptionHtml('Γραμμή Α\nΓραμμή Β')).toBe('<p>Γραμμή Α<br>Γραμμή Β</p>')
  })
  it('τρεις ή περισσότερες κενές γραμμές δεν φτιάχνουν κενές παραγράφους', () => {
    expect(descriptionHtml('Α\n\n\n\nΒ')).toBe('<p>Α</p><p>Β</p>')
  })

  /* ΤΟ ΚΡΙΣΙΜΟ: κείμενο που ΜΟΙΑΖΕΙ με σήμανση δεν εκτελείται ποτέ */
  it('διαφεύγει ό,τι μοιάζει με ετικέτα αλλά δεν είναι', () => {
    expect(descriptionHtml('Τιμή < 10 & άνω > 5')).toBe('<p>Τιμή &lt; 10 &amp; άνω &gt; 5</p>')
  })
})

describe('νέο HTML από τον επεξεργαστή', () => {
  it('περνά τις επιτρεπόμενες ετικέτες', () => {
    const out = descriptionHtml('<p>Με <strong>έντονα</strong> και <em>πλάγια</em>.</p>')
    expect(out).toContain('<strong>έντονα</strong>')
    expect(out).toContain('<em>πλάγια</em>')
  })
  it('κρατά λίστες και επικεφαλίδες', () => {
    const out = descriptionHtml('<h2>Τίτλος</h2><ul><li>ένα</li><li>δύο</li></ul>')
    expect(out).toContain('<h2>')
    expect(out).toContain('<li>ένα</li>')
  })
  it('κρατά συνδέσμους', () => {
    expect(descriptionHtml('<p><a href="https://x.gr">εδώ</a></p>')).toContain('href="https://x.gr"')
  })

  /* Ο ίδιος καθαριστής με τα γράμματα — μία λίστα για όλο το έργο */
  it('πετά script', () => {
    const out = descriptionHtml('<p>ok</p><script>alert(1)</script>')
    expect(out).not.toMatch(/script/i)
    expect(out).toContain('<p>ok</p>')
  })
  it('πετά ετικέτες εκτός λίστας', () => {
    expect(descriptionHtml('<p>a</p><iframe src="x"></iframe>')).not.toMatch(/iframe/i)
  })
})

describe('hasDescription', () => {
  it('κενό και μόνο-ετικέτες δεν μετράνε', () => {
    expect(hasDescription('')).toBe(false)
    expect(hasDescription(null)).toBe(false)
    expect(hasDescription('<p></p>')).toBe(false)
    expect(hasDescription('<p>&nbsp;</p>')).toBe(false)
  })
  it('πραγματικό περιεχόμενο μετράει', () => {
    expect(hasDescription('Κάτι')).toBe(true)
    expect(hasDescription('<p>Κάτι</p>')).toBe(true)
  })
})

/**
 * Ο καθαριστής της ΣΕΛΙΔΑΣ είναι άλλος από του ΓΡΑΜΜΑΤΟΣ. Εκείνος καρφώνει
 * χρώμα και γραμματοσειρά για τα mail clients· εδώ αυτό θα έδινε σχεδόν
 * μαύρα γράμματα σε σκούρο φόντο στο dark mode.
 */
describe('καμία inline σήμανση στη σελίδα', () => {
  it('οι επικεφαλίδες βγαίνουν γυμνές — τις ντύνει το prose', () => {
    expect(descriptionHtml('<h2>Τίτλος</h2>')).toBe('<h2>Τίτλος</h2>')
  })
  it('κανένα καρφωμένο χρώμα ή γραμματοσειρά πουθενά', () => {
    const out = descriptionHtml('<h2>Α</h2><h3>Β</h3><p><a href="https://x.gr">γ</a></p>')
    expect(out).not.toMatch(/color:/i)
    expect(out).not.toMatch(/font-family/i)
  })
  it('η στοίχιση επιβιώνει, τίποτε άλλο από το style', () => {
    expect(descriptionHtml('<p style="text-align:center;color:red">Α</p>'))
      .toBe('<p style="text-align:center">Α</p>')
  })
  it('ο σύνδεσμος ανοίγει με ασφάλεια σε νέα καρτέλα', () => {
    expect(descriptionHtml('<a href="https://x.gr">ε</a>'))
      .toContain('rel="noopener noreferrer"')
  })
})

describe('ασφάλεια', () => {
  it('javascript: δεν γίνεται σύνδεσμος', () => {
    const out = descriptionHtml('<p><a href="javascript:alert(1)">κλικ</a></p>')
    expect(out).not.toMatch(/javascript/i)
    expect(out).toBe('<p>κλικ</p>')
  })
  it('πέφτει κάθε handler συμβάντος', () => {
    expect(descriptionHtml('<p onclick="steal()">Α</p>')).toBe('<p>Α</p>')
  })
  it('δεν μένει ορφανό </a> όταν ο σύνδεσμος απορριφθεί', () => {
    expect(descriptionHtml('<p><a href="/σχετικό">κείμενο</a> τέλος</p>'))
      .toBe('<p>κείμενο τέλος</p>')
  })
  it('εικόνες δεν περνούν', () => {
    expect(descriptionHtml('<p>α</p><img src=x onerror=alert(1)>')).toBe('<p>α</p>')
  })
})
