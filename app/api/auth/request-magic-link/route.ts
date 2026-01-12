import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { isValidEmail, generateMagicLinkToken, hashToken } from '@/lib/auth'
import { magicLinkLimiter, getRateLimitErrorMessage } from '@/lib/rateLimiter'

const resend = new Resend(process.env.RESEND_API_KEY)
const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email' },
        { status: 400 }
      )
    }

    // Check rate limiting
    const rateLimitResult = magicLinkLimiter.check(email.toLowerCase())
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetTime) },
        { status: 429 }
      )
    }

    // Check if email exists in Members collection
    const membersResponse = await fetch(
      `${STRAPI_URL}/api/members?filters[Email][$eq]=${encodeURIComponent(email)}&populate=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!membersResponse.ok) {
      console.error('Strapi API error:', await membersResponse.text())
      return NextResponse.json(
        { error: 'Σφάλμα σύνδεσης με τη βάση δεδομένων' },
        { status: 500 }
      )
    }

    const membersData = await membersResponse.json()

    // Return generic success message even if email not found (security best practice)
    if (!membersData.data || membersData.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Αν το email υπάρχει στο σύστημα, θα λάβετε έναν σύνδεσμο σύνδεσης'
      })
    }

    const member = membersData.data[0]

    // Generate magic link token
    const token = generateMagicLinkToken(member.documentId || member.id.toString(), email)
    const tokenHash = hashToken(token)

    // Calculate expiry time (6 hours from now)
    const expiryTime = new Date()
    expiryTime.setHours(expiryTime.getHours() + 6)

    // Check if auth token record exists for this email
    const existingTokensResponse = await fetch(
      `${STRAPI_URL}/api/auth-tokens?filters[email][$eq]=${encodeURIComponent(email)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    let tokenResponse

    if (existingTokensResponse.ok) {
      const existingTokens = await existingTokensResponse.json()

      if (existingTokens.data && existingTokens.data.length > 0) {
        // Update existing record (preserves passwordHash)
        const existingToken = existingTokens.data[0]
        tokenResponse = await fetch(
          `${STRAPI_URL}/api/auth-tokens/${existingToken.documentId || existingToken.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${STRAPI_API_TOKEN}`
            },
            body: JSON.stringify({
              data: {
                tokenHash: tokenHash,
                tokenExpiry: expiryTime.toISOString(),
                tokenType: 'magic-link'
              }
            })
          }
        )
      } else {
        // Create new auth token record
        tokenResponse = await fetch(
          `${STRAPI_URL}/api/auth-tokens`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${STRAPI_API_TOKEN}`
            },
            body: JSON.stringify({
              data: {
                email: email,
                tokenHash: tokenHash,
                tokenExpiry: expiryTime.toISOString(),
                tokenType: 'magic-link'
              }
            })
          }
        )
      }
    } else {
      // Create new auth token record
      tokenResponse = await fetch(
        `${STRAPI_URL}/api/auth-tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${STRAPI_API_TOKEN}`
          },
          body: JSON.stringify({
            data: {
              email: email,
              tokenHash: tokenHash,
              tokenExpiry: expiryTime.toISOString(),
              tokenType: 'magic-link'
            }
          })
        }
      )
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Failed to save auth token:', errorText)
      return NextResponse.json(
        { error: 'Σφάλμα κατά την αποθήκευση του συνδέσμου' },
        { status: 500 }
      )
    }

    // Create magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    const magicLinkUrl = `${baseUrl}/auth/set-password?token=${token}`

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'Culture for Change <noreply@cultureforchange.net>',
        to: email,
        subject: 'Σύνδεσμος Σύνδεσης - Culture for Change',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF6B6B;">Καλώς ήρθατε στο Culture for Change</h2>
            <p>Λάβατε αυτό το email επειδή ζητήσατε έναν σύνδεσμο σύνδεσης για τον λογαριασμό σας.</p>
            <p>Κάντε κλικ στον παρακάτω σύνδεσμο για να ορίσετε τον κωδικό σας και να συνδεθείτε:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}"
                 style="background-color: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
                Ορισμός Κωδικού
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Αυτός ο σύνδεσμος θα λήξει σε 6 ώρες και μπορεί να χρησιμοποιηθεί μόνο μία φορά.
            </p>
            <p style="color: #666; font-size: 14px;">
              Αν δεν ζητήσατε αυτόν τον σύνδεσμο, μπορείτε να αγνοήσετε αυτό το email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              © 2025 Culture for Change. Όλα τα δικαιώματα διατηρούνται.
            </p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // Don't fail the request if email fails - user can request a new link
      return NextResponse.json({
        success: true,
        message: 'Σφάλμα κατά την αποστολή email. Παρακαλώ δοκιμάστε ξανά.'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Ελέγξτε το email σας για τον σύνδεσμο σύνδεσης'
    })

  } catch (error) {
    console.error('Error in request-magic-link:', error)
    return NextResponse.json(
      { error: 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.' },
      { status: 500 }
    )
  }
}
