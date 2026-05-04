'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  strapiBlocksToTiptap,
  tiptapToStrapiBlocks,
  blocksToPlainText,
} from '@/lib/richTextConvert'

interface RichTextEditorProps {
  content: any // Strapi blocks array or string
  onChange: (blocks: any) => void
  label: string
  placeholder?: string
  required?: boolean
  maxWords?: number
  maxCharacters?: number
  tooltip?: string
}

// ─── Toolbar ─────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: any }) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus()
    }
  }, [showLinkInput])

  if (!editor) return null

  const btnBase =
    'p-1.5 rounded-lg text-sm transition-colors flex items-center justify-center min-w-[32px] h-8'
  const active = 'bg-coral text-white dark:bg-coral-light'
  const inactive =
    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'

  const btn = (isActive: boolean) =>
    `${btnBase} ${isActive ? active : inactive}`

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      let url = linkUrl.trim()
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setLinkUrl('')
    setShowLinkInput(false)
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-600 px-2 py-1.5 flex flex-wrap gap-0.5 items-center bg-gray-50 dark:bg-gray-700 rounded-t-2xl">
      {/* Heading dropdown */}
      <select
        value={
          editor.isActive('heading', { level: 1 })
            ? '1'
            : editor.isActive('heading', { level: 2 })
            ? '2'
            : editor.isActive('heading', { level: 3 })
            ? '3'
            : '0'
        }
        onChange={(e) => {
          const level = parseInt(e.target.value)
          if (level === 0) {
            editor.chain().focus().setParagraph().run()
          } else {
            editor
              .chain()
              .focus()
              .setHeading({ level: level as 1 | 2 | 3 })
              .run()
          }
          // Reset select so re-selecting "Παράγραφος" always fires onChange
          e.target.blur()
        }}
        className="h-8 px-2 rounded-lg text-xs bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-700 dark:text-gray-200 cursor-pointer"
      >
        <option value="0">Παράγραφος</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
      </select>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1" />

      {/* Bold */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive('bold'))}
        title="Έντονα (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive('italic'))}
        title="Πλάγια (Ctrl+I)"
      >
        <em>I</em>
      </button>

      {/* Underline */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive('underline'))}
        title="Υπογράμμιση (Ctrl+U)"
      >
        <span className="underline">U</span>
      </button>

      {/* Strikethrough */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive('strike'))}
        title="Διακριτή διαγραφή"
      >
        <s>S</s>
      </button>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1" />

      {/* Link */}
      <button
        type="button"
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run()
          } else {
            const existing = editor.getAttributes('link').href || ''
            setLinkUrl(existing)
            setShowLinkInput(true)
          }
        }}
        className={btn(editor.isActive('link'))}
        title="Σύνδεσμος"
      >
        🔗
      </button>

      <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1" />

      {/* Bullet list */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive('bulletList'))}
        title="Λίστα με κουκκίδες"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Ordered list */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive('orderedList'))}
        title="Αριθμημένη λίστα"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h10M3 8h.01M3 12h.01M3 16h.01" />
        </svg>
      </button>

      {/* Link URL input popover */}
      {showLinkInput && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-2 flex gap-2">
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLinkSubmit()
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false)
                setLinkUrl('')
              }
            }}
            placeholder="https://..."
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 text-charcoal dark:text-gray-200 w-64 focus:outline-none focus:ring-1 focus:ring-coral"
          />
          <button
            type="button"
            onClick={handleLinkSubmit}
            className="px-3 py-1.5 bg-coral text-white text-sm rounded-lg hover:bg-coral/90"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false)
              setLinkUrl('')
            }}
            className="px-3 py-1.5 text-gray-500 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────

