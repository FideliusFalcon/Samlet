import { eq, and } from 'drizzle-orm'
import { documentEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['write-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { eventId } = await readBody(event)
  if (!eventId) {
    throw createError({ statusCode: 400, message: 'eventId er påkrævet' })
  }

  await db.delete(documentEvents).where(
    and(
      eq(documentEvents.documentId, id),
      eq(documentEvents.eventId, eventId),
    ),
  )

  return { ok: true }
})
