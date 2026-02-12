import { eq } from 'drizzle-orm'
import { documentEvents, documents, calendarEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['write-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { eventId } = await readBody(event)
  if (!eventId) {
    throw createError({ statusCode: 400, message: 'eventId er påkrævet' })
  }

  // Verify both exist
  const [doc] = await db.select({ id: documents.id }).from(documents).where(eq(documents.id, id))
  if (!doc) throw createError({ statusCode: 404, message: 'Dokument ikke fundet' })

  const [ev] = await db.select({ id: calendarEvents.id }).from(calendarEvents).where(eq(calendarEvents.id, eventId))
  if (!ev) throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })

  await db.insert(documentEvents).values({
    documentId: id,
    eventId,
  }).onConflictDoNothing()

  return { ok: true }
})
