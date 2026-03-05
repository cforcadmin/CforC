import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { checkCsrf } from '@/lib/csrf'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

// Human-readable field name mapping (Greek) for change log emails
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  Name: 'Όνομα',
  Bio: 'Βιογραφικό',
  City: 'Πόλη',
  Province: 'Περιφέρεια',
  Email: 'Email',
  Phone: 'Τηλέφωνο',
  Websites: 'Ιστοσελίδες',
  FieldsOfWork: 'Πεδία Πράκτικής',
  Image: 'Φωτογραφία Προφίλ',
  ProfileImageAltText: 'Alt Text Φωτογραφίας',
  Project1Title: 'Τίτλος Έργου 1',
  Project1Tags: 'Ετικέτες Έργου 1',
  Project1Links: 'Σύνδεσμοι Έργου 1',
  Project1Description: 'Περιγραφή Έργου 1',
  Project1Pictures: 'Φωτογραφίες Έργου 1',
  Project1PicturesAltText: 'Alt Text Φωτογραφιών Έργου 1',
  Project2Title: 'Τίτλος Έργου 2',
  Project2Tags: 'Ετικέτες Έργου 2',
  Project2Links: 'Σύνδεσμοι Έργου 2',
  Project2Description: 'Περιγραφή Έργου 2',
  Project2Pictures: 'Φωτογραφίες Έργου 2',
  Project2PicturesAltText: 'Alt Text Φωτογραφιών Έργου 2',
}

// Fields to skip when detecting changes (internal/auto-set fields)
const SKIP_CHANGE_FIELDS = new Set([
  'project1KeptImageIds',
  'project2KeptImageIds',
  'HideProfile',
])

