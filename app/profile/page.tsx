'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import EditableField from '@/components/profile/EditableField'
import EditableImage from '@/components/profile/EditableImage'
import EditableMultipleImages from '@/components/profile/EditableMultipleImages'
import ConfirmationModal from '@/components/ConfirmationModal'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, refreshSession } = useAuth()

  const [formData, setFormData] = useState({
    Name: '',
    Email: '',
    Bio: '',
    FieldsOfWork: '',
    City: '',
    Province: '',
    Phone: '',
    Websites: '',
    Project1Title: '',
    Project1Tags: '',
    Project1Description: '',
    Project2Title: '',
    Project2Tags: '',
    Project2Description: ''
  })

  const [originalData, setOriginalData] = useState(formData)
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

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      const data = {
        Name: user.Name || '',
        Email: user.Email || '',
        Bio: user.Bio || '',
        FieldsOfWork: user.FieldsOfWork || '',
        City: user.City || '',
        Province: user.Province || '',
        Phone: user.Phone || '',
        Websites: user.Websites || '',
        Project1Title: user.Project1Title || '',
        Project1Tags: user.Project1Tags || '',
        Project1Description: user.Project1Description || '',
        Project2Title: user.Project2Title || '',
        Project2Tags: user.Project2Tags || '',
        Project2Description: user.Project2Description || ''
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
  const handleFieldChange = (field: string, value: string) => {
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
    // Allow only numbers, spaces, dashes, and plus sign
    const phoneRegex = /^[\d\s\-+]+$/
    return phoneRegex.test(phone)
  }

  // Save changes
  const handleSave = async () => {
    if (!hasUnsavedChanges()) return

    // Validate email format
    if (formData.Email && !validateEmail(formData.Email)) {
      setSaveMessage({ type: 'error', text: 'Μη έγκυρη μορφή email' })
      return
    }

    // Validate phone format
    if (formData.Phone && formData.Phone.trim() !== '' && formData.Phone !== '-' && !validatePhone(formData.Phone)) {
      setSaveMessage({ type: 'error', text: 'Το τηλέφωνο μπορεί να περιέχει μόνο αριθμούς και το σύμβολο +' })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

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
        Object.entries(dataToUpdate).forEach(([key, value]) => {
          formDataWithImages.append(key, value)
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
        // Use JSON if no images
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
      setSaveMessage({ type: 'error', text: 'Σφάλμα δικτύου. Παρακαλώ δοκιμάστε ξανά.' })
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
    <main className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-charcoal dark:text-gray-100 mb-2">
            Το Προφίλ Μου
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Επεξεργαστείτε τις πληροφορίες του προφίλ σας
          </p>
        </div>

        {/* Placeholder Data Warning */}
        {(user.Name === 'Νέο Μέλος' || user.FieldsOfWork === 'Προς Συμπλήρωση' || user.City === '-' || user.Province === '-') && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">⚠️</span>
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
                  {user.FieldsOfWork === 'Προς Συμπλήρωση' && <li>• Πρόσθεσε τα πεδία εργασίας σου</li>}
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
              <h2 className="text-lg font-bold text-charcoal dark:text-gray-100 mb-4">
                Φωτογραφία Προφίλ
              </h2>
              <EditableImage
                currentImageUrl={currentImageUrl}
                alt={user.Name}
                onChange={handleImageChange}
              />
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
              />

              <EditableField
                label="Email"
                value={formData.Email}
                placeholder="email@example.com"
                type="email"
                onChange={(value) => handleFieldChange('Email', value)}
                required
                disabled
                helperText="Επικοινωνήστε με τον διαχειριστή για να αλλάξετε το email σας"
              />

              <EditableField
                label="Βιογραφικό"
                value={formData.Bio}
                placeholder="Γράψτε μια σύντομη περιγραφή για εσάς..."
                type="textarea"
                onChange={(value) => handleFieldChange('Bio', value)}
              />

              <EditableField
                label="Τομείς Εργασίας"
                value={formData.FieldsOfWork}
                placeholder="π.χ. Τέχνη, Πολιτισμός, Κοινωνική Καινοτομία"
                onChange={(value) => handleFieldChange('FieldsOfWork', value)}
                helperText="Διαχωρίστε με κόμμα (,)"
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
              />

              <EditableField
                label="Πόλη"
                value={formData.City}
                placeholder="Αθήνα"
                onChange={(value) => handleFieldChange('City', value)}
              />

              <EditableField
                label="Περιφέρεια"
                value={formData.Province}
                placeholder="Αττική"
                onChange={(value) => handleFieldChange('Province', value)}
              />

              <EditableField
                label="Ιστοσελίδες"
                value={formData.Websites}
                placeholder="https://example.com"
                type="url"
                onChange={(value) => handleFieldChange('Websites', value)}
                helperText="Διαχωρίστε με κόμμα (,)"
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
                  helperText="Διαχωρίστε με κόμμα (,)"
                />

                <EditableField
                  label="Περιγραφή"
                  value={formData.Project1Description}
                  placeholder="Περιγράψτε το έργο σας..."
                  type="textarea"
                  onChange={(value) => handleFieldChange('Project1Description', value)}
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
                  helperText="Διαχωρίστε με κόμμα (,)"
                />

                <EditableField
                  label="Περιγραφή"
                  value={formData.Project2Description}
                  placeholder="Περιγράψτε το έργο σας..."
                  type="textarea"
                  onChange={(value) => handleFieldChange('Project2Description', value)}
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
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`p-4 rounded-2xl text-sm ${
                  saveMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Save Button - Only show when there are unsaved changes */}
            {hasUnsavedChanges() && (
              <div className="sticky bottom-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border-2 border-coral dark:border-coral-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-coral dark:bg-coral-light animate-pulse"></div>
                    <span className="text-sm font-medium text-charcoal dark:text-gray-200">
                      Έχετε μη αποθηκευμένες αλλαγές
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

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUnsavedModal(false)}
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
              Έχετε μη αποθηκευμένες αλλαγές. Τι θέλετε να κάνετε;
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

      <Footer />
    </main>
  )
}
