/**
 * Τρέχει ΜΙΑ φορά όταν ξεκινά ο διακομιστής του Next.
 *
 * Το μόνο που κάνει είναι να βάλει τον μετρητή κλήσεων Strapi, και ΜΟΝΟ
 * εκτός παραγωγής: στην παραγωγή δεν τυλίγεται το fetch για κανέναν λόγο.
 */
export async function register(): Promise<void> {
  if (process.env.NODE_ENV === 'production') return
  // ΜΟΝΟ το edge αποκλείεται ρητά: στον διακομιστή Node της ανάπτυξης το
  // NEXT_RUNTIME μπορεί να είναι undefined, και ο έλεγχος «=== nodejs»
  // έβγαζε τη register έξω χωρίς να εγκατασταθεί ποτέ ο μετρητής.
  if (process.env.NEXT_RUNTIME === 'edge') return
  const { install } = await import('@/lib/strapiMeter')
  install()
}
