/**
 * ΤΟ ΛΕΞΙΛΟΓΙΟ ΤΩΝ ΤΡΙΩΝ ΕΙΔΩΝ ΠΕΡΙΕΧΟΜΕΝΟΥ.
 *
 * Τα ονόματα των πεδίων ΔΕΝ είναι δική μας επιλογή: το Strapi έχει `Title`
 * στα Νέα και `title` στα Έργα. Μια «τακτοποίηση» εδώ θα έσπαγε κάθε
 * υπάρχουσα εγγραφή — γι' αυτό υπάρχει τεστ που τα καρφώνει.
 */
import { CONTENT_TYPES, slugify, validateContent, articleHtmlFor, toStrapiFields, greekDate, pageChromeHtml } from '@/lib/ocContent'

describe('slugify', () => {
  it('μεταγράφει ελληνικά, αφού πρώτα βγάλει τους τόνους', () => {
    expect(slugify('Τεύχος Οκτωβρίου')).toBe('teyhos-oktovrioy')
    expect(slugify('Το CforC στο Bridge Makers')).toBe('to-cforc-sto-bridge-makers')
  })
  it('δεν αφήνει ποτέ κενό slug', () => {
    expect(slugify('')).toBe('arthro')
    expect(slugify('!!!')).toBe('arthro')
  })
  it('δεν τελειώνει σε παύλα όταν κόβεται', () => {
    expect(slugify('α'.repeat(200))).not.toMatch(/-$/)
  })
})

describe('CONTENT_TYPES', () => {
  it('τα ονόματα πεδίων είναι ΑΚΡΙΒΩΣ του Strapi, με τα κεφαλαία τους', () => {
    expect(CONTENT_TYPES.news.titleField).toBe('Title')
    expect(CONTENT_TYPES.news.slugField).toBe('Slug')
    expect(CONTENT_TYPES.projects.titleField).toBe('title')
    expect(CONTENT_TYPES.projects.slugField).toBe('slug')
    expect(CONTENT_TYPES.entries.path).toBe('project-entries')
  })

  it('κάθε είδος ζητά περίληψη — αλλιώς αδειάζουν κάρτα, Google και αναζήτηση', () => {
    for (const key of ['news', 'projects', 'entries'] as const) {
      const ex = CONTENT_TYPES[key].fields.find(f => f.name === 'Excerpt')
      expect(ex?.required).toBe(true)
    }
  })

  it('αγγλικά μόνο στα Νέα — αλλού δεν υπάρχει αγγλική προβολή', () => {
    expect(CONTENT_TYPES.news.englishField).toBe(true)
    expect(CONTENT_TYPES.projects.englishField).toBeUndefined()
    expect(CONTENT_TYPES.entries.englishField).toBeUndefined()
  })

  it('η λίστα δεν κατεβάζει ποτέ Html ή Blocks', () => {
    for (const key of ['news', 'projects', 'entries'] as const) {
      expect(CONTENT_TYPES[key].listFields).not.toContain('Html')
      expect(CONTENT_TYPES[key].listFields).not.toContain('Blocks')
    }
  })
})

describe('validateContent', () => {
  const blocks: any = [{ type: 'text', html: '<p>x</p>' }]

  it('ονομάζει ΠΟΙΟ πεδίο λείπει, όχι σκέτο «σφάλμα»', () => {
    const v = validateContent('news', { Title: 'Τίτλος' }, blocks)
    expect(v.ok).toBe(false)
    expect(v.errors.join(' ')).toContain('Περίληψη')
    expect(v.errors.join(' ')).toContain('Ημερομηνία')
  })

  it('περνά όταν υπάρχουν όλα τα υποχρεωτικά', () => {
    const v = validateContent('news', {
      Title: 'Τίτλος', Date: '2026-11-14', Excerpt: 'Περίληψη', ImageAltText: 'alt',
      Visuals: { mediaId: 1410, src: 'https://x/y.jpg' },
    }, blocks)
    expect(v).toEqual({ ok: true, errors: [] })
  })

  /**
   * Η εικόνα ταξιδεύει ως { mediaId, src } — η οθόνη θέλει το src για να τη
   * δείξει, το Strapi μόνο το id. Έλεγχος «δεν είναι κενό» θα δεχόταν ένα
   * αντικείμενο χωρίς αρχείο και θα έσκαγε στην αποθήκευση.
   */
  it('η εικόνα μετριέται από το αρχείο της, όχι από το αντικείμενο', () => {
    const base = { Title: 'Τ', Date: '2026-11-14', Excerpt: 'Π', ImageAltText: 'alt' }
    expect(validateContent('news', { ...base, Visuals: { src: 'blob:…' } }, blocks).ok).toBe(false)
    expect(validateContent('news', { ...base, Visuals: { mediaId: 7 } }, blocks).ok).toBe(true)
  })

  it('άρθρο χωρίς περιεχόμενο δεν αποθηκεύεται', () => {
    const v = validateContent('projects', { title: 'Τ', Excerpt: 'Π' }, [])
    expect(v.errors).toContain('Το άρθρο δεν έχει περιεχόμενο')
  })
})

