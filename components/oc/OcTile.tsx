'use client'

// Το πλακίδιο «τι έρχεται» — ΜΙΑ υλοποίηση, ώστε Επισκόπηση και Διαχείριση
// να δείχνουν πραγματικά το ίδιο πράγμα και να αλλάζουν μαζί.

export default function OcTile({ value, label, sub, accent, href, linkLabel }: {
  value: string
  label: string
  sub?: string
  accent?: string
  /** Σύνδεσμος δράσης (π.χ. το Meet της συνάντησης) */
  href?: string | null
  linkLabel?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col">
      <span className="text-3xl font-bold notranslate" style={accent ? { color: accent } : undefined}>
        <span className={accent ? '' : 'text-charcoal dark:text-gray-100'}>{value}</span>
      </span>
      <span className="text-base text-gray-700 dark:text-gray-200 mt-1 leading-snug">{label}</span>
      {(sub || href) && (
        // Ο σύνδεσμος δίπλα στο κείμενο, όχι από κάτω — και με το ίδιο ντύσιμο
        // που έχουν τα «Meet» του ημερολογίου, ώστε να μοιάζουν ένα πράγμα
        <span className="mt-1 flex flex-wrap items-center gap-2">
          {sub && <span className="text-sm text-gray-500 dark:text-gray-400 leading-snug">{sub}</span>}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border border-gray-300 dark:border-gray-600 text-charcoal dark:text-gray-200 hover:border-coral transition-colors"
            >
              {linkLabel || 'Άνοιγμα'} ↗
            </a>
          )}
        </span>
      )}
    </div>
  )
}
