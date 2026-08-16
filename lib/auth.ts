import bcrypt from 'bcrypt'
import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'

// Using seconds instead of string notation (30 days = 2592000 seconds, 6 hours = 21600 seconds, 24 hours = 86400 seconds)
const JWT_EXPIRES_IN = 2592000 // 30 days
const MAGIC_LINK_EXPIRES_IN = 21600 // 6 hours
const NEWSLETTER_TOKEN_EXPIRES_IN = 86400 // 24 hours
const PAYMENT_CLAIM_EXPIRES_IN = 5184000 // 60 days — link inside approval/reminder emails
const EXIT_SURVEY_EXPIRES_IN = 7776000 // 90 days — link inside the departure email

function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return secret as Secret
}

// Password Hashing
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT Token Management

interface SessionPayload {
  memberId: string
  email: string
  type: 'session'
}

interface MagicLinkPayload {
  memberId: string
  email: string
  type: 'magic-link'
}

interface NewsletterPayload {
  email: string
  firstName?: string
  lastName?: string
  type: 'newsletter'
}

interface PaymentClaimPayload {
  applicationId: string
  type: 'payment-claim'
}

interface ExitSurveyPayload {
  memberId: string
  name: string
  type: 'exit-survey'
}

interface RenewalClaimPayload {
  memberId: string
  type: 'renewal-claim'
}

type TokenPayload = SessionPayload | MagicLinkPayload | NewsletterPayload | PaymentClaimPayload | ExitSurveyPayload | RenewalClaimPayload

export function generateSessionToken(memberId: string, email: string): string {
  const payload: SessionPayload = {
    memberId,
    email,
    type: 'session'
  }

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN
  }

  return jwt.sign(payload, getJwtSecret(), options)
}

export function generateMagicLinkToken(memberId: string, email: string): string {
  const payload: MagicLinkPayload = {
    memberId,
    email,
    type: 'magic-link'
  }

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: MAGIC_LINK_EXPIRES_IN
  }

  return jwt.sign(payload, getJwtSecret(), options)
}

export function generateNewsletterToken(email: string, firstName?: string, lastName?: string): string {
  const payload: NewsletterPayload = {
    email,
    type: 'newsletter',
    ...(firstName && { firstName }),
    ...(lastName && { lastName }),
  }

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: NEWSLETTER_TOKEN_EXPIRES_IN
  }

  return jwt.sign(payload, getJwtSecret(), options)
}

/** Signed single-purpose link: «δήλωσα ότι πλήρωσα» — carries only the application id */
export function generatePaymentClaimToken(applicationId: string): string {
  const payload: PaymentClaimPayload = { applicationId, type: 'payment-claim' }
  const options: SignOptions = { algorithm: 'HS256', expiresIn: PAYMENT_CLAIM_EXPIRES_IN }
  return jwt.sign(payload, getJwtSecret(), options)
}

/** Signed single-purpose link: «πλήρωσα τη συνδρομή μου» (ανανέωση μέλους) */
export function generateRenewalClaimToken(memberId: string): string {
  const payload: RenewalClaimPayload = { memberId, type: 'renewal-claim' }
  const options: SignOptions = { algorithm: 'HS256', expiresIn: PAYMENT_CLAIM_EXPIRES_IN }
  return jwt.sign(payload, getJwtSecret(), options)
}

/** Signed single-purpose link: φόρμα αποχώρησης — φέρει το μέλος για προαιρετική επωνυμία */
export function generateExitSurveyToken(memberId: string, name: string): string {
  const payload: ExitSurveyPayload = { memberId, name, type: 'exit-survey' }
  const options: SignOptions = { algorithm: 'HS256', expiresIn: EXIT_SURVEY_EXPIRES_IN }
  return jwt.sign(payload, getJwtSecret(), options)
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

// Magic Link Token Hashing (for storage in database)
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

// Password Validation
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον ένα μικρό γράμμα')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Ο κωδικός πρέπει να περιέχει τουλάχιστον έναν αριθμό')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Email Validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
