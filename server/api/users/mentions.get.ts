import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = useDb()

  const activeUsers = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.name)

  return activeUsers
})
