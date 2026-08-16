/**
 * Μητρώο προμηθευτών που μαθαίνει — το αντίστοιχο των payer-aliases για τα
 * έξοδα. Το κείμενο του ονόματος αρχείου («alpha», «Κληρονόμος») δένεται
 * ΜΙΑ φορά με επίσημη επωνυμία, ΑΦΜ και κατηγορία· από εκεί και πέρα
 * συμπληρώνονται μόνα τους. Καμία μαντεψιά, κανένα AI.
 */

import { supplierAliasKey } from '@/lib/invoiceFilename'

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export type ExpenseCategory = 'Office Expenses' | 'Services' | 'Travel and Accommodation' | 'Others'

export interface SupplierAlias {
  documentId: string
  aliasKey: string
  supplierName: string
  supplierTaxId: string | null
  category: ExpenseCategory | null
  /** Χρεώνεται αυτόματα (τραπεζικά έξοδα, κάρτα): ημ. πληρωμής = ημ. έκδοσης */
  autoPaid: boolean
  docPrefix: string
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

function toAlias(e: any): SupplierAlias {
  return {
    documentId: e.documentId,
    aliasKey: e.AliasKey,
    supplierName: e.SupplierName,
    supplierTaxId: e.SupplierTaxId || null,
    category: (e.Category as ExpenseCategory) || null,
    autoPaid: !!e.AutoPaid,
    docPrefix: e.DefaultDocPrefix || '2.1',
    confirmations: e.Confirmations ?? 1,
  }
}

/** Όλο το μητρώο σε Map (μικρό: ~15-40 προμηθευτές) */
export async function getSupplierAliases(): Promise<Map<string, SupplierAlias>> {
  const map = new Map<string, SupplierAlias>()
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return map
  const r = await strapi('/supplier-aliases?pagination[limit]=500')
  for (const e of r.json?.data || []) {
    if (e.AliasKey) map.set(e.AliasKey, toAlias(e))
  }
  return map
}

/**
 * Εύρεση προμηθευτή για ένα hint ονόματος αρχείου. Δοκιμάζει ακριβές
 * κλειδί και μετά «περιέχει» και προς τις δύο κατευθύνσεις, ώστε
 * «alpha» να βρίσκει το «alpha» μέσα σε «alpha bank».
 */
export function lookupAlias(hint: string, aliases: Map<string, SupplierAlias>): SupplierAlias | null {
  const key = supplierAliasKey(hint)
  if (!key) return null
  const exact = aliases.get(key)
  if (exact) return exact
  let best: SupplierAlias | null = null
  for (const [k, v] of aliases) {
    if (!k) continue
    if (key.includes(k) || k.includes(key)) {
      // προτίμησε το μακρύτερο κοινό κλειδί (πιο συγκεκριμένο)
      if (!best || k.length > supplierAliasKey(best.aliasKey).length) best = v
    }
  }
  return best
}

/**
 * Καταγραφή/ενημέρωση μετά την έγκριση του Financer — έτσι μαθαίνει.
 * Δεν πετά ποτέ: αποτυχία εδώ δεν ακυρώνει την έγκριση.
 */
export async function upsertSupplierAlias(input: {
  hint: string
  supplierName: string
  supplierTaxId?: string | null
  category?: ExpenseCategory | null
  autoPaid?: boolean
  docPrefix?: string | null
}): Promise<boolean> {
  const aliasKey = supplierAliasKey(input.hint)
  if (!aliasKey || !input.supplierName) return false
  try {
    const found = await strapi(`/supplier-aliases?filters[AliasKey][$eq]=${encodeURIComponent(aliasKey)}&pagination[limit]=1`)
    const existing = found.json?.data?.[0]
    const payload: Record<string, any> = {
      AliasKey: aliasKey,
      SupplierName: input.supplierName,
      SupplierTaxId: input.supplierTaxId || null,
      Category: input.category || null,
      AutoPaid: !!input.autoPaid,
      DefaultDocPrefix: input.docPrefix || '2.1',
    }
    if (existing) {
      payload.Confirmations = (existing.Confirmations ?? 1) + 1
      const r = await strapi(`/supplier-aliases/${existing.documentId}`, 'PUT', payload)
      return r.ok
    }
    payload.Confirmations = 1
    const r = await strapi('/supplier-aliases', 'POST', payload)
    return r.ok
  } catch (err) {
    console.error('upsertSupplierAlias failed (non-fatal):', err)
    return false
  }
}
