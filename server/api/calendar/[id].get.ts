import { eq } from 'drizzle-orm'
import { calendarEvents, users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-calendar'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const [row] = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      description: calendarEvents.description,
      location: calendarEvents.location,
      startDate: calendarEvents.startDate,
      endDate: calendarEvents.endDate,
      allDay: calendarEvents.allDay,
      createdById: calendarEvents.createdById,
      createdByName: users.name,
      createdAt: calendarEvents.createdAt,
      updatedAt: calendarEvents.updatedAt,
    })
    .from(calendarEvents)
    .leftJoin(users, eq(calendarEvents.createdById, users.id))
    .where(eq(calendarEvents.id, id))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })
  }

  return row
})
