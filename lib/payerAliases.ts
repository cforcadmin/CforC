/**
 * Learned αντιστοιχίσεις πληρωτή → μέλους (payer-alias collection).
 *
 * Όταν ο/η Financer διορθώνει ή επιβεβαιώνει ένα ταίριασμα στον έλεγχο
 * κινήσεων, η αντιστοίχιση αποθηκεύεται με κλειδί τον κανονικοποιημένο
 * σκελετό του ονόματος πληρωτή (payerAliasKey) — έτσι «ANAMESA STOUS
 * MERMIGKES ΑΜΚΕ» βρίσκει το σωστό μέλος από τον δεύτερο μήνα και μετά,
 * ανεξάρτητα από σειρά λέξεων ή homoglyphs.
 */

import { payerAliasKey } from '@/lib/memberMatcher'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export interface PayerAlias {
  documentId: string
  aliasKey: string
  payerName: string
  memberDocId: string | null
  memberName: string | null
  confirmations: number
}

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
  try { json = await res.json() } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json }
}

function fromEntry(e: any): PayerAlias {
  return {
    documentId: e.documentId,
    aliasKey: e.AliasKey,
    payerName: e.PayerName,
    memberDocId: e.member?.documentId || null,
    memberName: e.MemberName || null,
    confirmations: e.Confirmations ?? 1,
  }
}

/** Μαζική ανάκτηση aliases για μια λίστα ονομάτων πληρωτών (ένα query) */
export async function getAliasesFor(payerNames: string[]): Promise<Map<string, PayerAlias>> {
  const keys = Array.from(new Set(payerNames.filter(Boolean).map(payerAliasKey)))
  const out = new Map<string, PayerAlias>()
  if (keys.length === 0) return out
  const filters = keys.map((k, i) => `filters[AliasKey][$in][${i}]=${encodeURIComponent(k)}`).join('&')
  const r = await strapi(`/payer-aliases?${filters}&pagination[limit]=${keys.length}&populate[member][fields][0]=Name`)
  if (!r.ok) return out
  for (const e of r.json?.data || []) out.set(e.AliasKey, fromEntry(e))
  return out
}

/** Καταχώρηση/ενίσχυση alias μετά από επιβεβαίωση του Financer */
export async function upsertAlias(payerName: string, memberDocId: string | null, memberName: string | null): Promise<void> {
  const key = payerAliasKey(payerName)
  if (!key) return
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(new Date())
  const existing = await strapi(`/payer-aliases?filters[AliasKey][$eq]=${encodeURIComponent(key)}&pagination[limit]=1`)
  const found = existing.json?.data?.[0]
  if (found) {
    await strapi(`/payer-aliases/${found.documentId}`, 'PUT', {
      PayerName: payerName,
      MemberName: memberName,
      ...(memberDocId && { member: { connect: [memberDocId] } }),
      Confirmations: (found.Confirmations ?? 1) + 1,
      LastUsed: today,
    })
  } else {
    await strapi('/payer-aliases', 'POST', {
      AliasKey: key,
      PayerName: payerName,
      MemberName: memberName,
      ...(memberDocId && { member: { connect: [memberDocId] } }),
      Confirmations: 1,
      LastUsed: today,
    })
  }
}
