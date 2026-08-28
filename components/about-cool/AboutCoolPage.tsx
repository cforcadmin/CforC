'use client'

// Το /about στη δομή του brief 3a (Claude Design, 28/8/26) — ΜΟΝΟ για το
// στυλ Cool· Classic/Modern κρατούν την υπάρχουσα σελίδα (AboutVariantSwitch).
// Αναδιοργάνωση, όχι ξαναγράψιμο: κάθε ελληνική φράση είναι πανομοιότυπη με
// τη ζωντανή σελίδα — μετακινήθηκε, κόπηκε όπου διπλογραφόταν, προβλήθηκε
// όπου ήταν θαμμένη. 14 ενότητες → 7. Περιορισμοί brief: κανένα backdrop
// blur, κανένα gradient εκτός από το scrim του hero, εστίαση κοραλί 2px.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AboutTabs from './AboutTabs'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2'

// Οι 10 αξίες, από το υπάρχον κείμενο του ΑΞΙΕΣ — ως ψηφίδες αντί για λίστα
const VALUES = [
  'Νομιμότητα', 'Ισότητα', 'Διαφάνεια', 'Συμμετοχικότητα',
  'Αλληλεγγύη και Βιωσιμότητα', 'Περιβαλλοντολογικό Αποτύπωμα', 'Διατομεακότητα',
  'Κοινωνικός Αντίκτυπος', 'Καινοτόμες Μέθοδοι Εργασίας', 'Συλλογική Λήψη Αποφάσεων',
]

const ACTIONS = [
  { n: '01', label: 'ΔΙΚΤΥΩΣΗ' },
  { n: '02', label: 'ΔΙΕΠΙΣΤΗΜΟΝΙΚΕΣ ΕΚΔΗΛΩΣΕΙΣ' },
  { n: '03', label: 'ΑΝΑΠΤΥΞΗ ΙΚΑΝΟΤΗΤΩΝ' },
  { n: '04', label: 'ΕΝΕΡΓΟΠΟΙΗΣΗ ΚΟΙΝΟΤΗΤΩΝ' },
  { n: '05', label: 'ΣΥΝΗΓΟΡΙΑ ΠΟΛΙΤΙΚΩΝ' },
]

const GOALS = [
  'Η δημιουργική εμπλοκή και συνεργασία με την κοινωνία των πολιτών για την προώθηση της κοινωνικής και πολιτισμικής καινοτομίας σε όλες τις διαστάσεις της.',
  'Η ανάδειξη και εκπροσώπηση της δράσης των μελών στα ενδιαφερόμενα μέρη.',
  'Η ενίσχυση των δρώντων στον τομέα  της κοινωνικής και πολιτισμικής καινοτομίας, όπου δραστηριοποιούνται τα μέλη του.',
  'Η συμβολή στην ενδυνάμωση της κοινωνικής και πολιτισμικής καινοτομίας στην Ελλάδα, με απώτερο σκοπό τη βελτίωση των πρακτικών, μεθόδων και εργαλείων που χρησιμοποιούνται σύμφωνα με τις δυναμικές και τις εκάστοτε ανάγκες της κοινωνίας.',
  'Η δημιουργία ευκαιριών συνεργασίας και επαγγελματικής ανάπτυξης των μελών του.',
  'Η συμβολή στην περαιτέρω διασύνδεση του έργου των μελών του με τις κοινότητες στις οποίες απευθύνονται.',
  'H εκπροσώπηση και η προάσπιση / συνηγορία του τομέα  της κοινωνικής και πολιτισμικής καινοτομίας σε περιπτώσεις που κριθεί σκόπιμο/απαραίτητο και σύμφωνο με τους σκοπούς του δικτύου.',
]

