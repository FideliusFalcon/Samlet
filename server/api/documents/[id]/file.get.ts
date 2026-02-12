import { eq } from 'drizzle-orm'
import { documents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Dokument ikke fundet' })
  }

  const fileBuffer = await readStoredFile(doc.storagePath)

  const safeFilename = doc.filename.replace(/[^\w.\-]/g, '_')
  setResponseHeaders(event, {
    'Content-Type': doc.mimeType,
    'Content-Disposition': `inline; filename="${safeFilename}"`,
    'Content-Length': doc.fileSize.toString(),
  })

  return fileBuffer
})
