import { eq } from 'drizzle-orm'
import { calendarEvents } from '~~/server/db/schema'
import { notifyCalendarEvent } from '~~/server/utils/email'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['write-calendar'])
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  const { title, description, location, startDate, endDate, allDay, skipNotification } = await readBody(event)

  if (title !== undefined && !title?.trim()) {
    throw createError({ statusCode: 400, message: 'Titel er påkrævet' })
  }
  if (title && title.length > 255) {
    throw createError({ statusCode: 400, message: 'Titel må højst være 255 tegn' })
  }
  if (location && location.length > 255) {
    throw createError({ statusCode: 400, message: 'Sted må højst være 255 tegn' })
  }
  if (startDate !== undefined && isNaN(new Date(startDate).getTime())) {
    throw createError({ statusCode: 400, message: 'Ugyldig startdato' })
  }
  if (endDate !== undefined && isNaN(new Date(endDate).getTime())) {
    throw createError({ statusCode: 400, message: 'Ugyldig slutdato' })
  }

  // Cross-check dates: if only one is provided, compare against the existing value
  if (startDate !== undefined || endDate !== undefined) {
    let effectiveStart: Date, effectiveEnd: Date
    if (startDate !== undefined && endDate !== undefined) {
      effectiveStart = new Date(startDate)
      effectiveEnd = new Date(endDate)
    } else {
      const [existing] = await db
        .select({ startDate: calendarEvents.startDate, endDate: calendarEvents.endDate })
        .from(calendarEvents)
        .where(eq(calendarEvents.id, id))
      if (!existing) {
        throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })
      }
      effectiveStart = startDate !== undefined ? new Date(startDate) : existing.startDate
      effectiveEnd = endDate !== undefined ? new Date(endDate) : existing.endDate
    }
    if (effectiveStart >= effectiveEnd) {
      throw createError({ statusCode: 400, message: 'Sluttidspunkt skal være efter starttidspunkt' })
    }
  }

  const [updated] = await db
    .update(calendarEvents)
    .set({
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(location !== undefined && { location: location?.trim() || null }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(allDay !== undefined && { allDay }),
      updatedAt: new Date(),
    })
    .where(eq(calendarEvents.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })
  }

  audit(event, 'event_updated', `"${updated.title}"`)

  if (!skipNotification) {
    notifyCalendarEvent(updated, user.name, user.id, true).catch((err) => {
      useLogger('email').error({ err, eventId: updated.id }, 'Calendar update notification failed')
    })
  }

  return updated
})
