import { eq } from 'drizzle-orm'
import { documentEvents, documents, calendarEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['write-calendar'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { documentId } = await readBody(event)
  if (!documentId) {
    throw createError({ statusCode: 400, message: 'documentId er påkrævet' })
  }

  // Verify both exist
  const [ev] = await db.select({ id: calendarEvents.id }).from(calendarEvents).where(eq(calendarEvents.id, id))
  if (!ev) throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })

  const [doc] = await db.select({ id: documents.id }).from(documents).where(eq(documents.id, documentId))
  if (!doc) throw createError({ statusCode: 404, message: 'Dokument ikke fundet' })

  await db.insert(documentEvents).values({
    documentId,
    eventId: id,
  }).onConflictDoNothing()

  return { ok: true }
})
