import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateMagicLinkToken,
  generateNewsletterToken,
  verifyToken,
  hashToken,
  validatePassword,
  isValidEmail,
} from '@/lib/auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

describe('lib/auth', () => {
  // --- Password Hashing ---
  describe('hashPassword + verifyPassword', () => {
    it('correct password passes', async () => {
      const hash = await hashPassword('MySecret123')
      expect(await verifyPassword('MySecret123', hash)).toBe(true)
    })

    it('wrong password fails', async () => {
      const hash = await hashPassword('MySecret123')
      expect(await verifyPassword('WrongPass1', hash)).toBe(false)
    })

    it('different salts produce different hashes', async () => {
      const hash1 = await hashPassword('Same1234')
      const hash2 = await hashPassword('Same1234')
      expect(hash1).not.toBe(hash2) // bcrypt uses random salts
    })
  })

  // --- Session Token ---
  describe('generateSessionToken', () => {
    it('returns a JWT string', () => {
      const token = generateSessionToken('member-1', 'test@example.com')
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('has correct payload', () => {
      const token = generateSessionToken('member-1', 'test@example.com')
      const decoded = jwt.verify(token, JWT_SECRET) as any
      expect(decoded.memberId).toBe('member-1')
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.type).toBe('session')
    })

    it('expires in ~30 days', () => {
      const token = generateSessionToken('member-1', 'test@example.com')
      const decoded = jwt.verify(token, JWT_SECRET) as any
      const ttl = decoded.exp - decoded.iat
      expect(ttl).toBe(2592000) // 30 days in seconds
    })
  })

  // --- Magic Link Token ---
  describe('generateMagicLinkToken', () => {
    it('has correct type', () => {
      const token = generateMagicLinkToken('member-1', 'test@example.com')
      const decoded = jwt.verify(token, JWT_SECRET) as any
      expect(decoded.type).toBe('magic-link')
    })

    it('expires in ~6 hours', () => {
      const token = generateMagicLinkToken('member-1', 'test@example.com')
      const decoded = jwt.verify(token, JWT_SECRET) as any
      const ttl = decoded.exp - decoded.iat
      expect(ttl).toBe(21600) // 6 hours in seconds
    })
  })

  // --- Newsletter Token ---
  describe('generateNewsletterToken', () => {
    it('has correct type and email', () => {
      const token = generateNewsletterToken('news@example.com')
      const decoded = jwt.verify(token, JWT_SECRET) as any
      expect(decoded.type).toBe('newsletter')
      expect(decoded.email).toBe('news@example.com')
    })

    it('expires in ~24 hours', () => {
      const token = generateNewsletterToken('news@example.com')
      const decoded = jwt.verify(token, JWT_SECRET) as any
      const ttl = decoded.exp - decoded.iat
      expect(ttl).toBe(86400) // 24 hours
    })
  })

  // --- verifyToken ---
  describe('verifyToken', () => {
    it('returns payload for valid token', () => {
      const token = generateSessionToken('m1', 'a@b.com')
      const payload = verifyToken(token)
      expect(payload).not.toBeNull()
      expect(payload!.type).toBe('session')
    })

    it('returns null for expired token', () => {
      const token = jwt.sign({ type: 'session' }, JWT_SECRET, { expiresIn: -10 })
      expect(verifyToken(token)).toBeNull()
    })

    it('returns null for wrong secret', () => {
      const token = jwt.sign({ type: 'session' }, 'wrong-secret', { expiresIn: 3600 })
      expect(verifyToken(token)).toBeNull()
    })

    it('returns null for malformed string', () => {
      expect(verifyToken('not-a-jwt')).toBeNull()
    })
  })

  // --- hashToken ---
  describe('hashToken', () => {
    it('is deterministic SHA256', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'))
    })

    it('different inputs produce different hashes', () => {
      expect(hashToken('abc')).not.toBe(hashToken('xyz'))
    })

    it('returns a 64-char hex string', () => {
      const h = hashToken('test')
      expect(h).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  // --- validatePassword ---
  describe('validatePassword', () => {
    it('passes with "Passw0rd"', () => {
      const result = validatePassword('Passw0rd')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails for too short', () => {
      const result = validatePassword('Ab1')
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('fails for no uppercase', () => {
      const result = validatePassword('password1')
      expect(result.isValid).toBe(false)
    })

    it('fails for no lowercase', () => {
      const result = validatePassword('PASSWORD1')
      expect(result.isValid).toBe(false)
    })

    it('fails for no number', () => {
      const result = validatePassword('Passwordd')
      expect(result.isValid).toBe(false)
    })

    it('reports multiple violations', () => {
      const result = validatePassword('ab')
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  // --- isValidEmail ---
  describe('isValidEmail', () => {
    it.each([
      'user@example.com',
      'first.last@domain.co',
      'user+tag@example.org',
    ])('accepts valid email: %s', (email) => {
      expect(isValidEmail(email)).toBe(true)
    })

    it.each([
      '',
      'no-at-sign',
      '@no-user.com',
      'user@',
      'user @space.com',
    ])('rejects invalid email: "%s"', (email) => {
      expect(isValidEmail(email)).toBe(false)
    })
  })
})
