'use client'

// Η φωτογραφική ζώνη ΓΙΝΕ ΜΕΛΟΣ του Cool (τιμή στην επιφάνεια + newsletter
// που ξεδιπλώνει σε γυάλινη πλάκα) — εξήχθη από το σώμα του /about ώστε να
// κλείνει ΟΛΕΣ τις Cool σελίδες πάνω από το footer (αίτημα 29/8).

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2'
const GLASS_BTN: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,.14)',
  border: '1px solid rgba(255,255,255,.4)',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

export default function CoolMemberBand() {
  const [nlOpen, setNlOpen] = useState(false)
  const [nlEmail, setNlEmail] = useState('')
  const [nlAgreed, setNlAgreed] = useState(false)
  const [nlBusy, setNlBusy] = useState(false)
  const [nlDone, setNlDone] = useState(false)
  const [nlHoneypot, setNlHoneypot] = useState('')

  async function submitNewsletter(e: React.FormEvent) {
    e.preventDefault()
    if (!nlEmail || !nlAgreed || nlBusy) return
    setNlBusy(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nlEmail, website: nlHoneypot }),
      })
      if (res.ok) { setNlDone(true); setNlEmail('') }
    } catch { /* μη κρίσιμο — ο χρήστης ξαναδοκιμάζει */ } finally {
      setNlBusy(false)
    }
  }

  return (
    <section className="px-2 pb-2 md:px-3 md:pb-3">
      <div className="relative rounded-3xl overflow-hidden" style={{ backgroundColor: '#1B2438' }}>
        <Image src="/becomeamember.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,.45)' }} aria-hidden="true" />
        <div className="relative px-6 md:px-12 py-16 md:py-20 max-w-4xl">
          <h2 className="text-white font-bold text-3xl md:text-4xl leading-tight">
            ΓΙΝΕ ΜΕΛΟΣ ΤΟΥ ΔΙΚΤΥΟΥ ΜΑΣ
          </h2>
          <p className="text-white/90 mt-4" style={{ lineHeight: 1.6 }}>
            Γίνε τώρα μέλος του πρώτου Δικτύου για την κοινωνική και πολιτιστική καινοτομία στην Ελλάδα.
          </p>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 mt-8">
            <Link href="/participation" className={`inline-flex items-center min-h-11 px-6 rounded-full bg-coral text-charcoal text-sm font-bold tracking-widest whitespace-nowrap hover:bg-[#F07551] transition-colors duration-200 ${focusRing}`}>
              ΓΙΝΕ ΜΕΛΟΣ ΤΩΡΑ
            </Link>
            <Link href="/participation"
              className={`notranslate inline-flex items-center min-h-11 px-6 rounded-full text-white text-sm font-bold tracking-widest whitespace-nowrap hover:brightness-125 transition duration-200 ${focusRing}`}
              style={GLASS_BTN}>
              35 € / ΕΤΟΣ · ΤΙ ΠΕΡΙΛΑΜΒΑΝΕΙ
            </Link>
            <span className="w-px h-6 bg-white/40" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setNlOpen(v => !v)}
              aria-expanded={nlOpen}
              aria-controls="cool-band-newsletter"
              className={`inline-flex items-center gap-2 min-h-11 px-6 rounded-full text-white text-sm font-bold tracking-widest whitespace-nowrap hover:brightness-125 transition duration-200 ${focusRing}`}
              style={GLASS_BTN}
            >
              ΕΓΓΡΑΦΗ ΣΤΟ NEWSLETTER
              <span className={`transition-transform duration-200 ${nlOpen ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
            </button>
          </div>

          {/* Η φόρμα ξεδιπλώνει μέσα στην κάρτα — δεν φεύγεις από τη σελίδα */}
          {nlOpen && (
            <div id="cool-band-newsletter" className="glass-rim rounded-2xl p-5 mt-6 max-w-md"
              style={{ backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)' }}>
              {nlDone ? (
                <p className="text-white font-medium" style={{ lineHeight: 1.6 }}>
                  <span className="text-coral" aria-hidden="true">✓</span>{' '}
                  Έλεγξε το email σου! Σου στείλαμε ένα email επιβεβαίωσης.
                </p>
              ) : (
                <form onSubmit={submitNewsletter} className="space-y-3">
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <input type="text" name="website" value={nlHoneypot} onChange={e => setNlHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="flex gap-2">
                    <label htmlFor="cool-band-nl-email" className="sr-only">Το email σας</label>
                    <input
                      id="cool-band-nl-email" type="email" required value={nlEmail}
                      onChange={e => setNlEmail(e.target.value)}
                      placeholder="Το email σας: *"
                      className={`flex-1 min-h-11 rounded-full px-5 text-sm text-charcoal bg-white border-2 border-white ${focusRing}`}
                    />
                    <button
                      type="submit"
                      disabled={nlBusy || !nlAgreed}
                      aria-label="Εγγραφή στο newsletter"
                      className={`min-h-11 px-5 rounded-full bg-coral text-charcoal font-bold hover:bg-[#F07551] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`}
                    >
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                  <label className="flex items-start gap-2 text-xs text-white/85 cursor-pointer">
                    <input type="checkbox" checked={nlAgreed} onChange={e => setNlAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#FF8B6A]" />
                    <span>
                      Συμφωνώ με τους{' '}
                      <Link href="/terms" className="underline font-medium text-white hover:text-coral transition-colors duration-200">
                        όρους και τις προϋποθέσεις
                      </Link>
                    </span>
                  </label>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
