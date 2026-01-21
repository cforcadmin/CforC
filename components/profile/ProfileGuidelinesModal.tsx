'use client'

import { useFocusTrap } from '@/hooks/useFocusTrap'

interface ProfileGuidelinesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileGuidelinesModal({
  isOpen,
  onClose
}: ProfileGuidelinesModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="guidelines-modal-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div ref={modalRef} className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-coral/10 dark:bg-coral-light/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 id="guidelines-modal-title" className="text-xl font-bold text-charcoal dark:text-gray-100">
                  Οδηγίες Συμπλήρωσης Προφίλ
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Συμβουλές για το καλύτερο αποτέλεσμα
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Κλείσιμο"
            >
              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Image */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Φωτογραφία Προφίλ</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Ιδανικές διαστάσεις: <strong>500×600 pixels</strong> (αναλογία 5:6)</li>
                  <li>• Μέγιστο μέγεθος: 5MB</li>
                  <li>• Μορφές: JPG, PNG, GIF, WebP</li>
                  <li>• Tip: Η εικόνα θα περικοπεί σε μορφή πορτραίτου</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Όνομα</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• <strong>Μην χρησιμοποιείτε κεφαλαία</strong> (ALL CAPS)</li>
                  <li>• Χρησιμοποιήστε σημεία στίξης όπου χρειάζεται</li>
                  <li>• Παράδειγμα: "Γιώργος Παπαδόπουλος" αντί για "ΓΙΩΡΓΟΣ ΠΑΠΑΔΟΠΟΥΛΟΣ"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Email</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Το email <strong>δεν μπορεί να αλλάξει</strong></li>
                  <li>• Για αλλαγή email, επικοινωνήστε με τον διαχειριστή IT</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Βιογραφικό</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Όριο: <strong>160 λέξεις</strong> ή <strong>1200 χαρακτήρες</strong></li>
                  <li>• Θα βλέπετε μετρητή λέξεων/χαρακτήρων κατά την επεξεργασία</li>
                  <li>• Γράψτε μια σύντομη περιγραφή της δραστηριότητάς σας</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Τηλέφωνο</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Επιτρεπόμενοι χαρακτήρες: <strong>+, αριθμοί, κενά</strong></li>
                  <li>• <span className="text-red-500">Απαγορεύονται:</span> παύλες (-), παρενθέσεις, κλπ.</li>
                  <li>• Παράδειγμα: "+30 210 1234567"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Fields of Work */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Τομείς Εργασίας</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Μέγιστο όριο: <strong>5 τομείς</strong></li>
                  <li>• Διαχωρίστε με κόμμα (,)</li>
                  <li>• Παράδειγμα: "Τέχνη, Πολιτισμός, Εκπαίδευση"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Websites */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Ιστοσελίδες</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Διαχωρίστε πολλαπλές ιστοσελίδες με κόμμα (,)</li>
                  <li>• Παράδειγμα: "https://example.com, https://portfolio.com"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Project Tags */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Tags Έργων</h3>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Μέγιστο όριο: <strong>5 tags ανά έργο</strong></li>
                  <li>• Διαχωρίστε με κόμμα (,)</li>
                  <li>• Παράδειγμα: "Design, Development, Art"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Accessibility Section Header */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-lg font-bold text-coral dark:text-coral-light">
                Προσβασιμότητα (Accessibility)
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Τα παρακάτω πεδία βοηθούν άτομα με προβλήματα όρασης να κατανοήσουν τις εικόνες σας μέσω αναγνωστών οθόνης (screen readers).
            </p>
          </div>

          {/* Profile Image Alt Text */}
          <div className="bg-coral/5 dark:bg-coral-light/5 rounded-2xl p-4 border border-coral/20 dark:border-coral-light/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-coral/10 dark:bg-coral-light/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Εναλλακτικό κείμενο φωτογραφίας</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Κάτω από τη φωτογραφία προφίλ</p>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Περιγράψτε <strong>τι απεικονίζει</strong> η φωτογραφία σας</li>
                  <li>• Μην γράψετε απλώς το όνομά σας</li>
                  <li>• Μέγιστο: <strong>125 χαρακτήρες</strong></li>
                </ul>
                <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Παραδείγματα:</p>
                  <p className="text-sm text-green-600 dark:text-green-400">✓ "Γυναίκα με καστανά μαλλιά χαμογελάει σε καλλιτεχνικό εργαστήρι"</p>
                  <p className="text-sm text-green-600 dark:text-green-400">✓ "Άνδρας παίζει βιολί σε υπαίθρια εκδήλωση"</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">✗ "Γιάννης Παπαδόπουλος" (αυτό είναι ήδη στο όνομα)</p>
                  <p className="text-sm text-red-500 dark:text-red-400">✗ "Φωτογραφία προφίλ" (δεν περιγράφει τίποτα)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Project Pictures Alt Text */}
          <div className="bg-coral/5 dark:bg-coral-light/5 rounded-2xl p-4 border border-coral/20 dark:border-coral-light/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-coral/10 dark:bg-coral-light/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-coral dark:text-coral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-gray-100">Εναλλακτικό κείμενο φωτο έργου 1 & 2</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Κάτω από τις εικόνες κάθε έργου</p>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Περιγράψτε <strong>τι δείχνουν</strong> οι εικόνες του έργου</li>
                  <li>• Μην επαναλάβετε απλώς τον τίτλο του έργου</li>
                  <li>• Μέγιστο: <strong>125 χαρακτήρες</strong></li>
                  <li>• Η ίδια περιγραφή χρησιμοποιείται για όλες τις εικόνες του έργου</li>
                </ul>
                <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Παραδείγματα:</p>
                  <p className="text-sm text-green-600 dark:text-green-400">✓ "Παιδιά ζωγραφίζουν τοιχογραφία σε δημόσιο χώρο"</p>
                  <p className="text-sm text-green-600 dark:text-green-400">✓ "Θεατρική παράσταση με 10 ηθοποιούς σε σκηνή"</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">✗ "Έργο 1" (δεν περιγράφει τίποτα)</p>
                  <p className="text-sm text-red-500 dark:text-red-400">✗ "Φωτογραφίες" (πολύ γενικό)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white px-6 py-3 rounded-full font-medium transition-colors"
          >
            Κατάλαβα, Συνέχεια
          </button>
        </div>
      </div>
    </div>
  )
}
