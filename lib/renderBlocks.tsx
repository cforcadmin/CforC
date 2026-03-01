// Regex to detect [IMAGE: ...] convention in Strapi rich text
// Format: [IMAGE: url | alt text | size | alignment]
// - url: required
// - alt text: optional (default: '')
// - size: optional — small (33%), medium (50%), large (75%), full (100%) — default: full
// - alignment: optional — left, center, right — default: center
const IMAGE_CONVENTION_REGEX = /^\[IMAGE:\s*(.*?)\s*\]$/i

const SIZE_MAP: Record<string, string> = {
  small: 'max-w-xs',
  medium: 'max-w-lg',
  large: 'max-w-2xl',
  full: 'max-w-full',
}

const ALIGN_MAP: Record<string, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

/**
 * Render inline children with link/bold/italic/underline support.
 */
export function renderInlineChild(child: any, i: number): React.ReactNode {
  if (child.type === 'link') {
    return (
      <a key={i} href={child.url} target="_blank" rel="noopener noreferrer" className="text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral underline">
        {child.children?.map((linkChild: any, j: number) => renderInlineChild(linkChild, j))}
      </a>
    )
  }
  const rawText = child.text || ''
  // Split by newlines and insert <br /> between parts
  const parts = rawText.split('\n')
  let content: React.ReactNode = parts.length > 1
    ? parts.map((part: string, j: number) => (
        <span key={`${i}-line-${j}`}>
          {part}
          {j < parts.length - 1 && <br />}
        </span>
      ))
    : rawText
  if (child.bold) content = <strong key={`${i}-b`}>{content}</strong>
  if (child.italic) content = <em key={`${i}-i`}>{content}</em>
  if (child.underline) content = <u key={`${i}-u`}>{content}</u>
  if (child.strikethrough) content = <s key={`${i}-s`}>{content}</s>
  return <span key={i}>{content}</span>
}

/**
 * Render Strapi rich text blocks as React elements.
 * Supports paragraph, heading, list, quote, code blocks,
 * and the [IMAGE: url | alt] convention for inline images.
 */
export function renderBlocks(blocks: any): React.ReactNode {
  if (!blocks) return null
  if (typeof blocks === 'string') {
    const lines = blocks.split('\n')
    return lines.length > 1
      ? <>{lines.map((line, i) => <p key={i} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{line}</p>)}</>
      : <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{blocks}</p>
  }
  if (!Array.isArray(blocks)) return null

  return blocks.map((block: any, index: number) => {
    if (block.type === 'paragraph') {
      // Check for [IMAGE: url | alt | size | align] convention
      if (
        block.children?.length === 1 &&
        block.children[0].type === 'text' &&
        IMAGE_CONVENTION_REGEX.test(block.children[0].text?.trim())
      ) {
        const match = block.children[0].text.trim().match(IMAGE_CONVENTION_REGEX)
        if (match) {
          const parts = match[1].split('|').map((p: string) => p.trim())
          const url = parts[0]
          const alt = parts[1] || ''
          const sizeKey = (parts[2] || 'medium').toLowerCase()
          const alignKey = (parts[3] || 'center').toLowerCase()
          const sizeClass = SIZE_MAP[sizeKey] || SIZE_MAP.full
          const alignClass = ALIGN_MAP[alignKey] || ALIGN_MAP.center

          return (
            <div key={index} className={`my-6 ${sizeClass} ${alignClass}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                loading="lazy"
                className="w-full h-auto rounded-xl"
              />
            </div>
          )
        }
      }

      return (
        <p key={index} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          {block.children?.map((child: any, i: number) => renderInlineChild(child, i))}
        </p>
      )
    }

    if (block.type === 'heading') {
      const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements
      return (
        <Tag key={index} className="text-xl font-bold mb-3 text-charcoal dark:text-gray-100">
          {block.children?.map((child: any, i: number) => renderInlineChild(child, i))}
        </Tag>
      )
    }

    if (block.type === 'list') {
      const ListTag = block.format === 'ordered' ? 'ol' : 'ul'
      return (
        <ListTag key={index} className={`mb-4 pl-6 ${block.format === 'ordered' ? 'list-decimal' : 'list-disc'} text-gray-700 dark:text-gray-300`}>
          {block.children?.map((item: any, i: number) => (
            <li key={i} className="mb-1">
              {item.children?.map((child: any, j: number) => renderInlineChild(child, j))}
            </li>
          ))}
        </ListTag>
      )
    }

    if (block.type === 'quote') {
      return (
        <blockquote key={index} className="mb-4 pl-4 border-l-4 border-coral dark:border-coral-light italic text-gray-600 dark:text-gray-400">
          {block.children?.map((child: any, i: number) => renderInlineChild(child, i))}
        </blockquote>
      )
    }

    if (block.type === 'code') {
      return (
        <pre key={index} className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-sm">
          <code>{block.children?.map((child: any) => child.text || '').join('')}</code>
        </pre>
      )
    }

    return null
  })
}

/**
 * Extract plain text from Strapi rich text blocks (for SEO/metadata).
 */
export function extractTextFromBlocks(blocks: any): string {
  if (!blocks) return ''
  if (typeof blocks === 'string') return blocks

  if (Array.isArray(blocks)) {
    return blocks
      .map((block: any) => {
        if ((block.type === 'paragraph' || block.type === 'heading') && block.children) {
          return block.children
            .map((child: any) => extractChildText(child))
            .join('')
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }

  return ''
}

function extractChildText(child: any): string {
  if (child.type === 'link' && child.children) {
    return child.children.map((c: any) => extractChildText(c)).join('')
  }
  return child.text || ''
}
