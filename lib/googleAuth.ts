import crypto from 'crypto'

/**
 * Google service-account authentication ΧΩΡΙΣ τη βιβλιοθήκη της Google.
 *
 * Υπογράφουμε μόνοι μας το JWT με το ενσωματωμένο `crypto` του Node και το
 * ανταλλάσσουμε με access token. Λόγος: το @google-analytics/data σέρνει
 * μαζί του το google-gax, ~25-30 MB στο node_modules, για κάτι που είναι
 * 60 γραμμές. Ο δίσκος εδώ είναι στενός και το κέρδος μηδενικό.
 *
 * Το κλειδί ζει base64 στο GOOGLE_SERVICE_ACCOUNT_JSON (gitignored ·
 * Vercel env). Πρόσβαση ΜΟΝΟ ανάγνωσης, σε δύο πόρους: το GA4 property
 * και ένα ημερολόγιο.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const SCOPES = {
  analytics: 'https://www.googleapis.com/auth/analytics.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar.readonly',
  /** Ανάγνωση ΚΑΙ εγγραφή γεγονότων — απαιτεί «Make changes to events»
   *  στον διαμοιρασμό του ημερολογίου, όχι μόνο «See all event details». */
  calendarWrite: 'https://www.googleapis.com/auth/calendar.events',
  documents: 'https://www.googleapis.com/auth/documents.readonly',
} as const

interface ServiceAccount {
  client_email: string
  private_key: string
}

let cachedAccount: ServiceAccount | null | undefined

/** null = δεν έχει ρυθμιστεί (η σελίδα υποβαθμίζεται ήρεμα) */
export function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) { cachedAccount = null; return null }
  try {
    // Δεχόμαστε και base64 και σκέτο JSON — για να μη σπάει αν κάποιος
    // επικολλήσει το αρχείο αυτούσιο στο Vercel
    const text = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8')
    const j = JSON.parse(text)
    if (!j.client_email || !j.private_key) throw new Error('missing client_email/private_key')
    cachedAccount = { client_email: j.client_email, private_key: j.private_key }
  } catch (err) {
    console.error('googleAuth: μη έγκυρο GOOGLE_SERVICE_ACCOUNT_JSON:', err)
    cachedAccount = null
  }
  return cachedAccount
}

export function googleConfigured(): boolean {
  return serviceAccount() !== null
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Ένα token ανά scope, μέχρι τη λήξη του (μείον 60'' περιθώριο)
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

/**
 * Ορισμένα scopes απαιτούν να ενεργεί το service account ΩΣ χρήστης του
 * τομέα (domain-wide delegation). Η εγγραφή στο ημερολόγιο είναι τέτοια:
 * το Workspace δεν επιτρέπει σε «εξωτερικό» λογαριασμό δικαιώματα εγγραφής,
 * οπότε υπογράφουμε με sub= τον χρήστη και το Google το δέχεται ως εσωτερικό.
 */
const DELEGATED_SCOPES = new Set<string>([SCOPES.calendarWrite])

export async function getAccessToken(scope: string): Promise<string | null> {
  const hit = tokenCache.get(scope)
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token

  const sa = serviceAccount()
  if (!sa) return null

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const impersonate = DELEGATED_SCOPES.has(scope) ? process.env.GOOGLE_IMPERSONATE_USER : null
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
    ...(impersonate ? { sub: impersonate } : {}),
  }))
  const signingInput = `${header}.${claims}`

  let signature: string
  try {
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(signingInput)
    signer.end()
    signature = base64url(signer.sign(sa.private_key.replace(/\\n/g, '\n')))
  } catch (err) {
    console.error('googleAuth: αποτυχία υπογραφής JWT:', err)
    return null
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${signingInput}.${signature}`,
      }),
      cache: 'no-store',
    })
    const json: any = await res.json().catch(() => null)
    if (!res.ok || !json?.access_token) {
      console.error('googleAuth: token exchange failed', res.status, json?.error_description || json?.error || '')
      return null
    }
    tokenCache.set(scope, {
      token: json.access_token,
      expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000,
    })
    return json.access_token
  } catch (err) {
    console.error('googleAuth: token exchange threw:', err)
    return null
  }
}
