'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { renderBlocks } from '@/lib/renderBlocks'
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
  const [isEditing, setIsEditing] = useState(false)
  const isEditingRef = useRef(false)
  const getInitialContentRef = useRef(() => ({ type: 'doc' as const, content: [{ type: 'paragraph' as const }] }))
  // Keep a snapshot of the content when entering edit mode so we can cancel
  const [snapshot, setSnapshot] = useState<any>(null)

  // Derive word/char counts from current content
  const plainText = typeof content === 'string' ? content : blocksToPlainText(content)
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).filter((w: string) => w.length > 0).length : 0
  const charCount = plainText.length

  const isOverWordLimit = maxWords ? wordCount > maxWords : false
  const isOverCharLimit = maxCharacters ? charCount > maxCharacters : false

  // Compute initial TipTap doc from content
  const getInitialContent = useCallback(() => {
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return { type: 'doc' as const, content: [{ type: 'paragraph' as const }] }
    }
    if (typeof content === 'string') {
      // Legacy plain text — convert each line to a paragraph
      const lines = content.split('\n')
      return {
        type: 'doc' as const,
        content: lines.map((line: string) => ({
          type: 'paragraph' as const,
          content: line ? [{ type: 'text' as const, text: line }] : undefined,
        })),
      }
    }
    // Strapi blocks array
    return strapiBlocksToTiptap(content)
  }, [content])

  // Keep ref in sync so useEffect can call latest version without depending on it
  getInitialContentRef.current = getInitialContent

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        codeBlock: false,
        code: false,
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
    editable: isEditing,
    onUpdate: ({ editor: ed }) => {
      // Only propagate changes when user is actively editing
      // (setContent during external sync also triggers onUpdate — ignore those)
      if (!isEditingRef.current) return
      const json = ed.getJSON()
      const blocks = tiptapToStrapiBlocks(json)
      onChange(blocks)
    },
  })

  // Sync editor editability when isEditing changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing)
      if (isEditing) {
        // Re-load content from prop every time we enter edit mode
        // so the editor always starts with the latest saved content
        const doc = getInitialContentRef.current()
        editor.commands.setContent(doc)
        setTimeout(() => editor.commands.focus('end'), 50)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editor])

  // Sync editor content when content prop changes externally (e.g., after save/refresh)
  const contentRef = useRef(content)
  useEffect(() => {
    if (!editor || isEditing) return
    // Only update if content actually changed (avoid loops)
    if (JSON.stringify(contentRef.current) !== JSON.stringify(content)) {
      contentRef.current = content
      const newDoc = getInitialContent()
      editor.commands.setContent(newDoc)
    }
  }, [content, editor, isEditing, getInitialContent])

  const handleEdit = () => {
    // Snapshot current content so we can cancel
    setSnapshot(content)
    isEditingRef.current = true
    setIsEditing(true)
  }

  const handleSave = () => {
    setSnapshot(null)
    isEditingRef.current = false
    setIsEditing(false)
  }

  const handleCancel = () => {
    // Restore snapshot
    if (snapshot !== null) {
      onChange(snapshot)
      if (editor) {
        const doc =
          !snapshot || (typeof snapshot === 'string' && snapshot.trim() === '')
            ? { type: 'doc', content: [{ type: 'paragraph' }] }
            : typeof snapshot === 'string'
            ? {
                type: 'doc',
                content: snapshot.split('\n').map((line: string) => ({
                  type: 'paragraph',
                  content: line
                    ? [{ type: 'text', text: line }]
                    : undefined,
                })),
              }
            : strapiBlocksToTiptap(snapshot)
        editor.commands.setContent(doc)
      }
    }
    setSnapshot(null)
    isEditingRef.current = false
    setIsEditing(false)
  }

  // Check if there is actual text content (for display mode empty state)
  const hasContent =
    content &&
    ((typeof content === 'string' && content.trim() !== '') ||
      (Array.isArray(content) && content.length > 0 && blocksToPlainText(content).trim() !== ''))

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-charcoal dark:text-gray-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {isEditing ? (
        <div className="space-y-2">
          {/* Editor with toolbar */}
          <div className="relative border border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-coral dark:focus-within:ring-coral-light focus-within:border-transparent">
            <Toolbar editor={editor} />
            <EditorContent
              editor={editor}
              className="rich-text-editor px-4 py-3 min-h-[120px] max-h-[400px] overflow-y-auto text-charcoal dark:text-gray-200 bg-white dark:bg-gray-700"
            />
          </div>

          {/* Counters */}
          {(maxWords || maxCharacters) && (
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-coral hover:bg-coral/90 dark:bg-coral-light dark:hover:bg-coral-light/90 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Αποθήκευση
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Ακύρωση
            </button>
          </div>
        </div>
      ) : (
        /* Display mode — click to edit */
        <div
          onClick={handleEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleEdit()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`${label} επεξεργασία`}
          className="group relative flex items-start gap-2 px-4 py-3 rounded-2xl transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-coral dark:focus:ring-coral-light"
        >
          <div className="flex-1 min-w-0">
            {hasContent ? (
              <div className="prose-sm dark:prose-invert max-w-none">
                {renderBlocks(content)}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                {placeholder || `Πρόσθεσε ${label.toLowerCase()}`}
              </p>
            )}
          </div>

          {/* Edit icon */}
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-coral dark:group-hover:text-coral-light transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>

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
      )}
    </div>
  )
}
