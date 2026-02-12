import { documents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['write-files'])
  const db = useDb()

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'Ingen formulardata modtaget' })
  }

  const file = formData.find(f => f.name === 'file')
  const titleField = formData.find(f => f.name === 'title')
  const categoryIdField = formData.find(f => f.name === 'categoryId')

  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Ingen fil uploadet' })
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'Filen må højst være 10 MB' })
  }

  // Check MIME type from upload header
  if (file.type !== 'application/pdf') {
    throw createError({ statusCode: 400, message: 'Kun PDF-filer er tilladt' })
  }

  // Check file extension
  const filename = file.filename || ''
  if (filename && !filename.toLowerCase().endsWith('.pdf')) {
    throw createError({ statusCode: 400, message: 'Kun PDF-filer er tilladt' })
  }

  // Validate PDF magic bytes (%PDF-)
  const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D])
  if (file.data.length < 5 || !file.data.subarray(0, 5).equals(PDF_MAGIC)) {
    throw createError({ statusCode: 400, message: 'Filen er ikke en gyldig PDF' })
  }

  const title = (titleField?.data.toString('utf-8') || file.filename || 'Uden titel').slice(0, 255)
  const categoryId = categoryIdField?.data.toString('utf-8') || null
  const storagePath = await saveFile(file.data, file.filename || 'document.pdf')

  const [doc] = await db.insert(documents).values({
    title,
    filename: file.filename || 'document.pdf',
    storagePath,
    fileSize: file.data.length,
    mimeType: 'application/pdf',
    categoryId: categoryId || null,
    uploadedById: user.id,
  }).returning()

  audit(event, 'document_uploaded', `"${doc.title}" (${file.filename})`)

  return doc
})
