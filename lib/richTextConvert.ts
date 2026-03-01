/**
 * Bidirectional conversion between Strapi Blocks and TipTap JSON.
 *
 * IMPORTANT: [IMAGE: url | alt | size | alignment] convention paragraphs
 * must survive round-trips as plain text paragraphs so renderBlocks()
 * can detect and render them.
 */

// ─── Strapi Blocks → TipTap JSON ────────────────────────────────────

function convertStrapiMarks(child: any): any[] {
  const marks: any[] = []
  if (child.bold) marks.push({ type: 'bold' })
  if (child.italic) marks.push({ type: 'italic' })
  if (child.underline) marks.push({ type: 'underline' })
  if (child.strikethrough) marks.push({ type: 'strike' })
  return marks
}

function strapiChildToTiptap(child: any): any {
  if (child.type === 'link') {
    const linkContent = (child.children || []).map((c: any) => {
      const node: any = { type: 'text', text: c.text || '' }
      const marks = convertStrapiMarks(c)
      marks.push({ type: 'link', attrs: { href: child.url, target: '_blank', rel: 'noopener noreferrer nofollow', class: null } })
      node.marks = marks
      return node
    })
    return linkContent
  }

  const node: any = { type: 'text', text: child.text || '' }
  const marks = convertStrapiMarks(child)
  if (marks.length > 0) node.marks = marks
  return node
}

function strapiChildrenToTiptap(children: any[]): any[] {
  if (!children || children.length === 0) {
    return [{ type: 'text', text: '' }]
  }
  const result: any[] = []
  for (const child of children) {
    const converted = strapiChildToTiptap(child)
    if (Array.isArray(converted)) {
      result.push(...converted)
    } else {
      result.push(converted)
    }
  }
  // Filter out empty text nodes unless it's the only one
  if (result.length > 1) {
    const filtered = result.filter(n => n.text !== '')
    return filtered.length > 0 ? filtered : [{ type: 'text', text: '' }]
  }
  return result
}

export function strapiBlocksToTiptap(blocks: any): any {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
    }
  }

  const content = blocks.map((block: any) => {
    if (block.type === 'paragraph') {
      return {
        type: 'paragraph',
        content: strapiChildrenToTiptap(block.children)
      }
    }

    if (block.type === 'heading') {
      return {
        type: 'heading',
        attrs: { level: block.level || 2 },
        content: strapiChildrenToTiptap(block.children)
      }
    }

    if (block.type === 'list') {
      const listType = block.format === 'ordered' ? 'orderedList' : 'bulletList'
      return {
        type: listType,
        content: (block.children || []).map((item: any) => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: strapiChildrenToTiptap(item.children)
          }]
        }))
      }
    }

    // Strapi doesn't support 'quote' in its Blocks editor — treat as paragraph fallback
    // so any legacy quote data doesn't break the TipTap editor
    if (block.type === 'quote') {
      return {
        type: 'paragraph',
        content: strapiChildrenToTiptap(block.children)
      }
    }

    // Fallback: treat as paragraph
    return {
      type: 'paragraph',
      content: strapiChildrenToTiptap(block.children || [])
    }
  })

  return { type: 'doc', content }
}

// ─── TipTap JSON → Strapi Blocks ────────────────────────────────────

function tiptapMarksToStrapi(marks: any[]): Record<string, any> {
  const result: Record<string, any> = {}
  if (!marks) return result
  for (const mark of marks) {
    if (mark.type === 'bold') result.bold = true
    if (mark.type === 'italic') result.italic = true
    if (mark.type === 'underline') result.underline = true
    if (mark.type === 'strike') result.strikethrough = true
  }
  return result
}

function hasLinkMark(marks: any[]): any | null {
  if (!marks) return null
  return marks.find((m: any) => m.type === 'link') || null
}

function tiptapContentToStrapiChildren(content: any[]): any[] {
  if (!content || content.length === 0) {
    return [{ type: 'text', text: '' }]
  }

  // Group consecutive text nodes that share the same link into link children
  const result: any[] = []
  let currentLink: any = null
  let linkChildren: any[] = []

  const flushLink = () => {
    if (currentLink && linkChildren.length > 0) {
      result.push({
        type: 'link',
        url: currentLink.attrs?.href || '',
        children: linkChildren
      })
      linkChildren = []
      currentLink = null
    }
  }

  for (const node of content) {
    if (node.type === 'text') {
      const link = hasLinkMark(node.marks)
      if (link) {
        // If same link, group together
        if (currentLink && currentLink.attrs?.href === link.attrs?.href) {
          const strapiMarks = tiptapMarksToStrapi(node.marks)
          linkChildren.push({ type: 'text', text: node.text || '', ...strapiMarks })
        } else {
          flushLink()
          currentLink = link
          const strapiMarks = tiptapMarksToStrapi(node.marks)
          linkChildren.push({ type: 'text', text: node.text || '', ...strapiMarks })
        }
      } else {
        flushLink()
        const strapiMarks = tiptapMarksToStrapi(node.marks)
        result.push({ type: 'text', text: node.text || '', ...strapiMarks })
      }
    } else if (node.type === 'hardBreak') {
      flushLink()
      // Represent hard break as newline in the previous/next text node
      const lastNode = result[result.length - 1]
      if (lastNode && lastNode.type === 'text') {
        lastNode.text += '\n'
      } else {
        result.push({ type: 'text', text: '\n' })
      }
    }
  }

  flushLink()

  return result.length > 0 ? result : [{ type: 'text', text: '' }]
}

export function tiptapToStrapiBlocks(tiptapJson: any): any[] {
  if (!tiptapJson || !tiptapJson.content) return []

  const blocks: any[] = []

  for (const node of tiptapJson.content) {
    if (node.type === 'paragraph') {
      blocks.push({
        type: 'paragraph',
        children: tiptapContentToStrapiChildren(node.content)
      })
    } else if (node.type === 'heading') {
      blocks.push({
        type: 'heading',
        level: node.attrs?.level || 2,
        children: tiptapContentToStrapiChildren(node.content)
      })
    } else if (node.type === 'bulletList') {
      blocks.push({
        type: 'list',
        format: 'unordered',
        children: (node.content || []).map((li: any) => {
          // listItem contains paragraph(s)
          const para = li.content?.[0]
          return {
            type: 'list-item',
            children: tiptapContentToStrapiChildren(para?.content)
          }
        })
      })
    } else if (node.type === 'orderedList') {
      blocks.push({
        type: 'list',
        format: 'ordered',
        children: (node.content || []).map((li: any) => {
          const para = li.content?.[0]
          return {
            type: 'list-item',
            children: tiptapContentToStrapiChildren(para?.content)
          }
        })
      })
    } else if (node.type === 'blockquote') {
      // Strapi doesn't support 'quote' in its Blocks editor — save as paragraph
      for (const para of (node.content || [])) {
        blocks.push({
          type: 'paragraph',
          children: tiptapContentToStrapiChildren(para?.content)
        })
      }
    }
  }

  return blocks
}

// ─── Plain text extraction (for word/character counting) ─────────────

export function blocksToPlainText(blocks: any): string {
  if (!blocks) return ''
  if (typeof blocks === 'string') return blocks
  if (!Array.isArray(blocks)) return ''

  return blocks
    .map((block: any) => {
      if (block.children && Array.isArray(block.children)) {
        return block.children
          .map((child: any) => {
            if (child.type === 'link' && child.children) {
              return child.children.map((c: any) => c.text || '').join('')
            }
            return child.text || ''
          })
          .join('')
      }
      return ''
    })
    .join('\n')
}
