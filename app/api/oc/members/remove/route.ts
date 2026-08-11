import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { resolveOcAccess, type OcSeat } from '@/lib/ocRoles'
import { sendMemberRemovalToSheet, sheetsConfigured } from '@/lib/googleSheets'
import { OC_LAST_SEAT_COOKIE } from '@/components/oc/ocPrefs'

/**
 * Member deletion from the OC Μητρώο μελών table — IT/Γραμματεία acting
 * seat only. ΗΠΙΑ αφαίρεση (same semantics as the Sheet-initiated flow):
 * the member loses the ΑΜ and the profile is hidden; account and data
 * are kept — permanent erasure stays a manual Strapi admin act.
 * The Sheet mirrors the deletion via the web-app «removeMember» action
 * (snapshot → Διαγρ. Μέλη) — best-effort, never blocks the removal.
 */

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function strapi(path: string, method: string = 'GET', data?: any) {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
    cache: 'no-store',
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    // empty body
  }
  return { ok: res.ok, status: res.status, json }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  const decoded = sessionCookie ? verifyToken(sessionCookie.value) : null
  if (!decoded || decoded.type !== 'session') {
    return NextResponse.json({ error: 'Απαιτείται σύνδεση' }, { status: 401 })
  }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) {
    return NextResponse.json({ error: 'Δεν επιτρέπεται' }, { status: 403 })
  }
  // Μόνο ο ΕΝΕΡΓΟΣ ρόλος IT/Γραμματεία μπορεί να διαγράψει (ίδια λογική με
  // το override της ψηφοφορίας)
  const seatCookie = cookieStore.get(OC_LAST_SEAT_COOKIE)?.value as OcSeat | undefined
  const activeSeat: OcSeat | null =
    seatCookie && access.seats.includes(seatCookie) ? seatCookie
      : access.seats.length === 1 ? access.seats[0] : null
  if (activeSeat !== 'it' && activeSeat !== 'admin') {
    return NextResponse.json({ error: 'Μόνο IT/Γραμματεία μπορούν να διαγράψουν μέλος' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }
  const memberId = String(body?.memberId || '').replace(/[^a-z0-9]/gi, '')
  if (!memberId) {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα' }, { status: 400 })
  }

  try {
    const found = await strapi(`/members/${memberId}?fields[0]=Email&fields[1]=AM&fields[2]=AdminNotes&fields[3]=Name`)
    const member = found.json?.data
    if (!member) {
      return NextResponse.json({ error: 'Το μέλος δεν βρέθηκε' }, { status: 404 })
    }
    if (member.AM == null) {
      return NextResponse.json({ error: 'Το μέλος δεν είναι στο ενεργό μητρώο' }, { status: 409 })
    }
    const formerAM: number = member.AM

    const today = new Date().toLocaleDateString('el-GR')
    const note = `Διαγραφή από OC ${today} (πρώην ΑΜ ${formerAM})`
    // ΠΡΟΣΟΧΗ: το custom member controller δέχεται ΜΟΝΟ αριθμητικό id
    const r = await strapi(`/members/${member.id}`, 'PUT', {
      AM: null,
      HideProfile: true,
      AdminNotes: member.AdminNotes ? `${member.AdminNotes} | ${note}` : note,
    })
    if (!r.ok) {
      return NextResponse.json({ error: 'Αποτυχία διαγραφής στο Strapi' }, { status: 502 })
    }

    // Sheet mirror — best-effort
    let sheetSynced: boolean | null = null
    if (sheetsConfigured()) {
      try {
        await sendMemberRemovalToSheet(formerAM)
        sheetSynced = true
      } catch (err) {
        console.error('oc member remove: sheet failed:', err)
        sheetSynced = false
      }
    } else {
      sheetSynced = false
    }

    return NextResponse.json({ ok: true, removed: member.Name, formerAM, sheetSynced })
  } catch (error) {
    console.error('oc member remove error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
