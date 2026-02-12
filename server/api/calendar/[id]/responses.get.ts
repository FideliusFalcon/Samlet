import { eq, asc } from 'drizzle-orm'
import { eventResponses, users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-calendar'])
  const db = useDb()
  const eventId = getRouterParam(event, 'id')!

  const responses = await db
    .select({
      userId: eventResponses.userId,
      userName: users.name,
      status: eventResponses.status,
      respondedAt: eventResponses.respondedAt,
    })
    .from(eventResponses)
    .leftJoin(users, eq(eventResponses.userId, users.id))
    .where(eq(eventResponses.eventId, eventId))
    .orderBy(asc(users.name))

  return responses
})
