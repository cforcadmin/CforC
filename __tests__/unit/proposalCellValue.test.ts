import { proposalCellValue, PROPOSAL_EXPORT_COLUMNS } from '@/components/oc/OcEventProposals'

const P: any = {
  documentId: 'p1',
  EventProposalTitle: 'Ξενάγηση στο λιμάνι',
  ProposalDescription: 'Μια βόλτα\nσε δύο\n\nγραμμές',
  EventLocation: 'Θεσσαλονίκη', TimeSlot: 'Σάββατο βράδυ',
  TypeOfEvent: 'Δωρεάν δράση', ProposalCost: 0, ProposalDuration: '90 λεπτά',
  ProposalLink: 'https://x.gr', ProposalNotes: 'να ρωτηθεί ο χώρος',
  Status: 'shortlisted', SubmittedAt: '2026-10-02T10:00:00.000Z',
  ProposerName: 'Μαρία Κ', ProposerEmail: 'maria@x.gr',
  event: { Title: '5ο CforC Midterm', Slug: 'midterm-2026' },
}

describe('proposalCellValue', () => {
  it('τα βασικά πεδία', () => {
    expect(proposalCellValue(P, 'title')).toBe('Ξενάγηση στο λιμάνι')
    expect(proposalCellValue(P, 'proposer')).toBe('Μαρία Κ')
    expect(proposalCellValue(P, 'event')).toBe('5ο CforC Midterm')
  })

  it('η κατάσταση βγαίνει με ελληνική ετικέτα, όχι κωδικό', () => {
    expect(proposalCellValue(P, 'status')).toBe('Shortlisted')
    expect(proposalCellValue({ ...P, Status: 'declined' }, 'status')).toBe('Δεν επιλέχθηκε')
  })

  /* ΤΟ 0 ΕΙΝΑΙ ΤΙΜΗ: δωρεάν δράση. Κενό σημαίνει «δεν δηλώθηκε». */
  it('κόστος 0 γράφεται 0, όχι κενό', () => {
    expect(proposalCellValue(P, 'cost')).toBe('0')
    expect(proposalCellValue({ ...P, ProposalCost: null }, 'cost')).toBe('')
    expect(proposalCellValue({ ...P, ProposalCost: 300 }, 'cost')).toBe('300')
  })

  /* Πολυγραμμική τιμή καταστρέφει τη ματιά σε υπολογιστικό φύλλο */
  it('οι αλλαγές γραμμής της περιγραφής γίνονται κενά', () => {
    expect(proposalCellValue(P, 'description')).toBe('Μια βόλτα σε δύο γραμμές')
  })

  it('η περιγραφή βγαίνει ΟΛΟΚΛΗΡΗ — δεν κόβεται όπως στην οθόνη', () => {
    const long = 'λ'.repeat(600)
    expect(proposalCellValue({ ...P, ProposalDescription: long }, 'description')).toHaveLength(600)
  })

  it('τα κενά μένουν κενά, όχι «—»', () => {
    const e: any = { ...P, ProposerName: '', ProposalLink: '', ProposalNotes: '', event: null, SubmittedAt: '' }
    for (const k of ['proposer', 'link', 'notes', 'event', 'submitted']) {
      expect(proposalCellValue(e, k)).toBe('')
    }
  })

  it('κάθε στήλη της εξαγωγής έχει τιμή που δεν σκάει', () => {
    for (const c of PROPOSAL_EXPORT_COLUMNS) {
      expect(typeof proposalCellValue(P, c.key)).toBe('string')
      expect(typeof proposalCellValue({}, c.key)).toBe('string')
    }
  })
})
