import HomeVariantSwitch from '@/components/home-cool/HomeVariantSwitch'

// Η αρχική διαφέρει ανά στυλ μενού (Cool = σκηνή Α1, Classic/Modern = η
// υπάρχουσα) — η διακλάδωση ζει στο client switch.
export default function Home() {
  return <HomeVariantSwitch />
}
