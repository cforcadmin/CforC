'use client'

import { useState, useEffect, useRef } from 'react'
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
import EducationalMaterialContent from '@/components/EducationalMaterialContent'
import NetworksContent from '@/components/NetworksContent'
import WorkingGroupsContent from '@/components/WorkingGroupsContent'
import PocketGuideContent from '@/components/PocketGuideContent'
import ScrollToTop from '@/components/ScrollToTop'
import { blocksToPlainText } from '@/lib/richTextConvert'
import { AccessibilityButton } from '@/components/AccessibilityMenu'

const DASHBOARD_SECTIONS = [
  { key: 'profile', label: 'Προφίλ', heroTitle: 'ΤΟ ΠΡΟΦΙΛ ΜΟΥ' },
  { key: 'open-calls', label: 'Ανοιχτές Προσκλήσεις', heroTitle: 'ΑΝΟΙΧΤΕΣ ΠΡΟΣΚΛΗΣΕΙΣ' },
  { key: 'educational', label: 'Εκπαιδευτικό Υλικό', heroTitle: 'ΕΚΠΑΙΔΕΥΤΙΚΟ ΥΛΙΚΟ' },
  { key: 'networks', label: 'Δίκτυα / Κοινότητες', heroTitle: 'ΔΙΚΤΥΑ / ΚΟΙΝΟΤΗΤΕΣ' },
  { key: 'working-groups', label: 'Ομάδες Εργασίας', heroTitle: 'ΟΜΑΔΕΣ ΕΡΓΑΣΙΑΣ' },
  { key: 'pocket-guide', label: 'Οδηγός Τσέπης', heroTitle: 'ΟΔΗΓΟΣ ΤΣΕΠΗΣ' },
  { key: 'newsletters', label: 'Newsletters', heroTitle: 'NEWSLETTERS' },
] as const

