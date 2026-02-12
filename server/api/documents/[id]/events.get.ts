import { eq } from 'drizzle-orm'
import { documentEvents, calendarEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-files'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      startDate: calendarEvents.startDate,
      allDay: calendarEvents.allDay,
    })
    .from(documentEvents)
    .innerJoin(calendarEvents, eq(documentEvents.eventId, calendarEvents.id))
    .where(eq(documentEvents.documentId, id))

  return rows
})
