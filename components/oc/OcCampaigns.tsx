'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CampaignRichText from './CampaignRichText'
import { moveUp, moveDown, moveToBottom, moveGroupTo, mergePaletteOrder, movePaletteChip } from '@/lib/blockOrder'
import { PREVIEW_DESKTOP_WIDTH, fileSizeLabel } from '@/lib/campaignBlocks'
import { usePreviewSize, PV_MIN_W, PV_MIN_H, PV_EDGE_GAP, PV_BASE_TRACK, PV_STICKY_TOP } from './usePreviewSize'
import { canNewsletterFrom, bulkLabel } from '@/components/oc/ocPrefs'
import type { NewsletterFooter } from '@/lib/campaignBlocks'

/**
 * Αποστολή email — το γραφείο αποστολής της κάθε έδρας.
 *
 * Η ίδια οθόνη εμφανίζεται στο τέλος πέντε ενοτήτων (Επισκόπηση, Μέλη,
 * Οικονομικά, Επικοινωνία, Διαχείριση) και τη βλέπει μόνο η έδρα στην οποία
 * ανήκει η ενότητα — το IT τις βλέπει όλες. Δεν παίρνει prop για τη θυρίδα:
 * τη βγάζει η διαδρομή από την ΕΝΕΡΓΗ ΕΔΡΑ και έρχεται στο `meta.signer`, οπότε
 * η Επισκόπηση υπογράφει coordination@ ή outreach@ ανάλογα με το ποιος μπήκε.
 *
 * ΟΧΙ «μαζική»: η ίδια οθόνη στέλνει σε έναν παραλήπτη, σε μια έδρα, σε μια
 * ομάδα εργασίας ή σε όλο το δίκτυο. Η ουρά και το ημερήσιο όριο αφορούν μόνο
 * την περίπτωση που οι παραλήπτες δεν χωρούν σε μία μέρα.
 *
 * Η διάταξη, οι κλάσεις και τα κείμενα είναι από το σχέδιο· η διαφορά είναι
 * ότι το σώμα δεν είναι textarea αλλά ΜΠΛΟΚ. Το HTML των email δεν είναι HTML
 * του web, οπότε ελεύθερο κείμενο θα έσπαγε σε Outlook και μια επικόλληση από
 * Word θα έφερνε ξένες γραμματοσειρές. Τα μπλοκ κάνουν το εκτός ταυτότητας
 * αποτέλεσμα αδύνατο.
 *
 * Η προεπισκόπηση ζει σε <iframe>: αλλιώς τα styles της σελίδας θα έβαφαν το
 * γράμμα και θα έδειχνε διαφορετικό απ' ό,τι φτάνει στο inbox.
 */

type Block = Record<string, any> & { type: string }
type Recipient = { email: string; name: string; via: string; am?: number | null }
type Selection = {
  allMembers?: boolean
  seats?: string[]
  paymentStatus?: { year: number; paid: boolean }
  groups?: string[]
  memberDocIds?: string[]
  external?: string[]
}
type Campaign = {
  documentId: string; Subject: string; State: string
  SentCount: number; FailedCount: number; TotalCount: number
  QueuedAt?: string | null; CompletedAt?: string | null; CreatedByName?: string | null
  Archived?: boolean; ArchivedAt?: string | null
  /** Λείπει σε παλιές εγγραφές και όσο το πεδίο δεν έχει βγει στο Strapi */
  Kind?: 'message' | 'newsletter' | null
  /** «Σε ποιον πήγε» — φτιάχνεται στον server (describeAudience) */
  audience?: string | null
}
type Meta = {
  memberCount: number
  /** Για τον επιλογέα συγκεκριμένων μελών — χωρίς email, φτάνει το docId */
  memberList?: Array<{ docId: string; name: string; am: number | null }>
  groups: string[]
  seats?: Array<{ id: string; label: string; email: string }>
  blockLabels: Record<string, string>
  blockVariants: Record<string, { key: string; options: Array<{ value: string; label: string }> }>
  presets: Array<{ id: string; label: string; hint: string; blocks: Block[] }>
  /** Άλλα σχέδια για newsletter — τα παραπάνω αφορούν μόνο email */
  newsletterPresets?: Array<{ id: string; label: string; hint: string; blocks: Block[] }>
  mergeFields: Array<{ token: string; label: string; sample: string }>
  dailyBudget: number
  tocDefaultTitle?: string
  /** Οι λίστες του Sender, με το τρέχον μέγεθός τους */
  newsletterLists?: Array<{ id: string; label: string; hint: string; count: number | null }>
  footerStyles?: Array<{ id: string; label: string; hint: string }>
  newsletterFooters?: Array<{ id: string; label: string; hint: string }>
  newsletterFooterDefaults?: NewsletterFooter
  footerLooks?: Array<{ id: string; label: string; hint: string }>
  headerStyles?: Array<{ id: string; label: string; hint: string }>
  signer?: { name: string; role: string; email: string }
}

const CARD = 'bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 sm:p-8 border border-gray-200 dark:border-gray-600'
const EYEBROW = 'text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400'
const FIELD = 'w-full min-h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-base'
const CONTROL = 'h-11 rounded-full px-4 text-sm glass-control'
const CHIP = 'px-3 py-1.5 rounded-full border text-sm min-h-11 sm:min-h-0 inline-flex items-center gap-1.5'
/**
 * Έτοιμα κοινά. Σταθερά στον κώδικα — αν χρειαστεί νέο, μπαίνει εδώ.
 *
 * «Ομάδα Συντονισμού» σημαίνει ΟΛΟΥΣ τους κατόχους εδρών, μαζί με Γραμματεία
 * και IT: ο αποκλεισμός τους αφορούσε την ΨΗΦΟ στις αιτήσεις, όχι το ποιος
 * ενημερώνεται. Η Γραμματεία στηρίζει το ΔΣ και χρειάζεται την πληροφορία.
 */
const AUDIENCES: Array<{ id: string; label: string; hint: string; build: (m: Meta) => Selection }> = [
  {
    id: 'community', label: 'CforC κοινότητα', hint: 'Όλα τα εγγεγραμμένα μέλη',
    build: () => ({ allMembers: true }),
  },
  {
    id: 'board', label: 'Ομάδα Συντονισμού', hint: 'Όλες οι θυρίδες των εδρών',
    build: m => ({ seats: (m.seats || []).map(s => s.id) }),
  },
  {
    id: 'workgroups', label: 'Ομάδες Εργασίας', hint: 'Μέλη όλων των ομάδων εργασίας',
    build: m => ({ groups: m.groups }),
  },
  {
    id: 'unpaid', label: `Απλήρωτοι ${new Date().getFullYear()}`, hint: 'Χωρίς συνδρομή για φέτος',
    build: () => ({ paymentStatus: { year: new Date().getFullYear(), paid: false } }),
  },
]

/**
 * Οι θυρίδες των εδρών. Μία ανά ρόλο, όχι έτοιμοι συνδυασμοί: ο συνδυασμός
 * που χρειάζεται κάθε φορά είναι διαφορετικός, και τα κουμπιά προστίθενται.
 */
const CC_SEATS: Array<{ label: string; email: string }> = [
  { label: 'Γραμματεία', email: 'hello@cultureforchange.net' },
  { label: 'Επικοινωνία', email: 'communication@cultureforchange.net' },
  { label: 'Κοινότητα', email: 'community@cultureforchange.net' },
  { label: 'Συντονισμός', email: 'coordination@cultureforchange.net' },
  { label: 'Ταμίας', email: 'finance@cultureforchange.net' },
  { label: 'IT', email: 'it@cultureforchange.net' },
  { label: 'Outreach', email: 'outreach@cultureforchange.net' },
]

const STATE_LABELS: Record<string, string> = {
  draft: 'Προσχέδιο', queued: 'Σε ουρά', sending: 'Σε εξέλιξη', sent: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε',
}

/**
 * @param desk  Η ενότητα στην οποία κάθεται η οθόνη — και το «γραμματοκιβώτιο»
 *              της. Τα Απεσταλμένα και το Αρχείο είναι ΤΟΥ ΓΡΑΦΕΙΟΥ: η
 *              Επισκόπηση είναι ένα κοινό τραπέζι για Συντονισμό και Outreach,
 *              ενώ τα Οικονομικά δεν βλέπουν τίποτα από τα Μέλη.
 */
