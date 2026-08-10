import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess } from '@/lib/ocRoles'

export const metadata: Metadata = {
  title: 'Αίτηση Εγγραφής — OC | Culture for Change',
  robots: { index: false, follow: false },
}

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

const STATE_LABELS: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Εκκρεμεί ψήφιση', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
  approved: { label: 'Εγκρίθηκε', cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  rejected: { label: 'Απορρίφθηκε', cls: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
  completed: { label: 'Ολοκληρώθηκε', cls: 'bg-coral/20 text-charcoal dark:bg-coral/30 dark:text-gray-100' },
}

interface Props {
  params: Promise<{ id: string }>
}

// The «beautiful GUI per applicant» — the unique link target from the Sheet
// and (later) the notification emails. Server-gated: board members only,
// everyone else is silently redirected before any data is fetched.
export default async function ApplicationReviewPage({ params }: Props) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  if (!sessionCookie) redirect('/')
  const decoded = verifyToken(sessionCookie.value)
  if (!decoded || decoded.type !== 'session') redirect('/')
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) redirect('/')

  const { id } = await params
  const safeId = decodeURIComponent(id).replace(/[^a-z0-9]/gi, '')
  if (!safeId || !STRAPI_URL || !STRAPI_API_TOKEN) notFound()

  const res = await fetch(
    `${STRAPI_URL}/api/membership-applications/${safeId}?populate=Photo`,
    { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` }, cache: 'no-store' }
  )
  if (!res.ok) notFound()
  const json = await res.json()
  const a = json?.data
  if (!a) notFound()

  const state = STATE_LABELS[a.ApplicationState] || STATE_LABELS.submitted
  const photoUrl: string | null = a.Photo?.url || null
  const submitted = a.SubmittedAt
    ? new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Athens' }).format(new Date(a.SubmittedAt))
    : '—'

  const publishLabels: Record<string, string> = {
    email: 'E-mail', phone: 'Τηλέφωνο', website: 'Website',
    facebook: 'Facebook', linkedin: 'LinkedIn', instagram: 'Instagram',
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content" className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/oc" className="inline-flex items-center gap-2 text-sm font-medium text-charcoal dark:text-gray-200 hover:text-coral dark:hover:text-coral-light transition-colors mb-6">
            ← Επιστροφή στο OC
          </Link>

          {/* Header card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden mb-6">
            <div className="md:flex">
              <div className="md:w-56 flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={`Φωτογραφία: ${a.FirstName} ${a.LastName}`} className="w-full h-full max-h-72 md:max-h-none object-cover" />
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center text-gray-300 dark:text-gray-500">
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 flex-1">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-charcoal dark:text-coral notranslate">
                      {`${a.FirstName || ''} ${a.LastName || ''}`.trim().toLocaleUpperCase('el-GR')}
                    </h1>
                    {a.NameLatin && <p className="text-sm text-gray-400 dark:text-gray-500 notranslate">{a.NameLatin}</p>}
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${state.cls}`}>{state.label}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2">{a.Profession}</p>
                <dl className="mt-4 space-y-1 text-sm">
                  <Row k="Πόλη/εις δραστηριότητας" v={a.ActivityCityA} />
                  <Row k="Email" v={a.Email} />
                  <Row k="Τηλέφωνο" v={a.Phone} />
                  <Row k="Υποβλήθηκε" v={submitted} />
                </dl>
                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                  Οι αποφάσεις (Έγκριση/Απόρριψη) καταχωρούνται προς το παρόν στο φύλλο «Νέα Μέλη» του Μητρώου.
                </p>
              </div>
            </div>
          </div>

          {/* Ταυτότητα */}
          <Section title="Ταυτότητα">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <Row k="Ηλικία" v={a.AgeRange} />
              <Row k="Φύλο" v={a.Gender} />
              <Row k="Αναπηρία" v={a.Disability} />
              <Row k="Πόλη διαμονής" v={a.ResidenceCity} />
              <Row k="Περιφέρεια" v={a.ResidenceRegion} />
              <Row k="Διεύθυνση" v={a.Address} />
              <Row k="Website" v={a.Website} link />
              <Row k="Facebook" v={a.Facebook} link />
              <Row k="LinkedIn" v={a.LinkedIn} link />
              <Row k="Instagram" v={a.Instagram} link />
              <Row k="Bosch Alumni profile" v={a.BoschProfile} />
            </div>
          </Section>

          {/* Βιογραφικό */}
          <Section title="Βιογραφικό">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.Bio || '—'}</p>
            {a.BioEn && (
              <>
                <h3 className="font-bold text-charcoal dark:text-gray-100 mt-4 mb-1 text-sm">English</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm">{a.BioEn}</p>
              </>
            )}
          </Section>

          {/* Δραστηριότητα */}
          <Section title="Επαγγελματική Δραστηριότητα">
            <SubHead>Σπουδές</SubHead>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{a.Education || '—'}</p>
            <SubHead>Επαγγελματική κατάσταση</SubHead>
            <Chips items={a.EmploymentStatus} />
            {[['Ελεύθερος/η επαγγελματίας', a.EmpFreelancer], ['Εταιρεία', a.EmpCompany], ['Μισθωτός/ή', a.EmpEmployee], ['ΟΚοιΠ', a.EmpNgo], ['Περιστασιακά', a.EmpOccasional]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k as string} className="mt-3">
                  <SubHead>{k as string}</SubHead>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{v as string}</p>
                </div>
              ))}
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm mt-4">
              <Row k="Απόφοιτος/η Bosch" v={a.BoschAlumni} />
              {a.BoschAlumni === 'Ναι' && <Row k="Προγράμματα Bosch" v={a.BoschPrograms} />}
              <Row k="START Fellow" v={a.StartFellow} />
            </div>
            <SubHead className="mt-4">Εμπειρία στην κοινωνικοπολιτιστική καινοτομία</SubHead>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.Experience || '—'}</p>
            <SubHead className="mt-4">Πεδία δραστηριότητας</SubHead>
            <Chips items={a.FieldsOfActivity} accent />
            <SubHead className="mt-4">Τρόποι εφαρμογής δράσεων</SubHead>
            <Chips items={a.ActionFormats} />
            <SubHead className="mt-4">Ομάδες κοινού</SubHead>
            <Chips items={a.AudienceGroups} />
            <SubHead className="mt-4">Θεματικές</SubHead>
            <Chips items={a.Themes} />
          </Section>

          {/* Ανάγκες & Συμβολή */}
          <Section title="Ανάγκες & Συμβολή" internal>
            <SubHead>Προκλήσεις</SubHead>
            <Chips items={a.Challenges} />
            <SubHead className="mt-4">Προτεινόμενες λύσεις</SubHead>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.ProposedSolutions || '—'}</p>
            <SubHead className="mt-4">Συμβολή του δικτύου</SubHead>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.NetworkContribution || '—'}</p>
          </Section>

          {/* Οικονομικά */}
          <Section title="Οικονομικά" internal>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <Row k="Απόδειξη σε" v={a.ReceiptType} />
              {a.ReceiptType === 'Εταιρεία' && (
                <>
                  <Row k="Επωνυμία" v={a.CompanyName} />
                  <Row k="Διεύθυνση εταιρείας" v={a.CompanyAddress} />
                  <Row k="ΑΦΜ εταιρείας" v={a.CompanyTaxId} />
                </>
              )}
              <Row k="Newsletter" v={a.NewsletterOptIn ? 'Ναι' : 'Όχι'} />
            </div>
          </Section>

          {/* Συναινέσεις & Διαδικασία */}
          <Section title="Συναινέσεις & Διαδικασία">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <Row k="Καταστατικό" v={a.AcceptStatute ? '✓ Αποδεκτό' : '✗'} />
              <Row k="Εσωτ. Κανονισμός" v={a.AcceptRegulation ? '✓ Αποδεκτό' : '✗'} />
              <Row k="Όροι & Απόρρητο" v={a.AcceptPrivacy ? '✓ Αποδεκτό' : '✗'} />
              <Row
                k="Δημοσίευση επαφών"
                v={Array.isArray(a.PublishConsent) && a.PublishConsent.length > 0
                  ? a.PublishConsent.map((k: string) => publishLabels[k] || k).join(', ')
                  : 'Καμία'}
              />
              <Row k="Sheet sync" v={a.SheetSynced ? '✓' : '—'} />
              {a.DecisionDate && <Row k="Απόφαση" v={`${state.label} · ${new Intl.DateTimeFormat('el-GR').format(new Date(a.DecisionDate))}${a.DecisionBy ? ` · ${a.DecisionBy}` : ''}`} />}
              {a.DecisionNote && <Row k="Σημείωση απόφασης" v={a.DecisionNote} />}
            </div>
          </Section>
        </div>
      </main>
    </div>
  )
}

