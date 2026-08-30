'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import EditableField from '@/components/profile/EditableField'
import RichTextEditor from '@/components/profile/RichTextEditor'
import FieldsOfWorkSelector from '@/components/profile/FieldsOfWorkSelector'
import CityAutocomplete from '@/components/profile/CityAutocomplete'
import EditableImage from '@/components/profile/EditableImage'
import EditableMultipleImages from '@/components/profile/EditableMultipleImages'
import ConfirmationModal from '@/components/ConfirmationModal'
import ProfileGuidelinesModal from '@/components/profile/ProfileGuidelinesModal'
import OpenCallsContent from '@/components/OpenCallsContent'
import NewslettersContent from '@/components/NewslettersContent'
import LibraryContent from '@/components/library/LibraryContent'
import { useNavMode } from '@/components/nav/useNavMode'
import EducationalMaterialContent from '@/components/EducationalMaterialContent'
import NetworksContent from '@/components/NetworksContent'
import WorkingGroupsContent from '@/components/WorkingGroupsContent'
import PocketGuideContent from '@/components/PocketGuideContent'
import ScrollToTop from '@/components/ScrollToTop'
import ProfilePreviewModal from '@/components/profile/ProfilePreviewModal'
import { blocksToPlainText } from '@/lib/richTextConvert'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import Link from 'next/link'
import { useOcAccess } from '@/components/useOcAccess'
import OcSeatChoiceModal from '@/components/oc/OcSeatChoiceModal'

const DASHBOARD_SECTIONS = [
  { key: 'profile', label: 'Προφίλ', heroTitle: 'ΤΟ ΠΡΟΦΙΛ ΜΟΥ' },
  { key: 'open-calls', label: 'Ανοιχτές Προσκλήσεις', heroTitle: 'ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ' },
  { key: 'educational', label: 'Εκπαιδευτικό Υλικό', heroTitle: 'ΕΚΠΑΙΔΕΥΤΙΚΟ ΥΛΙΚΟ' },
  { key: 'networks', label: 'Δίκτυα / Κοινότητες', heroTitle: 'ΔΙΚΤΥΑ / ΚΟΙΝΟΤΗΤΕΣ' },
  { key: 'working-groups', label: 'Ομάδες Εργασίας', heroTitle: 'ΟΜΑΔΕΣ ΕΡΓΑΣΙΑΣ' },
  { key: 'pocket-guide', label: 'Οδηγός Τσέπης', heroTitle: 'ΟΔΗΓΟΣ ΤΣΕΠΗΣ' },
  { key: 'newsletters', label: 'Newsletters', heroTitle: 'NEWSLETTERS' },
  { key: 'library', label: 'Ανοιχτή Βιβλιοθήκη', heroTitle: 'ΑΝΟΙΧΤΗ ΒΙΒΛΙΟΘΗΚΗ' },
] as const

type SectionKey = (typeof DASHBOARD_SECTIONS)[number]['key']

/**
 * Ενότητες που έχουν πραγματικό περιεχόμενο. Ό,τι ΔΕΝ είναι εδώ δείχνει
 * την κάρτα «Σύντομα διαθέσιμο».
 *
 * Ήταν αλυσίδα από !== και κάθε νέα ενότητα έπρεπε να τη θυμηθεί κανείς:
 * η Βιβλιοθήκη εμφανίστηκε σωστά ΚΑΙ με το «Σύντομα διαθέσιμο» από κάτω.
 * Ως σύνολο, η παράλειψη είναι ορατή σε ένα σημείο.
 */
const IMPLEMENTED_SECTIONS = new Set<SectionKey>([
  'profile', 'open-calls', 'newsletters', 'educational',
  'networks', 'working-groups', 'pocket-guide', 'library',
])


