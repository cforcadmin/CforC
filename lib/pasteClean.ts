/**
 * Καθάρισμα επικόλλησης από έξω.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ: PDF, Word και Google Docs τυλίγουν το κείμενο με ΣΚΛΗΡΕΣ
 * αλλαγές γραμμής στο πλάτος της σελίδας τους. Επικολλημένο σε πλάτος email,
 * η πρόταση σπάει σε παράλογα σημεία — «…με τις τρεις / στρώσεις·» — και ο
 * συντάκτης το διορθώνει με το χέρι, γραμμή γραμμή.
 *
 * Η ΛΥΣΗ: ενώνουμε ό,τι είναι συνέχεια πρότασης και κρατάμε ό,τι είναι
 * πραγματική αλλαγή. Κριτήριο η ΣΤΙΞΗ, όχι το μήκος: αν η προηγούμενη γραμμή
 * δεν τελειώνει πρόταση, η επόμενη είναι συνέχειά της.
 */

/** Τέλος πρότασης στα ελληνικά — μαζί το άνω τελεία και τα εισαγωγικά */
const SENTENCE_END = /[.!?;·:»"”)\]]\s*$/
/** Αρχή στοιχείου λίστας — αυτά ΔΕΝ ενώνονται ποτέ */
const LIST_START = /^\s*([-•*‣–—]|\d+[.)]|[α-ωa-z][.)])\s+/i

/**
 * Ενώνει τις σκληρές αλλαγές που είναι απλώς τύλιγμα σελίδας.
 *
 * Δύο κενές γραμμές = παράγραφος, και μένουν. Μία αλλαγή γραμμής ενώνεται,
 * εκτός αν η προηγούμενη έκλεισε πρόταση ή η επόμενη ξεκινά λίστα.
 */
export function unwrapHardBreaks(text: string): string {
  const paragraphs = String(text ?? '').replace(/\r\n?/g, '\n').split(/\n{2,}/)
  return paragraphs
    .map(par => {
      const lines = par.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      if (!lines.length) return ''
      return lines.reduce((acc, line) => {
        if (!acc) return line
        if (LIST_START.test(line)) return `${acc}\n${line}`
        if (SENTENCE_END.test(acc)) return `${acc}\n${line}`
        // Ενωμένη λέξη με παύλα στο τέλος της γραμμής: «δια-\nχείριση»
        if (/[‐-―-]$/.test(acc)) return acc.slice(0, -1) + line
        return `${acc} ${line}`
      }, '')
    })
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Ξεγυμνώνει HTML από Word/Docs.
 *
 * Κρατά τη ΔΟΜΗ (παράγραφοι, λίστες, έντονα, σύνδεσμοι) και πετά κάθε
 * εμφάνιση: γραμματοσειρές, μεγέθη, χρώματα, κλάσεις. Αλλιώς το γράμμα
 * γεμίζει Calibri 11pt και μαύρα που δεν είναι το μαύρο μας — και ο
 * καθαριστής της αποστολής τα έκοβε ούτως ή άλλως, αφού ο συντάκτης είχε
 * ήδη δει λάθος προεπισκόπηση.
 */
export function cleanPastedHtml(html: string): string {
  let out = String(html ?? '')
  // Σχόλια και conditional του Word
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  out = out.replace(/<\s*\/?\s*(o:p|xml|meta|link|style|script)[^>]*>/gi, '')
  out = out.replace(/<\s*(style|script)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  // span/font δεν προσθέτουν δομή — μόνο εμφάνιση
  out = out.replace(/<\s*\/?\s*(span|font)[^>]*>/gi, '')
  // Κάθε attribute φεύγει, εκτός από το href
  out = out.replace(/<\s*([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_m, tag: string, attrs: string) => {
    const t = tag.toLowerCase()
    if (t === 'a') {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs)
      const url = (href?.[2] ?? href?.[3] ?? '').trim()
      return /^(https?:\/\/|mailto:|tel:)/i.test(url) ? `<a href="${url}">` : '<a>'
    }
    return `<${t}>`
  })
  // Κενές παράγραφοι από το Word: σειρές από &nbsp; χωρίς περιεχόμενο
  out = out.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '<p></p>')
  return out.trim()
}

/** Το κείμενο μιας ετικέτας, χωρίς τα tags — για να κριθεί η στίξη */
const plain = (h: string) => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

/**
 * Ενώνει σπασμένες γραμμές μέσα σε ΗΔΗ επικολλημένο περιεχόμενο.
 *
 * Το transformPastedText πιάνει μόνο την καθαρά κειμενική επικόλληση. Όταν
 * αντιγράφεις από PDF ή ιστοσελίδα, το πρόχειρο κουβαλά ΚΑΙ HTML, οπότε ο
 * επεξεργαστής παίρνει τη μορφή HTML και οι σκληρές αλλαγές έρχονται ως <br>
 * ή ως χωριστές <p>. Αυτή η συνάρτηση τις ενώνει εκ των υστέρων — είναι ό,τι
 * τρέχει το κουμπί «Ένωση γραμμών».
 *
 * Ίδιο κριτήριο με το κείμενο: η ΣΤΙΞΗ, όχι το μήκος.
 */
export function joinBrokenLines(html: string): string {
  let out = String(html ?? '')

  // 1) <br> μέσα στην ίδια παράγραφο
  out = out.replace(/<(p|h2|h3|li)([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, inner) => {
    const parts = String(inner).split(/<br\s*\/?>/i)
    if (parts.length < 2) return m
    const joined = parts.reduce((acc: string, part: string) => {
      const cur = part.trim()
      if (!acc) return cur
      if (!cur) return `${acc}<br>`
      if (LIST_START.test(plain(cur))) return `${acc}<br>${cur}`
      if (SENTENCE_END.test(plain(acc))) return `${acc}<br>${cur}`
      if (/[\u2010-\u2015-]$/.test(plain(acc))) return acc.replace(/[\u2010-\u2015-]\s*$/, '') + cur
      return `${acc} ${cur}`
    }, '')
    return `<${tag}${attrs}>${joined}</${tag}>`
  })

  // 2) Διαδοχικές <p> όπου η προηγούμενη δεν έκλεισε πρόταση
  let prev = ''
  do {
    prev = out
    out = out.replace(/<p([^>]*)>([\s\S]*?)<\/p>\s*<p([^>]*)>([\s\S]*?)<\/p>/i,
      (m, a1, i1, _a2, i2) => {
        const left = plain(i1)
        const right = plain(i2)
        // Κενή παράγραφος = σκόπιμο κενό, δεν την αγγίζουμε ΠΟΤΕ
        if (!left || !right) return m
        if (LIST_START.test(right)) return m
        if (SENTENCE_END.test(left)) return m
        if (/[\u2010-\u2015-]$/.test(left)) {
          return `<p${a1}>${i1.replace(/[\u2010-\u2015-]\s*$/, '')}${i2}</p>`
        }
        return `<p${a1}>${i1.trim()} ${i2.trim()}</p>`
      })
  } while (out !== prev)

  return out
}
