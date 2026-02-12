import { eq } from 'drizzle-orm'
import { users, userRoles, roles } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDb()

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name)

  const allUserRoles = await db
    .select({
      userId: userRoles.userId,
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))

  const roleMap = new Map<string, string[]>()
  for (const ur of allUserRoles) {
    const existing = roleMap.get(ur.userId) || []
    existing.push(ur.roleName)
    roleMap.set(ur.userId, existing)
  }

  return allUsers.map(u => ({
    ...u,
    roles: roleMap.get(u.id) || [],
  }))
})
