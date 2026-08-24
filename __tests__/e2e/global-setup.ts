import { request, type FullConfig } from '@playwright/test'

/**
 * ΜΙΑ σύνδεση για όλη τη σουίτα.
 *
 * Ο limiter επιτρέπει 5 προσπάθειες / 15 λεπτά. Η παλιά σουίτα έκανε 6-8
 * πραγματικά login ανά εκτέλεση (3 tests × 2 projects + λάθος κωδικοί) —
 * αυτο-μπλοκαριζόταν και τα «αποτυχημένα» tests έδειχναν πρόβλημα που δεν
 * υπήρχε. Εδώ συνδεόμαστε άπαξ και το cookie μοιράζεται μέσω storageState.
 */
export const STORAGE_STATE = 'playwright/.auth/member.json'
export const TEST_EMAIL = 'e2e-test@cultureforchange.net'
export const TEST_PASSWORD = 'TestPass1!'

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
  const ctx = await request.newContext({ baseURL })
  const res = await ctx.post('/api/auth/login', {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  })
  if (!res.ok()) {
    const body = await res.text()
    throw new Error(
      `Το login της σουίτας απέτυχε (${res.status()}): ${body.slice(0, 200)}\n` +
      (res.status() === 429
        ? 'Ο rate limiter είναι ενεργός — περίμενε το παράθυρο των 15 λεπτών ή κάνε restart τον dev server (in-memory limiter).'
        : 'Έλεγξε ότι ο λογαριασμός e2e υπάρχει και ο κωδικός ισχύει.'),
    )
  }
  await ctx.storageState({ path: STORAGE_STATE })
  await ctx.dispose()
}
