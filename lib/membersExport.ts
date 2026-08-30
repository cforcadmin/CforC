/**
 * Η εξαγωγή του Μητρώου Μελών σε CSV — καθαρή λογική, χωρίς React, ώστε να
 * ελέγχεται με tests: ό,τι διαλέγει ο χρήστης βγαίνει, τίποτε άλλο.
 */
import type { OcMemberRow, OcMemberStatus } from '@/lib/ocOverview'

export const STATUS_TEXT: Record<OcMemberStatus, string> = {
  paid: 'Τακτοποιημένο',
  'new-unpaid': 'Νέο — εκκρεμεί συνδρομή',
  'owes-1': 'Εκκρεμεί συνδρομή',
  'owes-2': 'Προς διαγραφή (2 έτη)',
  unknown: '—',
}

/** 1 = πληρωμένο, 0 = δεν όφειλε (δεν ήταν ακόμη μέλος), null = εκκρεμεί */
export function payText(v: 0 | 1 | null | undefined): string {
  return v === 1 ? 'πληρωμένο' : v === 0 ? 'δεν όφειλε' : 'εκκρεμεί'
}

export interface ExportField {
  key: string
  label: string
  /** Μία στήλη ανά έτος (η «Πληρωμές») αντί για μία μόνο */
  expandYears?: boolean
  value: (m: OcMemberRow) => string
}

export function buildExportFields(currentYear: number, years: number[]): ExportField[] {
  return [
    { key: 'am', label: 'ΑΜ', value: m => String(m.am) },
    { key: 'name', label: 'Ονοματεπώνυμο', value: m => m.name || '' },
    { key: 'email', label: 'Email', value: m => m.email || '' },
    { key: 'phone', label: 'Τηλέφωνο', value: m => m.phone || '' },
    { key: 'city', label: 'Πόλη', value: m => m.city || '' },
    { key: 'regYear', label: 'Έτος εγγραφής', value: m => (m.regYear ? String(m.regYear) : '') },
    { key: 'year', label: `Συνδρομή ${currentYear}`, value: m => payText(m.payments[String(currentYear)]) },
    { key: 'status', label: 'Κατάσταση', value: m => STATUS_TEXT[m.status] || '' },
    { key: 'payments', label: `Πληρωμές ανά έτος (${years[0]}–${years[years.length - 1]})`, expandYears: true, value: () => '' },
    { key: 'profile', label: 'Προφίλ ενημερωμένο', value: m => (m.profileVisible ? 'ναι' : 'όχι') },
    { key: 'profileUrl', label: 'Σύνδεσμος προφίλ', value: m => (m.slug ? `https://www.cultureforchange.net/members/${m.slug}` : '') },
  ]
}

/** Πόσες στήλες θα έχει τελικά το αρχείο (η «Πληρωμές» μετρά όσα τα έτη) */
export function countExportColumns(chosen: ExportField[], years: number[]): number {
  return chosen.reduce((n, f) => n + (f.expandYears ? years.length : 1), 0)
}

/** Ελληνικό Excel: διαχωριστής «;» και εισαγωγικά παντού */
export function buildMembersCsv(rows: OcMemberRow[], chosen: ExportField[], years: number[]): string {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header: string[] = []
  for (const f of chosen) {
    if (f.expandYears) years.forEach(y => header.push(String(y)))
    else header.push(f.label)
  }
  const lines = [header.map(esc).join(';')]
  for (const m of rows) {
    const cells: string[] = []
    for (const f of chosen) {
      if (f.expandYears) years.forEach(y => cells.push(payText(m.payments[String(y)])))
      else cells.push(f.value(m))
    }
    lines.push(cells.map(esc).join(';'))
  }
  return lines.join('\r\n')
}
