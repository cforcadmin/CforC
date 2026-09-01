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
      {sub && <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">{sub}</span>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 self-start px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-xs font-bold text-charcoal dark:text-gray-200 hover:border-coral hover:text-coral transition-colors"
        >
          {linkLabel || 'Άνοιγμα'} ↗
        </a>
      )}
    </div>
  )
}