type SectionKey = (typeof DASHBOARD_SECTIONS)[number]['key']

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, refreshSession } = useAuth()
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)
  const [activeSection, setActiveSection] = useState<SectionKey>('profile')

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
    Project2PicturesAltText: ''
  })

  const [originalData, setOriginalData] = useState<Record<string, any>>(formData)
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
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false)
  const hasShownGuidelinesRef = useRef(false)

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Show guidelines modal on login (only once per session, not after profile updates)
  useEffect(() => {
    if (isAuthenticated && user && !hasShownGuidelinesRef.current) {
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
        Project2PicturesAltText: user.Project2PicturesAltText || ''
      }
      setFormData(data)
      setOriginalData(data)

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

    // If there are validation errors, show them
    if (errors.length > 0) {
      setValidationErrors(errors)
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
        const blocksFields = ['Bio', 'Project1Description', 'Project2Description']
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
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Σφάλμα δικτύου. Παρακαλώ δοκίμασε ξανά.' })
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

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Dashboard Hero Section */}
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 min-h-[25vh] flex items-center rounded-b-3xl relative z-10 py-8">
            {/* Content area: same inset as accessibility button on both sides, minus space for the button itself on the right */}
            <div className="w-full px-6 lg:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 pr-16 lg:pr-16">
                {/* Left: Active section title (fixed half, shrinks to fit) */}
                <div className="flex items-center min-w-0">
                  <h1 className="text-[clamp(1.25rem,3.5vw,3.75rem)] font-bold leading-none whitespace-nowrap dark:text-coral">
                    {currentSection.heroTitle}
                  </h1>
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
                </div>
              </div>
            </div>

            {/* Accessibility Menu Trigger Button */}
            <div
              className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
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

        {/* Section Content */}
        {activeSection === 'open-calls' && (
          <div className="pt-20">
            <OpenCallsContent />
          </div>
        )}

        {activeSection === 'newsletters' && (
          <div className="pt-20">
            <NewslettersContent />
          </div>
        )}

        {activeSection === 'educational' && (
          <div className="pt-20">
            <EducationalMaterialContent />
          </div>
        )}

        {activeSection === 'networks' && (
          <div className="pt-20">
            <NetworksContent />
          </div>
        )}

        {activeSection === 'working-groups' && (
          <div className="pt-20">
            <WorkingGroupsContent />
          </div>
        )}

        {activeSection === 'pocket-guide' && (
          <div className="pt-20">
            <PocketGuideContent />
          </div>
        )}

        {activeSection !== 'profile' && activeSection !== 'open-calls' && activeSection !== 'newsletters' && activeSection !== 'educational' && activeSection !== 'networks' && activeSection !== 'working-groups' && activeSection !== 'pocket-guide' && (
          <div className="pt-32 pb-24 max-w-4xl mx-auto px-4">
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
        <div className="pt-32 pb-24 max-w-4xl mx-auto px-4">
          {/* Header with Guidelines Button */}
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

        {/* Validation Errors - Show at top */}
        {validationErrors.length > 0 && (
          <div role="alert" aria-live="assertive" className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-2xl p-6 mb-8">
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
            role={saveMessage.type === 'success' ? 'status' : 'alert'}
            aria-live={saveMessage.type === 'success' ? 'polite' : 'assertive'}
            className={`p-4 rounded-2xl text-sm mb-8 ${
              saveMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {saveMessage.type === 'success' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{saveMessage.text}</span>
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

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Profile Image */}
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
              <EditableImage
                currentImageUrl={currentImageUrl}
                alt={user.Name}
                onChange={handleImageChange}
              />
              <div className="mt-4">
                <EditableField
                  label="Εναλλακτικό κείμενο φωτογραφίας"
                  value={formData.ProfileImageAltText}
                  placeholder="π.χ. Γυναίκα με καστανά μαλλιά χαμογελάει"
                  onChange={(value) => handleFieldChange('ProfileImageAltText', value)}
                  helperText="Περιγραφή για άτομα με προβλήματα όρασης (μέγιστο 125 χαρακτήρες)"
                  maxCharacters={125}
                  required
                  tooltip="Περίγραψε τι απεικονίζει η φωτογραφία. Μη γράψεις απλώς το όνομά σου. Μέγιστο 125 χαρακτήρες."
                />
              </div>
            </div>
          </div>

          {/* Right Column - Profile Fields */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 space-y-6">
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-4">
                Βασικές Πληροφορίες
              </h2>

              <EditableField
                label="Όνομα"
                value={formData.Name}
                placeholder="Το όνομά σας"
                onChange={(value) => handleFieldChange('Name', value)}
                required
                tooltip="Μη χρησιμοποιείς κεφαλαία (ALL CAPS). Χρησιμοποίησε σημεία στίξης όπου χρειάζεται."
              />

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

              <RichTextEditor
                label="Βιογραφικό"
                content={formData.Bio}
                placeholder="Γράψε μια σύντομη περιγραφή για εσένα..."
                onChange={(blocks) => handleFieldChange('Bio', blocks)}
                maxWords={160}
                maxCharacters={1200}
                required
                tooltip="Όριο: 160 λέξεις ή 1200 χαρακτήρες. Υποστηρίζεται μορφοποίηση: έντονα, πλάγια, λίστες, σύνδεσμοι κ.ά."
              />

              <FieldsOfWorkSelector
                value={formData.FieldsOfWork}
                onChange={(value) => handleFieldChange('FieldsOfWork', value)}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 space-y-6">
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-4">
                Στοιχεία Επικοινωνίας
              </h2>

              <EditableField
                label="Τηλέφωνο"
                value={formData.Phone}
                placeholder="+30 123 456 7890"
                type="tel"
                onChange={(value) => handleFieldChange('Phone', value)}
                tooltip="Μόνο αριθμοί, κενά και +. Απαγορεύονται παύλες, παρενθέσεις κλπ."
              />

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

              <EditableField
                label="Ιστοσελίδες και Κοινωνικά Δίκτυα"
                value={formData.Websites}
                placeholder="https://example.com"
                type="url"
                onChange={(value) => handleFieldChange('Websites', value)}
                helperText="Διαχώρισε με κόμμα (,)"
                tooltip="Χώρισε πολλαπλές ιστοσελίδες και κοινωνικά δίκτυα με κόμμα."
              />
            </div>

            {/* Projects Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">
                Έργα
              </h2>

              {/* Project 1 */}
              <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <h3 className="text-lg font-semibold text-charcoal dark:text-gray-100">
                  Έργο 1
                </h3>

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
                  label="Περιγραφή"
                  content={formData.Project1Description}
                  placeholder="Περίγραψε το έργο σου..."
                  onChange={(blocks) => handleFieldChange('Project1Description', blocks)}
                  tooltip="Υποστηρίζεται μορφοποίηση. Ενσωμάτωση εικόνας: [IMAGE: url | alt text]"
                />

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
                  helperText="Υποχρεωτικό όταν υπάρχουν εικόνες - Περιγραφή για προσβασιμότητα (μέγιστο 125 χαρακτήρες)"
                  maxCharacters={125}
                  required={(project1KeptImageIds.length > 0) || (project1Images.length > 0)}
                  tooltip="Περίγραψε τι δείχνουν οι εικόνες του έργου. Μην επαναλάβεις τον τίτλο. Μέγιστο 125 χαρακτήρες."
                />
              </div>

              {/* Project 2 */}
              <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <h3 className="text-lg font-semibold text-charcoal dark:text-gray-100">
                  Έργο 2
                </h3>

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
                  label="Περιγραφή"
                  content={formData.Project2Description}
                  placeholder="Περίγραψε το έργο σου..."
                  onChange={(blocks) => handleFieldChange('Project2Description', blocks)}
                  tooltip="Υποστηρίζεται μορφοποίηση. Ενσωμάτωση εικόνας: [IMAGE: url | alt text]"
                />

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
                  helperText="Υποχρεωτικό όταν υπάρχουν εικόνες - Περιγραφή για προσβασιμότητα (μέγιστο 125 χαρακτήρες)"
                  maxCharacters={125}
                  required={(project2KeptImageIds.length > 0) || (project2Images.length > 0)}
                  tooltip="Περίγραψε τι δείχνουν οι εικόνες του έργου. Μην επαναλάβεις τον τίτλο. Μέγιστο 125 χαρακτήρες."
                />
              </div>
            </div>

            {/* Save Button - Only show when there are unsaved changes */}
            {hasUnsavedChanges() && (
              <div className="sticky bottom-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border-2 border-coral dark:border-coral-light">
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
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8">
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
    </div>
  )
}
