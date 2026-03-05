import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkCsrf } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrf(request)
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })
    // Clear session cookie
    const cookieStore = await cookies()
    cookieStore.delete('session')

    return NextResponse.json({
      success: true,
      message: 'Επιτυχής αποσύνδεση'
    })

  } catch (error) {
    console.error('Error in logout:', error)
    return NextResponse.json(
      { error: 'Κάτι πήγε στραβά' },
      { status: 500 }
    )
  }
}