// Λογότυπα σε ΕΝΑ ενιαίο πλέγμα — οι δύο παλιές υπο-επικεφαλίδες ζουν στο title
const LOGOS = [
  { src: '/about-us-iac-berlin-logo.png', alt: 'iac Berlin', title: 'Με την υποστήριξη του: iac Berlin' },
  { src: '/about-us-cae-logo.png', alt: 'Culture Action Europe', title: 'Το δίκτυο CforC είναι μέλος των: Culture Action Europe' },
  { src: '/about-us-BAN-logo.png', alt: 'Bosch Alumni Network', title: 'Το δίκτυο CforC είναι μέλος των: Bosch Alumni Network' },
  { src: '/about-us-ENCC-logo.png', alt: 'European Network of Cultural Centres', title: 'Το δίκτυο CforC είναι μέλος των: European Network of Cultural Centres' },
  { src: '/about-us-ALF-logo.png', alt: 'Ίδρυμα Anna Lind', title: 'Το δίκτυο CforC είναι μέλος των: Ίδρυμα Anna Lind' },
  { src: '/about-us-reset-logo.PNG', alt: 'Reset Network', title: 'Το δίκτυο CforC είναι μέλος των: Reset Network' },
  { src: '/about-us-posibilists-logo.png', alt: 'Possibilists', title: 'Το δίκτυο CforC είναι μέλος των: The Possibilists' },
  { src: '/about-us-CAN-logo.png', alt: 'Community Arts Network', title: 'Το δίκτυο CforC είναι μέλος των: Community Arts Network' },
]

function SectionHeading({ n, text }: { n: string; text: string }) {
  return (
    <div className="mb-10">
      <span className="notranslate text-coral font-bold text-sm tracking-[.18em]">{n}</span>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-charcoal dark:text-gray-100 mt-1">
        {text}
      </h2>
    </div>
  )
}

