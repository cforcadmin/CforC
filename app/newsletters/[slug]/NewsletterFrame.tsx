'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Το γράμμα σε απομονωμένο πλαίσιο, με ύψος όσο το περιεχόμενό του.
 *
 * Χωρίς αυτό το iframe θα είχε σταθερό ύψος και δικό του scrollbar μέσα στη
 * σελίδα — δύο μπάρες κύλισης, η χειρότερη εμπειρία ανάγνωσης. Μετράμε το
 * περιεχόμενο μόλις φορτώσει και μεγαλώνουμε το πλαίσιο.
 *
 * sandbox χωρίς allow-scripts: το γράμμα είναι κείμενο, δεν εκτελεί τίποτα.
 */
export default function NewsletterFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(900)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      try {
        const doc = el.contentDocument
        if (!doc?.body) return
        const h = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight || 0)
        if (h > 0) setHeight(h + 24)
      } catch { /* διαφορετική προέλευση — κρατάμε το προεπιλεγμένο ύψος */ }
    }
    el.addEventListener('load', measure)
    // Οι εικόνες φορτώνουν μετά το load και αλλάζουν το ύψος
    const t = setInterval(measure, 400)
    const stop = setTimeout(() => clearInterval(t), 5000)
    return () => { el.removeEventListener('load', measure); clearInterval(t); clearTimeout(stop) }
  }, [html])

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      sandbox="allow-same-origin allow-popups"
      className="w-full rounded-3xl bg-white"
      style={{ height, border: 0 }}
    />
  )
}
