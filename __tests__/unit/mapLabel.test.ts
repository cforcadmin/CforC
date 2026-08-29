import { mapLabel, MAP_LABELS } from '@/components/nav/navItems'

// Το GT μεταφράζει λάθος τη σκέτη λέξη «Χάρτης» (Paper/Papel/Papier) —
// γι' αυτό η ετικέτα έρχεται από δικό μας λεξικό ανά γλώσσα του switcher.
// Εδώ κλειδώνουμε ότι το λεξικό καλύπτει ΟΛΕΣ τις γλώσσες του switcher.
const SWITCHER_CODES = [
  'en', 'de', 'es', 'pt', 'fr', 'it', 'ru', 'zh-CN', 'ja', 'ar',
  'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi', 'cs', 'ro', 'hu',
]

describe('mapLabel', () => {
  it('έχει μετάφραση για κάθε γλώσσα του LanguageSwitcher', () => {
    for (const code of SWITCHER_CODES) {
      expect(MAP_LABELS[code]).toBeTruthy()
      expect(mapLabel(code)).toBe(MAP_LABELS[code])
    }
  })

  it('στα ελληνικά (ή χωρίς γλώσσα) μένει ΧΑΡΤΗΣ', () => {
    expect(mapLabel('el')).toBe('ΧΑΡΤΗΣ')
    expect(mapLabel('')).toBe('ΧΑΡΤΗΣ')
  })

  it('άγνωστη γλώσσα πέφτει στο αγγλικό MAP', () => {
    expect(mapLabel('xx')).toBe('MAP')
  })

  it('δείγμα σωστών μεταφράσεων', () => {
    expect(mapLabel('es')).toBe('MAPA')
    expect(mapLabel('zh-CN')).toBe('地图')
    expect(mapLabel('de')).toBe('KARTE')
  })
})