/* ── presentation helpers (server components) ── */

function Section({ title, children, internal }: { title: string; children: React.ReactNode; internal?: boolean }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 md:p-8 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-charcoal dark:text-gray-100">{title}</h2>
        {internal && (
          <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
            🔒 Εσωτερική χρήση
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function SubHead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-bold text-charcoal dark:text-gray-100 text-sm mb-1.5 ${className}`}>{children}</h3>
}

function Row({ k, v, link }: { k: string; v?: string | null; link?: boolean }) {
  if (!v) return null
  return (
    <div className="flex gap-3">
      <dt className="text-gray-500 dark:text-gray-400 w-44 flex-shrink-0">{k}</dt>
      <dd className="text-charcoal dark:text-gray-200 break-words min-w-0">
        {link && /^https?:\/\//.test(v) ? (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-coral dark:text-coral-light hover:underline">{v}</a>
        ) : v}
      </dd>
    </div>
  )
}

function Chips({ items, accent }: { items?: string[] | string | null; accent?: boolean }) {
  const list = Array.isArray(items)
    ? items
    : typeof items === 'string'
      ? items.split(',').map(s => s.trim()).filter(Boolean)
      : []
  if (list.length === 0) return <p className="text-gray-400 dark:text-gray-500 text-sm">—</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(item => (
        <span
          key={item}
          className={`text-xs px-2.5 py-1 rounded-full border ${
            accent
              ? 'bg-coral/10 dark:bg-coral/20 border-coral/50 text-charcoal dark:text-gray-100'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  )
}
