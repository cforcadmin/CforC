import { defineConfig, devices } from '@playwright/test'

/**
 * ΤΟΠΙΚΑ ΤΡΕΧΕΙ ΜΕ ΤΟ ΕΓΚΑΤΕΣΤΗΜΕΝΟ GOOGLE CHROME — ΟΧΙ ΜΕ ΤΟ ΠΑΚΕΤΟ.
 *
 * Το `npx playwright install` κατεβάζει ~520MB στο ~/Library/Caches, και το
 * macOS θεωρεί ΟΛΟ αυτόν τον φάκελο αναλώσιμο: όταν σφίξει ο δίσκος τον
 * αδειάζει χωρίς να ρωτήσει. Συνέβη δύο φορές στις 20–22/10/2026 — τη
 * δεύτερη μέσα σε λίγες ώρες από την εγκατάσταση, με τον δίσκο στο 92%.
 * Κάθε φορά και τα 84 tests «αποτύγχαναν» με `Executable doesn't exist`,
 * δηλαδή μια σουίτα που δεν τρέχει καθόλου αλλά μοιάζει με αποτυχία κώδικα.
 *
 * Ο δίσκος εδώ είναι χρονίως γεμάτος, άρα η επανεγκατάσταση δεν είναι
 * εφάπαξ κόστος — είναι επαναλαμβανόμενο. Το εγκατεστημένο Chrome δεν
 * κατεβαίνει, δεν σβήνεται, και υπάρχει και στα Windows.
 *
 * ΣΤΟ CI μένει το πακέτο: οι εικόνες του CI το έχουν έτοιμο και δεν έχουν
 * το πρόβλημα του δίσκου. (Σήμερα δεν υπάρχει CI — ο κλάδος είναι για όταν
 * προστεθεί, ώστε να μη χρειαστεί να το θυμηθεί κανείς.)
 */
const localBrowser = process.env.CI ? {} : { channel: 'chrome' as const }

export default defineConfig({
  testDir: './__tests__/e2e',
  globalSetup: './__tests__/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  /**
   * ΤΟ ΟΡΙΟ ΑΝΑ TEST — 30s προεπιλογή, που ΕΔΩ είναι ψεύτικη κόκκινη γραμμή.
   *
   * 24/10/2026: διάμεσος 9,4s αλλά max 30,2s — δηλαδή τέσσερα tests έσκαγαν
   * ΠΑΝΩ στο όριο, όχι επειδή κάτι χάλασε. Ο dev server του Next
   * μεταγλωττίζει κάθε διαδρομή στο πρώτο χτύπημα (μετρημένο: /members/[name]
   * σε 5,4s, compile 4,8s) και η σελίδα φορτώνει δεδομένα από ΠΑΡΑΓΩΓΙΚΟ
   * Strapi, που μπορεί να έχει ψυχρή εκκίνηση.
   *
   * Ένα γενναιόδωρο όριο δεν κοστίζει ΤΙΠΟΤΑ όταν όλα πάνε καλά: το test
   * τελειώνει μόλις απαντήσει. Κοστίζει μόνο όταν κάτι όντως κρέμεται —
   * ακριβώς η ώρα που θέλουμε να περιμένουμε. Στο CI μένει σφιχτό.
   */
  timeout: process.env.CI ? 30_000 : 90_000,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...localBrowser },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        // Override browser to Chromium since we only installed chromium
        browserName: 'chromium',
        ...localBrowser,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
