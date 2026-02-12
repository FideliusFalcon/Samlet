import { eq, and } from 'drizzle-orm'
import { documentEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['write-calendar'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { documentId } = await readBody(event)
  if (!documentId) {
    throw createError({ statusCode: 400, message: 'documentId er påkrævet' })
  }

  await db.delete(documentEvents).where(
    and(
      eq(documentEvents.eventId, id),
      eq(documentEvents.documentId, documentId),
    ),
  )

  return { ok: true }
})
