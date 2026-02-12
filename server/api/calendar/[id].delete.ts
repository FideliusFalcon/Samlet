import { eq } from 'drizzle-orm'
import { calendarEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [deleted] = await db
    .delete(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })
  }

  audit(event, 'event_deleted', `"${deleted.title}"`)

  return { ok: true }
})
