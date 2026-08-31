/**
 * CSV για ελληνικό Excel: διαχωριστής «;» και εισαγωγικά παντού. Το BOM
 * μπαίνει από τον καλούντα, τη στιγμή που φτιάχνεται το Blob.
 */

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string
}

const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function buildCsv<T>(rows: T[], columns: Array<CsvColumn<T>>): string {
  const lines = [columns.map(c => esc(c.header)).join(';')]
  for (const r of rows) lines.push(columns.map(c => esc(c.value(r))).join(';'))
  return lines.join('\r\n')
}

/** Κατέβασμα στον υπολογιστή του χρήστη — με BOM, αλλιώς το Excel σπάει τα ελληνικά */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** «CforC-μέλη-2026-08-31.csv» */
export function datedFilename(stem: string, d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${stem}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`
}
