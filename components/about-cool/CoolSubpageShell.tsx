'use client'

// Κοινό κέλυφος των υποσελίδων «Σχετικά» στο Cool (Ομάδα Συντονισμού,
// Διαφάνεια, Επικοινωνία): συγγενικό με το hero του /about αλλά όχι ίδιο —
// συμπαγής navy ζώνη χωρίς φωτογραφία/μετρητές, μικρότερος τίτλος, και η
// ίδια μπάρα καρτελών (AboutTabs) καρφωμένη στην κάτω ακμή.

import AboutTabs from './AboutTabs'

export default function CoolSubpageShell({
  eyebrow = 'ΣΧΕΤΙΚΑ ΜΕ ΕΜΑΣ',
  title,
  standfirst,
  children,
}: {
  eyebrow?: string
  title: string
  standfirst?: string
  children: React.ReactNode
}) {
  return (
    <>
      <section className="px-2 pt-2 md:px-3 md:pt-3">
        <div className="relative rounded-3xl overflow-hidden" style={{ backgroundColor: '#1B2438' }}>
          <div className="relative px-6 md:px-12 pt-28 md:pt-32 pb-20">
            <p className="text-coral font-bold text-sm tracking-[.18em] mb-3">{eyebrow}</p>
            <h1 className="text-white font-bold" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)', lineHeight: 0.95 }}>
              {title}
            </h1>
            {standfirst && (
              <p className="text-white/85 mt-4 max-w-xl" style={{ lineHeight: 1.6 }}>{standfirst}</p>
            )}
          </div>
          <AboutTabs />
        </div>
      </section>
      {children}
    </>
  )
}
