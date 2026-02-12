import { eq, and, lte, gte, asc, inArray } from 'drizzle-orm'
import { calendarEvents, eventResponses, users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['read-calendar'])
  const db = useDb()

  const query = getQuery(event)
  const monthStr = typeof query.month === 'string' ? query.month : null

  let year: number, month: number
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-').map(Number)
    year = y
    month = m - 1
  } else {
    const now = new Date()
    year = now.getFullYear()
    month = now.getMonth()
  }

  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

  const events = await db
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
    .where(
      and(
        lte(calendarEvents.startDate, endOfMonth),
        gte(calendarEvents.endDate, startOfMonth),
      ),
    )
    .orderBy(asc(calendarEvents.startDate))

  const eventIds = events.map(e => e.id)
  if (eventIds.length === 0) return []

  const responses = await db
    .select()
    .from(eventResponses)
    .where(inArray(eventResponses.eventId, eventIds))

  return events.map(ev => {
    const evResponses = responses.filter(r => r.eventId === ev.id)
    const acceptedCount = evResponses.filter(r => r.status === 'accepted').length
    const declinedCount = evResponses.filter(r => r.status === 'declined').length
    const currentUserResponse = evResponses.find(r => r.userId === user.id)

    return {
      ...ev,
      acceptedCount,
      declinedCount,
      currentUserStatus: currentUserResponse?.status || null,
    }
  })
})