export async function POST(request: NextRequest) {
  try {
    const csrfError = checkCsrf(request)
    if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 })

    // Get session token from cookie
    const sessionToken = request.cookies.get('session')?.value
    console.log('[UPDATE] Session cookie found:', !!sessionToken)

    if (!sessionToken) {
      console.log('[UPDATE] No session cookie found')
      return NextResponse.json(
        { error: 'Μη εξουσιοδοτημένος χρήστης' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyToken(sessionToken)
    console.log('[UPDATE] Token verified:', !!payload)
    if (!payload) {
      console.log('[UPDATE] Invalid token')
      return NextResponse.json(
        { error: 'Μη έγκυρη σύνοδος' },
        { status: 401 }
      )
    }

    if (payload.type !== 'session') {
      return NextResponse.json(
        { error: 'Μη έγκυρη σύνοδος' },
        { status: 401 }
      )
    }

    const memberId = payload.memberId
    console.log('[UPDATE] Member ID:', memberId)

    // Parse the request - could be FormData (with images) or JSON
    const contentType = request.headers.get('content-type') || ''
    let updateData: any = {}
    let imageFile: File | null = null
    let project1ImageFiles: File[] = []
    let project2ImageFiles: File[] = []

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (image upload)
      const formData = await request.formData()

      // Extract text fields
      const fields = [
        'Name', 'Bio', 'FieldsOfWork', 'City', 'Province', 'Email', 'Phone', 'Websites',
        'ProfileImageAltText',
        'Project1Title', 'Project1Tags', 'Project1Links', 'Project1Description', 'Project1PicturesAltText',
        'Project2Title', 'Project2Tags', 'Project2Links', 'Project2Description', 'Project2PicturesAltText'
      ]
      fields.forEach(field => {
        const value = formData.get(field)
        if (value !== null) {
          updateData[field] = value
        }
      })

      // Extract profile image if present
      const image = formData.get('image')
      if (image && image instanceof File) {
        imageFile = image
      }

      // Extract project 1 images
      const project1Images = formData.getAll('project1Images')
      project1ImageFiles = project1Images.filter((file): file is File => file instanceof File)

      // Extract project 1 kept image IDs
      const project1KeptIds = formData.getAll('project1KeptImageIds')
      updateData.project1KeptImageIds = project1KeptIds.map(id => parseInt(id.toString(), 10)).filter(id => !isNaN(id))

      // Extract project 2 images
      const project2Images = formData.getAll('project2Images')
      project2ImageFiles = project2Images.filter((file): file is File => file instanceof File)

      // Extract project 2 kept image IDs
      const project2KeptIds = formData.getAll('project2KeptImageIds')
      updateData.project2KeptImageIds = project2KeptIds.map(id => parseInt(id.toString(), 10)).filter(id => !isNaN(id))

      // Validate uploaded files (type and size)
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

      const allFiles = [
        ...(imageFile ? [imageFile] : []),
        ...project1ImageFiles,
        ...project2ImageFiles,
      ]

      for (const file of allFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: `Μη αποδεκτός τύπος αρχείου: ${file.type}. Επιτρέπονται: JPEG, PNG, WebP, GIF.` },
            { status: 400 }
          )
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `Το αρχείο "${file.name}" υπερβαίνει το όριο μεγέθους (10 MB).` },
            { status: 400 }
          )
        }
      }
    } else {
      // Handle JSON
      updateData = await request.json()
    }

    // Validate required fields
    if (updateData.Name !== undefined && !updateData.Name.trim()) {
      return NextResponse.json(
        { error: 'Το όνομα είναι υποχρεωτικό' },
        { status: 400 }
      )
    }

    if (updateData.Email !== undefined && !updateData.Email.trim()) {
      return NextResponse.json(
        { error: 'Το email είναι υποχρεωτικό' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (updateData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.Email)) {
      return NextResponse.json(
        { error: 'Μη έγκυρη διεύθυνση email' },
        { status: 400 }
      )
    }

    // Check email uniqueness if email is being changed
    if (updateData.Email) {
      const emailCheckResponse = await fetch(
        `${STRAPI_URL}/api/members?filters[Email][$eq]=${encodeURIComponent(updateData.Email)}&filters[documentId][$ne]=${encodeURIComponent(memberId)}&fields[0]=id`,
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`
          }
        }
      )
      if (emailCheckResponse.ok) {
        const emailCheckData = await emailCheckResponse.json()
        if (emailCheckData.data && emailCheckData.data.length > 0) {
          return NextResponse.json(
            { error: 'Αυτό το email χρησιμοποιείται ήδη από άλλο μέλος' },
            { status: 409 }
          )
        }
      }
    }

    // Helper function to convert text to Blocks format
    // Splits by newlines so each line becomes its own paragraph block,
    // preserving the formatting from the edit form
    const convertTextToBlocks = (text: string) => {
      const lines = text.split('\n')
      return lines.map(line => ({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: line
          }
        ]
      }))
    }

    // Helper: process a Blocks field — parse JSON if string, convert plain text, or pass through
    const processBlocksField = (fieldName: string) => {
      if (updateData[fieldName] === undefined) return

      let value = updateData[fieldName]

      // If it's a string, try JSON.parse first (blocks from FormData come as JSON strings)
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            value = parsed
          }
        } catch {
          // Not JSON — treat as plain text
        }
      }

      if (Array.isArray(value)) {
        // Already blocks format — check if empty
        const hasText = value.some((block: any) =>
          block.children?.some((child: any) => {
            if (child.type === 'link') {
              return child.children?.some((c: any) => (c.text || '').trim() !== '')
            }
            return (child.text || '').trim() !== ''
          })
        )
        if (!hasText) {
          delete updateData[fieldName]
        } else {
          updateData[fieldName] = value
        }
      } else if (typeof value === 'string') {
        if (!value.trim()) {
          delete updateData[fieldName]
        } else {
          // Legacy plain text — convert to blocks
          updateData[fieldName] = convertTextToBlocks(value)
        }
      }
    }

    processBlocksField('Bio')
    processBlocksField('Project1Description')
    processBlocksField('Project2Description')

    // Handle image upload if present
    let imageId: number | null = null
    if (imageFile) {
      const imageFormData = new FormData()
      imageFormData.append('files', imageFile)

      const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`
        },
        body: imageFormData
      })

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json()
        if (uploadResult && uploadResult.length > 0) {
          imageId = uploadResult[0].id

          // Get current member to remove old image
          const currentMemberResponse = await fetch(
            `${STRAPI_URL}/api/members/${memberId}?populate=Image`,
            {
              headers: {
                'Authorization': `Bearer ${STRAPI_API_TOKEN}`
              }
            }
          )

          if (currentMemberResponse.ok) {
            const currentMember = await currentMemberResponse.json()
            const oldImages = currentMember.data?.Image

            // Delete old images
            if (oldImages && Array.isArray(oldImages)) {
              for (const img of oldImages) {
                if (img.id) {
                  await fetch(`${STRAPI_URL}/api/upload/files/${img.id}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${STRAPI_API_TOKEN}`
                    }
                  })
                }
              }
            }
          }

          // Add new image to update data
          updateData.Image = [imageId]
        }
      }
    }

    // Handle project 1 images upload
    if (project1ImageFiles.length > 0 || updateData.project1KeptImageIds) {
      let newProject1ImageIds: number[] = []

      // Upload new images if any
      if (project1ImageFiles.length > 0) {
        const project1FormData = new FormData()
        project1ImageFiles.forEach(file => {
          project1FormData.append('files', file)
        })

        const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`
          },
          body: project1FormData
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          if (uploadResult && uploadResult.length > 0) {
            newProject1ImageIds = uploadResult.map((img: any) => img.id)
          }
        }
      }

      // Combine kept existing IDs with new upload IDs
      const keptIds = updateData.project1KeptImageIds || []
      updateData.Project1Pictures = [...keptIds, ...newProject1ImageIds]

      // Clean up temporary field
      delete updateData.project1KeptImageIds
    }

    // Handle project 2 images upload
    if (project2ImageFiles.length > 0 || updateData.project2KeptImageIds) {
      let newProject2ImageIds: number[] = []

      // Upload new images if any
      if (project2ImageFiles.length > 0) {
        const project2FormData = new FormData()
        project2ImageFiles.forEach(file => {
          project2FormData.append('files', file)
        })

        const uploadResponse = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`
          },
          body: project2FormData
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          if (uploadResult && uploadResult.length > 0) {
            newProject2ImageIds = uploadResult.map((img: any) => img.id)
          }
        }
      }

      // Combine kept existing IDs with new upload IDs
      const keptIds = updateData.project2KeptImageIds || []
      updateData.Project2Pictures = [...keptIds, ...newProject2ImageIds]

      // Clean up temporary field
      delete updateData.project2KeptImageIds
    }

    // Find member by documentId first to ensure we're updating the right one
    console.log('[UPDATE] Finding member by documentId:', memberId)
    const findResponse = await fetch(
      `${STRAPI_URL}/api/members?filters[documentId][$eq]=${encodeURIComponent(memberId)}`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`
        }
      }
    )

    if (!findResponse.ok) {
      console.error('[UPDATE] Failed to find member')
      return NextResponse.json(
        { error: 'Δεν βρέθηκε το προφίλ' },
        { status: 404 }
      )
    }

    const findData = await findResponse.json()
    if (!findData.data || findData.data.length === 0) {
      console.error('[UPDATE] Member not found with documentId:', memberId)
      return NextResponse.json(
        { error: 'Δεν βρέθηκε το προφίλ' },
        { status: 404 }
      )
    }

    const existingMember = findData.data[0]
    const updateId = existingMember.id
    console.log('[UPDATE] Found existing member with numeric ID:', updateId)
    console.log('[UPDATE] Member documentId:', existingMember.documentId)

    // Fetch existing member with all fields populated for change detection
    let existingPopulated: any = existingMember
    try {
      const populatedRes = await fetch(
        `${STRAPI_URL}/api/members/${memberId}?populate=*`,
        { headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` } }
      )
      if (populatedRes.ok) {
        const populatedData = await populatedRes.json()
        if (populatedData.data) existingPopulated = populatedData.data
      }
    } catch (e) {
      console.error('[UPDATE] Failed to fetch populated member for change detection:', e)
    }

    // Detect which fields actually changed
    const changedFields: string[] = []
    for (const key of Object.keys(updateData)) {
      if (SKIP_CHANGE_FIELDS.has(key)) continue

      const oldVal = existingPopulated[key]
      const newVal = updateData[key]

      // For media fields (arrays of objects with ids), compare by ID sets
      if (Array.isArray(newVal) && newVal.length > 0 && typeof newVal[0] === 'number') {
        const oldIds = Array.isArray(oldVal)
          ? oldVal.map((item: any) => (typeof item === 'object' ? item.id : item)).sort()
          : []
        const newIds = [...newVal].sort()
        if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
          changedFields.push(key)
        }
        continue
      }

      // For blocks fields (Bio, descriptions), compare JSON
      if (Array.isArray(newVal) && newVal.length > 0 && newVal[0]?.type) {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push(key)
        }
        continue
      }

      // For simple string/text fields
      const oldStr = (oldVal ?? '').toString()
      const newStr = (newVal ?? '').toString()
      if (oldStr !== newStr) {
        changedFields.push(key)
      }
    }

    // If a new profile image was uploaded, mark it as changed
    if (imageFile && !changedFields.includes('Image')) {
      changedFields.push('Image')
    }

    console.log('[UPDATE] Changed fields:', changedFields)

    // Always unhide profile when member saves — makes profile visible after first edit
    updateData.HideProfile = false

    const updateResponse = await fetch(`${STRAPI_URL}/api/members/${updateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      },
      body: JSON.stringify({
        data: updateData
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('[UPDATE] Strapi update failed with status:', updateResponse.status)

      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // not JSON
      }

      return NextResponse.json(
        { error: 'Αποτυχία ενημέρωσης προφίλ' },
        { status: 500 }
      )
    }

    // Update was successful - log profile changes (fire-and-forget)
    console.log('[UPDATE] Update successful, returning success response')

    if (changedFields.length > 0) {
      const displayNames = changedFields.map(f => FIELD_DISPLAY_NAMES[f] || f)
      fetch(`${STRAPI_URL}/api/profile-change-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            memberName: existingPopulated.Name || 'Unknown',
            memberEmail: existingPopulated.Email || '',
            changedFields: displayNames.join(', '),
            changedAt: new Date().toISOString(),
          },
        }),
      }).catch(err => console.error('[UPDATE] Failed to log profile change:', err))
    }

    return NextResponse.json({
      success: true,
      message: 'Το προφίλ ενημερώθηκε επιτυχώς'
    })

  } catch (error) {
    console.error('Member update error:', error)
    return NextResponse.json(
      { error: 'Σφάλμα διακομιστή' },
      { status: 500 }
    )
  }
}
