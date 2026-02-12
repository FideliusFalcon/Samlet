import { eq } from 'drizzle-orm'
import { users, userRoles, roles } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const authUser = requireAuth(event)
  const db = useDb()

  const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Bruger ikke fundet' })
  }

  const userRoleRows = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id))

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: userRoleRows.map(r => r.roleName),
      notificationsEnabled: user.notificationsEnabled,
    },
  }
})
