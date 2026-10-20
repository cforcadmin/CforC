'use client'

import { useEffect, useState } from 'react'
import { isEnglishMode } from '@/lib/translation'
export { articleText } from '@/lib/articleText'

/**
 * ΤΟ ΑΡΘΡΟ ΠΟΥ ΣΥΝΤΕΘΗΚΕ ΣΤΟ OC — ό,τι φτιάχτηκε με τα μπλοκ του newsletter.
 *
 * Αδελφή του LocalizedBlocks και με την ΙΔΙΑ λογική γλώσσας: αποδίδονται ΚΑΙ
 * ΟΙ ΔΥΟ εκδοχές και εναλλάσσεται η ορατότητα. Δεν είναι καπρίτσιο — το
 * Google Translate επεξεργάζεται το DOM μόνο του, και μια αλλαγή
 * περιεχομένου από τον React μέσα στο ίδιο στοιχείο δημιουργεί συνθήκη
 * ανταγωνισμού όπου το μεταφρασμένο κείμενο σβήνει ή διπλασιάζεται.
 *
 * Το `cfc-article` είναι που δίνει τα χρώματα θέματος: το HTML έρχεται με
 * ενσώματα χρώματα email, περασμένα από το lib/pageSkin σε μεταβλητές.
 */
export default function LocalizedArticle({ html, htmlEn, className }: {
  html?: string | null
  htmlEn?: string | null
  className?: string
}) {
  const [isEnglish, setIsEnglish] = useState(false)

  useEffect(() => {
    setIsEnglish(isEnglishMode())
    const observer = new MutationObserver(() => setIsEnglish(isEnglishMode()))
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class', 'lang'],
    })
    return () => observer.disconnect()
  }, [])

  const gr = (html || '').trim()
  const en = (htmlEn || '').trim()
  if (!gr && !en) return null

  const box = (markup: string, extra?: string, style?: React.CSSProperties) => (
    <div className={`cfc-article ${extra || ''} ${className || ''}`.trim()}
      style={style} dangerouslySetInnerHTML={{ __html: markup }} />
  )

  /* Μόνο αγγλικά: δείχνονται και στις δύο γλώσσες, με notranslate ώστε να μην
     τα ξαναπεράσει το Google Translate από πάνω. */
  if (!gr) return box(en, 'notranslate')

  /* Μόνο ελληνικά: τα μεταφράζει το Google Translate για τον επισκέπτη. */
  if (!en) return box(gr)

  return (
    <>
      {box(gr, '', { display: isEnglish ? 'none' : undefined })}
      {box(en, 'notranslate', { display: isEnglish ? undefined : 'none' })}
    </>
  )
}