export default function RichTextEditor({
  content,
  onChange,
  label,
  placeholder = '',
  required = false,
  maxWords,
  maxCharacters,
  tooltip,
}: RichTextEditorProps) {
  // Derive word/char counts from current content
  const plainText = typeof content === 'string' ? content : blocksToPlainText(content)
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).filter((w: string) => w.length > 0).length : 0
  const charCount = plainText.length

  const isOverWordLimit = maxWords ? wordCount > maxWords : false
  const isOverCharLimit = maxCharacters ? charCount > maxCharacters : false

  const [isFocused, setIsFocused] = useState(false)

  // Sync flag: distinguish our own onUpdate from external prop changes
  const isInternalUpdate = useRef(false)
  const contentRef = useRef(content)
  const lastSetSerialized = useRef<string | null>(null)

  // Stable ref to onChange so handleEditorUpdate doesn't change every render
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Update the ref whenever we push changes FROM the editor (internal)
  const handleEditorUpdate = useCallback(({ editor: ed }: any) => {
    const json = ed.getJSON()
    const blocks = tiptapToStrapiBlocks(json)
    isInternalUpdate.current = true
    contentRef.current = blocks
    onChangeRef.current(blocks)
  }, [])

  // Compute initial TipTap doc from content
  const getInitialContent = useCallback(() => {
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return { type: 'doc' as const, content: [{ type: 'paragraph' as const }] }
    }
    if (typeof content === 'string') {
      const lines = content.split('\n')
      return {
        type: 'doc' as const,
        content: lines.map((line: string) => ({
          type: 'paragraph' as const,
          content: line ? [{ type: 'text' as const, text: line }] : undefined,
        })),
      }
    }
    return strapiBlocksToTiptap(content)
  }, [content])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        codeBlock: false,
        code: false,
        // Disable bundled link/underline so the explicit configs below own them
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-coral underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: getInitialContent(),
    editable: true,
    onUpdate: handleEditorUpdate,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  })

  // Only setContent when the change came from OUTSIDE (parent reset, discard,
  // language switch, or initial data load). Guards:
  //  - skip if isInternalUpdate (our own typing fired the update)
  //  - skip if the new content is identical to what we last set (avoid loops)
  //  - pass `false` to setContent so it does NOT emit an update event (which
  //    would re-enter handleEditorUpdate via the onUpdate config and overwrite
  //    isInternalUpdate / parent state with the same value)
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    const serialized = JSON.stringify(content ?? null)
    if (serialized === lastSetSerialized.current) return
    const newDoc = getInitialContent()
    editor.commands.setContent(newDoc, { emitUpdate: false })
    contentRef.current = content
    lastSetSerialized.current = serialized
  }, [content, editor, getInitialContent])

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Editor with toolbar — always visible */}
      <div className="group relative">
        <div className={`relative border border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden transition-shadow ${isFocused ? 'ring-2 ring-coral dark:ring-coral-light border-transparent' : ''}`}>
          <Toolbar editor={editor} />
          <EditorContent
            editor={editor}
            className="rich-text-editor notranslate px-4 py-3 min-h-[120px] max-h-[400px] overflow-y-auto text-charcoal dark:text-gray-200 bg-white dark:bg-gray-700"
          />
        </div>

        {/* Hover tooltip */}
        {tooltip && (
          <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block z-10">
            <div className="bg-white dark:bg-gray-900 text-charcoal dark:text-gray-200 text-xs rounded-lg px-3 py-2 shadow-lg border border-black dark:border-white max-w-xs">
              {tooltip}
              <div className="absolute top-full left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black dark:border-t-white"></div>
            </div>
          </div>
        )}
      </div>

      {/* Counters — show when focused or over limit */}
      {(isFocused || isOverWordLimit || isOverCharLimit) && (maxWords || maxCharacters) && (
        <div className="flex justify-end gap-4 text-xs">
          {maxWords && (
            <span
              className={
                isOverWordLimit
                  ? 'text-red-500 font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              {wordCount} / {maxWords} λέξεις
              {isOverWordLimit && ' (υπέρβαση!)'}
            </span>
          )}
          {maxCharacters && (
            <span
              className={
                isOverCharLimit
                  ? 'text-red-500 font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              {charCount} / {maxCharacters} χαρακτήρες
              {isOverCharLimit && ' (υπέρβαση!)'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
