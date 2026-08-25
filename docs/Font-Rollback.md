# Γραμματοσειρά — αλλαγή σε Roboto Flex & οδηγίες επαναφοράς

*25 Αυγούστου 2026 · εκκρεμεί επικύρωση από την Επικοινωνία*

## Τι άλλαξε

Η γραμματοσειρά όλου του site άλλαξε από **Test Founders Grotesk** σε **Roboto Flex**
(Google Fonts, Open Font License, με πλήρη ελληνικά).

**Γιατί:**
1. Η Founders Grotesk **δεν έχει ελληνικές γλυφές** (0 στο αρχείο) — τα ελληνικά
   έπεφταν σιωπηλά σε Arial, και οι έντονοι ελληνικοί τίτλοι δεν «χόντραιναν»
   όσο οι λατινικοί (αναφορά των βιβλιοθηκάριων, 24/8).
2. Τα αρχεία στο `fonts/` είναι η **δοκιμαστική** έκδοση της Klim
   («Test Founders Grotesk») — η άδειά της δεν καλύπτει παραγωγή.

Δείγματα που οδήγησαν στην επιλογή:
- Δοκιμαστήριο (με ανάλυση): https://claude.ai/code/artifact/838d5eae-97fc-4f28-a9a8-81f7352951e1
- Καθαρά δείγματα για την Επικοινωνία: https://claude.ai/code/artifact/ccbefe76-e1c6-49d4-92b1-bbd332a981ab

## Πώς έγινε (ένα σημείο αλλαγής)

Άλλαξε **μόνο** το font block στο `app/layout.tsx`. Η CSS μεταβλητή κρατήθηκε
επίτηδες με το παλιό όνομα `--font-founders`, ώστε `app/globals.css` και
`tailwind.config.js` να μη χρειάζονται καμία αλλαγή — ούτε τώρα ούτε στην
επαναφορά. Το `next/font` κατεβάζει τη Roboto Flex στο build και τη σερβίρει
το ίδιο το site (κανένα αίτημα του επισκέπτη προς Google — GDPR-καθαρό).

Τα παλιά OTF **έμειναν** στο `fonts/` ακριβώς για την επαναφορά.

## ΕΠΑΝΑΦΟΡΑ (rollback)

Στο `app/layout.tsx`, αντικατέστησε το τωρινό font block με το παλιό:

```tsx
import localFont from 'next/font/local'   // αντί για { Roboto_Flex } from 'next/font/google'

const foundersGrotesk = localFont({
  src: [
    { path: '../fonts/TestFoundersGrotesk-Light.otf', weight: '300', style: 'normal' },
    { path: '../fonts/TestFoundersGrotesk-Regular.otf', weight: '400', style: 'normal' },
    { path: '../fonts/TestFoundersGrotesk-Medium.otf', weight: '500', style: 'normal' },
    { path: '../fonts/TestFoundersGrotesk-Semibold.otf', weight: '600', style: 'normal' },
    { path: '../fonts/TestFoundersGrotesk-Bold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-founders',
  display: 'swap',
})
```

Τίποτα άλλο δεν αλλάζει — το `foundersGrotesk.variable` στο `<html>` και όλα
τα υπόλοιπα μένουν ως έχουν. (Εναλλακτικά: `git revert` του commit της αλλαγής.)

**Υπενθύμιση αν γίνει επαναφορά:** ξαναγυρνούν και τα δύο προβλήματα —
ελληνικά χωρίς σωστό βάρος ΚΑΙ trial άδεια σε παραγωγή. Η επαναφορά έχει
νόημα μόνο ως γέφυρα προς άλλη λύση (π.χ. αγορά retail Founders + συνοδευτική
ελληνική), όχι ως μόνιμη κατάσταση.

## Αν η Επικοινωνία διαλέξει ΑΛΛΗ υποψήφια

Ίδιο μονό σημείο: στο `layout.tsx` αλλάζει το import και το όνομα της
οικογένειας (π.χ. `Fira_Sans`, `IBM_Plex_Sans` — με `weight: ['300','400','500','600','700']`
για τις μη-variable). Οι υποψήφιες με επιβεβαιωμένα πλήρη ελληνικά:
Roboto Flex · IBM Plex Sans · Inter · Fira Sans · Source Sans 3 · Commissioner ·
Open Sans · Manrope · Noto Sans. (Ελέγχθηκαν στο αρχείο — οι Hanken Grotesk,
Instrument Sans, Work Sans, Figtree, Onest, Schibsted, Archivo, Jost, Oswald
ΔΕΝ έχουν ελληνικά.)
