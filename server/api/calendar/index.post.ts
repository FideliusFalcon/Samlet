import { calendarEvents } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['write-calendar'])
  const db = useDb()

  const { title, description, location, startDate, endDate, allDay, skipNotification } = await readBody(event)

  if (!title?.trim()) {
    throw createError({ statusCode: 400, message: 'Titel er påkrævet' })
  }
  if (title.length > 255) {
    throw createError({ statusCode: 400, message: 'Titel må højst være 255 tegn' })
  }
  if (!startDate || !endDate) {
    throw createError({ statusCode: 400, message: 'Start- og slutdato er påkrævet' })
  }
  if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
    throw createError({ statusCode: 400, message: 'Ugyldig dato' })
  }
  if (new Date(startDate) >= new Date(endDate)) {
    throw createError({ statusCode: 400, message: 'Sluttidspunkt skal være efter starttidspunkt' })
  }
  if (location && location.length > 255) {
    throw createError({ statusCode: 400, message: 'Sted må højst være 255 tegn' })
  }

  const [created] = await db.insert(calendarEvents).values({
    title: title.trim(),
    description: description?.trim() || null,
    location: location?.trim() || null,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    allDay: allDay || false,
    createdById: user.id,
  }).returning()

  audit(event, 'event_created', `"${created.title}"`)

  if (!skipNotification) {
    notifyCalendarEvent(created, user.name, user.id, false).catch((err) => {
      useLogger('email').error({ err, eventId: created.id }, 'Calendar event notification failed')
    })
  }

  return created
})
