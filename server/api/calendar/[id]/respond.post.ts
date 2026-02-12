import { eq } from 'drizzle-orm'
import { calendarEvents, eventResponses } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['read-calendar'])
  const db = useDb()
  const eventId = getRouterParam(event, 'id')!

  const { status } = await readBody(event)

  if (!['accepted', 'declined'].includes(status)) {
    throw createError({ statusCode: 400, message: 'Status skal være accepted eller declined' })
  }

  const [ev] = await db
    .select({ title: calendarEvents.title, endDate: calendarEvents.endDate })
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))

  if (!ev) {
    throw createError({ statusCode: 404, message: 'Begivenhed ikke fundet' })
  }

  if (ev.endDate < new Date()) {
    throw createError({ statusCode: 400, message: 'Kan ikke svare på en afsluttet begivenhed' })
  }

  await db
    .insert(eventResponses)
    .values({
      eventId,
      userId: user.id,
      status,
      respondedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [eventResponses.eventId, eventResponses.userId],
      set: { status, respondedAt: new Date() },
    })

  audit(event, 'event_response', `${status} "${ev.title}"`)

  return { ok: true }
})
