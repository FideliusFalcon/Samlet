import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['read-users'])
  const db = useDb()

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.name)

  return members
})