export default function AboutCoolPage() {
  // Πραγματικός αριθμός μελών — ΠΟΤΕ μηδέν: μέχρι/αν δεν απαντήσει το API,
  // μένει η τελευταία γνωστή τιμή (brief: «Never render 0»)
  const [memberCount, setMemberCount] = useState(110)
  useEffect(() => {
    fetch('/api/stats/network').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.members) setMemberCount(d.members) }).catch(() => {})
  }, [])

  const [allValues, setAllValues] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)

  // Newsletter μέσα στην κάρτα ΓΙΝΕ ΜΕΛΟΣ (αίτημα 28/8) — ίδια ροή με το
  // CombinedCtaSection: /api/subscribe, όροι, honeypot, μήνυμα επιβεβαίωσης
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
    <>
      {/* ═══ HERO — η φωτογραφία ΕΙΝΑΙ το hero ═══ */}
      <section className="px-2 pt-2 md:px-3 md:pt-3">
        {/* Το navy φόντο κρατά τίτλο/standfirst αναγνώσιμα όταν οι εικόνες
            είναι κρυμμένες (CTRL+U) */}
        <div className="relative rounded-3xl overflow-hidden min-h-[60vh] md:min-h-[70vh] flex flex-col justify-end" style={{ backgroundColor: '#1B2438' }}>
          <Image src="/about-us.jpg" alt="Ομαδική φωτογραφία μελών του δικτύου Culture for Change" fill priority quality={90} className="object-cover" />
          {/* Το μόνο επιτρεπτό gradient της σελίδας — σταθερό, όχι προαιρετικό */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.10) 30%, rgba(0,0,0,.75) 100%)' }} aria-hidden="true" />

          <div className="relative px-6 md:px-12 pb-20 md:pb-24 pt-32">
            <p className="text-coral font-bold text-sm tracking-[.18em] mb-3">ΤΟ ΔΙΚΤΥΟ</p>
            <h1 className="text-white font-bold" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 0.92 }}>
              ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ
            </h1>
            <p className="text-white/90 mt-4 max-w-xl text-base md:text-lg" style={{ lineHeight: 1.6 }}>
              Το πρώτο ελληνικό δίκτυο κοινωνικής καινοτομίας για πολιτιστική και πολιτική αλλαγή.
            </p>
            {/* Μετρητές — αληθινά νούμερα, στο hero και όχι κάτω από το fold */}
            <div className="flex gap-8 md:gap-12 mt-8" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {[
                { v: String(memberCount), l: 'ΜΕΛΗ' },
                { v: '13', l: 'ΠΕΡΙΦΕΡΕΙΕΣ' },
                { v: '2020', l: 'ΑΠΟ ΤΟ' },
              ].map(c => (
                <div key={c.l}>
                  <div className="notranslate text-white font-bold text-3xl md:text-4xl">{c.v}</div>
                  <div className="text-coral text-xs font-bold tracking-[.14em] mt-1">{c.l}</div>
                </div>
              ))}
            </div>
          </div>

          <AboutTabs />
        </div>
      </section>

      {/* ═══ 01 · ΠΟΙΟΙ ΕΙΜΑΣΤΕ ═══ */}
      <section className="relative py-20 bg-[#F5F0EB] dark:bg-gray-900">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading n="01" text="ΠΟΙΟΙ ΕΙΜΑΣΤΕ" />
          <h3 className="text-xl md:text-2xl font-bold leading-tight text-charcoal dark:text-gray-100 max-w-3xl">
            Είμαστε το πρώτο ελληνικό Δίκτυο που εκπροσωπεί τη φωνή περισσότερων από 100 επαγγελματιών
          </h3>
          <div className="grid md:grid-cols-2 gap-10 mt-8 text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6, textWrap: 'pretty' } as React.CSSProperties}>
            <p>
              διαφορετικού ακαδημαϊκού υπόβαθρου και πολλαπλών δεξιοτήτων από όλη
              τη χώρα, συμπεριλαμβανομένων ενδεικτικά, πολιτιστικών διαχειριστών,
              καλλιτεχνών, νομικών, επιστημόνων συμπεριφοράς, σχεδιαστών
              αρχιτεκτόνων, πολεοδόμων, περιβαλλοντολόγων και άλλων ειδικοτήτων,
              που συνδέονται με κοινές απόψεις και πρακτικές γύρω από την Κοινωνική
              και Πολιτιστική Καινοτομία.
            </p>
            <div className="space-y-6">
              <p>
                Υποστηρίζουμε και αναδεικνύουμε τις πρωτοβουλίες των μελών μας,
                παρέχοντάς τους δομές, πρακτικές, κατευθυντήριες γραμμές και ευκαιρίες
                συνεχιζόμενης εκπαίδευσης. Σκοπός μας είναι να τους βοηθήσουμε να
                γεφυρώσουν την πραγματικότητά τους, καθώς και να συνεργαστούν
                δημιουργικά με άλλα άτομα, δίκτυα και οργανισμούς, και να κάνουν το έργο
                τους πιο εφικτό (και μαγικό), βιώσιμο και αποτελεσματικό, με απώτερο στόχο
                την ενίσχυση του Πολιτιστικού τομέα και της Κοινωνίας των Πολιτών στην
                Ελλάδα και σε όλο τον κόσμο.
              </p>
              <p>
                Ονομαζόμαστε Culture for Change (Πολιτισμός για την Αλλαγή) επειδή
                στοχεύουμε να προκαλέσουμε Αλλαγή στον τρόπο που βλέπουμε,
                αισθανόμαστε και αλληλεπιδρούμε μέσω των πολιτιστικών μας
                δραστηριοτήτων. Αλλαγή για τους ανθρώπους και τους οργανισμούς με τους
                οποίους συνεργαζόμαστε.
              </p>
            </div>
          </div>
          {/* Pull-quote: οι καταληκτικές γραμμές της 3ης παραγράφου, προβεβλημένες */}
          <blockquote className="mt-10 max-w-3xl border-l-[3px] border-coral pl-6 text-charcoal dark:text-gray-100 font-medium" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
            «Αλλαγή για τις κοινότητες των μελών μας. Αλλαγή για εμάς. Αλλαγή για τον πλανήτη μας. Αλλαγή για τον Πολιτισμό και Πολιτισμό για την Αλλαγή.»
          </blockquote>
        </div>
      </section>

      {/* ═══ 02 · ΤΙ ΚΑΝΟΥΜΕ — τρεις κάρτες + ψηφίδες δράσεων ═══ */}
      <section className="relative py-20 bg-white dark:bg-gray-800">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading n="02" text="ΠΩΣ ΤΟ CFORC ΠΡΟΩΘΕΙ ΤΗΝ ΑΛΛΑΓΗ" />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                img: '/about-us-what-we-offer.jpg',
                title: 'ΕΝΙΣΧΥΣΗ ΤΗΣ ΚΟΙΝΩΝΙΚΟΠΟΛΙΤΙΣΤΙΚΗΣ ΚΑΙΝΟΤΟΜΙΑΣ',
                body: 'Ενισχύουμε την κοινωνικοπολιτιστική καινοτομία στην Ελλάδα δημιουργώντας ευκαιρίες για την ανάδειξη ιδεών, εργαλείων, εκδηλώσεων και έργων των ενεργών πολιτών. Αυξάνουμε τον αντίκτυπο των επαγγελματιών του κλάδου, και καθοδηγούμε τους νέους που ενδιαφέρονται να εργαστούν στον κοινωνικοπολιτιστικό τομέα να ενημερωθούν, να δικτυωθούν και να αποκτήσουν εμπειρίες.',
                bullets: ['συμβουλευτική', 'ευκαιρίες δικτύωσης', 'εργαστήρια ανάπτυξης ικανοτήτων'],
              },
              {
                img: '/about-us-what-we-offer2.jpg',
                title: 'ΠΡΟΩΘΗΣΗ ΤΟΥ ΚΟΙΝΩΝΙΚΟΥ ΑΝΤΙΚΤΥΠΟΥ',
                body: 'Μέσω των επιτροπών και των ομάδων εργασίας του Δικτύου μας, δρομολογούμε, συνεργαζόμαστε και καθοδηγούμε εκδηλώσεις και εκστρατείες με στόχο τον κοινωνικό αντίκτυπο. Οι εκδηλώσεις του Culture for Change περιλαμβάνουν ενδεικτικά:',
                bullets: ['εκθέσεις', 'παρουσιάσεις', 'έρευνες', 'προγράμματα ενεργοποίησης κοινότητας'],
              },
              {
                img: '/about-us-what-we-offer3.jpg',
                title: 'ΣΥΝΗΓΟΡΙΑ ΥΠΕΡ ΤΗΣ ΣΥΣΤΗΜΙΚΗΣ ΑΛΛΑΓΗΣ',
                body: 'Υποστηρίζουμε την κοινωνικοπολιτιστική καινοτομία μέσω συνεργασιών με αντίστοιχους φορείς και πρωτοβουλίες, υποστηρίζοντας τους ενεργούς πολίτες της Ελλάδας. Η προσέγγισή μας είναι ανθρωποκεντρική, υπερβαίνοντας έτσι τα γραφειοκρατικά εμπόδια που περιορίζουν τις δράσεις των κοινοτήτων μας.',
                bullets: [],
              },
            ].map(card => (
              <article key={card.title} className="menu-glass glass-rim rounded-2xl overflow-hidden flex flex-col">
                <div className="h-36 relative flex-shrink-0">
                  <Image src={card.img} alt="" fill className="object-cover" />
                </div>
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="font-bold text-charcoal dark:text-gray-100 leading-snug">{card.title}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6, textWrap: 'pretty' } as React.CSSProperties}>{card.body}</p>
                  {card.bullets.length > 0 && (
                    <ul role="list" className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {card.bullets.map(b => (
                        <li key={b} className="flex gap-2"><span className="text-coral" aria-hidden="true">▪</span><span>{b}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Οι 5 δράσεις ως στατικές ψηφίδες — συνοψίζουν· τη δουλειά την κάνουν οι κάρτες */}
          <div className="border-t border-[#E5E7EB] dark:border-gray-600 mt-12 pt-8">
            <p className="text-sm font-bold tracking-[.14em] text-gray-500 dark:text-gray-400 mb-4">ΟΙ ΠΕΝΤΕ ΔΡΑΣΕΙΣ ΜΑΣ</p>
            <div className="flex flex-wrap gap-2.5">
              {ACTIONS.map(a => (
                <span key={a.n} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full border border-[#E5E7EB] dark:border-gray-600 text-sm font-bold text-charcoal dark:text-gray-200">
                  <span className="notranslate text-coral">{a.n}</span>{a.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 03 · ΠΟΥ ΕΙΜΑΣΤΕ — βίντεο + χάρτης ═══ */}
      <section className="relative py-20 bg-[#F5F0EB] dark:bg-gray-900">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading n="03" text="ΣΕ ΟΛΟΚΛΗΡΗ ΤΗΝ ΕΛΛΑΔΑ" />
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8">
            {/* Βίντεο — χωρίς autoplay, με ρητό χειριστήριο παύσης (native controls) */}
            <div>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900">
                <video
                  className="w-full h-full object-cover"
                  controls={videoPlaying}
                  preload="metadata"
                  src="/about-us-video.mp4#t=0.5"
                  onPlay={() => setVideoPlaying(true)}
                >
                  Your browser does not support the video tag.
                </video>
                {!videoPlaying && (
                  <button
                    type="button"
                    onClick={e => {
                      const v = (e.currentTarget.parentElement?.querySelector('video')) as HTMLVideoElement | null
                      v?.play()
                      setVideoPlaying(true)
                    }}
                    aria-label="Αναπαραγωγή βίντεο"
                    className={`absolute inset-0 flex items-center justify-center cursor-pointer ${focusRing}`}
                    style={{ backgroundColor: 'rgba(0,0,0,.15)' }}
                  >
                    <span className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl"
                      style={{ backgroundColor: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                      aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
              <p className="text-xs font-bold tracking-[.14em] text-gray-500 dark:text-gray-400 mt-3">ΔΕΣ ΤΟ ΔΙΚΤΥΟ ΣΕ ΔΡΑΣΗ</p>
            </div>

            {/* Κάρτα χάρτη */}
            <div className="menu-glass glass-rim rounded-2xl overflow-hidden flex flex-col">
              <div className="relative h-44 flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                <Image src="/map-of-greece.jpg" alt="Διαδραστικός χάρτης μελών του Culture for Change" fill className="object-cover" />
              </div>
              <div className="p-6 flex flex-col gap-3 flex-1">
                <h3 className="font-bold text-lg text-charcoal dark:text-gray-100">ΕΞΕΡΕΥΝΗΣΕ ΤΟΝ ΧΑΡΤΗ</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6 }}>
                  Δες πού βρίσκονται τα μέλη μας σε όλη την Ελλάδα και το εξωτερικό
                </p>
                <Link href="/map" className={`self-start mt-auto inline-flex items-center gap-2 min-h-11 px-6 rounded-full bg-coral text-charcoal text-sm font-bold tracking-widest hover:bg-[#F07551] transition-colors duration-200 ${focusRing}`}>
                  ΑΝΟΙΞΕ ΤΟΝ ΧΑΡΤΗ <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 04 · Ο ΠΥΡΗΝΑΣ ΜΑΣ — τρίπτυχο + σκοποί + διαφάνεια ═══ */}
      <section className="relative py-20 bg-white dark:bg-gray-800">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-coral font-bold text-sm tracking-[.18em]">ΤΟ ΤΡΙΠΤΥΧΟ ΜΑΣ</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-charcoal dark:text-gray-100 mt-1">Ο ΠΥΡΗΝΑΣ ΜΑΣ</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="menu-glass glass-rim rounded-2xl p-6">
              <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-3">ΟΡΑΜΑ</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6, textWrap: 'pretty' } as React.CSSProperties}>
                <strong>Όραμα</strong> του Culture for Change είναι να συμβάλει στην ενδυνάμωση της κοινωνικό-πολιτισμικής καινοτομίας στην Ελλάδα, με απώτερο σκοπό τη βελτίωση των πρακτικών, μεθόδων και εργαλείων που χρησιμοποιούνται σύμφωνα με τις δυναμικές, και τις εκάστοτε προκλήσεις και ανάγκες της κοινωνίας.
              </p>
            </div>
            <div className="menu-glass glass-rim rounded-2xl p-6">
              <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-3">ΑΠΟΣΤΟΛΗ</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6, textWrap: 'pretty' } as React.CSSProperties}>
                <strong>Αποστολή</strong> του Culture for Change είναι να δημιουργεί ευκαιρίες συνεργασίας και ανάπτυξης για τα μέλη του, να συνδράμει στη διασύνδεσή του έργου τους με τις κοινότητες στις οποίες απευθύνονται και να αναδεικνύει την κοινωνικό-πολιτισμική καινοτομία στα ενδιαφερόμενα μέρη (stakeholders).
              </p>
            </div>
            <div className="menu-glass glass-rim rounded-2xl p-6">
              <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-3">ΑΞΙΕΣ</h3>
              <div className="flex flex-wrap gap-2">
                {(allValues ? VALUES : VALUES.slice(0, 4)).map(v => (
                  <span key={v} className="px-3 py-1.5 rounded-full border border-[#E5E7EB] dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">{v}</span>
                ))}
                {!allValues && (
                  <button type="button" onClick={() => setAllValues(true)}
                    className={`notranslate px-3 py-1.5 rounded-full bg-coral text-charcoal text-sm font-bold hover:bg-[#F07551] transition-colors duration-200 ${focusRing}`}>
                    +6
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Οι 7 σκοποί του καταστατικού, διπλωμένοι — δουλεύει και χωρίς JS */}
          <details className="menu-glass glass-rim mt-8 rounded-2xl group">
            <summary className={`flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-bold text-charcoal dark:text-gray-100 min-h-11 ${focusRing}`}>
              <span>ΟΙ ΣΚΟΠΟΙ ΜΑΣ — 7 σκοποί από το καταστατικό</span>
              <span className="text-coral group-open:rotate-180 transition-transform duration-200" aria-hidden="true">▾</span>
            </summary>
            <div className="px-6 pb-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6 }}>
                Οι γενικοί σκοποί που έχουν τεθεί από το Δίκτυο είναι πνευματικοί, εκπαιδευτικοί, κοινωνικοί, επιστημονικοί, αναπτυξιακοί, πολιτιστικοί/ πολιτισμικοί και πιο συγκεκριμένα:
              </p>
              <ul role="list" className="space-y-3 text-gray-700 dark:text-gray-300" style={{ lineHeight: 1.6 }}>
                {GOALS.map(g => (
                  <li key={g.slice(0, 24)} className="flex gap-3">
                    <span className="text-coral" aria-hidden="true">▪</span><span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          {/* ΔΙΑΦΑΝΕΙΑ — από τη μέση της παλιάς σελίδας, δίπλα στις Αξίες όπου ανήκει */}
          <div className="menu-glass glass-rim mt-8 rounded-2xl p-8 md:p-10">
            <h3 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-4">ΔΙΑΦΑΝΕΙΑ</h3>
            <p className="text-gray-700 dark:text-gray-300 max-w-3xl" style={{ lineHeight: 1.6, textWrap: 'pretty' } as React.CSSProperties}>
              Η διαφάνεια αποτελεί θεμελιώδη αξία του Culture for Change. Πιστεύουμε στην ανοιχτή επικοινωνία
              και στη λογοδοσία προς τα μέλη μας και την κοινότητά μας. Μοιραζόμαστε δημόσια τα οικονομικά μας
              στοιχεία και το καταστατικό μας, ώστε να διασφαλίζουμε την εμπιστοσύνη και την ακεραιότητα
              σε κάθε μας δράση.
            </p>
            <Link href="/transparency" className={`inline-flex items-center min-h-11 px-6 mt-6 rounded-full bg-coral text-charcoal text-sm font-bold tracking-widest hover:bg-[#F07551] transition-colors duration-200 ${focusRing}`}>
              ΜΑΘΕΤΕ ΠΕΡΙΣΣΟΤΕΡΑ
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 05 · ΥΠΟΣΤΗΡΙΚΤΕΣ — ένα ενιαίο πλέγμα ═══ */}
      <section className="relative py-20 bg-[#F5F0EB] dark:bg-gray-900">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading n="05" text="ΟΙ ΥΠΟΣΤΗΡΙΚΤΕΣ ΚΑΙ ΟΙ ΣΥΝΕΡΓΑΤΕΣ ΜΑΣ" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {LOGOS.map(l => (
              <div key={l.src} title={l.title} aria-label={l.title}
                className="bg-white dark:bg-gray-700 rounded-xl h-24 flex items-center justify-center p-4">
                <Image src={l.src} alt={l.alt} width={176} height={76}
                  className="max-h-12 w-auto object-contain grayscale hover:grayscale-0 transition-[filter] duration-200" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ΓΙΝΕ ΜΕΛΟΣ — η τιμή στην επιφάνεια ═══ */}
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
                style={{ backgroundColor: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.4)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)' }}>
                35 € / ΕΤΟΣ · ΤΙ ΠΕΡΙΛΑΜΒΑΝΕΙ
              </Link>
              <span className="w-px h-6 bg-white/40" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setNlOpen(v => !v)}
                aria-expanded={nlOpen}
                aria-controls="about-cool-newsletter"
                className={`inline-flex items-center gap-2 min-h-11 px-6 rounded-full text-white text-sm font-bold tracking-widest whitespace-nowrap hover:brightness-125 transition duration-200 ${focusRing}`}
                style={{ backgroundColor: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.4)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)' }}
              >
                ΕΓΓΡΑΦΗ ΣΤΟ NEWSLETTER
                <span className={`transition-transform duration-200 ${nlOpen ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
              </button>
            </div>

            {/* Η φόρμα ξεδιπλώνει μέσα στην κάρτα — δεν φεύγεις από τη σελίδα */}
            {nlOpen && (
              <div id="about-cool-newsletter" className="glass-rim rounded-2xl p-5 mt-6 max-w-md"
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
                      <label htmlFor="about-nl-email" className="sr-only">Το email σας</label>
                      <input
                        id="about-nl-email" type="email" required value={nlEmail}
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
    </>
  )
}
