import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

export async function POST(request: NextRequest) {
  try {
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
    console.log('[UPDATE] Token verified:', !!payload, payload)
    if (!payload) {
      console.log('[UPDATE] Invalid token')
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
        'Project1Title', 'Project1Tags', 'Project1Description', 'Project1PicturesAltText',
        'Project2Title', 'Project2Tags', 'Project2Description', 'Project2PicturesAltText'
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

    // Helper function to convert text to Blocks format
    const convertTextToBlocks = (text: string) => {
      return [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: text
            }
          ]
        }
      ]
    }

    // Handle Bio field - it's a Blocks field in Strapi, expects an array
    if (updateData.Bio !== undefined) {
      if (!updateData.Bio || updateData.Bio.trim() === '') {
        // If Bio is empty, don't send it (keep existing value)
        delete updateData.Bio
      } else {
        // Convert Bio string to Blocks format (rich text array)
        updateData.Bio = convertTextToBlocks(updateData.Bio)
      }
    }

    // Handle Project1Description - Blocks field
    if (updateData.Project1Description !== undefined) {
      if (!updateData.Project1Description || updateData.Project1Description.trim() === '') {
        delete updateData.Project1Description
      } else {
        updateData.Project1Description = convertTextToBlocks(updateData.Project1Description)
      }
    }

    // Handle Project2Description - Blocks field
    if (updateData.Project2Description !== undefined) {
      if (!updateData.Project2Description || updateData.Project2Description.trim() === '') {
        delete updateData.Project2Description
      } else {
        updateData.Project2Description = convertTextToBlocks(updateData.Project2Description)
      }
    }

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
      `${STRAPI_URL}/api/members?filters[documentId][$eq]=${memberId}`,
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

    // Always unhide profile when member saves — makes profile visible after first edit
    updateData.HideProfile = false

    // Update member in Strapi using numeric ID
    console.log('[UPDATE] Updating member with data:', updateData)
    console.log('[UPDATE] Strapi URL:', `${STRAPI_URL}/api/members/${updateId}`)

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

    console.log('[UPDATE] Strapi response status:', updateResponse.status)

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('[UPDATE] Strapi update error (raw):', errorText)
      console.error('[UPDATE] Request body was:', JSON.stringify({ data: updateData }, null, 2))
      console.error('[UPDATE] Update URL was:', `${STRAPI_URL}/api/members/${memberId}`)

      let errorData
      try {
        errorData = JSON.parse(errorText)
        console.error('[UPDATE] Strapi error details:', JSON.stringify(errorData, null, 2))

        // Log specific error details if available
        if (errorData.error) {
          console.error('[UPDATE] Error name:', errorData.error.name)
          console.error('[UPDATE] Error message:', errorData.error.message)
          if (errorData.error.details) {
            console.error('[UPDATE] Error details:', JSON.stringify(errorData.error.details, null, 2))
          }
        }
      } catch (e) {
        console.error('[UPDATE] Could not parse error as JSON')
      }

      return NextResponse.json(
        { error: 'Αποτυχία ενημέρωσης προφίλ', details: errorData || errorText },
        { status: 500 }
      )
    }

    // Update was successful - return success without fetching
    // (We're skipping the fetch because Strapi 5 populate syntax is causing issues)
    console.log('[UPDATE] Update successful, returning success response')

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