// Ρ2: συμπυκνωμένη γυάλινη κάψουλα πεδίου — δείχνει ετικέτα + σύνοψη
// και ανοίγει σε πλήρη επεξεργασία με κλικ (μόνο στο στυλ Cool)
function CoolSpot({ label, summary, children }: { label: string; summary?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    // Ανοιχτή κάψουλα σε z-30: τα dropdowns της (πεδία, πόλη) πρέπει να
    // περνούν ΠΑΝΩ από τις επόμενες κάψουλες (κάθε menu-glass = stacking
    // context, αλλιώς ο επόμενος αδελφός ζωγραφίζεται από πάνω)
    <div className={`relative menu-glass glass-rim rounded-3xl ${open ? 'z-30' : ''}`}>
      <span className="logo-reveal rounded-3xl overflow-hidden" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-full text-left px-6 py-4"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold tracking-[.14em] uppercase text-gray-500 dark:text-gray-400">{label}</span>
          <svg className={`w-4 h-4 flex-shrink-0 text-coral transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        {!open && (
          summary ? (
            <span className="block mt-1 text-charcoal dark:text-gray-100 truncate">{summary}</span>
          ) : (
            <span className="block mt-1 text-gray-400 dark:text-gray-500 italic">Κλικ για συμπλήρωση…</span>
          )
        )}
      </button>
      {open && <div className="relative px-6 pb-6 space-y-4">{children}</div>}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, refreshSession } = useAuth()
  // OC access is UI-gating only — /oc re-verifies the seat server-side
  const ocAccess = useOcAccess(isAuthenticated)
  const [showOcSeatModal, setShowOcSeatModal] = useState(false)
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)
  const [activeSection, setActiveSectionState] = useState<SectionKey>('profile')

  // ── Ζωντανοί δείκτες του hero (απόφαση 25/8: εκδοχή Β, χωρίς ομαδοποίηση) ──
  const [heroStats, setHeroStats] = useState<{
    openCallsActive: number; openCallsExpiringSoon: number
    newsletterLatest: string | null; workingGroupsUpdated: string | null
    libraryNew30: number; libraryPending: number
  } | null>(null)
  // «Τελευταία είδα» ανά ενότητα — localStorage προς το παρόν (μηδέν αλλαγή
  // βάσης)· αν αποδώσει, μετακομίζει στο προφίλ για συνέπεια μεταξύ συσκευών.
  const [seen, setSeen] = useState<Record<string, string>>({})
  const [heroOut, setHeroOut] = useState(false)
  // Καρφιτσωμένη συμπαγής εκδοχή: το hero κρύβεται και μένει μόνο η λωρίδα
  // — προτίμηση χρήστη, επιμένει στον browser.
  const [heroCompact, setHeroCompactState] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const coolImageInputRef = useRef<HTMLInputElement>(null)
  // Flow αλλαγής φωτογραφίας στη σκηνή (29/8): κλικ → δύο επιλογές →
  // (προαιρετικά) επιλογή αρχείου → modal alt-text → Υποβολή = staging +
  // αποθήκευση. Το pending effect τρέχει ΜΕΤΑ το commit των states, ώστε
  // το handleSave να δει φρέσκα formData/imageFile.
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [photoAltModal, setPhotoAltModal] = useState<null | { file: File | null }>(null)
  const [photoAltDraft, setPhotoAltDraft] = useState('')
  const [photoSubmitPending, setPhotoSubmitPending] = useState(false)
  const setHeroCompact = (v: boolean) => {
    setHeroCompactState(v)
    try { localStorage.setItem('cforc-hero-compact', v ? '1' : '0') } catch {}
  }
  useEffect(() => {
    try { setHeroCompactState(localStorage.getItem('cforc-hero-compact') === '1') } catch {}
  }, [])

  // Η ΓΕΩΜΕΤΡΙΑ της λωρίδας ακολουθεί το μενού με το ΔΙΚΟ ΤΟΥ κατώφλι
  // (scrollY > 150, βλ. Navigation). Πριν χρησιμοποιούσαμε το heroOut ως
  // προσέγγιση — αλλά στην καρφιτσωμένη προβολή το hero δεν υπάρχει, το
  // heroOut μένει false, και η λωρίδα έμενε full-width ενώ το μενού είχε
  // γίνει πλωτό pill.
  const [navScrolled, setNavScrolled] = useState(false)
  // Classic και Modern γίνονται πλωτό pill στο scroll — το Cool όχι
  const { mode: navMode } = useNavMode()
  // Στο Cool το hero δεν εμφανίζεται καθόλου: η φούσκα-λωρίδα είναι το
  // μενού της σελίδας από την πρώτη στιγμή, και στο scroll χαμηλώνει 50%
  const coolMode = navMode === 'cool'
  useEffect(() => {
    const h = () => setNavScrolled(window.scrollY > 150)
    h()
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/profile/hero-stats').then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHeroStats(d) }).catch(() => {})
    try { setSeen(JSON.parse(localStorage.getItem('cforc-section-seen') || '{}')) } catch {}
  }, [isAuthenticated])

  // Η επίσκεψη σε ενότητα σβήνει την τελεία της
  useEffect(() => {
    setSeen(prev => {
      const next = { ...prev, [activeSection]: new Date().toISOString() }
      try { localStorage.setItem('cforc-section-seen', JSON.stringify(next)) } catch {}
      return next
    })
  }, [activeSection])

  // Λεπτή γυάλινη λωρίδα όταν το hero βγει από το οπτικό πεδίο.
  // Εξαρτάται από το heroCompact: όταν το hero ξαναεμφανιστεί (restore),
  // το στοιχείο ΞΑΝΑμπαίνει στο DOM και ο observer πρέπει να ξαναδεθεί.
  useEffect(() => {
    if (heroCompact) { setHeroOut(false); return }
    const el = heroRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setHeroOut(!e.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [heroCompact, coolMode])

  const isNewSince = (iso: string | null, key: string) =>
    !!iso && (!seen[key] || iso > seen[key])

  /** αριθμός | 'dot' | null — ο πίνακας της απόφασης, σε κώδικα */
  const indicatorFor = (key: SectionKey): number | 'dot' | null => {
    if (!heroStats) return null
    switch (key) {
      case 'profile': {
        const gaps = [user?.Bio, user?.Province, user?.FieldsOfWork, user?.Image].filter(v => !v).length
        return gaps > 0 ? gaps : null
      }
      case 'open-calls': return heroStats.openCallsActive || null
      case 'educational': return null  // στατικό υλικό χωρίς χρονοσήμανση — τίποτα, όχι ψέμα
      case 'working-groups': return isNewSince(heroStats.workingGroupsUpdated, 'working-groups') ? 'dot' : null
      case 'newsletters': return isNewSince(heroStats.newsletterLatest, 'newsletters') ? 'dot' : null
      case 'library': return (heroStats.libraryPending || heroStats.libraryNew30) || null
      default: return null
    }
  }

  const greeting = () => {
    const first = (user?.Name || '').trim().split(/\s+/)[0]
    const hour = new Date().getHours()
    const hello = hour < 12 ? 'Καλημέρα' : hour < 18 ? 'Καλό απόγευμα' : 'Καλησπέρα'
    return first ? `${hello}, ${first}` : hello
  }

  /** Τίτλος + κύρια πράξη ανά ενότητα — το hero λέει κάτι αληθινό, όχι το όνομά της ξανά */
  const heroContext = (): { title: string; cta: string | null; onCta: () => void } => {
    const toContent = () => document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' })
    switch (activeSection) {
      case 'open-calls': {
        const n = heroStats?.openCallsActive ?? 0
        const soonN = heroStats?.openCallsExpiringSoon ?? 0
        return {
          title: n ? `${n} προσκλήσεις ενεργές${soonN ? ` — ${soonN} λήγει σύντομα` : ''}` : greeting(),
          cta: 'Δες τις ενεργές', onCta: toContent,
        }
      }
      case 'library': {
        const pend = heroStats?.libraryPending ?? 0
        const fresh = heroStats?.libraryNew30 ?? 0
        return {
          title: pend ? `${pend} τεκμήρια περιμένουν έλεγχο` : fresh ? `${fresh} νέα τεκμήρια αυτόν τον μήνα` : greeting(),
          cta: '+ Προσθήκη τεκμηρίου',
          onCta: () => { toContent(); window.dispatchEvent(new Event('cforc:library-add')) },
        }
      }
      case 'newsletters':
        return { title: isNewSince(heroStats?.newsletterLatest ?? null, 'newsletters') ? 'Νέο τεύχος σε περιμένει' : 'Τα μηνιαία νέα μας', cta: null, onCta: toContent }
      case 'educational':
        return { title: 'Επιλογή Υλικού για τα μέλη μας', cta: null, onCta: toContent }
      case 'networks':
        return { title: 'Τα δίκτυά μας', cta: null, onCta: toContent }
      case 'working-groups':
        return { title: 'Η κρυφή μας δύναμη!', cta: null, onCta: toContent }
      case 'pocket-guide':
        return { title: 'Πρακτικές συμβουλές', cta: null, onCta: toContent }
      case 'profile':
        return { title: greeting(), cta: 'Επεξεργασία προφίλ', onCta: toContent }
      default:
        return { title: greeting(), cta: null, onCta: toContent }
    }
  }

  // Read hash from URL to determine initial section
  useEffect(() => {
    // ?section= πριν από το hash: οι σύνδεσμοι των email της βιβλιοθήκης
    // (?section=library&review=…) δεν διαβάζονταν ποτέ — η σελίδα άνοιγε
    // στο προφίλ και ο έλεγχος διπλοεγγραφής δεν εμφανιζόταν. Εντοπίστηκε
    // γράφοντας τα e2e tests, όχι από αναφορά χρήστη.
    const qs = new URLSearchParams(window.location.search).get('section')
    if (qs && DASHBOARD_SECTIONS.some(s => s.key === qs)) {
      setActiveSectionState(qs as SectionKey)
      try { sessionStorage.setItem('cforc-profile-section', qs) } catch {}
      return
    }
    const hash = window.location.hash.replace('#', '')
    if (hash && DASHBOARD_SECTIONS.some(s => s.key === hash)) {
      setActiveSectionState(hash as SectionKey)
      try { sessionStorage.setItem('cforc-profile-section', hash) } catch {}
    } else {
      // Fall back to sessionStorage
      try {
        const saved = sessionStorage.getItem('cforc-profile-section')
        if (saved && DASHBOARD_SECTIONS.some(s => s.key === saved)) {
          setActiveSectionState(saved as SectionKey)
          window.history.replaceState(null, '', `#${saved}`)
        }
      } catch {}
    }
  }, [])

  // Listen for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && DASHBOARD_SECTIONS.some(s => s.key === hash)) {
        setActiveSectionState(hash as SectionKey)
        try { sessionStorage.setItem('cforc-profile-section', hash) } catch {}
      } else {
        setActiveSectionState('profile')
        try { sessionStorage.setItem('cforc-profile-section', 'profile') } catch {}
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setActiveSection = (key: SectionKey) => {
    setActiveSectionState(key)
    window.history.pushState(null, '', `#${key}`)
    try { sessionStorage.setItem('cforc-profile-section', key) } catch {}
  }

  const currentSection = DASHBOARD_SECTIONS.find(s => s.key === activeSection) ?? DASHBOARD_SECTIONS[0]

  // Handle scroll for accessibility button fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1)
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0)
      } else {
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart)
        setAccessibilityButtonScale(1 - progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [formData, setFormData] = useState<Record<string, any>>({
    Name: '',
    Email: '',
    Bio: '',
    FieldsOfWork: '',
    City: '',
    Province: '',
    Phone: '',
    Websites: '',
    ProfileImageAltText: '',
    Project1Title: '',
    Project1Tags: '',
    Project1Description: '',
    Project1Links: '',
    Project1PicturesAltText: '',
    Project2Title: '',
    Project2Tags: '',
    Project2Description: '',
    Project2Links: '',
    Project2PicturesAltText: '',
    EngName: '',
    EngBio: '',
    EngProject1Title: '',
    EngProject1Tags: '',
    EngProject1Description: '',
    EngProject2Title: '',
    EngProject2Tags: '',
    EngProject2Description: ''
  })

  const [originalData, setOriginalData] = useState<Record<string, any>>(formData)
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [project1Images, setProject1Images] = useState<File[]>([])
  const [project2Images, setProject2Images] = useState<File[]>([])
  const [project1KeptImageIds, setProject1KeptImageIds] = useState<number[]>([])
  const [project2KeptImageIds, setProject2KeptImageIds] = useState<number[]>([])
  const [originalProject1ImageIds, setOriginalProject1ImageIds] = useState<number[]>([])
  const [originalProject2ImageIds, setOriginalProject2ImageIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false)
  const [nameLang, setNameLang] = useState<'gr' | 'en'>('gr')
  const [bioLang, setBioLang] = useState<'gr' | 'en'>('gr')
  const [project1Lang, setProject1Lang] = useState<'gr' | 'en'>('gr')
  const [project2Lang, setProject2Lang] = useState<'gr' | 'en'>('gr')
  const hasShownGuidelinesRef = useRef(false)
  const errorsRef = useRef<HTMLDivElement>(null)
  const saveMessageRef = useRef<HTMLDivElement>(null)

  // Disable Google Translate on the profile page to prevent DOM mutation conflicts
  // with React controlled inputs (cursor jumps to end on every keystroke)
  useEffect(() => {
    // Restore original page if Google Translate has already translated it
    const frame = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement
    if (frame) {
      const closeBtn = frame.contentDocument?.querySelector('.goog-close-link') as HTMLElement
      closeBtn?.click()
    }
    // Also try the cookie-based restore
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname
    // Attempt to call Google Translate's restore function
    const sel = document.querySelector('.goog-te-combo') as HTMLSelectElement
    if (sel) {
      sel.value = ''
      sel.dispatchEvent(new Event('change'))
    }
    // Set the page-level translate attribute to prevent future translation
    document.documentElement.setAttribute('translate', 'no')
    document.documentElement.classList.add('notranslate')

    return () => {
      // Re-enable translation when leaving the profile page
      document.documentElement.removeAttribute('translate')
      document.documentElement.classList.remove('notranslate')
    }
  }, [])

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Show guidelines modal on login (only once per session, not after profile updates)
  useEffect(() => {
    if (isAuthenticated && user && !hasShownGuidelinesRef.current) {
      // ΟΧΙ όταν ο επισκέπτης προσγειώνεται σε ΑΛΛΗ ενότητα: ο σύνδεσμος
      // του email του Βιβλιοθηκάριου (?section=library&review=…) άνοιγε τις
      // οδηγίες ΠΡΟΦΙΛ πάνω από τον έλεγχο διπλοεγγραφής. Οι οδηγίες του
      // προφίλ αφορούν όποιον ήρθε για το προφίλ.
      const target = new URLSearchParams(window.location.search).get('section')
        || window.location.hash.replace('#', '')
      if (target && target !== 'profile') {
        hasShownGuidelinesRef.current = true
        return
      }
      const hasSeenGuidelines = sessionStorage.getItem(`profileGuidelines_${user.id}`)
      if (!hasSeenGuidelines) {
        setShowGuidelinesModal(true)
        sessionStorage.setItem(`profileGuidelines_${user.id}`, 'true')
        hasShownGuidelinesRef.current = true
      } else {
        // Already seen in this session, mark ref so we don't check again
        hasShownGuidelinesRef.current = true
      }
    }
  }, [isAuthenticated, user])

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      const data: Record<string, any> = {
        Name: user.Name || '',
        Email: user.Email || '',
        Bio: user.Bio || '',
        FieldsOfWork: user.FieldsOfWork || '',
        City: user.City || '',
        Province: user.Province || '',
        Phone: user.Phone || '',
        Websites: user.Websites || '',
        ProfileImageAltText: user.ProfileImageAltText || '',
        Project1Title: user.Project1Title || '',
        Project1Tags: user.Project1Tags || '',
        Project1Description: user.Project1Description || '',
        Project1Links: user.Project1Links || '',
        Project1PicturesAltText: user.Project1PicturesAltText || '',
        Project2Title: user.Project2Title || '',
        Project2Tags: user.Project2Tags || '',
        Project2Description: user.Project2Description || '',
        Project2Links: user.Project2Links || '',
        Project2PicturesAltText: user.Project2PicturesAltText || '',
        EngName: user.EngName || '',
        EngBio: user.EngBio || '',
        EngProject1Title: user.EngProject1Title || '',
        EngProject1Tags: user.EngProject1Tags || '',
        EngProject1Description: user.EngProject1Description || '',
        EngProject2Title: user.EngProject2Title || '',
        EngProject2Tags: user.EngProject2Tags || '',
        EngProject2Description: user.EngProject2Description || ''
      }
      setFormData(data)
      setOriginalData(data)
      setIsInitialDataLoaded(true)

      // Store original image IDs and initialize kept IDs with the same values
      const project1Ids = (user.Project1Pictures || []).map(img => img.id).filter((id): id is number => id !== undefined)
      const project2Ids = (user.Project2Pictures || []).map(img => img.id).filter((id): id is number => id !== undefined)
      setOriginalProject1ImageIds(project1Ids)
      setOriginalProject2ImageIds(project2Ids)
      setProject1KeptImageIds(project1Ids)
      setProject2KeptImageIds(project2Ids)
    }
  }, [user])

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    // Check if kept image IDs have changed
    const project1IdsChanged = JSON.stringify(project1KeptImageIds.sort()) !== JSON.stringify(originalProject1ImageIds.sort())
    const project2IdsChanged = JSON.stringify(project2KeptImageIds.sort()) !== JSON.stringify(originalProject2ImageIds.sort())

    return (
      JSON.stringify(formData) !== JSON.stringify(originalData) ||
      imageFile !== null ||
      project1Images.length > 0 ||
      project2Images.length > 0 ||
      project1IdsChanged ||
      project2IdsChanged
    )
  }

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaveMessage(null)
  }

  // Handle image change
  useEffect(() => {
    if (photoSubmitPending) {
      setPhotoSubmitPending(false)
      handleSave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSubmitPending])

  const handleImageChange = (file: File) => {
    setImageFile(file)
    setSaveMessage(null)
  }

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    // Allow only numbers, spaces, and plus sign (NO dashes or other characters)
    const phoneRegex = /^[\d\s+]+$/
    if (!phoneRegex.test(phone)) return false

    // Check minimum 10 digits (excluding spaces and plus)
    const digitsOnly = phone.replace(/[\s+]/g, '')
    return digitsOnly.length >= 10
  }

  // Count words in text
  const countWords = (text: string): number => {
    if (!text || text.trim() === '') return 0
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  // Count comma-separated items
  const countItems = (text: string): number => {
    if (!text || text.trim() === '') return 0
    return text.split(',').filter(item => item.trim().length > 0).length
  }

  // Save changes
  const handleSave = async () => {
    if (!hasUnsavedChanges()) return

    // Collect validation errors
    const errors: string[] = []

    // Validate email format
    if (formData.Email && !validateEmail(formData.Email)) {
      errors.push('Μη έγκυρη μορφή email')
    }

    // Validate phone format (only +, numbers, spaces allowed)
    if (formData.Phone && formData.Phone.trim() !== '' && formData.Phone !== '-') {
      // Check for invalid characters (anything except digits, spaces, and +)
      if (!/^[\d\s+]*$/.test(formData.Phone)) {
        errors.push('Το τηλέφωνο μπορεί να περιέχει μόνο αριθμούς, κενά και το σύμβολο + (όχι παύλες ή άλλα σύμβολα)')
      } else if (!validatePhone(formData.Phone)) {
        errors.push('Το τηλέφωνο πρέπει να περιέχει τουλάχιστον 10 ψηφία')
      }
    }

    // Validate Bio limits
    if (formData.Bio) {
      const bioPlainText = typeof formData.Bio === 'string' ? formData.Bio : blocksToPlainText(formData.Bio)
      const bioWordCount = countWords(bioPlainText)
      const bioCharCount = bioPlainText.length
      if (bioWordCount > 160) {
        errors.push(`Το βιογραφικό έχει ${bioWordCount} λέξεις (μέγιστο 160)`)
      }
      if (bioCharCount > 1200) {
        errors.push(`Το βιογραφικό έχει ${bioCharCount} χαρακτήρες (μέγιστο 1200)`)
      }
    }

    // Validate FieldsOfWork — temporarily allow more than 5 for legacy data
    // (limit will be enforced later)

    // Validate Project1 Tags (max 5 items)
    if (formData.Project1Tags) {
      const tagsCount = countItems(formData.Project1Tags)
      if (tagsCount > 5) {
        errors.push(`Τα tags του Έργου 1 είναι ${tagsCount} (μέγιστο 5)`)
      }
    }

    // Validate Project2 Tags (max 5 items)
    if (formData.Project2Tags) {
      const tagsCount = countItems(formData.Project2Tags)
      if (tagsCount > 5) {
        errors.push(`Τα tags του Έργου 2 είναι ${tagsCount} (μέγιστο 5)`)
      }
    }

    // Validate Name (no ALL CAPS)
    if (formData.Name && formData.Name === formData.Name.toUpperCase() && formData.Name.length > 2) {
      errors.push('Το όνομα δεν πρέπει να είναι σε κεφαλαία (ALL CAPS). Χρησιμοποίησε κανονική γραφή.')
    }

    // Check required fields
    if (!formData.Name || formData.Name.trim() === '' || formData.Name === 'Νέο Μέλος') {
      errors.push('Το όνομα είναι υποχρεωτικό')
    }

    if (!formData.Email || formData.Email.trim() === '') {
      errors.push('Το email είναι υποχρεωτικό')
    }

    const bioText = typeof formData.Bio === 'string' ? formData.Bio : blocksToPlainText(formData.Bio)
    if (!bioText || bioText.trim() === '') {
      errors.push('Το βιογραφικό είναι υποχρεωτικό')
    }

    if (!formData.FieldsOfWork || formData.FieldsOfWork.trim() === '' || formData.FieldsOfWork === 'Προς Συμπλήρωση') {
      errors.push('Τα πεδία πρακτικής είναι υποχρεωτικά')
    }

    if (!formData.City || formData.City.trim() === '' || formData.City === '-') {
      errors.push('Η πόλη είναι υποχρεωτική')
    }

    // Province is auto-derived from city — no user validation needed

    // Check if user has a profile image (either existing or uploading new one)
    const hasProfileImage = (user?.Image && user.Image.length > 0) || imageFile
    if (!hasProfileImage) {
      errors.push('Η φωτογραφία προφίλ είναι υποχρεωτική')
    }

    // Profile image alt text is always required (since profile image is required)
    if (!formData.ProfileImageAltText || formData.ProfileImageAltText.trim() === '') {
      errors.push('Το εναλλακτικό κείμενο φωτογραφίας είναι υποχρεωτικό')
    }

    // Project 1 alt text required if project has images
    const hasProject1Images = (project1KeptImageIds.length > 0) || (project1Images.length > 0)
    if (hasProject1Images && (!formData.Project1PicturesAltText || formData.Project1PicturesAltText.trim() === '')) {
      errors.push('Το εναλλακτικό κείμενο φωτο έργου 1 είναι υποχρεωτικό όταν υπάρχουν εικόνες')
    }

    // Project 2 alt text required if project has images
    const hasProject2Images = (project2KeptImageIds.length > 0) || (project2Images.length > 0)
    if (hasProject2Images && (!formData.Project2PicturesAltText || formData.Project2PicturesAltText.trim() === '')) {
      errors.push('Το εναλλακτικό κείμενο φωτο έργου 2 είναι υποχρεωτικό όταν υπάρχουν εικόνες')
    }

    // Project must have a title in at least one language (GR or EN) when any
    // other project field is filled. Empty projects are allowed (skip rule).
    const isStringFilled = (v: any) => typeof v === 'string' && v.trim() !== ''
    const isBlocksFilled = (v: any) => {
      if (!v) return false
      if (typeof v === 'string') return v.trim() !== ''
      if (!Array.isArray(v)) return false
      return blocksToPlainText(v).trim() !== ''
    }

    const project1HasContent =
      isStringFilled(formData.Project1Title) ||
      isStringFilled(formData.EngProject1Title) ||
      isStringFilled(formData.Project1Tags) ||
      isStringFilled(formData.EngProject1Tags) ||
      isBlocksFilled(formData.Project1Description) ||
      isBlocksFilled(formData.EngProject1Description) ||
      isStringFilled(formData.Project1Links) ||
      hasProject1Images
    const project1HasTitle =
      isStringFilled(formData.Project1Title) || isStringFilled(formData.EngProject1Title)
    if (project1HasContent && !project1HasTitle) {
      errors.push('Το Έργο 1 πρέπει να έχει τίτλο σε τουλάχιστον μία γλώσσα (Ελληνικά ή Αγγλικά)')
    }

    const project2HasContent =
      isStringFilled(formData.Project2Title) ||
      isStringFilled(formData.EngProject2Title) ||
      isStringFilled(formData.Project2Tags) ||
      isStringFilled(formData.EngProject2Tags) ||
      isBlocksFilled(formData.Project2Description) ||
      isBlocksFilled(formData.EngProject2Description) ||
      isStringFilled(formData.Project2Links) ||
      hasProject2Images
    const project2HasTitle =
      isStringFilled(formData.Project2Title) || isStringFilled(formData.EngProject2Title)
    if (project2HasContent && !project2HasTitle) {
      errors.push('Το Έργο 2 πρέπει να έχει τίτλο σε τουλάχιστον μία γλώσσα (Ελληνικά ή Αγγλικά)')
    }

    // If there are validation errors, show them
    if (errors.length > 0) {
      setValidationErrors(errors)
      setTimeout(() => errorsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      return
    }

    setIsSaving(true)
    setSaveMessage(null)
    setValidationErrors([])

    try {
      // Exclude Email from update (it's not editable)
      const { Email, ...dataToUpdate } = formData
      let response

      // Check if image IDs have changed
      const project1IdsChanged = JSON.stringify(project1KeptImageIds.sort()) !== JSON.stringify(originalProject1ImageIds.sort())
      const project2IdsChanged = JSON.stringify(project2KeptImageIds.sort()) !== JSON.stringify(originalProject2ImageIds.sort())

      if (imageFile || project1Images.length > 0 || project2Images.length > 0 || project1IdsChanged || project2IdsChanged) {
        // Use FormData if there are any images
        const formDataWithImages = new FormData()
        const blocksFields = ['Bio', 'EngBio', 'Project1Description', 'Project2Description', 'EngProject1Description', 'EngProject2Description']
        Object.entries(dataToUpdate).forEach(([key, value]) => {
          // Serialize blocks arrays as JSON strings for FormData transport
          if (blocksFields.includes(key) && Array.isArray(value)) {
            formDataWithImages.append(key, JSON.stringify(value))
          } else {
            formDataWithImages.append(key, typeof value === 'string' ? value : JSON.stringify(value))
          }
        })

        // Add profile image
        if (imageFile) {
          formDataWithImages.append('image', imageFile)
        }

        // Add project 1 images
        project1Images.forEach((file) => {
          formDataWithImages.append('project1Images', file)
        })

        // Add project 1 kept existing image IDs
        project1KeptImageIds.forEach((id) => {
          formDataWithImages.append('project1KeptImageIds', id.toString())
        })

        // Add project 2 images
        project2Images.forEach((file) => {
          formDataWithImages.append('project2Images', file)
        })

        // Add project 2 kept existing image IDs
        project2KeptImageIds.forEach((id) => {
          formDataWithImages.append('project2KeptImageIds', id.toString())
        })

        response = await fetch('/api/members/update', {
          method: 'POST',
          body: formDataWithImages
        })
      } else {
        // Use JSON if no images — blocks arrays are sent directly (no stringify needed for JSON body)
        response = await fetch('/api/members/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dataToUpdate)
        })
      }

      const data = await response.json()

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Οι αλλαγές αποθηκεύτηκαν επιτυχώς' })
        setOriginalData(formData)
        setImageFile(null)
        setProject1Images([])
        setProject2Images([])

        // Refresh session to update user data
        await refreshSession()

        // After refresh, the new original IDs and kept IDs will be set by the useEffect that watches user data
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Αποτυχία αποθήκευσης' })
        setTimeout(() => saveMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Σφάλμα δικτύου. Παρακαλώ δοκίμασε ξανά.' })
      setTimeout(() => saveMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } finally {
      setIsSaving(false)
    }
  }

  // Discard changes
  const handleDiscard = () => {
    setFormData(originalData)
    setImageFile(null)
    setProject1Images([])
    setProject2Images([])
    setProject1KeptImageIds(originalProject1ImageIds)
    setProject2KeptImageIds(originalProject2ImageIds)
    setSaveMessage(null)
    setShowUnsavedModal(false)

    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  // Save and navigate
  const handleSaveAndNavigate = async () => {
    await handleSave()
    setShowUnsavedModal(false)

    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, originalData, imageFile])

  // Show loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-coral dark:text-coral-light mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-300">Φόρτωση...</p>
        </div>
      </main>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  const currentImageUrl = user.Image && user.Image.length > 0 ? user.Image[0].url : undefined

  // Ρ2: τα μπλοκ πεδίων ορίζονται μία φορά και μπαίνουν σε διαφορετική
  // διάταξη ανά στυλ — classic κάρτες ή cool συμπυκνωμένες κάψουλες
  const nameEditor = (
    <>
              {/* Name with GR/EN toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-charcoal dark:text-gray-200">Όνομα <span className="text-coral">*</span></span>
                  <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setNameLang('gr')}
                      className={`px-3 py-1 font-medium transition-colors ${nameLang === 'gr' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      GR
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameLang('en')}
                      className={`px-3 py-1 font-medium transition-colors ${nameLang === 'en' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
                {nameLang === 'gr' ? (
                  <EditableField
                    label=""
                    value={formData.Name}
                    placeholder="Το όνομά σας (ελληνικά)"
                    onChange={(value) => handleFieldChange('Name', value)}
                    tooltip="Μη χρησιμοποιείς κεφαλαία (ALL CAPS). Χρησιμοποίησε σημεία στίξης όπου χρειάζεται."
                  />
                ) : (
                  <>
                    <EditableField
                      label=""
                      value={formData.EngName}
                      placeholder="Your name in English (optional)"
                      onChange={(value) => handleFieldChange('EngName', value)}
                      tooltip="Προαιρετικό. Αν το συμπληρώσεις, θα εμφανίζεται ως αγγλική μετάφραση του ονόματός σου αντί της αυτόματης μετάφρασης Google."
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Προαιρετικό — Αν δεν το συμπληρώσεις, η αυτόματη μετάφραση (Google Translate) θα μεταφράσει το ελληνικό όνομα.
                    </p>
                  </>
                )}
              </div>
    </>
  )
  const emailEditor = (
    <>
              <EditableField
                label="Email"
                value={formData.Email}
                placeholder="email@example.com"
                type="email"
                onChange={(value) => handleFieldChange('Email', value)}
                required
                disabled
                helperText="Επικοινώνησε με τον διαχειριστή για να αλλάξεις το email σου"
                tooltip="Το email δεν μπορεί να αλλάξει. Για αλλαγή, επικοινώνησε με τον διαχειριστή IT."
              />
    </>
  )
  const bioEditor = (
    <>
              {/* Bio with GR/EN toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-charcoal dark:text-gray-200">Βιογραφικό <span className="text-coral">*</span></span>
                  <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setBioLang('gr')}
                      className={`px-3 py-1 font-medium transition-colors ${bioLang === 'gr' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      GR
                    </button>
                    <button
                      type="button"
                      onClick={() => setBioLang('en')}
                      className={`px-3 py-1 font-medium transition-colors ${bioLang === 'en' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
                {bioLang === 'gr' ? (
                  <RichTextEditor
                    key={`bio-${isInitialDataLoaded ? 'loaded' : 'loading'}`}
                    label=""
                    content={formData.Bio}
                    placeholder="Γράψε μια σύντομη περιγραφή για εσένα..."
                    onChange={(blocks) => handleFieldChange('Bio', blocks)}
                    maxWords={160}
                    maxCharacters={1200}
                    tooltip="Όριο: 160 λέξεις ή 1200 χαρακτήρες. Υποστηρίζεται μορφοποίηση: έντονα, πλάγια, λίστες, σύνδεσμοι κ.ά."
                  />
                ) : (
                  <>
                    <RichTextEditor
                      key={`engbio-${isInitialDataLoaded ? 'loaded' : 'loading'}`}
                      label=""
                      content={formData.EngBio}
                      placeholder="Write a short bio in English (optional)..."
                      onChange={(blocks) => handleFieldChange('EngBio', blocks)}
                      maxWords={160}
                      maxCharacters={1200}
                      tooltip="Optional. Same limits as Greek bio: 160 words / 1200 characters."
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Προαιρετικό — Αν δεν το συμπληρώσεις, η αυτόματη μετάφραση (Google Translate) θα μεταφράσει το ελληνικό βιογραφικό. Αν το συμπληρώσεις, θα χρησιμοποιηθεί ως η αγγλική μετάφραση αντί της αυτόματης.
                    </p>
                  </>
                )}
              </div>
    </>
  )
  const fieldsEditor = (
    <>
              <FieldsOfWorkSelector
                value={formData.FieldsOfWork}
                onChange={(value) => handleFieldChange('FieldsOfWork', value)}
              />
    </>
  )
  const phoneEditor = (
    <>
              <EditableField
                label="Τηλέφωνο"
                value={formData.Phone}
                placeholder="+30 123 456 7890"
                type="tel"
                onChange={(value) => handleFieldChange('Phone', value)}
                tooltip="Μόνο αριθμοί, κενά και +. Απαγορεύονται παύλες, παρενθέσεις κλπ."
              />
    </>
  )
  const locationEditor = (
    <>
              <CityAutocomplete
                value={formData.City}
                onChange={(value) => handleFieldChange('City', value)}
                onProvinceChange={(value) => handleFieldChange('Province', value)}
                required
              />

              {/* Province - read-only, auto-derived from city */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
                  Περιφέρεια
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div
                  className="group relative flex items-start gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <div className="flex-1 opacity-60">
                    {formData.Province && formData.Province !== '-' ? (
                      <p className="text-charcoal dark:text-gray-200">{formData.Province}</p>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 italic">Συμπληρώνεται αυτόματα</p>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block z-10">
                    <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white whitespace-nowrap">
                      Συμπληρώνεται αυτόματα από την πόλη. Επικοινώνησε μαζί μας για αλλαγές.
                      <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
                    </div>
                  </div>
                </div>
              </div>
    </>
  )
  const websitesEditor = (
    <>
              <EditableField
                label="Ιστοσελίδες και Κοινωνικά Δίκτυα"
                value={formData.Websites}
                placeholder="https://example.com"
                type="url"
                onChange={(value) => handleFieldChange('Websites', value)}
                helperText="Διαχώρισε με κόμμα (,)"
                tooltip="Χώρισε πολλαπλές ιστοσελίδες και κοινωνικά δίκτυα με κόμμα."
              />
    </>
  )
  const project1Editor = (
    <>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-charcoal dark:text-gray-100">
                    Έργο 1
                  </h3>
                  <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setProject1Lang('gr')}
                      className={`px-3 py-1 font-medium transition-colors ${project1Lang === 'gr' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      GR
                    </button>
                    <button
                      type="button"
                      onClick={() => setProject1Lang('en')}
                      className={`px-3 py-1 font-medium transition-colors ${project1Lang === 'en' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {project1Lang === 'gr' ? (
                  <>
                    <EditableField
                      label="Τίτλος Έργου"
                      value={formData.Project1Title}
                      placeholder="Τίτλος του πρώτου έργου σας"
                      onChange={(value) => handleFieldChange('Project1Title', value)}
                    />

                    <EditableField
                      label="Tags/Κατηγορίες"
                      value={formData.Project1Tags}
                      placeholder="Design, Development, Art"
                      onChange={(value) => handleFieldChange('Project1Tags', value)}
                      helperText="Διαχώρισε με κόμμα (,) - μέγιστο 5 tags"
                      maxItems={5}
                      tooltip="Μέγιστο 5 tags ανά έργο, χωρισμένα με κόμμα."
                    />

                    <RichTextEditor
                      key={`p1desc-${isInitialDataLoaded ? 'loaded' : 'loading'}`}
                      label="Περιγραφή"
                      content={formData.Project1Description}
                      placeholder="Περίγραψε το έργο σου..."
                      onChange={(blocks) => handleFieldChange('Project1Description', blocks)}
                      tooltip="Υποστηρίζεται μορφοποίηση. Ενσωμάτωση εικόνας: [IMAGE: url | alt text]"
                    />
                  </>
                ) : (
                  <>
                    <EditableField
                      label="Project Title (EN)"
                      value={formData.EngProject1Title}
                      placeholder="Project title in English (optional)"
                      onChange={(value) => handleFieldChange('EngProject1Title', value)}
                    />

                    <EditableField
                      label="Tags/Categories (EN)"
                      value={formData.EngProject1Tags}
                      placeholder="Design, Development, Art"
                      onChange={(value) => handleFieldChange('EngProject1Tags', value)}
                      helperText="Comma-separated (,) - max 5 tags"
                      maxItems={5}
                      tooltip="Max 5 tags per project, comma-separated."
                    />

                    <RichTextEditor
                      key={`engp1desc-${isInitialDataLoaded ? 'loaded' : 'loading'}`}
                      label="Description (EN)"
                      content={formData.EngProject1Description}
                      placeholder="Describe your project in English (optional)..."
                      onChange={(blocks) => handleFieldChange('EngProject1Description', blocks)}
                      tooltip="Optional. Same formatting supported. Embedded image: [IMAGE: url | alt text]"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Προαιρετικό — Αν δεν το συμπληρώσεις, η αυτόματη μετάφραση (Google Translate) θα μεταφράσει την ελληνική περιγραφή.
                    </p>
                  </>
                )}

                <EditableField
                  label="Links Έργου"
                  value={formData.Project1Links}
                  placeholder="https://example.com, https://instagram.com/project"
                  onChange={(value) => handleFieldChange('Project1Links', value)}
                  helperText="URLs χωρισμένα με κόμμα — αναγνωρίζονται αυτόματα social media, ιστοσελίδες κλπ."
                />

                <EditableMultipleImages
                  label="Εικόνες Έργου"
                  existingImages={user?.Project1Pictures}
                  keptImageIds={project1KeptImageIds}
                  onImagesChange={(files, keptIds) => {
                    setProject1Images(files)
                    setProject1KeptImageIds(keptIds)
                  }}
                />

                <EditableField
                  label="Εναλλακτικό κείμενο φωτο έργου 1"
                  value={formData.Project1PicturesAltText}
                  placeholder="π.χ. Παιδιά ζωγραφίζουν τοιχογραφία σε δημόσιο χώρο"
                  onChange={(value) => handleFieldChange('Project1PicturesAltText', value)}
                  helperText="Υποχρεωτικό όταν υπάρχουν εικόνες - Περιγραφή για προσβασιμότητα (μέγιστο 200 χαρακτήρες)"
                  maxCharacters={200}
                  required={(project1KeptImageIds.length > 0) || (project1Images.length > 0)}
                  tooltip="Περίγραψε τι δείχνουν οι εικόνες του έργου. Μην επαναλάβεις τον τίτλο. Μέγιστο 200 χαρακτήρες."
                />
    </>
  )
  const project2Editor = (
    <>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-charcoal dark:text-gray-100">
                    Έργο 2
                  </h3>
                  <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setProject2Lang('gr')}
                      className={`px-3 py-1 font-medium transition-colors ${project2Lang === 'gr' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      GR
                    </button>
                    <button
                      type="button"
                      onClick={() => setProject2Lang('en')}
                      className={`px-3 py-1 font-medium transition-colors ${project2Lang === 'en' ? 'bg-coral text-white dark:bg-coral-light dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {project2Lang === 'gr' ? (
                  <>
                    <EditableField
                      label="Τίτλος Έργου"
                      value={formData.Project2Title}
                      placeholder="Τίτλος του δεύτερου έργου σας"
                      onChange={(value) => handleFieldChange('Project2Title', value)}
                    />

                    <EditableField
                      label="Tags/Κατηγορίες"
                      value={formData.Project2Tags}
                      placeholder="Design, Development, Art"
                      onChange={(value) => handleFieldChange('Project2Tags', value)}
                      helperText="Διαχώρισε με κόμμα (,) - μέγιστο 5 tags"
                      maxItems={5}
                      tooltip="Μέγιστο 5 tags ανά έργο, χωρισμένα με κόμμα."
                    />

                    <RichTextEditor
                      key={`p2desc-${isInitialDataLoaded ? 'loaded' : 'loading'}`}
                      label="Περιγραφή"
                      content={formData.Project2Description}
                      placeholder="Περίγραψε το έργο σου..."
                      onChange={(blocks) => handleFieldChange('Project2Description', blocks)}
                      tooltip="Υποστηρίζεται μορφοποίηση. Ενσωμάτωση εικόνας: [IMAGE: url | alt text]"
                    />
                  </>
                ) : (
                  <>
                    <EditableField
                      label="Project Title (EN)"
                      value={formData.EngProject2Title}
                      placeholder="Project title in English (optional)"
                      onChange={(value) => handleFieldChange('EngProject2Title', value)}
                    />

                    <EditableField
                      label="Tags/Categories (EN)"
                      value={formData.EngProject2Tags}
                      placeholder="Design, Development, Art"
                      onChange={(value) => handleFieldChange('EngProject2Tags', value)}
                      helperText="Comma-separated (,) - max 5 tags"
                      maxItems={5}
                      tooltip="Max 5 tags per project, comma-separated."
                    />

                    <RichTextEditor
                      key={`engp2desc-${isInitialDataLoaded ? 'loaded' : 'loading'}`}
                      label="Description (EN)"
                      content={formData.EngProject2Description}
                      placeholder="Describe your project in English (optional)..."
                      onChange={(blocks) => handleFieldChange('EngProject2Description', blocks)}
                      tooltip="Optional. Same formatting supported. Embedded image: [IMAGE: url | alt text]"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Προαιρετικό — Αν δεν το συμπληρώσεις, η αυτόματη μετάφραση (Google Translate) θα μεταφράσει την ελληνική περιγραφή.
                    </p>
                  </>
                )}

                <EditableField
                  label="Links Έργου"
                  value={formData.Project2Links}
                  placeholder="https://example.com, https://instagram.com/project"
                  onChange={(value) => handleFieldChange('Project2Links', value)}
                  helperText="URLs χωρισμένα με κόμμα — αναγνωρίζονται αυτόματα social media, ιστοσελίδες κλπ."
                />

                <EditableMultipleImages
                  label="Εικόνες Έργου"
                  existingImages={user?.Project2Pictures}
                  keptImageIds={project2KeptImageIds}
                  onImagesChange={(files, keptIds) => {
                    setProject2Images(files)
                    setProject2KeptImageIds(keptIds)
                  }}
                />

                <EditableField
                  label="Εναλλακτικό κείμενο φωτο έργου 2"
                  value={formData.Project2PicturesAltText}
                  placeholder="π.χ. Θεατρική παράσταση με 10 ηθοποιούς σε σκηνή"
                  onChange={(value) => handleFieldChange('Project2PicturesAltText', value)}
                  helperText="Υποχρεωτικό όταν υπάρχουν εικόνες - Περιγραφή για προσβασιμότητα (μέγιστο 200 χαρακτήρες)"
                  maxCharacters={200}
                  required={(project2KeptImageIds.length > 0) || (project2Images.length > 0)}
                  tooltip="Περίγραψε τι δείχνουν οι εικόνες του έργου. Μην επαναλάβεις τον τίτλο. Μέγιστο 200 χαρακτήρες."
                />
    </>
  )

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Dashboard Hero Section */}
        {heroCompact && !coolMode && <div className="h-28" aria-hidden="true" />}
        {/* Π1 (29/8): στο Cool το hero είναι navy κάρτα-σκηνή με τον
            χαιρετισμό, τα chips κατάστασης και τις ενότητες ως καρτέλες
            στην κάτω ακμή — η γραμματική των Σχετικά/Πολιτικών. */}
        {coolMode && (
        <section className="px-2 pt-2 md:px-3 md:pt-3" ref={heroRef}>
          <div className="relative rounded-3xl overflow-hidden min-h-[38vh] md:min-h-[44vh] flex flex-col justify-end" style={{ backgroundColor: '#1B2438' }}>
            {/* Ε3 (29/8): η φωτογραφία του μέλους ΚΑΤΟΙΚΕΙ στη δεξιά πλευρά —
                αόρατη ως τα 2/3 του πλάτους, ολοκληρώνει το ξεθώριασμα στην
                άκρη, αλλά ακόμη κι εκεί μένει θολή και μισοφωτισμένη: υπάρχει
                στη σκηνή, δεν αποκαλύπτεται ποτέ 100%. Χωρίς φωτογραφία, το
                navy στέκει μόνο του. */}
            {/* Το ΣΤΑΘΕΡΟ χρωματιστό λούσιμο — ίδιο για κάθε μέλος, με ή
                χωρίς φωτογραφία (επιλογή 29/8, εργαστήρι μίξης) */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
              style={{
                background:
                  'radial-gradient(90% 130% at 86% 40%, rgba(214,142,114,.8) 0%, rgba(171,104,86,.5) 38%, rgba(27,36,56,0) 68%), ' +
                  'radial-gradient(50% 80% at 70% 85%, rgba(255,139,106,.35) 0%, rgba(27,36,56,0) 70%)',
              }}
            />
            {/* Σ1: ασπρόμαυρη πηγή + soft-light — το λούσιμο βάφει το πρόσωπο,
                ενιαίο duotone για όλα τα προφίλ· ποτέ πλήρης αποκάλυψη */}
            {currentImageUrl && (
              <div className="absolute inset-y-0 right-0 w-1/3 pointer-events-none" aria-hidden="true"
                style={{
                  backgroundImage: `url(${currentImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 22%',
                  filter: 'grayscale(1)',
                  mixBlendMode: 'soft-light',
                  WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.9) 45%, rgba(0,0,0,.9) 100%)',
                  maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.9) 45%, rgba(0,0,0,.9) 100%)',
                }}
              />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.08) 30%, rgba(0,0,0,.45) 100%)' }} aria-hidden="true" />
            <div className="relative px-6 md:px-12 pb-16 md:pb-[4.5rem] pt-24">
              <p className="text-coral font-bold text-sm tracking-[.18em] mb-2">{currentSection.heroTitle}</p>
              <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.8rem, 3.6vw, 3rem)', lineHeight: 0.98 }}>
                {heroContext().title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {(() => {
                  const year = new Date().getFullYear()
                  const paid = user?.Payments?.[String(year)] === 1
                  return paid ? (
                    <span className="text-sm font-bold rounded-full px-4 py-1.5 bg-white/15 text-green-300">✓ Συνδρομή {year} εντάξει</span>
                  ) : (
                    <span className="text-sm font-bold rounded-full px-4 py-1.5 bg-white/15 text-amber-300">Συνδρομή {year} σε εκκρεμότητα</span>
                  )
                })()}
                {activeSection === 'profile' && typeof indicatorFor('profile') === 'number' && (
                  <span className="text-sm font-bold rounded-full px-4 py-1.5 bg-white/15 text-amber-300">
                    {indicatorFor('profile')} πεδία προφίλ κενά
                  </span>
                )}
                {/* Χωρίς «Επεξεργασία προφίλ» (29/8): η επεξεργασία είναι
                    πλέον διαισθητική — κλικ σε οποιοδήποτε στοιχείο. Στις
                    άλλες όψεις το CTA τους μένει. */}
                {activeSection !== 'profile' && heroContext().cta && (
                  <button type="button" onClick={heroContext().onCta}
                    className="text-sm font-bold rounded-full px-4 py-1.5 bg-coral text-charcoal hover:bg-[#F07551] transition-colors">
                    {heroContext().cta}
                  </button>
                )}
                {ocAccess.isBoard && (
                  <Link href="/oc"
                    onClick={(e) => { if (ocAccess.seats.length > 1) { e.preventDefault(); setShowOcSeatModal(true) } }}
                    className="notranslate text-sm font-bold rounded-full px-4 py-1.5 border border-white/40 text-white hover:bg-white/10 transition-colors">
                    OC →
                  </Link>
                )}
                {activeSection === 'profile' && (
                  <button type="button" onClick={() => setShowGuidelinesModal(true)}
                    className="text-sm font-bold rounded-full px-4 py-1.5 text-white hover:brightness-125 transition duration-200"
                    style={{ backgroundColor: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.4)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)' }}>
                    Οδηγίες συμπλήρωσης
                  </button>
                )}
              </div>
            </div>
            {/* Η αλλαγή φωτογραφίας γίνεται ΠΑΝΩ στη σκηνή — εκεί που ζει η
                εικόνα (διόρθωση 29/8: όχι ξεχωριστό πεδίο στη φόρμα) */}
            {activeSection === 'profile' && (
              <div className="absolute right-16 md:right-24 bottom-14 z-10 group/photo">
                <button type="button" onClick={() => setPhotoMenuOpen(v => !v)}
                  aria-expanded={photoMenuOpen} aria-haspopup="true"
                  className="text-sm font-bold rounded-full px-5 py-2 text-white hover:brightness-125 transition duration-200"
                  style={{ backgroundColor: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.45)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)' }}>
                  Αλλαγή φωτογραφίας
                </button>
                {/* Tooltip προδιαγραφών στο hover */}
                {!photoMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover/photo:block w-64 pointer-events-none">
                    <div className="menu-glass-dense glass-rim rounded-xl px-3 py-2 text-xs text-charcoal dark:text-gray-200">
                      Ιδανικές διαστάσεις: 500×600px (5:6). Μέγιστο 5MB. Μορφές: JPG, PNG, GIF, WebP.
                    </div>
                  </div>
                )}
                {/* Δύο επιλογές στο κλικ */}
                {photoMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 menu-glass-dense glass-rim rounded-2xl py-1.5">
                    <button type="button"
                      onClick={() => { setPhotoMenuOpen(false); coolImageInputRef.current?.click() }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-charcoal dark:text-gray-200 hover:bg-coral/15 transition-colors">
                      Αλλαγή φωτό
                    </button>
                    <button type="button"
                      onClick={() => { setPhotoMenuOpen(false); setPhotoAltDraft(formData.ProfileImageAltText || ''); setPhotoAltModal({ file: null }) }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-charcoal dark:text-gray-200 hover:bg-coral/15 transition-colors">
                      Μόνο alt-text
                    </button>
                  </div>
                )}
                <input ref={coolImageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setPhotoAltDraft(formData.ProfileImageAltText || ''); setPhotoAltModal({ file: f }) }
                    e.target.value = ''
                  }} />
              </div>
            )}
            {/* Οι ενότητες ως καρτέλες στην κάτω ακμή — ίδια γλώσσα με τα Σχετικά */}
            <nav aria-label="Ενότητες του χώρου μου" className="absolute bottom-0 inset-x-0"
              style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {DASHBOARD_SECTIONS.map(section => (
                  <button key={section.key} type="button"
                    onClick={() => { setActiveSection(section.key); window.scrollTo({ top: 0 }) }}
                    aria-current={activeSection === section.key ? 'page' : undefined}
                    className={`inline-flex items-center min-h-11 px-4 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 ${
                      activeSection === section.key ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
                    }`}>
                    {section.label}
                    {(() => {
                      const ind = indicatorFor(section.key)
                      if (ind === null) return null
                      if (ind === 'dot') return <span className="inline-block w-1.5 h-1.5 rounded-full bg-coral ml-1.5" aria-label="νέο περιεχόμενο" />
                      return <span className="notranslate inline-flex items-center justify-center min-w-[1rem] h-4 px-1 ml-1.5 rounded-full text-[9px] font-bold bg-coral text-white">{ind}</span>
                    })()}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </section>
        )}
        {!heroCompact && !coolMode && (
        <section className="relative -bottom-20" ref={heroRef}>
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 min-h-[25vh] flex items-center rounded-b-3xl relative z-10 py-8">

            {/* Content area: same inset as accessibility button on both sides, minus space for the button itself on the right */}
            <div className="w-full px-6 lg:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 pr-16 lg:pr-16">
                {/* Αριστερά: χαιρετισμός + κατάσταση + κύρια πράξη (εκδοχή Β, 25/8).
                    Ο τίτλος ενότητας έγινε eyebrow — το φωτισμένο pill τον δείχνει ήδη,
                    και το μεγάλο κείμενο πλέον ΛΕΕΙ κάτι: ποιος είσαι ή τι σε περιμένει. */}
                <div className="flex flex-col justify-center min-w-0 gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/70 dark:text-gray-400 m-0">
                    {currentSection.heroTitle}
                  </p>
                  <h1 className="text-[clamp(1.4rem,3vw,2.6rem)] font-bold leading-tight dark:text-coral m-0">
                    {heroContext().title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(() => {
                      const year = new Date().getFullYear()
                      const paid = user?.Payments?.[String(year)] === 1
                      return paid ? (
                        <span className="text-sm font-bold rounded-full px-4 py-1.5 bg-white/85 dark:bg-white/10 text-green-800 dark:text-green-300">
                          ✓ Συνδρομή {year} εντάξει
                        </span>
                      ) : (
                        <span className="text-sm font-bold rounded-full px-4 py-1.5 bg-white/85 dark:bg-white/10 text-amber-800 dark:text-amber-300">
                          Συνδρομή {year} σε εκκρεμότητα
                        </span>
                      )
                    })()}
                    {activeSection === 'profile' && typeof indicatorFor('profile') === 'number' && (
                      <span className="text-sm font-bold rounded-full px-4 py-1.5 bg-white/85 dark:bg-white/10 text-amber-800 dark:text-amber-300">
                        {indicatorFor('profile')} πεδία προφίλ κενά
                      </span>
                    )}
                    {heroContext().cta && (
                      <button
                        type="button"
                        onClick={heroContext().onCta}
                        className="text-sm font-bold rounded-full px-4 py-1.5 bg-charcoal text-white hover:opacity-90 transition-opacity"
                      >
                        {heroContext().cta}
                      </button>
                    )}
                    {/* Συμπαγής προβολή: φούσκα δίπλα στην κύρια πράξη — βέλη
                        ΠΡΟΣ το κέντρο (μαζεύει)· η επαναφορά στη λωρίδα κρατά
                        τα βέλη προς τα έξω (απλώνει). */}
                    <button
                      type="button"
                      onClick={() => setHeroCompact(true)}
                      aria-label="Συμπαγής προβολή — μόνο η μπάρα πλοήγησης"
                      title="Συμπαγής προβολή"
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/85 dark:bg-white/10 text-charcoal dark:text-gray-200 hover:bg-white dark:hover:bg-white/20 transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Right: Navigation buttons (fixed half) */}
                <div className="flex flex-wrap gap-2 items-center">
                  {DASHBOARD_SECTIONS.map((section) => (
                    <div key={section.key} className="relative group/tab">
                      <button
                        onClick={() => setActiveSection(section.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                          activeSection === section.key
                            ? 'bg-charcoal dark:bg-coral text-coral dark:text-white shadow-md'
                            : 'bg-charcoal/60 dark:bg-white/10 text-white dark:text-gray-300 hover:bg-charcoal/80 dark:hover:bg-white/20'
                        }`}
                      >
                        {section.label}
                        {(() => {
                          const ind = indicatorFor(section.key)
                          if (ind === null) return null
                          if (ind === 'dot') return <span aria-label="νέο περιεχόμενο" className="inline-block w-1.5 h-1.5 rounded-full bg-white ml-1.5 align-middle" />
                          return (
                            <span className={`notranslate inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 ml-1.5 rounded-full text-[10px] font-bold align-middle ${
                              activeSection === section.key ? 'bg-white text-coral' : 'bg-coral text-white'
                            }`}>{ind}</span>
                          )
                        })()}
                      </button>
                      {section.key === 'educational' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tab:block z-10">
                          <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white whitespace-nowrap">
                            Εργαλεία, εκπαιδεύσεις, καλές πρακτικές
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
                          </div>
                        </div>
                      )}
                      {section.key === 'networks' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tab:block z-10">
                          <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white whitespace-nowrap">
                            Μέλη, σχετικά δίκτυα, κατάλογος
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
                          </div>
                        </div>
                      )}
                      {section.key === 'working-groups' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover/tab:block z-10">
                          <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white whitespace-nowrap">
                            Ομάδες εργασίας, αίτημα συμμετοχής
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black dark:border-b-white"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* OC entry — rendered ONLY for verified board members */}
                  {ocAccess.isBoard && (
                    <Link
                      href="/oc"
                      onClick={(e) => {
                        // TEMPORARY: multi-seat members pick a seat on every OC entry
                        if (ocAccess.seats.length > 1) {
                          e.preventDefault()
                          setShowOcSeatModal(true)
                        }
                      }}
                      className="notranslate px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap bg-white text-charcoal shadow-md hover:bg-gray-100 dark:bg-coral dark:text-white dark:hover:bg-coral/90 border-2 border-charcoal/20 dark:border-transparent"
                    >
                      OC →
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Accessibility Menu Trigger Button */}
            <div
              className="hero-a11y absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
                opacity: accessibilityButtonScale,
                pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
              }}
            >
              <AccessibilityButton />
            </div>
          </div>
        </section>
        )}

        {/* Γυάλινη λωρίδα: εμφανίζεται στο scroll Ή μόνιμα όταν το hero είναι
            καρφιτσωμένο συμπαγές. ΓΕΩΜΕΤΡΙΑ: δένει με το κύριο μενού και
            «κάθεται» λίγο ΠΙΣΩ του — ίδιες πλευρές, γωνίες μόνο κάτω, z κάτω
            από το z-50 του μενού ώστε η μπάρα να την επικαλύπτει ελαφρά.
            Το μενού έχει δύο καταστάσεις (πλήρες πλάτος στην κορυφή · πλωτό
            pill 90% όταν κυλήσει, ~25vh — ίδιο κατώφλι με το heroOut), οπότε
            η λωρίδα ακολουθεί: πλήρες πλάτος ή (100%−2rem)×0.9 αντίστοιχα. */}
        {(() => {
          const visible = heroOut || heroCompact
          return (
        // Η κίνηση εμφάνισης ζει στο ΕΣΩΤΕΡΙΚΟ στοιχείο: το εξωτερικό
        // κεντράρεται με inline transform (translateX), που θα πατούσε
        // κάθε translate-y class στο ίδιο property — η λωρίδα γλιστρά
        // από πίσω από το πλωτό μενού προς τα κάτω, με fade μαζί.
        <div
          className={`fixed z-40 transition-all duration-300 ${visible ? '' : 'pointer-events-none'}`}
          style={navMode === 'cool'
            ? { top: '3.4rem', left: '1rem' }
            : navScrolled
              ? { top: '5.1rem', left: '50%', transform: 'translateX(-50%)', width: 'calc((100% - 2rem) * 0.9)' }
              : { top: '4.5rem', left: 0, right: 0, width: '100%' }}
          aria-hidden={!visible}
        >
          <div className={`flex items-center gap-2 overflow-x-auto menu-glass glass-rim strip-slide ${navMode === 'cool' ? 'rounded-b-2xl px-2 pt-2.5 pb-1.5' : 'rounded-b-2xl px-3 pt-3 pb-2'} ${visible ? 'strip-shown' : 'strip-hidden'}`}
            style={{ scrollbarWidth: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, ...(navMode === 'cool' ? { backgroundColor: 'rgba(10, 14, 24, .72)' } : {}) }}>
            <span className={`text-sm font-bold whitespace-nowrap pl-1 ${navMode === "cool" ? "text-white" : "text-charcoal dark:text-gray-100"}`}>CforC</span>
            {heroCompact && (
              <button
                type="button"
                onClick={() => { setHeroCompact(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                aria-label="Επαναφορά πλήρους προβολής"
                title="Επαναφορά πλήρους προβολής"
                className="p-1 rounded-full text-gray-400 hover:text-coral dark:hover:text-coral-light transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l6-6m0 0v4m0-4h-4M9 15l-6 6m0 0v-4m0 4h4m8-6l6 6m0 0v-4m0 4h-4M9 9L3 3m0 0v4m0-4h4" />
                </svg>
              </button>
            )}
            {DASHBOARD_SECTIONS.map(section => (
              <button
                key={section.key}
                onClick={() => { setActiveSection(section.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                tabIndex={(heroOut || heroCompact || coolMode) ? 0 : -1}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSection === section.key
                    ? 'bg-coral text-white'
                    : navMode === 'cool' ? 'text-white/75 hover:text-white' : 'text-charcoal dark:text-gray-200 hover:bg-coral/15'
                }`}
              >
                {section.label}
                {(() => {
                  const ind = indicatorFor(section.key)
                  if (ind === null) return null
                  if (ind === 'dot') return <span className="inline-block w-1.5 h-1.5 rounded-full bg-coral ml-1 align-middle" />
                  return <span className="notranslate inline-flex items-center justify-center min-w-[1rem] h-4 px-1 ml-1 rounded-full text-[9px] font-bold align-middle bg-coral text-white">{ind}</span>
                })()}
              </button>
            ))}
          </div>
        </div>
          )
        })()}

        {/* Section Content */}
        {activeSection === 'open-calls' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            <OpenCallsContent />
          </div>
        )}

        {activeSection === 'newsletters' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            <NewslettersContent />
          </div>
        )}

        {activeSection === 'library' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            {/* Ο τίτλος, το σήμα δοκιμαστικής λειτουργίας και οι οδηγίες ζουν
                μέσα στο LibraryContent — οι οδηγίες ανοίγουν το δικό του modal. */}
            <LibraryContent />
          </div>
        )}

        {activeSection === 'educational' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            <EducationalMaterialContent />
          </div>
        )}

        {activeSection === 'networks' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            <NetworksContent />
          </div>
        )}

        {activeSection === 'working-groups' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            <WorkingGroupsContent />
          </div>
        )}

        {activeSection === 'pocket-guide' && (
          <div className={coolMode ? 'pt-10 cool-flush' : 'pt-20'}>
            <PocketGuideContent />
          </div>
        )}

        {!IMPLEMENTED_SECTIONS.has(activeSection) && (
          <div className={coolMode ? 'pt-10 pb-24 max-w-4xl mx-auto px-4' : 'pt-32 pb-24 max-w-4xl mx-auto px-4'}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100 mb-3">
                {currentSection.heroTitle}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Σύντομα διαθέσιμο
              </p>
            </div>
          </div>
        )}

        {/* Profile Content */}
        {activeSection === 'profile' && (
        <div className={coolMode ? 'pt-10 pb-24 max-w-6xl mx-auto px-4' : 'pt-32 pb-24 max-w-4xl mx-auto px-4'}>
          {/* Header with Guidelines Button — στο Cool ζει ως chip στη σκηνή */}
          {!coolMode && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
            <div className="text-center md:text-left">
              <p className="text-gray-600 dark:text-gray-300">
                Επεξεργάσου τις πληροφορίες του προφίλ σου
              </p>
            </div>
            <button
              onClick={() => setShowGuidelinesModal(true)}
              className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-charcoal dark:text-gray-200 rounded-full text-sm font-medium transition-colors mx-auto md:mx-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Οδηγίες συμπλήρωσης
            </button>
          </div>
          )}

        {/* Validation Errors - Show at top */}
        {validationErrors.length > 0 && (
          <div ref={errorsRef} role="alert" aria-live="assertive" className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <svg className="w-8 h-8 flex-shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 dark:text-red-200 mb-2 text-lg">
                  Σφάλματα Επικύρωσης
                </h3>
                <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                  Παρακαλώ διόρθωσε τα παρακάτω προβλήματα πριν αποθηκεύσεις:
                </p>
                <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
                <button
                  onClick={() => setValidationErrors([])}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Message - Show at top */}
        {saveMessage && (
          <div
            ref={saveMessageRef}
            role={saveMessage.type === 'success' ? 'status' : 'alert'}
            aria-live={saveMessage.type === 'success' ? 'polite' : 'assertive'}
            className={`rounded-2xl mb-8 ${
              saveMessage.type === 'success'
                ? 'p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveMessage.type === 'success' ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={saveMessage.type === 'success' ? 'text-xs' : 'text-sm'}>{saveMessage.text}</span>
              {saveMessage.type === 'success' && (
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="ml-auto flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white transition-colors"
                >
                  Προεπισκόπηση Προφίλ
                </button>
              )}
            </div>
          </div>
        )}

        {/* Placeholder Data Warning */}
        {(user.Name === 'Νέο Μέλος' || user.FieldsOfWork === 'Προς Συμπλήρωση' || user.City === '-' || user.Province === '-') && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <svg className="w-8 h-8 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-2 text-lg">
                  Το προφίλ σου χρειάζεται συμπλήρωση
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                  Για την καλύτερη εμπειρία στο δίκτυο, παρακαλούμε συμπλήρωσε τα πραγματικά σου στοιχεία.
                  Αυτό το προφίλ δημιουργήθηκε με placeholder δεδομένα για λόγους ασφαλείας.
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  {user.Name === 'Νέο Μέλος' && <li>• Συμπλήρωσε το όνομά σου</li>}
                  {user.FieldsOfWork === 'Προς Συμπλήρωση' && <li>• Πρόσθεσε τα πεδία πρακτικής σου</li>}
                  {(user.City === '-' || user.Province === '-') && <li>• Προσθέσε την πόλη και την περιοχή σου</li>}
                  {!user.Bio && <li>• Γράψε ένα σύντομο βιογραφικό</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Ρ2 (29/8, Cool): αφήγηση αριστερά-φαρδιά (Βασικές/Βιογραφικό
            πρώτα), η κάρτα φωτογραφίας/εναλλακτικού λεπτή δεξιά — μόνο
            διάταξη, πεδία και αποθήκευση ανέγγιχτα */}
        <div className={coolMode ? '' : 'grid md:grid-cols-3 gap-8'}>
          {/* Left Column - Profile Image */}
          {!coolMode && (
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6">
              <div className="group relative mb-4 w-fit">
                <h2 className="text-lg font-bold text-charcoal dark:text-gray-100">
                  Φωτογραφία Προφίλ
                </h2>
                <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block z-10">
                  <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white max-w-xs">
                    Ιδανικές διαστάσεις: 500×600px (5:6). Μέγιστο 5MB. Μορφές: JPG, PNG, GIF, WebP.
                    <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
                  </div>
                </div>
              </div>
              {coolMode ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Η φωτογραφία σου ζει στη σκηνή επάνω — άλλαξέ την από το κουμπί «Αλλαγή φωτογραφίας» εκεί.
                </p>
              ) : (
              <EditableImage
                currentImageUrl={currentImageUrl}
                alt={user.Name}
                onChange={handleImageChange}
              />
              )}
              <div className="mt-4">
                <EditableField
                  label="Εναλλακτικό κείμενο φωτογραφίας"
                  value={formData.ProfileImageAltText}
                  placeholder="π.χ. Γυναίκα με καστανά μαλλιά χαμογελάει"
                  onChange={(value) => handleFieldChange('ProfileImageAltText', value)}
                  helperText="Περιγραφή για άτομα με προβλήματα όρασης (μέγιστο 200 χαρακτήρες)"
                  maxCharacters={200}
                  required
                  tooltip="Περίγραψε τι απεικονίζει η φωτογραφία. Μη γράψεις απλώς το όνομά σου. Μέγιστο 200 χαρακτήρες."
                />
              </div>
            </div>
          </div>
          )}

          {/* Right Column - Profile Fields */}
          <div className={coolMode ? 'space-y-6' : 'md:col-span-2 space-y-6'}>
            {coolMode ? (
              <>
                {/* Ρ2: βιογραφικό φαρδύ αριστερά, συμπυκνωμένες κάψουλες
                    δεξιά που ανοίγουν με κλικ· τα έργα δικές τους σειρές */}
                <div className="grid lg:grid-cols-[1.7fr_1fr] gap-6 items-start">
                  <div className="relative menu-glass glass-rim rounded-3xl p-8 min-w-0">
                    <span className="logo-reveal rounded-3xl overflow-hidden" aria-hidden="true" />
                    <div className="relative">
                      {bioEditor}
                    </div>
                  </div>
                  <div className="space-y-4 min-w-0">
                    <CoolSpot label="Όνομα" summary={formData.Name || formData.EngName}>{nameEditor}</CoolSpot>
                    <CoolSpot label="Email" summary={formData.Email}>{emailEditor}</CoolSpot>
                    <CoolSpot label="Τοποθεσία" summary={[formData.City, formData.Province].filter((v) => v && v !== '-').join(', ')}>{locationEditor}</CoolSpot>
                    <CoolSpot label="Πεδία" summary={formData.FieldsOfWork !== 'Προς Συμπλήρωση' ? formData.FieldsOfWork : ''}>{fieldsEditor}</CoolSpot>
                    <CoolSpot label="Τηλέφωνο" summary={formData.Phone}>{phoneEditor}</CoolSpot>
                    <CoolSpot label="Σύνδεσμοι" summary={formData.Websites}>{websitesEditor}</CoolSpot>
                  </div>
                </div>
                <CoolSpot label="Έργο 1" summary={formData.Project1Title || formData.EngProject1Title}>{project1Editor}</CoolSpot>
                <CoolSpot label="Έργο 2" summary={formData.Project2Title || formData.EngProject2Title}>{project2Editor}</CoolSpot>
              </>
            ) : (
              <>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 space-y-6">
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-4">
                Βασικές Πληροφορίες
              </h2>

              {nameEditor}
              {emailEditor}
              {bioEditor}
              {fieldsEditor}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 space-y-6">
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-4">
                Στοιχεία Επικοινωνίας
              </h2>

              {phoneEditor}
              {locationEditor}
              {websitesEditor}
            </div>

            {/* Projects Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">
                Έργα
              </h2>

              {/* Project 1 */}
              <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              {project1Editor}
              </div>

              {/* Project 2 */}
              <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              {project2Editor}
              </div>
            </div>

              </>
            )}

            {/* Save Button - Only show when there are unsaved changes */}
            {hasUnsavedChanges() && (
              <div className={coolMode
                ? 'sticky bottom-8 z-30 menu-glass rounded-2xl shadow-2xl p-4 border-2 border-coral dark:border-coral-light'
                : 'sticky bottom-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border-2 border-coral dark:border-coral-light'}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-coral dark:bg-coral-light animate-pulse"></div>
                    <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                      Έχεις μη αποθηκευμένες αλλαγές
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDiscard}
                      disabled={isSaving}
                      className="px-6 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Απόρριψη
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-2 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Αποθήκευση...
                        </>
                      ) : (
                        'Αποθήκευση'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        )}
      </main>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUnsavedModal(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative menu-glass rounded-3xl max-w-md w-full p-8">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-center text-charcoal dark:text-gray-100 mb-3">
              Μη Αποθηκευμένες Αλλαγές
            </h3>

            {/* Message */}
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
              Έχεις μη αποθηκευμένες αλλαγές. Τι θέλεις να κάνεις;
            </p>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleSaveAndNavigate}
                className="w-full px-6 py-3 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white rounded-full font-medium transition-colors"
              >
                Αποθήκευση & Αποχώρηση
              </button>
              <button
                onClick={handleDiscard}
                className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Απόρριψη Αλλαγών
              </button>
              <button
                onClick={() => {
                  setShowUnsavedModal(false)
                  setPendingNavigation(null)
                }}
                className="w-full px-6 py-3 text-gray-600 dark:text-gray-300 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Παραμονή στη Σελίδα
              </button>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
      <Footer />

      {/* Profile Guidelines Modal */}
      <ProfileGuidelinesModal
        isOpen={showGuidelinesModal}
        onClose={() => setShowGuidelinesModal(false)}
      />

      {/* Profile Preview Modal */}
      <ProfilePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        user={user}
      />

      {/* Alt-text modal του flow φωτογραφίας (Cool) — υγρό γυαλί */}
      {photoAltModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPhotoAltModal(null)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="photo-alt-title" className="relative menu-glass-dense glass-rim rounded-3xl max-w-md w-full p-7">
            <h3 id="photo-alt-title" className="text-xl font-bold text-charcoal dark:text-gray-100 mb-1">
              {photoAltModal.file ? 'Νέα φωτογραφία' : 'Εναλλακτικό κείμενο'}
            </h3>
            {photoAltModal.file && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 notranslate">{photoAltModal.file.name}</p>
            )}
            <label htmlFor="photo-alt-input" className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">
              Εναλλακτικό κείμενο φωτογραφίας <span className="text-coral">*</span>
            </label>
            <input id="photo-alt-input" value={photoAltDraft} maxLength={200}
              onChange={e => setPhotoAltDraft(e.target.value)}
              placeholder="π.χ. Γυναίκα με καστανά μαλλιά χαμογελάει"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-base text-charcoal dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-coral" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2" style={{ lineHeight: 1.5 }}>
              Περίγραψε τι απεικονίζει η φωτογραφία — για άτομα με προβλήματα όρασης. Μη γράψεις απλώς το όνομά σου. Μέγιστο 200 χαρακτήρες.
            </p>
            <div className="flex gap-3 mt-5">
              <button type="button"
                onClick={() => {
                  if (photoAltModal.file) handleImageChange(photoAltModal.file)
                  handleFieldChange('ProfileImageAltText', photoAltDraft)
                  setPhotoAltModal(null)
                  setPhotoSubmitPending(true)
                }}
                className="px-6 py-2.5 rounded-full bg-coral text-white text-sm font-bold hover:bg-[#F07551] transition-colors disabled:opacity-40"
                disabled={!photoAltDraft.trim()}>
                Υποβολή
              </button>
              <button type="button" onClick={() => setPhotoAltModal(null)}
                className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-charcoal dark:text-gray-200">
                Ακύρωση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPORARY: seat chooser for multi-seat board members entering the OC */}
      {showOcSeatModal && (
        <OcSeatChoiceModal
          seats={ocAccess.seats}
          onChoose={async (seat) => {
            // Persist server-side, then navigate — /oc reads the cookie
            try {
              await fetch('/api/oc/prefs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seat }),
                keepalive: true,
              })
            } catch { /* non-fatal */ }
            setShowOcSeatModal(false)
            router.push('/oc')
          }}
          onDismiss={() => setShowOcSeatModal(false)}
        />
      )}
    </div>
  )
}
