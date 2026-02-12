import { eq } from 'drizzle-orm'
import { documents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['write-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Dokument ikke fundet' })
  }

  await trashStoredFile(doc.storagePath)
  await db.delete(documents).where(eq(documents.id, id))

  audit(event, 'document_deleted', `"${doc.title}"`)

  return { ok: true }
})
