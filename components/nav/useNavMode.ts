'use client'

// Το ενεργό στυλ μενού — λεπτό περιτύλιγμα πάνω από το NavModeProvider του
// root layout. ΟΛΟΙ οι καταναλωτές μοιράζονται το ίδιο state· βλ. το σχόλιο
// του provider για το γιατί (τα ανεξάρτητα διαβάσματα localStorage ανά
// component μπορούσαν να διαφωνούν μεταξύ τους — bug 28/8).

import { useNavModeContext } from './NavModeProvider'

export function useNavMode() {
  return useNavModeContext()
}