describe('articleHtmlFor', () => {
  const blocks: any = [{ type: 'text', html: '<p>Το κείμενο</p>' }]

  /**
   * Και οι τρεις σελίδες λεπτομέρειας τυπώνουν ΗΔΗ δικό τους <h1>. Μια κοραλί
   * ζώνη με τον τίτλο θα τον έδειχνε δεύτερη φορά στην ίδια οθόνη.
   */
  it('ΠΡΟΕΠΙΛΟΓΗ: δεν ξαναγράφει τον τίτλο — τον έχει ήδη η σελίδα', () => {
    const html = articleHtmlFor({ title: 'Ο Τίτλος', blocks })
    expect(html).not.toContain('Ο Τίτλος')
    expect(html).toContain('Το κείμενο')
  })

  it('με ρητή επιλογή, η κοραλί ζώνη μπαίνει', () => {
    expect(articleHtmlFor({ title: 'Ο Τίτλος', blocks, headerStyle: 'coral' }))
      .toContain('Ο Τίτλος')
  })

  it('βγαίνει ντυμένο για σελίδα, ώστε να αλλάζει θέμα', () => {
    expect(articleHtmlFor({ title: 'Τ', blocks })).toContain('var(--cfc-')
  })
})

describe('toStrapiFields', () => {
  /** Το Strapi θέλει πίνακα όπου το πεδίο δέχεται πολλά, σκέτο id αλλού */
  it('η εικόνα γίνεται αναγνωριστικό — πίνακας ή σκέτο, ανά πεδίο', () => {
    expect(toStrapiFields('news', { Visuals: { mediaId: 1410, src: 'x' } }).Visuals).toEqual([1410])
    expect(toStrapiFields('projects', { cover_image: { mediaId: 22, src: 'x' } }).cover_image).toBe(22)
  })

  it('εικόνα χωρίς αρχείο δεν στέλνεται καθόλου', () => {
    expect('Visuals' in toStrapiFields('news', { Visuals: { src: 'blob:…' } })).toBe(false)
  })

  it('οι αριθμοί φεύγουν ως αριθμοί και τα κενά ως null', () => {
    expect(toStrapiFields('projects', { sort_order: '3' }).sort_order).toBe(3)
    expect(toStrapiFields('projects', { sort_order: '' }).sort_order).toBeNull()
    expect(toStrapiFields('projects', { category: '   ' }).category).toBeNull()
  })

  it('αγνοεί ό,τι δεν ανήκει στο είδος — καμία έκπληξη στο Strapi', () => {
    expect(toStrapiFields('projects', { title: 'Τ', Html: '<p>x</p>', ζιζάνιο: 1 }))
      .toEqual({ title: 'Τ' })
  })
})

describe('greekDate', () => {
  /**
   * ΤΟ ΠΕΡΙΣΤΑΤΙΚΟ (20/10/2026): γράφτηκε 14/11 και η προεπισκόπηση έδειχνε
   * «13 Νοεμβρίου». Το new Date('2026-11-14') είναι μεσάνυχτα UTC· σε μηχάνημα
   * πίσω από το UTC — το Mac είναι στο −03:00 — η τοπική μέρα είναι η
   * προηγούμενη. Ημερομηνία χωρίς ώρα δεν έχει ζώνη και δεν πρέπει να αποκτήσει.
   */
  it('κρατά τη μέρα που γράφτηκε, ό,τι ζώνη κι αν έχει το μηχάνημα', () => {
    expect(greekDate('2026-11-14')).toBe('14 Νοεμβρίου 2026')
    expect(greekDate('2026-01-01')).toBe('1 Ιανουαρίου 2026')
    expect(greekDate('2026-12-31')).toBe('31 Δεκεμβρίου 2026')
  })
  it('δέχεται και στιγμή, κρατώντας το ημερολογιακό της μέρος', () => {
    expect(greekDate('2026-05-09T21:30:00.000Z')).toBe('9 Μαΐου 2026')
  })
  it('δεν βγάζει τίποτα από σκουπίδια', () => {
    expect(greekDate('')).toBe('')
    expect(greekDate('αύριο')).toBe('')
  })
})

describe('pageChromeHtml', () => {
  it('δείχνει τίτλο, ημερομηνία, κατηγορία και ετικέτες — την κορυφή της σελίδας', () => {
    const html = pageChromeHtml('news', {
      Title: 'Ο τίτλος', Date: '2026-11-14', Category: 'Δράσεις', Tags: 'δικτύωση, Αθήνα',
    })
    expect(html).toContain('Ο τίτλος')
    expect(html).toContain('14 Νοεμβρίου 2026')
    expect(html).toContain('Δράσεις')
    expect(html).toContain('δικτύωση')
    expect(html).toContain('Αθήνα')
  })

  /**
   * Πλακίδιο με ΕΠΩΝΥΜΟ (ανοιχτό) φόντο κρατά σκούρα γράμματα πάντα. Με
   * var(--cfc-ink) γινόταν ανοιχτό σε ανοιχτό στο σκοτεινό θέμα — αόρατο.
   */
  it('το πλακίδιο κατηγορίας δεν εξαφανίζεται στο σκοτεινό θέμα', () => {
    const html = pageChromeHtml('news', { Title: 'Τ', Category: 'Δράσεις' })
    expect(html).toContain('background-color:#FFE7DF;color:#2D2D2D')
  })

  it('ξεφεύγει ό,τι γράφει ο συντάκτης', () => {
    expect(pageChromeHtml('news', { Title: '<script>alert(1)</script>' }))
      .not.toContain('<script>')
  })

  it('χωρίς τίτλο δεν βγάζει κενή κοραλί ζώνη χωρίς εξήγηση', () => {
    expect(pageChromeHtml('news', {})).toContain('χωρίς τίτλο')
  })
})