export default function OcCampaigns({ desk }: { desk: string }) {
  const [tab, setTab] = useState<'compose' | 'drafts' | 'queue'>('compose')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [subject, setSubject] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selection, setSelection] = useState<Selection>({})
  const [cc, setCc] = useState<string[]>([])
  const [footerStyle, setFooterStyle] = useState('signature')
  const [footerLook, setFooterLook] = useState('plain')
  const [footerLogo, setFooterLogo] = useState(false)
  /**
   * Το υποσέλιδο του τεύχους — λογότυπο, κοινωνικά δίκτυα, δικαιώματα,
   * σημείωμα GDPR, απεγγραφή. Αντικαθιστά ΟΛΗ την υπογραφή στα newsletter:
   * ένα τεύχος δεν το υπογράφει άνθρωπος, το στέλνει το δίκτυο.
   */
  const [footer, setFooter] = useState<NewsletterFooter | null>(null)
  const [headerStyle, setHeaderStyle] = useState('coral')
  const [headerLogo, setHeaderLogo] = useState(false)
  const [resolved, setResolved] = useState<{ count: number; days: number; summary: string; recipients: Recipient[] }>(
    { count: 0, days: 0, summary: '', recipients: [] })
  const [preview, setPreview] = useState('')
  /**
   * Ποιο ΥΠΑΡΧΟΝ προσχέδιο επεξεργαζόμαστε.
   *
   * Χωρίς αυτό, κάθε «Αποθήκευση προσχεδίου» έφτιαχνε ΝΕΑ καμπάνια: τρεις
   * αποθηκεύσεις = τρία προσχέδια. Και επειδή το γραμματοκιβώτιο ανήκει στο
   * γραφείο, η Επικοινωνία και το Media βλέπουν τα ίδια προσχέδια — άρα
   * πρέπει να μπορούν να ανοίξουν και να συνεχίσουν το ίδιο, όχι να φτιάχνουν
   * αντίγραφα ο ένας του άλλου.
   */
  /**
   * Μήνυμα ή newsletter.
   *
   * Ίδιος συνθέτης, δύο εντελώς διαφορετικές διαδρομές: το μήνυμα φεύγει από
   * εμάς μέσω Resend, ανά παραλήπτη, χωρίς απεγγραφή· το newsletter φεύγει
   * από τον Sender σε ΛΙΣΤΑ, με υποχρεωτικό σύνδεσμο απεγγραφής. Ο διακόπτης
   * υπάρχει για να μη μπερδευτούν ποτέ τα δύο.
   */
  const [kind, setKind] = useState<'message' | 'newsletter'>('message')
  const [audiences, setAudiences] = useState<string[]>([])
  /** Το μπλοκ που πρέπει να δείξει η προεπισκόπηση — η αντίστροφη διαδρομή
   *  από το «κλικ στην προεπισκόπηση → εστίαση στο μπλοκ». Το n αυξάνει σε
   *  κάθε κλικ, ώστε δύο κλικ στο ίδιο μπλοκ να ξαναστείλουν την εντολή. */
  const [goTo, setGoTo] = useState<{ i: number; n: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  /**
   * Παράθυρο ονόματος. Δύο χρήσεις, ίδιο κουτί:
   *   'first-save' → η ΠΡΩΤΗ αποθήκευση νέου προσχεδίου
   *   'duplicate'  → δημιουργία αντιγράφου με νέο όνομα
   *
   * Δεν χρησιμοποιείται window.prompt: μπλοκάρει το παράθυρο, δεν στυλίζεται
   * και σε κάποιους browsers απενεργοποιείται μόνιμα από τον χρήστη.
   */
  const [naming, setNaming] = useState<null | {
    mode: 'first-save' | 'duplicate' | 'duplicate-row'
    value: string
    /** Μόνο στο 'duplicate-row': ποια καμπάνια της λίστας αντιγράφεται */
    id?: string
  }>(null)
  const [editingSubject, setEditingSubject] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [finalTestAsk, setFinalTestAsk] = useState(false)
  /** Κενό = άμεση αποστολή. Τιμή «YYYY-MM-DDTHH:mm» = προγραμματισμός. */
  const [scheduleAt, setScheduleAt] = useState('')
  const [busy, setBusy] = useState(false)

  /**
   * Η επιλεγμένη ώρα ως ΠΡΑΓΜΑΤΙΚΗ στιγμή.
   *
   * Το `datetime-local` δίνει «2026-09-27T12:30» χωρίς ζώνη. Ο server τρέχει
   * σε UTC και θα το διάβαζε ως 12:30 UTC — τρεις ώρες μετά από ό,τι είδε ο
   * συντάκτης. Ο browser είναι ο μόνος που ξέρει τη ζώνη, οπότε η μετατροπή
   * γίνεται ΕΔΩ.
   */
  const scheduleAtIso = useMemo(() => {
    if (!scheduleAt) return ''
    const d = new Date(scheduleAt)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }, [scheduleAt])

  /**
   * Πού βρισκόμαστε μέσα στο τεύχος — η θέση που δείχνει ο κάθετος
   * ολισθητήρας. Ζει ΕΔΩ και όχι στον BlockEditor, γιατί ο ολισθητήρας
   * στέκεται ανάμεσα στις δύο στήλες και κινεί και τις δύο.
   */
  const [cursor, setCursor] = useState(0)

  /**
   * ΜΕΓΕΘΟΣ ΤΗΣ ΠΡΟΕΠΙΣΚΟΠΗΣΗΣ — δύο λαβές και μία «Μεγέθυνση».
   *
   * Η στήλη της προεπισκόπησης είναι η ΤΡΙΤΗ και τελευταία του πλέγματος
   * (grid-cols-[1fr_auto_minmax(0,30rem)]), δηλαδή ακουμπά τη δεξιά άκρη του
   * max-w-7xl. Μεγαλώνοντας το πλάτος, το aside ΞΕΧΕΙΛΙΖΕΙ προς τα δεξιά —
   * μέσα στο περιθώριο της σελίδας, όπου δεν υπάρχει τίποτα να σκεπαστεί —
   * μέχρι PV_EDGE_GAP πριν την άκρη της οθόνης. Καμία επικάλυψη, καμία πύλη,
   * καμία μάχη z-index: η γραμμή αποστολής (sticky bottom-3) μένει από πάνω
   * από μόνη της, επειδή τίποτα δεν βγαίνει από τη ροή.
   */
  const pv = usePreviewSize(520)
  const asideRef = useRef<HTMLElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [maximized, setMaximized] = useState(false)

  /* Το ρυθμιζόμενο πλάτος ισχύει ΜΟΝΟ στη διάταξη δύο στηλών. Από κάτω η
     σελίδα είναι μονόστηλη και το πλάτος το ορίζει η οθόνη — ένα inline
     width θα κόλλαγε τη στήλη σε μέγεθος υπολογιστή μέσα σε κινητό. */
  const [twoCol, setTwoCol] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setTwoCol(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /** Μέχρι πού φτάνει δεξιά: ό,τι μένει ως την άκρη της οθόνης, με μια ανάσα */
  const maxPreviewW = useCallback(() => {
    const el = asideRef.current
    if (!el) return PV_MIN_W
    const left = el.getBoundingClientRect().left
    return Math.max(PV_MIN_W, Math.round(window.innerWidth - left - PV_EDGE_GAP))
  }, [])

  /** Μέχρι πού φτάνει κάτω: ως το τέλος της ΟΡΑΤΗΣ οθόνης, αφήνοντας τη
   *  γραμμή αποστολής και τη λεζάντα να χωρέσουν από κάτω. */
  const maxPreviewH = useCallback(() => {
    const el = asideRef.current
    if (!el) return PV_MIN_H
    // ΟΧΙ η τωρινή κορυφή: αν δεν έχεις κυλήσει ακόμη, το aside κάθεται
    // χαμηλά και η αφαίρεση θα έβγαζε μηδέν — η «Μεγέθυνση» θα ΜΙΚΡΑΙΝΕ την
    // προεπισκόπηση. Μετράμε με την κορυφή που θα έχει ΚΟΛΛΗΜΕΝΟ, δηλαδή με
    // το ύψος που θα δει τελικά το μάτι.
    const top = Math.min(el.getBoundingClientRect().top, PV_STICKY_TOP)
    return Math.max(PV_MIN_H, Math.round(window.innerHeight - top - 150))
  }, [])

  /** Πόσο ακόμη μπορεί να σπρωχτεί ο συνθέτης ΑΡΙΣΤΕΡΑ: όσο περιθώριο έχει
   *  μείνει αχρησιμοποίητο στα αριστερά της σελίδας, με μια ανάσα. Στο
   *  `rect.left` προστίθεται η ΤΩΡΙΝΗ σπρωξιά, γιατί το rect τη μετρά ήδη. */
  const maxPreviewL = useCallback(() => {
    const el = sectionRef.current
    if (!el) return 0
    return Math.max(0, Math.round(el.getBoundingClientRect().left + pv.l - PV_EDGE_GAP))
  }, [pv.l])

  const dragPreview = useCallback((axis: 'w' | 'h' | 'l') => (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const el = asideRef.current
    if (!el) return
    const startX = e.clientX
    const startY = e.clientY
    const startW = Math.round(el.getBoundingClientRect().width)
    const startH = pv.h
    const limW = maxPreviewW()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    // Η τελευταία τιμή ταξιδεύει σε ΤΟΠΙΚΗ μεταβλητή και δίνεται ρητά στην
    // persist: το state της React δεν έχει προλάβει να ενημερωθεί όταν
    // σηκώνεται το δάχτυλο.
    const startL = pv.l
    const limL = maxPreviewL()
    let finalW = startW
    let finalH = startH
    let finalL = startL
    const move = (ev: PointerEvent) => {
      if (axis === 'w') {
        finalW = Math.min(limW, Math.max(PV_MIN_W, startW + ev.clientX - startX))
        pv.setW(finalW)
        setMaximized(false)
      } else if (axis === 'l') {
        // Προς τα ΑΡΙΣΤΕΡΑ μεγαλώνει: το dx είναι αρνητικό, το γυρίζουμε.
        finalL = Math.min(limL, Math.max(0, startL + (startX - ev.clientX)))
        // Ό,τι κερδίζει ο συνθέτης αριστερά, το παίρνει η προεπισκόπηση —
        // τα μπλοκ ΜΕΤΑΚΙΝΟΥΝΤΑΙ, δεν στενεύουν.
        finalW = Math.max(PV_MIN_W, startW + (finalL - startL))
        pv.setL(finalL)
        pv.setW(finalW)
        setMaximized(false)
      } else {
        finalH = Math.max(PV_MIN_H, startH + ev.clientY - startY)
        pv.setH(finalH)
      }
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
      pv.persist(
        axis === 'w' ? { w: finalW }
        : axis === 'l' ? { w: finalW, l: finalL }
        : { h: finalH })
    }
    document.body.style.userSelect = 'none'
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }, [pv, maxPreviewW, maxPreviewL])

  /** Πληκτρολόγιο: τα βέλη αλλάζουν μέγεθος κατά 24px — χωρίς ποντίκι */
  const keyPreview = useCallback((axis: 'w' | 'h' | 'l') => (e: React.KeyboardEvent) => {
    // Στη λαβή ΑΡΙΣΤΕΡΑ το «μεγαλώνει» είναι το ←, αντίστροφα από τη δεξιά
    const dec = axis === 'h' ? 'ArrowUp' : axis === 'l' ? 'ArrowRight' : 'ArrowLeft'
    const inc = axis === 'h' ? 'ArrowDown' : axis === 'l' ? 'ArrowLeft' : 'ArrowRight'
    if (e.key !== dec && e.key !== inc) return
    e.preventDefault()
    const step = e.key === inc ? 24 : -24
    if (axis === 'l') {
      const nextL = Math.min(maxPreviewL(), Math.max(0, pv.l + step))
      const curW = pv.w ?? Math.round(asideRef.current?.getBoundingClientRect().width ?? PV_MIN_W)
      const nextW = Math.max(PV_MIN_W, curW + (nextL - pv.l))
      pv.setL(nextL)
      pv.setW(nextW)
      setMaximized(false)
      pv.persist({ w: nextW, l: nextL })
    } else if (axis === 'w') {
      const cur = pv.w ?? Math.round(asideRef.current?.getBoundingClientRect().width ?? PV_MIN_W)
      const next = Math.min(maxPreviewW(), Math.max(PV_MIN_W, cur + step))
      pv.setW(next)
      setMaximized(false)
      pv.persist({ w: next })
    } else {
      const next = Math.max(PV_MIN_H, pv.h + step)
      pv.setH(next)
      pv.persist({ h: next })
    }
  }, [pv, maxPreviewW, maxPreviewL])

  /** «Μεγέθυνση»: όσο πάει δεξιά και όσο πάει κάτω μέσα στην ορατή οθόνη.
   *  Δεύτερο πάτημα — πίσω στις προεπιλογές. */
  const toggleMaximize = useCallback(() => {
    if (maximized) {
      setMaximized(false)
      pv.reset()
      return
    }
    // Και τα ΔΥΟ περιθώρια: όσο πάει δεξιά (maxPreviewW) συν όσο μπορεί να
    // σπρωχτεί ο συνθέτης αριστερά (maxPreviewL). Το όριο της σπρωξιάς
    // κρατά τα μπλοκ μέσα στην οθόνη — δεν φεύγουν ποτέ έξω αριστερά.
    const l = maxPreviewL()
    const w = maxPreviewW() + l
    const h = maxPreviewH()
    pv.setL(l)
    pv.setW(w)
    pv.setH(h)
    setMaximized(true)
    pv.persist({ w, h, l })
  }, [maximized, pv, maxPreviewW, maxPreviewH, maxPreviewL])

  /* Αν στενέψει το παράθυρο, το αποθηκευμένο πλάτος μπορεί να ξεπερνά την
     οθόνη και να γεννήσει οριζόντια μπάρα κύλισης. Το μαζεύουμε. */
  useEffect(() => {
    if (!twoCol || (pv.w === undefined && pv.l === 0)) return
    const onResize = () => {
      // Πρώτα η σπρωξιά: σε στενό παράθυρο μπορεί να μην υπάρχει πια
      // περιθώριο αριστερά, και τα μπλοκ θα έβγαιναν έξω από την οθόνη.
      if (pv.l > 0) {
        const limL = maxPreviewL()
        if (pv.l > limL) {
          pv.setW(Math.max(PV_MIN_W, (pv.w ?? PV_MIN_W) - (pv.l - limL)))
          pv.setL(limL)
        }
      }
      const lim = maxPreviewW() + pv.l
      if (pv.w !== undefined && pv.w > lim) pv.setW(lim)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [twoCol, pv, maxPreviewW, maxPreviewL])

  const seen = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const i = Number((e.target as HTMLElement).dataset.blockIndex)
        if (!Number.isInteger(i)) continue
        if (e.isIntersecting) seen.current.add(i)
        else seen.current.delete(i)
      }
      if (seen.current.size) setCursor(Math.min(...seen.current))
    // Το κάτω περιθώριο κρατά ως «τρέχον» το μπλοκ στο πάνω μισό της οθόνης
    }, { rootMargin: '-110px 0px -55% 0px' })
    for (let i = 0; i < blocks.length; i++) {
      const el = document.getElementById(`oc-block-${i}`)
      if (el) io.observe(el)
    }
    return () => { io.disconnect(); seen.current.clear() }
  }, [blocks.length, tab])

  /**
   * Αρχείο που πέφτει ΕΚΤΟΣ στόχου.
   *
   * Ο browser το ανοίγει, φεύγοντας από τη σελίδα — και παίρνει μαζί του ένα
   * προσχέδιο 85 μπλοκ που δεν έχει αποθηκευτεί. Τώρα που καλούμε τον χρήστη
   * να σύρει φωτογραφίες, η αστοχία κατά δύο εκατοστά δεν επιτρέπεται να
   * κοστίζει το κείμενο μιας ώρας. Τα πλαίσια εικόνας σταματούν το συμβάν
   * πριν φτάσει εδώ, οπότε αυτό πιάνει μόνο τις αστοχίες.
   */
  useEffect(() => {
    const swallow = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault()
    }
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => {
      window.removeEventListener('dragover', swallow)
      window.removeEventListener('drop', swallow)
    }
  }, [])

  /** Ο ολισθητήρας κινεί ΚΑΙ τα στοιχεία ΚΑΙ την προεπισκόπηση */
  const goToPosition = (i: number) => {
    const at = Math.max(0, Math.min(i, blocks.length - 1))
    setCursor(at)
    const el = document.getElementById(`oc-block-${at}`)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110 })
    setGoTo(g => ({ i: at, n: (g?.n ?? 0) + 1 }))
  }

  /** Σε ποια ενότητα βρισκόμαστε — η τελευταία επικεφαλίδα πριν τον δείκτη */
  const hereSection = useMemo(() => {
    for (let i = Math.min(cursor, blocks.length - 1); i >= 0; i--) {
      const b = blocks[i]
      if (b?.type === 'section' && b.title) return String(b.title)
    }
    return ''
  }, [cursor, blocks])

  const load = useCallback(async () => {
    const res = await fetch(`/api/oc/campaigns?desk=${encodeURIComponent(desk)}`, { cache: 'no-store' })
    if (!res.ok) {
      // Το μήνυμα του server, όχι σκέτο «αποτυχία»: το «ανήκει σε άλλο
      // γραφείο» και το «εσωτερικό σφάλμα» θέλουν διαφορετική αντίδραση.
      const d = await res.json().catch(() => null)
      setNotice({ kind: 'err', text: `${d?.error || 'Αποτυχία φόρτωσης'} (${res.status})` })
      setLoading(false); return
    }
    const d = await res.json()
    setMeta(d); setCampaigns(d.campaigns || []); setLoading(false)
    // Το γραφείο είναι εξάρτηση: το IT αλλάζει ενότητα και πρέπει να δει το
    // γραμματοκιβώτιο ΕΚΕΙΝΟΥ του τραπεζιού, όχι του προηγούμενου.
  }, [desk])
  useEffect(() => { load() }, [load])

  // Οι παραλήπτες ξαναϋπολογίζονται με καθυστέρηση: κάθε τικ σε chip αλλιώς
  // θα χτυπούσε τον server, και η λίστα των μελών δεν είναι μικρή.
  /**
   * ΤΟ debounce ΔΕΝ ΑΡΚΕΙ.
   *
   * Ακυρώνει το χρονόμετρο, όχι το αίτημα που ήδη ταξιδεύει. Δύο αλλαγές με
   * απόσταση μεγαλύτερη από το debounce στέλνουν ΔΥΟ αιτήματα, και κερδίζει
   * όποιο ΓΥΡΙΣΕΙ τελευταίο — όχι όποιο στάλθηκε τελευταίο. Έτσι «Μεγάλη →
   * Μεσαία → Μεγάλη» κατέληγε να δείχνει Μεσαία: η αργή απάντηση της Μεσαίας
   * πατούσε τη σωστή. Το `alive` κόβει κάθε απάντηση που δεν αφορά πια την
   * τρέχουσα κατάσταση.
   */
  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', selection }),
      })
      if (res.ok && alive) setResolved(await res.json())
    }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [selection])

  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      if (!blocks.length && !subject) { setPreview(''); return }
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', kind, subject, blocks, footerStyle, footerLook, footerLogo, headerStyle, headerLogo, footer }),
      })
      if (res.ok && alive) setPreview((await res.json()).html)
    }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [kind, subject, blocks, footerStyle, footerLook, footerLogo, headerStyle, headerLogo, footer])

  /** Κάθε CC μετράει ξανά σε ΚΑΘΕ μήνυμα — γι' αυτό πολλαπλασιάζεται */
  const emailCost = resolved.count * (1 + cc.length)
  const days = meta ? Math.max(1, Math.ceil(emailCost / meta.dailyBudget)) : 1

  /**
   * @param opts.asName  αποθήκευση με ΑΥΤΟ το όνομα αντί του τρέχοντος θέματος
   * @param opts.asNew   αγνοεί το editingId ώστε να γεννηθεί ΝΕΑ εγγραφή
   */
  /**
   * Διπλότυπο καμπάνιας από τη ΛΙΣΤΑ — δεν αγγίζει τον συντάκτη.
   *
   * Η αντιγραφή γίνεται στον server: τα μπλοκ ενός newsletter φτάνουν τα 100
   * και δεν υπάρχει λόγος να κατέβουν και να ξανανέβουν.
   */
  const duplicateRow = async (id: string, subject: string) => {
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', id, subject }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setNotice({ kind: 'ok', text: `Το διπλότυπο «${subject}» δημιουργήθηκε στα Προσχέδια.` })
      await load()
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false) }
  }

  const send = async (action: 'save' | 'queue', opts: { asName?: string; asNew?: boolean } = {}) => {
    setBusy(true); setNotice(null)
    const outSubject = opts.asName ?? subject
    try {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, desk, kind, audiences, id: opts.asNew ? undefined : (editingId || undefined), subject: outSubject, blocks, selection, cc, footerStyle, footerLook, footerLogo, headerStyle, headerLogo, footer, scheduleAtIso }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      setNotice({
        kind: 'ok',
        text: action !== 'queue'
          ? (opts.asNew ? 'Το διπλότυπο δημιουργήθηκε.' : 'Το προσχέδιο αποθηκεύτηκε.')
          : d.remaining === 0
            ? `Στάλθηκε σε ${d.sentNow} ${d.sentNow === 1 ? 'παραλήπτη' : 'παραλήπτες'}.`
            : d.sentNow > 0
              ? `Στάλθηκε σε ${d.sentNow}. Απομένουν ${d.remaining} — φεύγουν αύριο στις 08:15.`
              : `Μπήκε στην ουρά: ${d.summary}. Η πρώτη παρτίδα φεύγει στις 08:15.`,
      })
      setConfirming(false)
      // Κρατάμε το id ώστε η επόμενη αποθήκευση να ΕΝΗΜΕΡΩΣΕΙ, όχι να διπλασιάσει
      if (action === 'save' && d.id) {
        setEditingId(d.id)
        setEditingSubject(outSubject)
        // Το όνομα που δόθηκε στο παράθυρο γίνεται το θέμα της καμπάνιας
        if (opts.asName) setSubject(opts.asName)
      }
      if (action === 'queue') { setTab('queue'); newMessage() }
      await load()
    } catch (e: any) {
      setConfirming(false)
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false) }
  }

  /**
   * Αποστολή newsletter — άλλη διαδρομή από το μήνυμα.
   *
   * Το μήνυμα μπαίνει στη δική μας ουρά και φεύγει ανά παραλήπτη· το
   * newsletter φτιάχνει καμπάνια στον Sender και την ξεκινά (ή την
   * προγραμματίζει). Κοινό κουμπί, χωριστές διαδρομές.
   */
  const sendNewsletter = async () => {
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'newsletter-send', desk, id: editingId || undefined,
          subject, blocks, audiences, scheduleAt: scheduleAt || undefined,
          footerStyle, footerLook, footerLogo, headerStyle, headerLogo, footer, scheduleAtIso,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      const warn = (d.warnings || []).length
        ? ` Πεδία που ο Sender δεν αναγνωρίζει: ${d.warnings.join(', ')}.`
        : ''
      setNotice({
        kind: 'ok',
        text: d.scheduled
          ? `Προγραμματίστηκε για ${new Date(d.scheduled).toLocaleString('el-GR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.${warn}`
          : `Ξεκίνησε η αποστολή από τον Sender.${d.archived ? ' Το τεύχος μπήκε στο αρχείο.' : ' ΠΡΟΣΟΧΗ: δεν μπήκε στο αρχείο — πρόσθεσέ το με το χέρι.'}${warn}`,
      })
      setConfirming(false)
      setTab('queue'); newMessage(); setScheduleAt('')
      await load()
    } catch (e: any) {
      setConfirming(false)
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false) }
  }

  /**
   * Οι δύο δοκιμές.
   *
   * «Δοκιμή» φεύγει από εμάς (Resend) — γρήγορη, ακίνδυνη, για τη διάταξη.
   * «Τελική δοκιμή» φεύγει ΑΠΟ ΤΟΝ SENDER σε ομάδα με μόνη τη θυρίδα σου —
   * αληθινοί σύνδεσμοι, αληθινή απεγγραφή. Γι' αυτό ρωτάει πρώτα.
   */
  const runTest = async (final: boolean) => {
    setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: final ? 'newsletter-final-test' : 'newsletter-test',
          desk, subject, blocks, footerStyle, footerLook, footerLogo, headerStyle, headerLogo, footer, scheduleAtIso,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      const warn = (d.warnings || []).length
        ? ` Πεδία που ο Sender δεν αναγνωρίζει και θα φανούν ως κείμενο: ${d.warnings.join(', ')}.`
        : ''
      // Αν η θυρίδα απεγγράφηκε, πρέπει να το μάθει ΤΩΡΑ: δεν επαναφέρεται
      const dead = d.seatStatus && d.seatStatus !== 'active'
      setNotice({
        kind: dead ? 'err' : 'ok',
        text: dead
          ? `Η δοκιμή στάλθηκε, αλλά το ${d.to} είναι πλέον «${d.seatStatus}» στον Sender — δεν λαμβάνει τίποτα. Επανέρχεται ΜΟΝΟ με νέα εγγραφή από τη φόρμα του ιστότοπου.`
          : `${final ? 'Η τελική δοκιμή' : 'Η δοκιμή'} στάλθηκε στο ${d.to}.${warn}`,
      })
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία' })
    } finally { setBusy(false); setFinalTestAsk(false) }
  }

  /**
   * Κλικ σε στοιχείο της προεπισκόπησης → πάμε στο μπλοκ που το φτιάχνει.
   *
   * ΟΧΙ επιτόπου επεξεργασία μέσα στο γράμμα: η προεπισκόπηση είναι
   * ΠΑΡΑΓΟΜΕΝΟ html, οπότε ό,τι γράψει κανείς εκεί θα έπρεπε να ξαναγυρίσει
   * στα πεδία — διαδρομή με απώλειες, ειδικά σε εικόνες που θέλουν ανέβασμα,
   * σήμα και καθάρισμα στο Strapi. Έτσι πατάς αυτό που βλέπεις, και γράφεις
   * εκεί όπου τα πεδία ξέρουν τι κάνουν.
   */
  const focusBlock = useCallback((i: number) => {
    const el = document.getElementById(`oc-block-${i}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Σύντομη λάμψη: χωρίς αυτήν, σε μεγάλο γράμμα δεν καταλαβαίνεις πού πήγες
    el.classList.add('oc-flash')
    window.setTimeout(() => el.classList.remove('oc-flash'), 1400)
    const field = el.querySelector<HTMLElement>('input, textarea, [contenteditable="true"]')
    field?.focus({ preventScroll: true })
  }, [])

  /** Καθαρή σύνθεση — και αποδέσμευση από το προσχέδιο που ήταν ανοιχτό */
  const newMessage = () => {
    setEditingId(null); setEditingSubject('')
    setSubject(''); setBlocks([]); setSelection({}); setCc([]); setPreview(''); setAudiences([])
  }

  /**
   * ΔΥΟ ΧΩΡΙΣΤΑ ΓΡΑΦΕΙΑ, όχι ένα με διακόπτη.
   *
   * Το μήνυμα και το τεύχος είναι διαφορετικά πράγματα: άλλοι παραλήπτες,
   * άλλη διαδρομή αποστολής, άλλο υποσέλιδο. Όταν ο διακόπτης μοιραζόταν την
   * ίδια κατάσταση, ένα κλικ στο «Μήνυμα» έσερνε ογδόντα μπλοκ τεύχους μέσα
   * σε ένα απλό email — και το αντίστροφο. Τώρα η κάθε πλευρά κρατά τη δική
   * της δουλειά στο ράφι και τη βρίσκει όπως την άφησε.
   *
   * Ράφι στη ΜΝΗΜΗ, όχι στο Strapi: είναι η μισοτελειωμένη σκέψη της στιγμής.
   * Ό,τι πρέπει να επιβιώσει, αποθηκεύεται ρητά ως προσχέδιο.
   */
  interface Bench {
    subject: string; blocks: Block[]; selection: Selection; cc: string[]
    footerStyle: string; footerLook: string; footerLogo: boolean
    headerStyle: string; headerLogo: boolean; footer: NewsletterFooter | null
    audiences: string[]; editingId: string | null; editingSubject: string; scheduleAt: string
  }
  const bench = useRef<Partial<Record<'message' | 'newsletter', Bench>>>({})

  const snapshot = (): Bench => ({
    subject, blocks, selection, cc, footerStyle, footerLook, footerLogo,
    headerStyle, headerLogo, footer, audiences, editingId, editingSubject, scheduleAt,
  })
  const restore = (b: Bench | undefined) => {
    setSubject(b?.subject ?? '')
    setBlocks(b?.blocks ?? [])
    setSelection(b?.selection ?? {})
    setCc(b?.cc ?? [])
    setFooterStyle(b?.footerStyle ?? 'signature')
    setFooterLook(b?.footerLook ?? 'plain')
    setFooterLogo(b?.footerLogo ?? false)
    setHeaderStyle(b?.headerStyle ?? 'coral')
    setHeaderLogo(b?.headerLogo ?? false)
    setFooter(b?.footer ?? null)
    setAudiences(b?.audiences ?? [])
    setEditingId(b?.editingId ?? null)
    setEditingSubject(b?.editingSubject ?? '')
    setScheduleAt(b?.scheduleAt ?? '')
    // Η προεπισκόπηση ξαναχτίζεται από τα νέα μπλοκ· χωρίς καθάρισμα θα
    // έδειχνε για μια στιγμή το ΑΛΛΟ γράμμα, που είναι το ίδιο το μπέρδεμα
    // που θέλουμε να λύσουμε.
    setPreview('')
  }

  const switchKind = (next: 'message' | 'newsletter') => {
    if (next === kind) return
    bench.current[kind] = snapshot()
    restore(bench.current[next])
    setKind(next)
    setNotice(null)
  }

  /**
   * Άνοιγμα υπάρχοντος προσχεδίου στον συνθέτη.
   *
   * Η ΕΠΙΛΟΓΗ παραληπτών έρχεται από το αποθηκευμένο Selection. Αν λείπει
   * (παλιά προσχέδια, ή το πεδίο δεν έχει βγει ακόμη στο Strapi), την
   * ανασυνθέτουμε από τους ΛΥΜΕΝΟΥΣ παραλήπτες: χάνεται το «όλα τα μέλη» ως
   * κανόνας, αλλά κανένας άνθρωπος δεν χάνεται από τη λίστα.
   */
  const openDraft = async (id: string) => {
    setNotice(null)
    try {
      const res = await fetch(`/api/oc/campaigns?id=${encodeURIComponent(id)}&desk=${encodeURIComponent(desk)}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      const c = d.campaign || {}
      // Το προσχέδιο μπορεί να είναι της άλλης πλευράς· ό,τι δουλεύεται εδώ
      // πάει στο ράφι πριν αλλάξει το γραφείο, αλλιώς χάνεται αθόρυβα.
      const opened: 'message' | 'newsletter' = c.Kind === 'newsletter' ? 'newsletter' : 'message'
      if (opened !== kind) bench.current[kind] = snapshot()
      setEditingId(c.documentId || id)
      setEditingSubject(String(c.Subject || ''))
      setSubject(String(c.Subject || ''))
      setBlocks(Array.isArray(c.Blocks) ? c.Blocks : [])
      setCc(Array.isArray(c.Cc) ? c.Cc : [])
      setKind(opened)
      setAudiences(Array.isArray(c.Groups) ? c.Groups : [])
      setFooterStyle(c.FooterStyle || 'signature'); setFooterLook(c.FooterLook || 'plain')
      setFooterLogo(!!c.FooterLogo); setHeaderStyle(c.HeaderStyle || 'coral'); setHeaderLogo(!!c.HeaderLogo)
      // Παλιό προσχέδιο χωρίς αποθηκευμένο υποσέλιδο: πέφτει στα προεπιλεγμένα
      setFooter(c.Footer && typeof c.Footer === 'object' ? (c.Footer as NewsletterFooter) : null)
      if (c.Selection && typeof c.Selection === 'object' && Object.keys(c.Selection).length) {
        setSelection(c.Selection as Selection)
      } else {
        const rs: any[] = Array.isArray(c.Recipients) ? c.Recipients : []
        setSelection({
          memberDocIds: rs.filter(r => r.docId).map(r => r.docId),
          external: rs.filter(r => !r.docId && r.email).map(r => r.email),
        })
      }
      setTab('compose')
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Αποτυχία ανοίγματος' })
    }
  }

  // Το αρχειοθετημένο δεν μετράει σε καμία από τις δύο: ζει στο Αρχείο
  // Το newsletter ανήκει στην Επικοινωνία: εκεί ζουν οι λίστες και τα
  // στατιστικά του Sender. Τα άλλα γραφεία στέλνουν μηνύματα.
  const canNewsletter = canNewsletterFrom(desk)
  /** «Newsletter» στην Επικοινωνία, «Bulk email» στη Διαχείριση — ίδια διαδρομή */
  const BULK = bulkLabel(desk)
  // Πόσοι θα λάβουν το newsletter, από τα μεγέθη των λιστών του Sender
  const newsletterCount = (meta?.newsletterLists || [])
    .filter(l => audiences.includes(l.id))
    .reduce((n, l) => n + (l.count ?? 0), 0)
  const draftCount = campaigns.filter(c => c.State === 'draft' && !c.Archived).length
  const sentCount = campaigns.filter(c => c.State !== 'draft' && !c.Archived).length

  if (loading) return <div className="text-sm text-gray-600 dark:text-gray-400">Φόρτωση…</div>

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-charcoal dark:text-gray-100">Αποστολή email</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Σε έναν παραλήπτη, σε μια ομάδα ή σε όλο το δίκτυο. Το μήνυμα φεύγει από τη θυρίδα
            της έδρας σου{meta?.signer?.email ? ' ' : ''}
            {meta?.signer?.email && (
              <span className="font-semibold" translate="no">{meta.signer.email}</span>
            )}
            {' '}με την ίδια ακριβώς μορφή που έχουν οι αποδείξεις, οι εγκρίσεις και οι
            υπενθυμίσεις του συστήματος.
          </p>
        </div>
        {/* Τρεις καρτέλες, όχι δύο: τα προσχέδια κρύβονταν μέσα στις
            «Αποστολές» και έπρεπε να το μαντέψει κανείς. Χωριστός μετρητής
            σε καθεμία, ώστε να φαίνεται αμέσως τι σε περιμένει. */}
        <div className="flex gap-1 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600" role="tablist">
          {([
            { id: 'compose', label: 'Νέο μήνυμα', n: 0 },
            { id: 'drafts', label: 'Προσχέδια', n: draftCount },
            { id: 'queue', label: 'Αποστολές', n: sentCount },
          ] as const).map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`px-4 min-h-11 rounded-full text-sm font-semibold ${tab === t.id ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-300'}`}>
              {t.label}{t.n ? ` (${t.n})` : ''}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${notice.kind === 'ok'
          ? 'bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200'
          : 'bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200'}`}>{notice.text}</div>
      )}

      {tab === 'compose' && canNewsletter && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600" role="tablist">
            {([
              { id: 'message', label: 'Μήνυμα' },
              { id: 'newsletter', label: BULK },
            ] as const).map(k => (
              <button key={k.id} type="button" role="tab" aria-selected={kind === k.id}
                onClick={() => switchKind(k.id)}
                className={`px-4 min-h-11 rounded-full text-sm font-semibold ${
                  kind === k.id ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-300'}`}>
                {k.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 min-w-0 flex-1">
            {kind === 'message'
              ? 'Σε πρόσωπα, έδρες ή ομάδες. Φεύγει από τη θυρίδα σου, χωρίς σύνδεσμο απεγγραφής.'
              : 'Στις λίστες του Sender. Φέρει υποχρεωτικά σύνδεσμο απεγγραφής και μετρά ανοίγματα.'}
          </p>
        </div>
      )}

      {naming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setNaming(null)}>
          <div className="menu-glass rounded-3xl max-w-md w-full p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-charcoal dark:text-gray-100 mb-1">
              {naming.mode === 'first-save' ? 'Με τι όνομα να αποθηκευτεί;' : 'Όνομα για το διπλότυπο'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {naming.mode === 'first-save'
                ? 'Το όνομα γίνεται και το θέμα του μηνύματος — με αυτό θα το βρίσκεις στα Προσχέδια.'
                : 'Δημιουργείται νέο προσχέδιο με το ίδιο περιεχόμενο. Το πρωτότυπο μένει όπως είναι.'}
            </p>
            <form onSubmit={e => {
              e.preventDefault()
              const value = naming.value.trim()
              if (!value) return
              const { mode, id } = naming
              setNaming(null)
              if (mode === 'duplicate-row' && id) duplicateRow(id, value)
              else send('save', { asName: value, asNew: mode === 'duplicate' })
            }}>
              <input autoFocus value={naming.value}
                onChange={e => setNaming(n => (n ? { ...n, value: e.target.value } : n))}
                placeholder="π.χ. Ενημερωτικό Οκτωβρίου"
                className="w-full rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm mb-4" />
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => setNaming(null)}
                  className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold">
                  Άκυρο
                </button>
                <button type="submit" disabled={!naming.value.trim()}
                  className="px-5 min-h-11 rounded-full bg-coral text-white text-sm font-bold disabled:opacity-50">
                  {naming.mode === 'first-save' ? 'Αποθήκευση' : 'Δημιουργία'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingId && tab === 'compose' && (
        <div className="rounded-2xl px-4 py-3 text-sm flex flex-wrap items-center gap-2 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          <span>
            Επεξεργάζεσαι το προσχέδιο{editingSubject ? ` «${editingSubject}»` : ''} — η αποθήκευση
            ΕΝΗΜΕΡΩΝΕΙ αυτό, δεν φτιάχνει νέο.
          </span>
          <button type="button" onClick={newMessage}
            className="ml-auto px-3 py-1.5 rounded-full border border-amber-400 dark:border-amber-500 font-semibold">
            Νέο μήνυμα
          </button>
        </div>
      )}

      {tab === 'queue' || tab === 'drafts' ? (
        <QueueView campaigns={campaigns} onChanged={load} onEdit={openDraft} mode={tab} bulk={BULK}
          onDuplicate={c => setNaming({
            mode: 'duplicate-row',
            id: c.documentId,
            value: `${(c.Subject || 'Χωρίς θέμα').trim()} — αντίγραφο`,
          })} />
      ) : (
        <section ref={sectionRef}
          style={twoCol && (pv.l || pv.w) ? {
            marginLeft: pv.l ? -pv.l : undefined,
            // Η ΤΡΙΤΗ ΓΡΑΜΜΗ ΤΟΥ ΠΛΕΓΜΑΤΟΣ ΑΚΟΛΟΥΘΕΙ ΤΟ ΠΛΑΤΟΣ.
            // Χωρίς αυτό, το minmax(0,30rem) κρατούσε τη στήλη στα 480 και
            // ό,τι κέρδιζε αριστερά το πλέγμα το ΡΟΥΦΟΥΣΕ η στήλη 1fr του
            // συντάκτη: τα μπλοκ ΦΑΡΔΑΙΝΑΝ αντί να μετακινηθούν.
            gridTemplateColumns: `minmax(0,1fr) auto ${Math.min(pv.w ?? PV_BASE_TRACK, PV_BASE_TRACK + pv.l)}px`,
          } : undefined}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,30rem)] items-start">
          {/* Δύο ξεχωριστοί τρόποι να μεγαλώσει η προεπισκόπηση:
              ΑΡΙΣΤΕΡΑ, όπου ολόκληρος ο συνθέτης μετακινείται στο κενό
              περιθώριο (αρνητικό margin-left) και η γραμμή του πλέγματος
              μεγαλώνει μαζί — τα μπλοκ ΜΕΤΑΚΙΝΟΥΝΤΑΙ, κρατώντας το πλάτος
              τους· και ΔΕΞΙΑ, όπου το aside ξεχειλίζει έξω από τη γραμμή
              του, στο περιθώριο της σελίδας, χωρίς να πειράξει κανέναν. */}
          <div className="grid gap-6 min-w-0">

            <div className={CARD}>
              <h3 className={`${EYEBROW} mb-4`}>ΜΗΝΥΜΑ</h3>
              <div className="grid gap-4">
                {/* Η θυρίδα ΔΕΝ γράφεται εδώ: έρχεται από τη διαδρομή, που τη
                    βγάζει από την ενεργή έδρα (SEAT_MAILBOX). Καρφωμένο hello@
                    θα έλεγε ψέματα σε κάθε άλλη έδρα. */}
                <div className="text-sm flex flex-wrap items-baseline gap-x-2">
                  <span className="text-gray-600 dark:text-gray-400">Από</span>
                  <span className="font-semibold">Culture for Change</span>
                  <span className="text-gray-600 dark:text-gray-400" translate="no">
                    &lt;{meta?.signer?.email || '…'}&gt;
                  </span>
                  {meta?.signer?.name && (
                    <span className="text-gray-600 dark:text-gray-400">
                      · υπογράφει {meta.signer.name}
                      {meta.signer.role ? ` (${meta.signer.role})` : ''}
                    </span>
                  )}
                </div>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold">Θέμα</span>
                  <input value={subject} onChange={e => setSubject(e.target.value)} className={FIELD}
                    placeholder="π.χ. Πρόσκληση σε Γενική Συνέλευση — 12 Οκτωβρίου" />
                </label>
                {meta?.headerStyles && (
                  <div className="grid gap-1.5">
                    <span className="text-sm font-semibold">Κεφαλίδα</span>
                    <div className="flex flex-wrap gap-2">
                      {meta.headerStyles.map(h => (
                        <button key={h.id} type="button" title={h.hint} onClick={() => setHeaderStyle(h.id)}
                          className={`${CHIP} ${headerStyle === h.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                          {h.label}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-1">
                      <input type="checkbox" checked={headerLogo} onChange={e => setHeaderLogo(e.target.checked)}
                        className="accent-coral w-4 h-4" />
                      <span>Με λογότυπο δεξιά από τον τίτλο</span>
                    </label>
                  </div>
                )}

                {/* Το τεύχος δεν υπογράφεται από πρόσωπο: παίρνει το
                    υποσέλιδο του δικτύου, στη θέση ΟΛΗΣ της υπογραφής. */}
                {kind === 'newsletter' && meta?.newsletterFooters && meta.newsletterFooterDefaults && (
                  <NewsletterFooterFields
                    options={meta.newsletterFooters}
                    value={footer || meta.newsletterFooterDefaults}
                    onChange={setFooter}
                  />
                )}

                {kind !== 'newsletter' && meta?.footerStyles && (
                  <div className="grid gap-1.5">
                    <span className="text-sm font-semibold">Υπογραφή</span>
                    <div className="flex flex-wrap gap-2">
                      {meta.footerStyles.map(f => (
                        <button key={f.id} type="button" title={f.hint} onClick={() => setFooterStyle(f.id)}
                          className={`${CHIP} ${footerStyle === f.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {meta.footerLooks && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {meta.footerLooks.map(l => (
                          <button key={l.id} type="button" title={l.hint} onClick={() => setFooterLook(l.id)}
                            className={`${CHIP} ${footerLook === l.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm pt-1">
                      <input type="checkbox" checked={footerLogo} onChange={e => setFooterLogo(e.target.checked)}
                        className="accent-coral w-4 h-4" />
                      <span>Με λογότυπο δεξιά από την υπογραφή</span>
                    </label>
                    {meta.signer && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Υπογράφει: <strong>{meta.signer.name}</strong> · {meta.signer.role} ·{' '}
                        <span translate="no">{meta.signer.email}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {meta && (
              <BlockEditor blocks={blocks} setBlocks={setBlocks} meta={meta} kind={kind}
                onReveal={i => setGoTo(g => ({ i, n: (g?.n ?? 0) + 1 }))} />
            )}

            {kind === 'newsletter' ? (
              <div className={CARD}>
                <h3 className={`${EYEBROW} mb-1`}>ΛΙΣΤΕΣ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {BULK} φεύγει σε ΛΙΣΤΕΣ, ποτέ σε διευθύνσεις που γράφει κάποιος με το χέρι —
                  έτσι δεν φτάνει σε ανθρώπους που δεν το ζήτησαν. Οι λίστες συντηρούνται από τις
                  εγγραφές και τις απεγγραφές.
                </p>
                <NewsletterLists meta={meta} value={audiences} onChange={setAudiences} />
              </div>
            ) : (
              <div className={CARD}>
                <div className="flex flex-wrap items-baseline gap-2 mb-1">
                  <h3 className={EYEBROW}>ΠΑΡΑΛΗΠΤΕΣ</h3>
                  <span className="ml-auto text-sm font-bold tabular-nums" translate="no">{resolved.count}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                  Συνδύασε όσες επιλογές χρειάζεσαι. Κάθε διεύθυνση μετράει μία φορά, όσες ομάδες κι αν την περιλαμβάνουν.
                </p>
                {meta && <RecipientPicker meta={meta} selection={selection} setSelection={setSelection} />}
              </div>
            )}

            <div className={CARD}>
              <h3 className={`${EYEBROW} mb-1`}>ΚΟΙΝΟΠΟΙΗΣΗ (CC)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Η κοινοποίηση μπαίνει σε κάθε μήνυμα χωριστά, άρα κάθε διεύθυνση CC μετράει ξανά στο ημερήσιο όριο.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {CC_SEATS.map(p => {
                  const on = cc.includes(p.email)
                  return (
                    <button key={p.email} type="button" title={p.email}
                      onClick={() => setCc(on ? cc.filter(x => x !== p.email) : [...cc, p.email])}
                      className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600 hover:border-coral'}`}>
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <EmailAdder values={cc} onChange={setCc} placeholder="π.χ. coordination@cultureforchange.net" />
              {cc.length > 0 && resolved.count > 0 && (
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                  {resolved.count} παραλήπτες × {1 + cc.length} = <strong className="tabular-nums">{emailCost}</strong> email
                </p>
              )}
            </div>

            {/* Εμφανίζεται ΜΟΝΟ όταν η αποστολή δεν χωράει σε μία μέρα: για
                τρεις παραλήπτες η εξήγηση του ημερήσιου ορίου είναι θόρυβος. */}
            {meta && emailCost > meta.dailyBudget && (
              <div className={CARD}>
                <h3 className={`${EYEBROW} mb-1`}>ΠΡΟΓΡΑΜΜΑ ΑΠΟΣΤΟΛΗΣ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Ο πάροχος στέλνει έως 100 email την ημέρα. Τα 20 κρατούνται για τα αυτόματα μηνύματα, ώστε μια
                  απόδειξη ή μια έγκριση να μην περιμένει ποτέ. Τα υπόλοιπα {meta.dailyBudget} είναι για τις δικές σου
                  αποστολές.
                </p>
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/25 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                  <strong className="tabular-nums">{emailCost}</strong> email · φεύγουν{' '}
                  <strong className="tabular-nums">{meta.dailyBudget}</strong> τώρα και τα υπόλοιπα σε{' '}
                  {days - 1} {days - 1 === 1 ? 'ημέρα' : 'ημέρες'}, στις 08:15 κάθε πρωί
                </div>
              </div>
            )}

          </div>

          <PositionRail count={blocks.length} cursor={cursor} here={hereSection} onGo={goToPosition} />

          <aside ref={asideRef} className="relative lg:sticky min-w-0"
            style={{ top: PV_STICKY_TOP, ...(twoCol && pv.w ? { width: pv.w } : {}) }}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5 sm:p-6 border border-gray-200 dark:border-gray-600">
              <h3 className={`${EYEBROW} mb-3`}>ΠΡΟΕΠΙΣΚΟΠΗΣΗ</h3>
              {preview ? (
                <PreviewFrame html={preview} onPick={focusBlock} goTo={goTo}
                  height={pv.h} maximized={maximized} onToggleMaximize={toggleMaximize} />
              ) : (
                <div className="h-[32rem] rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 grid place-items-center text-sm text-gray-500">
                  Γράψε θέμα και πρόσθεσε ένα μπλοκ
                </div>
              )}
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Έτσι θα φτάσει. Το email είναι πάντα φωτεινό, ανεξάρτητα από το θέμα του OC.
              </p>
            </div>

            {/* Οι δύο λαβές: στη ΜΕΣΗ της δεξιάς άκρης για πλάτος, στη ΜΕΣΗ
                της κάτω άκρης για ύψος. Διακριτικές αλλά ορατές — αν δεν
                φαίνονται, δεν υπάρχουν. Μόνο σε lg: από κάτω η διάταξη είναι
                μονόστηλη και το πλάτος το ορίζει η οθόνη. */}
            {/* Η ΑΡΙΣΤΕΡΗ λαβή: μεγαλώνει την προεπισκόπηση προς τα αριστερά
                σπρώχνοντας τα μπλοκ του γράμματος στο κενό περιθώριο. */}
            <span role="separator" aria-orientation="vertical" aria-label="Πλάτος προεπισκόπησης προς τα αριστερά"
              tabIndex={0} onPointerDown={dragPreview('l')} onKeyDown={keyPreview('l')}
              className="hidden lg:flex justify-center absolute top-1/2 -left-1 h-16 w-3 -translate-y-1/2 cursor-ew-resize touch-none group"
              style={{ touchAction: 'none' }}>
              <span className="block h-full w-1 rounded-full bg-coral/40 group-hover:bg-coral group-focus-visible:bg-coral transition-colors" aria-hidden="true" />
            </span>
            <span role="separator" aria-orientation="vertical" aria-label="Αλλαγή πλάτους προεπισκόπησης"
              tabIndex={0} onPointerDown={dragPreview('w')} onKeyDown={keyPreview('w')}
              className="hidden lg:flex justify-center absolute top-1/2 -right-1 h-16 w-3 -translate-y-1/2 cursor-ew-resize touch-none group"
              style={{ touchAction: 'none' }}>
              <span className="block h-full w-1 rounded-full bg-coral/40 group-hover:bg-coral group-focus-visible:bg-coral transition-colors" aria-hidden="true" />
            </span>
            <span role="separator" aria-orientation="horizontal" aria-label="Αλλαγή ύψους προεπισκόπησης"
              tabIndex={0} onPointerDown={dragPreview('h')} onKeyDown={keyPreview('h')}
              className="hidden lg:flex items-center absolute left-1/2 -bottom-1 w-16 h-3 -translate-x-1/2 cursor-ns-resize touch-none group"
              style={{ touchAction: 'none' }}>
              <span className="block w-full h-1 rounded-full bg-coral/40 group-hover:bg-coral group-focus-visible:bg-coral transition-colors" aria-hidden="true" />
            </span>
          </aside>
        </section>
      )}

      {/* Η γραμμή αποστολής αιωρείται λίγο πάνω από την άκρη, με στρογγυλές
          γωνίες όπως κάθε άλλη επιφάνεια της ταυτότητας — όχι κολλημένη
          λωρίδα από άκρη σε άκρη. rounded-2xl και όχι rounded-full: σε στενή
          οθόνη τα κουμπιά τυλίγονται σε δεύτερη σειρά και ένα χάπι θα έσπαγε. */}
      {tab === 'compose' && (
        <div className="flex flex-wrap items-center gap-3 sticky bottom-3 z-30 mt-2 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white/95 dark:bg-gray-800/95 backdrop-blur px-4 py-3 shadow-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {kind === 'newsletter'
              ? (audiences.length ? `${audiences.length === 2 ? 'Μέλη και Κοινό' : audiences[0] === 'paid' ? 'Μέλη' : 'Κοινό'}` : 'Καμία λίστα')
              : (resolved.summary || 'Κανένας παραλήπτης')}
          </span>
          {(
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Προγραμματισμός</span>
              <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
                title="Άφησέ το κενό για άμεση αποστολή"
                className="h-11 px-3 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm" />
              {scheduleAt && (
                <button type="button" onClick={() => setScheduleAt('')}
                  className="text-xs underline text-gray-600 dark:text-gray-400">άμεσα</button>
              )}
            </label>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" disabled={busy}
              onClick={() => {
                // Πρώτη αποθήκευση νέου προσχεδίου → ζητάμε όνομα. Μετά, σκέτη
                // αποθήκευση: κανείς δεν θέλει να ονοματίζει στο κάθε Ctrl+S.
                if (!editingId) setNaming({ mode: 'first-save', value: subject.trim() })
                else send('save')
              }}
              className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
              Αποθήκευση προσχεδίου
            </button>
            <button type="button" disabled={busy || (blocks.length === 0 && !subject.trim())}
              onClick={() => setNaming({ mode: 'duplicate', value: `${subject.trim() || 'Χωρίς θέμα'} — αντίγραφο` })}
              title="Δημιουργεί ΝΕΟ προσχέδιο με το ίδιο περιεχόμενο. Το τρέχον μένει όπως είναι."
              className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
              Διπλότυπο
            </button>
            {kind === 'newsletter' && (
              <>
                <button type="button" onClick={() => runTest(false)} disabled={busy || blocks.length === 0}
                  title="Γρήγορη δοκιμή στη θυρίδα σου, κυρίως για τη ΔΙΑΤΑΞΗ. Φεύγει από εμάς, όχι από τον Sender: οι σύνδεσμοι παρακολούθησης και η απεγγραφή ΔΕΝ είναι αληθινοί. Για πραγματικούς συνδέσμους, κάνε Τελική δοκιμή."
                  className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
                  Δοκιμή
                </button>
                <button type="button" onClick={() => setFinalTestAsk(true)} disabled={busy || blocks.length === 0}
                  title="Αληθινή αποστολή από τον Sender στη θυρίδα σου: όλοι οι σύνδεσμοι δουλεύουν κανονικά. ΜΗΝ πατήσεις «απεγγραφή» — η απεγγραφή είναι καθολική και δεν αναιρείται."
                  className="px-4 min-h-11 rounded-full border border-coral text-sm font-semibold disabled:opacity-50">
                  Τελική δοκιμή
                </button>
              </>
            )}
            <button type="button" onClick={() => setConfirming(true)}
              disabled={busy || blocks.length === 0 || (kind === 'newsletter' ? audiences.length === 0 : resolved.count === 0)}
              className="px-5 min-h-11 rounded-full bg-coral text-charcoal text-sm font-bold disabled:opacity-50">
              {scheduleAt ? 'Προγραμματισμός…' : 'Αποστολή…'}
            </button>
          </div>
        </div>
      )}

      {finalTestAsk && (
        <ConfirmDialog
          subject={subject} count={1} emailCost={1} days={1} cc={[]} busy={busy}
          recipients={[{ email: meta?.signer?.email || '', name: 'η θυρίδα σου', via: 'seat' }]}
          title="Τελική δοκιμή μέσω Sender"
          body={'Θα φύγει αληθινό γράμμα από τον Sender στη θυρίδα σου, με όλους τους συνδέσμους ενεργούς. '
            + 'ΜΗΝ πατήσεις «απεγγραφή» μέσα στο γράμμα: η απεγγραφή στον Sender είναι καθολική, '
            + 'δεν αναιρείται από εμάς, και η θυρίδα θα σταματήσει να λαμβάνει και το κανονικό newsletter.'}
          confirmLabel="Στείλε την τελική δοκιμή" compact
          onCancel={() => setFinalTestAsk(false)}
          onConfirm={() => runTest(true)}
        />
      )}

      {confirming && kind === 'newsletter' && (
        <ConfirmDialog
          subject={subject} count={newsletterCount} emailCost={newsletterCount} days={1}
          cc={[]} recipients={[]} busy={busy} compact
          title={scheduleAt ? `Προγραμματισμός — ${BULK}` : `Αποστολή — ${BULK}`}
          body={(scheduleAt
            ? `Θα φύγει αυτόματα στις ${new Date(scheduleAt).toLocaleString('el-GR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}, από τον Sender, `
            : 'Θα ξεκινήσει αμέσως η αποστολή από τον Sender, ')
            + `σε ${audiences.length === 2 ? 'Μέλη και Κοινό' : audiences[0] === 'paid' ? 'τα Μέλη' : 'το Κοινό'}. `
            + 'Το γράμμα δεν ανακαλείται. Αν δεν έχεις κάνει Τελική δοκιμή, κάν\' την πρώτα.'}
          confirmLabel={scheduleAt ? 'Προγραμματισμός' : `Αποστολή σε ${newsletterCount}`}
          onCancel={() => setConfirming(false)} onConfirm={sendNewsletter}
        />
      )}

      {confirming && kind !== 'newsletter' && (
        <ConfirmDialog
          subject={subject} count={resolved.count} emailCost={emailCost} days={days}
          cc={cc} recipients={resolved.recipients} busy={busy}
          {...(scheduleAt && {
            title: 'Προγραμματισμός μηνύματος',
            confirmLabel: 'Προγραμματισμός',
            body: `Θα μπει στην ουρά τώρα και θα αρχίσει να φεύγει μετά τις `
              + `${new Date(scheduleAt).toLocaleString('el-GR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. `
              + 'Η ουρά ελέγχεται μία φορά την ημέρα, στις 08:15, οπότε η αποστολή ξεκινά το πρώτο πρωί μετά από αυτή τη στιγμή.',
          })}
          onCancel={() => setConfirming(false)} onConfirm={() => send('queue')}
        />
      )}
    </div>
  )
}

/**
 * Η προεπισκόπηση στο ΠΡΑΓΜΑΤΙΚΟ πλάτος του email, σμικρυμένη ώστε να χωρά.
 *
 * Το γράμμα είναι 600px και στοιβάζει τις δύο στήλες κάτω από τα 620px. Η
 * στήλη της προεπισκόπησης είναι ~480px, οπότε ένα iframe στο πλάτος της
 * έδειχνε ΠΑΝΤΑ τη μορφή κινητού: η «εικόνα αριστερά» φαινόταν από πάνω και
 * έμοιαζε με σφάλμα. Εδώ το iframe έχει σταθερό πλάτος 640px και σμικρύνεται
 * με transform, οπότε βλέπεις τη διάταξη υπολογιστή· ο διακόπτης δείχνει και
 * τη μορφή κινητού, που είναι υπαρκτή και σκόπιμη.
 */
function PreviewFrame({ html, onPick, goTo, height = 520, maximized, onToggleMaximize }: {
  html: string
  onPick?: (i: number) => void
  /** Εντολή «πήγαινε σε αυτό το μπλοκ». Το n αλλάζει σε κάθε κλικ, ώστε δύο
   *  διαδοχικά κλικ στο ΙΔΙΟ μπλοκ να ξαναστείλουν την εντολή. */
  goTo?: { i: number; n: number } | null
  /** Ύψος του ΟΡΑΤΟΥ κουτιού σε px — το ορίζει η λαβή της κάτω άκρης */
  height?: number
  maximized?: boolean
  onToggleMaximize?: () => void
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(1)
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
  const [full, setFull] = useState(false)
  // 680 = κάρτα 640 + τα 12px περιθώρια εκατέρωθεν, με λίγο αέρα. Αν το
  // πλαίσιο ήταν 640, η κάρτα θα ακουμπούσε τις άκρες και η προεπισκόπηση
  // θα έδειχνε στενότερη απ' ό,τι φτάνει στο γραμματοκιβώτιο.
  const frameWidth = mode === 'desktop' ? PREVIEW_DESKTOP_WIDTH : 390

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / frameWidth))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [frameWidth])

  /**
   * Η θέση κύλισης επιβιώνει της ανανέωσης.
   *
   * Κάθε αλλαγή φτιάχνει νέο srcDoc, άρα το πλαίσιο ΞΑΝΑΦΟΡΤΩΝΕΙ και γυρίζει
   * στην κορυφή — δουλεύοντας στο τέλος ενός μεγάλου γράμματος, κάθε πάτημα
   * σε έστελνε πίσω στην αρχή.
   *
   * Δεν μπορούμε να διαβάσουμε το scrollTop απ' έξω: το πλαίσιο τρέχει με
   * allow-scripts ΧΩΡΙΣ allow-same-origin, και σωστά — δεν θέλουμε να αγγίζει
   * τη σελίδα μας. Οπότε το ίδιο μας λέει πού βρίσκεται, και του το δίνουμε
   * πίσω μέσα στο επόμενο έγγραφο.
   */
  const scrollRef = useRef(0)
  useEffect(() => {
    if (!onPick) return
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source !== 'oc-preview') return
      if (Number.isInteger(e.data.index)) onPick(e.data.index)
      if (typeof e.data.scroll === 'number') scrollRef.current = e.data.scroll
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [onPick])

  /**
   * Το έγγραφο με τη «θύμηση» της θέσης.
   *
   * useMemo με εξάρτηση ΜΟΝΟ το html: αν έμπαινε και το scroll, κάθε κύλιση
   * θα άλλαζε το srcDoc και θα ξαναφόρτωνε το πλαίσιο — ακριβώς το πρόβλημα
   * που λύνουμε. Η τιμή διαβάζεται από ref τη στιγμή που αλλάζει το γράμμα.
   */
  const doc = useMemo(() => {
    if (!onPick || !html || !scrollRef.current) return html
    const y = Math.round(scrollRef.current)
    // Επαναφορά σε τρεις στιγμές: οι εικόνες φορτώνουν μετά και μετακινούν
    // το περιεχόμενο, οπότε μία φορά δεν αρκεί.
    const restore = `<script>(function(){var y=${y};function go(){window.scrollTo(0,y)}go();`
      + `addEventListener('load',go);setTimeout(go,120);setTimeout(go,400);})();<\/script>`
    return html.replace('</body>', `${restore}</body>`)
  }, [html, onPick])

  // Ο συνθέτης λέει στο πλαίσιο πού να πάει. Μόνο postMessage — το πλαίσιο
  // τρέχει σε ξένη προέλευση και δεν το αγγίζουμε απευθείας.
  useEffect(() => {
    if (!goTo || !frame.current?.contentWindow) return
    frame.current.contentWindow.postMessage({ source: 'oc-editor', index: goTo.i }, '*')
  }, [goTo])

  // Το ΟΡΑΤΟ κουτί έχει ύψος `height`· το πλαίσιο μέσα του είναι σμικρυμένο
  // κατά `scale`, οπότε για να γεμίσει το κουτί χρειάζεται height/scale δικά
  // του pixel. Φρουρά για scale 0: πριν το πρώτο μέτρημα το πλάτος είναι 0.
  const frameHeight = scale > 0 ? Math.round(height / scale) : height
  return (
    <div>
      <div className="flex gap-1 mb-2 items-center">
        {(['desktop', 'mobile'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              mode === m ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'}`}>
            {m === 'desktop' ? 'Υπολογιστής' : 'Κινητό'}
          </button>
        ))}
        {/* Πλήρης οθόνη: το πλαίσιο των 520px κόβει κάθε γράμμα στη μέση και
            δεν μπορείς να κρίνεις ρυθμό και αποστάσεις από ένα απόσπασμα. */}
        {onToggleMaximize && (
          <button type="button" onClick={onToggleMaximize}
            title={maximized ? 'Πίσω στο κανονικό μέγεθος' : 'Όσο πάει δεξιά και κάτω, μέσα στην οθόνη'}
            className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold border ${
              maximized
                ? 'border-coral bg-coral/10 text-charcoal dark:text-gray-100'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
            {maximized ? 'Σμίκρυνση' : 'Μεγέθυνση'}
          </button>
        )}
        <button type="button" onClick={() => setFull(true)}
          className={`${onToggleMaximize ? '' : 'ml-auto '}px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400`}>
          Πλήρης οθόνη
        </button>
      </div>
      {full && <FullPreview html={html} onClose={() => setFull(false)} />}
      <div ref={wrap} onClick={onPick ? undefined : () => setFull(true)}
        title={onPick ? 'Κλικ σε στοιχείο για επεξεργασία' : 'Κλικ για πλήρη οθόνη'}
        className={`overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-white relative ${onPick ? '' : 'cursor-zoom-in'}`}
        style={{ height }}>
        <iframe ref={frame} title="Προεπισκόπηση" srcDoc={doc}
          sandbox={onPick ? 'allow-scripts' : ''}
          style={{
            width: frameWidth, height: frameHeight, border: 0,
            transform: `scale(${scale})`, transformOrigin: 'top left',
          }} />
      </div>
    </div>
  )
}

/**
 * Οι δύο λίστες του newsletter.
 *
 * Καμία ελεύθερη πληκτρολόγηση εδώ — ούτε καν κρυμμένη. Το μόνο που κάνει ο
 * συντάκτης είναι να διαλέξει λίστα.
 */
function NewsletterLists({ meta, value, onChange }: {
  meta: Meta | null
  value: string[]
  onChange: (v: string[]) => void
}) {
  const lists = meta?.newsletterLists || []
  const total = lists.filter(l => value.includes(l.id)).reduce((n, l) => n + (l.count ?? 0), 0)

  if (!lists.length) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">Οι λίστες δεν φορτώθηκαν.</p>
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {lists.map(l => {
          const on = value.includes(l.id)
          return (
            <button key={l.id} type="button"
              onClick={() => onChange(on ? value.filter(x => x !== l.id) : [...value, l.id])}
              aria-pressed={on}
              className={`text-left p-4 rounded-2xl border transition-colors ${
                on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600 hover:border-coral'}`}>
              <span className="flex items-baseline gap-2">
                <span className="font-bold">{l.label}</span>
                <span className="ml-auto text-lg font-bold tabular-nums" translate="no">
                  {l.count == null ? '—' : l.count}
                </span>
              </span>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">{l.hint}</span>
            </button>
          )
        })}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {value.length === 0
          ? 'Διάλεξε τουλάχιστον μία λίστα.'
          : <>Θα φύγει σε <strong className="tabular-nums" translate="no">{total}</strong> παραλήπτες
            {value.length > 1 && ' — όποιος είναι και στις δύο λίστες θα το λάβει δύο φορές, αν το στείλεις μία φορά και στις δύο.'}</>}
      </p>
    </div>
  )
}

/**
 * Το γράμμα σε πλήρη οθόνη.
 *
 * Δύο πλάτη, εναλλάξ: 640 για υπολογιστή και 390 για κινητό — τα ίδια με τη
 * μικρή προεπισκόπηση, ώστε να μη δείχνει αλλού αλλιώς. Escape κλείνει.
 */
function FullPreview({ html, onClose }: { html: string; onClose: () => void }) {
  const [w, setW] = useState(PREVIEW_DESKTOP_WIDTH)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Το σώμα δεν κυλά από πίσω όσο είναι ανοιχτό
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  /* ΠΥΛΗ ΣΤΟ <body>, και όχι απλώς μεγαλύτερο z-index.
   *
   * Η προεπισκόπηση ζει μέσα στο <aside className="lg:sticky"> της δεξιάς
   * στήλης. Το `position: sticky` φτιάχνει ΜΟΝΟ ΤΟΥ πλαίσιο επιστοίβαξης
   * (stacking context) — χωρίς να χρειάζεται z-index. Άρα το z-[60] του
   * καλύμματος έμενε ΚΛΕΙΔΩΜΕΝΟ μέσα στο aside, και το aside συμμετέχει
   * στο ριζικό πλαίσιο με z-index: auto. Η κύρια πλοήγηση (fixed z-50)
   * ζωγραφιζόταν πάνω από ΟΛΟΚΛΗΡΟ το υποδέντρο του aside, όσο ψηλό
   * z-index κι αν έβαζες εδώ μέσα.
   *
   * Δύο συμπτώματα, μία αιτία: η κεφαλίδα σκέπαζε τη λωρίδα εργαλείων και
   * έτρωγε τα κλικ στο «Κλείσιμο» — ενώ το Escape δούλευε, επειδή το
   * πληκτρολόγιο δεν περνά από έλεγχο θέσης (hit-test).
   *
   * Με την πύλη το κάλυμμα γίνεται παιδί του <body>, στο ριζικό πλαίσιο,
   * όπου το z-[60] νικά πραγματικά το z-50 της πλοήγησης.
   */
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/70 flex flex-col" role="dialog" aria-modal="true" aria-label="Προεπισκόπηση σε πλήρη οθόνη">
      <div className="flex items-center gap-2 p-3">
        {[[PREVIEW_DESKTOP_WIDTH, 'Υπολογιστής'], [390, 'Κινητό']].map(([px, label]) => (
          <button key={px as number} type="button" onClick={() => setW(px as number)}
            className={`px-3 min-h-11 rounded-full text-sm font-semibold ${
              w === px ? 'bg-coral text-charcoal' : 'bg-white/10 text-white'}`}>
            {label as string}
          </button>
        ))}
        <button type="button" onClick={onClose}
          className="ml-auto px-4 min-h-11 rounded-full bg-white text-charcoal text-sm font-bold">
          Κλείσιμο
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <iframe title="Προεπισκόπηση πλήρους οθόνης" srcDoc={html} sandbox=""
          className="mx-auto bg-white rounded-2xl"
          style={{ width: w, maxWidth: '100%', height: '100%', minHeight: '80vh', border: 0 }} />
      </div>
    </div>,
    document.body,
  )
}

// ── Ο επεξεργαστής μπλοκ ────────────────────────────────────────────────────

/**
 * Το είδος του νέου μπλοκ ταξιδεύει στο dataTransfer.
 *
 * Έτσι η λίστα ξεχωρίζει το «νέο στοιχείο από την παλέτα» (εισαγωγή) από τη
 * «μετακίνηση υπάρχοντος» (αναδιάταξη) — δύο κινήσεις που μοιάζουν ίδιες στο
 * χέρι αλλά κάνουν εντελώς διαφορετικά πράγματα.
 */
const BLOCK_DND = 'application/x-oc-block'

/**
 * Ο κάθετος ολισθητήρας θέσης, ανάμεσα στα στοιχεία και την προεπισκόπηση.
 *
 * Κινεί ΚΑΙ ΤΑ ΔΥΟ μαζί: κυλά τη λίστα των στοιχείων και στέλνει την ίδια
 * θέση στην προεπισκόπηση. Δεν τα κλειδώνει όμως — η ανεξάρτητη κύλιση σε
 * καθένα συνεχίζει να δουλεύει, και όταν κυλήσεις με το χέρι ο δείκτης
 * ακολουθεί, ώστε η λαβή να μη λέει ψέματα για το πού βρίσκεσαι.
 *
 * Κάθετο input[type=range] μέσω `writing-mode` — ο τυποποιημένος τρόπος. Το
 * παλιό `-webkit-appearance:slider-vertical` ΔΕΝ μπαίνει: βάζει το ελάχιστο
 * κάτω, δηλαδή ανάποδα, και τα δύο μαζί δίνουν διαφορετική φορά ανά browser.
 */
function PositionRail({ count, cursor, here, onGo }: {
  count: number; cursor: number; here: string; onGo: (i: number) => void
}) {
  /**
   * Χωρίς ράγα μένει ΚΕΝΟ ΚΕΛΙ, δεν εξαφανίζεται το παιδί.
   *
   * Το πλέγμα έχει τρεις στήλες. Με δύο μόνο παιδιά, η προεπισκόπηση έπεφτε
   * στη μεσαία στήλη — την `auto` — και έπαιρνε το πλάτος του περιεχομένου
   * της, στραγγαλίζοντας τη στήλη των στοιχείων σε μια λωρίδα. Το αρνητικό
   * περιθώριο ακυρώνει το ένα από τα δύο κενά που αφήνει ένα μηδενικό κελί.
   */
  /**
   * Από ΔΥΟ κομμάτια και πάνω.
   *
   * Το όριο ήταν πέντε, με το τεύχος στο μυαλό. Ένα απλό μήνυμα σπάνια έχει
   * τόσα, οπότε η ράγα δεν εμφανιζόταν ποτέ εκεί — ενώ και με τρία κομμάτια
   * το «πήγαινε στο τέλος» γλιτώνει κύλιση. Με ένα μόνο κομμάτι ο
   * ολισθητήρας δεν έχει πού να πάει (min === max) και θα ήταν νεκρό κουμπί.
   */
  if (count < 2) return <div aria-hidden="true" className="hidden lg:block w-0 lg:-mx-3" />
  const at = Math.min(Math.max(cursor, 0), count - 1)
  const step = (
    <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400">{at + 1}/{count}</span>
  )
  return (
    <div className="hidden lg:flex sticky flex-col items-center gap-2 py-3 px-1 rounded-full border border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 backdrop-blur"
      style={{ top: PV_STICKY_TOP }}>
      <button type="button" onClick={() => onGo(0)} title="Στην αρχή του γράμματος" aria-label="Στην αρχή του γράμματος"
        className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">⤒</button>
      <input type="range" min={0} max={count - 1} value={at}
        onChange={e => onGo(Number(e.target.value))}
        aria-label="Θέση στο γράμμα"
        title={here ? `${at + 1}/${count} · ${here}` : `${at + 1}/${count}`}
        className="oc-vrange accent-coral cursor-pointer" />
      <button type="button" onClick={() => onGo(count - 1)} title="Στο τέλος του γράμματος" aria-label="Στο τέλος του γράμματος"
        className="w-7 h-7 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">⤓</button>
      {step}
    </div>
  )
}

/** Η σειρά της παλέτας ανήκει στον συντάκτη, όχι στο προσχέδιο */
const PALETTE_ORDER_KEY = 'oc-palette-order'

/**
 * Το υποσέλιδο του τεύχους.
 *
 * Επτά διατάξεις του ίδιου υλικού, και δίπλα τους τα κείμενα που αλλάζουν
 * πραγματικά: τα δικαιώματα (η χρονιά), το σημείωμα GDPR, η θυρίδα και η
 * γραμμή απεγγραφής. Τα κοινωνικά δίκτυα είναι σταθερά τέσσερα — αλλάζει
 * μόνο η διεύθυνση, και όποιο μείνει κενό δεν εμφανίζεται.
 */
function NewsletterFooterFields({ options, value, onChange }: {
  options: Array<{ id: string; label: string; hint: string }>
  value: NewsletterFooter
  onChange: (v: NewsletterFooter) => void
}) {
  const set = (p: Partial<NewsletterFooter>) => onChange({ ...value, ...p })
  const socials = value.socials || []
  const setSocial = (i: number, href: string) =>
    set({ socials: socials.map((s, j) => (j === i ? { ...s, href } : s)) })

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold">Υποσέλιδο τεύχους</span>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.id} type="button" title={o.hint} onClick={() => set({ arrangement: o.id as NewsletterFooter['arrangement'] })}
            className={`${CHIP} ${value.arrangement === o.id ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
            {o.label}
          </button>
        ))}
      </div>

      <label className="grid gap-1 pt-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">Δικαιώματα</span>
        <input value={value.copyright} onChange={e => set({ copyright: e.target.value })} className={IN} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">Γιατί το λαμβάνουν (σημείωμα GDPR)</span>
        <textarea value={value.notice} onChange={e => set({ notice: e.target.value })} rows={4}
          className={`${IN} py-2 min-h-0 resize-y`} />
      </label>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">Θυρίδα επικοινωνίας</span>
          <input value={value.email} onChange={e => set({ email: e.target.value })} className={IN} translate="no" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">Γραμμή απεγγραφής</span>
          <input value={value.unsubscribeLead} onChange={e => set({ unsubscribeLead: e.target.value })} className={IN} />
        </label>
      </div>

      <details className="pt-1">
        <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">Σύνδεσμοι κοινωνικών δικτύων</summary>
        <div className="grid gap-2 pt-2">
          {socials.map((s, i) => (
            <label key={s.network} className="grid gap-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">{s.network}</span>
              <input value={s.href} onChange={e => setSocial(i, e.target.value)} className={IN}
                placeholder="Άφησέ το κενό για να μην εμφανιστεί" translate="no" />
            </label>
          ))}
        </div>
      </details>
    </div>
  )
}

function BlockEditor({ blocks, setBlocks, meta, kind, onReveal }: {
  blocks: Block[]; setBlocks: (b: Block[]) => void; meta: Meta
  /** Τα έτοιμα σχέδια διαφέρουν: του μηνύματος δεν ταιριάζουν σε newsletter */
  kind: 'message' | 'newsletter'
  /** Ζητά από την προεπισκόπηση να δείξει αυτό το μπλοκ */
  onReveal?: (i: number) => void
}) {
  // Σύρσιμο για αναδιάταξη. Τα βελάκια μένουν: είναι ο μόνος τρόπος με
  // πληκτρολόγιο, και το σύρσιμο δεν δουλεύει σε κάθε συσκευή.
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  /** Το σύρσιμο έρχεται από την παλέτα — δηλαδή ΠΡΟΣΘΕΤΕΙ, δεν μεταφέρει */
  const [adding, setAdding] = useState(false)

  /** Το `to` είναι θέση ΠΡΙΝ από το μπλοκ i· το blocks.length σημαίνει «στο τέλος» */
  const over = (e: React.DragEvent, i: number) => {
    const fromPalette = e.dataTransfer.types.includes(BLOCK_DND)
    if (dragFrom === null && !fromPalette) return
    e.preventDefault()
    setDragOver(i)
    setAdding(dragFrom === null && fromPalette)
  }
  const insertAt = (at: number, type: string) => {
    const next = [...blocks]
    next.splice(at, 0, newBlock(type, meta.tocDefaultTitle))
    setBlocks(next)
    // Η επιλογή κρατιέται σε ΔΕΙΚΤΕΣ: ό,τι ήταν από τη θέση `at` και κάτω
    // μόλις μετακινήθηκε μία θέση — χωρίς αυτό η επιλογή έδειχνε αλλού.
    setSelected(s => s.map(i => (i >= at ? i + 1 : i)))
    setPickerAt(null)
    onReveal?.(at)
  }
  const drop = (e: React.DragEvent, to: number) => {
    e.preventDefault()
    const type = e.dataTransfer.getData(BLOCK_DND)
    setDragOver(null); setAdding(false)
    if (type && dragFrom === null) { insertAt(to, type); return }
    if (dragFrom === null || dragFrom === to) { setDragFrom(null); return }
    apply(moveGroupTo(blocks, group(dragFrom), to))
    setDragFrom(null)
  }
  const dropZone = (i: number) =>
    dragOver === i && (adding || (dragFrom !== null && dragFrom !== i))

  /** Ποιος «+» έχει ανοιχτή τη λίστα στοιχείων — ένας κάθε φορά */
  const [pickerAt, setPickerAt] = useState<number | null>(null)

  /**
   * Η σειρά της παλέτας — ΜΙΑ, για όλες τις λίστες.
   *
   * Τα chip εμφανίζονται σε δύο σημεία (στο «+» ανάμεσα στα μπλοκ και στο
   * κουτί στο τέλος). Αν η κάθε λίστα κρατούσε δική της σειρά, το σύρσιμο
   * στη μία δεν θα φαινόταν στην άλλη και ο συντάκτης θα τις ρύθμιζε δύο
   * φορές. Γι' αυτό η σειρά ζει εδώ, ψηλότερα και από τις δύο.
   */
  const [paletteOrder, setPaletteOrder] = useState<string[]>([])
  // Διαβάζεται ΜΕΤΑ την πρώτη απόδοση: στον server δεν υπάρχει localStorage
  // και μια διαφορετική πρώτη εικόνα θα έσπαγε την ενυδάτωση.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PALETTE_ORDER_KEY)
      const v = raw ? JSON.parse(raw) : null
      if (Array.isArray(v)) setPaletteOrder(v.filter((x: unknown) => typeof x === 'string'))
    } catch { /* ιδιωτικό παράθυρο ή κλειδωμένη αποθήκευση — μένει η φυσική σειρά */ }
  }, [])
  const paletteTypes = useMemo(
    () => mergePaletteOrder(paletteOrder, Object.keys(meta.blockLabels)),
    [paletteOrder, meta.blockLabels],
  )
  const [chipFrom, setChipFrom] = useState<string | null>(null)
  const reorderChip = (target: string) => {
    if (!chipFrom) return
    const next = movePaletteChip(paletteTypes, chipFrom, target)
    setPaletteOrder(next)
    setChipFrom(null)
    try { localStorage.setItem(PALETTE_ORDER_KEY, JSON.stringify(next)) } catch { /* ισχύει τουλάχιστον για τη συνεδρία */ }
  }

  /** Τα ίδια chip, στις δύο λίστες — αλλάζει μόνο πού προσγειώνεται το κλικ */
  const paletteChips = (onPick: (type: string) => void) => (
    <div className="flex flex-wrap gap-2">
      {paletteTypes.map(type => (
        <button key={type} type="button" draggable
          onDragStart={e => {
            setChipFrom(type)
            e.dataTransfer.setData(BLOCK_DND, type)
            e.dataTransfer.effectAllowed = 'copyMove'
          }}
          onDragEnd={() => setChipFrom(null)}
          onDragOver={e => { if (chipFrom) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
          // ΧΩΡΙΣ stopPropagation το ίδιο αφήσιμο θα μετρούσε και ως πτώση
          // στη γραμμή «+» από κάτω: θα άλλαζε η σειρά ΚΑΙ θα προστίθετο μπλοκ.
          onDrop={e => { if (!chipFrom) return; e.preventDefault(); e.stopPropagation(); reorderChip(type) }}
          onClick={() => onPick(type)}
          title={`${meta.blockLabels[type]} — κλικ για προσθήκη · σύρσιμο στη λίστα για θέση · σύρσιμο πάνω σε άλλο chip για σειρά`}
          className={`${CHIP} cursor-grab active:cursor-grabbing border-gray-300 dark:border-gray-600 hover:border-coral bg-white dark:bg-gray-800 ${
            chipFrom === type ? 'opacity-50' : ''}`}>
          {meta.blockLabels[type]}
        </button>
      ))}
    </div>
  )


  /**
   * Η γραμμή ανάμεσα σε δύο μπλοκ: και κουμπί «+» και στόχος για σύρσιμο.
   *
   * Με 85 μπλοκ, το «πρόσθεσε στο τέλος και ανέβασέ το» ήταν εξήντα πατήματα.
   * Εδώ η θέση επιλέγεται ΠΡΩΤΗ και το στοιχείο γεννιέται ήδη στη θέση του.
   * Μένει αχνό ώσπου να το πλησιάσεις — αλλά ορατό, όχι κρυφό σε hover: σε
   * οθόνη αφής το hover δεν υπάρχει καθόλου.
   */
  const inserter = (at: number) => {
    const open = pickerAt === at
    const hot = dropZone(at)
    return (
      <div
        onDragOver={e => over(e, at)}
        onDragLeave={() => setDragOver(o => (o === at ? null : o))}
        onDrop={e => drop(e, at)}
        className={`group relative ${open ? 'z-10' : ''}`}>
        <div className={`flex items-center gap-2 h-7 transition-opacity ${
          hot || open ? 'opacity-100' : 'opacity-45 group-hover:opacity-100 focus-within:opacity-100'}`}>
          <span className={`h-px flex-1 ${hot ? 'bg-coral' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <button type="button"
            onClick={() => setPickerAt(p => (p === at ? null : at))}
            aria-expanded={open}
            aria-label={at === 0 ? 'Πρόσθεσε στοιχείο στην αρχή'
              : at >= blocks.length ? 'Πρόσθεσε στοιχείο στο τέλος' : 'Πρόσθεσε στοιχείο εδώ'}
            title={hot ? 'Άφησέ το εδώ' : 'Πρόσθεσε στοιχείο εδώ'}
            className={`w-6 h-6 shrink-0 rounded-full border text-base leading-none grid place-items-center transition-colors ${
              open || hot
                ? 'border-coral bg-coral text-charcoal'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-coral hover:text-coral'
            }`}>
            <span aria-hidden="true" className="-mt-0.5">+</span>
          </button>
          <span className={`h-px flex-1 ${hot ? 'bg-coral' : 'bg-gray-300 dark:bg-gray-600'}`} />
        </div>
        {open && (
          <div
            onKeyDown={e => { if (e.key === 'Escape') setPickerAt(null) }}
            className="my-2 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 shadow-lg">
            <div className="flex items-baseline gap-2 mb-3">
              <h4 className={EYEBROW}>ΣΤΟΙΧΕΙΑ ΠΡΟΣ ΠΡΟΣΘΗΚΗ</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {at === 0 ? 'στην αρχή' : at >= blocks.length ? 'στο τέλος' : `πριν από το «${meta.blockLabels[blocks[at]?.type] || blocks[at]?.type}»`}
              </span>
              <button type="button" onClick={() => setPickerAt(null)}
                aria-label="Κλείσιμο" className="ml-auto text-sm text-gray-500 hover:text-coral">✕</button>
            </div>
            {paletteChips(type => insertAt(at, type))}
          </div>
        )}
      </div>
    )
  }
  const update = (i: number, patch: Record<string, any>) =>
    setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)))

  /**
   * Πολλαπλή επιλογή.
   *
   * Κλικ στην κεφαλίδα ενός μπλοκ το επιλέγει· τα βελάκια και το σύρσιμο
   * κινούν ΟΛΑ τα επιλεγμένα μαζί. Χωρίς αυτό, η αναδιάταξη μιας ενότητας
   * τεσσάρων στοιχείων ήταν δεκαέξι πατήματα.
   *
   * Η επιλογή κρατιέται σε δείκτες, όχι σε αντικείμενα: τα μπλοκ είναι απλά
   * JSON χωρίς ταυτότητα, και δύο ίδια μπλοκ θα ήταν αδιάκριτα.
   */
  const [selected, setSelected] = useState<number[]>([])
  const isSel = (i: number) => selected.includes(i)
  const toggleSel = (i: number) =>
    setSelected(s => (s.includes(i) ? s.filter(x => x !== i) : [...s, i]))

  /** Ποια μπλοκ κινούνται: η επιλογή αν το πατημένο ανήκει σε αυτήν, αλλιώς μόνο του */
  const group = (i: number) => (isSel(i) && selected.length ? selected : [i])

  const apply = (r: { items: Block[]; selection: number[] }) => {
    setBlocks(r.items)
    setSelected(selected.length ? r.selection : [])
  }
  const move = (i: number, d: -1 | 1) =>
    apply(d === -1 ? moveUp(blocks, group(i)) : moveDown(blocks, group(i)))
  const toBottom = (i: number) => apply(moveToBottom(blocks, group(i)))

  /**
   * Απόκρυψη/εμφάνιση για ΟΛΑ τα επιλεγμένα.
   *
   * Όλα παίρνουν την ίδια κατάσταση — του μπλοκ που πατήθηκε — αντί να
   * αναστρέφεται το καθένα χωριστά. Με ανάμεικτη επιλογή, η εναλλαγή ανά
   * στοιχείο θα άφηνε άλλα κρυφά και άλλα ορατά, δηλαδή ακριβώς το
   * μπέρδεμα που ήθελες να ξεμπερδέψεις.
   */
  /**
   * Διαγραφή — ενός ή όλων των επιλεγμένων.
   *
   * Για ΠΟΛΛΑ ρωτάει πρώτα: το μεμονωμένο ✕ αναιρείται με ένα ξανα-πρόσθεσε,
   * αλλά τέσσερα στοιχεία με κείμενο και εικόνες δεν ξαναγράφονται εύκολα.
   * Το μονό μένει άμεσο — μια επιβεβαίωση σε κάθε διαγραφή θα ήταν τροχοπέδη.
   */
  const removeBlocks = (i: number) => {
    const ids = group(i)
    if (ids.length > 1 && !confirm(`Να διαγραφούν και τα ${ids.length} επιλεγμένα στοιχεία;`)) return
    setBlocks(blocks.filter((_, j) => !ids.includes(j)))
    setSelected([])
  }

  const toggleHidden = (i: number) => {
    const ids = group(i)
    const next = !blocks[i]?.hidden
    setBlocks(blocks.map((b, j) => (ids.includes(j) ? { ...b, hidden: next } : b)))
  }

  const [copying, setCopying] = useState<number | null>(null)

  /**
   * Διπλασιασμός μπλοκ.
   *
   * ΚΑΘΕ αντίγραφο παίρνει ΔΙΚΟ ΤΟΥ αρχείο στη Βιβλιοθήκη, όχι το ίδιο
   * mediaId: αλλιώς δύο μπλοκ θα μοιράζονταν έναν φάκελο και το «Αφαίρεση»
   * στο ένα θα άφηνε το άλλο με σπασμένη εικόνα — και στα γραμματοκιβώτια
   * όσων το έλαβαν, αν είχε ήδη σταλεί.
   *
   * Αν η αντιγραφή αποτύχει, το αντίγραφο κρατά τη διεύθυνση αλλά ΧΑΝΕΙ το
   * mediaId: γίνεται «εξωτερικός σύνδεσμος», που δεν διαγράφεται ποτέ. Το
   * χειρότερο αποτέλεσμα είναι ένα αρχείο παραπάνω, όχι μια σβησμένη εικόνα.
   */
  const duplicate = async (i: number) => {
    const ids = group(i)
    setCopying(i)
    try {
      const clones: Block[] = []
      for (const id of ids) {
        const clone: Block = JSON.parse(JSON.stringify(blocks[id]))
        const jobs: Array<{ node: any; idKey: string; srcKey: string }> = []
        const walk = (v: any) => {
          if (Array.isArray(v)) { v.forEach(walk); return }
          if (!v || typeof v !== 'object') return
          if (Number.isInteger(v.mediaId) && v.src) jobs.push({ node: v, idKey: 'mediaId', srcKey: 'src' })
          if (Number.isInteger(v.origMediaId) && v.origSrc) jobs.push({ node: v, idKey: 'origMediaId', srcKey: 'origSrc' })
          Object.values(v).forEach(walk)
        }
        walk(clone)
        for (const j of jobs) {
          try {
            const res = await fetch('/api/oc/campaigns/image', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'copy', src: j.node[j.srcKey] }),
            })
            if (!res.ok) throw new Error('copy failed')
            const d = await res.json()
            j.node[j.idKey] = d.id
            j.node[j.srcKey] = d.url
          } catch {
            // Αποτυχία αντιγραφής: το αντίγραφο κρατά τη διεύθυνση αλλά χάνει
            // το mediaId — γίνεται εξωτερικός σύνδεσμος που δεν διαγράφεται ποτέ
            j.node[j.idKey] = undefined
          }
        }
        clones.push(clone)
      }
      // Τα αντίγραφα μπαίνουν ΜΕΤΑ το τελευταίο επιλεγμένο, με τη σειρά τους
      const after = Math.max(...ids)
      const next = [...blocks]
      next.splice(after + 1, 0, ...clones)
      setBlocks(next)
      // Η επιλογή ακολουθεί τα ΑΝΤΙΓΡΑΦΑ — συνήθως αυτά θέλεις να πειράξεις
      setSelected(ids.length > 1 ? clones.map((_, n) => after + 1 + n) : [])
    } finally { setCopying(null) }
  }

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-baseline gap-2 mb-1">
        <h3 className={EYEBROW}>ΣΩΜΑ ΜΗΝΥΜΑΤΟΣ</h3>
        <span className="ml-auto text-sm text-gray-600 dark:text-gray-400 tabular-nums">
          {blocks.filter(b => !b.hidden).length} μπλοκ
          {blocks.some(b => b.hidden) && ` · ${blocks.filter(b => b.hidden).length} κρυφά`}
        </span>
        {selected.length > 0 && (
          <button type="button" onClick={() => setSelected([])}
            className="text-sm text-coral dark:text-coral-light underline">
            {selected.length} επιλεγμένα — καθάρισε την επιλογή
          </button>
        )}
        {blocks.length > 0 && (
          <button type="button"
            onClick={() => { if (confirm('Να αφαιρεθούν και τα ' + blocks.length + ' μπλοκ;')) { setBlocks([]); setSelected([]) } }}
            className="text-sm text-red-700 dark:text-red-300 underline">Καθαρισμός όλων</button>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Η γραμματοσειρά, τα χρώματα και οι αποστάσεις είναι της ταυτότητας και δεν αλλάζουν. Εσύ διαλέγεις
        στοιχεία και παραλλαγές.
      </p>

      {blocks.length === 0 && (
        <div className="grid gap-2 mb-4">
          <span className="text-sm font-semibold">Ξεκίνα από ένα έτοιμο σχέδιο</span>
          <div className="flex flex-wrap gap-2">
            {(kind === 'newsletter' ? (meta.newsletterPresets || []) : meta.presets).map(p => (
              <button key={p.id} type="button" onClick={() => setBlocks(structuredClone(p.blocks))}
                title={p.hint}
                className={`${CHIP} border-gray-300 dark:border-gray-600 hover:border-coral`}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-0">
        {blocks.map((b, i) => (
          <Fragment key={i}>
          {inserter(i)}
          <div id={`oc-block-${i}`} data-block-index={i}
            onDragOver={e => over(e, i)}
            onDragLeave={() => setDragOver(o => (o === i ? null : o))}
            onDrop={e => drop(e, i)}
            className={`rounded-2xl border p-3 transition-colors ${b.hidden ? 'opacity-55' : ''} ${
              isSel(i) ? 'ring-2 ring-coral ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ' : ''}${
              dropZone(i)
                ? 'border-coral border-2 bg-coral/5'
                : 'border-gray-200 dark:border-gray-600'
            } ${dragFrom === i ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap items-center gap-2 mb-2 cursor-pointer"
              onClick={e => {
                // Μόνο η κενή περιοχή της κεφαλίδας επιλέγει — όχι τα κουμπιά
                // ή το select της παραλλαγής
                if ((e.target as HTMLElement).closest('button, select, input, a')) return
                toggleSel(i)
                onReveal?.(i)
              }}
              title="Κλικ για επιλογή — τα βελάκια κινούν όλα τα επιλεγμένα μαζί">
              <span draggable
                onDragStart={e => {
                  setDragFrom(i)
                  // Χωρίς φορτίο ο Firefox δεν ξεκινά καν το σύρσιμο. Το
                  // text/plain είναι αδιάφορο — αρκεί που υπάρχει, και ΔΕΝ
                  // είναι το BLOCK_DND, ώστε να μη μοιάσει με νέο στοιχείο.
                  e.dataTransfer.setData('text/plain', String(i))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null); setAdding(false) }}
                title="Σύρε για αναδιάταξη" aria-hidden="true"
                className="cursor-grab active:cursor-grabbing select-none px-1 text-gray-400 hover:text-coral">⠿</span>
              <span className="text-xs font-bold tracking-wider text-coral">{meta.blockLabels[b.type] || b.type}</span>
              {b.hidden && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  ΚΡΥΦΟ — δεν στέλνεται
                </span>
              )}
              {meta.blockVariants[b.type] && (
                <select value={b[meta.blockVariants[b.type].key] ?? meta.blockVariants[b.type].options[0].value}
                  onChange={e => update(i, { [meta.blockVariants[b.type].key]: e.target.value })}
                  className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1">
                  {meta.blockVariants[b.type].options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => move(i, -1)} aria-label="Πάνω"
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">↑</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Κάτω"
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">↓</button>
                {/* Στο τέλος όλων, χωρίς κύλιση ως εκεί — κυρίως μετά από
                    διπλασιασμό, όπου το αντίγραφο γεννιέται δίπλα στο πρωτότυπο */}
                <button type="button" onClick={() => toBottom(i)} aria-label="Στο τέλος όλων"
                  title="Στο τέλος όλων"
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">⤓</button>
                {/* Απόκρυψη: το στοιχείο μένει στο προσχέδιο αλλά ΔΕΝ φεύγει.
                    Ούτε στην προεπισκόπηση ούτε στο γράμμα — αλλιώς θα
                    ενέκρινες ό,τι βλέπεις και θα έφευγε κάτι άλλο. */}
                <button type="button" onClick={() => toggleHidden(i)}
                  aria-pressed={!!b.hidden}
                  aria-label={b.hidden ? 'Εμφάνιση στοιχείου' : 'Απόκρυψη στοιχείου'}
                  title={isSel(i) && selected.length > 1
                    ? `Απόκρυψη/εμφάνιση και για τα ${selected.length} επιλεγμένα`
                    : (b.hidden ? 'Κρυφό — δεν θα σταλεί. Κλικ για εμφάνιση.' : 'Απόκρυψη — μένει στο προσχέδιο αλλά δεν στέλνεται')}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                  {b.hidden ? '🙈' : '👁'}
                </button>
                <button type="button" onClick={() => duplicate(i)} disabled={copying !== null}
                  aria-label="Διπλασιασμός" title="Διπλασιασμός"
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">
                  {copying === i ? '…' : '⧉'}
                </button>
                <button type="button" onClick={() => removeBlocks(i)}
                  aria-label={isSel(i) && selected.length > 1 ? `Διαγραφή ${selected.length} στοιχείων` : 'Διαγραφή'}
                  title={isSel(i) && selected.length > 1 ? `Διαγραφή και των ${selected.length} επιλεγμένων` : 'Διαγραφή'}
                  className="w-8 h-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300">✕</button>
              </div>
            </div>
            <BlockFields block={b} onChange={p => update(i, p)} tocDefault={meta.tocDefaultTitle} />
          </div>
          </Fragment>
        ))}
        {/* Η τελευταία θέση. Τα μπλοκ δέχονται πτώση «πριν από εμένα», οπότε
            χωρίς αυτήν δεν υπήρχε τρόπος να αφήσεις κάτι στο τέλος — και με
            άδεια λίστα δεν υπήρχε κανένας στόχος καθόλου. */}
        {inserter(blocks.length)}
      </div>

      {/* Η παλέτα μένει ΑΝΟΙΧΤΗ. Πίσω από ένα «+ Προσθήκη στοιχείου» τα
          στοιχεία ήταν αόρατα: έπρεπε να θυμάσαι ότι υπάρχουν και τι είναι.
          Τα chip σύρονται κιόλας: κλικ = στο τέλος, σύρσιμο = στη θέση που θες. */}
      <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 bg-gray-50/60 dark:bg-gray-900/40">
        <h4 className={`${EYEBROW} mb-3`}>ΣΤΟΙΧΕΙΑ ΠΡΟΣ ΠΡΟΣΘΗΚΗ</h4>
        {paletteChips(type => insertAt(blocks.length, type))}
      </div>

      <details className="mt-4">
        <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">Πεδία που συμπληρώνονται ανά παραλήπτη</summary>
        <div className="flex flex-wrap gap-2 mt-2">
          {meta.mergeFields.map(f => (
            <code key={f.token} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-900" translate="no">
              {f.token} <span className="text-gray-500">→ {f.sample}</span>
            </code>
          ))}
        </div>
      </details>
    </div>
  )
}

function newBlock(type: string, tocDefault = ''): Block {
  switch (type) {
    // Μοντέρνα εξ ορισμού: είναι η μορφή που ήδη χρησιμοποιεί το μηνιαίο τεύχος
    case 'section': return { type, title: 'Τίτλος ενότητας', variant: 'modern', look: 'coral', logo: true, logoSide: 'left' }
    case 'text': return { type, html: '' }
    case 'image': return { type, src: '', alt: '', size: 'full', align: 'center', band: 'none' }
    case 'imageText': return { type, src: '', alt: '', html: '', side: 'left', size: 'medium', band: 'none', valign: 'top' }
    case 'card': return { type, title: '', html: '', imgPos: 'top', imgSize: 'full', imgAlign: 'center', tone: 'cream', width: 'inset' }
    case 'person': return { type, name: '', role: '', html: '' }
    case 'logos': return { type, items: [] }
    case 'attachment': return { type, items: [] }
    // Προσυμπληρωμένος, ώστε να φαίνεται τι θα δει ο παραλήπτης αν δεν αλλάξει τίποτα
    case 'toc': return { type, title: tocDefault }
    case 'greeting': return { type, html: '<p>Αγαπητό μέλος,</p>' }
    case 'grid': return { type, cols: '2', items: [{ title: '', html: '' }, { title: '', html: '' }] }
    case 'agenda': return { type, rows: [{ date: '', title: '', place: '' }] }
    case 'quote': return { type, html: '', who: '', tone: 'cream' }
    case 'stats': return { type, items: [{ value: '', label: '' }, { value: '', label: '' }] }
    case 'social': return { type, items: [
      { network: 'Facebook', href: '' }, { network: 'Instagram', href: '' }, { network: 'LinkedIn', href: '' },
    ] }
    case 'spacer': return { type, size: 'medium' }
    case 'browserView': return { type, tone: 'white', text: 'Δεν εμφανίζεται σωστά αυτό το μήνυμα;', linkText: 'Δες το στον browser' }
    case 'masthead': return {
      type, layout: 'textTop', tone: 'coral', withImage: true, imageSize: 'medium',
      eyebrow: 'CforC — Community Journal', title: '', src: '', alt: '',
    }
    case 'button': return { type, label: '', href: '' }
    case 'box': return { type, title: '', html: '', tone: 'cream' }
    case 'divider': return { type, style: 'line' }
    case 'amounts': return { type, rows: [{ label: '', amount: '' }] }
    case 'mono': return { type, label: '', value: '', look: 'cream' }
    default: return { type }
  }
}

const IN = 'w-full min-h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm'

function BlockFields({ block: b, onChange, tocDefault = '' }: {
  block: Block; onChange: (p: Record<string, any>) => void; tocDefault?: string
}) {
  const rich = (label: string, key = 'html') => (
    <div className="grid gap-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <CampaignRichText value={b[key] || ''} onChange={v => onChange({ [key]: v })} />
    </div>
  )
  const line = (label: string, key: string, placeholder = '') => (
    <label className="grid gap-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <input value={b[key] || ''} onChange={e => onChange({ [key]: e.target.value })} className={IN} placeholder={placeholder} />
    </label>
  )

  switch (b.type) {
    case 'section': return (
      <div className="grid gap-3">
        {line('Τίτλος', 'title')}
        <Choice label="Μορφή" value={b.variant || 'modern'} onChange={v => onChange({ variant: v })}
          options={[{ value: 'modern', label: 'Μοντέρνα ζώνη' }, { value: 'classic', label: 'Κλασική γραμμή' }]} />
        {(b.variant || 'modern') === 'modern' && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={b.logo !== false}
                onChange={e => onChange({ logo: e.target.checked })} className="accent-coral w-4 h-4" />
              <span>Με το σήμα CforC</span>
            </label>
            {b.logo !== false && (
              <Choice label="Θέση σήματος" value={b.logoSide || 'left'} onChange={v => onChange({ logoSide: v })}
                options={[{ value: 'left', label: 'Αριστερά' }, { value: 'right', label: 'Δεξιά' }]} />
            )}
          </>
        )}
      </div>
    )
    case 'text': return rich('Κείμενο')
    case 'divider': return null
    case 'image': return (
      <div className="grid gap-3">
        <ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId}
          branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />
        {/* Η στοίχιση έχει νόημα μόνο όταν η εικόνα δεν γεμίζει το πλάτος */}
        {(b.size || 'full') !== 'full' && (
          <Choice label="Στοίχιση" value={b.align || 'center'} onChange={v => onChange({ align: v })}
            options={[
              { value: 'left', label: 'Αριστερά' }, { value: 'center', label: 'Κέντρο' }, { value: 'right', label: 'Δεξιά' },
            ]} />
        )}
        <Choice label="Ζώνη φόντου (πλήρες πλάτος)" value={b.band || 'none'} onChange={v => onChange({ band: v })}
          options={[
            { value: 'none', label: 'Καμία' }, { value: 'coral', label: 'Coral' },
            { value: 'dark', label: 'Σκούρα' }, { value: 'cream', label: 'Κρεμ' },
            { value: 'tint', label: 'Απαλό coral' },
          ]} />
        {line('Σύνδεσμος στον οποίο οδηγεί (προαιρετικό)', 'href')}
      </div>
    )
    case 'imageText': return (
      <div className="grid gap-3">
        <ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId}
          branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />
        <Choice label="Μέγεθος φωτογραφίας" value={b.size || 'medium'} onChange={v => onChange({ size: v })}
          options={[
            { value: 'small', label: 'Μικρή' }, { value: 'medium', label: 'Μεσαία' }, { value: 'large', label: 'Μεγάλη' },
          ]} />
        <Choice label="Ευθυγράμμιση κειμένου" value={b.valign || 'top'} onChange={v => onChange({ valign: v })}
          options={[{ value: 'top', label: 'Πάνω' }, { value: 'middle', label: 'Στο κέντρο' }]} />
        <Choice label="Ζώνη φόντου (πλήρες πλάτος)" value={b.band || 'none'} onChange={v => onChange({ band: v })}
          options={[
            { value: 'none', label: 'Καμία' }, { value: 'coral', label: 'Coral' },
            { value: 'dark', label: 'Σκούρα' }, { value: 'cream', label: 'Κρεμ' },
            { value: 'tint', label: 'Απαλό coral' },
          ]} />
        {rich('Κείμενο δίπλα')}
        {line('Σύνδεσμος στον οποίο οδηγεί η εικόνα (προαιρετικό)', 'href')}
      </div>
    )
    case 'card': {
      const pos = b.imgPos || 'top'
      const stacked = pos === 'top' || pos === 'bottom'
      return (
        <div className="grid gap-3">
          {line('Τίτλος', 'title')}
          {rich('Κείμενο')}
          <ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId}
            branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />
          {/* Χωρίς φωτογραφία οι επιλογές θέσης δεν έχουν τι να τοποθετήσουν */}
          {b.src && (
            <>
              <Choice label="Μέγεθος εικόνας" value={b.imgSize || 'full'} onChange={v => onChange({ imgSize: v })}
                options={stacked
                  ? [
                    { value: 'full', label: 'Πλήρες πλάτος' }, { value: 'large', label: 'Μεγάλη' },
                    { value: 'medium', label: 'Μεσαία' }, { value: 'small', label: 'Μικρή' },
                  ]
                  : [
                    { value: 'large', label: 'Μεγάλη' }, { value: 'medium', label: 'Μεσαία' },
                    { value: 'small', label: 'Μικρή' },
                  ]} />
              {/* Η στοίχιση έχει νόημα μόνο όταν η εικόνα δεν γεμίζει την κάρτα */}
              {stacked && (b.imgSize || 'full') !== 'full' && (
                <Choice label="Στοίχιση" value={b.imgAlign || 'center'} onChange={v => onChange({ imgAlign: v })}
                  options={[
                    { value: 'left', label: 'Αριστερά' }, { value: 'center', label: 'Κέντρο' }, { value: 'right', label: 'Δεξιά' },
                  ]} />
              )}
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Η θέση της εικόνας αλλάζει από το μενού πάνω δεξιά στο στοιχείο.
              </p>
            </>
          )}
          <Choice label="Φόντο" value={b.tone || 'cream'} onChange={v => onChange({ tone: v })}
            options={[
              { value: 'cream', label: 'Κρεμ (ως τώρα)' }, { value: 'coral', label: 'Coral' },
              { value: 'tint', label: 'Απαλό coral' }, { value: 'dark', label: 'Σκούρο' },
              { value: 'white', label: 'Λευκό με περίγραμμα' }, { value: 'none', label: 'Χωρίς φόντο' },
            ]} />
          <Choice label="Πλάτος" value={b.width || 'inset'} onChange={v => onChange({ width: v })}
            options={[
              { value: 'inset', label: 'Ένθετη (ως τώρα)' }, { value: 'full', label: 'Ζώνη πλήρους πλάτους' },
            ]} />
          {line('Κουμπί — ετικέτα', 'buttonLabel')}
          {line('Κουμπί — σύνδεσμος', 'buttonHref')}
        </div>
      )
    }
    case 'person': return <div className="grid gap-2">{line('Όνομα', 'name')}{line('Ιδιότητα', 'role')}<ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId} branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />{rich('Κείμενο')}</div>
    case 'button': return <div className="grid gap-2">{line('Ετικέτα', 'label')}{line('Σύνδεσμος', 'href', 'https://…')}</div>
    case 'box': return <div className="grid gap-2">{line('Τίτλος (προαιρετικό)', 'title')}{rich('Κείμενο')}</div>
    case 'mono': return <div className="grid gap-2">{line('Ετικέτα', 'label', 'π.χ. IBAN')}{line('Τιμή', 'value')}</div>
    case 'logos': return <LogosFields items={b.items || []} onChange={items => onChange({ items })} />
    case 'attachment': return <AttachmentFields items={b.items || []} note={b.note || ''} onChange={onChange} />
    case 'amounts': return <AmountsFields rows={b.rows || []} total={b.total || ''} onChange={onChange} />
    case 'greeting': return rich('Χαιρετισμός')
    case 'browserView': return (
      <div className="grid gap-2">
        {line('Κείμενο', 'text')}
        {line('Κείμενο συνδέσμου', 'linkText')}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Ο σύνδεσμος δείχνει στο τεύχος μέσα στον ιστότοπό μας και μπαίνει αυτόματα τη στιγμή
          της αποστολής — στην προεπισκόπηση είναι ανενεργός.
        </p>
      </div>
    )
    case 'masthead': return (
      <div className="grid gap-3">
        {line('Μικρός τίτλος από πάνω', 'eyebrow', 'CforC — Community Journal')}
        {line('Τίτλος', 'title', 'ΣΕΠΤΕΜΒΡΙΟΣ 2026')}

        {/* Χωριστοί άξονες: διάταξη (στο select του μπλοκ), χρώμα, εικόνα.
            Παλιά ήταν ένα «style» που τα έδενε μαζί, οπότε «σκούρα με εικόνα
            πρώτα» ήταν αδύνατο. */}
        <Choice label="Χρώμα ζώνης" value={b.tone || 'coral'} onChange={v => onChange({ tone: v })}
          options={[
            { value: 'coral', label: 'Coral' }, { value: 'dark', label: 'Σκούρο' },
            { value: 'cream', label: 'Κρεμ' }, { value: 'white', label: 'Λευκό' },
          ]} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={b.withImage !== false}
            onChange={e => onChange({ withImage: e.target.checked })} className="accent-coral w-4 h-4" />
          <span>Με φωτογραφία</span>
        </label>

        {b.withImage !== false && (
          <>
            <Choice label="Μέγεθος φωτογραφίας" value={b.imageSize || 'medium'} onChange={v => onChange({ imageSize: v })}
              options={[
                { value: 'small', label: 'Μικρή' }, { value: 'medium', label: 'Μεσαία' }, { value: 'large', label: 'Μεγάλη' },
              ]} />
            <ImageField src={b.src || ''} alt={b.alt || ''} mediaId={b.mediaId}
              branded={b.branded} origSrc={b.origSrc} origMediaId={b.origMediaId} onChange={onChange} />
          </>
        )}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Οι τίτλοι γράφονται κεφαλαίοι αυτόματα, χωρίς τόνους. Η φωτογραφία είναι πάντα
          στρογγυλεμένη — ταυτότητα, όχι επιλογή.
        </p>
      </div>
    )
    case 'spacer': return null
    case 'quote': return <div className="grid gap-2">{rich('Απόσπασμα')}{line('Ποιος το είπε', 'who', 'π.χ. Μαρία Κ., μέλος')}</div>
    case 'stats': return <RepeatFields rows={b.items || []} onChange={v => onChange({ items: v })}
      blank={{ value: '', label: '' }} addLabel="+ Αριθμός"
      cols={[{ key: 'value', ph: '139', width: 'max-w-28' }, { key: 'label', ph: 'μέλη' }]} />
    case 'agenda': return <RepeatFields rows={b.rows || []} onChange={v => onChange({ rows: v })}
      blank={{ date: '', title: '', place: '', href: '' }} addLabel="+ Γεγονός"
      cols={[
        { key: 'date', ph: '12 Οκτ', width: 'max-w-32' },
        { key: 'title', ph: 'Τίτλος' },
        { key: 'place', ph: 'Τόπος', width: 'max-w-40' },
        { key: 'href', ph: 'Σύνδεσμος (προαιρετικό)', width: 'max-w-56' },
      ]} />
    case 'social': return <RepeatFields rows={b.items || []} onChange={v => onChange({ items: v })}
      blank={{ network: '', href: '' }} addLabel="+ Δίκτυο"
      cols={[{ key: 'network', ph: 'Facebook', width: 'max-w-40' }, { key: 'href', ph: 'https://…' }]} />
    case 'grid': return <GridFields items={b.items || []} onChange={onChange} />
    case 'toc': return (
      <div className="grid gap-1">
        {line('Τίτλος', 'title', tocDefault)}
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Χτίζεται αυτόματα από τις ενότητες (επικεφαλίδες ενότητας) του μηνύματος.
        </p>
      </div>
    )
    default: return null
  }
}

/**
 * Εικόνα: από τον υπολογιστή ή με σύνδεσμο.
 *
 * Το ανέβασμα κρατά και το `mediaId`, γιατί χωρίς αυτό δεν ξέρουμε τι να
 * σβήσουμε αργότερα. Μια εικόνα με σκέτο σύνδεσμο (εξωτερική) ΔΕΝ σβήνεται —
 * δεν είναι δική μας.
 */
function ImageField({ src, alt, mediaId, branded, origSrc, origMediaId, onChange }: {
  src: string; alt: string; mediaId?: number
  branded?: 'light' | 'dark'; origSrc?: string; origMediaId?: number
  onChange: (p: Record<string, any>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [branding, setBranding] = useState(false)
  const [err, setErr] = useState('')
  /** Κρατιέται αρχείο πάνω από το πλαίσιο; */
  const [hovering, setHovering] = useState(false)
  /** Μόλις έγινε αντικατάσταση — το λέει για λίγο και σβήνει */
  const [swapped, setSwapped] = useState(false)
  // Το χρονόμετρο ακυρώνεται στην αποσύνδεση: αλλιώς μια δεύτερη
  // αντικατάσταση θα έσβηνε το μήνυμα της πρώτης στη μέση.
  const swapTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(swapTimer.current), [])

  /**
   * Το σήμα δημιουργεί ΝΕΟ αρχείο και κρατά το πρωτότυπο, ώστε το ξετικάρισμα
   * να επιστρέφει ακριβώς ό,τι ανέβηκε αντί για μια δεύτερη επεξεργασία.
   */
  const setBrand = async (tone: 'none' | 'light' | 'dark') => {
    if ((branded || 'none') === tone) return
    setErr(''); setBranding(true)
    try {
      // Πάντα ξεκινάμε από το ΠΡΩΤΟΤΥΠΟ: αλλιώς το λευκό πάνω στο μαύρο θα
      // έβαζε δύο σήματα στην ίδια εικόνα.
      const source = origSrc || src
      const sourceId = origSrc ? origMediaId : mediaId
      const stale = origSrc ? mediaId : undefined

      if (tone === 'none') {
        onChange({ src: source, mediaId: sourceId, branded: undefined, origSrc: undefined, origMediaId: undefined })
      } else {
        const res = await fetch('/api/oc/campaigns/image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src: source, tone }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
        onChange({ src: d.url, mediaId: d.id, branded: tone, origSrc: source, origMediaId: sourceId })
      }
      if (stale) await fetch(`/api/oc/campaigns/image?id=${stale}`, { method: 'DELETE' }).catch(() => {})
    } catch (e: any) { setErr(e?.message || 'Αποτυχία') } finally { setBranding(false) }
  }

  /**
   * Ό,τι έρχεται από Finder ή Explorer.
   *
   * Το είδος ελέγχεται ΕΔΩ και όχι μόνο στον server: ένα PDF ή ένας φάκελος
   * που πέφτει κατά λάθος πρέπει να το πει αμέσως, όχι μετά από ανέβασμα.
   */
  const accept = (list: FileList | null) => {
    const f = list?.[0]
    if (!f) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) {
      setErr('Μόνο εικόνες — PNG, JPG, WEBP ή GIF')
      return
    }
    upload(f)
  }

  const upload = async (f: File) => {
    setBusy(true); setErr('')
    // Τα παλιά αρχεία σημειώνονται ΠΡΙΝ αντικατασταθούν — μετά δεν υπάρχει
    // τρόπος να τα βρει κανείς, και μένουν για πάντα στη Βιβλιοθήκη.
    const stale = [mediaId, origMediaId].filter((x): x is number => Number.isInteger(x))
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch('/api/oc/campaigns/image', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία ανεβάσματος')
      onChange({
        src: d.url, mediaId: d.id, alt: alt || d.name.replace(/\.[a-z]+$/i, ''),
        // ΠΡΕΠΕΙ να καθαρίσουν: αλλιώς η νέα φωτογραφία κληρονομεί το σήμα
        // της προηγούμενης, και το «Χωρίς σήμα» θα επανέφερε ΤΗΝ ΠΑΛΙΑ εικόνα.
        branded: undefined, origSrc: undefined, origMediaId: undefined,
      })
      if (src) {
        setSwapped(true)
        window.clearTimeout(swapTimer.current)
        swapTimer.current = window.setTimeout(() => setSwapped(false), 3000)
      }
      // Καλύτερης προσπάθειας: η διαδρομή αρνείται να σβήσει αρχείο που
      // χρησιμοποιεί σταλμένο μήνυμα, και αυτό είναι το σωστό.
      for (const id of stale) {
        await fetch(`/api/oc/campaigns/image?id=${id}`, { method: 'DELETE' }).catch(() => {})
      }
    } catch (e: any) { setErr(e?.message || 'Αποτυχία') } finally { setBusy(false) }
  }

  const remove = async () => {
    setErr('')
    if (mediaId) {
      // Σβήνεται και από τη Βιβλιοθήκη — εκτός αν τη χρησιμοποιεί σταλμένο μήνυμα
      const res = await fetch(`/api/oc/campaigns/image?id=${mediaId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setErr(d?.error || 'Η εικόνα δεν διαγράφηκε από τη Βιβλιοθήκη')
      }
    }
    onChange({ src: '', mediaId: undefined })
  }

  const hasFiles = (dt: DataTransfer | null) => !!dt && Array.from(dt.types).includes('Files')

  return (
    <div
      onDragOver={e => {
        if (!hasFiles(e.dataTransfer)) return
        // Χωρίς stopPropagation το ίδιο σύρσιμο θα το χρέωνε και η γραμμή «+»
        // από κάτω, που θα φώτιζε σαν να πρόκειται να μπει νέο μπλοκ.
        e.preventDefault(); e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
        setHovering(true)
      }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovering(false) }}
      onDrop={e => {
        if (!hasFiles(e.dataTransfer)) return
        e.preventDefault(); e.stopPropagation()
        setHovering(false)
        accept(e.dataTransfer.files)
      }}
      // Σταθερό περίγραμμα και περιθώριο, ΜΟΝΟ το χρώμα αλλάζει: αν το
      // πλαίσιο εμφανιζόταν μόνο στο hover, όλη η φόρμα θα αναπηδούσε τη
      // στιγμή που κρατάς ένα αρχείο από πάνω.
      className={`grid gap-2 rounded-xl border-2 border-dashed p-2 -m-2 transition-colors ${
        hovering ? 'border-coral bg-coral/5' : 'border-transparent'}`}>
      {src ? (
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt=""
              className={`w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 transition-opacity ${
                hovering || busy ? 'opacity-30' : ''}`} />
            {/* Η αντικατάσταση φαίνεται ΠΑΝΩ στη μικρογραφία — εκεί κοιτάς
                όταν κρατάς το αρχείο, όχι σε ένα μήνυμα δίπλα. */}
            {(hovering || busy) && (
              <span className="absolute inset-0 grid place-items-center rounded-lg border-2 border-dashed border-coral bg-white/75 dark:bg-gray-900/75 px-1 text-center text-[10px] font-bold leading-tight text-coral">
                {busy ? 'Ανεβαίνει…' : 'Αντικατάσταση'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 grid gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate" translate="no">{src}</span>
            <span className="text-xs text-gray-500">{mediaId ? 'Στη Βιβλιοθήκη Πολυμέσων' : 'Εξωτερικός σύνδεσμος'}</span>
            {hovering && <span className="text-xs font-semibold text-coral">Άφησέ την εδώ για αντικατάσταση</span>}
            {busy && <span className="text-xs font-semibold text-coral">Ανεβαίνει η νέα εικόνα…</span>}
            {swapped && !busy && <span className="text-xs font-semibold text-coral">Η εικόνα αντικαταστάθηκε</span>}
          </div>
          <button type="button" onClick={remove} disabled={busy}
            className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 text-red-700 dark:text-red-300 disabled:opacity-40">Αφαίρεση</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
            onChange={e => { accept(e.target.files); e.target.value = '' }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
            {busy ? 'Ανεβαίνει…' : 'Από τον υπολογιστή'}
          </button>
          <span className="text-xs text-gray-500">
            {hovering ? 'Άφησέ την εδώ' : 'ή σύρε ένα αρχείο εδώ · ή'}
          </span>
          <input value={src} onChange={e => onChange({ src: e.target.value, mediaId: undefined })}
            className={`flex-1 min-w-40 ${IN}`} placeholder="https://… σύνδεσμος εικόνας" translate="no" />
        </div>
      )}
      {src && (
        <div className="grid gap-1.5">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Σήμα CforC κάτω δεξιά — ενσωματώνεται μέσα στην εικόνα, γιατί τα email δεν υποστηρίζουν επικάλυψη
          </span>
          <div className="flex flex-wrap gap-2">
            {([
              { v: 'none', label: 'Χωρίς σήμα' },
              { v: 'dark', label: 'Μαύρο σήμα' },
              { v: 'light', label: 'Λευκό σήμα' },
            ] as const).map(o => (
              <button key={o.v} type="button" disabled={branding}
                onClick={() => setBrand(o.v)}
                className={`${CHIP} disabled:opacity-50 ${
                  (branded || 'none') === o.v ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                {o.label}
              </button>
            ))}
            {branding && <span className="text-xs text-gray-500 self-center">Εφαρμόζεται…</span>}
          </div>
        </div>
      )}
      <label className="grid gap-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">Εναλλακτικό κείμενο — διαβάζεται όταν η εικόνα δεν φορτώνει</span>
        <input value={alt} onChange={e => onChange({ alt: e.target.value })} className={IN} />
      </label>
      {err && <p className="text-sm text-red-700 dark:text-red-300">{err}</p>}
    </div>
  )
}

function LogosFields({ items, onChange }: {
  items: Array<{ src: string; alt: string; mediaId?: number }>
  onChange: (v: any[]) => void
}) {
  const set = (i: number, patch: Record<string, any>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-600 p-2 grid gap-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* Ίδιο πεδίο με τις υπόλοιπες εικόνες: ανέβασμα ή σύνδεσμος */}
              <ImageField src={it.src || ''} alt={it.alt || ''} mediaId={it.mediaId}
                onChange={p => set(i, p)} />
            </div>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Αφαίρεση λογοτύπου"
              className="px-3 py-1.5 rounded-lg text-red-700 dark:text-red-300">✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { src: '', alt: '' }])}
        className="justify-self-start px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600">
        + Λογότυπο
      </button>
    </div>
  )
}

/**
 * Συνημμένα.
 *
 * Η ΛΙΣΤΑ ΤΩΝ ΔΕΚΤΩΝ ΤΥΠΩΝ ζει ΚΑΙ στη διαδρομή — εκεί είναι το φράγμα, εδώ
 * είναι η διευκόλυνση του διαλόγου αρχείων. Αν διαφωνήσουν, κερδίζει η
 * διαδρομή: ο χρήστης θα δει μήνυμα αντί για σιωπηλή αποτυχία.
 */
const ATTACH_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'text/csv', 'text/plain', 'image/png', 'image/jpeg',
].join(',')

function AttachmentFields({ items, note, onChange }: {
  items: Array<{ name: string; url: string; size: number; ext?: string; id?: string }>
  note: string
  onChange: (p: any) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const add = async (f: File) => {
    setErr(''); setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch('/api/oc/campaigns/file', { method: 'POST', body: fd })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.error || 'Το αρχείο δεν ανέβηκε')
      onChange({ items: [...items, { name: j.name, url: j.url, size: j.size, ext: j.ext, id: j.id }] })
    } catch (e: any) {
      setErr(e?.message || 'Το αρχείο δεν ανέβηκε')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2">
          <span className="flex-1 min-w-0">
            <span className="block truncate font-semibold text-charcoal dark:text-gray-100">{it.name}</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
              {(it.ext || '').toUpperCase()} · {fileSizeLabel(it.size)}
            </span>
          </span>
          <button type="button" onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}
            aria-label={`Αφαίρεση ${it.name}`}
            className="px-3 py-1.5 rounded-lg text-red-700 dark:text-red-300">✕</button>
        </div>
      ))}

      <input ref={fileRef} type="file" accept={ATTACH_ACCEPT} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) add(f) }} />
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
        className="justify-self-start px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 disabled:opacity-50">
        {busy ? 'Ανεβαίνει…' : '+ Αρχείο'}
      </button>
      {err && <p className="text-sm text-red-700 dark:text-red-300">{err}</p>}

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-charcoal dark:text-gray-100">Σημείωση (προαιρετικό)</span>
        <input value={note} onChange={e => onChange({ note: e.target.value })}
          placeholder="π.χ. Το πρακτικό της συνεδρίασης"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
      </label>

      {/* Η διαφορά δεν είναι ρύθμιση που ξέχασε κάποιος — είναι ο πάροχος. */}
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Στο <strong>Μήνυμα</strong> τα αρχεία φεύγουν ως πραγματικά συνημμένα, και ο σύνδεσμος
        μένει ως εφεδρεία. Στο <strong>Newsletter / Bulk email</strong> φεύγουν μόνο ως σύνδεσμοι
        λήψης: ο Sender δεν δέχεται συνημμένα. Όριο 5 MB ανά αρχείο.
      </p>
    </div>
  )
}

function AmountsFields({ rows, total, onChange }: { rows: Array<{ label: string; amount: string }>; total: string; onChange: (p: any) => void }) {
  return (
    <div className="grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <input value={r.label} onChange={e => onChange({ rows: rows.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} className={IN} placeholder="Περιγραφή" />
          <input value={r.amount} onChange={e => onChange({ rows: rows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) })} className={`${IN} max-w-32`} placeholder="35,00 €" />
          <button type="button" onClick={() => onChange({ rows: rows.filter((_, j) => j !== i) })} className="px-3 rounded-lg text-red-700 dark:text-red-300">✕</button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange({ rows: [...rows, { label: '', amount: '' }] })}
          className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600">+ Γραμμή</button>
        <input value={total} onChange={e => onChange({ total: e.target.value })} className={`${IN} max-w-40`} placeholder="Σύνολο" />
      </div>
    </div>
  )
}

/**
 * Επαναλαμβανόμενες γραμμές με απλά πεδία κειμένου.
 *
 * Ένας μηχανισμός για Αριθμούς, Ατζέντα και Κοινωνικά δίκτυα, αντί για τρεις
 * σχεδόν ίδιους — αλλιώς μια διόρθωση στο ένα ξεχνιέται στα άλλα δύο.
 */
function RepeatFields({ rows, onChange, blank, cols, addLabel }: {
  rows: any[]
  onChange: (rows: any[]) => void
  blank: Record<string, string>
  cols: Array<{ key: string; ph: string; width?: string }>
  addLabel: string
}) {
  const set = (i: number, key: string, v: string) =>
    onChange(rows.map((x, j) => (j === i ? { ...x, [key]: v } : x)))
  return (
    <div className="grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          {cols.map(c => (
            <input key={c.key} value={r[c.key] || ''} onChange={e => set(i, c.key, e.target.value)}
              placeholder={c.ph} translate={c.key === 'href' ? 'no' : undefined}
              className={`${IN} ${c.width || 'flex-1 min-w-32'}`} />
          ))}
          <button type="button" aria-label="Αφαίρεση γραμμής"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="px-3 rounded-lg text-red-700 dark:text-red-300">✕</button>
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange([...rows, { ...blank }])}
          className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600">{addLabel}</button>
      </div>
    </div>
  )
}

/** Σειρά από chips για μία κλειστή επιλογή — ίδια αίσθηση με τα υπόλοιπα */
function Choice({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
            className={`${CHIP} ${value === o.value ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Το πλέγμα: κάθε κελί έχει και εικόνα, οπότε θέλει δικό του πεδίο */
function GridFields({ items, onChange }: { items: any[]; onChange: (p: any) => void }) {
  const set = (i: number, patch: Record<string, any>) =>
    onChange({ items: items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-600 p-3 grid gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Κελί {i + 1}</span>
            <button type="button" aria-label="Αφαίρεση κελιού"
              onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}
              className="ml-auto px-3 rounded-lg text-red-700 dark:text-red-300">✕</button>
          </div>
          <input value={it.title || ''} onChange={e => set(i, { title: e.target.value })} className={IN} placeholder="Τίτλος" />
          <CampaignRichText value={it.html || ''} onChange={v => set(i, { html: v })} placeholder="Σύντομο κείμενο" />
          <input value={it.href || ''} onChange={e => set(i, { href: e.target.value })} className={IN} placeholder="Σύνδεσμος (προαιρετικό)" translate="no" />
          <ImageField src={it.src || ''} alt={it.alt || ''} mediaId={it.mediaId}
            branded={it.branded} origSrc={it.origSrc} origMediaId={it.origMediaId}
            onChange={p => set(i, p)} />
        </div>
      ))}
      <div>
        <button type="button" onClick={() => onChange({ items: [...items, { title: '', html: '' }] })}
          className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600">+ Κελί</button>
      </div>
    </div>
  )
}

// ── Παραλήπτες ──────────────────────────────────────────────────────────────

function RecipientPicker({ meta, selection, setSelection }: { meta: Meta; selection: Selection; setSelection: (s: Selection) => void }) {
  const year = new Date().getFullYear()
  const all = !!selection.allMembers
  const toggleGroup = (g: string) => {
    const cur = selection.groups || []
    setSelection({ ...selection, groups: cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g] })
  }
  const setPay = (paid: boolean | null) =>
    setSelection({ ...selection, paymentStatus: paid === null ? undefined : { year, paid } })

  return (
    <div className="grid gap-5">
      <div>
        <h4 className="text-sm font-semibold mb-2">Έτοιμα κοινά</h4>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map(a => (
            <button key={a.id} type="button" title={a.hint}
              onClick={() => setSelection(a.build(meta))}
              className={`${CHIP} border-gray-300 dark:border-gray-600 hover:border-coral`}>
              {a.label}
              {a.id === 'community' && <span className="tabular-nums text-gray-500">{meta.memberCount}</span>}
            </button>
          ))}
          {(selection.allMembers || selection.seats?.length || selection.groups?.length || selection.paymentStatus || selection.memberDocIds?.length) && (
            <button type="button" onClick={() => setSelection({ external: selection.external })}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 underline">Καθαρισμός</button>
          )}
        </div>
      </div>

      <button type="button" onClick={() => setSelection({ ...selection, allMembers: !all })}
        className={`w-full text-left rounded-2xl border-2 p-4 min-h-11 flex items-center gap-4 ${all ? 'border-coral bg-coral/10' : 'border-gray-200 dark:border-gray-600'}`}>
        <span className="font-semibold">Όλα τα μέλη</span>
        <span className="ml-auto tabular-nums text-sm text-gray-600 dark:text-gray-400">{meta.memberCount}</span>
      </button>

      {all ? (
        <div className="text-sm rounded-xl bg-gray-100 dark:bg-gray-900 px-4 py-3 text-gray-700 dark:text-gray-300">
          Όλα τα μέλη περιλαμβάνονται ήδη. Οι επιλογές κατά πληρωμή, ομάδα ή όνομα δεν προσθέτουν κανέναν —
          πρόσθεσε μόνο εξωτερικές διευθύνσεις αν χρειάζεται.
        </div>
      ) : (
        <div className="grid gap-5">
          <div>
            <h4 className="text-sm font-semibold mb-2">Κατά κατάσταση συνδρομής</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `Απλήρωτοι ${year}`, paid: false },
                { label: `Πληρωμένοι ${year}`, paid: true },
              ].map(o => {
                const on = selection.paymentStatus?.paid === o.paid
                return (
                  <button key={o.label} type="button" onClick={() => setPay(on ? null : o.paid)}
                    className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>{o.label}</button>
                )
              })}
            </div>
          </div>

          {meta.seats && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Κατά έδρα</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Το μήνυμα πάει στη θυρίδα του ρόλου, όχι στο προσωπικό email του κατόχου.
              </p>
              <div className="flex flex-wrap gap-2">
                {meta.seats.map(s => {
                  const on = (selection.seats || []).includes(s.id)
                  return (
                    <button key={s.id} type="button" title={s.email}
                      onClick={() => {
                        const cur = selection.seats || []
                        setSelection({ ...selection, seats: on ? cur.filter(x => x !== s.id) : [...cur, s.id] })
                      }}
                      className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2">Κατά ομάδα εργασίας</h4>
            <div className="flex flex-wrap gap-2">
              {meta.groups.map(g => {
                const on = (selection.groups || []).includes(g)
                return (
                  <button key={g} type="button" onClick={() => toggleGroup(g)}
                    className={`${CHIP} ${on ? 'border-coral bg-coral/10' : 'border-gray-300 dark:border-gray-600'}`}>{g}</button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Συγκεκριμένα μέλη — ΠΑΝΩ από τις εξωτερικές διευθύνσεις: πρώτα το
          μητρώο, μετά ό,τι γράφεται με το χέρι. */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Συγκεκριμένα μέλη</h4>
        <MemberAdder
          people={meta.memberList || []}
          values={selection.memberDocIds || []}
          onChange={v => setSelection({ ...selection, memberDocIds: v })} />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">Εξωτερικές διευθύνσεις</h4>
        <EmailAdder values={selection.external || []} onChange={v => setSelection({ ...selection, external: v })}
          placeholder="όνομα@παράδειγμα.gr" />
      </div>
    </div>
  )
}

/**
 * Επιλογή ΣΥΓΚΕΚΡΙΜΕΝΩΝ μελών από το μητρώο.
 *
 * Κρατά documentId, όχι email: η επίλυση γίνεται στον server (resolveRecipients,
 * via:'individual') και έτσι μια διεύθυνση που αλλάζει στο μητρώο δεν μένει
 * παγωμένη μέσα σε προσχέδιο. Η λίστα δεν ανοίγει ολόκληρη — 114 ονόματα δεν
 * διαβάζονται· γράφεις δύο γράμματα και διαλέγεις.
 */
function MemberAdder({ people, values, onChange }: {
  people: Array<{ docId: string; name: string; am: number | null }>
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [q, setQ] = useState('')
  const byId = useMemo(() => new Map(people.map(p => [p.docId, p])), [people])
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return people
      .filter(p => !values.includes(p.docId))
      .filter(p => p.name.toLowerCase().includes(t) || String(p.am ?? '').includes(t))
      .slice(0, 8)
  }, [q, people, values])

  const add = (docId: string) => { onChange([...values, docId]); setQ('') }

  if (!people.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Ο κατάλογος μελών δεν φορτώθηκε.</p>
  }

  return (
    <div>
      <div className="relative">
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Γράψε όνομα ή ΑΜ…"
          onKeyDown={e => { if (e.key === 'Enter' && matches[0]) { e.preventDefault(); add(matches[0].docId) } }}
          className={`w-full ${FIELD}`} />
        {matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
            {matches.map(p => (
              <li key={p.docId}>
                <button type="button" onClick={() => add(p.docId)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  {p.name}
                  {p.am != null && <span className="ml-2 text-xs text-gray-500 tabular-nums">ΑΜ {p.am}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {values.map(id => (
          <span key={id} className={`${CHIP} border-gray-300 dark:border-gray-600`}>
            {byId.get(id)?.name || id}
            <button type="button" onClick={() => onChange(values.filter(x => x !== id))}
              aria-label={`Αφαίρεση ${byId.get(id)?.name || id}`}
              className="text-gray-500 hover:text-red-600">✕</button>
          </span>
        ))}
      </div>
    </div>
  )
}

function EmailAdder({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const add = () => {
    const v = draft.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr('Μη έγκυρη διεύθυνση'); return }
    if (values.includes(v)) { setErr('Υπάρχει ήδη'); return }
    onChange([...values, v]); setDraft(''); setErr('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input type="email" value={draft} translate="no" placeholder={placeholder}
          onChange={e => { setDraft(e.target.value); setErr('') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className={`flex-1 min-w-0 ${FIELD}`} />
        <button type="button" onClick={add}
          className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700">Προσθήκη</button>
      </div>
      {err && <p className="mt-1.5 text-sm text-red-700 dark:text-red-300">{err}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {values.map(v => (
          <span key={v} className={`${CHIP} border-gray-300 dark:border-gray-600`} translate="no">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} aria-label={`Αφαίρεση ${v}`}
              className="text-gray-500 hover:text-red-600">✕</button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Επιβεβαίωση και ουρά ────────────────────────────────────────────────────

function ConfirmDialog(props: {
  subject: string; count: number; emailCost: number; days: number; cc: string[]
  recipients: Recipient[]; busy: boolean; onCancel: () => void; onConfirm: () => void
  /** Παραλλαγή για τη δοκιμή: δικός της τίτλος, προειδοποίηση και κουμπί */
  title?: string; body?: string; confirmLabel?: string; compact?: boolean
}) {
  const { subject, count, emailCost, days, cc, recipients, busy, onCancel, onConfirm } = props
  const byVia = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of recipients) m.set(r.via, (m.get(r.via) || 0) + 1)
    return [...m.entries()]
  }, [recipients])
  const VIA: Record<string, string> = {
    all: 'όλα τα μέλη', payment: 'κατά συνδρομή', seat: 'θυρίδες εδρών', group: 'κατά ομάδα',
    individual: 'μεμονωμένα', external: 'εξωτερικές',
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-1">{props.title || 'Επιβεβαίωση αποστολής'}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {props.body || <>Το μήνυμα φεύγει σε πραγματικούς ανθρώπους και <strong>δεν ανακαλείται</strong>.</>}
        </p>
        <dl className="grid gap-2 text-sm mb-4">
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Θέμα</dt><dd className="font-semibold min-w-0">{subject || '—'}</dd></div>
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Παραλήπτες</dt><dd className="tabular-nums">{count}</dd></div>
          {cc.length > 0 && <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">CC</dt><dd translate="no">{cc.join(', ')}</dd></div>}
          <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Σύνολο email</dt><dd className="tabular-nums">{emailCost}</dd></div>
          {!props.compact && (
            <div className="flex gap-2"><dt className="text-gray-600 dark:text-gray-400 w-32">Πότε</dt><dd>{days === 1 ? 'με την επόμενη παρτίδα (08:00)' : `σε ${days} ημέρες, από τις 08:00`}</dd></div>
          )}
        </dl>
        {!props.compact && (
          <div className="rounded-2xl bg-gray-100 dark:bg-gray-900 px-4 py-3 text-sm mb-5">
            <div className="font-semibold mb-1">Ποιοι θα το λάβουν</div>
            {byVia.map(([via, n]) => <div key={via} className="text-gray-700 dark:text-gray-300">{n} {VIA[via] || via}</div>)}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={busy}
            className="px-4 min-h-11 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold">Άκυρο</button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className="px-5 min-h-11 rounded-full bg-coral text-charcoal text-sm font-bold disabled:opacity-50">
            {busy ? 'Καταχώριση…' : (props.confirmLabel || `Αποστολή σε ${count}`)}
          </button>
        </div>
      </div>
    </div>
  )
}


/**
 * Το ανοιγμένο περιεχόμενο μιας αποστολής: το ΓΡΑΜΜΑ όπως έφυγε και ΠΟΙΟΙ το
 * έλαβαν. Φορτώνεται με το κλικ, όχι μαζί με τη λίστα: τα μπλοκ και οι
 * παραλήπτες είναι βαριά, και σπάνια τα θέλεις για όλες τις καμπάνιες μαζί.
 */
function CampaignDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [html, setHtml] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/api/oc/campaigns?id=${id}`, { cache: 'no-store' })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
        if (!alive) return
        setData(d.campaign)
        setStats(d.senderStats || null)
        // Το γράμμα ξαναποδίδεται από τα ΑΠΟΘΗΚΕΥΜΕΝΑ μπλοκ και στυλ, οπότε
        // δείχνει ό,τι έφυγε — όχι ό,τι θα έφευγε με τις σημερινές ρυθμίσεις.
        const p = await fetch('/api/oc/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview', subject: d.campaign?.Subject, blocks: d.campaign?.Blocks || [],
            footerStyle: d.campaign?.FooterStyle, footerLook: d.campaign?.FooterLook,
            footerLogo: d.campaign?.FooterLogo, headerStyle: d.campaign?.HeaderStyle,
            headerLogo: d.campaign?.HeaderLogo,
          }),
        })
        if (p.ok && alive) setHtml((await p.json()).html)
      } catch (e: any) { if (alive) setErr(e?.message || 'Αποτυχία') }
    })()
    return () => { alive = false }
  }, [id])

  if (err) return <p className="mt-3 text-sm text-red-700 dark:text-red-300">{err}</p>
  if (!data) return <p className="mt-3 text-sm text-gray-500">Φόρτωση…</p>

  const recipients: any[] = Array.isArray(data.Recipients) ? data.Recipients : []
  const STATUS: Record<string, string> = { sent: 'στάλθηκε', failed: 'απέτυχε', pending: 'εκκρεμεί' }

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div>
        <h4 className={`${EYEBROW} mb-2`}>ΤΟ ΓΡΑΜΜΑ ΟΠΩΣ ΕΦΥΓΕ</h4>
        {html
          ? <PreviewFrame html={html} />
          : <p className="text-sm text-gray-500">Φόρτωση προεπισκόπησης…</p>}
      </div>
      <div className="min-w-0">
        {/* Τα στατιστικά ενός τεύχους έρχονται από τον Sender, όχι από εμάς:
            εκείνος παραδίδει και εκείνος μετράει. Μπαίνουν ΔΙΠΛΑ στο γράμμα
            που αφορούν, αντί να ζουν μόνο στον πίνακα της Επικοινωνίας. */}
        {stats && (
          <div className="mb-5">
            <h4 className={`${EYEBROW} mb-2`}>ΑΠΟΔΟΣΗ</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Στάλθηκαν', value: stats.sent, hint: null },
                { label: 'Ανοίγματα', value: stats.openRate != null ? `${stats.openRate}%` : '—', hint: `${stats.opens} συνολικά` },
                { label: 'Κλικ', value: stats.clickRate != null ? `${stats.clickRate}%` : '—', hint: `${stats.clicks} συνολικά` },
                { label: 'Bounces', value: stats.bounces, hint: null },
              ].map(k => (
                <div key={k.label} className="rounded-2xl border border-gray-200 dark:border-gray-600 px-3 py-2">
                  <div className="text-lg font-bold tabular-nums" translate="no">{k.value}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{k.label}</div>
                  {k.hint && <div className="text-xs text-gray-500" translate="no">{k.hint}</div>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Τα ανοίγματα μετριούνται με εικονοστοιχείο που πολλά γραμματοκιβώτια μπλοκάρουν —
              είναι πάντα υποεκτίμηση. Χρήσιμα ως τάση, όχι ως ακριβές πλήθος.
            </p>
          </div>
        )}
        <h4 className={`${EYEBROW} mb-2`}>ΠΑΡΑΛΗΠΤΕΣ ({recipients.length})</h4>
        {(data.Cc || []).length > 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Κοινοποίηση: <span translate="no">{(data.Cc || []).join(', ')}</span>
          </p>
        )}
        {data.Kind === 'newsletter' && recipients.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Το newsletter φεύγει σε λίστες του Sender
            {Array.isArray(data.Groups) && data.Groups.length
              ? ` (${data.Groups.map((g: string) => g === 'paid' ? 'Μέλη' : 'Κοινό').join(' και ')})`
              : ''} — τους παραλήπτες τους κρατά εκείνος, όχι εμείς.
          </p>
        )}
        <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-700">
          {recipients.map((r, i) => (
            <div key={i} className="px-3 py-2 text-sm flex flex-wrap items-baseline gap-x-2">
              <span className="min-w-0">{r.name}</span>
              <span className="text-xs text-gray-500 min-w-0 truncate" translate="no">{r.email}</span>
              <span className={`ml-auto text-xs ${
                r.status === 'sent' ? 'text-green-700 dark:text-green-300'
                  : r.status === 'failed' ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-500'}`}>
                {STATUS[r.status] || r.status}
                {r.sentAt && ` · ${new Date(r.sentAt).toLocaleString('el-GR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
              </span>
              {r.error && <span className="w-full text-xs text-red-700 dark:text-red-300">{r.error}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QueueView({ campaigns, onChanged, onEdit, onDuplicate, mode, bulk }: {
  campaigns: Campaign[]; onChanged: () => void; onEdit: (id: string) => void
  /** Ανοίγει το παράθυρο ονόματος του γονέα — η αντιγραφή θέλει όνομα πρώτα */
  onDuplicate: (c: Campaign) => void
  /** 'drafts' = ό,τι δεν έχει φύγει ακόμη · 'queue' = ό,τι έφυγε ή φεύγει */
  mode: 'drafts' | 'queue'
  /** Πώς λέγεται η μαζική αποστολή σε ΑΥΤΟ το γραφείο — η λίστα είναι ήδη δική του */
  bulk: string
}) {
  const [box, setBox] = useState<'active' | 'archived'>('active')
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const [q, setQ] = useState('')
  const [state, setState] = useState('all')
  const [author, setAuthor] = useState('all')
  const [period, setPeriod] = useState('all')
  const [onlyFailed, setOnlyFailed] = useState(false)
  const [sort, setSort] = useState('recent')

  // Στα Προσχέδια δεν υπάρχει «Αρχείο»: ένα αρχειοθετημένο προσχέδιο δεν είναι
  // πια δουλειά σε εξέλιξη — βρίσκεται στο Αρχείο των Αποστολών.
  const isDraft = (c: Campaign) => c.State === 'draft'
  const archived = mode === 'drafts' ? false : box === 'archived'
  const inBox = campaigns.filter(c =>
    !!c.Archived === archived && (mode === 'drafts' ? isDraft(c) : !isDraft(c) || !!c.Archived))
  const authors = [...new Set(inBox.map(c => c.CreatedByName).filter(Boolean))] as string[]

  /** Η ημερομηνία που «μετράει» για μια αποστολή: πότε τελείωσε, αλλιώς πότε
   *  μπήκε στην ουρά, αλλιώς η τελευταία αλλαγή. */
  const dateOf = (c: Campaign) =>
    new Date(c.CompletedAt || c.QueuedAt || (c as any).updatedAt || 0).getTime()

  const shown = inBox
    .filter(c => {
      if (mode === 'queue' && state !== 'all' && c.State !== state) return false
      if (author !== 'all' && c.CreatedByName !== author) return false
      if (onlyFailed && !(c.FailedCount > 0)) return false
      if (period !== 'all') {
        const days = period === '7' ? 7 : period === '30' ? 30 : 365
        if (Date.now() - dateOf(c) > days * 86400000) return false
      }
      if (q.trim()) {
        const needle = q.trim().toLowerCase()
        const hay = `${c.Subject} ${c.CreatedByName || ''} ${c.audience || ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sort) {
        case 'oldest': return dateOf(a) - dateOf(b)
        case 'recipients': return (b.TotalCount || 0) - (a.TotalCount || 0)
        case 'failures': return (b.FailedCount || 0) - (a.FailedCount || 0)
        case 'subject': return String(a.Subject).localeCompare(String(b.Subject), 'el')
        default: return dateOf(b) - dateOf(a)
      }
    })

  const archive = async (c: Campaign, archived: boolean) => {
    setBusy(c.documentId); setErr('')
    try {
      const res = await fetch('/api/oc/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', id: c.documentId, archived }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Αποτυχία')
      await onChanged()
    } catch (e: any) { setErr(e?.message || 'Αποτυχία') } finally { setBusy(null) }
  }

  const remove = async (c: Campaign) => {
    // Η διαγραφή παίρνει μαζί και τις εικόνες· η αρχειοθέτηση υπάρχει ακριβώς
    // για όποιον θέλει να κρύψει χωρίς να χάσει.
    if (!confirm(
      `Οριστική διαγραφή της «${c.Subject}»;\n\n` +
      'Χάνεται το αρχείο του ποιοι το έλαβαν, και σβήνονται οι εικόνες που δεν ' +
      'χρησιμοποιεί άλλη καμπάνια. Δεν αναιρείται.'
    )) return
    setBusy(c.documentId); setErr('')
    try {
      const res = await fetch(`/api/oc/campaigns?id=${c.documentId}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Αποτυχία')
      await onChanged()
    } catch (e: any) { setErr(e?.message || 'Αποτυχία') } finally { setBusy(null) }
  }

  const archivedCount = campaigns.filter(c => c.Archived).length
  const activeCount = campaigns.filter(c => !c.Archived && c.State !== 'draft').length

  return (
    <div className="grid gap-4">
      {/* Το Αρχείο ανήκει στις Αποστολές. Τα Προσχέδια είναι δουλειά σε
          εξέλιξη — δεν έχουν δικό τους αρχείο. */}
      {mode === 'queue' && (
      <div className="flex gap-1 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 self-start" role="tablist">
        {([['active', `Απεσταλμένα ${activeCount || ''}`], ['archived', `Αρχείο ${archivedCount || ''}`]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={box === k} onClick={() => setBox(k)}
            className={`px-4 min-h-11 rounded-full text-sm font-semibold ${
              box === k ? 'bg-coral text-charcoal' : 'text-gray-600 dark:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Αναζήτηση σε θέμα, συντάκτη ή παραλήπτη"
          className={`${CONTROL} flex-1 min-w-52`} />
        {mode === 'queue' && (
          <select value={state} onChange={e => setState(e.target.value)} className={CONTROL}>
            <option value="all">Κάθε κατάσταση</option>
            {Object.entries(STATE_LABELS).filter(([k]) => k !== 'draft').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <select value={period} onChange={e => setPeriod(e.target.value)} className={CONTROL}>
          <option value="all">Όλο το διάστημα</option>
          <option value="7">Τελευταίες 7 ημέρες</option>
          <option value="30">Τελευταίες 30 ημέρες</option>
          <option value="365">Τελευταίος χρόνος</option>
        </select>
        {authors.length > 1 && (
          <select value={author} onChange={e => setAuthor(e.target.value)} className={CONTROL}>
            <option value="all">Κάθε συντάκτης</option>
            {authors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <select value={sort} onChange={e => setSort(e.target.value)} className={CONTROL}>
          <option value="recent">Νεότερη πρώτη</option>
          <option value="oldest">Παλαιότερη πρώτη</option>
          <option value="recipients">Περισσότεροι παραλήπτες</option>
          {mode === 'queue' && <option value="failures">Περισσότερες αποτυχίες</option>}
          <option value="subject">Αλφαβητικά</option>
        </select>
        <label hidden={mode === 'drafts'} className={`${CONTROL} inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${onlyFailed ? 'glass-control-on' : ''}`}>
          <input type="checkbox" checked={onlyFailed} onChange={e => setOnlyFailed(e.target.checked)}
            className="accent-coral w-4 h-4" />
          Μόνο με αποτυχίες
        </label>
      </div>

      {shown.length !== inBox.length && (
        <p className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
          {shown.length} από {inBox.length}
          <button type="button" onClick={() => { setQ(''); setState('all'); setAuthor('all'); setPeriod('all'); setOnlyFailed(false) }}
            className="ml-2 underline">Καθαρισμός φίλτρων</button>
        </p>
      )}

      {err && <div className="rounded-2xl px-4 py-3 text-sm bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200">{err}</div>}

      {shown.length === 0 ? (
        <div className={`${CARD} text-center`}>
          <p className="font-semibold">
            {inBox.length > 0
              ? 'Κανένα αποτέλεσμα με αυτά τα φίλτρα'
              : mode === 'drafts' ? 'Κανένα προσχέδιο'
                : box === 'archived' ? 'Το αρχείο είναι άδειο' : 'Καμία αποστολή ακόμη'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {inBox.length > 0
              ? 'Δοκίμασε να καθαρίσεις κάποιο φίλτρο.'
              : mode === 'drafts'
                ? 'Ό,τι αποθηκεύεις με το «Αποθήκευση προσχεδίου» μένει εδώ — και το βλέπει όλο το γραφείο.'
                : box === 'archived'
                  ? 'Ό,τι αρχειοθετήσεις κρατά όλα του τα στοιχεία και μπορεί να επανέλθει.'
                  : 'Ό,τι στείλεις θα εμφανίζεται εδώ με την πορεία του.'}
          </p>
        </div>
      ) : shown.map(c => {
        const pct = c.TotalCount ? Math.round((c.SentCount / c.TotalCount) * 100) : 0
        const working = busy === c.documentId
        return (
          <div key={c.documentId} className={CARD}>
            <div className="flex flex-wrap items-baseline gap-2">
              {/* Το είδος ΠΡΙΝ από το θέμα: καθορίζει σε ποιον συνθέτη θα
                  ανοίξει και με ποια διαδρομή θα φύγει — δεν είναι λεπτομέρεια. */}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                c.Kind === 'newsletter'
                  ? 'bg-coral text-charcoal'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                {c.Kind === 'newsletter' ? bulk : 'Μήνυμα'}
              </span>
              <span className="font-semibold min-w-0">{c.Subject}</span>
              {/* ΣΕ ΠΟΙΟΝ πήγε, δίπλα στο θέμα: χωρίς αυτό έπρεπε να ανοίξεις
                  κάθε γραμμή για να θυμηθείς — σε αρχείο που μεγαλώνει,
                  σημαίνει να ανοίγεις τα πάντα. */}
              {c.audience && (
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={c.audience}>
                  → {c.audience}
                </span>
              )}
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-900 shrink-0">{STATE_LABELS[c.State] || c.State}</span>
            </div>
            {c.State !== 'draft' && (
              <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-coral" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              <span>{c.State === 'draft' ? `${c.TotalCount} παραλήπτες` : `${c.SentCount}/${c.TotalCount} στάλθηκαν`}</span>
              {c.CompletedAt && (
                <span>· {new Date(c.CompletedAt).toLocaleString('el-GR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {c.FailedCount > 0 && <span className="text-red-700 dark:text-red-300">· {c.FailedCount} απέτυχαν</span>}
              {c.CreatedByName && <span>· {c.CreatedByName}</span>}
              {c.ArchivedAt && <span>· αρχειοθετήθηκε {new Date(c.ArchivedAt).toLocaleDateString('el-GR')}</span>}
              <span className="ml-auto flex gap-2">
                {/* Μόνο στα προσχέδια: ό,τι έχει φύγει δεν ξαναγράφεται.
                    Το γραμματοκιβώτιο ανήκει στο ΓΡΑΦΕΙΟ, οπότε η Επικοινωνία
                    και το Media συνεχίζουν ο ένας το προσχέδιο του άλλου. */}
                {c.State === 'draft' && (
                  <button type="button" onClick={() => onEdit(c.documentId)}
                    className="px-3 py-1.5 rounded-full bg-coral text-charcoal text-sm font-bold">
                    Επεξεργασία
                  </button>
                )}
                <button type="button" onClick={() => setOpen(open === c.documentId ? null : c.documentId)}
                  aria-expanded={open === c.documentId}
                  className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold">
                  {open === c.documentId ? 'Κλείσιμο' : 'Προβολή'}
                </button>
                <button type="button" disabled={working} onClick={() => onDuplicate(c)}
                  title="Δημιουργεί νέο προσχέδιο με το ίδιο περιεχόμενο. Το πρωτότυπο μένει ανέπαφο."
                  className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
                  Διπλότυπο
                </button>
                <button type="button" disabled={working} onClick={() => archive(c, !c.Archived)}
                  className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-semibold disabled:opacity-50">
                  {c.Archived ? 'Επαναφορά' : 'Αρχειοθέτηση'}
                </button>
                <button type="button" disabled={working} onClick={() => remove(c)}
                  className="px-3 py-1.5 rounded-full border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-semibold disabled:opacity-50">
                  Διαγραφή
                </button>
              </span>
            </div>
            {open === c.documentId && <CampaignDetail id={c.documentId} />}
          </div>
        )
      })}
    </div>
  )
}
