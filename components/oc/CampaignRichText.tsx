'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

/**
 * Επεξεργαστής κειμένου για τα μπλοκ της μαζικής αποστολής.
 *
 * Ίδια βιβλιοθήκη και ίδια αισθητική με τον επεξεργαστή του προφίλ, αλλά ΟΧΙ
 * ο ίδιος: εκείνος παράγει blocks του Strapi (richTextConvert), ενώ εδώ
 * χρειάζεται HTML — και μάλιστα περιορισμένο, γιατί το γράμμα περνά μετά από
 * sanitizeInline που κρατά μόνο έξι ετικέτες.
 *
 * Η γραμμή εργαλείων δίνει ΜΟΝΟ ό,τι επιβιώνει σε γραμματοκιβώτιο και ό,τι
 * επιτρέπει η ταυτότητα: έντονα, πλάγια, υπογράμμιση, σύνδεσμος, λίστες.
 * Καμία επιλογή γραμματοσειράς, μεγέθους ή χρώματος — αυτά ανήκουν στο
 * πρότυπο, όχι στον συντάκτη.
 */

const btnBase = 'p-1.5 rounded-lg text-sm transition-colors flex items-center justify-center min-w-[32px] h-8'
const active = 'bg-coral text-white dark:bg-coral-light'
const inactive = 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
const btn = (on: boolean) => `${btnBase} ${on ? active : inactive}`

export default function CampaignRichText({ value, onChange, placeholder }: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Ό,τι δεν επιβιώνει στο email ή δεν επιτρέπει η ταυτότητα φεύγει από
        // τη ρίζα: αν δεν υπάρχει το εργαλείο, δεν υπάρχει και το πρόβλημα.
        heading: { levels: [2, 3] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      Placeholder.configure({ placeholder: placeholder || 'Γράψε εδώ…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        // Κανένα δικό μας styling εδώ: το .rich-text-editor .tiptap του
        // globals.css στολίζει ήδη λίστες, επικεφαλίδες και συνδέσμους, και
        // το χρησιμοποιεί ο επεξεργαστής του προφίλ. Το «prose» που είχα βάλει
        // δεν έκανε ποτέ τίποτα — το @tailwindcss/typography δεν υπάρχει στο
        // έργο — και το preflight έσβηνε τις κουκκίδες.
        class: 'px-3 py-2 min-h-24',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Το Tiptap δίνει «<p></p>» για άδειο· το κρατάμε κενό ώστε ο έλεγχος
      // «το μήνυμα είναι κενό» να μη νομίζει ότι υπάρχει περιεχόμενο.
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  // Εξωτερική αλλαγή (π.χ. φόρτωση preset) — χωρίς αυτό ο editor κρατά το παλιό
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || ''
    if (next !== current && !(next === '' && current === '<p></p>')) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [value, editor])

  useEffect(() => { if (linkOpen) linkRef.current?.focus() }, [linkOpen])

  if (!editor) return null

  const applyLink = () => {
    const raw = linkUrl.trim()
    if (!raw) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      // Σχετικοί σύνδεσμοι δεν σημαίνουν τίποτα σε γραμματοκιβώτιο
      const url = /^(https?:\/\/|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setLinkUrl(''); setLinkOpen(false)
  }

  return (
    <div className="rich-text-editor rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
        <select
          value={editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
          onChange={e => {
            const v = e.target.value
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: v === 'h2' ? 2 : 3 }).run()
          }}
          title="Μορφή κειμένου"
          className="h-8 px-2 rounded-lg text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">
          <option value="p">Κείμενο</option>
          <option value="h2">Επικεφαλίδα</option>
          <option value="h3">Υποεπικεφαλίδα</option>
        </select>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive('bold'))} title="Έντονα (Ctrl+B)"><strong>B</strong></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive('italic'))} title="Πλάγια (Ctrl+I)"><em>I</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive('underline'))} title="Υπογράμμιση (Ctrl+U)"><span className="underline">U</span></button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive('bulletList'))} title="Λίστα με κουκκίδες">•—</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive('orderedList'))} title="Αριθμημένη λίστα">1.</button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1" />

        <button type="button" title="Σύνδεσμος" className={btn(editor.isActive('link'))}
          onClick={() => {
            setLinkUrl(editor.getAttributes('link').href || '')
            setLinkOpen(o => !o)
          }}>🔗</button>

        {editor.isActive('link') && (
          <button type="button" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
            className={btn(false)} title="Αφαίρεση συνδέσμου">⛓️‍💥</button>
        )}
      </div>

      {linkOpen && (
        <div className="flex gap-2 px-2 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
          <input ref={linkRef} value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') setLinkOpen(false) }}
            placeholder="https://… ή κενό για αφαίρεση" translate="no"
            className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm" />
          <button type="button" onClick={applyLink}
            className="px-3 h-9 rounded-lg bg-coral text-charcoal text-sm font-semibold">Εφαρμογή</button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
