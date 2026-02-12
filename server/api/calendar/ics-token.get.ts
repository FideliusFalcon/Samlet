import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['read-calendar'])
  const db = useDb()
  const config = useRuntimeConfig()

  const [dbUser] = await db
    .select({ icsToken: users.icsToken })
    .from(users)
    .where(eq(users.id, user.id))

  let token = dbUser?.icsToken

  if (!token) {
    token = randomUUID()
    await db
      .update(users)
      .set({ icsToken: token })
      .where(eq(users.id, user.id))
  }

  return {
    token,
    url: `${config.baseUrl}/api/calendar/feed/${token}.ics`,
  }
})
