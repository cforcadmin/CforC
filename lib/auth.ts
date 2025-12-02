import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET: string = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable is not set')
})()
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '30d'
const MAGIC_LINK_EXPIRES_IN: string = process.env.MAGIC_LINK_EXPIRES_IN || '6h'

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

type TokenPayload = SessionPayload | MagicLinkPayload

export function generateSessionToken(memberId: string, email: string): string {
  const payload: SessionPayload = {
    memberId,
    email,
    type: 'session'
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  })
}

export function generateMagicLinkToken(memberId: string, email: string): string {
  const payload: MagicLinkPayload = {
    memberId,
    email,
    type: 'magic-link'
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: MAGIC_LINK_EXPIRES_IN
  })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
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
