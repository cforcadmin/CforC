import { NextResponse } from 'next/server'
import { generateExpenseGuidePdf } from '@/lib/expenseGuidePdf'

/**
 * Ο οδηγός του εξοδολογίου σε PDF. Παράγεται κάθε φορά από το ίδιο κείμενο
 * με το pop-up, οπότε δεν μπορεί να μείνει πίσω. Ανοιχτός: είναι οδηγίες,
 * όχι δεδομένα — και βοηθά να προωθηθεί σε μέλος που ρωτά πώς γίνεται.
 */
export const revalidate = 3600

export async function GET() {
  try {
    const pdf = await generateExpenseGuidePdf()
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="CforC-Odigos-Exodologiou.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('expense guide pdf failed:', err)
    return NextResponse.json({ error: 'Αποτυχία δημιουργίας οδηγού' }, { status: 500 })
  }
}
